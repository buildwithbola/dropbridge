import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  ClipboardPaste,
  CloudUpload,
  FolderCheck,
  Keyboard,
  Lock,
  Radio,
  ShieldCheck,
  Smartphone,
  Terminal,
  Wifi,
  Zap,
} from "lucide-react";
import { DocsCopyBlock } from "@/components/DocsCopyBlock";
import { DropBridgeLogo } from "@/components/DropBridgeLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Documentation — DropBridge",
  description:
    "Complete DropBridge user guide, 3-tier Auto-Waterfall architecture, security model, troubleshooting, and deployment manual.",
};

const NAV_SECTIONS = [
  { id: "quick-start", label: "Quick Start" },
  { id: "waterfall", label: "3-Tier Transport" },
  { id: "security", label: "Privacy & Lossless" },
  { id: "power-features", label: "Power Features" },
  { id: "troubleshooting", label: "Firewall & LAN" },
  { id: "deploy", label: "Deploy Live" },
];

const FIREWALL_CMD = `New-NetFirewallRule -DisplayName "DropBridge Web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "DropBridge Signal" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow`;

const DEPLOY_ENV_SNIPPET = `# Vercel Frontend Environment Variables
NEXT_PUBLIC_SIGNALING_URL=wss://your-dropbridge-signal.onrender.com

# Optional: Dedicated TURN Relay for strict corporate networks
NEXT_PUBLIC_TURN_URL=turn:turn.cloudflare.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-turn-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-turn-credential`;

