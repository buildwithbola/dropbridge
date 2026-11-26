import { NextRequest, NextResponse } from "next/server";
import {
  notifyRoomWaiters,
  sharedMemRooms,
  sharedRoomLocks,
  waitForRoomActivity,
  type PeerDevicePayload,
  type StoredSignalPeer,
  type StoredSignalRoom,
} from "@/lib/signalBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "fra1";

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PEER_STALE_MS = 45_000;
const PEER_ONLINE_WINDOW_MS = 15_000;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Serialize all read-modify-write operations per room code so concurrent
 * HTTP polling/signaling requests never race or overwrite peer queues.
 */
async function withRoomLock<T>(roomKey: string, fn: () => Promise<T>): Promise<T> {
  const prev = sharedRoomLocks.get(roomKey) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => current);
  sharedRoomLocks.set(roomKey, chained);

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (sharedRoomLocks.get(roomKey) === chained) {
      sharedRoomLocks.delete(roomKey);
    }
  }
}

function normalizeCode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function formatDisplayCode(normalized: string): string {
  if (normalized.length <= 5) return normalized;
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 8)}`;
}

function generateRoomCode(): string {
  let digits = "";
  for (let i = 0; i < 5; i++) digits += String(Math.floor(Math.random() * 10));
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return `${digits}${suffix}`;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

async function readRoom(code: string): Promise<StoredSignalRoom | null> {
  const redis = getRedisConfig();
  if (redis) {
    try {
      const res = await fetch(`${redis.url}/get/${encodeURIComponent(`db:room:${code}`)}`, {
        headers: { Authorization: `Bearer ${redis.token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.result) return JSON.parse(data.result) as StoredSignalRoom;
        return null;
      }
    } catch {
      // fallback to memory
    }
  }
  const room = sharedMemRooms.get(code) || null;
  if (room && Date.now() - room.lastActivity > ROOM_TTL_MS) {
    sharedMemRooms.delete(code);
    return null;
  }
  return room;
}

