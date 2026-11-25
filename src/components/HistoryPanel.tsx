"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileAudio,
  FileText,
  FileVideo,
  File as FileIcon,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  formatRelativeTime,
  type HistoryEntry,
} from "@/lib/historyStore";
import { copyToClipboard, formatBytes } from "@/lib/utils";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRemoveEntry: (id: string) => void;
  onClearAll: () => void;
  maxHeightClass?: string;
}

function HistoryRow({
  entry,
  onRemove,
}: {
  entry: HistoryEntry;
  onRemove: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!entry.text) return;
    const ok = await copyToClipboard(entry.text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const icon =
    entry.kind === "text" ? (
      entry.isUrl ? (
        <Link2 className="h-4 w-4 text-[#FF5A36]" />
      ) : (
        <MessageSquareText className="h-4 w-4 text-[#FF5A36]" />
      )
    ) : entry.previewType === "image" ? (
      <ImageIcon className="h-4 w-4 text-[#10375C] dark:text-[#FF8D73]" />
    ) : entry.previewType === "video" ? (
      <FileVideo className="h-4 w-4 text-[#10375C] dark:text-[#FF8D73]" />
    ) : entry.previewType === "audio" ? (
      <FileAudio className="h-4 w-4 text-[#10375C] dark:text-[#FF8D73]" />
    ) : entry.previewType === "pdf" ? (
      <FileText className="h-4 w-4 text-[#10375C] dark:text-[#FF8D73]" />
    ) : (
      <FileIcon className="h-4 w-4 text-[#10375C] dark:text-[#FF8D73]" />
    );

  return (
    <div className="rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-3 shadow-xs">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            entry.kind === "text"
              ? "bg-[#FF5A36]/12"
              : "bg-[var(--db-card-subtle)]"
          }`}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs sm:text-sm font-semibold text-[var(--db-ink)]">
              {entry.kind === "file" ? entry.name : entry.text}
            </p>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label="Remove history entry"
              className="shrink-0 text-[var(--db-muted)] hover:text-[#E03E26] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--db-muted)]">
            <span className="inline-flex items-center gap-0.5 font-medium">
              {entry.direction === "incoming" ? (
                <>
                  <ArrowDownLeft className="h-3 w-3 text-[#FF5A36]" />
                  From {entry.peerName}
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                  To {entry.peerName}
                </>
              )}
            </span>

            {entry.kind === "file" && typeof entry.size === "number" && (
              <span className="font-mono-code">{formatBytes(entry.size)}</span>
            )}

            {entry.kind === "file" && entry.verified && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Lossless
              </span>
            )}

            <span className="font-mono-code opacity-80">
              · {formatRelativeTime(entry.timestamp)}
            </span>
          </div>

          {entry.kind === "text" && entry.text && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              {entry.isUrl && (
                <a
                  href={entry.text.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FF5A36] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#E84926] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HistoryPanel({
  entries,
  onRemoveEntry,
  onClearAll,
  maxHeightClass = "max-h-[calc(100dvh-265px)]",
}: HistoryPanelProps) {
  const [filter, setFilter] = useState<"all" | "file" | "text">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (!q) return true;
      const hay = `${e.name || ""} ${e.text || ""} ${e.peerName || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, filter, query]);

  return (
    <div className="flex flex-1 flex-col min-h-0 space-y-3">
      {/* Filter + Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-[var(--db-border)] bg-[var(--db-card)] p-0.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "file", label: "Files" },
              { key: "text", label: "Links & Notes" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                filter === tab.key
                  ? "bg-[#10375C] text-white dark:bg-[#FF5A36]"
                  : "text-[var(--db-muted)] hover:text-[var(--db-ink)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--db-border)] bg-[var(--db-card)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--db-muted)] hover:text-[#E03E26] transition-colors cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear history</span>
          </button>
        )}
      </div>

      {entries.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--db-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search past files, links, or devices…"
            className="w-full rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-card)] pl-8 pr-3 py-2 text-xs text-[var(--db-ink)] placeholder:text-[var(--db-muted)]/70 focus:border-[#FF5A36] focus:outline-none"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--db-border-strong)] bg-[var(--db-card)]/60 p-7 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--db-card-subtle)] text-[var(--db-muted)]">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-sm font-bold text-[var(--db-ink)]">
            {entries.length === 0 ? "No transfer history yet" : "No matches found"}
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-[var(--db-muted)]">
            {entries.length === 0
              ? "Every file, photo, link, and note you send or receive is logged locally here for quick reference."
              : "Try clearing your search or switching filters."}
          </p>
        </div>
      ) : (
        <div className={`flex-1 space-y-2 overflow-y-auto pr-0.5 db-scroll ${maxHeightClass}`}>
          {filtered.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              onRemove={onRemoveEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
