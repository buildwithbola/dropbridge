import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocket = require("ws");

const ROOT = process.cwd();
const SVG_PATH = path.join(ROOT, "public", "icons", "icon.svg");
const BUILD_DIR = path.join(ROOT, "build");
const PUBLIC_ICONS_DIR = path.join(ROOT, "public", "icons");
const PROFILE_DIR = path.join(ROOT, ".tmp-icon-gen");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9344;

fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_ICONS_DIR, { recursive: true });
fs.mkdirSync(PROFILE_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildIcoFromPngs(entries) {
  // Standard ICO header (6 bytes) + 16-byte directory entry per PNG
  const count = entries.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const totalSize = headerSize + entries.reduce((acc, e) => acc + e.data.length, 0);
  const out = Buffer.alloc(totalSize);

  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type 1 = ICO
  out.writeUInt16LE(count, 4);

  entries.forEach((entry, idx) => {
    const pos = 6 + idx * 16;
    out.writeUInt8(entry.size >= 256 ? 0 : entry.size, pos);
    out.writeUInt8(entry.size >= 256 ? 0 : entry.size, pos + 1);
    out.writeUInt8(0, pos + 2); // color palette
    out.writeUInt8(0, pos + 3); // reserved
    out.writeUInt16LE(1, pos + 4); // planes
    out.writeUInt16LE(32, pos + 6); // bpp
    out.writeUInt32LE(entry.data.length, pos + 8);
    out.writeUInt32LE(offset, pos + 12);
    entry.data.copy(out, offset);
    offset += entry.data.length;
  });

  return out;
}

async function run() {
  const svgMarkup = fs.readFileSync(SVG_PATH, "utf8");
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent;width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;}
    svg{width:100%;height:100%;display:block;}
  </style></head><body>${svgMarkup}</body></html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let ws;
  try {
    let ok = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        if (res.ok) {
          ok = true;
          break;
        }
      } catch {}
      await sleep(200);
    }
    if (!ok) throw new Error("Chrome DevTools unavailable");

    const tabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
    const tab = await tabRes.json();

    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });

    let seq = 0;
    const pending = new Map();
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });

    const send = (method, params = {}) => {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    };

    await send("Page.enable");
    await send("Emulation.setDefaultBackgroundColorOverride", {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    await send("Page.navigate", { url: dataUrl });
    await sleep(300);

    const captureSize = async (size) => {
      await send("Emulation.setDeviceMetricsOverride", {
        width: size,
        height: size,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await sleep(100);
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
      });
      return Buffer.from(data, "base64");
    };

    const png512 = await captureSize(512);
    const png256 = await captureSize(256);
    const png192 = await captureSize(192);
    const png64 = await captureSize(64);
    const png32 = await captureSize(32);
    const png16 = await captureSize(16);

    // Desktop icons (Linux/macOS PNG, Windows multi-size ICO, Tray icon)
    fs.writeFileSync(path.join(BUILD_DIR, "icon.png"), png512);
    fs.writeFileSync(path.join(BUILD_DIR, "tray-icon.png"), png32);
    const ico = buildIcoFromPngs([
      { size: 256, data: png256 },
      { size: 64, data: png64 },
      { size: 32, data: png32 },
      { size: 16, data: png16 },
    ]);
    fs.writeFileSync(path.join(BUILD_DIR, "icon.ico"), ico);

    // Also write crisp PNGs for Android/iOS PWA manifest
    fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, "icon-512.png"), png512);
    fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, "icon-192.png"), png192);

    console.log("Generated DropBridge icons: build/icon.png, build/icon.ico, build/tray-icon.png, public/icons/icon-192.png, public/icons/icon-512.png");
  } finally {
    try {
      ws?.close();
    } catch {}
    chrome.kill();
    await sleep(500);
    try {
      fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
