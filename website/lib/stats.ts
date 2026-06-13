import { kv } from "@vercel/kv";
import { type Platform } from "./config";
import { githubAllReleasesTotal, fetchAllReleases } from "./github";
import { incrementLocalStats, readLocalStats } from "./stats-store";

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
  /** Where site clicks are stored: kv, local file, or none */
  storage: "kv" | "local" | "none";
}

async function readPlatformCountsFromKv(): Promise<Record<Platform, number>> {
  const platforms: Platform[] = ["linux", "windows", "macos", "terminal"];
  const out = {} as Record<Platform, number>;
  await Promise.all(
    platforms.map(async (p) => {
      const v = await kv.get<number>(`${PLATFORM_PREFIX}${p}`);
      out[p] = v ?? 0;
    })
  );
  return out;
}

export async function getDownloadStats(): Promise<DownloadStats> {
  const releases = await fetchAllReleases();
  const githubRelease = githubAllReleasesTotal(releases);

  let siteTotal = 0;
  let byPlatform: Record<Platform, number>;
  let storage: DownloadStats["storage"] = "none";
  let updatedAt = new Date().toISOString();

  if (kvReady()) {
    siteTotal = (await kv.get<number>(TOTAL_KEY)) ?? 0;
    byPlatform = await readPlatformCountsFromKv();
    storage = "kv";
  } else {
    const local = await readLocalStats();
    siteTotal = local.total;
    byPlatform = local.byPlatform;
    storage = "local";
    updatedAt = local.updatedAt;
  }

  const siteTracked = siteTotal;
  const total = siteTracked + githubRelease;

  return {
    total,
    siteTracked,
    githubRelease,
    byPlatform,
    updatedAt,
    live: kvReady() || storage === "local",
    storage,
  };
}

export async function incrementDownload(platform: Platform): Promise<number> {
  if (kvReady()) {
    const total = await kv.incr(TOTAL_KEY);
    await kv.incr(`${PLATFORM_PREFIX}${platform}`);
    return total;
  }

  const local = await incrementLocalStats(platform);
  return local.total;
}
