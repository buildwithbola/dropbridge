"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Smartphone } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface QrCodeCardProps {
  joinUrl: string;
  lanIp: string | null;
  isLocalhost: boolean;
}

export function QrCodeCard({ joinUrl, lanIp, isLocalhost }: QrCodeCardProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!joinUrl) return;
    let active = true;
    QRCode.toString(joinUrl, {
      type: "svg",
      width: 176,
      margin: 1,
      color: {
        dark: "#10375C",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [joinUrl]);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(joinUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-4 sm:p-5 shadow-sm">
      <div className="relative shrink-0 rounded-xl bg-white p-2.5 ring-1 ring-[#10375C]/10 shadow-inner">
        {svgMarkup ? (
          <div
            className="h-[144px] w-[144px] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div className="h-[144px] w-[144px] rounded-lg bg-[#F4F7F6] animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#FF5A36]">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Instant Camera Pair</span>
        </div>
        <h3 className="mt-1 font-display text-base font-bold text-[var(--db-ink)]">
          Scan with Android or iPhone
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--db-muted)]">
          No app download or login needed. Point your phone camera to open the bridge instantly.
        </p>

        {isLocalhost && lanIp && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--db-card-subtle)] px-2 py-1 text-[11px] font-mono-code text-[var(--db-slate)]">
            LAN: http://{lanIp}:3000
          </p>
        )}

        <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Link copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy pair link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
