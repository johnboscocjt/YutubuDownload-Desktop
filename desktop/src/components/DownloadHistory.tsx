import { useEffect, useMemo, useState } from "react";
import { entryDisplayTitle, entryMetaLabel } from "../history";
import {
  getHighlightSegments,
  searchHistoryEntries,
  type HistoryStatusFilter,
} from "../searchCompleted";
import type { HistoryEntry } from "../types";

interface Props {
  entries: HistoryEntry[];
  onClear: () => void;
  onRemoveSelected: (ids: string[]) => void;
  onResume: (entry: HistoryEntry) => void;
  onRedownload: (entry: HistoryEntry) => void;
  onOpenFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onOpenLocation: (path: string) => void;
  onOpenPlaylist: (entry: HistoryEntry) => Promise<void>;
}

function canResumeFromHistory(entry: HistoryEntry): boolean {
  if (entry.status === "incomplete") return true;
  if (entry.status === "cancelled" || entry.status === "error") {
    return Boolean(
      entry.filePath || entry.children?.some((child) => child.filePath)
    );
  }
  return false;
}

function canRedownloadFromHistory(entry: HistoryEntry): boolean {
  return (
    entry.status === "incomplete" ||
    entry.status === "cancelled" ||
    entry.status === "error"
  );
}

function statusLabel(status: HistoryEntry["status"]): string {
  if (status === "incomplete") return "uncompleted";
  return status;
}

function isPlaylistEntry(entry: HistoryEntry): boolean {
  return Boolean(entry.isPlaylist || (entry.children && entry.children.length > 0));
}

function canOpenPlaylistExternally(entry: HistoryEntry): boolean {
  return (
    isPlaylistEntry(entry) &&
    (entry.status === "complete" || entry.status === "incomplete")
  );
}

