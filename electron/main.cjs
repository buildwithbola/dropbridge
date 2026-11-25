const { app, BrowserWindow, Menu, Tray, shell, nativeImage, dialog } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const IS_PACKAGED = app.isPackaged;
let mainWindow = null;
let tray = null;
let webChild = null;
let signalChild = null;
let isQuitting = false;
let activeWebPort = 3000;
let activeSignalPort = 3001;

// Enforce single desktop instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "0.0.0.0");
  });
}

async function pickPort(preferred, fallbacks) {
  if (await isPortAvailable(preferred)) return preferred;
  for (const p of fallbacks) {
    if (await isPortAvailable(p)) return p;
  }
  return preferred;
}

function waitForHttp(url, timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status < 500) {
          resolve();
          return;
        }
      } catch {
        // still booting
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

function resolveResourcePath(...parts) {
  if (IS_PACKAGED) {
    return path.join(process.resourcesPath, ...parts);
  }
  return path.join(__dirname, "..", ...parts);
}

async function startEmbeddedServers() {
  const bundleRoot = IS_PACKAGED
    ? path.join(process.resourcesPath, "app-bundle")
    : path.join(__dirname, "..", "desktop-bundle");

  const webServerJs = path.join(bundleRoot, "web", "server.js");
  const signalServerMjs = path.join(bundleRoot, "signal", "signaling.mjs");

  // In dev mode without a prepared bundle, reuse existing localhost:3000 dev server if live
  if (!IS_PACKAGED && !fs.existsSync(webServerJs)) {
    activeWebPort = 3000;
    activeSignalPort = 3001;
    await waitForHttp(`http://127.0.0.1:${activeWebPort}`, 8000);
    return;
  }

  activeSignalPort = await pickPort(3001, [3041, 3042, 3043, 3044]);
  activeWebPort = await pickPort(3000, [3030, 3031, 3032, 3033]);

  // Spawn embedded WebSocket signaling & relay server
  signalChild = spawn(process.execPath, [signalServerMjs], {
    cwd: path.join(bundleRoot, "signal"),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOST: "0.0.0.0",
      PORT: String(activeSignalPort),
    },
    stdio: "ignore",
    windowsHide: true,
  });

  // Spawn embedded Next.js standalone server (serves desktop UI + phone LAN clients!)
  webChild = spawn(process.execPath, [webServerJs], {
    cwd: path.join(bundleRoot, "web"),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "0.0.0.0",
      PORT: String(activeWebPort),
      SIGNALING_PORT: String(activeSignalPort),
      NEXT_PUBLIC_SIGNALING_PORT: String(activeSignalPort),
    },
    stdio: "ignore",
    windowsHide: true,
  });

  await waitForHttp(`http://127.0.0.1:${activeWebPort}`, 25000);
}

function stopEmbeddedServers() {
  for (const child of [webChild, signalChild]) {
    if (child && !child.killed) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
  }
  webChild = null;
  signalChild = null;
}

function getAppIconPath() {
  const candidates = [
    resolveResourcePath("icon.png"),
    path.join(__dirname, "..", "build", "icon.png"),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function getTrayIconPath() {
  const candidates = [
    resolveResourcePath("tray-icon.png"),
    resolveResourcePath("icon.png"),
    path.join(__dirname, "..", "build", "tray-icon.png"),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function createTray() {
  const iconPath = getTrayIconPath();
  if (!iconPath) return;

  const image = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  tray = new Tray(image);
  tray.setToolTip("DropBridge — Ready to bridge screen & pocket");

  const rebuildMenu = () => {
    const loginSettings = app.getLoginItemSettings();
    const menu = Menu.buildFromTemplate([
      {
        label: "Open DropBridge",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "Documentation",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.loadURL(`http://localhost:${activeWebPort}/docs`);
          }
        },
      },
      {
        label: "Open Downloads Folder",
        click: () => {
          shell.openPath(app.getPath("downloads"));
        },
      },
      { type: "separator" },
      {
        label: "Launch at Login",
        type: "checkbox",
        checked: Boolean(loginSettings.openAtLogin),
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked });
          rebuildMenu();
        },
      },
      { type: "separator" },
      {
        label: "Quit DropBridge",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  };

  rebuildMenu();
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

function createWindow() {
  const iconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: "DropBridge",
    backgroundColor: "#10375C",
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Open beamed external links in user's default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (!url.startsWith(`http://localhost:${activeWebPort}`)) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    }
    return { action: "allow" };
  });

  mainWindow.loadURL(`http://localhost:${activeWebPort}/bridge`);

  // Minimize cleanly to System Tray / Menu Bar when closed so phone drops keep working!
  mainWindow.on("close", (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startEmbeddedServers();
    createTray();
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      "DropBridge Startup Error",
      `Could not start DropBridge local bridge service.\n\n${err?.message || err}`
    );
    isQuitting = true;
    app.quit();
  }

  app.on("activate", () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  stopEmbeddedServers();
});

app.on("will-quit", () => {
  stopEmbeddedServers();
});
