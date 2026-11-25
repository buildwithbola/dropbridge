import { zipSync } from "fflate";
import type { DeviceInfo, DeviceKind, FileTransferItem, PreviewType } from "./types";

const DEVICE_ID_KEY = "dropbridge-device-id-v1";
const DEVICE_NAME_KEY = "dropbridge-device-name-v1";

export function normalizeCode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function splitDisplayCode(code: string): {
  left: string;
  right: string;
  full: string;
} {
  const clean = normalizeCode(code);
  const left = clean.slice(0, 5);
  const right = clean.slice(5, 8);
  return {
    left,
    right,
    full: right ? `${left}-${right}` : left,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 100 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function formatSpeed(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "0 KB/s";
  return `${formatBytes(bps)}/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s left`;
}

export function isProbablyUrl(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.includes(" ") || trimmed.includes("\n")) return false;
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed);
}

export function getPreviewType(mimeType: string, fileName: string): PreviewType {
  const mime = (mimeType || "").toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "m4v"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
    return "audio";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  return "other";
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below for plain HTTP LAN testing
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadFilesAsZip(files: FileTransferItem[]): Promise<void> {
  const ready = files.filter((f) => f.blob && f.status === "completed");
  if (ready.length === 0) return;

  const archive: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();

  for (const item of ready) {
    if (!item.blob) continue;
    let uniqueName = item.name;
    let counter = 1;
    while (usedNames.has(uniqueName)) {
      const dot = item.name.lastIndexOf(".");
      if (dot > 0) {
        uniqueName = `${item.name.slice(0, dot)} (${counter})${item.name.slice(dot)}`;
      } else {
        uniqueName = `${item.name} (${counter})`;
      }
      counter++;
    }
    usedNames.add(uniqueName);
    const buf = new Uint8Array(await item.blob.arrayBuffer());
    archive[uniqueName] = buf;
  }

  const zipped = zipSync(archive, { level: 0 });
  const zipBuffer = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(zipBuffer).set(zipped);
  const blob = new Blob([zipBuffer], { type: "application/zip" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `DropBridge-Bundle-${stamp}.zip`);
}

// Fast pure-JS CRC32 table for HTTP+HTTPS chunk & file verification
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function updateCrc32(current: number, chunk: Uint8Array): number {
  let c = current ^ 0xffffffff;
  for (let i = 0; i < chunk.length; i++) {
    c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      id: "ssr-device",
      name: "DropBridge Device",
      kind: "desktop",
      os: "Unknown",
    };
  }

  let id = "";
  try {
    id = localStorage.getItem(DEVICE_ID_KEY) || "";
    if (!id) {
      id = `db_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
  } catch {
    id = `db_${Math.random().toString(36).slice(2, 10)}`;
  }

  const ua = navigator.userAgent || "";
  const isIPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIPad;
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let kind: DeviceKind = "desktop";
  let os = "Desktop";
  let defaultName = "Laptop";

  if (isIPhone) {
    kind = "mobile";
    os = "iOS";
    defaultName = "iPhone";
  } else if (isIPad) {
    kind = "tablet";
    os = "iPadOS";
    defaultName = "iPad";
  } else if (isAndroid) {
    kind = /Mobile/i.test(ua) ? "mobile" : "tablet";
    os = "Android";
    defaultName = kind === "mobile" ? "Android Phone" : "Android Tablet";
  } else if (isWindows) {
    kind = "desktop";
    os = "Windows";
    defaultName = "Windows Laptop";
  } else if (isMac) {
    kind = "desktop";
    os = "macOS";
    defaultName = "MacBook";
  } else if (isLinux) {
    kind = "desktop";
    os = "Linux";
    defaultName = "Linux PC";
  }

  let savedName = "";
  try {
    savedName = localStorage.getItem(DEVICE_NAME_KEY) || "";
  } catch {
    // ignore
  }

  return {
    id,
    name: savedName || defaultName,
    kind,
    os,
  };
}

export function saveDeviceName(name: string): void {
  try {
    const clean = name.trim().slice(0, 32);
    if (clean) localStorage.setItem(DEVICE_NAME_KEY, clean);
  } catch {
    // ignore
  }
}

export function makeId(prefix = "item"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
