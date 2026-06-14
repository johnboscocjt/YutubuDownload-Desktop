import { useState } from "react";
import { formatCompletedQuality, type DownloadQualityInfo } from "../downloadQuality";
import { playlistOverallPercent, resolveTrackTitle } from "../playlistProgress";
import type { PlaylistTrackItem, ProgressEvent } from "../types";

interface Props {
  jobId: string | null;
  progress: ProgressEvent | null;
  logs: string[];
  thumbnailUrl?: string;
  paused: boolean;
  preparing: boolean;
  preparingMessage: string | null;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenFolder: () => void;
  onOpenPlaylistFolder: () => void;
  outputDir: string;
  outputFile?: string;
  completeMessage: string | null;
  isPlaylist?: boolean;
  playlistTitle?: string;
  playlistTotal?: number;
  playlistTracks?: PlaylistTrackItem[];
  playlistFolder?: string | null;
  downloadQuality?: DownloadQualityInfo | null;
}

export default function ProgressPanel({
  jobId,
  progress,
  logs,
  thumbnailUrl,
  paused,
  preparing,
  preparingMessage,
  onCancel,
  onPause,
  onResume,
  onOpenFolder,
  onOpenPlaylistFolder,
  outputDir,
  outputFile,
  completeMessage,
  isPlaylist = false,
  playlistTitle,
  playlistTotal,
  playlistTracks = [],
  playlistFolder,
  downloadQuality,
}: Props) {
  const [showLogs, setShowLogs] = useState(false);
  const [showPlaylistFiles, setShowPlaylistFiles] = useState(true);

  if (!jobId && !completeMessage && !preparing) return null;

  const itemPercent = progress?.percent ?? 0;
  const isActive = !!jobId;
  const success = completeMessage?.toLowerCase().includes("complete");
  const cancelled = completeMessage?.toLowerCase().includes("cancelled");

  const totalItems =
    playlistTotal ?? progress?.totalItems ?? (playlistTracks.length || undefined);
  const currentIndex = progress?.itemIndex;
  const completedCount = playlistTracks.filter((t) => t.status === "complete").length;
  const showPlaylistUi =
    isPlaylist &&
    ((totalItems != null && totalItems > 0) || playlistTracks.length > 0);

  const overallPercent =
    showPlaylistUi && totalItems
      ? playlistOverallPercent(
          playlistTracks,
          totalItems,
          itemPercent,
          currentIndex
        )
      : itemPercent;

  const displayPercent = showPlaylistUi ? overallPercent : itemPercent;
  const completedQualityLabel = formatCompletedQuality(downloadQuality);
  const currentTrack =
    currentIndex != null
      ? playlistTracks.find((t) => t.itemIndex === currentIndex)
      : undefined;
  const nowPlayingTitle = showPlaylistUi
    ? resolveTrackTitle(
        currentTrack?.title ?? progress?.title,
        currentTrack?.filePath ?? progress?.outputFile,
        currentIndex ?? undefined
      )
    : resolveTrackTitle(progress?.title, progress?.outputFile);

  return (
    <div className="card progress-card">
      <div className="progress-top">
        {thumbnailUrl && (
          <div className="progress-thumb">
            <img src={thumbnailUrl} alt="" loading="lazy" />
          </div>
        )}
        <div className="progress-header" style={{ flex: 1 }}>
          <div>
            <h2>
              {preparing
                ? "Preparing"
                : paused
                  ? "Paused"
                  : isActive
                    ? showPlaylistUi
                      ? "Downloading playlist"
                      : "Downloading"
                    : success
                      ? showPlaylistUi
                        ? "Playlist complete"
                        : "Complete"
                      : cancelled
                        ? "Cancelled"
                        : "Finished"}
            </h2>
            {showPlaylistUi && playlistTitle && (
              <p className="progress-playlist-name">{playlistTitle}</p>
            )}
            {progress?.title && !showPlaylistUi && (
              <p className="progress-title">{nowPlayingTitle}</p>
            )}
            {showPlaylistUi && (progress?.title || currentTrack) && (
              <p className="progress-title">Now: {nowPlayingTitle}</p>
            )}
          </div>
          <div className="row" style={{ margin: 0, gap: "0.4rem" }}>
            {showPlaylistUi && totalItems && currentIndex != null && (
              <span className="badge badge-playlist">
                {currentIndex}/{totalItems}
              </span>
            )}
            {showPlaylistUi && totalItems != null && (
              <span className="badge badge-playlist-done">
                {completedCount}/{totalItems} done
              </span>
            )}
            {paused && <span className="badge badge-paused">Paused</span>}
            {progress?.lowNetwork && !paused && (
              <span className="badge badge-warn">Low network</span>
            )}
          </div>
        </div>
      </div>

      {showPlaylistUi && totalItems && (
        <p className="hint playlist-progress-summary">
          Playlist progress — video{" "}
          <strong>{currentIndex ?? completedCount + 1}</strong> of{" "}
          <strong>{totalItems}</strong>
          {completedCount > 0 && (
            <>
              {" "}
              · <strong>{completedCount}</strong> completed
            </>
          )}
        </p>
      )}

      <div className="progress-stats">
        <span className="progress-percent">{displayPercent.toFixed(1)}%</span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(displayPercent, 100)}%`,
              opacity: paused ? 0.5 : 1,
            }}
          />
        </div>
      </div>

      {showPlaylistUi && currentIndex != null && isActive && (
        <div className="playlist-current-item">
          <div className="playlist-current-label">
            <span>Current file</span>
            <span>{itemPercent.toFixed(1)}%</span>
          </div>
          <div className="progress-bar progress-bar--thin">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(itemPercent, 100)}%`,
                opacity: paused ? 0.5 : 1,
              }}
            />
          </div>
        </div>
      )}

      <div className="progress-meta">
        {progress?.fileSize && <span>{progress.fileSize}</span>}
        {progress?.speed && !progress.lowNetwork && !paused && (
          <span>{progress.speed}</span>
        )}
        {progress?.eta && !progress.lowNetwork && !paused && (
          <span>ETA {progress.eta}</span>
        )}
        {paused && isActive && (
          <span className="hint">Download paused — click Resume to continue</span>
        )}
        {progress?.lowNetwork && isActive && !paused && (
          <span className="hint">Still downloading — speed hidden on weak links</span>
        )}
      </div>

      {showPlaylistUi && playlistFolder && (
        <p className="file-path playlist-folder-path" title={playlistFolder}>
          Playlist folder: {playlistFolder}
        </p>
      )}

      {preparing && preparingMessage && (
        <p className="hint preparing-status">{preparingMessage}</p>
      )}

      {completeMessage && (
        <p
          className={
            success
              ? "status-success"
              : cancelled
                ? "hint"
                : "status-error"
          }
        >
          {completeMessage}
          {success && showPlaylistUi && totalItems != null && (
            <>
              {" "}
              ({completedCount || totalItems} of {totalItems} videos)
            </>
          )}
        </p>
      )}

      {success && completedQualityLabel && (
        <p className="download-quality-result">{completedQualityLabel}</p>
      )}

      {success && outputFile && !showPlaylistUi && (
        <p className="file-path" title={outputFile}>
          Saved to: {outputFile}
        </p>
      )}

      {showPlaylistUi && playlistTracks.length > 0 && (
        <div className="playlist-files-panel">
          <button
            type="button"
            className="playlist-files-toggle"
            onClick={() => setShowPlaylistFiles((v) => !v)}
            aria-expanded={showPlaylistFiles}
          >
            <span>
              Videos in playlist ({playlistTracks.length}
              {totalItems ? ` / ${totalItems}` : ""})
            </span>
            <span className="playlist-files-chevron">
              {showPlaylistFiles ? "▾" : "▸"}
            </span>
          </button>
          {showPlaylistFiles && (
            <ul className="playlist-files-list">
              {playlistTracks.map((track) => (
                <li
                  key={track.itemIndex}
                  className={`playlist-file-item playlist-file-item--${track.status}`}
                >
                  <div className="playlist-file-head">
                    <span className="playlist-file-index">
                      {String(track.itemIndex).padStart(2, "0")}
                    </span>
                    <span className="playlist-file-title" title={track.title}>
                      {resolveTrackTitle(track.title, track.filePath, track.itemIndex)}
                    </span>
                    <span className="playlist-file-percent">
                      {track.status === "complete"
                        ? "100%"
                        : track.status === "pending"
                          ? "—"
                          : `${track.percent.toFixed(0)}%`}
                    </span>
                  </div>
                  {track.status !== "pending" && (
                    <div className="progress-bar progress-bar--thin">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${track.status === "complete" ? 100 : track.percent}%`,
                          opacity: track.status === "downloading" ? 1 : 0.85,
                        }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div className="log-toggle-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowLogs((v) => !v)}
          >
            {showLogs ? "Hide technical log" : `Show technical log (${logs.length})`}
          </button>
        </div>
      )}

      {showLogs && logs.length > 0 && (
        <div className="log">
          {logs.slice(-60).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div className="actions">
        {jobId && (
          <>
            {paused ? (
              <button type="button" className="btn btn-primary" onClick={onResume}>
                Resume
              </button>
            ) : (
              <button type="button" className="btn btn-warn" onClick={onPause}>
                Pause
              </button>
            )}
            <button type="button" className="btn btn-danger" onClick={onCancel}>
              Cancel
            </button>
          </>
        )}
        {showPlaylistUi && playlistFolder ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenPlaylistFolder}
          >
            Open playlist folder
          </button>
        ) : (
          outputDir && (
            <button type="button" className="btn btn-secondary" onClick={onOpenFolder}>
              Open destination
            </button>
          )
        )}
      </div>
    </div>
  );
}
