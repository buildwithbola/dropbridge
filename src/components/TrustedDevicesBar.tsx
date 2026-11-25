"use client";

import React from "react";
import { Laptop, Smartphone, Tablet, X, Zap } from "lucide-react";
import type { TrustedDevice } from "@/lib/types";

interface TrustedDevicesBarProps {
  devices: TrustedDevice[];
  autoRejoin: boolean;
  onToggleAutoRejoin: (next: boolean) => void;
  onReconnect: (device: TrustedDevice) => void;
  onForget: (deviceId: string) => void;
}

export function TrustedDevicesBar({
  devices,
  autoRejoin,
  onToggleAutoRejoin,
  onReconnect,
  onForget,
}: TrustedDevicesBarProps) {
  if (devices.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--db-muted)]">
          <Zap className="h-3.5 w-3.5 text-[#FF5A36]" />
          <span>Trusted Devices</span>
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={autoRejoin}
          onClick={() => onToggleAutoRejoin(!autoRejoin)}
          className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--db-muted)] hover:text-[var(--db-ink)] transition-colors cursor-pointer"
        >
          <span>Auto-rejoin</span>
          <span
            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${
              autoRejoin ? "bg-[#FF5A36]" : "bg-[var(--db-border-strong)]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                autoRejoin ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {devices.map((dev) => {
          const Icon =
            dev.kind === "mobile"
              ? Smartphone
              : dev.kind === "tablet"
              ? Tablet
              : Laptop;

          return (
            <div
              key={dev.id}
              className="inline-flex items-center rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-surface)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onReconnect(dev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--db-ink)] hover:bg-[var(--db-card-subtle)] transition-colors cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>{dev.name}</span>
                <span className="font-mono-code text-[10px] text-[var(--db-muted)]">
                  {dev.roomCode}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onForget(dev.id)}
                aria-label={`Remove ${dev.name}`}
                className="px-2 py-1.5 text-[var(--db-muted)] hover:text-[#FF5A36] hover:bg-[var(--db-card-subtle)] transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
