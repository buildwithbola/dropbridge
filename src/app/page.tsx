import React, { Suspense } from "react";
import { DropBridgeApp } from "@/components/DropBridgeApp";

function DropBridgeFallback() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#10375C] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-[#FF5A36] animate-spin" />
        <p className="font-display text-sm font-semibold tracking-tight text-white/80">
          Opening DropBridge…
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<DropBridgeFallback />}>
      <DropBridgeApp />
    </Suspense>
  );
}
