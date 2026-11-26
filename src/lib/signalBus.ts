export interface PeerDevicePayload {
  id: string;
  name: string;
  kind: "desktop" | "mobile" | "tablet";
  os: string;
}

export interface StoredSignalPeer {
  peerId: string;
  device: PeerDevicePayload;
  queue: Record<string, unknown>[];
  lastSeen: number;
}

export interface StoredSignalRoom {
  code: string;
  displayCode: string;
  peers: Record<string, StoredSignalPeer>;
  createdAt: number;
  lastActivity: number;
}

const globalBus = globalThis as unknown as {
  __DROPBRIDGE_WAITERS__?: Map<string, Set<() => void>>;
  __DROPBRIDGE_ROOMS__?: Map<string, StoredSignalRoom>;
  __DROPBRIDGE_LOCKS__?: Map<string, Promise<unknown>>;
};

const waitersMap: Map<string, Set<() => void>> =
  globalBus.__DROPBRIDGE_WAITERS__ || (globalBus.__DROPBRIDGE_WAITERS__ = new Map());

export const sharedMemRooms: Map<string, StoredSignalRoom> =
  globalBus.__DROPBRIDGE_ROOMS__ || (globalBus.__DROPBRIDGE_ROOMS__ = new Map());

export const sharedRoomLocks: Map<string, Promise<unknown>> =
  globalBus.__DROPBRIDGE_LOCKS__ || (globalBus.__DROPBRIDGE_LOCKS__ = new Map());

/**
 * Wake every long-polling HTTP GET listener waiting on a room immediately (0ms).
 */
export function notifyRoomWaiters(code: string): void {
  const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return;
  const set = waitersMap.get(clean);
  if (!set || set.size === 0) return;
  const callbacks = Array.from(set);
  waitersMap.delete(clean);
  for (const resolve of callbacks) {
    try {
      resolve();
    } catch {
      // ignore
    }
  }
}

export function waitForRoomActivity(code: string, timeoutMs = 3500): Promise<void> {
  const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return new Promise((r) => setTimeout(r, timeoutMs));

  return new Promise((resolve) => {
    let settled = false;
    let set = waitersMap.get(clean);
    if (!set) {
      set = new Set();
      waitersMap.set(clean, set);
    }

    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      set?.delete(done);
      if (set && set.size === 0) {
        waitersMap.delete(clean);
      }
      resolve();
    };

    set.add(done);
    const timer = setTimeout(done, timeoutMs);
  });
}