function HistoryRow({
  entry,
  selected,
  searchQuery,
  onToggleSelected,
  onResume,
  onRedownload,
  onOpenFolder,
  onOpenFile,
  onOpenLocation,
  onOpenPlaylist,
}: {
  entry: HistoryEntry;
  selected: boolean;
  searchQuery: string;
  onToggleSelected: (id: string, checked: boolean) => void;
  onResume: (entry: HistoryEntry) => void;
  onRedownload: (entry: HistoryEntry) => void;
  onOpenFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onOpenLocation: (path: string) => void;
  onOpenPlaylist: (entry: HistoryEntry) => Promise<void>;
}) {
  const playlist = isPlaylistEntry(entry);
  const hasChildren = (entry.children?.length ?? 0) > 0;
  const [expanded, setExpanded] = useState(false);
  const [openingPlaylist, setOpeningPlaylist] = useState(false);
  const [playlistOpenError, setPlaylistOpenError] = useState("");
  const itemLabel = entry.itemCount ?? entry.children?.length ?? 0;
  const displayTitle = entryDisplayTitle(entry);
  const metaLabel = entryMetaLabel(entry);

  return (
    <li className={`history-item${selected ? " history-item--selected" : ""}`}>
      <div className="history-item-main">
        <label className="history-select" title="Select for removal">
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${displayTitle}`}
            onChange={(e) => onToggleSelected(entry.id, e.target.checked)}
          />
        </label>

        {playlist && hasChildren && (
          <button
            type="button"
            className="history-expand"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse playlist" : "Expand playlist"}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}

        <div
          className={`history-thumb ${playlist && hasChildren ? "history-thumb-click" : ""}`}
          onClick={playlist && hasChildren ? () => setExpanded((v) => !v) : undefined}
          onKeyDown={
            playlist && hasChildren
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded((v) => !v);
                  }
                }
              : undefined
          }
          role={playlist && hasChildren ? "button" : undefined}
          tabIndex={playlist && hasChildren ? 0 : undefined}
        >
          {entry.thumbnailUrl ? (
            <img src={entry.thumbnailUrl} alt="" loading="lazy" />
          ) : (
            <span className="history-thumb-fallback">{playlist ? "📋" : "▶"}</span>
          )}
        </div>

        <div
          className={`history-body ${playlist && hasChildren ? "history-body-click" : ""}`}
          onClick={playlist && hasChildren ? () => setExpanded((v) => !v) : undefined}
          onKeyDown={
            playlist && hasChildren
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded((v) => !v);
                  }
                }
              : undefined
          }
          role={playlist && hasChildren ? "button" : undefined}
          tabIndex={playlist && hasChildren ? 0 : undefined}
        >
          <strong>
            {getHighlightSegments(displayTitle, searchQuery).map((part, i) =>
              part.highlight ? (
                <mark key={i} className="search-hit">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </strong>
          {metaLabel && (
            <span className="hint">
              {getHighlightSegments(metaLabel, searchQuery).map((part, i) =>
                part.highlight ? (
                  <mark key={i} className="search-hit">
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </span>
          )}
          <div className="history-meta-row">
            {playlist && (
              <span className="history-type-pill">Playlist · {itemLabel} items</span>
            )}
            <span className={`history-status history-status-${entry.status}`}>
              {statusLabel(entry.status)}
            </span>
          </div>
          <span className="history-date">{new Date(entry.finishedAt).toLocaleString()}</span>
          {entry.filePath ? (
            <span className="file-path" title={entry.filePath}>
              {entry.filePath}
            </span>
          ) : (
            <span className="file-path" title={entry.outputDir}>
              {entry.outputDir}
            </span>
          )}
        </div>

        <div className="history-actions">
          {canResumeFromHistory(entry) && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onResume(entry)}
            >
              Resume
            </button>
          )}
          {canRedownloadFromHistory(entry) && (
            <button
              type="button"
              className="btn btn-warn btn-sm"
              onClick={() => onRedownload(entry)}
            >
              Redownload
            </button>
          )}
          {entry.filePath ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenFile(entry.filePath!)}
                title={entry.filePath}
              >
                Open file
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onOpenLocation(entry.filePath!)}
                title={entry.filePath}
              >
                Open location
              </button>
            </>
          ) : (
            <>
              {canOpenPlaylistExternally(entry) && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={openingPlaylist}
                  title="Open all tracks in VLC, mpv, or your default media player"
                  onClick={() => {
                    setPlaylistOpenError("");
                    setOpeningPlaylist(true);
                    void onOpenPlaylist(entry)
                      .catch((e) => setPlaylistOpenError(String(e)))
                      .finally(() => setOpeningPlaylist(false));
                  }}
                >
                  {openingPlaylist ? "Opening…" : "Open playlist"}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenFolder(entry.outputDir)}
                title={entry.outputDir}
              >
                Destination
              </button>
            </>
          )}
        </div>
        {playlistOpenError ? (
          <p className="hint history-playlist-open-error">{playlistOpenError}</p>
        ) : null}
      </div>

      {playlist && hasChildren && expanded && (
        <ul className="history-children">
          {entry.children!.map((child) => (
            <li key={child.id} className="history-child">
              <span className="history-child-index">
                {String(child.itemIndex).padStart(2, "0")}
              </span>
              <span className="history-child-title">
                {getHighlightSegments(child.title, searchQuery).map((part, i) =>
                  part.highlight ? (
                    <mark key={i} className="search-hit">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  )
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DownloadHistory({
  entries,
  onClear,
  onRemoveSelected,
  onResume,
  onRedownload,
  onOpenFolder,
  onOpenFile,
  onOpenLocation,
  onOpenPlaylist,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");

  const filteredEntries = useMemo(
    () => searchHistoryEntries(entries, searchQuery, statusFilter),
    [entries, searchQuery, statusFilter]
  );

  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(entryIds);
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [entryIds]);

  const selectedCount = selectedIds.size;
  const filteredIds = useMemo(() => filteredEntries.map((e) => e.id), [filteredEntries]);
  const allFilteredSelected =
    filteredEntries.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedCount > 0 && !allFilteredSelected;
  const hasActiveSearch = searchQuery.trim().length > 0 || statusFilter !== "all";

  function toggleEntry(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredIds));
  }

  function handleClearSelected() {
    if (!selectedCount) return;
    onRemoveSelected([...selectedIds]);
    setSelectedIds(new Set());
  }

  return (
    <div className="card history-card">
      <div className="history-header">
        <h2>Recent downloads</h2>
        {entries.length > 0 && (
          <div className="history-header-actions">
            {selectedCount > 0 && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleClearSelected}>
                Clear selected ({selectedCount})
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="history-empty">
          <span className="history-empty-icon">📭</span>
          <p>No recent downloads</p>
          <span className="hint">Completed, uncompleted, cancelled, and failed downloads appear here.</span>
        </div>
      ) : (
        <>
          <div className="history-toolbar">
            <div className="history-search">
              <input
                type="search"
                aria-label="Search download history"
                placeholder='Search title, filename, URL, or status — use quotes for exact phrases'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="history-filters" role="group" aria-label="Filter by status">
              {(
                [
                  ["all", "All"],
                  ["complete", "Complete"],
                  ["incomplete", "Uncompleted"],
                  ["cancelled", "Cancelled"],
                  ["error", "Failed"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`history-filter${statusFilter === id ? " history-filter--active" : ""}`}
                  aria-pressed={statusFilter === id}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="history-search-meta hint">
              {hasActiveSearch
                ? `${filteredEntries.length} of ${entries.length} downloads`
                : `${entries.length} download${entries.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <p className="hint">
            Select items to remove from this list only — your downloaded files stay on disk.
            Playlists expand to show each video.
          </p>

          {filteredEntries.length === 0 ? (
            <p className="hint history-no-results">
              No downloads match your search or filter.
            </p>
          ) : (
            <>
              <div className="history-select-all">
                <label className="history-select-all-label">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                  <span>
                    {allFilteredSelected
                      ? "Deselect all"
                      : someSelected
                        ? `${selectedCount} selected`
                        : "Select all"}
                  </span>
                </label>
              </div>

              <ul className="history-list">
                {filteredEntries.map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    selected={selectedIds.has(entry.id)}
                    searchQuery={searchQuery}
                    onToggleSelected={toggleEntry}
                    onResume={onResume}
                    onRedownload={onRedownload}
                    onOpenFolder={onOpenFolder}
                    onOpenFile={onOpenFile}
                    onOpenLocation={onOpenLocation}
                    onOpenPlaylist={onOpenPlaylist}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
