import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { notifyRoomWaiters, sharedMemRooms } from "@/lib/signalBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "fra1";

const PAIR_ID_RE = /^pair_[a-f0-9]{16,40}$/;
const DROP_ID_RE = /^[a-zA-Z0-9._-]{4,80}$/;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days retention

export interface EncryptedDropEnvelope {
  dropId: string;
  pairId: string;
  roomCode: string;
  senderDeviceId: string;
  senderName: string;
  createdAt: number;
  kind: "file" | "text";
  size: number;
  encryptedMeta: string;
  blobUrl?: string;
  metaUrl?: string;
}

function getLocalPairDir(pairId: string): string {
  return path.join(os.tmpdir(), "dropbridge-mailbox", pairId);
}

function normalizeCode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function wakeActiveRoomPeer(roomCode: string, pairId: string): void {
  const code = normalizeCode(roomCode);
  if (!code) return;
  const room = sharedMemRooms.get(code);
  if (room) {
    for (const peer of Object.values(room.peers)) {
      peer.queue.push({ type: "inbox-updated", pairId });
    }
  }
  notifyRoomWaiters(code);
}

export async function POST(request: NextRequest) {
  let envelope: EncryptedDropEnvelope;
  try {
    envelope = (await request.json()) as EncryptedDropEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !envelope ||
    !PAIR_ID_RE.test(envelope.pairId || "") ||
    !DROP_ID_RE.test(envelope.dropId || "") ||
    !envelope.senderDeviceId ||
    !envelope.encryptedMeta ||
    (envelope.kind !== "file" && envelope.kind !== "text")
  ) {
    return NextResponse.json({ error: "Invalid encrypted drop envelope" }, { status: 400 });
  }

  const createdAt = Number(envelope.createdAt || Date.now());
  const cleanEnvelope: EncryptedDropEnvelope = {
    dropId: envelope.dropId,
    pairId: envelope.pairId,
    roomCode: normalizeCode(envelope.roomCode || ""),
    senderDeviceId: envelope.senderDeviceId,
    senderName: String(envelope.senderName || "Paired Device").slice(0, 48),
    createdAt,
    kind: envelope.kind,
    size: Number(envelope.size || 0),
    encryptedMeta: envelope.encryptedMeta,
    blobUrl: envelope.blobUrl,
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const pathname = `mailbox/${cleanEnvelope.pairId}/meta_${createdAt}_${cleanEnvelope.dropId}.json`;
    const stored = await put(pathname, JSON.stringify(cleanEnvelope), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    cleanEnvelope.metaUrl = stored.url;
  } else {
    const dir = getLocalPairDir(cleanEnvelope.pairId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `meta_${createdAt}_${cleanEnvelope.dropId}.json`);
    await writeFile(filePath, JSON.stringify(cleanEnvelope), "utf8");
  }

  wakeActiveRoomPeer(cleanEnvelope.roomCode, cleanEnvelope.pairId);

  return NextResponse.json({
    ok: true,
    dropId: cleanEnvelope.dropId,
    metaUrl: cleanEnvelope.metaUrl || null,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pairId = searchParams.get("pairId") || "";
  const excludeDeviceId = searchParams.get("excludeDeviceId") || "";

  if (!PAIR_ID_RE.test(pairId)) {
    return NextResponse.json({ error: "Invalid pairId" }, { status: 400 });
  }

  const now = Date.now();
  const drops: EncryptedDropEnvelope[] = [];

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: `mailbox/${pairId}/meta_` });
      const fetched = await Promise.all(
        blobs.map(async (b) => {
          try {
            const res = await fetch(b.url, { cache: "no-store" });
            if (!res.ok) return null;
            const env = (await res.json()) as EncryptedDropEnvelope;
            env.metaUrl = b.url;
            return env;
          } catch {
            return null;
          }
        })
      );

      for (const env of fetched) {
        if (!env) continue;
        if (now - env.createdAt > MAX_AGE_MS) {
          const toDelete = [env.metaUrl, env.blobUrl].filter(Boolean) as string[];
          if (toDelete.length > 0) void del(toDelete).catch(() => {});
          continue;
        }
        if (excludeDeviceId && env.senderDeviceId === excludeDeviceId) continue;
        drops.push(env);
      }
    } catch {
      return NextResponse.json({ ok: true, drops: [] });
    }
  } else {
    const dir = getLocalPairDir(pairId);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.startsWith("meta_") || !file.endsWith(".json")) continue;
        const full = path.join(dir, file);
        try {
          const env = JSON.parse(await readFile(full, "utf8")) as EncryptedDropEnvelope;
          env.metaUrl = file;
          if (now - env.createdAt > MAX_AGE_MS) {
            await unlink(full).catch(() => {});
            const binPath = path.join(dir, `${env.dropId}.enc`);
            await unlink(binPath).catch(() => {});
            continue;
          }
          if (excludeDeviceId && env.senderDeviceId === excludeDeviceId) continue;
          drops.push(env);
        } catch {
          // ignore malformed entry
        }
      }
    } catch {
      // directory not created yet
    }
  }

  drops.sort((a, b) => a.createdAt - b.createdAt);
  return NextResponse.json({ ok: true, drops });
}

export async function DELETE(request: NextRequest) {
  let body: {
    pairId?: string;
    dropId?: string;
    metaUrl?: string;
    blobUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pairId = body.pairId || "";
  const dropId = body.dropId || "";
  if (!PAIR_ID_RE.test(pairId) || !DROP_ID_RE.test(dropId)) {
    return NextResponse.json({ error: "Invalid pairId or dropId" }, { status: 400 });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const urlsToDelete: string[] = [];
    if (body.metaUrl && body.metaUrl.startsWith("https://")) {
      urlsToDelete.push(body.metaUrl);
    } else {
      const { blobs } = await list({ prefix: `mailbox/${pairId}/meta_` });
      for (const b of blobs) {
        if (b.pathname.includes(`_${dropId}.json`)) {
          urlsToDelete.push(b.url);
        }
      }
    }
    if (body.blobUrl && body.blobUrl.startsWith("https://")) {
      urlsToDelete.push(body.blobUrl);
    }
    if (urlsToDelete.length > 0) {
      await del(urlsToDelete).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  const dir = getLocalPairDir(pairId);
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (file.includes(`_${dropId}.json`) || file === `${dropId}.enc`) {
        await unlink(path.join(dir, file)).catch(() => {});
      }
    }
  } catch {
    // ignore missing dir
  }
  return NextResponse.json({ ok: true });
}
