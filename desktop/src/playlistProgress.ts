import type { MetadataInfo, PlaylistTrackItem } from "./types";

export function isYoutubeVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value.trim());
}

export function titleFromMediaPath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  const parts = filePath.replace(/\\/g, "/").split("/");
  const base = parts[parts.length - 1] || "";
  const stem = base.replace(/\.[^.]+$/, "");
  const title = stem.replace(/^\d{1,2}\s*-\s+/, "").trim();
  if (!title || isYoutubeVideoId(title)) return undefined;
  return title;
}

/** Prefer filename title over yt-dlp video-id prefixes. */
export function resolveTrackTitle(
  title?: string,
  filePath?: string,
  itemIndex?: number
): string {
  const fromFile = titleFromMediaPath(filePath);
  if (fromFile) return fromFile;
  const trimmed = title?.trim();
  if (trimmed && !isYoutubeVideoId(trimmed)) return trimmed;
  if (itemIndex != null) return `Video ${itemIndex}`;
  return trimmed && isYoutubeVideoId(trimmed) ? "Loading title…" : trimmed || "Unknown";
}

export function isPlaceholderPlaylistTitle(title?: string): boolean {
  if (!title?.trim()) return true;
  return /^Playlist \[[A-Za-z0-9_-]+\]$/i.test(title.trim());
}

/** Human title from `My Playlist [PLabc]/01 - …` folder segment. */
export function titleFromPlaylistFolderPath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.length < 2) return undefined;
  const folder = parts[parts.length - 2]?.trim();
  if (!folder) return undefined;
  const match = folder.match(/^(.+) \[([A-Za-z0-9_-]+)\]$/);
  if (!match) return undefined;
  const name = match[1].trim();
  if (!name || isPlaceholderPlaylistTitle(name)) return undefined;
  return name;
}

export function playlistDisplayTitle(
  playlistTitle?: string,
  fallbackTitle?: string,
  playlistId?: string,
  folderPathHint?: string
): string {
  const fromFolder = titleFromPlaylistFolderPath(folderPathHint);
  if (fromFolder) return fromFolder;

  const name = playlistTitle?.trim() || fallbackTitle?.trim();
  if (name && !isYoutubeVideoId(name) && !isPlaceholderPlaylistTitle(name)) {
    return name;
  }
  if (playlistId) return `Playlist [${playlistId}]`;
  return name || "Playlist";
}

export function resolveHistoryStatus(
  message: string,
  success: boolean,
  isPlaylist: boolean,
  completedCount: number,
  totalCount?: number
): "complete" | "cancelled" | "error" | "incomplete" {
  const lower = message.toLowerCase();
  const partial =
    isPlaylist &&
    completedCount > 0 &&
    (totalCount == null || completedCount < totalCount);

  if (lower.includes("cancelled")) {
    return partial ? "incomplete" : "cancelled";
  }
  if (!success) {
    if (partial || lower.includes("errors")) return "incomplete";
    return "error";
  }
  if (isPlaylist && totalCount != null && completedCount > 0 && completedCount < totalCount) {
    return "incomplete";
  }
  return "complete";
}

/** CLI default: `Title [PLAYLIST_ID]` — avoids mixing playlists with the same name. */
export function defaultPlaylistFolderLabel(metadata: MetadataInfo): string | null {
  const title = metadata.playlist_title ?? metadata.title;
  const id = metadata.playlist_id;
  if (!title || !id) return null;
  return `${title} [${id}]`;
}

export function playlistSavePath(
  outputDir: string,
  metadata: MetadataInfo
): string | null {
  const folder = defaultPlaylistFolderLabel(metadata);
  if (!folder) return null;
  return `${outputDir.replace(/\/$/, "")}/${folder}`;
}

