import { fetchMetadata, scanPartialPlaylists } from "./api";
import { loadHistory, saveHistory } from "./history";
import {
  playlistDisplayTitle,
  resolveHistoryStatus,
  resolveTrackTitle,
} from "./playlistProgress";
import type { HistoryChild, HistoryEntry, PlaylistTrackItem } from "./types";

export interface ActiveDownloadSnapshot {
  url: string;
  title: string;
  thumbnailUrl?: string;
  isPlaylist: boolean;
  isMp3: boolean;
  playlistTitle?: string;
  playlistId?: string;
  entryCount?: number;
  requestedHeight?: number;
}

export function historyHasPlaylistId(
  entries: HistoryEntry[],
  playlistId: string
): boolean {
  const needle = playlistId.toLowerCase();
  return entries.some(
    (e) =>
      e.url.toLowerCase().includes(needle) ||
      e.title.toLowerCase().includes(`[${needle}]`)
  );
}

export function buildHistoryEntryFromDownload(params: {
  jobId: string;
  message: string;
  success: boolean;
  outputDir: string;
  outputFile?: string;
  active: ActiveDownloadSnapshot;
  tracks: PlaylistTrackItem[];
  playlistItems: Map<number, { title: string; filePath?: string }>;
  progressTitle?: string;
  progressOutputFile?: string;
  lastOutputFile?: string;
}): HistoryEntry {
  const {
    jobId,
    message,
    success,
    outputDir,
    outputFile,
    active,
    tracks,
    playlistItems,
    progressTitle,
    progressOutputFile,
    lastOutputFile,
  } = params;

  const completedCount = Math.max(
    tracks.filter((t) => t.status === "complete").length,
    tracks.filter((t) => t.filePath).length,
    [...playlistItems.values()].filter((item) => item.filePath).length
  );
  const totalCount =
    active.entryCount ??
    (tracks[0]?.itemIndex != null
      ? tracks.length
      : playlistItems.size || undefined);

  const status = resolveHistoryStatus(
    message,
    success,
    active.isPlaylist,
    completedCount,
    totalCount
  );

  const trackSource: PlaylistTrackItem[] =
    tracks.length > 0
      ? tracks
      : [...playlistItems.entries()]
          .sort(([a], [b]) => a - b)
          .map(([itemIndex, item]) => ({
            itemIndex,
            title: item.title,
            percent: item.filePath ? 100 : 0,
            status: item.filePath ? ("complete" as const) : ("pending" as const),
            filePath: item.filePath,
          }));

  const children: HistoryChild[] | undefined = active.isPlaylist
    ? trackSource.map((item) => ({
        id: `${jobId}-${item.itemIndex}`,
        itemIndex: item.itemIndex,
        title: resolveTrackTitle(item.title, item.filePath, item.itemIndex),
        filePath: item.filePath,
      }))
    : undefined;

  const displayTitle = active.isPlaylist
    ? playlistDisplayTitle(
        active.playlistTitle,
        active.title,
        active.playlistId
      )
    : resolveTrackTitle(
        progressTitle ?? active.title,
        outputFile ?? progressOutputFile ?? lastOutputFile
      );

  const filePath = active.isPlaylist
    ? undefined
    : outputFile ?? progressOutputFile ?? lastOutputFile;

  return {
    id: jobId,
    url: active.url,
    title: displayTitle,
    thumbnailUrl: active.thumbnailUrl,
    status,
    finishedAt: new Date().toISOString(),
    outputDir,
    isPlaylist: active.isPlaylist,
    isMp3: active.isMp3,
    requestedHeight: active.requestedHeight,
    filePath,
    itemCount: totalCount ?? children?.length,
    children: children?.length ? children : undefined,
  };
}

export async function reconcilePartialPlaylists(
  outputDir: string
): Promise<HistoryEntry[] | null> {
  if (!outputDir) return null;

  let scans;
  try {
    scans = await scanPartialPlaylists(outputDir);
  } catch {
    return null;
  }
  if (!scans.length) return null;

  let entries = loadHistory();
  let changed = false;

  for (const scan of scans) {
    if (historyHasPlaylistId(entries, scan.playlistId)) continue;

    let itemCount = scan.itemCount;
    let thumbnailUrl: string | undefined;
    try {
      const meta = await fetchMetadata(scan.url, true);
      itemCount = meta.entry_count ?? itemCount;
      thumbnailUrl = meta.thumbnail_url;
    } catch {
      // keep scan-derived counts
    }

    if (itemCount && scan.completedCount >= itemCount) {
      continue;
    }

    const children: HistoryChild[] = scan.children.map((c) => ({
      id: `scan-${scan.playlistId}-${c.itemIndex ?? 0}`,
      itemIndex: c.itemIndex ?? 0,
      title: c.title,
      filePath: c.path,
    }));

    const entry: HistoryEntry = {
      id: `orphan-${scan.playlistId}`,
      url: scan.url,
      title: playlistDisplayTitle(
        scan.playlistTitle,
        scan.playlistTitle,
        scan.playlistId
      ),
      thumbnailUrl,
      status: "incomplete",
      finishedAt: new Date().toISOString(),
      outputDir,
      isPlaylist: true,
      itemCount,
      children: children.length ? children : undefined,
    };

    entries = [entry, ...entries.filter((e) => e.id !== entry.id)];
    changed = true;
  }

  if (!changed) return null;
  return saveHistory(entries);
}
