"use client";

import React, { useEffect } from "react";
import { Download, ShieldCheck, X } from "lucide-react";
import type { FileTransferItem } from "@/lib/types";
import { downloadBlob, formatBytes } from "@/lib/utils";

interface MediaPreviewModalProps {
  item: FileTransferItem | null;
  onClose: () => void;
}

export function MediaPreviewModal({ item, onClose }: MediaPreviewModalProps) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item || !item.blobUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${item.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061321]/85 p-4 sm:p-6 backdrop-blur-md db-fade-up"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0D2238] text-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm sm:text-base font-bold text-white">
              {item.name}
            </h3>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/65">
              <span className="font-mono-code">{formatBytes(item.size)}</span>
              {item.verified && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified lossless
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.blob && (
              <button
                type="button"
                onClick={() => downloadBlob(item.blob!, item.name)}
                className="db-btn-coral inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save Original</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Media Canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto bg-[#071524] p-4">
          {item.previewType === "image" && (
            <img
              src={item.blobUrl}
              alt={item.name}
              className="max-h-[74dvh] max-w-full rounded-xl object-contain shadow-lg"
            />
          )}
          {item.previewType === "video" && (
            <video
              src={item.blobUrl}
              controls
              playsInline
              className="max-h-[74dvh] max-w-full rounded-xl shadow-lg"
            />
          )}
          {item.previewType === "audio" && (
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="mb-4 text-sm font-medium text-white/85">{item.name}</p>
              <audio src={item.blobUrl} controls className="w-full" />
            </div>
          )}
          {item.previewType === "pdf" && (
            <iframe
              src={item.blobUrl}
              title={item.name}
              className="h-[72dvh] w-full rounded-xl bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