export function playlistFolderPath(
  outputDir: string,
  outputFile?: string
): string | null {
  if (!outputFile || !outputDir) return null;
  const base = outputDir.replace(/\/$/, "");
  if (!outputFile.startsWith(base)) return null;
  const rest = outputFile.slice(base.length).replace(/^\//, "");
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return `${base}/${rest.slice(0, slash)}`;
}

export function playlistFolderLabelFromOutputPath(
  outputDir: string,
  outputFile?: string
): string | null {
  const folder = playlistFolderPath(outputDir, outputFile);
  if (!folder) return null;
  const parts = folder.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || null;
}

export function playlistTitleFromOutputPath(outputFile?: string): string | undefined {
  return titleFromPlaylistFolderPath(outputFile);
}

export function playlistIdFromEntry(entry: {
  url: string;
  title: string;
}): string | null {
  const fromUrl = entry.url.match(/[?&]list=(PL[A-Za-z0-9_-]+)/i);
  if (fromUrl) return fromUrl[1];
  const fromTitle = entry.title.match(/\[(PL[A-Za-z0-9_-]+)\]/i);
  return fromTitle?.[1] ?? null;
}

export function playlistFolderForEntry(entry: {
  outputDir: string;
  title: string;
  playlistFolder?: string;
  url?: string;
  children?: { filePath?: string }[];
}): string | null {
  if (entry.playlistFolder) {
    return entry.playlistFolder;
  }

  const childPath = entry.children?.find((c) => c.filePath)?.filePath;
  const fromChild = playlistFolderPath(entry.outputDir, childPath);
  if (fromChild) return fromChild;

  const titled = entry.title.trim();
  if (titled.includes(" [PL") && !isPlaceholderPlaylistTitle(titled)) {
    return `${entry.outputDir.replace(/\/$/, "")}/${titled}`;
  }
  return null;
}

export function mergePlaylistProgress(
  prev: PlaylistTrackItem[],
  itemIndex: number,
  totalItems: number | undefined,
  title: string | undefined,
  percent: number | undefined,
  filePath: string | undefined
): PlaylistTrackItem[] {
  const total = totalItems ?? prev.length;
  const byIndex = new Map(prev.map((item) => [item.itemIndex, item]));

  for (let i = 1; i < itemIndex; i += 1) {
    const existing = byIndex.get(i);
    byIndex.set(i, {
      itemIndex: i,
      title: existing?.title ?? `Video ${i}`,
      percent: 100,
      status: "complete",
      filePath: existing?.filePath,
    });
  }

  const existing = byIndex.get(itemIndex);
  const nextTitle = resolveTrackTitle(
    title || existing?.title,
    filePath ?? existing?.filePath,
    itemIndex
  );
  const nextPercent = percent ?? existing?.percent ?? 0;
  const nextStatus =
    nextPercent >= 100
      ? "complete"
      : nextPercent > 0 || title
        ? "downloading"
        : existing?.status ?? "downloading";

  byIndex.set(itemIndex, {
    itemIndex,
    title: nextTitle,
    percent: nextStatus === "complete" ? 100 : nextPercent,
    status: nextStatus,
    filePath: filePath ?? existing?.filePath,
  });

  if (total > 0) {
    for (let i = 1; i <= total; i += 1) {
      if (!byIndex.has(i)) {
        byIndex.set(i, {
          itemIndex: i,
          title: `Video ${i}`,
          percent: 0,
          status: "pending",
        });
      }
    }
  }

  return [...byIndex.values()].sort((a, b) => a.itemIndex - b.itemIndex);
}

export function buildPlaylistTracksFromTitles(
  titles: { itemIndex: number; title: string }[],
  total?: number
): PlaylistTrackItem[] {
  const count = total ?? titles.length;
  const byIndex = new Map(titles.map((t) => [t.itemIndex, t.title]));
  return Array.from({ length: count }, (_, i) => {
    const itemIndex = i + 1;
    return {
      itemIndex,
      title: byIndex.get(itemIndex) ?? `Video ${itemIndex}`,
      percent: 0,
      status: "pending" as const,
    };
  });
}

export function playlistOverallPercent(
  tracks: PlaylistTrackItem[],
  totalItems: number,
  currentPercent: number,
  currentIndex?: number
): number {
  if (totalItems <= 0) return currentPercent;
  const completed = tracks.filter((t) => t.status === "complete").length;
  const current =
    currentIndex != null && currentPercent > 0
      ? Math.min(currentPercent, 100) / 100
      : 0;
  const countedComplete = Math.max(completed, currentIndex != null ? currentIndex - 1 : 0);
  return Math.min(100, ((countedComplete + current) / totalItems) * 100);
}
