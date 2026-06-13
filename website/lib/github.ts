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
        githubCount: 0,
      };
    }

    const asset = matchAsset(assets, p.assetHints);
    return {
      platform: p.id,
      label: p.label,
      url: asset?.browser_download_url ?? p.fallbackUrl,
      filename: asset?.name ?? null,
      available: !!asset,
      githubCount: asset?.download_count ?? 0,
    };
  });
}

export function githubAssetTotal(assets: GitHubAsset[]): number {
  return assets.reduce((sum, a) => sum + (a.download_count ?? 0), 0);
}
