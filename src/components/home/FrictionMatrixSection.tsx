import React from "react";
import { Check, Minus, X } from "lucide-react";

type CellStatus = "yes" | "partial" | "no";

interface MatrixRow {
  feature: string;
  detail: string;
  dropbridge: { status: CellStatus; note: string };
  airdrop: { status: CellStatus; note: string };
  whatsapp: { status: CellStatus; note: string };
  lanTools: { status: CellStatus; note: string };
}

const ROWS: MatrixRow[] = [
  {
    feature: "Windows ↔ iPhone & Android",
    detail: "True cross-OS without walled gardens",
    dropbridge: { status: "yes", note: "Any OS + browser" },
    airdrop: { status: "no", note: "Apple-only" },
    whatsapp: { status: "yes", note: "Needs app & login" },
    lanTools: { status: "partial", note: "Install required" },
  },
  {
    feature: "Works Across 5G + Wi-Fi",
    detail: "No 'connect to same Wi-Fi' errors",
    dropbridge: { status: "yes", note: "3-Tier Waterfall" },
    airdrop: { status: "no", note: "Proximity only" },
    whatsapp: { status: "yes", note: "Via cloud server" },
    lanTools: { status: "no", note: "Same LAN only" },
  },
  {
    feature: "Original Lossless Quality",
    detail: "Zero photo/video compression + CRC32",
    dropbridge: { status: "yes", note: "Bit-identical" },
    airdrop: { status: "yes", note: "Lossless" },
    whatsapp: { status: "no", note: "Compresses media" },
    lanTools: { status: "yes", note: "Uncompressed" },
  },
  {
    feature: "Zero Account & Phone Install",
    detail: "Scan QR code and drop in 3 seconds",
    dropbridge: { status: "yes", note: "Instant Web / PWA" },
    airdrop: { status: "partial", note: "Apple ID setup" },
    whatsapp: { status: "no", note: "Phone # + account" },
    lanTools: { status: "partial", note: "App Store / APK" },
  },
  {
    feature: "Auto-Rejoin + Snap + History",
    detail: "Built for daily laptop-to-phone flow",
    dropbridge: { status: "yes", note: "All built in" },
    airdrop: { status: "no", note: "No feed/history" },
    whatsapp: { status: "partial", note: "Cluttered self-chat" },
    lanTools: { status: "no", note: "Re-pair daily" },
  },
];

function StatusPill({
  status,
  note,
  highlight = false,
}: {
  status: CellStatus;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          status === "yes"
            ? highlight
              ? "bg-[#FF5A36] text-white"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : status === "partial"
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-rose-500/12 text-rose-600 dark:text-rose-400"
        }`}
      >
        {status === "yes" ? (
          <Check className="h-3 w-3 stroke-[2.75]" />
        ) : status === "partial" ? (
          <Minus className="h-3 w-3 stroke-[2.75]" />
        ) : (
          <X className="h-3 w-3 stroke-[2.75]" />
        )}
      </span>
      <span
        className={`text-xs ${
          highlight ? "font-bold text-[var(--db-ink)]" : "text-[var(--db-muted)]"
        }`}
      >
        {note}
      </span>
    </div>
  );
}

export function FrictionMatrixSection() {
  return (
    <section
      id="matrix"
      className="scroll-mt-20 min-w-0 max-w-full border-b border-[var(--db-border)] bg-[var(--db-surface)]"
    >
      {/* Exposed Swiss Section Header */}
      <div className="grid min-w-0 border-b border-[var(--db-border)] lg:grid-cols-12">
        <div className="min-w-0 border-b border-[var(--db-border)] px-4 py-6 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r">
          <p className="font-mono-code text-[11px] font-semibold uppercase tracking-widest text-[#FF5A36]">
            [ 02 // THE FRICTION LEDGER ]
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--db-ink)]">
            Why every workaround breaks
          </h2>
        </div>
        <div className="min-w-0 flex items-center px-4 py-6 sm:px-8 lg:col-span-8">
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--db-muted)]">
            People still WhatsApp themselves photos because native ecosystem tools lock out
            other devices, and naive Wi-Fi tools fail behind 5G, VPNs, or campus/office
            firewalls. DropBridge removes every single bottleneck in one web + PWA bridge.
          </p>
        </div>
      </div>

      {/* Responsive Hairline Comparison Ledger */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto db-scroll">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--db-border)] bg-[var(--db-card)]/70 font-mono-code text-[11px] uppercase tracking-wider text-[var(--db-muted)]">
              <th className="px-5 py-3.5 sm:px-8 font-semibold">Capability</th>
              <th className="bg-[#10375C] px-5 py-3.5 font-bold text-white">
                DropBridge
              </th>
              <th className="px-5 py-3.5 font-semibold">AirDrop</th>
              <th className="px-5 py-3.5 font-semibold">WhatsApp-to-Self</th>
              <th className="px-5 py-3.5 font-semibold">LAN-Only Tools</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, idx) => (
              <tr
                key={row.feature}
                className={
                  idx < ROWS.length - 1 ? "border-b border-[var(--db-border)]" : ""
                }
              >
                <td className="px-5 py-4 sm:px-8">
                  <p className="font-display text-sm font-bold text-[var(--db-ink)]">
                    {row.feature}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--db-muted)]">{row.detail}</p>
                </td>
                <td className="border-x border-[#FF5A36]/25 bg-[#FF5A36]/[0.05] px-5 py-4">
                  <StatusPill
                    status={row.dropbridge.status}
                    note={row.dropbridge.note}
                    highlight
                  />
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={row.airdrop.status} note={row.airdrop.note} />
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={row.whatsapp.status} note={row.whatsapp.note} />
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={row.lanTools.status} note={row.lanTools.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
