import { soundEngine } from "./soundEngine";
import { rememberTrustedDevice } from "./trustedDevices";
import type {
  BridgeSnapshot,
  ClipboardItem,
  DeviceInfo,
  FileTransferItem,
  TransportMode,
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
  private httpSendChain: Promise<void> = Promise.resolve();
  private wsFailCount = 0;

  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private trustedReconnectTargetCode: string | null = null;

  private useRelayFallback = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private tierRecheckTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingIntent: { action: "create" | "join"; code?: string } | null = null;

  private incomingBuffers = new Map<string, IncomingBuffer>();
  private outgoingQueue: OutgoingJob[] = [];
  private activeOutgoingJob: OutgoingJob | null = null;
  private isSendingLoopActive = false;

  private wakeLockSentinel: WakeLockSentinel | null = null;
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

  public start(initialJoinCode?: string | null, preferredRoomCode?: string | null): void {
    this.destroyed = false;
    const localDevice = detectDeviceInfo();
    this.signalingMode = shouldUseHttpSignaling() ? "http" : "ws";
    this.emit({ localDevice });

    if (initialJoinCode && normalizeCode(initialJoinCode).length >= 4) {
      this.pendingIntent = { action: "join", code: normalizeCode(initialJoinCode) };
      this.emit({ connectionState: "joining", errorMessage: null });
    } else {
      this.pendingIntent = { action: "create", code: preferredRoomCode || undefined };
      this.emit({ connectionState: "booting", errorMessage: null });
    }

    if (this.signalingMode === "http") {
      this.startHttpSignaling();
    } else {
      this.connectWebSocketSignaling();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.clearTimers();
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
    if (this.isTransportReady()) {
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
    this.closePeerConnection();
    this.useRelayFallback = false;
    this.trustedReconnectTargetCode = null;
    this.pendingIntent = { action: "create", code: preferredCode };
    this.emit({
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
        preferredCode,
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
    this.closePeerConnection();
    this.useRelayFallback = false;
    this.pendingIntent = { action: "join", code: clean };
    this.emit({
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

  /**
   * Reconnect to a previously paired trusted room: attempt to join first so if
   * the peer is already hosting we link immediately, and auto-create if nobody
   * is waiting yet.
   */
  public reconnectTrustedRoom(code: string): void {
    const clean = normalizeCode(code);
    if (clean.length < 4) return;
    this.trustedReconnectTargetCode = clean;
    this.joinRoom(clean);
  }

  public disconnectBridge(): void {
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

    const item: ClipboardItem = {
      kind: "text",
      id: makeId("clip"),
      text,
      isUrl: isProbablyUrl(text),
      direction: "outgoing",
      createdAt: Date.now(),
    };

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
    this.sendControl({ type: "file-cancel", id: itemId });
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
  }

  // ---------------- HTTP SIGNALING (Native Vercel Serverless) ----------------

  private enqueueHttpPost(body: Record<string, unknown>): Promise<void> {
    const task = this.httpSendChain.then(async () => {
      if (this.destroyed) return;
      try {
        await fetch("/api/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // transient network error; relay or retry handles recovery
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

      this.scheduleHttpPoll();
    } catch {
      if (this.destroyed) return;
      this.emit({
        signalingConnected: false,
        errorMessage: "Reconnecting to DropBridge signaling…",
      });
      this.reconnectTimer = setTimeout(() => this.startHttpSignaling(), 2000);
    }
  }

  private scheduleHttpPoll(): void {
    if (this.destroyed || this.signalingMode !== "http") return;
    if (this.httpPollTimer) clearTimeout(this.httpPollTimer);

    const isDirectOpen = Boolean(this.dc && this.dc.readyState === "open");
    const isNegotiating =
      this.state.connectionState === "handshaking" ||
      this.state.connectionState === "joining";

    const delayMs = this.useRelayFallback
      ? 240
      : isNegotiating
      ? 250
      : isDirectOpen
      ? 3500
      : 650;

    this.httpPollTimer = setTimeout(async () => {
      if (this.destroyed || this.signalingMode !== "http") return;
      if (!this.state.roomCode) {
        this.scheduleHttpPoll();
        return;
      }
      try {
        const res = await fetch(
          `/api/signal?room=${encodeURIComponent(this.state.roomCode)}&peerId=${encodeURIComponent(this.httpPeerId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = (await res.json()) as { messages?: Record<string, unknown>[] };
          if (!this.state.signalingConnected) {
            this.emit({ signalingConnected: true, errorMessage: null });
          }
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              await this.handleSignalingMessage(msg);
            }
          }
        }
      } catch {
        // transient network blip; keep polling
      }
      this.scheduleHttpPoll();
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
          this.emit({
            connectionState: this.state.remotePeer ? "reconnecting" : "waiting",
          });
        }

        this.wsFailCount++;
        if (this.wsFailCount >= 2 && !process.env.NEXT_PUBLIC_SIGNALING_URL) {
          this.signalingMode = "http";
          this.startHttpSignaling();
          return;
        }

        this.reconnectTimer = setTimeout(() => {
          this.connectWebSocketSignaling();
        }, 2000);
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

  private async handleSignalingMessage(msg: Record<string, unknown>): Promise<void> {
    switch (msg.type) {
      case "room-created": {
        const code = String(msg.code || "");
        const displayCode = String(msg.displayCode || splitDisplayCode(code).full);
        this.pendingIntent = { action: "create", code };
        this.emit({
          roomCode: code,
          displayCode,
          connectionState: this.state.remotePeer ? "connected" : "waiting",
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
          rememberTrustedDevice(peer.device, code);
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
          rememberTrustedDevice(device, this.state.roomCode);
        }
        this.setupWebRTC(role === "initiator");
        break;
      }

      case "peer-left": {
        this.closePeerConnection();
        this.useRelayFallback = false;
        this.releaseWakeLock();
        this.emit({
          remotePeer: null,
          transportMode: "disconnected",
          connectionState: "waiting",
        });
        break;
      }

      case "signal": {
        const payload = msg.payload as {
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
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
        this.emit({
          connectionState: "waiting",
          errorMessage: message,
        });
        break;
      }
    }
  }

  /**
   * Gather local LAN host + STUN candidates before sending SDP in HTTP mode
   * so the entire Offer/Answer travels atomically in 1 request.
   */
  private waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 1200): Promise<void> {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        pc.removeEventListener("icegatheringstatechange", onState);
        pc.removeEventListener("icecandidate", onCand);
        clearTimeout(timer);
        resolve();
      };
      const onState = () => {
        if (pc.iceGatheringState === "complete") done();
      };
      const onCand = (ev: RTCPeerConnectionIceEvent) => {
        if (!ev.candidate) done();
      };
      const timer = setTimeout(done, timeoutMs);
      pc.addEventListener("icegatheringstatechange", onState);
      pc.addEventListener("icecandidate", onCand);
    });
  }

  private setupWebRTC(isInitiator: boolean): void {
    this.closePeerConnection();
    this.useRelayFallback = false;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.pc = pc;

    this.fallbackTimer = setTimeout(() => {
      if (!this.destroyed && (!this.dc || this.dc.readyState !== "open") && this.state.remotePeer) {
        this.activateRelayFallback();
      }
    }, WEBRTC_FALLBACK_TIMEOUT_MS);

    // In WS mode, trickle ICE instantly. In HTTP mode, bundle all candidates atomically into SDP!
    pc.onicecandidate = (event) => {
      if (this.signalingMode === "ws" && event.candidate) {
        this.sendSignal({
          type: "signal",
          payload: { candidate: event.candidate.toJSON() },
        });
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
            await this.waitForIceGatheringComplete(pc, 1200);
          }
          if (pc.localDescription) {
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
            await this.waitForIceGatheringComplete(pc, 1200);
          }
          if (pc.localDescription) {
            this.sendSignal({
              type: "signal",
              payload: { sdp: pc.localDescription.toJSON() },
            });
          }
        }
      } else if (payload.candidate) {
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          this.pendingIceCandidates.push(payload.candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      }
    } catch {
      // Ignore late ICE candidates; Tier 3 fallback guards reliability
    }
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
      const wasAlreadyConnected = this.state.connectionState === "connected";
      // Automatically promote from Relay (if active) straight to Direct P2P / LAN!
      this.useRelayFallback = false;
      this.emit({
        connectionState: "connected",
        transportMode: "p2p-direct",
        errorMessage: null,
      });
      this.detectTransportTier();
      if (this.tierRecheckTimer) clearTimeout(this.tierRecheckTimer);
      this.tierRecheckTimer = setTimeout(() => this.detectTransportTier(), 800);

      if (!wasAlreadyConnected) {
        soundEngine.playConnected();
      }
      this.sendControl({ type: "bridge-hello", device: this.state.localDevice });
      this.requestPendingResumes();
      this.drainOutgoingQueue();
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
      if (!this.useRelayFallback && this.state.remotePeer) {
        this.emit({
          transportMode: "disconnected",
          connectionState: "reconnecting",
        });
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
    this.sendControl({ type: "bridge-hello", device: this.state.localDevice });
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

  private isTransportReady(): boolean {
    if (this.dc && this.dc.readyState === "open") return true;
    if (this.useRelayFallback && this.state.remotePeer) {
      if (this.signalingMode === "http") return true;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
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

  private handleControlMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case "bridge-hello": {
        const device = msg.device as DeviceInfo | undefined;
        if (device) {
          this.emit({ remotePeer: device });
          if (this.state.roomCode) {
            rememberTrustedDevice(device, this.state.roomCode);
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

        // Assemble chunks strictly in sequence order so out-of-order HTTP frames never corrupt files
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

        await this.streamSingleFile(job);
        this.activeOutgoingJob = null;
      }
    } finally {
      this.isSendingLoopActive = false;
      this.maybeReleaseWakeLock();
    }
  }

  private async streamSingleFile(job: OutgoingJob): Promise<void> {
    const { file, itemId } = job;
    this.updateFileItem(itemId, { status: "transferring" });

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

      if (!this.isTransportReady()) {
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
        if (!this.isTransportReady()) {
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

    const totalElapsedSec = Math.max(0.015, (performance.now() - startedAt) / 1000);
    const achievedSpeedBps = file.size > 0 ? Math.round(file.size / totalElapsedSec) : 0;

    this.sendControl({
      type: "file-complete",
      id: itemId,
      crc: job.crc,
    });

    this.updateFileItem(itemId, {
      status: "completed",
      progress: 100,
      bytesTransferred: file.size,
      speedBps: achievedSpeedBps,
      etaSeconds: null,
      verified: true,
    });
    soundEngine.playTransferComplete();
  }

  private updateFileItem(id: string, patch: Partial<FileTransferItem>): void {
    const items = this.state.items.map((item) => {
      if (item.kind === "file" && item.id === id) {
        return { ...item, ...patch };
      }
      return item;
    });
    this.emit({ items });
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (this.wakeLockSentinel) return;
    try {
      this.wakeLockSentinel = await navigator.wakeLock.request("screen");
      this.emit({ wakeLockActive: true });
      this.wakeLockSentinel.addEventListener("release", () => {
        this.wakeLockSentinel = null;
        this.emit({ wakeLockActive: false });
      });
    } catch {
      // WakeLock optional
    }
  }

  private maybeReleaseWakeLock(): void {
    if (this.incomingBuffers.size === 0 && !this.isSendingLoopActive && this.outgoingQueue.length === 0) {
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
