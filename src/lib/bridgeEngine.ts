import { upload as uploadToVercelBlob } from "@vercel/blob/client";
import { decryptBytes, decryptJson, encryptBytes, encryptJson } from "./cryptoBox";
import { soundEngine } from "./soundEngine";
import {
  clearAllTrustedDevices,
  getAutoRejoinEnabled,
  getOrCreatePermanentHostIdentity,
  getPrimaryTrustedDevice,
  loadTrustedDevices,
  rememberTrustedDevice,
  rotatePermanentHostIdentity,
} from "./trustedDevices";
import type {
  BridgeSnapshot,
  ClipboardItem,
  DeviceInfo,
  FileTransferItem,
  TransportMode,
  TrustedDevice,
} from "./types";
import {
  detectDeviceInfo,
  getPreviewType,
  isProbablyUrl,
  makeId,
  normalizeCode,
  splitDisplayCode,
  updateCrc32,
} from "./utils";

const SAFE_CHUNK_SIZE = 64 * 1024; // 64KB fallback for Relay & older Safari SCTP
const FAST_CHUNK_SIZE = 128 * 1024; // 128KB for modern Direct LAN WebRTC SCTP
const READ_WINDOW_SIZE = 2 * 1024 * 1024; // 2MB windowed reader to saturate Wi-Fi
const BUFFER_HIGH_WATER = 4 * 1024 * 1024; // 4MB
const BUFFER_LOW_WATER = 1024 * 1024; // 1MB
const WEBRTC_FALLBACK_TIMEOUT_MS = 10_000;

type Listener = (snapshot: BridgeSnapshot) => void;

interface IncomingBuffer {
  itemId: string;
  name: string;
  size: number;
  mimeType: string;
  chunksBySeq: Map<number, Uint8Array>;
  bytesReceived: number;
  startedAt: number;
  lastUiTick: number;
}

interface OutgoingJob {
  itemId: string;
  file: File;
  offset: number;
  seq: number;
  crc: number;
  cancelled: boolean;
}

interface EncryptedInboxDrop {
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

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
  }
  return servers;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (hostname.endsWith(".local")) return true;
  return false;
}

function shouldUseHttpSignaling(): boolean {
  const envUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (envUrl && envUrl.trim()) return false;
  if (typeof window === "undefined") return false;
  return !isPrivateOrLocalHost(window.location.hostname);
}

function resolveSignalingUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  if (typeof window === "undefined") return "ws://localhost:3001";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname || "localhost";
  const port = process.env.NEXT_PUBLIC_SIGNALING_PORT || "3001";
  return `${proto}//${host}:${port}`;
}

function encodeBinaryChunk(meta: { id: string; seq: number; offset: number }, payload: Uint8Array): ArrayBuffer {
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  const out = new Uint8Array(4 + metaBytes.byteLength + payload.byteLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, metaBytes.byteLength, false);
  out.set(metaBytes, 4);
  out.set(payload, 4 + metaBytes.byteLength);
  return out.buffer;
}

