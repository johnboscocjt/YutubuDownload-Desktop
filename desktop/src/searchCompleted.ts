import type { HistoryEntry } from "./types";
import { entryDisplayTitle } from "./history";

export type CompletedLibraryFilter = "all" | "playlist" | "single" | "audio";

export function isPlaylistEntry(entry: HistoryEntry): boolean {
  return Boolean(entry.isPlaylist || (entry.children && entry.children.length > 0));
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[|]/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function basename(path?: string): string {
  if (!path) return "";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "";
}

export function parseSearchTokens(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    const token = normalizeSearchText(match[1] ?? match[2]);
    if (token) tokens.push(token);
  }
  return tokens;
}

function entrySearchHaystack(entry: HistoryEntry): string {
  const parts: string[] = [
    entryDisplayTitle(entry),
    entry.title,
    entry.url,
    entry.filePath ?? "",
    entry.outputDir,
    basename(entry.filePath),
    basename(entry.outputDir),
  ];

  for (const child of entry.children ?? []) {
    parts.push(child.title, child.filePath ?? "", basename(child.filePath));
  }

  return parts.map(normalizeSearchText).filter(Boolean).join(" ");
}

function matchesLibraryFilter(entry: HistoryEntry, filter: CompletedLibraryFilter): boolean {
  switch (filter) {
    case "playlist":
      return isPlaylistEntry(entry);
    case "single":
      return !isPlaylistEntry(entry);
    case "audio":
      return Boolean(entry.isMp3);
    default:
      return true;
  }
}

function scoreEntry(entry: HistoryEntry, tokens: string[]): number {
  if (!tokens.length) return 1;

  const haystack = entrySearchHaystack(entry);
  if (!haystack) return 0;

  for (const token of tokens) {
    if (!haystack.includes(token)) return 0;
  }

  const title = normalizeSearchText(entryDisplayTitle(entry));
  const phrase = tokens.join(" ");
  let score = 10;

  if (title === phrase) score += 200;
  else if (title.startsWith(phrase)) score += 120;
  else if (title.includes(phrase)) score += 80;

  for (const token of tokens) {
    if (title.includes(token)) score += 30;
    if (entry.children?.some((c) => normalizeSearchText(c.title).includes(token))) {
      score += 22;
    }
    if (entry.filePath && normalizeSearchText(basename(entry.filePath)).includes(token)) {
      score += 16;
    }
    if (entry.outputDir && normalizeSearchText(basename(entry.outputDir)).includes(token)) {
      score += 10;
    }
    if (normalizeSearchText(entry.url).includes(token)) score += 6;
  }

  return score;
}

export type HistoryStatusFilter = "all" | "complete" | "cancelled" | "error";

function matchesStatusFilter(entry: HistoryEntry, filter: HistoryStatusFilter): boolean {
  if (filter === "all") return true;
  return entry.status === filter;
}

function scoreHistoryEntry(entry: HistoryEntry, tokens: string[]): number {
  if (!tokens.length) return 1;

  const haystack = [
    entrySearchHaystack(entry),
    normalizeSearchText(entry.status),
  ].join(" ");

  if (!haystack) return 0;

  for (const token of tokens) {
    if (!haystack.includes(token)) return 0;
  }

  return scoreEntry(entry, tokens);
}

export function searchHistoryEntries(
  entries: HistoryEntry[],
  query: string,
  statusFilter: HistoryStatusFilter = "all"
): HistoryEntry[] {
  const filtered = entries.filter((entry) => matchesStatusFilter(entry, statusFilter));
  const tokens = parseSearchTokens(query);

  if (!tokens.length) {
    return [...filtered].sort(
      (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
    );
  }

  return filtered
    .map((entry) => ({ entry, score: scoreHistoryEntry(entry, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.entry.finishedAt).getTime() - new Date(a.entry.finishedAt).getTime();
    })
    .map(({ entry }) => entry);
}

export function searchCompletedDownloads(
  entries: HistoryEntry[],
  query: string,
  filter: CompletedLibraryFilter = "all"
): HistoryEntry[] {
  const filtered = entries.filter((entry) => matchesLibraryFilter(entry, filter));
  const tokens = parseSearchTokens(query);

  if (!tokens.length) {
    return [...filtered].sort(
      (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
    );
  }

  return filtered
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.entry.finishedAt).getTime() - new Date(a.entry.finishedAt).getTime();
    })
    .map(({ entry }) => entry);
}

export type HighlightSegment = { text: string; highlight: boolean };

export function getHighlightSegments(text: string, query: string): HighlightSegment[] {
  const tokens = parseSearchTokens(query);
  if (!tokens.length || !text) return [{ text, highlight: false }];

  const ranges: Array<[number, number]> = [];
  const lower = text.toLowerCase();

  for (const token of tokens) {
    const needle = token.toLowerCase();
    let start = 0;
    while (start < lower.length) {
      const idx = lower.indexOf(needle, start);
      if (idx < 0) break;
      ranges.push([idx, idx + needle.length]);
      start = idx + needle.length;
    }
  }

  if (!ranges.length) return [{ text, highlight: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) segments.push({ text: text.slice(cursor, start), highlight: false });
    segments.push({ text: text.slice(start, end), highlight: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false });
  return segments.length ? segments : [{ text, highlight: false }];
}
