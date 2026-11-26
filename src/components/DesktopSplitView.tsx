"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  ClipboardPaste,
  Clock,
  Download,
  FolderCheck,
  FolderDown,
  Inbox,
  Link2,
  LogOut,
  QrCode,
  Send,
  Shield,
  Trash2,
} from "lucide-react";
import type { HistoryEntry } from "@/lib/historyStore";
import type { BridgeSnapshot, FileTransferItem, TrustedDevice } from "@/lib/types";
import { downloadFilesAsZip, formatSpeed } from "@/lib/utils";
import { BridgePulseLoader } from "./BridgePulseLoader";
import { ConnectionBadge } from "./ConnectionBadge";
import { DeviceNameEditor } from "./DeviceNameEditor";
import { DropBridgeLogo } from "./DropBridgeLogo";
import { DropZoneRing } from "./DropZoneRing";
import { HistoryPanel } from "./HistoryPanel";
import { PairingCodePanel } from "./PairingCodeInput";
import { QrCodeCard } from "./QrCodeCard";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { TransferFeedItem } from "./TransferFeedItem";
import { TrustedDevicesBar } from "./TrustedDevicesBar";

interface DesktopSplitViewProps {
  snapshot: BridgeSnapshot;
  joinUrl: string;
  lanIp: string | null;
  isLocalhost: boolean;
  isDragging: boolean;
  trustedDevices: TrustedDevice[];
  historyEntries: HistoryEntry[];
  autoRejoin: boolean;
  canInstallPwa: boolean;
  canUseFolderAutoSave: boolean;
  autoSaveFolderName: string | null;
  autoSavedIds: Set<string>;
  onFilesSelected: (files: FileList | File[]) => void;
  onSendText: (text: string) => void;
  onJoinCode: (code: string) => void;
  onRefreshCode: () => void;
  onDisconnect: () => void;
  onCancelTransfer: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearFeed: () => void;
  onPreviewFile: (item: FileTransferItem) => void;
  onRenameDevice: (nextName: string) => void;
  onToggleAutoRejoin: (next: boolean) => void;
  onReconnectTrusted: (device: TrustedDevice) => void;
  onForgetTrusted: (deviceId: string) => void;
  onRemoveHistoryEntry: (id: string) => void;
  onClearHistory: () => void;
  onInstallPwa: () => void;
  onPickAutoSaveFolder: () => void;
  onDisableAutoSaveFolder: () => void;
}

