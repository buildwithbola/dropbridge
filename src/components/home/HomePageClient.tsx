"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Download,
  Lock,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { DropBridgeLogo } from "../DropBridgeLogo";
import { PwaInstallModal } from "../PwaInstallModal";
import { ThemeToggle } from "../ThemeToggle";
import { CapabilitiesBento } from "./CapabilitiesBento";
import { FrictionMatrixSection } from "./FrictionMatrixSection";
import { InteractiveHeroSandbox } from "./InteractiveHeroSandbox";
import { WaterfallScrollytelling } from "./WaterfallScrollytelling";

export function HomePageClient() {
  const {
    isStandalone,
    platform,
    showGuideModal,
    setShowGuideModal,
    triggerInstall,
  } = usePwaInstall();

  return (
    <div className="relative min-h-dvh w-full bg-[var(--db-surface)] text-[var(--db-ink)]">
      {/* Subtle Non-Blocking SVG Film Grain Overlay */}
      <svg
        className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.024] mix-blend-overlay"
        aria-hidden="true"
      >
        <filter id="db-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#db-grain)" />
      </svg>

      {/* CONTINUOUS SWISS STRUCTURAL SHELL */}
      <div className="db-swiss-shell">
        {/* [ 00 // MASTHEAD ] */}
        <header className="sticky top-0 z-40 border-b border-[var(--db-border)] bg-[var(--db-card)]/92 backdrop-blur-md">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3 px-4 sm:px-8 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="shrink-0">
                <DropBridgeLogo variant="light-bg" size="sm" />
              </Link>
              <span className="hidden xl:inline-flex items-center rounded-md border border-[var(--db-border)] bg-[var(--db-surface)] px-2 py-0.5 font-mono-code text-[10px] font-semibold tracking-wider text-[var(--db-muted)]">
                PWA · E2EE · ZERO CLOUD
              </span>
            </div>

            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex items-center gap-6 font-mono-code text-[11px] font-semibold uppercase tracking-wider text-[var(--db-muted)]"
            >
              <a href="#sandbox" className="hover:text-[#FF5A36] transition-colors">
                01 Sandbox
              </a>
              <a href="#matrix" className="hover:text-[#FF5A36] transition-colors">
                02 Matrix
              </a>
              <a href="#waterfall" className="hover:text-[#FF5A36] transition-colors">
                03 Waterfall
              </a>
              <a href="#bento" className="hover:text-[#FF5A36] transition-colors">
                04 Bento
              </a>
              <Link href="/docs" className="hover:text-[#FF5A36] transition-colors">
                Docs
              </Link>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              {!isStandalone && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-3 text-xs font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#FF5A36]" />
                  <span>Install App</span>
                </button>
              )}
              <Link
                href="/bridge"
                className="db-btn-coral inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-bold"
              >
                <span>Open Bridge</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* [ 01 // HERO SANDBOX ] */}
        <section className="db-sapphire-grid relative min-w-0 max-w-full overflow-hidden border-b border-white/15 px-4 py-10 sm:px-8 sm:py-16 lg:py-20 text-white">
          {/* Subtle Concept 1 Drafting Compass Arcs Background */}
          <svg
            viewBox="0 0 600 400"
            className="pointer-events-none absolute -top-12 -left-16 h-[420px] w-[620px] opacity-[0.07]"
            aria-hidden="true"
          >
            <circle cx="240" cy="220" r="140" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="240" cy="220" r="210" fill="none" stroke="#FF5A36" strokeWidth="1" strokeDasharray="6 6" />
            <line x1="20" y1="220" x2="480" y2="220" stroke="#FFFFFF" strokeWidth="0.8" />
            <line x1="240" y1="20" x2="240" y2="390" stroke="#FFFFFF" strokeWidth="0.8" />
          </svg>

          <div className="relative grid min-w-0 items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-10">
            {/* Left 5 Cols: Monumental Editorial Pitch */}
            <div className="min-w-0 lg:col-span-5">
              <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 font-mono-code text-[10px] font-semibold uppercase tracking-widest text-[#FF8D73]">
                SYS.01 // SCREEN-TO-POCKET PROTOCOL
              </div>

              <h1 className="mt-5 font-display text-[2.15rem] sm:text-5xl xl:text-[3.55rem] font-extrabold tracking-[-0.035em] text-white leading-[1.04]">
                Screen to pocket.{" "}
                <span className="text-[#FF5A36]">Zero friction.</span>
              </h1>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/78">
                Move original-quality 4K videos, photos, PDFs, and links between Windows,
                Mac, Linux, Android, and iPhone in 3 seconds—with no cable, no login, and
                full Direct-LAN speed.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/bridge"
                  className="db-btn-coral inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-lg"
                >
                  <span>Open Web Bridge</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {!isStandalone && (
                  <button
                    type="button"
                    onClick={triggerInstall}
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/18 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-[#FF8D73]" />
                    <span>Install App (PWA)</span>
                  </button>
                )}
              </div>

              {/* Honest Technical Telemetry Strip */}
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 font-mono-code text-[11px] text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#FF5A36]" />
                  DTLS 1.3
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  CRC32 Lossless
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-[#FF8D73]" />
                  LAN + 5G Auto-Waterfall
                </span>
              </div>
            </div>

            {/* Right 7 Cols: Playable Hardware Sandbox */}
            <div className="min-w-0 lg:col-span-7">
              <InteractiveHeroSandbox />
            </div>
          </div>
        </section>

        {/* [ 02 // THE FRICTION LEDGER ] */}
        <FrictionMatrixSection />

        {/* [ 03 // AUTO-WATERFALL TOPOLOGY ] */}
        <WaterfallScrollytelling />

        {/* [ 04 // DAILY-DRIVER BENTO ] */}
        <CapabilitiesBento
          isStandalone={isStandalone}
          onInstallClick={triggerInstall}
        />

        {/* [ 05 // MONUMENTAL ARCHITECTURAL COLOPHON ] */}
        <footer className="db-sapphire-grid min-w-0 max-w-full overflow-hidden px-4 pt-12 pb-10 sm:px-8 sm:pt-20 text-white">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-white/12">
            <div>
              <p className="font-mono-code text-[11px] font-semibold uppercase tracking-widest text-[#FF8D73]">
                [ 05 // READY TO BRIDGE ]
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.06]">
                Stop messaging yourself files. Start bridging in 3 seconds.
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/bridge"
                className="db-btn-coral inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-lg"
              >
                <span>Launch DropBridge</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isStandalone && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/18 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 text-[#FF8D73]" />
                  <span>Install PWA</span>
                </button>
              )}
            </div>
          </div>

          {/* Monumental Typographic Anchor */}
          <div className="py-8 sm:py-10 select-none overflow-hidden">
            <p className="font-display text-[clamp(3.2rem,13vw,11.5rem)] font-extrabold tracking-[-0.05em] leading-[0.88] text-white/95">
              Drop<span className="text-[#FF5A36]">Bridge</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/12 pt-6 text-xs text-white/65">
            <span>Bridge the gap between screen and pocket. · Windows · macOS · Linux · Android · iOS</span>
            <div className="flex flex-wrap items-center gap-5 font-semibold text-white/80">
              <Link href="/bridge" className="hover:text-[#FF5A36] transition-colors">
                Open App
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-1 hover:text-[#FF5A36] transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Docs</span>
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
      </div>

      {/* Pure Cross-Platform PWA Install Guide Modal */}
      <PwaInstallModal
        open={showGuideModal}
        platform={platform}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
}
