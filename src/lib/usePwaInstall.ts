"use client";

import { useCallback, useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaPlatform =
  | "ios"
  | "macos-safari"
  | "android"
  | "chromium-desktop"
  | "other";

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;
let listenersBound = false;
const promptSubscribers = new Set<() => void>();

function notifySubscribers() {
  for (const cb of promptSubscribers) cb();
}

function bindGlobalListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPromptGlobal = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    deferredPromptGlobal = null;
    notifySubscribers();
  });
}

function detectPwaPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "chromium-desktop";
  const ua = navigator.userAgent || "";
  const isIPad =
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (/iPhone|iPod/i.test(ua) || isIPad) return "ios";
  if (/Android/i.test(ua)) return "android";
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua);
  if (isMac && isSafari) return "macos-safari";
  if (/Chrome|Chromium|Edg/i.test(ua)) return "chromium-desktop";
  return "other";
}

function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function usePwaInstall() {
  const [canNativePrompt, setCanNativePrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>("chromium-desktop");
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    bindGlobalListeners();
    setCanNativePrompt(Boolean(deferredPromptGlobal));
    setIsStandalone(checkIsStandalone());
    setPlatform(detectPwaPlatform());

    const sub = () => {
      setCanNativePrompt(Boolean(deferredPromptGlobal));
      setIsStandalone(checkIsStandalone());
    };
    promptSubscribers.add(sub);

    const media = window.matchMedia("(display-mode: standalone)");
    const onMediaChange = () => setIsStandalone(checkIsStandalone());
    media.addEventListener?.("change", onMediaChange);

    return () => {
      promptSubscribers.delete(sub);
      media.removeEventListener?.("change", onMediaChange);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPromptGlobal) {
      try {
        await deferredPromptGlobal.prompt();
        const res = await deferredPromptGlobal.userChoice.catch(() => ({
          outcome: "dismissed" as const,
        }));
        if (res.outcome === "accepted") {
          deferredPromptGlobal = null;
          setCanNativePrompt(false);
          setIsStandalone(true);
        }
        return;
      } catch {
        // fallback to manual guide modal
      }
    }
    setShowGuideModal(true);
  }, []);

  return {
    isStandalone,
    canNativePrompt,
    platform,
    showGuideModal,
    setShowGuideModal,
    triggerInstall,
  };
}
