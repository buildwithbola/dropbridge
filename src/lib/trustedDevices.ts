import type { DeviceInfo, TrustedDevice } from "./types";

const TRUSTED_KEY = "dropbridge-trusted-devices-v1";
const LAST_ROOM_KEY = "dropbridge-last-room-v1";
const AUTO_REJOIN_KEY = "dropbridge-auto-rejoin-v1";

export function getAutoRejoinEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AUTO_REJOIN_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setAutoRejoinEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_REJOIN_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function loadTrustedDevices(): TrustedDevice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRUSTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 5);
  } catch {
    return [];
  }
}

export function rememberTrustedDevice(device: DeviceInfo, roomCode: string): TrustedDevice[] {
  if (typeof window === "undefined" || !device.id || !roomCode) return [];
  const existing = loadTrustedDevices().filter((d) => d.id !== device.id);
  const next: TrustedDevice[] = [
    {
      id: device.id,
      name: device.name,
      kind: device.kind,
      os: device.os,
      roomCode,
      lastPairedAt: Date.now(),
    },
    ...existing,
  ].slice(0, 5);

  try {
    localStorage.setItem(TRUSTED_KEY, JSON.stringify(next));
    localStorage.setItem(LAST_ROOM_KEY, roomCode);
  } catch {
    // ignore storage errors
  }
  return next;
}

export function forgetTrustedDevice(deviceId: string): TrustedDevice[] {
  const next = loadTrustedDevices().filter((d) => d.id !== deviceId);
  try {
    localStorage.setItem(TRUSTED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function getLastPersistentRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}
