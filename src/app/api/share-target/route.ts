import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("shared_title") || "";
  const text = searchParams.get("shared_text") || "";
  const url = searchParams.get("shared_url") || "";

  const combined = [url, text, title]
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .join(" — ");

  const target = new URL("/", request.url);
  if (combined) {
    target.searchParams.set("shared", combined.slice(0, 2000));
  }
  return NextResponse.redirect(target);
}
