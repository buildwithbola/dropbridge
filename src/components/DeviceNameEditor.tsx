"use client";

import React, { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

interface DeviceNameEditorProps {
  name: string;
  os: string;
  onSave: (nextName: string) => void;
  onDark?: boolean;
}

export function DeviceNameEditor({
  name,
  os,
  onSave,
  onDark = true,
}: DeviceNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (clean) {
      onSave(clean);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={commit} className="inline-flex items-center gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={28}
          autoFocus
          className={`w-36 rounded-lg border px-2 py-0.5 text-[11px] font-mono-code focus:outline-none ${
            onDark
              ? "border-[#FF5A36] bg-white/12 text-white"
              : "border-[#FF5A36] bg-[var(--db-card)] text-[var(--db-ink)]"
          }`}
        />
        <button
          type="submit"
          aria-label="Save device name"
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF5A36] text-white cursor-pointer"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
          aria-label="Cancel rename"
          className={`flex h-6 w-6 items-center justify-center rounded-md cursor-pointer ${
            onDark ? "bg-white/10 text-white/75" : "bg-[var(--db-card-subtle)] text-[var(--db-muted)]"
          }`}
        >
          <X className="h-3 w-3" />
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      title="Rename this device"
      className={`group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono-code text-[11px] transition-colors cursor-pointer ${
        onDark
          ? "text-white/65 hover:bg-white/10 hover:text-white"
          : "text-[var(--db-muted)] hover:bg-[var(--db-card-subtle)] hover:text-[var(--db-ink)]"
      }`}
    >
      <span>
        {name} ({os})
      </span>
      <Pencil className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
    </button>
  );
}
