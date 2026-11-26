"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  FileVideo,
  Link2,
  ShieldCheck,
  Upload,
  Wifi,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface PayloadPreset {
  id: string;
  label: string;
  sizeLabel: string;
  crcHex: string;
  speedLabel: string;
  tierLabel: string;
  kind: "video" | "pdf" | "link";
}

const PRESETS: PayloadPreset[] = [
  {
    id: "video",
    label: "RAW_4K_CUT.MP4",
    sizeLabel: "240 MB · 4K60",
    crcHex: "0x84E19C0A",
    speedLabel: "78.4 MB/s",
    tierLabel: "Direct LAN · Fast",
    kind: "video",
  },
  {
    id: "pdf",
    label: "BOARD_DECK.PDF",
    sizeLabel: "14.2 MB · Vector",
    crcHex: "0x3B72F19D",
    speedLabel: "64.8 MB/s",
    tierLabel: "Direct LAN · Fast",
    kind: "pdf",
  },
  {
    id: "link",
    label: "https://staging.app/auth?otp=8841",
    sizeLabel: "Instant Link · 1-Tap",
    crcHex: "0xA91C04E2",
    speedLabel: "12 ms",
    tierLabel: "Direct P2P · E2EE",
    kind: "link",
  },
];

export function InteractiveHeroSandbox() {
  const [activeId, setActiveId] = useState<string>("video");
  const [customFile, setCustomFile] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState<number>(100);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const activePreset = PRESETS.find((p) => p.id === activeId) || PRESETS[0];

  const triggerTransfer = (id: string) => {
    setCustomFile(null);
    setActiveId(id);
    setProgress(8);
    setIsStreaming(true);
  };

  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsStreaming(false);
          clearInterval(timer);
          return 100;
        }
        return Math.min(100, prev + 16);
      });
    }, 85);
    return () => clearInterval(timer);
  }, [isStreaming]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const presetId = e.dataTransfer.getData("text/dropbridge-preset");
    if (presetId) {
      triggerTransfer(presetId);
      return;
    }

    const realFile = e.dataTransfer.files?.[0];
    if (realFile) {
      setCustomFile({ name: realFile.name, size: realFile.size });
      setProgress(12);
      setIsStreaming(true);
    }
  };

  const displayName = customFile ? customFile.name : activePreset.label;
  const displayMeta = customFile
    ? `${formatBytes(customFile.size)} · Ready to drop`
    : activePreset.sizeLabel;

  return (
    <div
      id="sandbox"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`relative w-full max-w-full min-w-0 overflow-hidden rounded-2xl border bg-[#081C30]/92 p-3.5 sm:p-5 text-white shadow-[0_32px_90px_-24px_rgba(0,0,0,0.7)] transition-colors ${
        isDraggingOver ? "border-[#FF5A36] ring-2 ring-[#FF5A36]/40" : "border-white/15"
      }`}
    >
      {/* Top Engineering Telemetry Bar */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate font-mono-code text-[10px] sm:text-[11px] uppercase tracking-wider text-white/75">
            SANDBOX.LIVE // CLICK OR DRAG PAYLOAD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono-code text-[10px] sm:text-[11px]">
          <span className="rounded bg-white/8 px-2 py-0.5 text-white/70">
            CRC32 {activePreset.crcHex}
          </span>
          <span className="rounded bg-[#FF5A36]/18 px-2 py-0.5 font-semibold text-[#FF8D73]">
            {activePreset.speedLabel}
          </span>
        </div>
      </div>

      {/* Main Split Stage: Laptop Dispatch Deck + Suspension Arch + Phone Bezel */}
      <div className="mt-4 grid min-w-0 items-center gap-4 lg:grid-cols-[1.18fr_auto_0.86fr]">
        {/* Laptop Dispatch Deck */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-white/12 bg-[#0B233B] p-3 sm:p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono-code uppercase tracking-wider text-white/55">
            <span className="truncate">Laptop Dispatch</span>
            <span className="shrink-0">Win · Mac · Linux</span>
          </div>

          {/* Draggable / Clickable Payload Chips */}
          <div className="space-y-2">
            {PRESETS.map((preset) => {
              const isSelected = !customFile && activeId === preset.id;
              const Icon =
                preset.kind === "video"
                  ? FileVideo
                  : preset.kind === "pdf"
                  ? FileText
                  : Link2;

              return (
                <button
                  key={preset.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/dropbridge-preset", preset.id);
                  }}
                  onClick={() => triggerTransfer(preset.id)}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#FF5A36] bg-[#FF5A36]/16 shadow-[0_0_24px_-8px_rgba(255,90,54,0.5)]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-[#FF5A36] text-white" : "bg-white/10 text-[#FF8D73]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono-code text-xs font-semibold text-white">
                        {preset.label}
                      </p>
                      <p className="truncate text-[10px] text-white/60">{preset.sizeLabel}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono-code text-[10px] font-bold text-[#FF8D73]">
                    {isSelected ? (isStreaming ? `${progress}%` : "SENT") : "DROP →"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-[11px] text-white/60">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Upload className="h-3.5 w-3.5 shrink-0 text-[#FF5A36]" />
              {customFile
                ? `Loaded: ${customFile.name}`
                : "Or drag a real file here to preview"}
            </span>
            {customFile && (
              <Link
                href="/bridge"
                className="shrink-0 font-semibold text-[#FF8D73] hover:underline inline-flex items-center gap-1"
              >
                Send live
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Center Suspension Arch SVG (Concept 1 Blueprint Signature) */}
        <div className="hidden lg:flex flex-col items-center justify-center w-16">
          <svg viewBox="0 0 80 56" className="w-16 h-12" aria-hidden="true">
            <path
              d="M6 46 C14 14 40 4 74 46"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeDasharray="3 4"
            />
            <path
              d="M6 46 C14 14 40 4 74 46"
              fill="none"
              stroke="#FF5A36"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray={isStreaming ? "22 100" : "100 100"}
              className={isStreaming ? "db-bridge-beam" : ""}
            />
            <circle cx="6" cy="46" r="3" fill="#FFFFFF" />
            <circle cx="74" cy="46" r="3.5" fill="#FF5A36" />
          </svg>
          <span className="mt-1 font-mono-code text-[9px] uppercase tracking-wider text-white/60">
            {isStreaming ? "STREAM" : "DTLS 1.3"}
          </span>
        </div>

        {/* Pocket Phone Bezel */}
        <div className="mx-auto w-full max-w-[220px] lg:max-w-none overflow-hidden rounded-[24px] border-2 border-white/20 bg-[#10375C] shadow-2xl">
          <div className="db-sapphire-grid px-3.5 pt-3 pb-3.5 text-center text-white">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/20" />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#FF5A36] bg-[#FF5A36]/18 text-[#FF5A36]">
              {isStreaming ? (
                <span className="font-mono-code text-xs font-bold text-white">{progress}%</span>
              ) : (
                <Check className="h-5 w-5 stroke-[2.75]" />
              )}
            </div>
            <p className="mt-2 font-display text-xs font-extrabold tracking-tight">
              {isStreaming ? "Streaming…" : "Transfer Ready"}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              <Wifi className="h-2.5 w-2.5" />
              {activePreset.tierLabel}
            </span>
          </div>

          <div className="bg-[#F4F7F6] p-3 text-[#102A43]">
            <div className="rounded-xl border border-[#10375C]/15 bg-white p-2.5 shadow-2xs">
              <p className="truncate font-mono-code text-[11px] font-bold">{displayName}</p>
              <p className="mt-0.5 truncate text-[10px] text-[#5B738B]">{displayMeta}</p>

              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 truncate">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  {isStreaming ? `${progress}%` : `Lossless · ${activePreset.speedLabel}`}
                </span>
                <span className="shrink-0 rounded-md bg-[#FF5A36] px-2 py-0.5 font-bold text-white">
                  Save
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