export function DesktopSplitView({
  snapshot,
  joinUrl,
  lanIp,
  isLocalhost,
  isDragging,
  trustedDevices,
  historyEntries,
  autoRejoin,
  canInstallPwa,
  canUseFolderAutoSave,
  autoSaveFolderName,
  autoSavedIds,
  onFilesSelected,
  onSendText,
  onJoinCode,
  onRefreshCode,
  onDisconnect,
  onCancelTransfer,
  onRemoveItem,
  onClearFeed,
  onPreviewFile,
  onRenameDevice,
  onToggleAutoRejoin,
  onReconnectTrusted,
  onForgetTrusted,
  onRemoveHistoryEntry,
  onClearHistory,
  onInstallPwa,
  onPickAutoSaveFolder,
  onDisableAutoSaveFolder,
}: DesktopSplitViewProps) {
  const [clipInput, setClipInput] = useState("");
  const [rightTab, setRightTab] = useState<"pair" | "feed" | "history">("pair");

  const isConnected = snapshot.connectionState === "connected";
  const isLinking =
    snapshot.connectionState === "handshaking" ||
    snapshot.connectionState === "joining" ||
    snapshot.connectionState === "reconnecting";

  // Automatically jump straight to Live Feed whenever a device connects!
  useEffect(() => {
    if (isConnected) {
      setRightTab("feed");
    } else if (rightTab === "feed") {
      setRightTab("pair");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const activeTransfers = snapshot.items.filter(
    (item): item is FileTransferItem =>
      item.kind === "file" &&
      (item.status === "transferring" || item.status === "queued")
  );
  const activeTransfer = activeTransfers.find((t) => t.status === "transferring") || null;

  const completedIncomingFiles = snapshot.items.filter(
    (item): item is FileTransferItem =>
      item.kind === "file" &&
      item.direction === "incoming" &&
      item.status === "completed" &&
      Boolean(item.blob)
  );

  const handleClipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipInput.trim()) return;
    onSendText(clipInput);
    setClipInput("");
    setRightTab("feed");
  };

  return (
    <div className="relative grid min-h-dvh w-full lg:grid-cols-2">
      {/* LEFT PANE: Sapphire Blue Vault */}
      <section className="db-sapphire-grid relative flex flex-col justify-between px-8 py-7 xl:px-12 xl:py-9 text-white">
        {/* Top brand bar */}
        <header className="flex items-center justify-between gap-4">
          <Link href="/" title="Back to DropBridge Homepage" className="hover:opacity-90 transition-opacity">
            <DropBridgeLogo variant="dark-bg" size="md" showTagline />
          </Link>
          <ConnectionBadge
            connectionState={snapshot.connectionState}
            transportMode={snapshot.transportMode}
            peerName={snapshot.remotePeer?.name}
            onDarkSurface
          />
        </header>

        {/* Center circular Drop Zone */}
        <div className="my-8 flex flex-col items-center justify-center">
          <DropZoneRing
            isConnected={isConnected}
            isDragging={isDragging}
            activeProgress={activeTransfer ? activeTransfer.progress : null}
            activeSpeedBps={activeTransfer ? activeTransfer.speedBps : 0}
            activeFileName={activeTransfer ? activeTransfer.name : null}
            onFilesSelected={(files) => {
              onFilesSelected(files);
              if (isConnected) setRightTab("feed");
            }}
          />
        </div>

        {/* Bottom Instant Text & Link Clipboard Bridge */}
        <div className="space-y-3">
          <form
            onSubmit={handleClipSubmit}
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] p-2 backdrop-blur-sm focus-within:border-[#FF5A36]/80 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80">
              <ClipboardPaste className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={clipInput}
              onChange={(e) => setClipInput(e.target.value)}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? `Paste a link, OTP, or note to send to ${snapshot.remotePeer?.name || "phone"}…`
                  : "Pair your phone to beam links & notes instantly…"
              }
              className="flex-1 min-w-0 bg-transparent px-1 text-sm text-white placeholder:text-white/50 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!isConnected || !clipInput.trim()}
              className="db-btn-coral inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold cursor-pointer shrink-0"
            >
              <span>Beam</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-white/55 px-1">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#FF5A36]" />
              End-to-end encrypted · Zero cloud storage
            </span>
            <DeviceNameEditor
              name={snapshot.localDevice.name}
              os={snapshot.localDevice.os}
              onSave={onRenameDevice}
              onDark
            />
          </div>
        </div>
      </section>

      {/* CENTER SEAM MEDALLION */}
      <div
        className="pointer-events-none hidden lg:flex fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        aria-hidden="true"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-[var(--db-surface)] shadow-lg transition-all duration-300 ${
            isConnected
              ? "bg-[#FF5A36] text-white scale-105"
              : "bg-[#10375C] text-white"
          }`}
        >
          {isConnected ? (
            <Link2 className="h-5 w-5" />
          ) : (
            <span className="font-display text-xs font-bold tracking-tight">or</span>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Off-White Pairing, Live Bridge Feed & Persistent History */}
      <section className="flex flex-col justify-between bg-[var(--db-surface)] px-8 py-7 xl:px-12 xl:py-9">
        {/* Top Header + Utility Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold tracking-tight text-[var(--db-ink)]">
                {isConnected
                  ? snapshot.transportMode === "standby-inbox"
                    ? `Paired with ${snapshot.remotePeer?.name || "Mobile Device"}`
                    : `Bridged with ${snapshot.remotePeer?.name || "Mobile Device"}`
                  : "Pair your phone in 3 seconds"}
              </h1>
              <p className="text-xs text-[var(--db-muted)]">
                {isConnected
                  ? snapshot.transportMode === "standby-inbox"
                    ? "Permanently paired — drop files or links anytime; they land automatically when online."
                    : "Drag files, press Ctrl+V, or send links from either device."
                  : "Works on Android & iOS — over Wi-Fi, hotspot, or 5G."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canInstallPwa && (
                <button
                  type="button"
                  onClick={onInstallPwa}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FF5A36]/40 bg-[#FF5A36]/10 px-3 text-xs font-semibold text-[#FF5A36] hover:bg-[#FF5A36] hover:text-white transition-colors cursor-pointer"
                  title="Install DropBridge as a standalone PWA app"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Install App</span>
                </button>
              )}
              {isConnected && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--db-border)] bg-[var(--db-card)] px-3 text-xs font-semibold text-[#E03E26] hover:border-[#FF5A36] transition-colors cursor-pointer"
                  title="Disconnect current bridge"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Unlink</span>
                </button>
              )}
              <Link
                href="/docs"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--db-border)] bg-[var(--db-card)] px-3 text-xs font-semibold text-[var(--db-slate)] hover:border-[var(--db-border-strong)] transition-colors"
                title="Open DropBridge documentation"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Docs</span>
              </Link>
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Persistent Desktop Tab Switcher: Feed / History / Pair */}
          <div className="inline-flex rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-1 shadow-2xs">
            {isConnected && (
              <button
                type="button"
                onClick={() => setRightTab("feed")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  rightTab === "feed"
                    ? "bg-[#10375C] text-white dark:bg-[#FF5A36]"
                    : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>Live Feed ({snapshot.items.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRightTab("pair")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                rightTab === "pair"
                  ? "bg-[#10375C] text-white dark:bg-[#FF5A36]"
                  : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>{isConnected ? "Code & QR" : "Pair Device"}</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab("history")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                rightTab === "history"
                  ? "bg-[#10375C] text-white dark:bg-[#FF5A36]"
                  : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>History ({historyEntries.length})</span>
            </button>
          </div>
        </div>

        {/* MAIN STAGE */}
        {isLinking ? (
          <div className="my-auto py-8 max-w-md mx-auto w-full">
            <BridgePulseLoader
              label={
                snapshot.connectionState === "reconnecting"
                  ? "Reconnecting your bridge…"
                  : "Establishing encrypted bridge…"
              }
              sublabel="Probing Direct LAN → STUN P2P → Encrypted Relay"
            />
          </div>
        ) : rightTab === "history" ? (
          <div className="my-4 flex-1 flex flex-col min-h-0">
            <HistoryPanel
              entries={historyEntries}
              onRemoveEntry={onRemoveHistoryEntry}
              onClearAll={onClearHistory}
            />
          </div>
        ) : rightTab === "pair" || !isConnected ? (
          <div className="my-auto py-4 space-y-5 max-w-lg mx-auto w-full">
            <QrCodeCard joinUrl={joinUrl} lanIp={lanIp} isLocalhost={isLocalhost} />

            <PairingCodePanel
              displayCode={snapshot.displayCode}
              onJoinCode={onJoinCode}
              onRefreshCode={onRefreshCode}
              errorMessage={snapshot.errorMessage}
            />

            <TrustedDevicesBar
              devices={trustedDevices}
              autoRejoin={autoRejoin}
              onToggleAutoRejoin={onToggleAutoRejoin}
              onReconnect={onReconnectTrusted}
              onForget={onForgetTrusted}
            />
          </div>
        ) : (
          <div className="my-4 flex-1 flex flex-col min-h-0">
            {/* Multi-file active queue banner */}
            {activeTransfers.length > 0 && activeTransfer && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#FF5A36]/30 bg-[#FF5A36]/10 px-3.5 py-2 text-xs">
                <span className="font-semibold text-[var(--db-ink)] truncate">
                  Streaming {activeTransfer.name}
                  {activeTransfers.length > 1
                    ? ` (+${activeTransfers.length - 1} queued)`
                    : ""}
                </span>
                <span className="shrink-0 font-mono-code font-bold text-[#FF5A36]">
                  {activeTransfer.progress}% · {formatSpeed(activeTransfer.speedBps)}
                </span>
              </div>
            )}

            {/* Feed toolbar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--db-muted)]">
                Sent &amp; Received ({snapshot.items.length})
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {canUseFolderAutoSave && (
                  <button
                    type="button"
                    onClick={
                      autoSaveFolderName ? onDisableAutoSaveFolder : onPickAutoSaveFolder
                    }
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      autoSaveFolderName
                        ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "border-[var(--db-border-strong)] bg-[var(--db-card)] text-[var(--db-slate)] hover:border-[#FF5A36]"
                    }`}
                    title={
                      autoSaveFolderName
                        ? `Auto-saving incoming files to "${autoSaveFolderName}". Click to disable.`
                        : "Automatically save incoming phone files straight to a folder on your PC"
                    }
                  >
                    {autoSaveFolderName ? (
                      <>
                        <FolderCheck className="h-3.5 w-3.5" />
                        <span className="max-w-[110px] truncate">{autoSaveFolderName}</span>
                      </>
                    ) : (
                      <>
                        <FolderDown className="h-3.5 w-3.5" />
                        <span>Auto-Save Folder</span>
                      </>
                    )}
                  </button>
                )}

                {completedIncomingFiles.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => downloadFilesAsZip(completedIncomingFiles)}
                    className="db-btn-coral inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Save All (.zip)</span>
                  </button>
                )}
                {snapshot.items.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearFeed}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--db-border)] bg-[var(--db-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--db-muted)] hover:text-[#E03E26] transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {snapshot.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--db-border-strong)] bg-[var(--db-card)]/60 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5A36]/12 text-[#FF5A36]">
                  <Link2 className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-display text-base font-bold text-[var(--db-ink)]">
                  Bridge is open and listening
                </h2>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--db-muted)]">
                  Drop photos, full-HD videos, PDFs, or links on the left—or tap{" "}
                  <strong>Send Files</strong> or <strong>Snap</strong> on your phone.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 db-scroll max-h-[calc(100dvh-265px)]">
                {snapshot.items.map((item) => (
                  <TransferFeedItem
                    key={item.id}
                    item={item}
                    autoSaved={autoSavedIds.has(item.id)}
                    onCancel={onCancelTransfer}
                    onRemove={onRemoveItem}
                    onPreview={onPreviewFile}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subtle Footer Meta */}
        <footer className="flex items-center justify-between border-t border-[var(--db-border)] pt-3.5 text-[11px] text-[var(--db-muted)]">
          <span>
            {snapshot.signalingConnected
              ? "Signaling online · Auto-waterfall transport active"
              : "Connecting to signaling server…"}
          </span>
          <div className="flex items-center gap-3">
            <Link href="/docs" className="hover:text-[#FF5A36] transition-colors font-medium">
              Documentation
            </Link>
            <span className="font-mono-code">
              {snapshot.wakeLockActive ? "Wake Lock Active" : "v1.3 · Pure PWA + WebRTC"}
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
}
