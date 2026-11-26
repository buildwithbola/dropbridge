# DropBridge

**Bridge the gap between screen and pocket.**  
Zero-install, pure PWA PC-to-phone file, photo, video, and clipboard bridge for **Windows, macOS, Linux, Android, and iOS**.

## Features
- **3-Second Pairing:** Scan the auto-generated QR code or type the split pairing code (`00212-PF5`).
- **Instant Auto-Reconnect:** Previously paired devices reconnect automatically on open and jump straight to the Live Feed.
- **3-Tier Auto-Waterfall Transport:**
  1. **Direct LAN WebRTC** (atomic ICE SDP + 2 MB windowed reader + adaptive 128 KB SCTP chunks for full Wi-Fi speed)
  2. **Cross-Network Direct P2P** (STUN NAT traversal across Wi-Fi + 5G)
  3. **Encrypted Relay Fallback** (seamless sequence-ordered relay behind strict corporate/campus firewalls, with automatic mid-transfer upgrade back to Direct LAN if P2P opens)
- **Lossless Streaming:** CRC32 verification on every chunk, preserved `MB/s` speed telemetry, auto-resume, and Screen Wake Lock.
- **Daily-Driver Superpowers:** Persistent **History** panel, Desktop **Auto-Save Folder**, Inline Media Lightbox, `Ctrl+V` instant paste, mobile **Snap to PC** camera capture, batch `.zip` downloads, and cross-platform **Install App (PWA)** for Windows, macOS, Linux, Android, and iOS.

## Run Locally (Windows / macOS / Linux ↔ Phone on Same Wi-Fi)

```bash
npm install
npm run dev
```

This launches:
- **Website & App:** `http://localhost:3000` (Live Bridge at `/bridge`)
- **Local WebSocket Signaling Server:** `ws://localhost:3001`

> **Windows Firewall Tip (if your phone can't reach your laptop IP):**
> ```powershell
> New-NetFirewallRule -DisplayName "DropBridge Web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
> New-NetFirewallRule -DisplayName "DropBridge Signal" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
> ```

## Deploy on Vercel
Deploy straight to Vercel with zero external infrastructure—`/api/signal` handles WebRTC handshakes natively (pinned to a single region with per-room concurrency locks), with optional `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for multi-region scaling.
