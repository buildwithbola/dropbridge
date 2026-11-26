"use client";

import React, { useState } from "react";
import { Cpu, Laptop, Radio, ShieldCheck, Smartphone, Wifi } from "lucide-react";

interface TierSpec {
  id: "lan" | "stun" | "relay" | "crc";
  num: string;
  tag: string;
  title: string;
  latency: string;
  routeLabel: string;
  summary: string;
  detail: string;
  accentColor: string;
}

const TIERS: TierSpec[] = [
  {
    id: "lan",
    num: "01",
    tag: "TIER 1 // DIRECT LAN WEBRTC",
    title: "Full Local Wi-Fi Bandwidth",
    latency: "30–100+ MB/s · 0 Cloud",
    routeLabel: "LOCAL ROUTER · HOST ↔ HOST",
    summary:
      "When laptop and phone share Wi-Fi, DropBridge bundles local host ICE candidates atomically into a single SDP handshake.",
    detail:
      "Traffic flows straight across your Wi-Fi router at hardware speed with 2 MB windowed reads and adaptive 128 KB SCTP packets—never touching an external server.",
    accentColor: "#10B981",
  },
  {
    id: "stun",
    num: "02",
    tag: "TIER 2 // 5G + WI-FI STUN P2P",
    title: "Cross-Network Hole Punching",
    latency: "Direct P2P · E2EE",
    routeLabel: "STUN NAT TRAVERSAL · 5G ↔ WI-FI",
    summary:
      "Phone on cellular 5G while laptop is on Wi-Fi? DropBridge resolves public reflexive candidates cleanly via STUN.",
    detail:
      "You never get told to 'switch to the same Wi-Fi network'. Devices connect peer-to-peer across separate carriers automatically.",
    accentColor: "#38BDF8",
  },
  {
    id: "relay",
    num: "03",
    tag: "TIER 3 // ZERO-DROP RELAY + LIVE PROMOTION",
    title: "Firewall-Proof Fallback & Mid-Stream Upgrade",
    latency: "100% Connection Reliability",
    routeLabel: "ENCRYPTED RELAY + AUTO-PROMOTE",
    summary:
      "Behind strict corporate VPNs or AP-isolated hotel Wi-Fi, encrypted sequence-ordered relay keeps transfers moving.",
    detail:
      "Even better: DropBridge keeps probing Direct WebRTC in parallel and upgrades an active transfer live to Direct LAN the instant the P2P channel opens.",
    accentColor: "#FF5A36",
  },
  {
    id: "crc",
    num: "04",
    tag: "INTEGRITY // 2 MB WINDOWED CRC32",
    title: "Bit-Identical Verification & Auto-Resume",
    latency: "CRC32 Checked · Wake Lock",
    routeLabel: "ORDERED CHUNK MAP · ZERO CORRUPTION",
    summary:
      "Every chunk is sequence-indexed and verified with rolling CRC32 checksums on both HTTP LAN and HTTPS.",
    detail:
      "Screen Wake Lock prevents mobile tab sleep mid-transfer, while sequence assembly guarantees out-of-order packets never corrupt videos or archives.",
    accentColor: "#FF5A36",
  },
];

export function WaterfallScrollytelling() {
  const [activeId, setActiveId] = useState<TierSpec["id"]>("lan");
  const active = TIERS.find((t) => t.id === activeId) || TIERS[0];

  return (
    <section
      id="waterfall"
      className="scroll-mt-20 min-w-0 max-w-full border-b border-[var(--db-border)] bg-[var(--db-card)]/40"
    >
      <div className="grid min-w-0 lg:grid-cols-12">
        {/* LEFT 5 COLS: Sticky Blueprint Network Topology Schematic */}
        <div className="min-w-0 border-b border-[var(--db-border)] p-4 sm:p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
          <div className="lg:sticky lg:top-24 space-y-5">
            <div>
              <p className="font-mono-code text-[11px] font-semibold uppercase tracking-widest text-[#FF5A36]">
                [ 03 // AUTO-WATERFALL ENGINE ]
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--db-ink)]">
                Adaptive transport that never stalls
              </h2>
            </div>

            {/* Live Sapphire Schematic Card */}
            <div className="db-sapphire-grid rounded-2xl border border-white/15 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 font-mono-code text-[10px] uppercase tracking-wider text-white/70">
                <span>TOPOLOGY // {active.num}</span>
                <span style={{ color: active.accentColor }}>{active.latency}</span>
              </div>

              {/* Animated SVG Topology */}
              <div className="my-5 flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                    <Laptop className="h-5 w-5" />
                  </span>
                  <span className="font-mono-code text-[10px] text-white/70">PC / MAC</span>
                </div>

                <div className="relative flex-1 px-1">
                  <svg viewBox="0 0 180 68" className="w-full h-16" aria-hidden="true">
                    {/* Background all-tiers faint rails */}
                    <path
                      d="M6 34 L174 34"
                      fill="none"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M6 34 Q90 2 174 34"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M6 34 Q90 66 174 34"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1.5"
                    />

                    {/* Active highlighted route */}
                    <path
                      d={
                        active.id === "lan"
                          ? "M6 34 L174 34"
                          : active.id === "stun"
                          ? "M6 34 Q90 2 174 34"
                          : "M6 34 Q90 66 174 34"
                      }
                      fill="none"
                      stroke={active.accentColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="24 140"
                      className="db-bridge-beam"
                    />
                  </svg>
                  <p className="text-center font-mono-code text-[10px] font-semibold tracking-wider text-white/80">
                    {active.routeLabel}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: `${active.accentColor}66`,
                      backgroundColor: `${active.accentColor}22`,
                    }}
                  >
                    <Smartphone className="h-5 w-5" />
                  </span>
                  <span className="font-mono-code text-[10px] text-white/70">PHONE</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5 text-xs leading-relaxed text-white/80">
                {active.detail}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 7 COLS: Interactive Engineering Chapters */}
        <div className="min-w-0 divide-y divide-[var(--db-border)] lg:col-span-7">
          {TIERS.map((tier) => {
            const isActive = tier.id === activeId;
            const Icon =
              tier.id === "lan"
                ? Wifi
                : tier.id === "stun"
                ? ShieldCheck
                : tier.id === "relay"
                ? Radio
                : Cpu;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setActiveId(tier.id)}
                onMouseEnter={() => setActiveId(tier.id)}
                className={`w-full text-left p-5 sm:p-8 transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#FF5A36]/[0.05] border-l-4 border-l-[#FF5A36]"
                    : "hover:bg-[var(--db-card)]/80 border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? "bg-[#FF5A36] text-white"
                          : "bg-[var(--db-card-subtle)] text-[var(--db-slate)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono-code text-[11px] font-bold tracking-wider text-[#FF5A36]">
                      {tier.tag}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block font-mono-code text-[11px] text-[var(--db-muted)]">
                    {tier.latency}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-xl font-extrabold text-[var(--db-ink)]">
                  {tier.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--db-muted)]">
                  {tier.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
