import http from "node:http";
import os from "node:os";
import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";
const ROOM_IDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_MS = 20_000;

/** @typedef {{ ws: WebSocket, peerId: string, device: { id: string, name: string, kind: "desktop" | "mobile" | "tablet", os: string }, joinedAt: number }} PeerEntry */
/** @typedef {{ code: string, displayCode: string, peers: Map<string, PeerEntry>, createdAt: number, lastActivity: number }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes ambiguous 0/O/1/I

function normalizeCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function formatDisplayCode(normalized) {
  if (normalized.length <= 5) return normalized;
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 8)}`;
}

function generateRoomCode() {
  for (let attempt = 0; attempt < 25; attempt++) {
    let digits = "";
    for (let i = 0; i < 5; i++) {
      digits += String(Math.floor(Math.random() * 10));
    }
    let suffix = "";
    for (let i = 0; i < 3; i++) {
      suffix += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    }
    const code = `${digits}${suffix}`;
    if (!rooms.has(code)) return code;
  }
  return `${Date.now().toString().slice(-5)}DBX`;
}

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

function safeSend(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function getOtherPeer(room, excludePeerId) {
  for (const [pid, entry] of room.peers.entries()) {
    if (pid !== excludePeerId) return entry;
  }
  return null;
}

function removePeerFromRoom(peerId, roomCode) {
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  const entry = room.peers.get(peerId);
  if (entry) {
    room.peers.delete(peerId);
    room.lastActivity = Date.now();
    const other = getOtherPeer(room, peerId);
    if (other) {
      safeSend(other.ws, {
        type: "peer-left",
        peerId,
        device: entry.device,
      });
    }
  }

  if (room.peers.size === 0) {
    // Allow brief grace period (90s) for mobile background reconnects before deleting
    setTimeout(() => {
      const current = rooms.get(roomCode);
      if (current && current.peers.size === 0 && Date.now() - current.lastActivity >= 85_000) {
        rooms.delete(roomCode);
      }
    }, 90_000);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "dropbridge-signaling",
        activeRooms: rooms.size,
        uptimeSeconds: Math.round(process.uptime()),
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({
  server,
  maxPayload: 2 * 1024 * 1024, // 2MB max frame for relay chunks
});

wss.on("connection", (ws) => {
  const peerId = `p_${Math.random().toString(36).slice(2, 10)}`;
  let currentRoomCode = null;
  let isAlive = true;

  ws.on("pong", () => {
    isAlive = true;
  });

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      clearInterval(heartbeat);
      ws.terminate();
      return;
    }
    isAlive = false;
    try {
      ws.ping();
    } catch {
      // ignore closed socket
    }
  }, HEARTBEAT_MS);

  ws.on("message", (raw, isBinary) => {
    // Binary frame: Tier 3 Encrypted Relay pipe directly to the other peer
    if (isBinary) {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      room.lastActivity = Date.now();
      const other = getOtherPeer(room, peerId);
      if (other && other.ws.readyState === WebSocket.OPEN) {
        other.ws.send(raw, { binary: true });
      }
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw.toString("utf8"));
    } catch {
      return;
    }

    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "ping": {
        safeSend(ws, { type: "pong", ts: Date.now() });
        break;
      }

      case "create-room": {
        if (currentRoomCode) {
          removePeerFromRoom(peerId, currentRoomCode);
        }

        const device = msg.device || {
          id: peerId,
          name: "Laptop",
          kind: "desktop",
          os: "Unknown",
        };

        const preferred = normalizeCode(msg.preferredCode);
        let code = preferred.length >= 6 ? preferred : generateRoomCode();
        let room = rooms.get(code);

        if (room) {
          // Check if the same device is reclaiming or a trusted peer is already waiting!
          for (const [existingPid, entry] of room.peers.entries()) {
            if (entry.device?.id === device.id) {
              room.peers.delete(existingPid);
            }
          }
          if (room.peers.size >= 2) {
            code = generateRoomCode();
            room = undefined;
          }
        }

        if (!room) {
          room = {
            code,
            displayCode: formatDisplayCode(code),
            peers: new Map(),
            createdAt: Date.now(),
            lastActivity: Date.now(),
          };
          rooms.set(code, room);
        }

        room.peers.set(peerId, { ws, peerId, device, joinedAt: Date.now() });
        room.lastActivity = Date.now();
        currentRoomCode = code;

        safeSend(ws, {
          type: "room-created",
          code: room.code,
          displayCode: room.displayCode,
          peerId,
        });

        // If a trusted peer was already waiting in this room, pair immediately!
        const waitingPeer = getOtherPeer(room, peerId);
        if (waitingPeer) {
          safeSend(ws, {
            type: "peer-joined",
            peerId: waitingPeer.peerId,
            device: waitingPeer.device,
            role: "initiator",
          });
          safeSend(waitingPeer.ws, {
            type: "peer-joined",
            peerId,
            device,
            role: "responder",
          });
        }
        break;
      }

      case "join-room": {
        const code = normalizeCode(msg.code);
        if (code.length < 4) {
          safeSend(ws, {
            type: "error",
            code: "INVALID_CODE",
            message: "Enter the pairing code shown on your other device.",
          });
          return;
        }

        const room = rooms.get(code);
        if (!room) {
          safeSend(ws, {
            type: "error",
            code: "ROOM_NOT_FOUND",
            message: "Bridge code not found. Make sure DropBridge is open on your laptop.",
          });
          return;
        }

        const device = msg.device || {
          id: peerId,
          name: "Mobile Device",
          kind: "mobile",
          os: "Unknown",
        };

        // Remove stale entry from the same device if reconnecting after backgrounding
        for (const [existingPid, entry] of room.peers.entries()) {
          if (entry.device?.id === device.id) {
            room.peers.delete(existingPid);
          }
        }

        if (room.peers.size >= 2) {
          safeSend(ws, {
            type: "error",
            code: "ROOM_FULL",
            message: "This bridge already has two connected devices.",
          });
          return;
        }

        if (currentRoomCode && currentRoomCode !== code) {
          removePeerFromRoom(peerId, currentRoomCode);
        }

        room.peers.set(peerId, { ws, peerId, device, joinedAt: Date.now() });
        room.lastActivity = Date.now();
        currentRoomCode = code;

        const host = getOtherPeer(room, peerId);

        safeSend(ws, {
          type: "room-joined",
          code: room.code,
          displayCode: room.displayCode,
          peerId,
          peer: host ? { peerId: host.peerId, device: host.device } : null,
          role: "responder",
        });

        if (host) {
          safeSend(host.ws, {
            type: "peer-joined",
            peerId,
            device,
            role: "initiator",
          });
        }
        break;
      }

      case "signal": {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        room.lastActivity = Date.now();
        const other = getOtherPeer(room, peerId);
        if (other) {
          safeSend(other.ws, {
            type: "signal",
            from: peerId,
            payload: msg.payload,
          });
        }
        break;
      }

      case "relay-json": {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        room.lastActivity = Date.now();
        const other = getOtherPeer(room, peerId);
        if (other) {
          safeSend(other.ws, {
            type: "relay-json",
            from: peerId,
            payload: msg.payload,
          });
        }
        break;
      }

      case "leave-room": {
        removePeerFromRoom(peerId, currentRoomCode);
        currentRoomCode = null;
        break;
      }
    }
  });

  ws.on("close", () => {
    clearInterval(heartbeat);
    removePeerFromRoom(peerId, currentRoomCode);
    currentRoomCode = null;
  });

  ws.on("error", () => {
    clearInterval(heartbeat);
    removePeerFromRoom(peerId, currentRoomCode);
    currentRoomCode = null;
  });
});

// Sweep stale idle rooms
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_IDLE_TTL_MS && room.peers.size === 0) {
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

server.listen(PORT, HOST, () => {
  const ips = getLanIps();
  console.log(`\n  DropBridge Signaling Server ready`);
  console.log(`  Local:   ws://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  Network: ws://${ips[0]}:${PORT}`);
  }
  console.log("");
});
