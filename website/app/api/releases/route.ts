import { NextResponse } from "next/server";
import { resolveDownloads, fetchLatestRelease } from "@/lib/github";

export const revalidate = 120;

export async function GET() {
  try {
    const [downloads, release] = await Promise.all([
      resolveDownloads(),
      fetchLatestRelease(),
    ]);
    return NextResponse.json({
      version: release?.tag_name ?? "v2.0.1",
      releaseUrl: release?.html_url,
      publishedAt: release?.published_at,
      downloads,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
