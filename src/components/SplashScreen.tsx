"use client";

import React, { useEffect, useState } from "react";

const SPLASH_SESSION_KEY = "dropbridge-splash-shown-v1";

interface SplashScreenProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function SplashScreen({ forceShow = false, onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"visible" | "exiting" | "gone">("visible");

  useEffect(() => {
    if (!forceShow) {
      try {
        if (sessionStorage.getItem(SPLASH_SESSION_KEY) === "1") {
          setPhase("gone");
          onComplete?.();
          return;
        }
        sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        // ignore storage restrictions
      }
    } else {
      setPhase("visible");
    }

    const exitTimer = setTimeout(() => {
      setPhase("exiting");
    }, 1450);

    const doneTimer = setTimeout(() => {
      setPhase("gone");
      onComplete?.();
    }, 1950);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [forceShow, onComplete]);

  if (phase === "gone") return null;

  const dismissNow = () => {
    setPhase("exiting");
    setTimeout(() => {
      setPhase("gone");
      onComplete?.();
    }, 260);
  };

  return (
    <div
      role="status"
      aria-label="Loading DropBridge"
      onClick={dismissNow}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center db-sapphire-grid text-white cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        phase === "exiting"
          ? "opacity-0 scale-[1.03] pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      {/* Ambient Coral Radar Glow */}
      <div className="relative flex flex-col items-center">
        <div
          className="pointer-events-none absolute -top-10 h-44 w-44 rounded-full bg-[#FF5A36]/18 blur-3xl"
          aria-hidden="true"
        />

        {/* Animated Concept 1 Arch-to-Arrow SVG */}
        <div className="relative flex h-28 w-36 items-center justify-center">
          <span
            className="pointer-events-none absolute bottom-1 h-14 w-14 rounded-full border-2 border-[#FF5A36]/55 db-splash-ripple"
            aria-hidden="true"
          />
          <svg
            viewBox="0 0 112 78"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-24 w-32 drop-shadow-[0_14px_30px_rgba(0,0,0,0.4)]"
            aria-hidden="true"
          >
            {/* Left Arch sweeping upward */}
            <path
              d="M10 68 C16 26 44 6 70 8 C54 13 34 32 27 68 Z"
              fill="#FFFFFF"
              className="db-splash-arch-left"
            />
            {/* Right Arch + Downward Coral Drop Arrow */}
            <path
              d="M48 11 C64 4 98 18 106 68 L90 68 C83 36 68 24 59 23 C67 31 70 42 70 51 L80 51 L63 75 L46 51 L56 51 C56 35 52 21 41 15 C43.3 13.3 45.7 12 48 11 Z"
              fill="#FF5A36"
              className="db-splash-arch-right"
            />
          </svg>
        </div>

        {/* Wordmark + Tagline */}
        <div className="mt-4 text-center db-splash-text">
          <p className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.035em] text-white">
            Drop<span className="text-[#FF5A36]">Bridge</span>
          </p>
          <p className="mt-2 text-xs sm:text-sm font-medium tracking-tight text-white/75">
            Bridge the gap between screen and pocket.
          </p>
        </div>

        {/* Sleek Animated Progress Rail */}
        <div className="mt-8 w-52 sm:w-60 overflow-hidden rounded-full bg-white/12 p-0.5 ring-1 ring-white/10">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FF5A36] via-[#FF8C6E] to-[#FFFFFF] db-splash-progress" />
        </div>

        <p className="mt-3 font-mono-code text-[11px] uppercase tracking-[0.18em] text-white/55">
          Initializing encrypted bridge
        </p>
      </div>
    </div>
  );
}
