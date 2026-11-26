import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "fra1";

const PAIR_ID_RE = /^pair_[a-f0-9]{16,40}$/;
const DROP_ID_RE = /^[a-zA-Z0-9._-]{4,80}$/;

function sanitizeLocalPath(pairId: string, dropId: string): string | null {
  if (!PAIR_ID_RE.test(pairId) || !DROP_ID_RE.test(dropId)) return null;
  const dir = path.join(os.tmpdir(), "dropbridge-mailbox", pairId);
  return path.join(dir, `${dropId}.enc`);
}

/**
 * POST /api/inbox/upload
 * Issues client upload tokens for Vercel Blob when configured (direct browser -> Blob edge).
 */
export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob token not configured; use PUT /api/inbox/upload fallback." },
      { status: 503 }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^mailbox\/pair_[a-f0-9]{16,40}\/[a-zA-Z0-9._-]+\.enc$/.test(pathname)) {
          throw new Error("Invalid DropBridge mailbox upload path");
        }
        return {
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: false,
          allowedContentTypes: ["application/octet-stream"],
        };
      },
      onUploadCompleted: async () => {
        // Metadata registration happens explicitly after client encryption succeeds.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload token failed" },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/inbox/upload?pairId=...&dropId=...
 * Local dev / fallback encrypted payload upload when BLOB_READ_WRITE_TOKEN is absent.
 */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pairId = searchParams.get("pairId") || "";
  const dropId = searchParams.get("dropId") || "";
  const targetPath = sanitizeLocalPath(pairId, dropId);
  if (!targetPath) {
    return NextResponse.json({ error: "Invalid pairId or dropId" }, { status: 400 });
  }

  const buf = Buffer.from(await request.arrayBuffer());
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, buf);

  return NextResponse.json({
    ok: true,
    url: `/api/inbox/upload?pairId=${encodeURIComponent(pairId)}&dropId=${encodeURIComponent(dropId)}`,
  });
}

/**
 * GET /api/inbox/upload?pairId=...&dropId=...
 * Local dev / fallback encrypted payload download.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pairId = searchParams.get("pairId") || "";
  const dropId = searchParams.get("dropId") || "";
  const targetPath = sanitizeLocalPath(pairId, dropId);
  if (!targetPath) {
    return NextResponse.json({ error: "Invalid pairId or dropId" }, { status: 400 });
  }

  try {
    const data = await readFile(targetPath);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Encrypted drop not found" }, { status: 404 });
  }
}