async function writeRoom(room: StoredSignalRoom): Promise<void> {
  room.lastActivity = Date.now();
  const redis = getRedisConfig();
  if (redis) {
    try {
      await fetch(`${redis.url}/set/${encodeURIComponent(`db:room:${room.code}`)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redis.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(room),
      });
      await fetch(`${redis.url}/expire/${encodeURIComponent(`db:room:${room.code}`)}/86400`, {
        method: "POST",
        headers: { Authorization: `Bearer ${redis.token}` },
      });
      return;
    } catch {
      // fallback to memory
    }
  }
  sharedMemRooms.set(room.code, room);
}

function getOtherPeer(room: StoredSignalRoom, excludePeerId: string): StoredSignalPeer | null {
  for (const peer of Object.values(room.peers)) {
    if (peer.peerId !== excludePeerId) return peer;
  }
  return null;
}

function isPeerOnline(peer: StoredSignalPeer | null): boolean {
  return Boolean(peer && Date.now() - peer.lastSeen < PEER_ONLINE_WINDOW_MS);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = normalizeCode(searchParams.get("room") || "");
  const peerId = searchParams.get("peerId") || "";
  const shouldWait = searchParams.get("wait") === "1";

  if (!code || !peerId) {
    return NextResponse.json({ ok: true, mode: "vercel-http-signal", messages: [] });
  }

  const firstPass = await withRoomLock(code, async () => {
    const room = await readRoom(code);
    if (!room || !room.peers[peerId]) {
      return { missing: true as const, messages: [] as Record<string, unknown>[], peerOnline: false };
    }

    const peer = room.peers[peerId];
    peer.lastSeen = Date.now();
    const other = getOtherPeer(room, peerId);
    const messages = peer.queue.splice(0, peer.queue.length);
    await writeRoom(room);

    return { missing: false as const, messages, peerOnline: isPeerOnline(other) };
  });

  if (firstPass.missing) {
    return NextResponse.json({ ok: true, reannounce: true, messages: [], peerOnline: false });
  }

  if (firstPass.messages.length > 0 || !shouldWait) {
    return NextResponse.json({
      ok: true,
      messages: firstPass.messages,
      peerOnline: firstPass.peerOnline,
    });
  }

  // Long-poll wait up to 3.5s (returns immediately on notifyRoomWaiters!)
  await waitForRoomActivity(code, 3500);

  return withRoomLock(code, async () => {
    const room = await readRoom(code);
    if (!room || !room.peers[peerId]) {
      return NextResponse.json({ ok: true, reannounce: true, messages: [], peerOnline: false });
    }

    const peer = room.peers[peerId];
    peer.lastSeen = Date.now();
    const other = getOtherPeer(room, peerId);
    const messages = peer.queue.splice(0, peer.queue.length);
    await writeRoom(room);

    return NextResponse.json({
      ok: true,
      messages,
      peerOnline: isPeerOnline(other),
    });
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "");

  if (action === "create-room") {
    const device = (body.device as PeerDevicePayload) || {
      id: `d_${Math.random().toString(36).slice(2, 8)}`,
      name: "Laptop",
      kind: "desktop",
      os: "Unknown",
    };
    const peerId = String(body.peerId || `p_${Math.random().toString(36).slice(2, 10)}`);
    const preferred = normalizeCode(String(body.preferredCode || ""));
    const initialCode = preferred.length >= 4 ? preferred : generateRoomCode();

    return withRoomLock(initialCode, async () => {
      let code = initialCode;
      let room = await readRoom(code);

      if (room) {
        for (const [pid, entry] of Object.entries(room.peers)) {
          if (entry.device?.id === device.id || Date.now() - entry.lastSeen > PEER_STALE_MS) {
            delete room.peers[pid];
          }
        }
        if (Object.keys(room.peers).length >= 2) {
          code = generateRoomCode();
          room = null;
        }
      }

      if (!room) {
        room = {
          code,
          displayCode: formatDisplayCode(code),
          peers: {},
          createdAt: Date.now(),
          lastActivity: Date.now(),
        };
      }

      room.peers[peerId] = {
        peerId,
        device,
        queue: [],
        lastSeen: Date.now(),
      };

      const waiting = getOtherPeer(room, peerId);
      const immediateMessages: Record<string, unknown>[] = [];
      if (waiting) {
        immediateMessages.push({
          type: "peer-joined",
          peerId: waiting.peerId,
          device: waiting.device,
          role: "initiator",
        });
        waiting.queue.push({
          type: "peer-joined",
          peerId,
          device,
          role: "responder",
        });
      }

      await writeRoom(room);
      if (waiting) {
        notifyRoomWaiters(room.code);
      }

      return NextResponse.json({
        type: "room-created",
        code: room.code,
        displayCode: room.displayCode,
        peerId,
        peerOnline: isPeerOnline(waiting),
        messages: immediateMessages,
      });
    });
  }

  if (action === "join-room") {
    const code = normalizeCode(String(body.code || ""));
    if (code.length < 4) {
      return NextResponse.json({
        type: "error",
        code: "INVALID_CODE",
        message: "Enter the pairing code shown on your other device.",
      });
    }

    return withRoomLock(code, async () => {
      const room = await readRoom(code);
      if (!room) {
        return NextResponse.json({
          type: "error",
          code: "ROOM_NOT_FOUND",
          message: "Bridge code not found. Make sure DropBridge is open on your other device.",
        });
      }

      const device = (body.device as PeerDevicePayload) || {
        id: `d_${Math.random().toString(36).slice(2, 8)}`,
        name: "Mobile Device",
        kind: "mobile",
        os: "Unknown",
      };
      const peerId = String(body.peerId || `p_${Math.random().toString(36).slice(2, 10)}`);

      for (const [pid, entry] of Object.entries(room.peers)) {
        if (entry.device?.id === device.id || Date.now() - entry.lastSeen > PEER_STALE_MS) {
          delete room.peers[pid];
        }
      }

      if (Object.keys(room.peers).length >= 2) {
        return NextResponse.json({
          type: "error",
          code: "ROOM_FULL",
          message: "This bridge already has two connected devices.",
        });
      }

      room.peers[peerId] = {
        peerId,
        device,
        queue: [],
        lastSeen: Date.now(),
      };

      const host = getOtherPeer(room, peerId);
      if (host) {
        host.queue.push({
          type: "peer-joined",
          peerId,
          device,
          role: "initiator",
        });
      }

      await writeRoom(room);
      if (host) {
        notifyRoomWaiters(room.code);
      }

      return NextResponse.json({
        type: "room-joined",
        code: room.code,
        displayCode: room.displayCode,
        peerId,
        peer: host ? { peerId: host.peerId, device: host.device } : null,
        peerOnline: isPeerOnline(host),
        role: "responder",
      });
    });
  }

  const code = normalizeCode(String(body.room || ""));
  const peerId = String(body.peerId || "");
  if (!code || !peerId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return withRoomLock(code, async () => {
    const room = await readRoom(code);
    if (!room) {
      return NextResponse.json({ ok: false, reannounce: true });
    }

    if (action === "leave-room" || action === "peer-away") {
      const leaving = room.peers[peerId];
      if (leaving) {
        delete room.peers[peerId];
      }
      const other = getOtherPeer(room, peerId);
      if (other) {
        other.queue.push({
          type: "peer-left",
          peerId,
          device: leaving?.device || null,
        });
        await writeRoom(room);
        notifyRoomWaiters(code);
      } else {
        await writeRoom(room);
      }
      return NextResponse.json({ ok: true, messages: [] });
    }

    if (room.peers[peerId]) {
      room.peers[peerId].lastSeen = Date.now();
    }

    if (action === "signal" || action === "relay-json" || action === "relay-bin") {
      const other = getOtherPeer(room, peerId);
      if (other) {
        other.queue.push({
          type: action,
          from: peerId,
          payload: body.payload,
        });
      }
      const ownMessages = room.peers[peerId]?.queue.splice(0) || [];
      await writeRoom(room);
      if (other) {
        notifyRoomWaiters(code);
      }
      return NextResponse.json({
        ok: true,
        peerOnline: isPeerOnline(other),
        messages: ownMessages,
      });
    }

    const ownMessages = room.peers[peerId]?.queue.splice(0) || [];
    const other = getOtherPeer(room, peerId);
    await writeRoom(room);
    return NextResponse.json({
      ok: true,
      peerOnline: isPeerOnline(other),
      messages: ownMessages,
    });
  });
}
