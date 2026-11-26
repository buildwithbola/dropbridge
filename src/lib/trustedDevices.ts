import { derivePairId, generatePairSecret } from "./cryptoBox";
import type { DeviceInfo, TrustedDevice } from "./types";
import { normalizeCode } from "./utils";

const TRUSTED_KEY = "dropbridge-trusted-devices-v1";
const LAST_ROOM_KEY = "dropbridge-last-room-v1";
const AUTO_REJOIN_KEY = "dropbridge-auto-rejoin-v1";
const HOST_IDENTITY_KEY = "dropbridge-permanent-host-v1";

const CODE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createFreshRoomCode(): string {
  let digits = "";
  for (let i = 0; i < 5; i++) digits += String(Math.floor(Math.random() * 10));
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)];
  return `${digits}${suffix}`;
}

export function getOrCreatePermanentHostIdentity(): { roomCode: string; pairSecret: string } {
  if (typeof window === "undefined") {
    return { roomCode: "", pairSecret: "" };
  }
  try {
    const raw = localStorage.getItem(HOST_IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { roomCode?: string; pairSecret?: string };
      const cleanCode = normalizeCode(parsed.roomCode || "");
      if (cleanCode.length >= 6 && parsed.pairSecret && parsed.pairSecret.length >= 16) {
        return { roomCode: cleanCode, pairSecret: parsed.pairSecret };
      }
    }
  } catch {
    // create fresh below
  }
  return rotatePermanentHostIdentity();
}

export function rotatePermanentHostIdentity(): { roomCode: string; pairSecret: string } {
  const identity = {
    roomCode: createFreshRoomCode(),
    pairSecret: generatePairSecret(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HOST_IDENTITY_KEY, JSON.stringify(identity));
    } catch {
      // ignore storage errors
    }
  }
  return identity;
}

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
    const hostFallback = getOrCreatePermanentHostIdentity();
    return parsed
      .filter((d) => d && typeof d.id === "string" && typeof d.roomCode === "string")
      .map((d) => {
        const cleanCode = normalizeCode(d.roomCode);
        const secret =
          typeof d.pairSecret === "string" && d.pairSecret.length >= 16
            ? d.pairSecret
            : hostFallback.pairSecret;
        const pairId =
          typeof d.pairId === "string" && d.pairId.startsWith("pair_")
            ? d.pairId
            : derivePairId(cleanCode, secret);
        return {
          ...d,
          roomCode: cleanCode,
          pairSecret: secret,
          pairId,
        } as TrustedDevice;
      })
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function rememberTrustedDevice(
  device: DeviceInfo,
  roomCode: string,
  pairSecret?: string
): TrustedDevice[] {
  const cleanCode = normalizeCode(roomCode);
  if (typeof window === "undefined" || !device.id || cleanCode.length < 4) return [];

  const currentList = loadTrustedDevices();
  const prevMatch = currentList.find((d) => d.id === device.id || d.roomCode === cleanCode);
  const resolvedSecret =
    pairSecret && pairSecret.length >= 16
      ? pairSecret
      : prevMatch?.pairSecret || getOrCreatePermanentHostIdentity().pairSecret;
  const pairId = derivePairId(cleanCode, resolvedSecret);

  const existing = currentList.filter((d) => d.id !== device.id);
  const next: TrustedDevice[] = [
    {
      id: device.id,
      name: device.name,
      kind: device.kind,
      os: device.os,
      roomCode: cleanCode,
      pairId,
      pairSecret: resolvedSecret,
      lastPairedAt: Date.now(),
    },
    ...existing,
  ].slice(0, 5);

  try {
    localStorage.setItem(TRUSTED_KEY, JSON.stringify(next));
    localStorage.setItem(LAST_ROOM_KEY, cleanCode);
  } catch {
    // ignore storage errors
  }
  return next;
}

export function getPrimaryTrustedDevice(): TrustedDevice | null {
  const list = loadTrustedDevices();
  const first = list[0];
  if (!first || !first.roomCode || !first.pairSecret || !first.pairId) return null;
  return first;
}

export function forgetTrustedDevice(deviceId: string): TrustedDevice[] {
  const next = loadTrustedDevices().filter((d) => d.id !== deviceId);
  try {
    localStorage.setItem(TRUSTED_KEY, JSON.stringify(next));
    if (next.length === 0) {
      localStorage.removeItem(LAST_ROOM_KEY);
    } else {
      localStorage.setItem(LAST_ROOM_KEY, next[0].roomCode);
    }
  } catch {
    // ignore
  }
  return next;
}

export function clearAllTrustedDevices(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRUSTED_KEY);
    localStorage.removeItem(LAST_ROOM_KEY);
  } catch {
    // ignore
  }
}

export function getLastPersistentRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}
