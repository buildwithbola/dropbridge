"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

export function DocsCopyBlock({
  code,
  label = "Command",
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--db-border-strong)] bg-[#0B2640] text-white shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] font-mono-code text-white/60">
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#FF5A36] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-300" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono-code text-xs leading-relaxed text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
