"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function HomeQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const join = searchParams.get("join");
    const shared = searchParams.get("shared");
    if (join || shared) {
      const qs = new URLSearchParams();
      if (join) qs.set("join", join);
      if (shared) qs.set("shared", shared);
      router.replace(`/bridge?${qs.toString()}`);
    }
  }, [router, searchParams]);

  return null;
}
