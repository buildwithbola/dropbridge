"use client";

import React from "react";
import { ShieldCheck, Wifi, Radio, Loader2, Unplug } from "lucide-react";
import type { ConnectionState, TransportMode } from "@/lib/types";

interface ConnectionBadgeProps {
  connectionState: ConnectionState;
  transportMode: TransportMode;
  peerName?: string | null;
  onDarkSurface?: boolean;
}

export function ConnectionBadge({
  connectionState,
  transportMode,
  peerName,
  onDarkSurface = false,
}: ConnectionBadgeProps) {
  if (connectionState === "connected") {
    const meta =
      transportMode === "lan-direct"
        ? { label: "Direct LAN · Fast", icon: Wifi, dot: "bg-emerald-400" }
        : transportMode === "p2p-direct"
        ? { label: "Direct P2P · E2EE", icon: ShieldCheck, dot: "bg-emerald-400" }
        : { label: "Encrypted Relay", icon: Radio, dot: "bg-[#FF5A36]" };

    const Icon = meta.icon;

    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${
          onDarkSurface
            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
            : "border-emerald-600/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[270px]">
          {peerName ? `${peerName} · ` : ""}
          {meta.label}
        </span>
      </div>
    );
  }

  if (connectionState === "handshaking" || connectionState === "joining" || connectionState === "reconnecting") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${
          onDarkSurface
            ? "border-[#FF5A36]/40 bg-[#FF5A36]/15 text-orange-100"
            : "border-[#FF5A36]/30 bg-[#FF5A36]/10 text-[#C23B1B]"
        }`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>
          {connectionState === "reconnecting" ? "Reconnecting bridge…" : "Linking devices…"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${
        onDarkSurface
          ? "border-white/15 bg-white/8 text-white/75"
          : "border-[var(--db-border)] bg-[var(--db-card)] text-[var(--db-muted)]"
      }`}
    >
      <Unplug className="h-3.5 w-3.5 shrink-0 opacity-75" />
      <span>Ready to pair</span>
    </div>
  );
}
