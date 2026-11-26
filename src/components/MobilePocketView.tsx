"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  Camera,
  Check,
  ClipboardPaste,
  Clock,
  Download,
  Inbox,
  LogOut,
  QrCode,
  Radio,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { HistoryEntry } from "@/lib/historyStore";
import type { BridgeSnapshot, FileTransferItem, TrustedDevice } from "@/lib/types";
import { downloadFilesAsZip, formatSpeed } from "@/lib/utils";
import { BridgePulseLoader } from "./BridgePulseLoader";
import { ConnectionBadge } from "./ConnectionBadge";
import { DeviceNameEditor } from "./DeviceNameEditor";
import { DropBridgeLogo } from "./DropBridgeLogo";
import { HistoryPanel } from "./HistoryPanel";
import { PairingCodePanel } from "./PairingCodeInput";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { TransferFeedItem } from "./TransferFeedItem";
import { TrustedDevicesBar } from "./TrustedDevicesBar";

interface MobilePocketViewProps {
  snapshot: BridgeSnapshot;
  trustedDevices: TrustedDevice[];
  historyEntries: HistoryEntry[];
  autoRejoin: boolean;
  canInstallPwa: boolean;
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
}

export function MobilePocketView({
  snapshot,
  trustedDevices,
  historyEntries,
  autoRejoin,
  canInstallPwa,
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
}: MobilePocketViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [clipInput, setClipInput] = useState("");
  const [showClipBox, setShowClipBox] = useState(false);
  const [mobileTab, setMobileTab] = useState<"feed" | "history" | "pair">("pair");

  const isConnected = snapshot.connectionState === "connected";
  const isLinking =
    snapshot.connectionState === "handshaking" ||
    snapshot.connectionState === "joining" ||
    snapshot.connectionState === "reconnecting";

  // Automatically snap straight to the Live Feed the instant a device connects!
  useEffect(() => {
    if (isConnected) {
      setMobileTab("feed");
    } else if (mobileTab === "feed") {
      setMobileTab("pair");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const activeTransfer = snapshot.items.find(
    (item): item is FileTransferItem =>
      item.kind === "file" && item.status === "transferring"
  );

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
    setShowClipBox(false);
    setMobileTab("feed");
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[var(--db-surface)]">
      {/* Hidden native pickers (works on Android Chrome & iOS Safari even over HTTP LAN) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            setMobileTab("feed");
            e.target.value = "";
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            setMobileTab("feed");
            e.target.value = "";
          }
        }}
      />

      {/* TOP SAPPHIRE POCKET STAGE — Compact when Connected so Live Feed sits immediately above the fold! */}
      <section
        className={`db-sapphire-grid relative rounded-b-[26px] px-4 text-white shadow-lg transition-all ${
          isConnected ? "pt-3.5 pb-4" : "pt-4 pb-6"
        }`}
      >
        {/* Mobile Header — Strictly fits 375px with generous breathing room */}
        <header className="flex items-center justify-between gap-2">
          <Link href="/" title="DropBridge Home" className="shrink-0">
            <DropBridgeLogo variant="dark-bg" size="sm" />
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            {isConnected && (
              <button
                type="button"
                onClick={onDisconnect}
                aria-label="Disconnect bridge"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-[#FF5A36] transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <Link
              href="/docs"
              aria-label="Open documentation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
            </Link>
            <SoundToggle onDarkSurface />
            <ThemeToggle onDarkSurface />
          </div>
        </header>

        {/* CONNECTED COMPACT DOCK (Leaves ~68% of screen height immediately for the Live Feed!) */}
        {isConnected ? (
          <div className="mt-3 space-y-2.5">
            {/* Compact Status Strip — Clean 2-line hierarchy with zero clipping at 375px */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#FF5A36] bg-[#FF5A36]/18 text-[#FF5A36]">
                {activeTransfer ? (
                  <span className="font-mono-code text-[11px] font-bold text-white">
                    {activeTransfer.progress}%
                  </span>
                ) : (
                  <Check className="h-5 w-5 stroke-[2.75]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="font-display text-sm font-extrabold tracking-tight text-white leading-tight">
                    {activeTransfer ? "Transferring…" : "Transfer Ready"}
                  </h1>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {snapshot.transportMode === "lan-direct"
                      ? "Direct LAN"
                      : snapshot.transportMode === "p2p-direct"
                      ? "Direct P2P"
                      : "Relay E2EE"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-white/75">
                  {activeTransfer
                    ? `${activeTransfer.name} · ${formatSpeed(activeTransfer.speedBps)}`
                    : `Connected to ${snapshot.remotePeer?.name || "Laptop"} · Lossless`}
                </p>
              </div>
            </div>

            {/* Compact Thumb-Zone Action Row */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="db-btn-coral flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-md cursor-pointer"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>Send Files</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/18 transition-colors cursor-pointer"
              >
                <Camera className="h-4 w-4 text-[#FF5A36] shrink-0" />
                <span>Snap</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClipBox((v) => !v)}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  showClipBox
                    ? "border-[#FF5A36] bg-[#FF5A36]/20 text-white"
                    : "border-white/15 bg-white/10 text-white hover:bg-white/18"
                }`}
              >
                <ClipboardPaste className="h-4 w-4 text-[#FF5A36] shrink-0" />
                <span>Link</span>
              </button>
            </div>

            {showClipBox && (
              <form
                onSubmit={handleClipSubmit}
                className="db-fade-up flex items-center gap-2 rounded-xl border border-white/20 bg-[#0B2640]/90 p-1.5"
              >
                <input
                  type="text"
                  value={clipInput}
                  onChange={(e) => setClipInput(e.target.value)}
                  placeholder="Paste link, OTP, or note…"
                  autoFocus
                  className="flex-1 min-w-0 bg-transparent px-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!clipInput.trim()}
                  className="db-btn-coral inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3.5 text-xs font-bold cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        ) : isLinking ? (
          <div className="mt-4">
            <BridgePulseLoader
              onDark
              label={
                snapshot.connectionState === "reconnecting"
                  ? "Reconnecting bridge…"
                  : "Linking to laptop…"
              }
              sublabel="Selecting fastest encrypted route"
            />
          </div>
        ) : (
          /* UNPAIRED COMPACT HERO */
          <div className="mt-4 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/25 bg-white/8 text-white/85">
              <Radio className="h-7 w-7 text-[#FF5A36]" />
            </div>
            <h1 className="mt-3 font-display text-xl font-extrabold tracking-tight text-white">
              Bridge to Laptop
            </h1>
            <p className="mt-1 text-xs text-white/75 max-w-[260px]">
              Enter your laptop&apos;s pairing code, tap a trusted device, or scan its QR code.
            </p>
            <div className="mt-2.5">
              <ConnectionBadge
                connectionState={snapshot.connectionState}
                transportMode={snapshot.transportMode}
                onDarkSurface
              />
            </div>
          </div>
        )}
      </section>

      {/* LOWER MAIN PANEL — IMMEDIATELY ABOVE THE FOLD! */}
      <main className="flex flex-1 flex-col px-4 pt-3.5 pb-5 space-y-3.5">
        {/* Segmented Navigation Bar (Live Feed | History | Code) */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex flex-1 rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-1 shadow-2xs">
            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => setMobileTab("feed")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    mobileTab === "feed"
                      ? "bg-[#10375C] text-white shadow-xs dark:bg-[#FF5A36]"
                      : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Live Feed ({snapshot.items.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("history")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    mobileTab === "history"
                      ? "bg-[#10375C] text-white shadow-xs dark:bg-[#FF5A36]"
                      : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>History ({historyEntries.length})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMobileTab("pair")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    mobileTab === "pair"
                      ? "bg-[#10375C] text-white shadow-xs dark:bg-[#FF5A36]"
                      : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Pair Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("history")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    mobileTab === "history"
                      ? "bg-[#10375C] text-white shadow-xs dark:bg-[#FF5A36]"
                      : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>History ({historyEntries.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: LIVE FEED (Default whenever Connected!) */}
        {mobileTab === "feed" && isConnected && (
          <div className="flex flex-1 flex-col space-y-2.5">
            {(completedIncomingFiles.length >= 2 || snapshot.items.length > 0) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--db-muted)]">
                  Sent &amp; Received This Session
                </span>
                <div className="flex items-center gap-1.5">
                  {completedIncomingFiles.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => downloadFilesAsZip(completedIncomingFiles)}
                      className="db-btn-coral inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                    >
                      <Archive className="h-3 w-3" />
                      <span>ZIP All</span>
                    </button>
                  )}
                  {snapshot.items.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearFeed}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--db-border)] bg-[var(--db-card)] px-2 py-1 text-[11px] font-medium text-[var(--db-muted)] cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {snapshot.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--db-border-strong)] bg-[var(--db-card)] p-6 text-center min-h-[190px]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF5A36]/12 text-[#FF5A36]">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="mt-3 font-display text-sm font-bold text-[var(--db-ink)]">
                  Files &amp; links appear right here
                </p>
                <p className="mt-1 max-w-[240px] text-xs text-[var(--db-muted)]">
                  Drop a file on {snapshot.remotePeer?.name || "your laptop"} or tap{" "}
                  <strong>Send Files</strong> above — everything streams live with 1-tap Save.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pb-2">
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

        {/* TAB 2: PERSISTENT HISTORY PANEL */}
        {mobileTab === "history" && (
          <HistoryPanel
            entries={historyEntries}
            onRemoveEntry={onRemoveHistoryEntry}
            onClearAll={onClearHistory}
            maxHeightClass="max-h-none"
          />
        )}

        {/* TAB 3: PAIR DEVICE (when Unpaired) */}
        {mobileTab === "pair" && !isConnected && (
          <div className="space-y-3.5">
            <TrustedDevicesBar
              devices={trustedDevices}
              autoRejoin={autoRejoin}
              onToggleAutoRejoin={onToggleAutoRejoin}
              onReconnect={onReconnectTrusted}
              onForget={onForgetTrusted}
            />
            <PairingCodePanel
              displayCode={snapshot.displayCode}
              onJoinCode={onJoinCode}
              onRefreshCode={onRefreshCode}
              errorMessage={snapshot.errorMessage}
              compact
            />
          </div>
        )}

        {/* Mobile footer identity, PWA install & docs link */}
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[var(--db-border)] pt-3 text-[11px] text-[var(--db-muted)]">
          <DeviceNameEditor
            name={snapshot.localDevice.name}
            os={snapshot.localDevice.os}
            onSave={onRenameDevice}
            onDark={false}
          />
          <div className="flex items-center gap-3">
            {canInstallPwa && (
              <button
                type="button"
                onClick={onInstallPwa}
                className="inline-flex items-center gap-1 font-semibold text-[#FF5A36] cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Install App</span>
              </button>
            )}
            <Link href="/docs" className="font-semibold hover:text-[#FF5A36] transition-colors">
              Docs &amp; Help
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
