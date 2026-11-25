import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "desktop-bundle");
const WEB_OUT = path.join(OUT, "web");
const SIGNAL_OUT = path.join(OUT, "signal");

const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");
const STATIC_DIR = path.join(ROOT, ".next", "static");
const PUBLIC_DIR = path.join(ROOT, "public");
const SIGNAL_SRC = path.join(ROOT, "server", "signaling.mjs");
const WS_SRC = path.join(ROOT, "node_modules", "ws");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing build directory: ${src}`);
  }
  fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
}

console.log("Preparing self-contained desktop-bundle...");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(WEB_OUT, { recursive: true });
fs.mkdirSync(SIGNAL_OUT, { recursive: true });

// 1. Copy Next.js standalone server + static assets + public assets
copyRecursive(STANDALONE_DIR, WEB_OUT);
copyRecursive(STATIC_DIR, path.join(WEB_OUT, ".next", "static"));
copyRecursive(PUBLIC_DIR, path.join(WEB_OUT, "public"));

// 2. Copy standalone signaling server + ws module
fs.copyFileSync(SIGNAL_SRC, path.join(SIGNAL_OUT, "signaling.mjs"));
fs.writeFileSync(
  path.join(SIGNAL_OUT, "package.json"),
  JSON.stringify({ name: "dropbridge-signal-embedded", type: "module" }, null, 2)
);
copyRecursive(WS_SRC, path.join(SIGNAL_OUT, "node_modules", "ws"));

console.log("desktop-bundle ready for Windows, macOS, and Linux packaging.");
