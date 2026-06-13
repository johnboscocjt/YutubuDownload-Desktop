import { NextRequest, NextResponse } from "next/server";
import { type Platform, PLATFORMS } from "@/lib/config";
import { resolveDownloads } from "@/lib/github";
import { incrementDownload } from "@/lib/stats";

const VALID: Platform[] = ["linux", "windows", "macos", "terminal"];

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") as Platform | null;
  if (!platform || !VALID.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const downloads = await resolveDownloads();
  const match = downloads.find((d) => d.platform === platform);
  const info = PLATFORMS.find((p) => p.id === platform);

  const url = match?.url ?? info?.fallbackUrl;
  if (!url) {
    return NextResponse.json({ error: "No download URL" }, { status: 404 });
  }

  try {
    await incrementDownload(platform);
  } catch {
    /* counter optional */
  }

  return NextResponse.redirect(url, 302);
}
