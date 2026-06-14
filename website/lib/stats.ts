import { kv } from "@vercel/kv";
import { type Platform } from "./config";
import {
  incrementLocalStats,
  readLocalStats,
  resolveStorageBackend,
} from "./stats-store";

const TOTAL_KEY = "stats:downloads:total";
const PLATFORM_PREFIX = "stats:downloads:platform:";

function kvReady(): boolean {
  return resolveStorageBackend() === "kv";
}

export interface DownloadStats {
  total: number;
  siteTracked: number;
  byPlatform: Record<Platform, number>;
  updatedAt: string;
  live: boolean;
  storage: "kv" | "blob" | "local" | "none";
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
  const storage = resolveStorageBackend();

  let siteTotal = 0;
  let byPlatform: Record<Platform, number>;
  let updatedAt = new Date().toISOString();

  if (kvReady()) {
    siteTotal = (await kv.get<number>(TOTAL_KEY)) ?? 0;
    byPlatform = await readPlatformCountsFromKv();
  } else if (storage === "blob" || storage === "local") {
    const local = await readLocalStats();
    siteTotal = local.total;
    byPlatform = local.byPlatform;
    updatedAt = local.updatedAt;
  } else {
    byPlatform = { linux: 0, windows: 0, macos: 0, terminal: 0 };
  }

  const siteTracked = siteTotal;

  return {
    total: siteTracked,
    siteTracked,
    byPlatform,
    updatedAt,
    live: storage !== "none",
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
