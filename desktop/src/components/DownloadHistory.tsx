import { useState } from "react";
import { entryDisplayTitle, entryMetaLabel } from "../history";
import type { HistoryEntry } from "../types";

interface Props {
  entries: HistoryEntry[];
  onClear: () => void;
  onOpenFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onOpenLocation: (path: string) => void;
}

function isPlaylistEntry(entry: HistoryEntry): boolean {
  return Boolean(entry.isPlaylist || (entry.children && entry.children.length > 0));
}

function HistoryRow({
  entry,
  onOpenFolder,
  onOpenFile,
  onOpenLocation,
}: {
  entry: HistoryEntry;
  onOpenFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onOpenLocation: (path: string) => void;
}) {
  const playlist = isPlaylistEntry(entry);
  const hasChildren = (entry.children?.length ?? 0) > 0;
  const [expanded, setExpanded] = useState(false);
  const itemLabel =
    entry.itemCount ?? entry.children?.length ?? 0;

  return (
    <li className={`history-item ${playlist ? "history-item-playlist" : ""}`}>
      <div className="history-item-main">
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
          <strong>{entryDisplayTitle(entry)}</strong>
          {entryMetaLabel(entry) && (
            <span className="hint">{entryMetaLabel(entry)}</span>
          )}
          <div className="history-meta-row">
            {playlist && (
              <span className="history-type-pill">Playlist · {itemLabel} items</span>
            )}
            <span className={`history-status history-status-${entry.status}`}>
              {entry.status}
            </span>
          </div>
          <span className="history-date">
            {new Date(entry.finishedAt).toLocaleString()}
          </span>
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
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenFolder(entry.outputDir)}
              title={entry.outputDir}
            >
              Destination
            </button>
          )}
        </div>
      </div>

      {playlist && hasChildren && expanded && (
        <ul className="history-children">
          {entry.children!.map((child) => (
            <li key={child.id} className="history-child">
              <span className="history-child-index">
                {String(child.itemIndex).padStart(2, "0")}
              </span>
              <span className="history-child-title">{child.title}</span>
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
  onOpenFolder,
  onOpenFile,
  onOpenLocation,
}: Props) {
  return (
    <div className="card history-card">
      <div className="history-header">
        <h2>Recent downloads</h2>
        {entries.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Clear history
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="history-empty">
          <span className="history-empty-icon">📭</span>
          <p>No recent downloads</p>
          <span className="hint">Completed, cancelled, and failed downloads appear here.</span>
        </div>
      ) : (
        <>
          <p className="hint">
            Clears this list only — your downloaded files stay on disk. Playlists expand to
            show each video.
          </p>
          <ul className="history-list">
            {entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                onOpenFolder={onOpenFolder}
                onOpenFile={onOpenFile}
                onOpenLocation={onOpenLocation}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
