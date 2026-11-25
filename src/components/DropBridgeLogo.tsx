"use client";

import React from "react";

interface DropBridgeLogoProps {
  variant?: "light-bg" | "dark-bg" | "icon";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function DropBridgeMark({
  onDark = false,
  className = "w-9 h-7",
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 112 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left Bridge Arch — Sapphire Blue on light surfaces, Crisp White on Sapphire dark surfaces or Dark Mode */}
      <path
        d="M10 68 C16 26 44 6 70 8 C54 13 34 32 27 68 Z"
        fill={onDark ? "#FFFFFF" : "var(--db-ink)"}
      />
      {/* Right Arch + Downward Drop Arrow — Coral-Orange (#FF5A36) */}
      <path
        d="M48 11 C64 4 98 18 106 68 L90 68 C83 36 68 24 59 23 C67 31 70 42 70 51 L80 51 L63 75 L46 51 L56 51 C56 35 52 21 41 15 C43.3 13.3 45.7 12 48 11 Z"
        fill="#FF5A36"
      />
    </svg>
  );
}

export function DropBridgeLogo({
  variant = "light-bg",
  size = "md",
  showTagline = false,
  className = "",
}: DropBridgeLogoProps) {
  const onDark = variant === "dark-bg" || variant === "icon";
  const textSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const markSize =
    size === "lg" ? "w-11 h-8" : size === "sm" ? "w-7 h-5" : "w-9 h-7";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {variant === "icon" ? (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#10375C] shadow-md ring-1 ring-white/15">
          <DropBridgeMark onDark className="w-7 h-5" />
        </span>
      ) : (
        <DropBridgeMark onDark={onDark} className={markSize} />
      )}
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-extrabold tracking-[-0.03em] ${textSize} ${
            onDark ? "text-white" : "text-[#10375C] dark:text-white"
          }`}
          style={{ color: onDark ? "#FFFFFF" : "var(--db-ink)" }}
        >
          Drop<span className="text-[#FF5A36]">Bridge</span>
        </span>
        {showTagline && (
          <span
            className="mt-1 text-[11px] font-medium tracking-tight"
            style={{ color: onDark ? "rgba(255,255,255,0.68)" : "var(--db-muted)" }}
          >
            Bridge the gap between screen and pocket.
          </span>
        )}
      </div>
    </div>
  );
}
