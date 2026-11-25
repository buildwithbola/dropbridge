"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Copy, RefreshCw } from "lucide-react";
import { copyToClipboard, normalizeCode, splitDisplayCode } from "@/lib/utils";

interface PairingCodePanelProps {
  displayCode: string;
  onJoinCode: (code: string) => void;
  onRefreshCode: () => void;
  errorMessage: string | null;
  compact?: boolean;
}

export function PairingCodePanel({
  displayCode,
  onJoinCode,
  onRefreshCode,
  errorMessage,
  compact = false,
}: PairingCodePanelProps) {
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { left, right, full } = splitDisplayCode(displayCode);

  const handleCopyCode = async () => {
    if (!full) return;
    const ok = await copyToClipboard(full);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeCode(inputCode);
    if (clean.length >= 4) {
      onJoinCode(clean);
    }
  };

  return (
    <div className="space-y-4">
      {/* Split Pairing Code Display matching Concept 1 ("00212 · PF5") */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--db-muted)]">
            Your Pairing Code
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--db-muted)] hover:bg-[var(--db-card-subtle)] hover:text-[var(--db-ink)] transition-colors cursor-pointer"
              title="Copy pairing code"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={onRefreshCode}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--db-muted)] hover:bg-[var(--db-card-subtle)] hover:text-[var(--db-ink)] transition-colors cursor-pointer"
              title="Generate fresh code"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="group w-full flex items-center justify-center gap-2.5 rounded-2xl border border-[var(--db-border-strong)] bg-[var(--db-card)] px-4 py-4 shadow-sm hover:border-[#FF5A36]/60 transition-all cursor-pointer"
        >
          <span className="font-mono-code text-2xl sm:text-3xl font-semibold tracking-[0.14em] text-[var(--db-ink)]">
            {left || "·····"}
          </span>
          <span className="h-2 w-2 rounded-full bg-[#FF5A36]" />
          <span className="font-mono-code text-2xl sm:text-3xl font-semibold tracking-[0.14em] text-[#FF5A36]">
            {right || "···"}
          </span>
        </button>
      </div>

      {/* Join another device's code */}
      <form onSubmit={handleSubmit} className={compact ? "space-y-2" : "space-y-2.5"}>
        <label
          htmlFor="join-code-input"
          className="block text-xs font-semibold uppercase tracking-wider text-[var(--db-muted)]"
        >
          Or enter a code from another device
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="join-code-input"
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="e.g. 00212-PF5"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-0 rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-card)] px-3.5 py-2.5 font-mono-code text-sm tracking-widest uppercase text-[var(--db-ink)] placeholder:text-[var(--db-muted)]/60 placeholder:tracking-normal focus:border-[#FF5A36] focus:outline-none"
          />
          <button
            type="submit"
            disabled={normalizeCode(inputCode).length < 4}
            className="db-btn-coral inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer shrink-0"
          >
            <span>Bridge</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <p className="text-xs font-medium text-[#E03E26] bg-[#FF5A36]/10 border border-[#FF5A36]/25 rounded-lg px-3 py-2">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
