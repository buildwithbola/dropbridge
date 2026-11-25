import type { Metadata } from "next";
import React, { Suspense } from "react";
import { DropBridgeApp } from "@/components/DropBridgeApp";

export const metadata: Metadata = {
  title: "DropBridge App — Live Device Bridge",
  description:
    "Pair your laptop and phone in 3 seconds to transfer lossless files, photos, videos, and clipboard links.",
};

function DropBridgeFallback() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center db-sapphire-grid text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-[#FF5A36] animate-spin" />
        <p className="font-display text-sm font-semibold tracking-tight text-white/80">
          Opening DropBridge…
        </p>
      </div>
    </div>
  );
}

export default function BridgeAppPage() {
  return (
    <Suspense fallback={<DropBridgeFallback />}>
      <DropBridgeApp />
    </Suspense>
  );
}
