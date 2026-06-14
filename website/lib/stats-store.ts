import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { Platform } from "./config";

const PLATFORMS: Platform[] = ["linux", "windows", "macos", "terminal"];
const STATS_BLOB_PATH = "stats/download-stats.json";

export interface LocalStats {
  total: number;
  /** Redirects to GitHub release assets via /api/download */
  githubTracked: number;
  byPlatform: Record<Platform, number>;
  updatedAt: string;
}

export function emptyStats(): LocalStats {
  return {
    total: 0,
    githubTracked: 0,
    byPlatform: { linux: 0, windows: 0, macos: 0, terminal: 0 },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStats(parsed: Partial<LocalStats> | null | undefined): LocalStats {
  const byPlatform = { ...emptyStats().byPlatform };
  for (const p of PLATFORMS) {
    byPlatform[p] = Number(parsed?.byPlatform?.[p]) || 0;
  }
  return {
    total: Number(parsed?.total) || 0,
    githubTracked: Number(parsed?.githubTracked) || 0,
    byPlatform,
    updatedAt: parsed?.updatedAt ?? new Date().toISOString(),
  };
}

function storePath(): string {
  return path.join(process.cwd(), ".data", "download-stats.json");
}

function blobReady(): boolean {
  // Prefer explicit read-write token; BLOB_STORE_ID alone needs a linked store + OIDC.
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(
    process.env.BLOB_STORE_ID &&
      (process.env.VERCEL === "1" && process.env.VERCEL_OIDC_TOKEN)
  );
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

async function readBlobStats(): Promise<LocalStats> {
  const { get, head } = await import("@vercel/blob");
  try {
    await head(STATS_BLOB_PATH);
  } catch {
    return emptyStats();
  }

  try {
    const result = await get(STATS_BLOB_PATH, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return emptyStats();
    const text = await new Response(result.stream).text();
    return normalizeStats(JSON.parse(text) as Partial<LocalStats>);
  } catch {
    return emptyStats();
  }
}

async function writeBlobStats(stats: LocalStats): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(STATS_BLOB_PATH, JSON.stringify(stats, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function readLocalStats(): Promise<LocalStats> {
  if (blobReady()) {
    return readBlobStats();
  }

  try {
    const raw = await readFile(storePath(), "utf8");
    return normalizeStats(JSON.parse(raw) as Partial<LocalStats>);
  } catch {
    return emptyStats();
  }
}

export async function incrementLocalStats(platform: Platform): Promise<LocalStats> {
  const current = await readLocalStats();
  current.total += 1;
  current.byPlatform[platform] += 1;
  current.updatedAt = new Date().toISOString();

  if (blobReady()) {
    await writeBlobStats(current);
    return current;
  }

  if (isVercelRuntime()) {
    throw new Error(
      "Download stats storage is not configured on Vercel (set BLOB_STORE_ID or Redis env vars)."
    );
  }

  const dir = path.dirname(storePath());
  await mkdir(dir, { recursive: true });
  const tmp = `${storePath()}.tmp`;
  await writeFile(tmp, JSON.stringify(current, null, 2), "utf8");
  await rename(tmp, storePath());

  return current;
}

export async function incrementGithubTracked(): Promise<LocalStats> {
  const current = await readLocalStats();
  current.githubTracked += 1;
  current.updatedAt = new Date().toISOString();

  if (blobReady()) {
    await writeBlobStats(current);
    return current;
  }

  if (isVercelRuntime()) {
    throw new Error(
      "Download stats storage is not configured on Vercel (set BLOB_STORE_ID or Redis env vars)."
    );
  }

  const dir = path.dirname(storePath());
  await mkdir(dir, { recursive: true });
  const tmp = `${storePath()}.tmp`;
  await writeFile(tmp, JSON.stringify(current, null, 2), "utf8");
  await rename(tmp, storePath());

  return current;
}

export function resolveStorageBackend():
  | "kv"
  | "blob"
  | "local"
  | "none" {
  if (
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  ) {
    return "kv";
  }
  if (blobReady()) return "blob";
  if (!isVercelRuntime()) return "local";
  return "none";
}
