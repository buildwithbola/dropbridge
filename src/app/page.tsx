import type { Metadata } from "next";
import React, { Suspense } from "react";
import { HomePageClient } from "@/components/home/HomePageClient";
import { HomeQueryRedirect } from "@/components/HomeQueryRedirect";

export const metadata: Metadata = {
  title: "DropBridge — Bridge the gap between screen and pocket.",
  description:
    "Zero-hassle PC-to-phone file, 4K video, photo, and clipboard bridge for Windows, macOS, Linux, Android, and iOS. Pure Web & installable PWA.",
};

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HomeQueryRedirect />
      </Suspense>
      <HomePageClient />
    </>
  );
}
