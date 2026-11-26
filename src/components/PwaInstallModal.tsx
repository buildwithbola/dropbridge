"use client";

import React, { useEffect } from "react";
import { Check, Laptop, PlusSquare, Share, Smartphone, X } from "lucide-react";
import type { PwaPlatform } from "@/lib/usePwaInstall";
import { DropBridgeLogo } from "./DropBridgeLogo";

interface PwaInstallModalProps {
  open: boolean;
  platform: PwaPlatform;
  onClose: () => void;
}

export function PwaInstallModal({ open, platform, onClose }: PwaInstallModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isIos = platform === "ios";
  const isMacSafari = platform === "macos-safari";
  const isAndroid = platform === "android";

  const title = isIos
    ? "Add DropBridge to iPhone / iPad"
    : isMacSafari
    ? "Add DropBridge to your Mac Dock"
    : isAndroid
    ? "Install DropBridge on Android"
    : "Install DropBridge App (PWA)";

  const steps = isIos
    ? [
        {
          num: "01",
          text: "Tap the Share button in Safari's bottom or top toolbar.",
          icon: Share,
        },
        {
          num: "02",
          text: 'Scroll down and tap "Add to Home Screen".',
          icon: PlusSquare,
        },
        {
          num: "03",
          text: "Tap Add — DropBridge launches full-screen straight into the Bridge App.",
          icon: Smartphone,
        },
      ]
    : isMacSafari
    ? [
        {
          num: "01",
          text: "In Safari's top macOS menu bar, click File.",
          icon: Laptop,
        },
        {
          num: "02",
          text: 'Select "Add to Dock…" and confirm DropBridge.',
          icon: PlusSquare,
        },
        {
          num: "03",
          text: "Launch DropBridge directly from your Dock or Spotlight anytime.",
          icon: Check,
        },
      ]
    : isAndroid
    ? [
        {
          num: "01",
          text: "Open Chrome's 3-dot menu in the top-right corner.",
          icon: Smartphone,
        },
        {
          num: "02",
          text: 'Tap "Add to Home screen" → "Install" (also enables Android Share Sheet).',
          icon: PlusSquare,
        },
        {
          num: "03",
          text: "Share links or open DropBridge directly from your home screen.",
          icon: Check,
        },
      ]
    : [
        {
          num: "01",
          text: "Click the Install icon on the right side of your Chrome or Edge address bar.",
          icon: Laptop,
        },
        {
          num: "02",
          text: 'Or open Browser Menu (⋮) → "Save and share" → "Install DropBridge…".',
          icon: PlusSquare,
        },
        {
          num: "03",
          text: "Pin DropBridge to your Windows Taskbar, macOS Dock, or Linux launcher—zero bloat.",
          icon: Check,
        },
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061321]/80 p-4 backdrop-blur-md db-fade-up"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--db-border-strong)] bg-[var(--db-card)] text-[var(--db-ink)] shadow-2xl"
      >
        {/* Sapphire Modal Header */}
        <div className="db-sapphire-grid flex items-center justify-between gap-3 px-6 py-4 text-white">
          <DropBridgeLogo variant="dark-bg" size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install guide"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <span className="inline-flex items-center rounded-md bg-[#FF5A36]/12 px-2 py-0.5 font-mono-code text-[11px] font-semibold text-[#FF5A36]">
              ZERO-BLOAT PWA
            </span>
            <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--db-muted)]">
              Runs as a standalone app across Windows, macOS, Linux, Android &amp; iPhone with
              no heavy installers or port conflicts.
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.num}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--db-border)] bg-[var(--db-surface)] p-3.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#10375C] text-white">
                    <Icon className="h-4 w-4 text-[#FF8D73]" />
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono-code text-[10px] font-bold text-[#FF5A36]">
                      STEP {s.num}
                    </span>
                    <p className="text-xs leading-relaxed text-[var(--db-ink)] font-medium">
                      {s.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="db-btn-coral h-11 w-full rounded-xl text-xs font-bold cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
