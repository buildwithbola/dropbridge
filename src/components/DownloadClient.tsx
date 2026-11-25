"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Download,
  FolderCheck,
  Laptop,
  Monitor,
  Smartphone,
  Terminal,
  Zap,
} from "lucide-react";
import { DocsCopyBlock } from "./DocsCopyBlock";

type DetectedOs = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";

const RELEASES_BASE =
  process.env.NEXT_PUBLIC_RELEASES_URL || "";

function detectClientOs(): DetectedOs {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}

interface PlatformCard {
  id: DetectedOs;
  name: string;
  subtitle: string;
  primaryLabel: string;
  primaryFile: string;
  secondaryLabel: string;
  secondaryFile: string;
  buildCmd: string;
  notes: string;
  hostedInRelease: boolean;
}

const PLATFORMS: PlatformCard[] = [
  {
    id: "windows",
    name: "Windows",
    subtitle: "Windows 10 & Windows 11 (64-bit)",
    primaryLabel: "Download Installer (.exe)",
    primaryFile: "DropBridge-1.2.0-x64-Setup.exe",
    secondaryLabel: "Portable Single-File (.exe)",
    secondaryFile: "DropBridge-1.2.0-x64-Portable.exe",
    buildCmd: "npm run dist:win",
    notes: "Includes Start Menu & Desktop shortcuts, System Tray mode, and Launch-at-Login.",
    hostedInRelease: true,
  },
  {
    id: "macos",
    name: "macOS",
    subtitle: "Apple Silicon (M1–M4) & Intel",
    primaryLabel: "Build Apple Silicon / Intel (.dmg)",
    primaryFile: "DropBridge-1.2.0-arm64.dmg",
    secondaryLabel: "Intel Mac (.dmg)",
    secondaryFile: "DropBridge-1.2.0-x64.dmg",
    buildCmd: "npm run dist:mac",
    notes: "Lives cleanly in the macOS Menu Bar so your iPhone or Android can drop files anytime.",
    hostedInRelease: false,
  },
  {
    id: "linux",
    name: "Linux",
    subtitle: "Ubuntu, Debian, Fedora, Arch (x64 & arm64)",
    primaryLabel: "Build Universal (.AppImage / .deb)",
    primaryFile: "DropBridge-1.2.0-x64.AppImage",
    secondaryLabel: "Debian / Ubuntu (.deb)",
    secondaryFile: "DropBridge-1.2.0-x64.deb",
    buildCmd: "npm run dist:linux",
    notes: "Self-contained binary with embedded LAN signaling server and desktop tray icon.",
    hostedInRelease: false,
  },
];

export function DownloadClient() {
  const [os, setOs] = useState<DetectedOs>("windows");
  const [selectedCmd, setSelectedCmd] = useState("npm run dist:win");

  useEffect(() => {
    const detected = detectClientOs();
    if (detected !== "unknown") {
      setOs(detected);
      const match = PLATFORMS.find((p) => p.id === detected);
      if (match) setSelectedCmd(match.buildCmd);
    }
  }, []);

  const hasHostedReleases = Boolean(RELEASES_BASE);

  return (
    <div className="space-y-12">
      {/* 3 Desktop OS Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const isRecommended = os === platform.id;
          return (
            <div
              key={platform.id}
              className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all ${
                isRecommended
                  ? "border-[#FF5A36] bg-[var(--db-card)] shadow-[0_18px_40px_-18px_rgba(255,90,54,0.35)] ring-1 ring-[#FF5A36]/25"
                  : "border-[var(--db-border)] bg-[var(--db-card)] shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10375C] text-white">
                    {platform.id === "windows" ? (
                      <Monitor className="h-5 w-5" />
                    ) : platform.id === "macos" ? (
                      <Laptop className="h-5 w-5" />
                    ) : (
                      <Terminal className="h-5 w-5" />
                    )}
                  </div>
                  {isRecommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FF5A36]/12 px-2.5 py-1 text-[11px] font-bold text-[#FF5A36]">
                      <Zap className="h-3 w-3" />
                      Detected OS
                    </span>
                  )}
                </div>

                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-[var(--db-ink)]">
                  {platform.name}
                </h2>
                <p className="mt-1 text-xs font-medium text-[var(--db-muted)]">
                  {platform.subtitle}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-[var(--db-muted)]">
                  {platform.notes}
                </p>
              </div>

              <div className="mt-6 space-y-2.5">
                {hasHostedReleases && platform.hostedInRelease ? (
                  <>
                    <a
                      href={`${RELEASES_BASE.replace(/\/$/, "")}/${platform.primaryFile}`}
                      className="db-btn-coral flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold"
                    >
                      <Download className="h-4 w-4" />
                      <span>{platform.primaryLabel}</span>
                    </a>
                    <a
                      href={`${RELEASES_BASE.replace(/\/$/, "")}/${platform.secondaryFile}`}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-4 text-xs font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors"
                    >
                      <span>{platform.secondaryLabel}</span>
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCmd(platform.buildCmd)}
                    className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold cursor-pointer transition-all ${
                      isRecommended
                        ? "db-btn-coral"
                        : "border border-[var(--db-border-strong)] bg-[var(--db-surface)] text-[var(--db-ink)] hover:border-[#FF5A36]"
                    }`}
                  >
                    <Terminal className="h-4 w-4" />
                    <span>{platform.primaryLabel}</span>
                  </button>
                )}

                <p className="text-center font-mono-code text-[10px] text-[var(--db-muted)]">
                  {hasHostedReleases && platform.hostedInRelease
                    ? `${platform.primaryFile} · Ready to download`
                    : `${platform.primaryFile} · Build on ${platform.name} / CI`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Superpowers Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Zap,
            title: "Zero Setup, Zero Node Needed",
            body: "The desktop installer embeds both the DropBridge web bridge and local LAN signaling engine—just double-click and scan.",
          },
          {
            icon: FolderCheck,
            title: "System Tray Background Mode",
            body: "Closing the window keeps DropBridge alive quietly in your Windows Tray, macOS Menu Bar, or Linux panel for instant drops.",
          },
          {
            icon: Smartphone,
            title: "Phones Need Zero App Install",
            body: "Android and iPhone connect straight through Chrome or Safari via QR code—or tap 'Add to Home Screen' for the full PWA experience.",
          },
        ].map((perk) => {
          const Icon = perk.icon;
          return (
            <div
              key={perk.title}
              className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-5"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A36]/12 text-[#FF5A36]">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 font-display text-sm font-bold text-[var(--db-ink)]">
                {perk.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--db-muted)]">
                {perk.body}
              </p>
            </div>
          );
        })}
      </div>

      {/* Build / Release Commands */}
      <div className="rounded-3xl border border-[var(--db-border)] bg-[var(--db-card)] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono-code text-[11px] font-semibold uppercase tracking-wider text-[#FF5A36]">
              Local &amp; Automated Releases
            </p>
            <h3 className="mt-1 font-display text-lg font-bold text-[var(--db-ink)]">
              Build installers locally or ship all 3 OS targets via GitHub Actions
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            Windows · macOS · Linux Ready
          </span>
        </div>

        <DocsCopyBlock
          label="Build Desktop Installer Command"
          code={`# Build for your selected platform (${selectedCmd})
${selectedCmd}

# Or push a version tag to auto-build Windows (.exe), macOS (.dmg), and Linux (.AppImage/.deb) on GitHub Actions:
git tag v1.2.0 && git push origin v1.2.0`}
        />
      </div>
    </div>
  );
}
