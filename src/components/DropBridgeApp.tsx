"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DropBridgeEngine } from "@/lib/bridgeEngine";
import {
  appendTransferHistory,
  clearTransferHistory,
  loadTransferHistory,
  removeHistoryEntry,
  type HistoryEntry,
} from "@/lib/historyStore";
import {
  forgetTrustedDevice,
  getAutoRejoinEnabled,
  getLastPersistentRoomCode,
  loadTrustedDevices,
  setAutoRejoinEnabled,
} from "@/lib/trustedDevices";
import type { BridgeSnapshot, FileTransferItem, TrustedDevice } from "@/lib/types";
import { normalizeCode, saveDeviceName } from "@/lib/utils";
import { DesktopSplitView } from "./DesktopSplitView";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { MobilePocketView } from "./MobilePocketView";
import { SplashScreen } from "./SplashScreen";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface DirectoryPickerHandle {
  name: string;
  getFileHandle: (
    name: string,
    opts?: { create?: boolean }
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

export function DropBridgeApp() {
  const searchParams = useSearchParams();
  const engineRef = useRef<DropBridgeEngine | null>(null);
  const sharedHandledRef = useRef(false);
  const dirHandleRef = useRef<DirectoryPickerHandle | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const loggedHistoryIdsRef = useRef<Set<string>>(new Set());

  const [snapshot, setSnapshot] = useState<BridgeSnapshot>(() => {
    const engine = new DropBridgeEngine();
    engineRef.current = engine;
    return engine.getSnapshot();
  });

  const [lanIp, setLanIp] = useState<string | null>(null);
  const [originInfo, setOriginInfo] = useState<{
    protocol: string;
    hostname: string;
    port: string;
  }>({ protocol: "http:", hostname: "localhost", port: "3000" });
  const [isDragging, setIsDragging] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [autoRejoin, setAutoRejoin] = useState(true);
  const [previewItem, setPreviewItem] = useState<FileTransferItem | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [canUseFolderAutoSave, setCanUseFolderAutoSave] = useState(false);
  const [autoSaveFolderName, setAutoSaveFolderName] = useState<string | null>(null);
  const [autoSavedIds, setAutoSavedIds] = useState<Set<string>>(() => new Set());

  const joinParam = searchParams.get("join");
  const sharedParam = searchParams.get("shared");

  // Register lightweight PWA service worker + listen for native PWA Install prompt
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    setCanUseFolderAutoSave(
      typeof window !== "undefined" &&
        "showDirectoryPicker" in window &&
        window.isSecureContext
    );

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstallPwa(true);
    };
    const onInstalled = () => {
      installPromptRef.current = null;
      setCanInstallPwa(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Capture runtime origin, persistent history, trusted devices & LAN IP
  useEffect(() => {
    setOriginInfo({
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
    });
    setTrustedDevices(loadTrustedDevices());
    setAutoRejoin(getAutoRejoinEnabled());
    const initialHistory = loadTransferHistory();
    setHistoryEntries(initialHistory);
    for (const entry of initialHistory) {
      loggedHistoryIdsRef.current.add(entry.id);
    }

    fetch("/api/network-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lanIp) {
          setLanIp(String(data.lanIp));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-save incoming files directly to Desktop chosen folder if enabled
  const handleAutoSaveIncoming = useCallback(async (item: FileTransferItem) => {
    const dir = dirHandleRef.current;
    if (!dir || !item.blob) return;
    try {
      const safeName = item.name.replace(/[<>:"/\\|?*]/g, "_");
      const fileHandle = await dir.getFileHandle(safeName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(item.blob);
      await writable.close();
      setAutoSavedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
    } catch {
      // User revoked folder permission or file locked; manual Save button still works
    }
  }, []);

  // Start DropBridge engine (auto-rejoining remembered pair when enabled!)
  useEffect(() => {
    const engine = engineRef.current || new DropBridgeEngine();
    engineRef.current = engine;

    engine.onIncomingFileComplete(handleAutoSaveIncoming);

    const unsub = engine.subscribe((next) => {
      setSnapshot(next);
      if (next.connectionState === "connected") {
        setTrustedDevices(loadTrustedDevices());
      }

      // Persist every completed file and every sent/received text clip to History
      let updatedHistory: HistoryEntry[] | null = null;
      const peerLabel = next.remotePeer?.name || "Paired Device";
      for (const item of next.items) {
        if (loggedHistoryIdsRef.current.has(item.id)) continue;
        if (item.kind === "text" || (item.kind === "file" && item.status === "completed")) {
          loggedHistoryIdsRef.current.add(item.id);
          updatedHistory = appendTransferHistory(item, peerLabel, next.transportMode);
        }
      }
      if (updatedHistory) {
        setHistoryEntries(updatedHistory);
      }
    });

    const shouldAutoRejoin = getAutoRejoinEnabled();
    const lastRoom = shouldAutoRejoin ? getLastPersistentRoomCode() : null;
    engine.start(joinParam, lastRoom);

    return () => {
      engine.onIncomingFileComplete(null);
      unsub();
      engine.destroy();
    };
  }, [joinParam, handleAutoSaveIncoming]);

  // If opened from Android Share Target (?shared=...), auto-send as soon as connected
  useEffect(() => {
    if (
      sharedParam &&
      !sharedHandledRef.current &&
      snapshot.connectionState === "connected" &&
      engineRef.current
    ) {
      sharedHandledRef.current = true;
      engineRef.current.sendText(sharedParam);
    }
  }, [sharedParam, snapshot.connectionState]);

  // Global drag-and-drop + Ctrl+V paste anywhere on the window
  useEffect(() => {
    let dragCounter = 0;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      setIsDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0 && engineRef.current) {
        engineRef.current.sendFiles(files);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items || !engineRef.current) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) pastedFiles.push(f);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        engineRef.current.sendFiles(pastedFiles);
        return;
      }

      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim() && engineRef.current.getSnapshot().connectionState === "connected") {
        e.preventDefault();
        engineRef.current.sendText(text);
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  const isLocalhost =
    originInfo.hostname === "localhost" || originInfo.hostname === "127.0.0.1";

  const joinUrl = useMemo(() => {
    const host = isLocalhost && lanIp ? lanIp : originInfo.hostname;
    const portSuffix = originInfo.port ? `:${originInfo.port}` : "";
    const code = snapshot.displayCode || snapshot.roomCode;
    return `${originInfo.protocol}//${host}${portSuffix}/${code ? `?join=${encodeURIComponent(code)}` : ""}`;
  }, [isLocalhost, lanIp, originInfo, snapshot.displayCode, snapshot.roomCode]);

  const handleFilesSelected = (files: FileList | File[]) => {
    engineRef.current?.sendFiles(files);
  };

  const handleSendText = (text: string) => {
    engineRef.current?.sendText(text);
  };

  const handleJoinCode = (code: string) => {
    engineRef.current?.joinRoom(normalizeCode(code));
  };

  const handleRefreshCode = () => {
    engineRef.current?.createNewRoom();
  };

  const handleDisconnect = () => {
    engineRef.current?.disconnectBridge();
  };

  const handleCancelTransfer = (id: string) => {
    engineRef.current?.cancelTransfer(id);
  };

  const handleRemoveItem = (id: string) => {
    engineRef.current?.removeItem(id);
  };

  const handleClearFeed = () => {
    engineRef.current?.clearFeed();
  };

  const handleRenameDevice = (nextName: string) => {
    saveDeviceName(nextName);
    engineRef.current?.updateLocalDeviceName(nextName);
  };

  const handleToggleAutoRejoin = (next: boolean) => {
    setAutoRejoin(next);
    setAutoRejoinEnabled(next);
  };

  const handleReconnectTrusted = (device: TrustedDevice) => {
    engineRef.current?.createNewRoom(device.roomCode);
  };

  const handleForgetTrusted = (deviceId: string) => {
    setTrustedDevices(forgetTrustedDevice(deviceId));
  };

  const handleRemoveHistoryEntry = (id: string) => {
    setHistoryEntries(removeHistoryEntry(id));
  };

  const handleClearHistory = () => {
    setHistoryEntries(clearTransferHistory());
  };

  const handleInstallPwa = async () => {
    const promptEvt = installPromptRef.current;
    if (!promptEvt) return;
    await promptEvt.prompt();
    await promptEvt.userChoice.catch(() => {});
    installPromptRef.current = null;
    setCanInstallPwa(false);
  };

  const handlePickAutoSaveFolder = async () => {
    try {
      const picker = (
        window as unknown as {
          showDirectoryPicker?: (opts?: { mode?: string }) => Promise<DirectoryPickerHandle>;
        }
      ).showDirectoryPicker;
      if (!picker) return;
      const handle = await picker({ mode: "readwrite" });
      dirHandleRef.current = handle;
      setAutoSaveFolderName(handle.name);
    } catch {
      // user cancelled folder picker
    }
  };

  const handleDisableAutoSaveFolder = () => {
    dirHandleRef.current = null;
    setAutoSaveFolderName(null);
  };

  return (
    <>
      <SplashScreen />

      {/* Desktop Split-Screen Experience (lg+) */}
      <div className="hidden lg:block w-full">
        <DesktopSplitView
          snapshot={snapshot}
          joinUrl={joinUrl}
          lanIp={lanIp}
          isLocalhost={isLocalhost}
          isDragging={isDragging}
          trustedDevices={trustedDevices}
          historyEntries={historyEntries}
          autoRejoin={autoRejoin}
          canInstallPwa={canInstallPwa}
          canUseFolderAutoSave={canUseFolderAutoSave}
          autoSaveFolderName={autoSaveFolderName}
          autoSavedIds={autoSavedIds}
          onFilesSelected={handleFilesSelected}
          onSendText={handleSendText}
          onJoinCode={handleJoinCode}
          onRefreshCode={handleRefreshCode}
          onDisconnect={handleDisconnect}
          onCancelTransfer={handleCancelTransfer}
          onRemoveItem={handleRemoveItem}
          onClearFeed={handleClearFeed}
          onPreviewFile={setPreviewItem}
          onRenameDevice={handleRenameDevice}
          onToggleAutoRejoin={handleToggleAutoRejoin}
          onReconnectTrusted={handleReconnectTrusted}
          onForgetTrusted={handleForgetTrusted}
          onRemoveHistoryEntry={handleRemoveHistoryEntry}
          onClearHistory={handleClearHistory}
          onInstallPwa={handleInstallPwa}
          onPickAutoSaveFolder={handlePickAutoSaveFolder}
          onDisableAutoSaveFolder={handleDisableAutoSaveFolder}
        />
      </div>

      {/* Mobile Pocket Experience (< lg) */}
      <div className="block lg:hidden w-full">
        <MobilePocketView
          snapshot={snapshot}
          trustedDevices={trustedDevices}
          historyEntries={historyEntries}
          autoRejoin={autoRejoin}
          canInstallPwa={canInstallPwa}
          onFilesSelected={handleFilesSelected}
          onSendText={handleSendText}
          onJoinCode={handleJoinCode}
          onRefreshCode={handleRefreshCode}
          onDisconnect={handleDisconnect}
          onCancelTransfer={handleCancelTransfer}
          onRemoveItem={handleRemoveItem}
          onClearFeed={handleClearFeed}
          onPreviewFile={setPreviewItem}
          onRenameDevice={handleRenameDevice}
          onToggleAutoRejoin={handleToggleAutoRejoin}
          onReconnectTrusted={handleReconnectTrusted}
          onForgetTrusted={handleForgetTrusted}
          onRemoveHistoryEntry={handleRemoveHistoryEntry}
          onClearHistory={handleClearHistory}
          onInstallPwa={handleInstallPwa}
        />
      </div>

      {/* Full-Resolution Media Lightbox */}
      <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}
