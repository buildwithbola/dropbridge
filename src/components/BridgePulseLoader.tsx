"use client";

import React from "react";
import { Laptop, Smartphone } from "lucide-react";

interface BridgePulseLoaderProps {
  label?: string;
  sublabel?: string;
  onDark?: boolean;
}

export function BridgePulseLoader({
  label = "Linking devices…",
  sublabel = "Negotiating fastest encrypted path",
  onDark = false,
}: BridgePulseLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center ${
        onDark
          ? "border-white/15 bg-white/[0.06] text-white"
          : "border-[var(--db-border)] bg-[var(--db-card)] text-[var(--db-ink)]"
      }`}
    >
      <div className="relative flex items-center justify-center gap-4 w-full max-w-[240px]">
        {/* Laptop node */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            onDark
              ? "border-white/20 bg-white/10 text-white"
              : "border-[var(--db-border-strong)] bg-[var(--db-surface)] text-[#10375C] dark:text-white"
          }`}
        >
          <Laptop className="h-5 w-5" />
        </div>

        {/* Animated Coral Packet Arch */}
        <div className="relative flex-1 h-10 flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 120 40" className="w-full h-10" aria-hidden="true">
            <path
              d="M6 30 Q60 -6 114 30"
              fill="none"
              stroke={onDark ? "rgba(255,255,255,0.22)" : "rgba(16,55,92,0.18)"}
              strokeWidth="2.5"
              strokeDasharray="4 5"
            />
            <path
              d="M6 30 Q60 -6 114 30"
              fill="none"
              stroke="#FF5A36"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="24 120"
              className="db-bridge-beam"
            />
          </svg>
        </div>

        {/* Phone node */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            onDark
              ? "border-[#FF5A36]/50 bg-[#FF5A36]/20 text-[#FF8D73]"
              : "border-[#FF5A36]/35 bg-[#FF5A36]/12 text-[#FF5A36]"
          }`}
        >
          <Smartphone className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 font-display text-sm font-bold tracking-tight">{label}</p>
      <p
        className={`mt-0.5 text-xs ${
          onDark ? "text-white/65" : "text-[var(--db-muted)]"
        }`}
      >
        {sublabel}
      </p>
    </div>
  );
}
