"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CloudUpload,
  Download,
  Laptop,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { DropBridgeLogo } from "../DropBridgeLogo";
import { PwaInstallModal } from "../PwaInstallModal";
import { ThemeToggle } from "../ThemeToggle";

const HIGHLIGHTS = [
  {
    icon: Wifi,
    title: "Pair once, stay linked",
    body: "Scan one QR code to bond your phone and laptop permanently. No repeated codes or accounts.",
  },
  {
    icon: CloudUpload,
    title: "Send even when away",
    body: "Out without your PC? Drop files or links from your phone and they wait encrypted until your PC wakes.",
  },
  {
    icon: ShieldCheck,
    title: "Lossless speed & PWA",
    body: "Full-speed Direct LAN Wi-Fi when together, zero compression, and instant install on any OS.",
  },
] as const;

export function HomePageClient() {
  const {
    isStandalone,
    platform,
    showGuideModal,
    setShowGuideModal,
    triggerInstall,
  } = usePwaInstall();

  return (
    <div className="min-h-dvh w-full bg-[var(--db-surface)] text-[var(--db-ink)] flex flex-col">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--db-border)] bg-[var(--db-surface)]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl min-w-0 items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          <Link href="/" className="shrink-0">
            <DropBridgeLogo variant="light-bg" size="sm" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Link
              href="/docs"
              className="hidden sm:inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold text-[var(--db-muted)] hover:text-[var(--db-ink)] transition-colors"
            >
              Docs
            </Link>
            {!isStandalone && (
              <button
                type="button"
                onClick={triggerInstall}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-card)] px-3 text-xs font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>Install App</span>
              </button>
            )}
            <Link
              href="/bridge"
              className="db-btn-coral inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold"
            >
              <span>Open Bridge</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Calm Centered Hero + Single Visual Card */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--db-border-strong)] bg-[var(--db-card)] px-3.5 py-1 text-xs font-medium text-[var(--db-slate)] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#FF5A36]" />
            <span>Pair once · Send anytime</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-2xl font-display text-[2.2rem] sm:text-5xl font-extrabold tracking-[-0.035em] leading-[1.08] text-[var(--db-ink)]">
            Your phone and PC,{" "}
            <span className="text-[#FF5A36]">permanently connected.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[var(--db-muted)]">
            Move original-quality photos, videos, documents, and links between Windows,
            Mac, Android, and iPhone—instantly over Wi-Fi, or even when your PC isn&apos;t
            with you.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/bridge"
              className="db-btn-coral inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-md"
            >
              <span>Open DropBridge</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {!isStandalone && (
              <button
                type="button"
                onClick={triggerInstall}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-card)] px-5 text-sm font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#FF5A36]" />
                <span>Install App (PWA)</span>
              </button>
            )}
          </div>

          {/* Single Serene Visual Bridge Card */}
          <div className="db-sapphire-grid mx-auto mt-11 max-w-3xl rounded-3xl border border-white/15 p-6 sm:p-8 text-white shadow-[0_24px_70px_-22px_rgba(16,55,92,0.45)]">
            <div className="flex items-center justify-between gap-4 sm:gap-8">
              <div className="flex flex-col items-center gap-2">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                  <Smartphone className="h-6 w-6 text-white" />
                </span>
                <span className="text-xs font-semibold text-white/85">Phone</span>
              </div>

              <div className="flex-1 min-w-0 flex flex-col items-center">
                <svg viewBox="0 0 220 52" className="h-11 w-full max-w-[220px]" aria-hidden="true">
                  <path
                    d="M12 42 Q110 -4 208 42"
                    fill="none"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M12 42 Q110 -4 208 42"
                    fill="none"
                    stroke="#FF5A36"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="28 190"
                    className="db-bridge-beam"
                  />
                  <circle cx="12" cy="42" r="3.5" fill="#FFFFFF" />
                  <circle cx="208" cy="42" r="4" fill="#FF5A36" />
                </svg>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Paired · Direct LAN + Away Drop
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                  <Laptop className="h-6 w-6 text-white" />
                </span>
                <span className="text-xs font-semibold text-white/85">Laptop / PC</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 text-left">
              <div className="min-w-0">
                <p className="truncate font-mono-code text-xs font-semibold text-white">
                  Studio_Clip_4K.mov
                </p>
                <p className="mt-0.5 text-[11px] text-white/65">
                  Original quality · End-to-end encrypted
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                <Check className="h-3 w-3" />
                Delivered
              </span>
            </div>
          </div>

          {/* 3 Quiet Capability Cards */}
          <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-6 shadow-2xs"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A36]/12 text-[#FF5A36]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 font-display text-base font-bold text-[var(--db-ink)]">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--db-muted)]">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Simple Minimal Footer */}
      <footer className="border-t border-[var(--db-border)] bg-[var(--db-card)]/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-5 text-xs text-[var(--db-muted)]">
          <div className="flex items-center gap-2.5">
            <DropBridgeLogo variant="light-bg" size="sm" />
            <span className="hidden sm:inline">· Windows · macOS · Linux · Android · iOS</span>
          </div>
          <div className="flex items-center gap-5 font-semibold text-[var(--db-slate)]">
            <Link href="/bridge" className="hover:text-[#FF5A36] transition-colors">
              Open Bridge
            </Link>
            <Link href="/docs" className="hover:text-[#FF5A36] transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/buildwithbola/dropbridge"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FF5A36] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      <PwaInstallModal
        open={showGuideModal}
        platform={platform}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
}
