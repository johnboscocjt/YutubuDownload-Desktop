import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { type Platform, PLATFORMS, APP } from "@/lib/config";
import { resolveDownloads } from "@/lib/github";
import { incrementDownload } from "@/lib/stats";

const VALID: Platform[] = ["linux", "windows", "macos", "terminal"];

async function serveLocalDeb(): Promise<NextResponse> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    APP.linuxDeb.filename
  );

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.debian.binary-package",
        "Content-Disposition": `attachment; filename="${APP.linuxDeb.filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Installer file not found on server. Build with: cd desktop && npm run tauri build" },
      { status: 404 }
    );
  }
}

async function serveLocalWindowsExe(): Promise<NextResponse> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    APP.windowsInstaller.filename
  );

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Disposition": `attachment; filename="${APP.windowsInstaller.filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Windows installer not found on server. Build on Windows or wait for GitHub Actions desktop CI.",
      },
      { status: 404 }
    );
  }
}

async function serveLocalMacosDmg(): Promise<NextResponse> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    APP.macosDmg.filename
  );

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-apple-diskimage",
        "Content-Disposition": `attachment; filename="${APP.macosDmg.filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "macOS installer not found on server. Build on macOS or wait for GitHub Actions desktop CI.",
      },
      { status: 404 }
    );
  }
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") as Platform | null;
  if (!platform || !VALID.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const downloads = await resolveDownloads();
  const match = downloads.find((d) => d.platform === platform);
  const info = PLATFORMS.find((p) => p.id === platform);

  if (match?.comingSoon || info?.comingSoon) {
    return NextResponse.json(
      { error: "This platform is not available yet. Coming soon." },
      { status: 503 }
    );
  }

  if (!match?.available) {
    return NextResponse.json(
      { error: "No release asset available yet. Check GitHub Releases." },
      { status: 404 }
    );
  }

  // Serve .deb directly from this site (attachment download starts immediately)
  if (platform === "linux" && match.url.includes("/api/download")) {
    try {
      await incrementDownload(platform);
    } catch (err) {
      console.error("download stats increment failed:", err);
    }
    return serveLocalDeb();
  }

  if (platform === "windows" && match.url.includes("/api/download")) {
    try {
      await incrementDownload(platform);
    } catch (err) {
      console.error("download stats increment failed:", err);
    }
    return serveLocalWindowsExe();
  }

  if (platform === "macos" && match.url.includes("/api/download")) {
    try {
      await incrementDownload(platform);
    } catch (err) {
      console.error("download stats increment failed:", err);
    }
    return serveLocalMacosDmg();
  }

  const url = match.url || info?.fallbackUrl;
  if (!url) {
    return NextResponse.json({ error: "No download URL" }, { status: 404 });
  }

  try {
    await incrementDownload(platform);
  } catch (err) {
    console.error("download stats increment failed:", err);
  }

  return NextResponse.redirect(url, 302);
}
