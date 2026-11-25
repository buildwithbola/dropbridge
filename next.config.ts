import type { NextConfig } from "next";

const isDesktopBuild = process.env.DROPBRIDGE_DESKTOP === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isDesktopBuild ? { output: "standalone" as const } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
