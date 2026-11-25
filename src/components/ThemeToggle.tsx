"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "dropbridge-theme-v1";

export function ThemeToggle({ onDarkSurface = false }: { onDarkSurface?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => {
      const current = document.documentElement.getAttribute("data-theme");
      if (current === "dark" || current === "light") {
        setTheme(current);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={theme === "light" ? "Switch to Deep Sapphire Night" : "Switch to Off-White Daylight"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
        onDarkSurface
          ? "border-white/15 bg-white/10 text-white hover:bg-white/20"
          : "border-[var(--db-border)] bg-[var(--db-card)] text-[var(--db-slate)] hover:border-[var(--db-border-strong)]"
      }`}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
