import { NextResponse } from "next/server";
import os from "node:os";

export const dynamic = "force-dynamic";

function rankAddress(name: string, address: string): number {
  const lower = name.toLowerCase();
  let score = 0;

  if (lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("wlan") || lower.includes("en0")) {
    score += 50;
  } else if (lower.includes("ethernet") || lower.includes("eth")) {
    score += 30;
  }

  // Penalize virtual adapters (WSL, Hyper-V, Docker, VirtualBox, VMware, Tailscale)
  if (
    lower.includes("vethernet") ||
    lower.includes("wsl") ||
    lower.includes("docker") ||
    lower.includes("virtual") ||
    lower.includes("vmware") ||
    lower.includes("vbox") ||
    lower.includes("loopback")
  ) {
    score -= 100;
  }

  if (address.startsWith("192.168.")) score += 25;
  else if (address.startsWith("10.")) score += 20;
  else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) score += 15;

  return score;
}

export async function GET() {
  const nets = os.networkInterfaces();
  const candidates: { name: string; address: string; score: number }[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        candidates.push({
          name,
          address: net.address,
          score: rankAddress(name, net.address),
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    lanIp: candidates[0]?.address || null,
    interfaces: candidates.map((c) => ({ name: c.name, address: c.address })),
    signalingPort: Number(process.env.SIGNALING_PORT || 3001),
  });
}
