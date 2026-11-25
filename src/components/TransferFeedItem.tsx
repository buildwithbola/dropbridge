"use client";

import React, { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileAudio,
  FileText,
  FileVideo,
  File as FileIcon,
  FolderCheck,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import type { BridgeItem, FileTransferItem } from "@/lib/types";
import {
  copyToClipboard,
  downloadBlob,
  formatBytes,
  formatEta,
  formatSpeed,
} from "@/lib/utils";

interface TransferFeedItemProps {
  item: BridgeItem;
  autoSaved?: boolean;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
  onPreview?: (item: FileTransferItem) => void;
}

function FileTypeIcon({
  item,
  canPreview,
  onPreview,
}: {
  item: FileTransferItem;
  canPreview: boolean;
  onPreview?: () => void;
}) {
  const content =
    item.previewType === "image" && item.blobUrl ? (
      <img
        src={item.blobUrl}
        alt={item.name}
        className="h-12 w-12 rounded-xl object-cover ring-1 ring-[var(--db-border)] shrink-0"
      />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--db-card-subtle)] text-[#10375C] dark:text-[#FF8D73]">
        {item.previewType === "image" ? (
          <ImageIcon className="h-5 w-5" />
        ) : item.previewType === "video" ? (
          <FileVideo className="h-5 w-5" />
        ) : item.previewType === "audio" ? (
          <FileAudio className="h-5 w-5" />
        ) : item.previewType === "pdf" ? (
          <FileText className="h-5 w-5" />
        ) : (
          <FileIcon className="h-5 w-5" />
        )}
      </div>
    );

  if (canPreview && onPreview) {
    return (
      <button
        type="button"
        onClick={onPreview}
        title="Preview original media"
        className="group relative shrink-0 rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A36]"
      >
        {content}
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#10375C]/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return content;
}

export function TransferFeedItem({
  item,
  autoSaved = false,
  onCancel,
  onRemove,
  onPreview,
}: TransferFeedItemProps) {
  const [copied, setCopied] = useState(false);

  if (item.kind === "text") {
    const handleCopy = async () => {
      const ok = await copyToClipboard(item.text);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    };

    return (
      <div className="db-fade-up rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-3.5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5A36]/12 text-[#FF5A36]">
            {item.isUrl ? <Link2 className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--db-muted)]">
              <span className="inline-flex items-center gap-1">
                {item.direction === "incoming" ? (
                  <>
                    <ArrowDownLeft className="h-3 w-3 text-[#FF5A36]" />
                    Received {item.isUrl ? "Link" : "Note"}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    Sent {item.isUrl ? "Link" : "Note"}
                  </>
                )}
              </span>

              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove item"
                  className="text-[var(--db-muted)] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <p className="mt-1 text-sm text-[var(--db-ink)] break-words whitespace-pre-wrap leading-snug max-h-28 overflow-y-auto db-scroll">
              {item.text}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--db-ink)] hover:border-[#FF5A36] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {item.isUrl && (
                <a
                  href={item.text.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5A36] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#E84926] transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Link</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isWorking = item.status === "transferring" || item.status === "queued";
  const isDone = item.status === "completed";
  const canPreview =
    isDone &&
    Boolean(item.blobUrl) &&
    ["image", "video", "audio", "pdf"].includes(item.previewType);

  return (
    <div className="db-fade-up rounded-2xl border border-[var(--db-border)] bg-[var(--db-card)] p-3.5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileTypeIcon
            item={item}
            canPreview={canPreview}
            onPreview={onPreview ? () => onPreview(item) : undefined}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-[var(--db-ink)]" title={item.name}>
                {item.name}
              </p>
              <span className="shrink-0 font-mono-code text-[11px] font-medium text-[var(--db-muted)]">
                {formatBytes(item.size)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--db-muted)]">
              <span className="inline-flex items-center gap-1 font-medium">
                {item.direction === "incoming" ? (
                  <>
                    <ArrowDownLeft className="h-3 w-3 text-[#FF5A36]" />
                    Incoming
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    Sent
                  </>
                )}
              </span>

              {item.status === "transferring" && (
                <>
                  <span className="font-mono-code text-[#FF5A36] font-semibold">
                    {item.progress}%
                  </span>
                  <span className="font-mono-code">{formatSpeed(item.speedBps)}</span>
                  {item.etaSeconds !== null && (
                    <span className="font-mono-code">{formatEta(item.etaSeconds)}</span>
                  )}
                </>
              )}

              {item.status === "queued" && <span>Queued…</span>}
              {item.status === "cancelled" && <span className="text-[#E03E26]">Cancelled</span>}
              {isDone && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {item.verified ? "Verified lossless" : "Completed"}
                </span>
              )}
              {autoSaved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <FolderCheck className="h-3 w-3" />
                  Auto-saved
                </span>
              )}
            </div>

            {isWorking && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--db-card-subtle)]">
                <div
                  className="h-full rounded-full bg-[#FF5A36] transition-all duration-150"
                  style={{ width: `${Math.max(3, item.progress)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons — full clean row on mobile, compact inline on sm+ */}
        <div className="shrink-0 flex items-center justify-end gap-1.5 border-t border-[var(--db-border)] pt-2.5 sm:border-t-0 sm:pt-0">
          {isWorking && onCancel && item.direction === "outgoing" && (
            <button
              type="button"
              onClick={() => onCancel(item.id)}
              aria-label="Cancel transfer"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--db-border)] text-[var(--db-muted)] hover:border-[#FF5A36] hover:text-[#FF5A36] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {canPreview && onPreview && (
            <button
              type="button"
              onClick={() => onPreview(item)}
              aria-label={`Preview ${item.name}`}
              title="Preview"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--db-border-strong)] bg-[var(--db-surface)] px-2.5 sm:px-0 sm:w-9 text-xs font-semibold text-[var(--db-slate)] hover:border-[#FF5A36] hover:text-[#FF5A36] transition-colors cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span className="sm:hidden">Preview</span>
            </button>
          )}

          {isDone && item.blob && item.direction === "incoming" && (
            <button
              type="button"
              onClick={() => downloadBlob(item.blob!, item.name)}
              className="db-btn-coral inline-flex h-9 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
          )}

          {!isWorking && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label="Remove from feed"
              title="Remove"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--db-muted)] hover:bg-[var(--db-card-subtle)] hover:text-[#E03E26] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
