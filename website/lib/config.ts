export const APP = {
  name: "YutubuDownload",
  tagline: "Tanzania-optimized YouTube downloader",
  version: "2.0.1",
  releaseTag: "v2.0.1",
  /** Desktop .deb / release assets */
  repo: "johnboscocjt/YutubuDownload-Desktop",
  /** Terminal install.sh lives here */
  terminalRepo: "johnboscocjt/Youtube-Downloader-For-UbuntuTerminal",
  author: "Johnbosco",
  license: "MIT",
  /** Site-hosted Linux installer (used when GitHub Release has no .deb yet) */
  linuxDeb: {
    filename: "YutubuDownload_2.0.1_amd64.deb",
    publicPath: "/downloads/YutubuDownload_2.0.1_amd64.deb",
    /** Debian package name (for apt remove) */
    packageName: "yutubu-download",
    /** Application menu name after install */
    appMenuName: "YutubuDownload",
  },
  /** Site-hosted Windows NSIS installer */
  windowsInstaller: {
    filename: "YutubuDownload_2.0.1_x64-setup.exe",
    publicPath: "/downloads/YutubuDownload_2.0.1_x64-setup.exe",
  },
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
  comingSoon?: boolean;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: "linux",
    label: "Linux",
    icon: "🐧",
    description: ".deb package for Ubuntu, Debian, and most distros.",
    formats: [".deb"],
    assetHints: [".deb", "amd64.deb", "linux"],
    fallbackUrl: `https://github.com/${APP.repo}/releases/latest`,
  },
  {
    id: "windows",
    label: "Windows",
    icon: "🪟",
    description: "Desktop installer for Windows 10/11 (64-bit).",
    formats: [".exe"],
    assetHints: ["windows", "win", ".exe", ".msi", "nsis", "setup"],
    fallbackUrl: `https://github.com/${APP.repo}/releases/latest`,
  },
  {
    id: "macos",
    label: "macOS",
    icon: "🍎",
    description: "Universal .dmg for Apple Silicon and Intel — in development.",
    formats: [".dmg"],
    assetHints: ["macos", "darwin", ".dmg", "apple"],
    fallbackUrl: "",
    comingSoon: true,
  },
  {
    id: "terminal",
    label: "Terminal (Linux)",
    icon: "⌨️",
    description: "Classic `ytd` command for Ubuntu terminal — one-line install.",
    formats: ["install.sh"],
    assetHints: [],
    fallbackUrl: `https://raw.githubusercontent.com/${APP.terminalRepo}/main/install.sh`,
    installCommand: `sudo bash -c "$(curl -sL https://raw.githubusercontent.com/${APP.terminalRepo}/main/install.sh)"`,
  },
];

export const FEATURES = [
  {
    id: "probe" as const,
    title: "Probe-verified quality",
    body: "Your chosen resolution is confirmed with yt-dlp --simulate before download starts — no silent downgrades.",
  },
  {
    id: "desktop" as const,
    title: "Desktop + terminal",
    body: "Modern desktop app with docs, history, and pause — or the battle-tested `ytd` terminal workflow.",
  },
  {
    id: "signal" as const,
    title: "Tanzania-tuned reliability",
    body: "Low-network mode, cookie sharing, resume, and retries built for real-world mobile and shared Wi‑Fi.",
  },
  {
    id: "playlist" as const,
    title: "Video, playlist & MP3",
    body: "Single videos, full playlists with numbered folders, and high-quality MP3 extraction.",
  },
  {
    id: "layers" as const,
    title: "Multi-instance safe",
    body: "Run multiple downloads in parallel with shared cookies and session-isolated temp folders.",
  },
  {
    id: "opensource" as const,
    title: "Open source",
    body: "MIT licensed. Rust core, Tauri desktop, and transparent docs you can read in-app.",
  },
];

export const STEPS = [
  { n: "1", title: "Pick your platform", body: "Download the desktop app or install the terminal script." },
  { n: "2", title: "Paste a URL", body: "YouTube video or playlist — preview quality and thumbnail first." },
  { n: "3", title: "Download", body: "Probe-verified quality, progress tracking, pause/resume on Linux." },
];

