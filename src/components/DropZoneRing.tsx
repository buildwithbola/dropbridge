"use client";

import React, { useRef } from "react";
import { Upload, Check, FolderUp, Sparkles } from "lucide-react";
import { formatSpeed } from "@/lib/utils";

interface DropZoneRingProps {
  isConnected: boolean;
  isDragging: boolean;
  activeProgress: number | null; // 0..100 when transferring
  activeSpeedBps: number;
  activeFileName: string | null;
  onFilesSelected: (files: FileList | File[]) => void;
}

export function DropZoneRing({
  isConnected,
  isDragging,
  activeProgress,
  activeSpeedBps,
  activeFileName,
  onFilesSelected,
}: DropZoneRingProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const radius = 118;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    activeProgress !== null
      ? circumference - (Math.min(100, Math.max(0, activeProgress)) / 100) * circumference
      : circumference;

  const isTransferring = activeProgress !== null && activeProgress < 100;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Ambient pulse halo when dragging or connected */}
      {(isDragging || isTransferring) && (
        <div
          className="pointer-events-none absolute h-[288px] w-[288px] rounded-full border-2 border-[#FF5A36]/55 db-pulse-ring"
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex h-[268px] w-[268px] flex-col items-center justify-center rounded-full text-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF5A36]/50 ${
          isDragging
            ? "scale-[1.04] bg-[#FF5A36]/18 shadow-[0_0_60px_-8px_rgba(255,90,54,0.6)]"
            : isConnected
            ? "bg-white/[0.06] hover:bg-white/[0.1] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
            : "bg-white/[0.04] hover:bg-white/[0.07]"
        }`}
      >
        {/* Orbital SVG Ring */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 268 268"
          aria-hidden="true"
        >
          {/* Outer dashed guide ring */}
          <circle
            cx="134"
            cy="134"
            r={radius}
            fill="none"
            stroke={isDragging ? "#FF5A36" : "rgba(255, 255, 255, 0.22)"}
            strokeWidth={isDragging ? "3" : "2"}
            strokeDasharray={isTransferring ? "none" : "7 7"}
            className={!isTransferring ? "origin-center db-spin-slow" : ""}
          />
          {/* Progress sweep arc */}
          {activeProgress !== null && (
            <circle
              cx="134"
              cy="134"
              r={radius}
              fill="none"
              stroke="#FF5A36"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 140ms linear" }}
            />
          )}
        </svg>

        {/* Center Icon & Copy */}
        <div className="relative z-10 flex flex-col items-center px-6">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
              isDragging
                ? "bg-[#FF5A36] text-white scale-110 shadow-lg"
                : isTransferring
                ? "bg-[#FF5A36]/20 text-[#FF5A36] ring-1 ring-[#FF5A36]/40"
                : isConnected
                ? "bg-[#FF5A36] text-white group-hover:scale-105 shadow-md"
                : "bg-white/10 text-white/90 group-hover:bg-white/15"
            }`}
          >
            {isTransferring ? (
              <span className="font-mono-code text-sm font-bold">{activeProgress}%</span>
            ) : isDragging ? (
              <FolderUp className="h-6 w-6" />
            ) : isConnected ? (
              <Upload className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6 opacity-80" />
            )}
          </div>

          <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-white">
            {isDragging
              ? "Release to drop"
              : isTransferring
              ? "Streaming…"
              : isConnected
              ? "Drop files here"
              : "Drop files here"}
          </h2>

          <p className="mt-1.5 text-xs leading-snug text-white/75 max-w-[196px]">
            {isTransferring && activeFileName ? (
              <>
                <span className="block truncate text-white/95 font-medium">{activeFileName}</span>
                <span className="font-mono-code text-[11px] text-[#FF8D73]">
                  {formatSpeed(activeSpeedBps)}
                </span>
              </>
            ) : isConnected ? (
              "Click to browse or drag photos, videos & PDFs"
            ) : (
              "Drop files now — they stream once paired"
            )}
          </p>

          {isConnected && !isTransferring && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85 whitespace-nowrap">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>Lossless · Original quality</span>
            </span>
          )}
          {!isConnected && !isTransferring && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75 whitespace-nowrap">
              <Sparkles className="h-3 w-3 text-[#FF5A36] shrink-0" />
              <span>Or press Ctrl+V to paste</span>
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
