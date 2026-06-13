import { kv } from "@vercel/kv";
import { statsBaseline, type Platform } from "./config";
import { githubAssetTotal, fetchLatestRelease } from "./github";

const TOTAL_KEY = "stats:downloads:total";
const PLATFORM_PREFIX = "stats:downloads:platform:";

function kvReady(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

export interface DownloadStats {
  total: number;
  siteTracked: number;
  githubRelease: number;
  byPlatform: Record<Platform, number>;
  updatedAt: string;
  live: boolean;
}

async function readPlatformCounts(): Promise<Record<Platform, number>> {
  const platforms: Platform[] = ["linux", "windows", "macos", "terminal"];
  const out = {} as Record<Platform, number>;
  if (!kvReady()) {
    for (const p of platforms) out[p] = 0;
    return out;
  }
  await Promise.all(
    platforms.map(async (p) => {
      const v = await kv.get<number>(`${PLATFORM_PREFIX}${p}`);
      out[p] = v ?? 0;
    })
  );
  return out;
}

export async function getDownloadStats(): Promise<DownloadStats> {
  const baseline = statsBaseline();
  const release = await fetchLatestRelease();
  const githubRelease = githubAssetTotal(release?.assets ?? []);

  let siteTotal = 0;
  let byPlatform: Record<Platform, number>;

  if (kvReady()) {
    siteTotal = (await kv.get<number>(TOTAL_KEY)) ?? 0;
    byPlatform = await readPlatformCounts();
  } else {
    byPlatform = { linux: 0, windows: 0, macos: 0, terminal: 0 };
  }

  const siteTracked = siteTotal;
  const total = baseline + siteTracked + githubRelease;

  return {
    total,
    siteTracked,
    githubRelease,
    byPlatform,
    updatedAt: new Date().toISOString(),
    live: kvReady(),
  };
}

export async function incrementDownload(platform: Platform): Promise<number> {
  if (!kvReady()) return statsBaseline();
  const total = await kv.incr(TOTAL_KEY);
  await kv.incr(`${PLATFORM_PREFIX}${platform}`);
  return total;
}
