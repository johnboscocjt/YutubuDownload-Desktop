import type { HistoryEntry } from "./types";

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

export function entryDisplayTitle(entry: Pick<HistoryEntry, "title" | "filePath">): string {
  const fromFile = fileBasename(entry.filePath);
  return fromFile || entry.title;
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

export function clearHistory(): HistoryEntry[] {
  localStorage.removeItem(HISTORY_KEY);
  return [];
}