function decodeBinaryChunk(buffer: ArrayBuffer): {
  meta: { id: string; seq: number; offset: number };
  payload: Uint8Array;
} | null {
  if (buffer.byteLength < 6) return null;
  const view = new DataView(buffer);
  const metaLen = view.getUint32(0, false);
  if (metaLen <= 0 || 4 + metaLen > buffer.byteLength) return null;
  const metaBytes = new Uint8Array(buffer, 4, metaLen);
  const payload = new Uint8Array(buffer, 4 + metaLen);
  try {
    const meta = JSON.parse(new TextDecoder().decode(metaBytes));
    return { meta, payload };
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class DropBridgeEngine {
  private listeners = new Set<Listener>();
  private incomingCompleteCallback: ((item: FileTransferItem) => void) | null = null;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;

  private signalingMode: "ws" | "http" = "ws";
  private httpPeerId = `p_${Math.random().toString(36).slice(2, 10)}`;
  private httpPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollAbortController: AbortController | null = null;
  private httpSendChain: Promise<void> = Promise.resolve();
  private wsFailCount = 0;
  private lastReannounceAt = 0;

  private hostIdentity = { roomCode: "", pairSecret: "" };
  private activeBond: TrustedDevice | null = null;
  private pendingPairSecret: string | null = null;
  private canonicalSecretOwner = false;
  private isRtcInitiator = false;

  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private outgoingIceBatch: RTCIceCandidateInit[] = [];
  private iceBatchTimer: ReturnType<typeof setTimeout> | null = null;
  private sdpSentForCurrentPc = false;
  private trustedReconnectTargetCode: string | null = null;

  private useRelayFallback = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private tierRecheckTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private inboxPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingIntent: { action: "create" | "join"; code?: string } | null = null;

  private incomingBuffers = new Map<string, IncomingBuffer>();
  private outgoingQueue: OutgoingJob[] = [];
  private activeOutgoingJob: OutgoingJob | null = null;
  private isSendingLoopActive = false;
  private isSyncingInbox = false;
  private processedDropIds = new Set<string>();

  private wakeLockSentinel: WakeLockSentinel | null = null;
  private lifecycleCleanup: (() => void) | null = null;
  private destroyed = false;

  private state: BridgeSnapshot = {
    connectionState: "booting",
    transportMode: "disconnected",
    roomCode: "",
    displayCode: "",
    localDevice: detectDeviceInfo(),
    remotePeer: null,
    items: [],
    errorMessage: null,
    wakeLockActive: false,
    signalingConnected: false,
  };

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): BridgeSnapshot {
    return this.state;
  }

  public getHostPairSecret(): string {
    return (
      this.activeBond?.pairSecret ||
      this.pendingPairSecret ||
      this.hostIdentity.pairSecret ||
      getOrCreatePermanentHostIdentity().pairSecret
    );
  }

  private emit(partial?: Partial<BridgeSnapshot>): void {
    if (partial) {
      this.state = { ...this.state, ...partial };
    } else {
      this.state = { ...this.state };
    }
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public start(initialJoinCode?: string | null, urlPairSecret?: string | null): void {
    this.destroyed = false;
    const localDevice = detectDeviceInfo();
    this.hostIdentity = getOrCreatePermanentHostIdentity();
    this.signalingMode = shouldUseHttpSignaling() ? "http" : "ws";

    const autoRejoin = getAutoRejoinEnabled();
    const existingBond = autoRejoin ? getPrimaryTrustedDevice() : null;
    const cleanJoin = initialJoinCode ? normalizeCode(initialJoinCode) : "";

    if (cleanJoin.length >= 4) {
      const matchedBond = loadTrustedDevices().find((d) => d.roomCode === cleanJoin) || null;
      this.pendingPairSecret = urlPairSecret || matchedBond?.pairSecret || null;
      this.activeBond = matchedBond;
      this.canonicalSecretOwner = Boolean(urlPairSecret);
      this.pendingIntent = { action: "join", code: cleanJoin };
      this.emit({
        localDevice,
        roomCode: cleanJoin,
        displayCode: splitDisplayCode(cleanJoin).full,
        remotePeer: matchedBond
          ? { id: matchedBond.id, name: matchedBond.name, kind: matchedBond.kind, os: matchedBond.os }
          : null,
        connectionState: "joining",
        errorMessage: null,
      });
    } else if (existingBond) {
      this.activeBond = existingBond;
      this.canonicalSecretOwner = existingBond.roomCode === this.hostIdentity.roomCode;
      this.pendingIntent = { action: "create", code: existingBond.roomCode };
      this.emit({
        localDevice,
        roomCode: existingBond.roomCode,
        displayCode: splitDisplayCode(existingBond.roomCode).full,
        remotePeer: {
          id: existingBond.id,
          name: existingBond.name,
          kind: existingBond.kind,
          os: existingBond.os,
        },
        connectionState: "connected",
        transportMode: "standby-inbox",
        errorMessage: null,
      });
      void this.syncOfflineInbox();
    } else {
      this.canonicalSecretOwner = true;
      this.pendingIntent = { action: "create", code: this.hostIdentity.roomCode };
      this.emit({
        localDevice,
        roomCode: this.hostIdentity.roomCode,
        displayCode: splitDisplayCode(this.hostIdentity.roomCode).full,
        connectionState: "booting",
        errorMessage: null,
      });
    }

    this.installLifecycleListeners();
    this.scheduleInboxSafetySync();

    if (this.signalingMode === "http") {
      this.startHttpSignaling();
    } else {
      this.connectWebSocketSignaling();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    this.pollAbortController?.abort();
    this.pollAbortController = null;
    if (this.lifecycleCleanup) {
      this.lifecycleCleanup();
      this.lifecycleCleanup = null;
    }
    this.closePeerConnection();
    this.releaseWakeLock();
    for (const item of this.state.items) {
      if (item.kind === "file" && item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
      }
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  public onIncomingFileComplete(cb: ((item: FileTransferItem) => void) | null): void {
    this.incomingCompleteCallback = cb;
  }

  public updateLocalDeviceName(name: string): void {
    const clean = name.trim().slice(0, 32);
    if (!clean) return;
    const updated: DeviceInfo = { ...this.state.localDevice, name: clean };
    this.emit({ localDevice: updated });
    if (this.isLivePeerReady()) {
      this.sendControl({ type: "bridge-hello", device: updated });
    }
  }

  public removeItem(itemId: string): void {
    const target = this.state.items.find((i) => i.id === itemId);
    if (target && target.kind === "file" && target.blobUrl) {
      URL.revokeObjectURL(target.blobUrl);
    }
    this.emit({ items: this.state.items.filter((i) => i.id !== itemId) });
  }

  public createNewRoom(preferredCode?: string): void {
    this.pollAbortController?.abort();
    this.closePeerConnection();
    this.useRelayFallback = false;
    this.trustedReconnectTargetCode = null;

    if (!preferredCode) {
      this.hostIdentity = rotatePermanentHostIdentity();
      clearAllTrustedDevices();
      this.activeBond = null;
      this.pendingPairSecret = null;
      this.canonicalSecretOwner = true;
    }

    const targetCode = preferredCode || this.hostIdentity.roomCode;
    this.pendingIntent = { action: "create", code: targetCode };
    this.emit({
      roomCode: targetCode,
      displayCode: splitDisplayCode(targetCode).full,
      remotePeer: null,
      transportMode: "disconnected",
      connectionState: "waiting",
      errorMessage: null,
    });

    if (this.signalingMode === "http") {
      this.startHttpSignaling();
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSignal({
        type: "create-room",
        device: this.state.localDevice,
        preferredCode: targetCode,
      });
    } else {
      this.connectWebSocketSignaling();
    }
  }

  public joinRoom(code: string): void {
    const clean = normalizeCode(code);
    if (clean.length < 4) {
      this.emit({ errorMessage: "Enter the pairing code shown on your other device." });
      return;
    }
    this.pollAbortController?.abort();
    this.closePeerConnection();
    this.useRelayFallback = false;
    this.pendingIntent = { action: "join", code: clean };
    this.emit({
      roomCode: clean,
      displayCode: splitDisplayCode(clean).full,
      connectionState: "joining",
      errorMessage: null,
    });

    if (this.signalingMode === "http") {
      this.startHttpSignaling();
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSignal({
        type: "join-room",
        code: clean,
        device: this.state.localDevice,
      });
    } else {
      this.connectWebSocketSignaling();
    }
  }

  public reconnectTrustedRoom(code: string): void {
    const clean = normalizeCode(code);
    if (clean.length < 4) return;
    const match = loadTrustedDevices().find((d) => d.roomCode === clean) || null;
    if (match) {
      this.activeBond = match;
      this.pendingPairSecret = match.pairSecret;
    }
    this.trustedReconnectTargetCode = clean;
    this.joinRoom(clean);
  }

  /**
   * Explicit permanent Unpair: clears bonded devices, notifies peer, rotates host secret & code.
   */
  public disconnectBridge(): void {
    clearAllTrustedDevices();
    this.activeBond = null;
    this.pendingPairSecret = null;
    this.sendSignal({ type: "leave-room" });
    this.closePeerConnection();
    this.useRelayFallback = false;
    this.releaseWakeLock();
    this.createNewRoom();
  }

  public clearFeed(): void {
    for (const item of this.state.items) {
      if (item.kind === "file" && item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
      }
    }
    this.emit({ items: [] });
  }

  public sendText(rawText: string): boolean {
    const text = rawText.trim();
    if (!text) return false;
    if (!this.isTransportReady()) return false;

    const isLive = this.isLivePeerReady();
    const item: ClipboardItem = {
      kind: "text",
      id: makeId("clip"),
      text,
      isUrl: isProbablyUrl(text),
      direction: "outgoing",
      createdAt: Date.now(),
      deliveryMode: isLive ? "live" : "queued",
    };

    if (isLive) {
      this.sendControl({
        type: "clipboard-text",
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
      });
      this.emit({ items: [item, ...this.state.items] });
      soundEngine.playTap();
      return true;
    }

    if (this.activeBond) {
      this.emit({ items: [item, ...this.state.items] });
      soundEngine.playTap();
      void this.queueOfflineText(item, this.activeBond);
      return true;
    }

    return false;
  }

  public sendFiles(fileList: File[] | FileList): void {
    const files = Array.from(fileList || []).filter((f) => f && f.size >= 0);
    if (files.length === 0) return;

    const newItems: FileTransferItem[] = [];
    for (const file of files) {
      const id = makeId("file");
      const previewType = getPreviewType(file.type, file.name);
      const blobUrl = previewType === "image" || previewType === "video" ? URL.createObjectURL(file) : undefined;

      newItems.push({
        kind: "file",
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        direction: "outgoing",
        status: "queued",
        progress: 0,
        bytesTransferred: 0,
        speedBps: 0,
        etaSeconds: null,
        createdAt: Date.now(),
        blobUrl,
        blob: file,
        previewType,
      });

      this.outgoingQueue.push({
        itemId: id,
        file,
        offset: 0,
        seq: 0,
        crc: 0,
        cancelled: false,
      });
    }

    this.emit({ items: [...newItems.reverse(), ...this.state.items] });
    soundEngine.playTap();
    this.drainOutgoingQueue();
  }

  public cancelTransfer(itemId: string): void {
    if (this.activeOutgoingJob && this.activeOutgoingJob.itemId === itemId) {
      this.activeOutgoingJob.cancelled = true;
    }
    this.outgoingQueue = this.outgoingQueue.filter((j) => j.itemId !== itemId);
    if (this.isLivePeerReady()) {
      this.sendControl({ type: "file-cancel", id: itemId });
    }
    this.updateFileItem(itemId, { status: "cancelled", speedBps: 0, etaSeconds: null });
  }

  private clearTimers(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.tierRecheckTimer) {
      clearTimeout(this.tierRecheckTimer);
      this.tierRecheckTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.httpPollTimer) {
      clearTimeout(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.iceBatchTimer) {
      clearTimeout(this.iceBatchTimer);
      this.iceBatchTimer = null;
    }
    if (this.inboxPollTimer) {
      clearTimeout(this.inboxPollTimer);
      this.inboxPollTimer = null;
    }
  }

  private installLifecycleListeners(): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (this.lifecycleCleanup) {
      this.lifecycleCleanup();
    }

    const wakeBridge = () => {
      if (this.destroyed) return;
      this.pollAbortController?.abort();
      if (this.activeBond) {
        void this.syncOfflineInbox();
      }
      if (
        this.signalingMode === "http" &&
        this.pc &&
        (this.pc.iceConnectionState === "failed" || this.pc.iceConnectionState === "disconnected") &&
        this.state.roomCode
      ) {
        this.pendingIntent = { action: "create", code: this.state.roomCode };
        void this.startHttpSignaling();
      } else if (this.signalingMode === "http" && this.state.roomCode) {
        this.scheduleHttpPoll(10);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        wakeBridge();
      }
    };

    const onPageHide = () => {
      if (
        this.signalingMode === "http" &&
        this.state.roomCode &&
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob(
          [
            JSON.stringify({
              action: "peer-away",
              room: this.state.roomCode,
              peerId: this.httpPeerId,
            }),
          ],
          { type: "application/json" }
        );
        navigator.sendBeacon("/api/signal", blob);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", wakeBridge);
    window.addEventListener("online", wakeBridge);
    window.addEventListener("pagehide", onPageHide);

    this.lifecycleCleanup = () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", wakeBridge);
      window.removeEventListener("online", wakeBridge);
      window.removeEventListener("pagehide", onPageHide);
    };
  }

  private scheduleInboxSafetySync(): void {
    if (this.destroyed) return;
    if (this.inboxPollTimer) clearTimeout(this.inboxPollTimer);
    this.inboxPollTimer = setTimeout(async () => {
      if (this.destroyed) return;
      if (this.activeBond) {
        await this.syncOfflineInbox();
      }
      this.scheduleInboxSafetySync();
    }, 25_000);
  }

  // ---------------- HTTP SIGNALING (Long-Poll Serverless) ----------------

  private enqueueHttpPost(body: Record<string, unknown>): Promise<void> {
    const task = this.httpSendChain.then(async () => {
      if (this.destroyed) return;
      try {
        const res = await fetch("/api/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          reannounce?: boolean;
          messages?: Record<string, unknown>[];
        };
        if (data.reannounce && Date.now() - this.lastReannounceAt > 1500) {
          this.lastReannounceAt = Date.now();
          void this.startHttpSignaling();
          return;
        }
        if (Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            await this.handleSignalingMessage(msg);
          }
        }
      } catch {
        // transient network error; retry / offline inbox handles delivery
      }
    });
    this.httpSendChain = task.catch(() => {});
    return task;
  }

  private async startHttpSignaling(): Promise<void> {
    if (this.destroyed) return;
    if (this.httpPollTimer) {
      clearTimeout(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    this.pollAbortController?.abort();

    try {
      const action = this.pendingIntent?.action === "join" ? "join-room" : "create-room";
      const body: Record<string, unknown> = {
        action,
        peerId: this.httpPeerId,
        device: this.state.localDevice,
      };
      if (action === "join-room") {
        body.code = this.pendingIntent?.code;
      } else {
        body.preferredCode = this.pendingIntent?.code || this.state.roomCode || undefined;
      }

      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Signaling HTTP error");
      const data = (await res.json()) as Record<string, unknown>;
      this.emit({ signalingConnected: true, errorMessage: null });

      if (data.peerId) {
        this.httpPeerId = String(data.peerId);
      }

      await this.handleSignalingMessage(data);

      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          await this.handleSignalingMessage(msg as Record<string, unknown>);
        }
      }

      this.scheduleHttpPoll(25);
    } catch {
      if (this.destroyed) return;
      this.emit({
        signalingConnected: false,
        errorMessage: this.activeBond ? null : "Reconnecting to DropBridge signaling…",
      });
      this.reconnectTimer = setTimeout(() => this.startHttpSignaling(), 1800);
    }
  }

  private scheduleHttpPoll(overrideDelayMs?: number): void {
    if (this.destroyed || this.signalingMode !== "http") return;
    if (this.httpPollTimer) clearTimeout(this.httpPollTimer);

    const delayMs = typeof overrideDelayMs === "number" ? overrideDelayMs : 35;

    this.httpPollTimer = setTimeout(async () => {
      if (this.destroyed || this.signalingMode !== "http") return;
      if (!this.state.roomCode) {
        this.scheduleHttpPoll(300);
        return;
      }

      const controller = new AbortController();
      this.pollAbortController = controller;
      let nextDelay = 35;

      try {
        const res = await fetch(
          `/api/signal?room=${encodeURIComponent(this.state.roomCode)}&peerId=${encodeURIComponent(this.httpPeerId)}&wait=1`,
          { cache: "no-store", signal: controller.signal }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            reannounce?: boolean;
            messages?: Record<string, unknown>[];
          };
          if (!this.state.signalingConnected) {
            this.emit({ signalingConnected: true, errorMessage: null });
          }
          if (data.reannounce && Date.now() - this.lastReannounceAt > 1500) {
            this.lastReannounceAt = Date.now();
            this.pendingIntent = { action: "create", code: this.state.roomCode };
            void this.startHttpSignaling();
            return;
          }
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              await this.handleSignalingMessage(msg);
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          nextDelay = 1200;
        }
      } finally {
        if (this.pollAbortController === controller) {
          this.pollAbortController = null;
        }
      }

      this.scheduleHttpPoll(nextDelay);
    }, delayMs);
  }

  // ---------------- WEBSOCKET SIGNALING (Local LAN / Custom WS) ----------------

  private connectWebSocketSignaling(): void {
    if (this.destroyed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = resolveSignalingUrl();
    try {
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      ws.onopen = () => {
        if (this.destroyed) return;
        this.wsFailCount = 0;
        this.emit({ signalingConnected: true, errorMessage: null });

        if (this.pendingIntent?.action === "join" && this.pendingIntent.code) {
          this.sendSignal({
            type: "join-room",
            code: this.pendingIntent.code,
            device: this.state.localDevice,
          });
        } else {
          this.sendSignal({
            type: "create-room",
            device: this.state.localDevice,
            preferredCode: this.pendingIntent?.code || this.state.roomCode || undefined,
          });
        }
      };

      ws.onmessage = async (event) => {
        if (this.destroyed) return;

        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryFrame(event.data);
          return;
        }
        if (event.data instanceof Blob) {
          const buf = await event.data.arrayBuffer();
          this.handleBinaryFrame(buf);
          return;
        }

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }

        await this.handleSignalingMessage(msg);
      };

      ws.onclose = () => {
        if (this.destroyed || this.signalingMode === "http") return;
        this.emit({ signalingConnected: false });

        if (!this.dc || this.dc.readyState !== "open") {
          if (this.activeBond) {
            this.emitStandbyConnected();
          } else {
            this.emit({
              connectionState: this.state.remotePeer ? "reconnecting" : "waiting",
            });
          }
        }

        this.wsFailCount++;
        if (this.wsFailCount >= 2 && !process.env.NEXT_PUBLIC_SIGNALING_URL) {
          this.signalingMode = "http";
          this.startHttpSignaling();
          return;
        }

        this.reconnectTimer = setTimeout(() => {
          this.connectWebSocketSignaling();
        }, 1800);
      };

      ws.onerror = () => {
        if (this.destroyed) return;
        this.emit({ signalingConnected: false });
      };
    } catch {
      this.signalingMode = "http";
      this.startHttpSignaling();
    }
  }

  private sendSignal(payload: Record<string, unknown>): void {
    if (this.signalingMode === "http") {
      const action = String(payload.type || "");
      void this.enqueueHttpPost({
        action,
        room: this.state.roomCode,
        peerId: this.httpPeerId,
        payload: payload.payload,
      });
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private emitStandbyConnected(): void {
    const bond = this.activeBond;
    if (!bond) {
      this.emit({
        remotePeer: null,
        transportMode: "disconnected",
        connectionState: "waiting",
      });
      return;
    }

    this.emit({
      remotePeer: {
        id: bond.id,
        name: bond.name,
        kind: bond.kind,
        os: bond.os,
      },
      transportMode: "standby-inbox",
      connectionState: "connected",
      errorMessage: null,
    });
  }

  private applyBondRecord(device: DeviceInfo, roomCode: string, explicitSecret?: string): TrustedDevice | null {
    const updatedList = rememberTrustedDevice(
      device,
      roomCode,
      explicitSecret || this.pendingPairSecret || undefined
    );
    const saved = updatedList.find((d) => d.id === device.id) || updatedList[0] || null;
    if (saved) {
      this.activeBond = saved;
    }
    return saved;
  }

  private async handleSignalingMessage(msg: Record<string, unknown>): Promise<void> {
    switch (msg.type) {
      case "room-created": {
        const code = String(msg.code || "");
        const displayCode = String(msg.displayCode || splitDisplayCode(code).full);
        this.pendingIntent = { action: "create", code };

        const isLive = Boolean(this.dc && this.dc.readyState === "open") || this.useRelayFallback;
        const nextConnectionState = isLive || this.activeBond ? "connected" : "waiting";
        const nextTransport = isLive
          ? this.state.transportMode
          : this.activeBond
          ? "standby-inbox"
          : "disconnected";

        this.emit({
          roomCode: code,
          displayCode,
          connectionState: nextConnectionState,
          transportMode: nextTransport,
          errorMessage: null,
        });
        break;
      }

      case "room-joined": {
        const code = String(msg.code || "");
        const displayCode = String(msg.displayCode || splitDisplayCode(code).full);
        const peer = msg.peer as { device?: DeviceInfo } | null;
        this.trustedReconnectTargetCode = null;
        this.pendingIntent = { action: "join", code };
        this.emit({
          roomCode: code,
          displayCode,
          remotePeer: peer?.device || null,
          connectionState: "handshaking",
          transportMode: "connecting",
          errorMessage: null,
        });
        if (peer?.device) {
          this.applyBondRecord(peer.device, code);
        }
        this.setupWebRTC(false);
        break;
      }

      case "peer-joined": {
        const device = msg.device as DeviceInfo;
        const role = (msg.role as "initiator" | "responder") || "initiator";
        this.trustedReconnectTargetCode = null;
        this.emit({
          remotePeer: device,
          connectionState: "handshaking",
          transportMode: "connecting",
          errorMessage: null,
        });
        if (device && this.state.roomCode) {
          this.applyBondRecord(device, this.state.roomCode);
        }
        this.setupWebRTC(role === "initiator");
        break;
      }

      case "peer-left": {
        this.closePeerConnection();
        this.useRelayFallback = false;
        this.releaseWakeLock();
        if (this.activeBond) {
          this.emitStandbyConnected();
        } else {
          this.emit({
            remotePeer: null,
            transportMode: "disconnected",
            connectionState: "waiting",
          });
        }
        break;
      }

      case "inbox-updated": {
        if (this.activeBond) {
          void this.syncOfflineInbox();
        }
        break;
      }

      case "signal": {
        const payload = msg.payload as {
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
          candidates?: RTCIceCandidateInit[];
        };
        await this.handleRtcSignal(payload);
        break;
      }

      case "relay-json": {
        const payload = msg.payload as Record<string, unknown>;
        if (!this.useRelayFallback && (!this.dc || this.dc.readyState !== "open")) {
          this.activateRelayFallback();
        }
        this.handleControlMessage(payload);
        break;
      }

      case "relay-bin": {
        const b64 = String(msg.payload || "");
        if (!b64) return;
        if (!this.useRelayFallback && (!this.dc || this.dc.readyState !== "open")) {
          this.activateRelayFallback();
        }
        this.handleBinaryFrame(base64ToArrayBuffer(b64));
        break;
      }

      case "error": {
        const errCode = String(msg.code || "");
        const message = String(msg.message || "Could not connect to bridge.");
        if (
          this.trustedReconnectTargetCode &&
          (errCode === "ROOM_NOT_FOUND" || message.toLowerCase().includes("not found"))
        ) {
          const target = this.trustedReconnectTargetCode;
          this.trustedReconnectTargetCode = null;
          this.createNewRoom(target);
          return;
        }
        this.trustedReconnectTargetCode = null;
        if (this.activeBond) {
          this.emitStandbyConnected();
        } else {
          this.emit({
            connectionState: "waiting",
            errorMessage: message,
          });
        }
        break;
      }
    }
  }

  /**
   * Fast atomic ICE wait for HTTP signaling: resolves 80ms after the first host/srflx
   * candidate lands (capped at 250ms max), avoiding multi-second slow-adapter blocking.
   */
  private waitForIceGatheringComplete(pc: RTCPeerConnection, maxWaitMs = 250): Promise<void> {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      let fastSettleTimer: ReturnType<typeof setTimeout> | null = null;
      const done = () => {
        if (settled) return;
        settled = true;
        pc.removeEventListener("icegatheringstatechange", onState);
        pc.removeEventListener("icecandidate", onCand);
        clearTimeout(hardTimer);
        if (fastSettleTimer) clearTimeout(fastSettleTimer);
        resolve();
      };
      const onState = () => {
        if (pc.iceGatheringState === "complete") done();
      };
      const onCand = (ev: RTCPeerConnectionIceEvent) => {
        if (!ev.candidate) {
          done();
          return;
        }
        if (!fastSettleTimer && (ev.candidate.type === "host" || ev.candidate.type === "srflx")) {
          fastSettleTimer = setTimeout(done, 80);
        }
      };
      const hardTimer = setTimeout(done, maxWaitMs);
      pc.addEventListener("icegatheringstatechange", onState);
      pc.addEventListener("icecandidate", onCand);
    });
  }

  private flushHttpIceBatch(): void {
    if (this.iceBatchTimer) {
      clearTimeout(this.iceBatchTimer);
      this.iceBatchTimer = null;
    }
    if (this.outgoingIceBatch.length === 0) return;
    const batch = this.outgoingIceBatch.splice(0, this.outgoingIceBatch.length);
    this.sendSignal({
      type: "signal",
      payload: { candidates: batch },
    });
  }

  private setupWebRTC(isInitiator: boolean): void {
    this.closePeerConnection();
    this.useRelayFallback = false;
    this.isRtcInitiator = isInitiator;
    this.sdpSentForCurrentPc = false;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.pc = pc;

    this.fallbackTimer = setTimeout(() => {
      if (!this.destroyed && (!this.dc || this.dc.readyState !== "open") && this.state.remotePeer) {
        this.activateRelayFallback();
      }
    }, WEBRTC_FALLBACK_TIMEOUT_MS);

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      if (this.signalingMode === "ws") {
        this.sendSignal({
          type: "signal",
          payload: { candidate: event.candidate.toJSON() },
        });
      } else if (this.sdpSentForCurrentPc) {
        // Batch any late trickle-ICE candidates in HTTP mode to speed cross-carrier NAT punch
        this.outgoingIceBatch.push(event.candidate.toJSON());
        if (!this.iceBatchTimer) {
          this.iceBatchTimer = setTimeout(() => this.flushHttpIceBatch(), 80);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const iceState = this.pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        this.detectTransportTier();
      } else if (iceState === "failed") {
        this.activateRelayFallback();
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel("dropbridge-stream", { ordered: true });
      this.attachDataChannel(dc);
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(async () => {
          if (this.signalingMode === "http") {
            await this.waitForIceGatheringComplete(pc, 250);
          }
          if (pc.localDescription && !this.destroyed && this.pc === pc) {
            this.sdpSentForCurrentPc = true;
            this.sendSignal({
              type: "signal",
              payload: { sdp: pc.localDescription.toJSON() },
            });
          }
        })
        .catch(() => {
          this.activateRelayFallback();
        });
    } else {
      pc.ondatachannel = (event) => {
        this.attachDataChannel(event.channel);
      };
    }
  }

  private async flushPendingIceCandidates(pc: RTCPeerConnection): Promise<void> {
    if (this.pendingIceCandidates.length === 0) return;
    const queued = this.pendingIceCandidates.splice(0, this.pendingIceCandidates.length);
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        // ignore stale/incompatible candidate
      }
    }
  }

  private async handleRtcSignal(payload: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    candidates?: RTCIceCandidateInit[];
  }): Promise<void> {
    if (!this.pc) {
      this.setupWebRTC(false);
    }
    const pc = this.pc;
    if (!pc) return;

    try {
      if (payload.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await this.flushPendingIceCandidates(pc);

        if (payload.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (this.signalingMode === "http") {
            await this.waitForIceGatheringComplete(pc, 250);
          }
          if (pc.localDescription && !this.destroyed && this.pc === pc) {
            this.sdpSentForCurrentPc = true;
            this.sendSignal({
              type: "signal",
              payload: { sdp: pc.localDescription.toJSON() },
            });
          }
        }
      }

      const incomingCands: RTCIceCandidateInit[] = [];
      if (payload.candidate) incomingCands.push(payload.candidate);
      if (Array.isArray(payload.candidates)) incomingCands.push(...payload.candidates);

      for (const cand of incomingCands) {
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          this.pendingIceCandidates.push(cand);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
      }
    } catch {
      // Ignore late ICE candidates; Tier 3 / Offline Mailbox guard reliability
    }
  }

  private sendBridgeHello(): void {
    const canSharePairSync =
      this.state.roomCode &&
      (this.canonicalSecretOwner || this.isRtcInitiator || Boolean(this.activeBond?.pairSecret));

    this.sendControl({
      type: "bridge-hello",
      device: this.state.localDevice,
      pairSync: canSharePairSync
        ? {
            roomCode: this.state.roomCode,
            pairSecret: this.getHostPairSecret(),
          }
        : undefined,
    });
  }

  private attachDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.bufferedAmountLowThreshold = BUFFER_LOW_WATER;

    dc.onopen = () => {
      if (this.fallbackTimer) {
        clearTimeout(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      const wasLive =
        this.state.connectionState === "connected" && this.state.transportMode !== "standby-inbox";
      this.useRelayFallback = false;
      this.emit({
        connectionState: "connected",
        transportMode: "p2p-direct",
        errorMessage: null,
      });
      this.detectTransportTier();
      if (this.tierRecheckTimer) clearTimeout(this.tierRecheckTimer);
      this.tierRecheckTimer = setTimeout(() => this.detectTransportTier(), 600);

      if (!wasLive) {
        soundEngine.playConnected();
      }
      this.sendBridgeHello();
      this.requestPendingResumes();
      this.drainOutgoingQueue();
      if (this.activeBond) {
        void this.syncOfflineInbox();
      }
    };

    dc.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryFrame(event.data);
      } else if (event.data instanceof Blob) {
        this.handleBinaryFrame(await event.data.arrayBuffer());
      } else if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          this.handleControlMessage(parsed);
        } catch {
          // ignore malformed frames
        }
      }
    };

    dc.onclose = () => {
      if (!this.useRelayFallback) {
        if (this.activeBond) {
          this.emitStandbyConnected();
        } else if (this.state.remotePeer) {
          this.emit({
            transportMode: "disconnected",
            connectionState: "reconnecting",
          });
        }
      }
    };
  }

  private activateRelayFallback(): void {
    if (this.useRelayFallback) return;
    if (this.dc && this.dc.readyState === "open") return;
    if (this.signalingMode === "ws" && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) return;

    this.useRelayFallback = true;
    this.emit({
      connectionState: "connected",
      transportMode: "encrypted-relay",
      errorMessage: null,
    });
    soundEngine.playConnected();
    this.sendBridgeHello();
    this.requestPendingResumes();
    this.drainOutgoingQueue();
  }

  private async detectTransportTier(): Promise<void> {
    if (!this.pc || this.useRelayFallback) return;
    try {
      const stats = await this.pc.getStats();
      let selectedPair: Record<string, unknown> | null = null;
      const candidates = new Map<string, Record<string, unknown>>();

      stats.forEach((report) => {
        if (report.type === "local-candidate" || report.type === "remote-candidate") {
          candidates.set(report.id, report as unknown as Record<string, unknown>);
        }
        if (
          report.type === "candidate-pair" &&
          (report.state === "succeeded" || report.nominated)
        ) {
          selectedPair = report as unknown as Record<string, unknown>;
        }
      });

      if (selectedPair) {
        const local = candidates.get(String((selectedPair as Record<string, unknown>).localCandidateId || ""));
        const remote = candidates.get(String((selectedPair as Record<string, unknown>).remoteCandidateId || ""));
        const lType = String(local?.candidateType || "");
        const rType = String(remote?.candidateType || "");

        let mode: TransportMode = "p2p-direct";
        if (lType === "relay" || rType === "relay") {
          mode = "encrypted-relay";
        } else if (lType === "host" && rType === "host") {
          mode = "lan-direct";
        }
        this.emit({ transportMode: mode });
      }
    } catch {
      // keep default p2p-direct
    }
  }

  private closePeerConnection(): void {
    this.pendingIceCandidates = [];
    this.outgoingIceBatch = [];
    this.sdpSentForCurrentPc = false;
    if (this.iceBatchTimer) {
      clearTimeout(this.iceBatchTimer);
      this.iceBatchTimer = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.tierRecheckTimer) {
      clearTimeout(this.tierRecheckTimer);
      this.tierRecheckTimer = null;
    }
    if (this.dc) {
      try {
        this.dc.close();
      } catch {
        // ignore
      }
      this.dc = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }
  }

  private isLivePeerReady(): boolean {
    if (this.dc && this.dc.readyState === "open") return true;
    if (this.useRelayFallback && this.state.transportMode === "encrypted-relay" && this.state.remotePeer) {
      if (this.signalingMode === "http") return true;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  private isTransportReady(): boolean {
    if (this.isLivePeerReady()) return true;
    return Boolean(this.activeBond);
  }

  private getOptimalChunkSize(): number {
    if (this.dc && this.dc.readyState === "open") {
      const maxMsg = this.pc?.sctp?.maxMessageSize || 0;
      if (maxMsg >= FAST_CHUNK_SIZE + 1024) {
        return FAST_CHUNK_SIZE;
      }
    }
    return SAFE_CHUNK_SIZE;
  }

  private sendControl(payload: Record<string, unknown>): void {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(payload));
    } else if (this.useRelayFallback) {
      this.sendSignal({ type: "relay-json", payload });
    }
  }

  private async sendBinary(buffer: ArrayBuffer): Promise<void> {
    if (this.dc && this.dc.readyState === "open") {
      if (this.dc.bufferedAmount > BUFFER_HIGH_WATER) {
        await new Promise<void>((resolve) => {
          const dc = this.dc;
          if (!dc || dc.readyState !== "open") {
            resolve();
            return;
          }
          const onLow = () => {
            dc.removeEventListener("bufferedamountlow", onLow);
            resolve();
          };
          dc.addEventListener("bufferedamountlow", onLow);
          setTimeout(() => {
            dc.removeEventListener("bufferedamountlow", onLow);
            resolve();
          }, 400);
        });
      }
      if (this.dc && this.dc.readyState === "open") {
        this.dc.send(buffer);
      }
    } else if (this.useRelayFallback) {
      if (this.signalingMode === "http") {
        await this.enqueueHttpPost({
          action: "relay-bin",
          room: this.state.roomCode,
          peerId: this.httpPeerId,
          payload: arrayBufferToBase64(buffer),
        });
        return;
      }
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.ws.bufferedAmount > BUFFER_HIGH_WATER) {
          await new Promise((r) => setTimeout(r, 25));
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(buffer);
        }
      }
    }
  }

  private requestPendingResumes(): void {
    for (const buf of this.incomingBuffers.values()) {
      if (buf.bytesReceived < buf.size) {
        this.sendControl({
          type: "file-resume-req",
          id: buf.itemId,
          offset: buf.bytesReceived,
        });
      }
    }
  }

  // ---------------- OFFLINE ENCRYPTED INBOX ("PC IS AWAY") ----------------

  private async queueOfflineText(item: ClipboardItem, bond: TrustedDevice): Promise<void> {
    try {
      const encryptedMeta = await encryptJson(
        { text: item.text, createdAt: item.createdAt },
        bond.pairSecret
      );
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropId: item.id,
          pairId: bond.pairId,
          roomCode: bond.roomCode,
          senderDeviceId: this.state.localDevice.id,
          senderName: this.state.localDevice.name,
          createdAt: item.createdAt,
          kind: "text",
          size: item.text.length,
          encryptedMeta,
        }),
      });
    } catch {
      // ignore transient network error
    }
  }

  private async uploadEncryptedOfflineFile(job: OutgoingJob, bond: TrustedDevice): Promise<void> {
    const { file, itemId } = job;
    const startedAt = performance.now();
    this.updateFileItem(itemId, { status: "transferring", progress: 8, deliveryMode: "queued" });

    try {
      const rawBuf = await file.arrayBuffer();
      const plain = new Uint8Array(rawBuf);
      const crc = updateCrc32(0, plain);

      this.updateFileItem(itemId, { progress: 22 });
      const encrypted = await encryptBytes(plain, bond.pairSecret);
      const encryptedMeta = await encryptJson(
        {
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          crc,
        },
        bond.pairSecret
      );

      const copy = new ArrayBuffer(encrypted.byteLength);
      new Uint8Array(copy).set(encrypted);
      const encryptedBlob = new Blob([copy], { type: "application/octet-stream" });

      let uploadedBlobUrl = "";
      try {
        const result = await uploadToVercelBlob(
          `mailbox/${bond.pairId}/${itemId}.enc`,
          encryptedBlob,
          {
            access: "public",
            handleUploadUrl: "/api/inbox/upload",
            contentType: "application/octet-stream",
            onUploadProgress: ({ percentage }) => {
              const mapped = Math.min(95, Math.max(25, Math.round(25 + percentage * 0.7)));
              const elapsedSec = Math.max(0.05, (performance.now() - startedAt) / 1000);
              const bytesSent = Math.round((percentage / 100) * file.size);
              this.updateFileItem(itemId, {
                status: "transferring",
                progress: mapped,
                bytesTransferred: bytesSent,
                speedBps: bytesSent / elapsedSec,
                deliveryMode: "queued",
              });
            },
          }
        );
        uploadedBlobUrl = result.url;
      } catch {
        const putRes = await fetch(
          `/api/inbox/upload?pairId=${encodeURIComponent(bond.pairId)}&dropId=${encodeURIComponent(itemId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: encryptedBlob,
          }
        );
        if (!putRes.ok) throw new Error("Offline upload failed");
        const putData = (await putRes.json()) as { url: string };
        uploadedBlobUrl = putData.url;
      }

      const regRes = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropId: itemId,
          pairId: bond.pairId,
          roomCode: bond.roomCode,
          senderDeviceId: this.state.localDevice.id,
          senderName: this.state.localDevice.name,
          createdAt: Date.now(),
          kind: "file",
          size: file.size,
          encryptedMeta,
          blobUrl: uploadedBlobUrl,
        }),
      });
      if (!regRes.ok) throw new Error("Inbox registration failed");

      const elapsedSec = Math.max(0.02, (performance.now() - startedAt) / 1000);
      const finalSpeed = file.size > 0 ? Math.round(file.size / elapsedSec) : 0;

      this.updateFileItem(itemId, {
        status: "completed",
        progress: 100,
        bytesTransferred: file.size,
        speedBps: finalSpeed,
        etaSeconds: null,
        verified: true,
        deliveryMode: "queued",
      });
      soundEngine.playTransferComplete();
    } catch {
      this.updateFileItem(itemId, {
        status: "failed",
        speedBps: 0,
        etaSeconds: null,
        error: "Could not upload to encrypted offline queue",
      });
    }
  }

  public async syncOfflineInbox(): Promise<void> {
    const bond = this.activeBond;
    if (!bond || this.isSyncingInbox || this.destroyed) return;

    this.isSyncingInbox = true;
    try {
      const res = await fetch(
        `/api/inbox?pairId=${encodeURIComponent(bond.pairId)}&excludeDeviceId=${encodeURIComponent(this.state.localDevice.id)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { drops?: EncryptedInboxDrop[] };
      const drops = Array.isArray(data.drops) ? data.drops : [];

      for (const drop of drops) {
        if (this.destroyed) break;
        if (this.processedDropIds.has(drop.dropId)) continue;
        this.processedDropIds.add(drop.dropId);

        try {
          if (drop.kind === "text") {
            const meta = await decryptJson<{ text?: string; createdAt?: number }>(
              drop.encryptedMeta,
              bond.pairSecret
            );
            const text = String(meta.text || "");
            if (text) {
              const clipItem: ClipboardItem = {
                kind: "text",
                id: drop.dropId,
                text,
                isUrl: isProbablyUrl(text),
                direction: "incoming",
                createdAt: Number(meta.createdAt || drop.createdAt || Date.now()),
                deliveryMode: "inbox",
              };
              if (!this.state.items.some((i) => i.id === drop.dropId)) {
                this.emit({ items: [clipItem, ...this.state.items] });
                soundEngine.playTransferComplete();
              }
            }
          } else if (drop.kind === "file" && drop.blobUrl) {
            const meta = await decryptJson<{
              name: string;
              mimeType: string;
              size: number;
              crc?: number;
            }>(drop.encryptedMeta, bond.pairSecret);

            const binRes = await fetch(drop.blobUrl, { cache: "no-store" });
            if (!binRes.ok) {
              this.processedDropIds.delete(drop.dropId);
              continue;
            }
            const cipherBytes = new Uint8Array(await binRes.arrayBuffer());
            const plain = await decryptBytes(cipherBytes, bond.pairSecret);
            const verified = typeof meta.crc === "number" ? updateCrc32(0, plain) === meta.crc : true;

            const plainCopy = new ArrayBuffer(plain.byteLength);
            new Uint8Array(plainCopy).set(plain);
            const blob = new Blob([plainCopy], {
              type: meta.mimeType || "application/octet-stream",
            });
            const blobUrl = URL.createObjectURL(blob);

            const fileItem: FileTransferItem = {
              kind: "file",
              id: drop.dropId,
              name: meta.name || "Untitled",
              size: meta.size || plain.byteLength,
              mimeType: meta.mimeType || "application/octet-stream",
              direction: "incoming",
              status: "completed",
              progress: 100,
              bytesTransferred: meta.size || plain.byteLength,
              speedBps: 0,
              etaSeconds: null,
              createdAt: drop.createdAt || Date.now(),
              blob,
              blobUrl,
              previewType: getPreviewType(meta.mimeType || "", meta.name || ""),
              verified,
              deliveryMode: "inbox",
            };

            if (!this.state.items.some((i) => i.id === drop.dropId)) {
              this.emit({ items: [fileItem, ...this.state.items] });
              if (this.incomingCompleteCallback) {
                this.incomingCompleteCallback(fileItem);
              }
              soundEngine.playTransferComplete();
            }
          }

          await fetch("/api/inbox", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pairId: bond.pairId,
              dropId: drop.dropId,
              metaUrl: drop.metaUrl,
              blobUrl: drop.blobUrl,
            }),
          }).catch(() => {});
        } catch {
          // Leave in inbox if decryption/fetch transiently failed
        }
      }
    } finally {
      this.isSyncingInbox = false;
    }
  }

  private handleControlMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case "bridge-hello": {
        const device = msg.device as DeviceInfo | undefined;
        const pairSync = msg.pairSync as { roomCode?: string; pairSecret?: string } | undefined;
        const peerInfo = device || this.state.remotePeer;
        if (device) {
          this.emit({ remotePeer: device });
        }

        const adoptSecret =
          pairSync?.pairSecret && !this.canonicalSecretOwner && !this.pendingPairSecret
            ? pairSync.pairSecret
            : undefined;

        if (peerInfo && this.state.roomCode) {
          const bond = this.applyBondRecord(peerInfo, this.state.roomCode, adoptSecret);
          if (bond) {
            void this.syncOfflineInbox();
          }
        }
        break;
      }

      case "clipboard-text": {
        const id = String(msg.id || makeId("clip"));
        const text = String(msg.text || "");
        if (!text) return;
        const item: ClipboardItem = {
          kind: "text",
          id,
          text,
          isUrl: isProbablyUrl(text),
          direction: "incoming",
          createdAt: Number(msg.createdAt || Date.now()),
          deliveryMode: "live",
        };
        this.emit({ items: [item, ...this.state.items] });
        soundEngine.playTransferComplete();
        break;
      }

      case "file-meta": {
        const id = String(msg.id || "");
        const name = String(msg.name || "Untitled");
        const size = Number(msg.size || 0);
        const mimeType = String(msg.mimeType || "application/octet-stream");
        if (!id) return;

        if (!this.incomingBuffers.has(id)) {
          this.incomingBuffers.set(id, {
            itemId: id,
            name,
            size,
            mimeType,
            chunksBySeq: new Map(),
            bytesReceived: 0,
            startedAt: performance.now(),
            lastUiTick: 0,
          });

          const newItem: FileTransferItem = {
            kind: "file",
            id,
            name,
            size,
            mimeType,
            direction: "incoming",
            status: size === 0 ? "completed" : "transferring",
            progress: size === 0 ? 100 : 0,
            bytesTransferred: 0,
            speedBps: 0,
            etaSeconds: null,
            createdAt: Date.now(),
            previewType: getPreviewType(mimeType, name),
            deliveryMode: "live",
          };
          this.emit({ items: [newItem, ...this.state.items] });
          this.acquireWakeLock();
        }
        break;
      }

      case "file-complete": {
        const id = String(msg.id || "");
        const expectedCrc = typeof msg.crc === "number" ? msg.crc : undefined;
        const buf = this.incomingBuffers.get(id);
        if (!buf) return;

        const orderedSeqs = Array.from(buf.chunksBySeq.keys()).sort((a, b) => a - b);
        const parts: ArrayBuffer[] = [];
        let crc = 0;

        for (const seq of orderedSeqs) {
          const chunk = buf.chunksBySeq.get(seq)!;
          crc = updateCrc32(crc, chunk);
          const copy = new ArrayBuffer(chunk.byteLength);
          new Uint8Array(copy).set(chunk);
          parts.push(copy);
        }

        const blob = new Blob(parts, { type: buf.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const verified = expectedCrc === undefined ? true : crc === expectedCrc;
        const elapsedSec = Math.max(0.015, (performance.now() - buf.startedAt) / 1000);
        const finalSpeedBps = buf.size > 0 ? Math.round(buf.size / elapsedSec) : 0;

        this.incomingBuffers.delete(id);
        this.updateFileItem(id, {
          status: "completed",
          progress: 100,
          bytesTransferred: buf.size,
          speedBps: finalSpeedBps,
          etaSeconds: null,
          blob,
          blobUrl,
          verified,
          deliveryMode: "live",
        });
        const completed = this.state.items.find(
          (i): i is FileTransferItem => i.kind === "file" && i.id === id
        );
        if (completed && this.incomingCompleteCallback) {
          this.incomingCompleteCallback(completed);
        }
        soundEngine.playTransferComplete();
        this.maybeReleaseWakeLock();
        break;
      }

      case "file-cancel": {
        const id = String(msg.id || "");
        this.incomingBuffers.delete(id);
        this.updateFileItem(id, {
          status: "cancelled",
          speedBps: 0,
          etaSeconds: null,
        });
        this.maybeReleaseWakeLock();
        break;
      }

      case "file-resume-req": {
        const id = String(msg.id || "");
        const offset = Number(msg.offset || 0);
        if (this.activeOutgoingJob && this.activeOutgoingJob.itemId === id) {
          this.activeOutgoingJob.offset = offset;
        }
        break;
      }
    }
  }

  private handleBinaryFrame(buffer: ArrayBuffer): void {
    const decoded = decodeBinaryChunk(buffer);
    if (!decoded) return;
    const { meta, payload } = decoded;
    const buf = this.incomingBuffers.get(meta.id);
    if (!buf) return;

    if (buf.chunksBySeq.has(meta.seq)) return;

    const copy = new Uint8Array(payload.byteLength);
    copy.set(payload);
    buf.chunksBySeq.set(meta.seq, copy);
    buf.bytesReceived += copy.byteLength;

    const now = performance.now();
    if (now - buf.lastUiTick >= 90 || buf.bytesReceived >= buf.size) {
      buf.lastUiTick = now;
      const elapsedSec = Math.max(0.02, (now - buf.startedAt) / 1000);
      const speedBps = buf.bytesReceived / elapsedSec;
      const remaining = Math.max(0, buf.size - buf.bytesReceived);
      const etaSeconds = speedBps > 0 ? remaining / speedBps : null;
      const progress = buf.size > 0 ? Math.min(99, Math.round((buf.bytesReceived / buf.size) * 100)) : 100;

      this.updateFileItem(buf.itemId, {
        status: "transferring",
        bytesTransferred: buf.bytesReceived,
        progress,
        speedBps,
        etaSeconds,
      });
    }
  }

  private async drainOutgoingQueue(): Promise<void> {
    if (this.isSendingLoopActive) return;
    if (!this.isTransportReady()) return;

    this.isSendingLoopActive = true;
    await this.acquireWakeLock();

    try {
      while (this.outgoingQueue.length > 0 && this.isTransportReady()) {
        const job = this.outgoingQueue.shift();
        if (!job || job.cancelled) continue;
        this.activeOutgoingJob = job;

        if (this.isLivePeerReady()) {
          await this.streamSingleFile(job);
        } else if (this.activeBond) {
          await this.uploadEncryptedOfflineFile(job, this.activeBond);
        } else {
          this.outgoingQueue.unshift(job);
          break;
        }
        this.activeOutgoingJob = null;
      }
    } finally {
      this.isSendingLoopActive = false;
      this.maybeReleaseWakeLock();
    }
  }

  private async streamSingleFile(job: OutgoingJob): Promise<void> {
    const { file, itemId } = job;
    this.updateFileItem(itemId, { status: "transferring", deliveryMode: "live" });

    this.sendControl({
      type: "file-meta",
      id: itemId,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    });

    const startedAt = performance.now();
    let lastUiTick = 0;

    while (job.offset < file.size) {
      if (job.cancelled) {
        this.updateFileItem(itemId, { status: "cancelled", speedBps: 0, etaSeconds: null });
        return;
      }

      if (!this.isLivePeerReady()) {
        if (this.activeBond && job.offset === 0) {
          await this.uploadEncryptedOfflineFile(job, this.activeBond);
          return;
        }
        this.outgoingQueue.unshift(job);
        return;
      }

      const windowEnd = Math.min(job.offset + READ_WINDOW_SIZE, file.size);
      const windowBuf = await file.slice(job.offset, windowEnd).arrayBuffer();
      const windowBytes = new Uint8Array(windowBuf);
      const chunkSize = this.getOptimalChunkSize();

      let localPos = 0;
      while (localPos < windowBytes.byteLength) {
        if (job.cancelled) {
          this.updateFileItem(itemId, { status: "cancelled", speedBps: 0, etaSeconds: null });
          return;
        }
        if (!this.isLivePeerReady()) {
          this.outgoingQueue.unshift(job);
          return;
        }

        const sliceLen = Math.min(chunkSize, windowBytes.byteLength - localPos);
        const bytes = windowBytes.subarray(localPos, localPos + sliceLen);
        job.crc = updateCrc32(job.crc, bytes);

        const frame = encodeBinaryChunk({ id: itemId, seq: job.seq, offset: job.offset }, bytes);
        if (this.dc && this.dc.readyState === "open" && this.dc.bufferedAmount <= BUFFER_HIGH_WATER) {
          this.dc.send(frame);
        } else {
          await this.sendBinary(frame);
        }

        job.offset += sliceLen;
        job.seq++;
        localPos += sliceLen;

        const now = performance.now();
        if (now - lastUiTick >= 90 || job.offset >= file.size) {
          lastUiTick = now;
          const elapsedSec = Math.max(0.02, (now - startedAt) / 1000);
          const speedBps = job.offset / elapsedSec;
          const remaining = Math.max(0, file.size - job.offset);
          const etaSeconds = speedBps > 0 ? remaining / speedBps : null;
          const progress = file.size > 0 ? Math.min(99, Math.round((job.offset / file.size) * 100)) : 100;

          this.updateFileItem(itemId, {
            status: "transferring",
            bytesTransferred: job.offset,
            progress,
            speedBps,
            etaSeconds,
          });
        }
      }
    }

    this.sendControl({
      type: "file-complete",
      id: itemId,
      crc: job.crc,
    });

    const elapsedSec = Math.max(0.015, (performance.now() - startedAt) / 1000);
    const finalSpeedBps = file.size > 0 ? Math.round(file.size / elapsedSec) : 0;

    this.updateFileItem(itemId, {
      status: "completed",
      progress: 100,
      bytesTransferred: file.size,
      speedBps: finalSpeedBps,
      etaSeconds: null,
      verified: true,
      deliveryMode: "live",
    });
    soundEngine.playTransferComplete();
  }

  private updateFileItem(id: string, patch: Partial<FileTransferItem>): void {
    const idx = this.state.items.findIndex((i) => i.kind === "file" && i.id === id);
    if (idx === -1) return;
    const current = this.state.items[idx] as FileTransferItem;
    const updated: FileTransferItem = { ...current, ...patch };
    const nextItems = [...this.state.items];
    nextItems[idx] = updated;
    this.emit({ items: nextItems });
  }

  private async acquireWakeLock(): Promise<void> {
    if (this.wakeLockSentinel) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      this.wakeLockSentinel = await navigator.wakeLock.request("screen");
      this.emit({ wakeLockActive: true });
      this.wakeLockSentinel.addEventListener("release", () => {
        this.wakeLockSentinel = null;
        this.emit({ wakeLockActive: false });
      });
    } catch {
      // unsupported or background tab
    }
  }

  private maybeReleaseWakeLock(): void {
    if (this.outgoingQueue.length === 0 && !this.activeOutgoingJob && this.incomingBuffers.size === 0) {
      this.releaseWakeLock();
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
      this.emit({ wakeLockActive: false });
    }
  }
}
