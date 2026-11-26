export type DeviceKind = "desktop" | "mobile" | "tablet";

export interface DeviceInfo {
  id: string;
  name: string;
  kind: DeviceKind;
  os: string;
}

export type TransportMode =
  | "connecting"
  | "lan-direct"
  | "p2p-direct"
  | "encrypted-relay"
  | "standby-inbox"
  | "disconnected";

export type ConnectionState =
  | "booting"
  | "waiting"
  | "joining"
  | "handshaking"
  | "connected"
  | "reconnecting"
  | "error";

export type TransferDirection = "outgoing" | "incoming";

export type TransferStatus =
  | "queued"
  | "transferring"
  | "completed"
  | "failed"
  | "cancelled";

export type PreviewType = "image" | "video" | "audio" | "pdf" | "other";

export type DeliveryMode = "live" | "queued" | "inbox";

export interface FileTransferItem {
  kind: "file";
  id: string;
  name: string;
  size: number;
  mimeType: string;
  direction: TransferDirection;
  status: TransferStatus;
  progress: number; // 0..100
  bytesTransferred: number;
  speedBps: number;
  etaSeconds: number | null;
  createdAt: number;
  blobUrl?: string;
  blob?: Blob;
  previewType: PreviewType;
  verified?: boolean;
  deliveryMode?: DeliveryMode;
  error?: string;
}

export interface ClipboardItem {
  kind: "text";
  id: string;
  text: string;
  isUrl: boolean;
  direction: TransferDirection;
  createdAt: number;
  deliveryMode?: DeliveryMode;
}

export type BridgeItem = FileTransferItem | ClipboardItem;

export interface TrustedDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  os: string;
  roomCode: string;
  pairId: string;
  pairSecret: string;
  lastPairedAt: number;
}

export interface BridgeSnapshot {
  connectionState: ConnectionState;
  transportMode: TransportMode;
  roomCode: string;
  displayCode: string;
  localDevice: DeviceInfo;
  remotePeer: DeviceInfo | null;
  items: BridgeItem[];
  errorMessage: string | null;
  wakeLockActive: boolean;
  signalingConnected: boolean;
}
