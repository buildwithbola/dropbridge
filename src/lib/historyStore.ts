import type { BridgeItem, PreviewType, TransferDirection, TransportMode } from "./types";

const HISTORY_KEY = "dropbridge-transfer-history-v1";
const MAX_HISTORY_ITEMS = 120;

export interface HistoryEntry {
  id: string;
  kind: "file" | "text";
  direction: TransferDirection;
  timestamp: number;
  peerName: string;
  transportMode: TransportMode;
  // File fields
  name?: string;
  size?: number;
  previewType?: PreviewType;
  verified?: boolean;
  // Text/link fields
  text?: string;
  isUrl?: boolean;
}

export function loadTransferHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendTransferHistory(
  item: BridgeItem,
  peerName: string,
  transportMode: TransportMode
): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const existing = loadTransferHistory();
  if (existing.some((h) => h.id === item.id)) return existing;

  const entry: HistoryEntry =
    item.kind === "file"
      ? {
          id: item.id,
          kind: "file",
          direction: item.direction,
          timestamp: item.createdAt || Date.now(),
          peerName: peerName || "Paired Device",
          transportMode,
          name: item.name,
          size: item.size,
          previewType: item.previewType,
          verified: item.verified,
        }
      : {
          id: item.id,
          kind: "text",
          direction: item.direction,
          timestamp: item.createdAt || Date.now(),
          peerName: peerName || "Paired Device",
          transportMode,
          text: item.text,
          isUrl: item.isUrl,
        };

  const next = [entry, ...existing].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota
  }
  return next;
}

export function removeHistoryEntry(id: string): HistoryEntry[] {
  const next = loadTransferHistory().filter((h) => h.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function clearTransferHistory(): HistoryEntry[] {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
  return [];
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