export default function DocsPage() {
  return (
    <div className="min-h-dvh w-full bg-[var(--db-surface)] text-[var(--db-ink)]">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--db-border)] bg-[var(--db-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="shrink-0">
              <DropBridgeLogo variant="light-bg" size="sm" />
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-[var(--db-card-subtle)] px-2.5 py-0.5 font-mono-code text-[11px] font-semibold text-[var(--db-slate)]">
              DOCS v1.0
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/bridge"
              className="db-btn-coral inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 sm:px-4 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Open App</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Sapphire Hero Banner */}
      <section className="db-sapphire-grid border-b border-white/10 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#FF8D73]">
            <Zap className="h-3.5 w-3.5" />
            <span>Zero-Hassle PC ↔ Phone Guide</span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
            DropBridge Documentation &amp; Architecture
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/75">
            Everything you need to connect Windows, macOS, Android, and iPhone in under 3
            seconds—how our 3-tier transport engine works, why files stay lossless and
            private, and how to deploy your own global DropBridge instance.
          </p>

          {/* Mobile quick section pills */}
          <nav
            aria-label="Documentation sections"
            className="mt-7 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            {NAV_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#FF5A36] transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Main 2-Column Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        {/* Sticky Left Sidebar (Desktop) */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Table of contents"
            className="sticky top-24 space-y-1"
          >
            <p className="px-3 pb-2 font-mono-code text-[11px] font-semibold uppercase tracking-wider text-[var(--db-muted)]">
              On This Page
            </p>
            {NAV_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--db-muted)] hover:bg-[var(--db-card)] hover:text-[var(--db-ink)] transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Documentation Body */}
        <main className="min-w-0 space-y-14">
          {/* 1. QUICK START */}
          <section id="quick-start" className="scroll-mt-24 space-y-5">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
                01 // Quick Start
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Connect in 3 seconds — zero install required
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "Step 01",
                  title: "Open on your Laptop",
                  body: "Visit DropBridge in Chrome, Edge, Firefox, or Safari. A fresh split pairing code (like 00212 · PF5) and a scannable QR code appear immediately.",
                },
                {
                  step: "Step 02",
                  title: "Scan with Android or iPhone",
                  body: "Point your phone's default camera at the QR code—or open DropBridge on your phone and type the pairing code. No account, no Bluetooth pairing.",
                },
                {
                  step: "Step 03",
                  title: "Drop Files, Photos & Links",
                  body: "Drag anything onto your laptop ring, press Ctrl+V to paste screenshots/links, or tap Send Files / Snap to PC on your phone.",
                },
              ].map((card) => (
                <div
                  key={card.step}
                  className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-5 shadow-xs"
                >
                  <span className="inline-block rounded-md bg-[#FF5A36]/12 px-2 py-0.5 font-mono-code text-[11px] font-semibold text-[#FF5A36]">
                    {card.step}
                  </span>
                  <h3 className="mt-3 font-display text-base font-bold text-[var(--db-ink)]">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--db-muted)]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. 3-TIER WATERFALL */}
          <section id="waterfall" className="scroll-mt-24 space-y-5">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
                02 // Transport Architecture
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                How the 3-Tier Auto-Waterfall solves network pain
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--db-muted)]">
                Most PC-to-phone tools break the second your phone is on 5G, you&apos;re on
                campus Wi-Fi with AP isolation, or a VPN is running. DropBridge probes and
                selects the fastest working path automatically.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  tier: "Tier 1",
                  badge: "Direct LAN · Fast",
                  icon: Wifi,
                  accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/12",
                  desc: "When laptop and phone share the same local Wi-Fi, WebRTC negotiates direct host-to-host packets across your router at full local bandwidth (50–100+ MB/s) with zero internet upload.",
                },
                {
                  tier: "Tier 2",
                  badge: "Direct P2P · E2EE",
                  icon: ShieldCheck,
                  accent: "text-sky-600 dark:text-sky-400 bg-sky-500/12",
                  desc: "Laptop on Wi-Fi, phone on 5G? STUN hole-punching connects both devices directly across networks without forcing you to switch Wi-Fi.",
                },
                {
                  tier: "Tier 3",
                  badge: "Encrypted Relay",
                  icon: Radio,
                  accent: "text-[#FF5A36] bg-[#FF5A36]/12",
                  desc: "Behind strict corporate firewalls or hotel AP isolation, DropBridge falls back to an encrypted relay stream—and promotes live back to Direct LAN the instant P2P opens.",
                },
                {
                  tier: "Always Linked",
                  badge: "Permanent Pair + Offline PC Drop",
                  icon: Zap,
                  accent: "text-[#FF5A36] bg-[#FF5A36]/12",
                  desc: "Once your phone and PC pair, they stay permanently bonded. When your PC is away or shut down, files and links from your phone are encrypted on-device with your shared pair key, queued securely, and auto-delivered when you open DropBridge on your PC.",
                },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.tier}
                    className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-5"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-code text-xs font-bold text-[var(--db-ink)]">
                          {t.tier}
                        </span>
                        <span className="rounded-full bg-[var(--db-card-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--db-slate)]">
                          {t.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--db-muted)]">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. PRIVACY & LOSSLESS */}
          <section id="security" className="scroll-mt-24 space-y-5">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
                03 // Privacy &amp; Reliability
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Original quality, verified bit-for-bit
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Lock,
                  title: "Mandatory DTLS 1.3 Encryption",
                  body: "Every WebRTC DataChannel packet is encrypted end-to-end. The signaling server only exchanges room codes and handshake metadata—never storing your files.",
                },
                {
                  icon: ShieldCheck,
                  title: "CRC32 Lossless Integrity Check",
                  body: "Every 64 KB binary chunk updates a rolling checksum verified on arrival. When you see 'Verified lossless', the received file is byte-identical to the source.",
                },
                {
                  icon: Zap,
                  title: "64 KB Backpressure + Auto-Resume",
                  body: "Adaptive WebRTC buffer thresholds prevent Safari and mobile Chrome memory crashes on large 4K videos, and resume cleanly if your phone briefly switches apps.",
                },
                {
                  icon: Smartphone,
                  title: "Automatic Screen Wake Lock",
                  body: "During active transfers on supported browsers, DropBridge softly keeps your phone screen awake so iOS and Android don't suspend mid-stream.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-5"
                  >
                    <Icon className="h-5 w-5 text-[#FF5A36]" />
                    <h3 className="mt-3 font-display text-base font-bold text-[var(--db-ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--db-muted)]">
                      {item.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. POWER FEATURES */}
          <section id="power-features" className="scroll-mt-24 space-y-5">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
                04 // Daily-Driver Superpowers
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Built to replace &ldquo;WhatsApping yourself&rdquo;
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: FolderCheck,
                  title: "Desktop Auto-Save Folder",
                  body: "On Chrome or Edge desktop, click 'Auto-Save Folder' in the feed toolbar once. Every incoming photo, video, or PDF writes straight to your chosen folder automatically.",
                },
                {
                  icon: Camera,
                  title: "Mobile 'Snap to PC'",
                  body: "Tap Snap to PC on Android or iPhone to launch your camera directly—take a shot of a receipt, document, or whiteboard and watch it land on your laptop immediately.",
                },
                {
                  icon: ClipboardPaste,
                  title: "Ctrl+V Instant Beam",
                  body: "Copy a screenshot, image, OTP code, or link on Windows/Mac and hit Ctrl+V anywhere inside DropBridge to beam it straight to your phone.",
                },
                {
                  icon: Smartphone,
                  title: "Pure Cross-Platform PWA Install",
                  body: "Install DropBridge directly from Chrome, Edge, or Safari onto Windows, macOS, Linux, Android (with native Share Sheet), and iPhone—zero 170 MB bloat.",
                },
                {
                  icon: Zap,
                  title: "Trusted Devices & Auto-Rejoin",
                  body: "Previously paired devices stay saved locally. Toggle 'Auto-rejoin' or tap a recent device pill to reconnect without re-scanning QR codes every morning.",
                },
                {
                  icon: Keyboard,
                  title: "Inline Lightbox & Batch ZIP",
                  body: "Click any photo, video, audio file, or PDF card to preview it at full quality, or hit 'Save All (.zip)' to grab a multi-photo batch in one click.",
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10375C] text-white dark:bg-[#FF5A36]/15 dark:text-[#FF5A36]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="font-display text-sm font-bold text-[var(--db-ink)]">
                        {feat.title}
                      </h3>
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[var(--db-muted)]">
                      {feat.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. TROUBLESHOOTING & FIREWALL */}
          <section id="troubleshooting" className="scroll-mt-24 space-y-5">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
                05 // Local LAN &amp; Troubleshooting
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Windows Firewall &amp; Wi-Fi checklist
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--db-muted)]">
                When running DropBridge locally on Windows, if your phone times out trying
                to load <code className="font-mono-code">http://&lt;LAN-IP&gt;:3000</code>,
                Windows Defender Firewall is likely blocking inbound LAN ports. Run this
                once in PowerShell as Administrator:
              </p>
            </div>

            <DocsCopyBlock
              label="PowerShell (Run as Administrator)"
              code={FIREWALL_CMD}
            />

            <div className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-5 text-xs leading-relaxed text-[var(--db-muted)] space-y-2">
              <p className="font-semibold text-[var(--db-ink)]">
                Quick iOS Safari &amp; Android tips:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>iPhone Safari:</strong> Keep DropBridge open in the foreground
                  during multi-hundred-megabyte video transfers so iOS does not pause the
                  tab. If you briefly switch apps, DropBridge automatically reconnects.
                </li>
                <li>
                  <strong>Windows Hotspot Mode:</strong> Even without router Wi-Fi, turn on
                  Windows Mobile Hotspot or your phone&apos;s Personal Hotspot—DropBridge
                  discovers the local link automatically.
                </li>
              </ul>
            </div>
          </section>

          {/* 6. DEPLOY LIVE */}
          <section id="deploy" className="scroll-mt-24 space-y-5">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
                06 // Go Global (Wi-Fi + 5G Anywhere)
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Deploy DropBridge live in 2 minutes
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--db-muted)]">
                Deploy the lightweight WebSocket signaling service in{" "}
                <code className="font-mono-code">server/</code> to Render (using the
                included <code className="font-mono-code">render.yaml</code>) and the
                Next.js frontend to Vercel:
              </p>
            </div>

            <DocsCopyBlock
              label=".env / Vercel Environment Variables"
              code={DEPLOY_ENV_SNIPPET}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#FF5A36]/25 bg-[#10375C] p-6 text-white">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5A36] text-white">
                  <CloudUpload className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold">
                    Ready to bridge your devices?
                  </h3>
                  <p className="mt-0.5 text-xs text-white/75">
                    Jump back into your live DropBridge workspace right now.
                  </p>
                </div>
              </div>
              <Link
                href="/bridge"
                className="db-btn-coral inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold"
              >
                <Terminal className="h-4 w-4" />
                <span>Launch DropBridge</span>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
