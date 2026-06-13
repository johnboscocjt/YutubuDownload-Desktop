import { useState } from "react";
import type { ProgressEvent } from "../types";

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
  outputDir: string;
  outputFile?: string;
  completeMessage: string | null;
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
  outputDir,
  outputFile,
  completeMessage,
}: Props) {
  const [showLogs, setShowLogs] = useState(false);

  if (!jobId && !completeMessage && !preparing) return null;

  const percent = progress?.percent ?? 0;
  const isActive = !!jobId;
  const success = completeMessage?.toLowerCase().includes("complete");
  const cancelled = completeMessage?.toLowerCase().includes("cancelled");

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
                    ? "Downloading"
                    : success
                      ? "Complete"
                      : cancelled
                        ? "Cancelled"
                        : "Finished"}
            </h2>
            {progress?.title && <p className="progress-title">{progress.title}</p>}
          </div>
          <div className="row" style={{ margin: 0, gap: "0.4rem" }}>
            {paused && <span className="badge badge-paused">Paused</span>}
            {progress?.lowNetwork && !paused && (
              <span className="badge badge-warn">Low network</span>
            )}
          </div>
        </div>
      </div>

      {progress?.itemIndex != null && progress.totalItems != null && (
        <p className="hint">
          Playlist item {progress.itemIndex} of {progress.totalItems}
        </p>
      )}

      <div className="progress-stats">
        <span className="progress-percent">{percent.toFixed(1)}%</span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(percent, 100)}%`,
              opacity: paused ? 0.5 : 1,
            }}
          />
        </div>
      </div>

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
        </p>
      )}

      {success && outputFile && (
        <p className="file-path" title={outputFile}>
          Saved to: {outputFile}
        </p>
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
        {outputDir && (
          <button type="button" className="btn btn-secondary" onClick={onOpenFolder}>
            Open destination
          </button>
        )}
      </div>
    </div>
  );
}
