export const APP = {
  name: "YutubuDownload",
  tagline: "Tanzania-optimized YouTube downloader",
  version: "2.0.1",
  releaseTag: "v2.0.1",
  repo: "johnboscocjt/Youtube-Downloader-For-UbuntuTerminal",
  author: "Johnbosco",
  license: "MIT",
} as const;

export type Platform = "linux" | "windows" | "macos" | "terminal";

export interface PlatformInfo {
  id: Platform;
  label: string;
  icon: string;
  description: string;
  formats: string[];
  assetHints: string[];
  fallbackUrl: string;
  installCommand?: string;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: "linux",
    label: "Linux",
    icon: "🐧",
    description: "AppImage or .deb for Ubuntu, Debian, and most distros.",
    formats: [".AppImage", ".deb"],
    assetHints: ["appimage", "AppImage", ".deb", "linux"],
    fallbackUrl: `https://github.com/${APP.repo}/releases/latest`,
  },
  {
    id: "windows",
    label: "Windows",
    icon: "🪟",
    description: "Portable .exe or NSIS installer for Windows 10/11.",
    formats: [".exe", ".msi"],
    assetHints: ["windows", "win", ".exe", ".msi", "nsis"],
    fallbackUrl: `https://github.com/${APP.repo}/releases/latest`,
  },
  {
    id: "macos",
    label: "macOS",
    icon: "🍎",
    description: "Universal .dmg for Apple Silicon and Intel Macs.",
    formats: [".dmg"],
    assetHints: ["macos", "darwin", ".dmg", "apple"],
    fallbackUrl: `https://github.com/${APP.repo}/releases/latest`,
  },
  {
    id: "terminal",
    label: "Terminal (Linux)",
    icon: "⌨️",
    description: "Classic `ytd` command for Ubuntu terminal — one-line install.",
    formats: ["install.sh"],
    assetHints: [],
    fallbackUrl: `https://raw.githubusercontent.com/${APP.repo}/main/install.sh`,
    installCommand: `sudo bash -c "$(curl -sL https://raw.githubusercontent.com/${APP.repo}/main/install.sh)"`,
  },
];

export const FEATURES = [
  {
    title: "Probe-verified quality",
    body: "Your chosen resolution is confirmed with yt-dlp --simulate before download starts — no silent downgrades.",
  },
  {
    title: "Desktop + terminal",
    body: "Modern desktop app with docs, history, and pause — or the battle-tested `ytd` terminal workflow.",
  },
  {
    title: "Tanzania-tuned reliability",
    body: "Low-network mode, cookie sharing, resume, and retries built for real-world mobile and shared Wi‑Fi.",
  },
  {
    title: "Video, playlist & MP3",
    body: "Single videos, full playlists with numbered folders, and high-quality MP3 extraction.",
  },
  {
    title: "Multi-instance safe",
    body: "Run multiple downloads in parallel with shared cookies and session-isolated temp folders.",
  },
  {
    title: "Open source",
    body: "MIT licensed. Rust core, Tauri desktop, and transparent docs you can read in-app.",
  },
];

export const STEPS = [
  { n: "1", title: "Pick your platform", body: "Download the desktop app or install the terminal script." },
  { n: "2", title: "Paste a URL", body: "YouTube video or playlist — preview quality and thumbnail first." },
  { n: "3", title: "Download", body: "Probe-verified quality, progress tracking, pause/resume on Linux." },
];

export function statsBaseline(): number {
  const raw = process.env.NEXT_PUBLIC_STATS_BASELINE ?? "1284";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 1284;
}
