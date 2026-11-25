import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Download } from "lucide-react";
import { DownloadClient } from "@/components/DownloadClient";
import { DropBridgeLogo } from "@/components/DropBridgeLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Download DropBridge — Windows, macOS & Linux",
  description:
    "Download DropBridge desktop apps for Windows (.exe), macOS (.dmg), and Linux (.AppImage / .deb) with built-in local bridge server and System Tray mode.",
};

export default function DownloadPage() {
  return (
    <div className="min-h-dvh w-full bg-[var(--db-surface)] text-[var(--db-ink)]">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--db-border)] bg-[var(--db-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          <Link href="/" className="shrink-0">
            <DropBridgeLogo variant="light-bg" size="sm" />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--db-border)] bg-[var(--db-surface)] px-3 text-xs font-semibold text-[var(--db-slate)] hover:border-[var(--db-border-strong)] transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </Link>
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

      {/* Hero */}
      <section className="db-sapphire-grid border-b border-white/10 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#FF8D73]">
            <Download className="h-3.5 w-3.5" />
            <span>Desktop Apps · v1.2.0</span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
            Download DropBridge for Windows, macOS &amp; Linux
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/75">
            Run DropBridge as a native desktop app with an embedded local LAN server,
            System Tray / Menu Bar background mode, and instant QR pairing for Android &amp;
            iPhone—no terminal or Node.js required.
          </p>
        </div>
      </section>

      {/* Main Cards */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <DownloadClient />
      </main>
    </div>
  );
}
