"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundEngine } from "@/lib/soundEngine";

export function SoundToggle({ onDarkSurface = false }: { onDarkSurface?: boolean }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundEngine.isEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    soundEngine.setEnabled(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Mute transfer chimes" : "Enable transfer chimes"}
      title={enabled ? "Transfer chimes on" : "Transfer chimes muted"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
        onDarkSurface
          ? "border-white/15 bg-white/10 text-white hover:bg-white/20"
          : "border-[var(--db-border)] bg-[var(--db-card)] text-[var(--db-slate)] hover:border-[var(--db-border-strong)]"
      }`}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-60" />}
    </button>
  );
}
