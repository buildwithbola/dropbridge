"use client";

import React, { useEffect, useState } from "react";
import {
  Camera,
  Check,
  FileVideo,
  Link2,
  ShieldCheck,
  Upload,
  Wifi,
} from "lucide-react";

type DemoScenario = "video" | "link" | "snap";

const SCENARIOS: Record<
  DemoScenario,
  {
    label: string;
    fileLabel: string;
    meta: string;
    direction: "pc-to-phone" | "phone-to-pc";
    tier: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  video: {
    label: "Drop 4K Video",
    fileLabel: "studio-reel-4k.mp4",
    meta: "184 MB · 68.4 MB/s",
    direction: "pc-to-phone",
    tier: "Direct LAN · Fast",
    icon: FileVideo,
  },
  link: {
    label: "Beam Link",
    fileLabel: "https://dropbridge.app/docs",
    meta: "1-tap Copy & Open",
    direction: "pc-to-phone",
    tier: "Direct P2P · E2EE",
    icon: Link2,
  },
  snap: {
    label: "Snap Photo",
    fileLabel: "whiteboard-scan.jpg",
    meta: "4.8 MB · Original HEIC/JPG",
    direction: "phone-to-pc",
    tier: "Direct LAN · Fast",
    icon: Camera,
  },
};

export function InteractiveBridgeDemo() {
  const [scenario, setScenario] = useState<DemoScenario>("video");
  const [progress, setProgress] = useState(100);
  const [isStreaming, setIsStreaming] = useState(false);

  const triggerScenario = (next: DemoScenario) => {
    setScenario(next);
    setProgress(8);
    setIsStreaming(true);
  };

  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsStreaming(false);
          clearInterval(id);
          return 100;
        }
        return Math.min(100, prev + 16);
      });
    }, 120);
    return () => clearInterval(id);
  }, [isStreaming]);

  const active = SCENARIOS[scenario];
  const ActiveIcon = active.icon;

  return (
    <div className="relative rounded-[28px] border border-white/15 bg-[#091F36]/85 p-4 sm:p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-md">
      {/* Top interactive switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
        <span className="inline-flex items-center gap-1.5 font-mono-code text-[11px] uppercase tracking-wider text-white/65">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Interactive Preview
        </span>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SCENARIOS) as DemoScenario[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => triggerScenario(key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                scenario === key
                  ? "bg-[#FF5A36] text-white shadow-sm"
                  : "bg-white/10 text-white/75 hover:bg-white/18 hover:text-white"
              }`}
            >
              {SCENARIOS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Laptop + Animated Bridge + Phone Stage */}
      <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1.35fr_auto_0.85fr]">
        {/* Miniature Concept 1 Split Laptop */}
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0D2744] shadow-xl">
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#081A2E] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/25" />
              <span className="h-2 w-2 rounded-full bg-white/25" />
              <span className="h-2 w-2 rounded-full bg-white/25" />
            </div>
            <span className="font-mono-code text-[10px] text-white/55">
              dropbridge.app/bridge
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>

          <div className="grid grid-cols-2 min-h-[196px]">
            {/* Sapphire Left Drop Vault */}
            <div className="db-sapphire-grid flex flex-col items-center justify-center p-3 text-center">
              <div
                className={`flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-dashed transition-all ${
                  isStreaming
                    ? "border-[#FF5A36] bg-[#FF5A36]/20 scale-105"
                    : "border-white/30 bg-white/[0.06]"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5A36] text-white">
                  {isStreaming ? (
                    <span className="font-mono-code text-[10px] font-bold">{progress}%</span>
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="mt-1.5 text-[10px] font-bold text-white">
                  Drop files
                </span>
              </div>
              <span className="mt-2 font-mono-code text-[9px] text-white/60">
                Windows · macOS · Linux
              </span>
            </div>

            {/* Off-White Right Pairing / Feed */}
            <div className="flex flex-col justify-between bg-[#F4F7F6] p-3 text-[#102A43]">
              <div>
                <span className="font-mono-code text-[9px] font-semibold uppercase tracking-wider text-[#5B738B]">
                  Pair Code
                </span>
                <div className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-[#10375C]/15 bg-white py-1.5 font-mono-code text-xs font-bold">
                  <span>00212</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A36]" />
                  <span className="text-[#FF5A36]">PF5</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#10375C]/12 bg-white p-2 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-[#FF5A36]" />
                  <span className="truncate text-[10px] font-bold">
                    {active.fileLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono-code text-[9px] text-[#5B738B]">
                  {active.meta}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Animated Coral Packet Arch */}
        <div className="hidden sm:flex flex-col items-center justify-center w-14">
          <svg viewBox="0 0 64 44" className="w-14 h-11" aria-hidden="true">
            <path
              d="M4 34 Q32 -4 60 34"
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            <path
              d="M4 34 Q32 -4 60 34"
              fill="none"
              stroke="#FF5A36"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="18 80"
              className="db-bridge-beam"
            />
          </svg>
          <span className="mt-1 font-mono-code text-[9px] uppercase tracking-wider text-[#FF8D73]">
            {active.direction === "pc-to-phone" ? "PC → Phone" : "Phone → PC"}
          </span>
        </div>

        {/* Miniature Concept 1 Pocket Phone */}
        <div className="mx-auto w-full max-w-[180px] sm:max-w-none overflow-hidden rounded-[24px] border-2 border-white/20 bg-[#10375C] shadow-xl">
          <div className="db-sapphire-grid px-3 pt-3 pb-3.5 text-center text-white">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/20" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#FF5A36] bg-[#FF5A36]/18 text-[#FF5A36]">
              {isStreaming ? (
                <span className="font-mono-code text-[10px] font-bold text-white">
                  {progress}%
                </span>
              ) : (
                <Check className="h-5 w-5 stroke-[2.75]" />
              )}
            </div>
            <p className="mt-2 font-display text-xs font-extrabold">
              {isStreaming ? "Streaming…" : "Transfer Ready"}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-200">
              <Wifi className="h-2.5 w-2.5" />
              {active.tier}
            </span>
          </div>

          <div className="bg-[#F4F7F6] p-2.5 text-[#102A43]">
            <div className="rounded-xl border border-[#10375C]/12 bg-white p-2">
              <p className="truncate text-[10px] font-bold">{active.fileLabel}</p>
              <div className="mt-1 flex items-center justify-between text-[9px]">
                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600">
                  <ShieldCheck className="h-3 w-3" />
                  {isStreaming ? `${progress}%` : "Verified lossless"}
                </span>
                <span className="rounded bg-[#FF5A36] px-1.5 py-0.5 font-bold text-white">
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
