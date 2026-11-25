import React, { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ClipboardPaste,
  Clock,
  Download,
  FolderCheck,
  Laptop,
  Lock,
  Radio,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { DropBridgeLogo } from "@/components/DropBridgeLogo";
import { HomeQueryRedirect } from "@/components/HomeQueryRedirect";
import { InteractiveBridgeDemo } from "@/components/InteractiveBridgeDemo";
import { ThemeToggle } from "@/components/ThemeToggle";

const OLD_HASSLES = [
  "AirDrop locks Windows & Android out of the room.",
  "WhatsApp & Messenger compress your photos and bury files inside chat threads.",
  "LAN-only web tools fail the moment your phone is on 5G or office Wi-Fi.",
  "Native sync suites force account sign-ups, Bluetooth pairing, and heavy installs.",
  "USB cables are never around when you just need one file in 5 seconds.",
];

const DROPBRIDGE_FIXES = [
  "Works across Windows, macOS, Linux, Android, and iPhone—zero walled gardens.",
  "Streams original-quality files bit-for-bit with CRC32 lossless verification.",
  "3-Tier Auto-Waterfall: Direct LAN → Cross-network 5G P2P → Encrypted Relay.",
  "Zero install on your phone: scan the QR code and start dropping in 3 seconds.",
  "Auto-rejoins remembered devices, logs History locally, and lives in your System Tray.",
];

export default function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-[var(--db-surface)] text-[var(--db-ink)]">
      {/* Seamlessly forward legacy /?join=... or /?shared=... links straight into /bridge */}
      <Suspense fallback={null}>
        <HomeQueryRedirect />
      </Suspense>

      {/* STICKY ARCHITECTURAL NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-[var(--db-border)] bg-[var(--db-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          <Link href="/" className="shrink-0">
            <DropBridgeLogo variant="light-bg" size="sm" />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--db-muted)]"
          >
            <a href="#how-it-works" className="hover:text-[var(--db-ink)] transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-[var(--db-ink)] transition-colors">
              Features
            </a>
            <Link href="/download" className="hover:text-[var(--db-ink)] transition-colors">
              Desktop App
            </Link>
            <Link href="/docs" className="hover:text-[var(--db-ink)] transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/download"
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--db-border)] bg-[var(--db-surface)] px-3 text-xs font-semibold text-[var(--db-slate)] hover:border-[var(--db-border-strong)] transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#FF5A36]" />
              <span>Download</span>
            </Link>
            <Link
              href="/bridge"
              className="db-btn-coral inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 sm:px-4 text-xs font-bold"
            >
              <span>Launch App</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* MONUMENTAL SAPPHIRE HERO + INTERACTIVE LIVE PRODUCT STAGE */}
      <section className="db-sapphire-grid relative overflow-hidden border-b border-white/10 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1.15fr] lg:gap-12">
            {/* Left Editorial Pitch */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#FF8D73]">
                <Zap className="h-3.5 w-3.5" />
                <span>Windows · macOS · Linux · Android · iOS</span>
              </div>

              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-[-0.035em] text-white leading-[1.04]">
                Bridge the gap between{" "}
                <span className="text-[#FF5A36]">screen</span> and{" "}
                <span className="text-[#FF5A36]">pocket.</span>
              </h1>

              <p className="mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-white/78">
                Move original-quality photos, 4K videos, PDFs, and clipboard links between
                your laptop and phone in 3 seconds—no cable, no account, no cloud upload,
                and zero compression.
              </p>

              {/* Primary CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/bridge"
                  className="db-btn-coral inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-sm font-bold shadow-lg"
                >
                  <span>Open Web Bridge</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/download"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/18 transition-colors"
                >
                  <Download className="h-4 w-4 text-[#FF8D73]" />
                  <span>Download Desktop App</span>
                </Link>
              </div>

              {/* Honest Technical Trust Strip */}
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/65">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#FF5A36]" />
                  DTLS 1.3 Encrypted
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  CRC32 Lossless Check
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-[#FF8D73]" />
                  Works on Wi-Fi &amp; 5G
                </span>
              </div>
            </div>

            {/* Right Interactive Product Showcase */}
            <InteractiveBridgeDemo />
          </div>
        </div>
      </section>

      {/* PROBLEM VS SOLUTION COMPARISON */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
            Why DropBridge Exists
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--db-ink)]">
            Finally, PC-to-phone transfer without the usual hoops
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--db-muted)]">
            If you&apos;ve ever resorted to WhatsApping yourself a photo or emailing a PDF to
            your own inbox, DropBridge was built specifically to end that workflow.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {/* Old Hassles */}
          <div className="rounded-3xl border border-[var(--db-border)] bg-[var(--db-card)] p-6 sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--db-card-subtle)] px-3 py-1 text-xs font-bold text-[var(--db-muted)]">
              The Old Way
            </span>
            <ul className="mt-5 space-y-3.5">
              {OLD_HASSLES.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-[var(--db-muted)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-600 dark:text-rose-400">
                    <X className="h-3 w-3 stroke-[2.75]" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DropBridge Way */}
          <div className="rounded-3xl border border-[#FF5A36]/35 bg-[var(--db-card)] p-6 sm:p-7 shadow-[0_18px_40px_-22px_rgba(255,90,54,0.3)]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A36]/12 px-3 py-1 text-xs font-bold text-[#FF5A36]">
              <Zap className="h-3.5 w-3.5" />
              The DropBridge Way
            </span>
            <ul className="mt-5 space-y-3.5">
              {DROPBRIDGE_FIXES.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm font-medium text-[var(--db-ink)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3 stroke-[2.75]" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3-STEP HOW IT WORKS */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-[var(--db-border)] bg-[var(--db-card)]/60 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
              How It Works
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--db-ink)]">
              Three steps. Zero setup.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Open DropBridge on your laptop",
                desc: "Launch the web bridge or double-click the desktop app. A fresh split pairing code and QR code are generated instantly.",
                pill: "00212 · PF5",
              },
              {
                num: "02",
                title: "Scan once with Android or iPhone",
                desc: "Point your phone's default camera at the QR code. After your first link, trusted devices auto-reconnect next time you open the app.",
                pill: "No app download required",
              },
              {
                num: "03",
                title: "Drop files, snap photos, beam links",
                desc: "Drag anything onto the Sapphire vault, hit Ctrl+V to paste screenshots or links, or tap Snap on your phone to send camera shots directly to PC.",
                pill: "Verified lossless · Direct LAN",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex flex-col justify-between rounded-3xl border border-[var(--db-border)] bg-[var(--db-card)] p-6 shadow-xs"
              >
                <div>
                  <span className="font-mono-code text-xs font-bold text-[#FF5A36]">
                    STEP {step.num}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-[var(--db-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--db-muted)]">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--db-border)]">
                  <span className="inline-flex items-center rounded-lg bg-[var(--db-card-subtle)] px-2.5 py-1 font-mono-code text-[11px] font-semibold text-[var(--db-slate)]">
                    {step.pill}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE BENTO GRID */}
      <section id="features" className="scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
            Engineered For Daily Speed
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--db-ink)]">
            Every detail built to stay out of your way
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Wide feature: 3-Tier Auto-Waterfall */}
          <div className="sm:col-span-2 rounded-3xl border border-[var(--db-border)] bg-[var(--db-card)] p-6 sm:p-7">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10375C] text-white">
                <Radio className="h-5 w-5 text-[#FF5A36]" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--db-ink)]">
                  3-Tier Auto-Waterfall Transport
                </h3>
                <p className="text-xs text-[var(--db-muted)]">
                  Never shows &ldquo;Please connect to the same Wi-Fi&rdquo;
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--db-muted)]">
              DropBridge automatically negotiates the fastest path between your devices:
              Direct LAN WebRTC on shared Wi-Fi, STUN P2P across Wi-Fi + 5G, and an
              encrypted relay fallback behind strict corporate or campus firewalls.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Wifi className="h-3.5 w-3.5" />
                1. Direct LAN · Fast
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/12 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                2. Direct P2P (5G + Wi-Fi)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A36]/12 px-3 py-1 text-xs font-semibold text-[#FF5A36]">
                <Radio className="h-3.5 w-3.5" />
                3. Encrypted Relay Fallback
              </span>
            </div>
          </div>

          {[
            {
              icon: ClipboardPaste,
              title: "Instant Ctrl+V Clipboard & Link Beam",
              body: "Copy a URL, 2FA code, or screenshot on your laptop and press Ctrl+V anywhere in DropBridge—appears on your phone with 1-tap Copy & Open.",
            },
            {
              icon: Camera,
              title: "Snap to PC Camera Mode",
              body: "Tap Snap on Android or iPhone to launch your camera and beam receipts, whiteboards, or IDs directly onto your laptop screen.",
            },
            {
              icon: FolderCheck,
              title: "Desktop Auto-Save Folder & Batch ZIP",
              body: "Pick a folder once on desktop Chrome/Edge to save incoming drops straight to disk, or bundle multi-photo drops into one lossless .zip.",
            },
            {
              icon: Clock,
              title: "Persistent Local History & Auto-Rejoin",
              body: "Every file and link stays logged locally in your History panel with search and filters, while trusted devices reconnect automatically on launch.",
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rounded-3xl border border-[var(--db-border)] bg-[var(--db-card)] p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A36]/12 text-[#FF5A36]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-[var(--db-ink)]">
                  {feat.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--db-muted)]">
                  {feat.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* DESKTOP APP & CROSS-PLATFORM CTA BAND */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="db-sapphire-grid overflow-hidden rounded-[32px] border border-white/15 p-7 sm:p-12 text-white shadow-2xl">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#FF8D73]">
                <Laptop className="h-3.5 w-3.5" />
                <span>Web App + Native Desktop Installers</span>
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Use it in your browser, or install it in your System Tray.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
                Start immediately on the web at zero cost, or download the self-contained
                DropBridge desktop app for Windows (`.exe` Installer &amp; Portable),
                macOS, and Linux with embedded LAN signaling and background tray support.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/bridge"
                  className="db-btn-coral inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-sm font-bold shadow-lg"
                >
                  <span>Launch Web App Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/download"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/18 transition-colors"
                >
                  <Download className="h-4 w-4 text-[#FF8D73]" />
                  <span>Get Desktop App</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Windows", detail: "Setup & Portable .exe", icon: Laptop },
                { label: "macOS & Linux", detail: ".dmg / .AppImage / .deb", icon: Laptop },
                { label: "Android", detail: "Instant Web + PWA Share", icon: Smartphone },
                { label: "iPhone & iPad", detail: "Instant Safari + Camera QR", icon: Smartphone },
              ].map((os) => {
                const Icon = os.icon;
                return (
                  <div
                    key={os.label}
                    className="rounded-2xl border border-white/12 bg-white/[0.07] p-4"
                  >
                    <Icon className="h-4 w-4 text-[#FF5A36]" />
                    <p className="mt-2 font-display text-sm font-bold text-white">
                      {os.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/65">{os.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CLEAN EDITORIAL FOOTER */}
      <footer className="border-t border-[var(--db-border)] bg-[var(--db-card)]">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-4 sm:px-6 py-8">
          <DropBridgeLogo variant="light-bg" size="sm" showTagline />

          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[var(--db-muted)]">
            <Link href="/bridge" className="hover:text-[#FF5A36] transition-colors">
              Web App
            </Link>
            <Link href="/download" className="hover:text-[#FF5A36] transition-colors">
              Download Desktop
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 hover:text-[#FF5A36] transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Documentation</span>
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
  );
}
