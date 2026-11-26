"use client";

import React, { useEffect, useState } from "react";
import {
  Camera,
  Check,
  Clock,
  Download,
  FolderCheck,
  Link2,
  Smartphone,
} from "lucide-react";

const MINI_HISTORY = [
  { id: "1", kind: "file", name: "product-shoot-raw.jpg", meta: "12.4 MB · 71.2 MB/s" },
  { id: "2", kind: "text", name: "https://vercel.com/dropbridge", meta: "Link · 1-tap Copy" },
  { id: "3", kind: "file", name: "invoice-nov-2026.pdf", meta: "1.8 MB · Lossless" },
] as const;

export function CapabilitiesBento({
  isStandalone,
  onInstallClick,
}: {
  isStandalone: boolean;
  onInstallClick: () => void;
}) {
  const [beamCount, setBeamCount] = useState(0);
  const [keysPressed, setKeysPressed] = useState(false);
  const [snapTaken, setSnapTaken] = useState(false);
  const [autoSaveOn, setAutoSaveOn] = useState(true);
  const [histTab, setHistTab] = useState<"all" | "file" | "text">("all");

  const trackPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const triggerCtrlV = () => {
    setKeysPressed(true);
    setBeamCount((c) => c + 1);
    setTimeout(() => setKeysPressed(false), 260);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        triggerCtrlV();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredHistory = MINI_HISTORY.filter(
    (h) => histTab === "all" || h.kind === histTab
  );

  return (
    <section id="bento" className="scroll-mt-20 min-w-0 max-w-full border-b border-[var(--db-border)]">
      {/* Section Header */}
      <div className="border-b border-[var(--db-border)] px-4 py-7 sm:px-8">
        <p className="font-mono-code text-[11px] font-semibold uppercase tracking-widest text-[#FF5A36]">
          [ 04 // DAILY-DRIVER MATRIX ]
        </p>
        <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--db-ink)]">
          Interactive tools built for real daily flow
        </h2>
      </div>

      {/* 12-Col Asymmetric Hairline Bento (7 / 5 then 4 / 4 / 4) */}
      <div className="grid min-w-0 lg:grid-cols-12">
        {/* CELL 1 (col-span-7): Tactile Ctrl+V Instant Beam */}
        <div
          onPointerMove={trackPointer}
          className="db-spotlight-card min-w-0 border-b border-[var(--db-border)] bg-[var(--db-card)] p-5 sm:p-8 lg:col-span-7 lg:border-r"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
              01 // INSTANT CLIPBOARD BEAM
            </span>
            <span className="font-mono-code text-[11px] text-[var(--db-muted)]">
              Click keys or press Ctrl+V
            </span>
          </div>

          <h3 className="mt-3 font-display text-xl font-extrabold text-[var(--db-ink)]">
            Copy on laptop. Tap on phone.
          </h3>
          <p className="mt-1.5 max-w-lg text-xs sm:text-sm leading-relaxed text-[var(--db-muted)]">
            Paste screenshots, 2FA codes, or URLs anywhere inside DropBridge—every snippet
            lands on your phone with 1-tap Copy &amp; Open Link.
          </p>

          {/* Interactive 3D Mechanical Keycaps + Live Output */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[var(--db-border)] bg-[var(--db-surface)] p-4">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={triggerCtrlV}
                data-pressed={keysPressed ? "true" : "false"}
                className="db-keycap rounded-xl px-3.5 py-2 font-mono-code text-xs font-bold text-[var(--db-ink)] cursor-pointer"
              >
                Ctrl
              </button>
              <span className="font-mono-code text-xs text-[var(--db-muted)]">+</span>
              <button
                type="button"
                onClick={triggerCtrlV}
                data-pressed={keysPressed ? "true" : "false"}
                className="db-keycap rounded-xl px-4 py-2 font-mono-code text-xs font-bold text-[#FF5A36] cursor-pointer"
              >
                V
              </button>
            </div>

            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl border border-[var(--db-border)] bg-[var(--db-card)] px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-[#FF5A36]" />
                <span className="truncate font-mono-code text-xs text-[var(--db-ink)]">
                  {beamCount > 0
                    ? `Beamed #${beamCount}: https://dropbridge.app/otp-849`
                    : "https://dropbridge.app/otp-849"}
                </span>
              </div>
              <span className="shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 font-mono-code text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {beamCount > 0 ? "SENT" : "READY"}
              </span>
            </div>
          </div>
        </div>

        {/* CELL 2 (col-span-5): Live Snap-to-PC Camera Viewfinder */}
        <div
          onPointerMove={trackPointer}
          className="db-spotlight-card min-w-0 border-b border-[var(--db-border)] bg-[var(--db-card)] p-5 sm:p-8 lg:col-span-5"
        >
          <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
            02 // SNAP TO PC
          </span>
          <h3 className="mt-3 font-display text-xl font-extrabold text-[var(--db-ink)]">
            Phone camera straight to desktop
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--db-muted)]">
            Shoot a receipt, ID, or whiteboard inside DropBridge mobile and watch it drop
            straight onto your laptop screen.
          </p>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#10375C] p-4 text-white">
            <div className="relative flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#FF5A36]/70 bg-black/25">
              <Camera className="h-5 w-5 text-[#FF8D73]" />
              {snapTaken && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate font-mono-code text-xs font-bold">
                {snapTaken ? "RECEIPT_SCAN_04.JPG" : "Viewfinder Ready"}
              </p>
              <p className="mt-0.5 text-[11px] text-white/65">
                {snapTaken ? "Dropped to PC · 4.2 MB" : "Original resolution"}
              </p>
              <button
                type="button"
                onClick={() => setSnapTaken((s) => !s)}
                className="db-btn-coral mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold cursor-pointer"
              >
                <Camera className="h-3 w-3" />
                <span>{snapTaken ? "Snap Another" : "Test Shutter"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* CELL 3 (col-span-4): Desktop Auto-Save Folder */}
        <div
          onPointerMove={trackPointer}
          className="db-spotlight-card min-w-0 border-b border-[var(--db-border)] bg-[var(--db-card)] p-5 sm:p-7 lg:col-span-4 lg:border-b-0 lg:border-r"
        >
          <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
            03 // AUTO-SAVE FOLDER
          </span>
          <h3 className="mt-2.5 font-display text-lg font-extrabold text-[var(--db-ink)]">
            Straight to your disk
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--db-muted)]">
            Pick a folder once on Chrome or Edge desktop and incoming phone drops write
            directly to disk automatically.
          </p>

          <button
            type="button"
            onClick={() => setAutoSaveOn((v) => !v)}
            className="mt-4 w-full flex items-center justify-between rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 truncate text-[var(--db-ink)]">
              <FolderCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">~/Downloads/DropBridge</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono-code text-[10px] font-bold ${
                autoSaveOn
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-[var(--db-card-subtle)] text-[var(--db-muted)]"
              }`}
            >
              {autoSaveOn ? "AUTO" : "MANUAL"}
            </span>
          </button>
        </div>

        {/* CELL 4 (col-span-4): Persistent Local History */}
        <div
          onPointerMove={trackPointer}
          className="db-spotlight-card min-w-0 border-b border-[var(--db-border)] bg-[var(--db-card)] p-5 sm:p-7 lg:col-span-4 lg:border-b-0 lg:border-r"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
              04 // LOCAL HISTORY
            </span>
            <div className="inline-flex rounded-lg border border-[var(--db-border)] bg-[var(--db-surface)] p-0.5">
              {(["all", "file", "text"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setHistTab(k)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer ${
                    histTab === k
                      ? "bg-[#10375C] text-white dark:bg-[#FF5A36]"
                      : "text-[var(--db-muted)]"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--db-border)] bg-[var(--db-surface)] px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-[#FF5A36]" />
                  <span className="truncate font-mono-code text-[11px] font-semibold text-[var(--db-ink)]">
                    {item.name}
                  </span>
                </div>
                <span className="shrink-0 font-mono-code text-[10px] text-[var(--db-muted)]">
                  {item.meta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CELL 5 (col-span-4): Pure Cross-Platform PWA */}
        <div
          onPointerMove={trackPointer}
          className="db-spotlight-card min-w-0 bg-[var(--db-card)] p-5 sm:p-7 lg:col-span-4 flex flex-col justify-between"
        >
          <div>
            <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
              05 // PURE CROSS-PLATFORM PWA
            </span>
            <h3 className="mt-2.5 font-display text-lg font-extrabold text-[var(--db-ink)]">
              Install in 1 click. Zero bloat.
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--db-muted)]">
              Runs cleanly on Windows, macOS, Linux, Android (with Share Sheet), and iOS
              Safari—no 170 MB installers or port conflicts.
            </p>
          </div>

          <button
            type="button"
            onClick={onInstallClick}
            disabled={isStandalone}
            className="db-btn-coral mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold cursor-pointer"
          >
            {isStandalone ? (
              <>
                <Check className="h-4 w-4" />
                <span>Installed as PWA App</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Install DropBridge PWA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
