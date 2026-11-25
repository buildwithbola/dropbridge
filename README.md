# DropBridge

**Bridge the gap between screen and pocket.**  
Zero-install PC-to-phone file, photo, video, and clipboard bridge for **Windows, macOS, Linux, Android, and iOS**.

## Features
- **3-Second Pairing:** Scan the auto-generated LAN QR code or type the split pairing code (`00212-PF5`).
- **Instant Auto-Reconnect:** Previously paired devices reconnect automatically on open and jump straight to the Live Feed.
- **3-Tier Auto-Waterfall Transport:** Direct LAN WebRTC → Cross-Network STUN P2P (Wi-Fi + 5G) → Encrypted Relay Fallback.
- **Lossless Chunked Streaming:** 64 KB binary chunks with backpressure, pure-JS CRC32 verification, auto-resume, and Screen Wake Lock.
- **Daily-Driver Superpowers:** Persistent **History** panel, Desktop **Auto-Save Folder**, Inline Media Lightbox, `Ctrl+V` instant paste, mobile **Snap to PC** camera capture, batch `.zip` downloads, PWA + Android Share Target, and `/docs` + `/download` pages.
- **Native Desktop App (Windows, macOS & Linux):** Self-contained Electron wrapper with embedded local Next.js + WebSocket signaling servers (zero Node.js needed on end-user devices), System Tray / Menu Bar background mode, and Launch-at-Login.

## Run Web & Signaling Locally

```bash
npm install
npm run dev
```

## Build Downloadable Desktop Installers (Windows, macOS & Linux)

```bash
# Windows (.exe NSIS installer + single-file Portable .exe)
npm run dist:win

# macOS (.dmg Apple Silicon + Intel) — run on macOS or via GitHub Actions
npm run dist:mac

# Linux (.AppImage + .deb) — run on Linux or via GitHub Actions
npm run dist:linux
```

Installers output into `dist-desktop/`.

### Automated Cross-Platform Releases (GitHub Actions)
Push a version tag to build **Windows `.exe`**, **macOS `.dmg`**, and **Linux `.AppImage` + `.deb`** automatically via `.github/workflows/build-desktop.yml`:

```bash
git tag v1.2.0
git push origin v1.2.0
```

Set `NEXT_PUBLIC_RELEASES_URL=https://github.com/<you>/<repo>/releases/latest/download` on Vercel so `/download` buttons download the matching OS installer directly.

> **Windows Firewall Tip (if your phone can't reach your laptop IP):**
> ```powershell
> New-NetFirewallRule -DisplayName "DropBridge Web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
> New-NetFirewallRule -DisplayName "DropBridge Signal" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
> ```
