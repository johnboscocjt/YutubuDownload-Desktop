import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { Platform } from "./config";

const PLATFORMS: Platform[] = ["linux", "windows", "macos", "terminal"];

export interface LocalStats {
  total: number;
  byPlatform: Record<Platform, number>;
  updatedAt: string;
}

function storePath(): string {
  return path.join(process.cwd(), ".data", "download-stats.json");
}

function emptyStats(): LocalStats {
  return {
    total: 0,
    byPlatform: { linux: 0, windows: 0, macos: 0, terminal: 0 },
    updatedAt: new Date().toISOString(),
  };
}

export async function readLocalStats(): Promise<LocalStats> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalStats>;
    const byPlatform = { ...emptyStats().byPlatform };
    for (const p of PLATFORMS) {
      byPlatform[p] = Number(parsed.byPlatform?.[p]) || 0;
    }
    return {
      total: Number(parsed.total) || 0,
      byPlatform,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyStats();
  }
}

export async function incrementLocalStats(platform: Platform): Promise<LocalStats> {
  const dir = path.dirname(storePath());
  await mkdir(dir, { recursive: true });

  const current = await readLocalStats();
  current.total += 1;
  current.byPlatform[platform] += 1;
  current.updatedAt = new Date().toISOString();

  const tmp = `${storePath()}.tmp`;
  await writeFile(tmp, JSON.stringify(current, null, 2), "utf8");
  await rename(tmp, storePath());

  return current;
}
