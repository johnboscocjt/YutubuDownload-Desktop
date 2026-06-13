import { APP, type Platform, PLATFORMS } from "./config";

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  download_count: number;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface ResolvedDownload {
  platform: Platform;
  label: string;
  url: string;
  filename: string | null;
  available: boolean;
  comingSoon: boolean;
  githubCount: number;
}

function matchAsset(assets: GitHubAsset[], hints: string[]): GitHubAsset | null {
  if (!hints.length) return null;
  const lower = (s: string) => s.toLowerCase();
  for (const hint of hints) {
    const found = assets.find((a) => lower(a.name).includes(lower(hint)));
    if (found) return found;
  }
  return null;
}

/** Prefer .deb over AppImage when both exist. */
function matchLinuxAsset(assets: GitHubAsset[]): GitHubAsset | null {
  const deb = assets.find((a) => a.name.toLowerCase().endsWith(".deb"));
  if (deb) return deb;
  return matchAsset(assets, [".deb", "linux", "appimage"]);
}

/** Prefer NSIS setup .exe when multiple Windows assets exist. */
function matchWindowsAsset(assets: GitHubAsset[]): GitHubAsset | null {
  const setup = assets.find((a) => {
    const n = a.name.toLowerCase();
    return n.endsWith(".exe") && (n.includes("setup") || n.includes("nsis") || n.includes("x64"));
  });
  if (setup) return setup;
  return assets.find((a) => a.name.toLowerCase().endsWith(".exe")) ?? null;
}

/** Prefer universal .dmg, then any macOS .dmg. */
function matchMacosAsset(assets: GitHubAsset[]): GitHubAsset | null {
  const universal = assets.find((a) => {
    const n = a.name.toLowerCase();
    return n.endsWith(".dmg") && n.includes("universal");
  });
  if (universal) return universal;
  return assets.find((a) => a.name.toLowerCase().endsWith(".dmg")) ?? null;
}

export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const res = await fetch(
    `https://api.github.com/repos/${APP.repo}/releases/latest`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 120 },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAllReleases(): Promise<GitHubRelease[]> {
  const res = await fetch(
    `https://api.github.com/repos/${APP.repo}/releases?per_page=100`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 120 },
    }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function resolveDownloads(): Promise<ResolvedDownload[]> {
  const release = await fetchLatestRelease();
  const assets = release?.assets ?? [];

  return PLATFORMS.map((p) => {
    if (p.id === "terminal") {
      return {
        platform: p.id,
        label: p.label,
        url: p.fallbackUrl,
        filename: "install.sh",
        available: true,
        comingSoon: false,
        githubCount: 0,
      };
    }

    if (p.comingSoon) {
      return {
        platform: p.id,
        label: p.label,
        url: "",
        filename: null,
        available: false,
        comingSoon: true,
        githubCount: 0,
      };
    }

    const asset =
      p.id === "linux"
        ? matchLinuxAsset(assets)
        : p.id === "windows"
          ? matchWindowsAsset(assets)
          : p.id === "macos"
            ? matchMacosAsset(assets)
            : matchAsset(assets, p.assetHints);

    // Site-hosted .deb when GitHub Release is not published yet
    if (p.id === "linux" && !asset) {
      return {
        platform: p.id,
        label: p.label,
        url: `/api/download?platform=linux`,
        filename: APP.linuxDeb.filename,
        available: true,
        comingSoon: false,
        githubCount: 0,
      };
    }

    // Site-hosted Windows installer when GitHub Release has no .exe yet
    if (p.id === "windows" && !asset) {
      return {
        platform: p.id,
        label: p.label,
        url: `/api/download?platform=windows`,
        filename: APP.windowsInstaller.filename,
        available: true,
        comingSoon: false,
        githubCount: 0,
      };
    }

    // Site-hosted macOS .dmg when GitHub Release has no .dmg yet
    if (p.id === "macos" && !asset) {
      return {
        platform: p.id,
        label: p.label,
        url: `/api/download?platform=macos`,
        filename: APP.macosDmg.filename,
        available: true,
        comingSoon: false,
        githubCount: 0,
      };
    }

    return {
      platform: p.id,
      label: p.label,
      url: asset?.browser_download_url ?? p.fallbackUrl,
      filename: asset?.name ?? null,
      available: !!asset,
      comingSoon: false,
      githubCount: asset?.download_count ?? 0,
    };
  });
}

export function githubAssetTotal(assets: GitHubAsset[]): number {
  return assets.reduce((sum, a) => sum + (a.download_count ?? 0), 0);
}

export function githubAllReleasesTotal(releases: GitHubRelease[]): number {
  return releases.reduce((sum, r) => sum + githubAssetTotal(r.assets ?? []), 0);
}
