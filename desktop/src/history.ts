import type { HistoryEntry } from "./types";
import {
  isPlaceholderPlaylistTitle,
  titleFromPlaylistFolderPath,
} from "./playlistProgress";

const HISTORY_KEY = "yutubu-download-history";
const MAX_ENTRIES = 50;

function isFragmentPath(path: string): boolean {
  return /\.f\d+(\.[a-z0-9]+)?$/i.test(path) || /\.f\d+\./i.test(path);
}

export function fileBasename(path?: string): string {
  if (!path) return "";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "";
}

const VIDEO_MEDIA_RE = /\.(mp4|webm|mkv|mov|avi|m4v)$/i;
const AUDIO_MEDIA_RE = /\.(mp3|m4a|opus|wav|aac|flac|ogg)$/i;

/** Pick HTML audio vs embedded mpv — file type wins over history flags. */
export function preferAudioPlayer(
  path: string,
  entryIsMp3?: boolean,
  probeIsAudio?: boolean
): boolean {
  if (VIDEO_MEDIA_RE.test(path)) return false;
  if (AUDIO_MEDIA_RE.test(path)) return true;
  return Boolean(entryIsMp3 || probeIsAudio);
}

export function entryDisplayTitle(
  entry: Pick<HistoryEntry, "title" | "filePath" | "children" | "isPlaylist">
): string {
  const fromFile = fileBasename(entry.filePath);
  if (fromFile) return fromFile;
  if (entry.isPlaylist) {
    const folderHint = entry.children?.find((c) => c.filePath)?.filePath;
    const fromFolder = titleFromPlaylistFolderPath(folderHint);
    if (fromFolder) return fromFolder;
    if (!isPlaceholderPlaylistTitle(entry.title)) return entry.title;
  }
  return entry.title;
}

export function entryMetaLabel(entry: Pick<HistoryEntry, "title" | "filePath">): string | undefined {
  const display = entryDisplayTitle(entry);
  const meta = entry.title?.trim();
  if (!meta || meta === display) return undefined;
  return meta;
}

function cleanTitle(title: string): string {
  const trimmed = title.trim();
  const match = trimmed.match(/^(.*)\.f\d+(\.[a-z0-9]+)?$/i);
  return match ? match[1].trim() : trimmed;
}

function sanitizeEntry(entry: HistoryEntry): HistoryEntry {
  const title = cleanTitle(entry.title);
  const filePath =
    entry.filePath && isFragmentPath(entry.filePath) ? undefined : entry.filePath;
  const children = entry.children?.map((c) => ({
    ...c,
    title: cleanTitle(c.title),
    filePath: c.filePath && isFragmentPath(c.filePath) ? undefined : c.filePath,
  }));
  return { ...entry, title, filePath, children };
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeEntry);
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const next = entries.slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function prependHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory().filter((e) => e.id !== entry.id)].slice(
    0,
    MAX_ENTRIES
  );
  saveHistory(next);
  return next;
}

export function updateHistoryEntry(
  id: string,
  patch: Partial<
    Pick<HistoryEntry, "title" | "thumbnailUrl" | "itemCount" | "children" | "playlistFolder">
  >
): HistoryEntry[] {
  const entries = loadHistory();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return entries;
  entries[idx] = sanitizeEntry({ ...entries[idx], ...patch });
  return saveHistory(entries);
}

export function clearHistory(): HistoryEntry[] {
  localStorage.removeItem(HISTORY_KEY);
  return [];
}

export function removeHistoryEntries(ids: string[]): HistoryEntry[] {
  if (!ids.length) return loadHistory();
  const drop = new Set(ids);
  const next = loadHistory().filter((entry) => !drop.has(entry.id));
  saveHistory(next);
  return next;
}
