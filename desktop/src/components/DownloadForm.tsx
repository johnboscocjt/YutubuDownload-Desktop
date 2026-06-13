import { open } from "@tauri-apps/plugin-dialog";
import { defaultPlaylistFolderLabel, playlistSavePath } from "../playlistProgress";
import type { MetadataInfo, QualityResolution } from "../types";

interface Props {
  url: string;
  setUrl: (v: string) => void;
  isPlaylist: boolean;
  setIsPlaylist: (v: boolean) => void;
  isMp3: boolean;
  setIsMp3: (v: boolean) => void;
  height: number;
  setHeight: (v: number) => void;
  qualities: number[];
  qualityMsg: string;
  outputDir: string;
  setOutputDir: (v: string) => void;
  metadata: MetadataInfo | null;
  busy: boolean;
  probing: boolean;
  preparing: boolean;
  canStart: boolean;
  downloadComplete: boolean;
  onProbe: () => void;
  onDownload: () => void;
  onRedownload: () => void;
}

export default function DownloadForm({
  url,
  setUrl,
  isPlaylist,
  setIsPlaylist,
  isMp3,
  setIsMp3,
  height,
  setHeight,
  qualities,
  qualityMsg,
  outputDir,
  setOutputDir,
  metadata,
  busy,
  probing,
  preparing,
  canStart,
  downloadComplete,
  onProbe,
  onDownload,
  onRedownload,
}: Props) {
  const playlistFolder =
    isPlaylist && metadata ? defaultPlaylistFolderLabel(metadata) : null;
  const playlistFullPath =
    isPlaylist && metadata ? playlistSavePath(outputDir, metadata) : null;

  async function pickFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose destination",
    });
    if (typeof selected === "string") {
      setOutputDir(selected);
    }
  }

  return (
    <div className="card glass">
      <h2>Download</h2>
      <p className="hint desktop-value-hint">
        Same yt-dlp speed as terminal <code>ytd</code> — plus live preview, progress,
        history, and built-in playback. Paste a URL and hit{" "}
        <strong>Start download</strong> anytime; title and quality check run in the
        background.
      </p>
      <label htmlFor="url">YouTube URL</label>
      <input
        id="url"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
      />

      <div className="row">
        <label>
          <input
            type="radio"
            checked={!isPlaylist}
            onChange={() => setIsPlaylist(false)}
          />{" "}
          Single video
        </label>
        <label>
          <input
            type="radio"
            checked={isPlaylist}
            onChange={() => setIsPlaylist(true)}
          />{" "}
          Full playlist
        </label>
      </div>

      <div className="row">
        <label>
          <input
            type="radio"
            checked={!isMp3}
            onChange={() => setIsMp3(false)}
          />{" "}
          Video
        </label>
        <label>
          <input type="radio" checked={isMp3} onChange={() => setIsMp3(true)} />{" "}
          MP3
        </label>
      </div>

      {!isMp3 && (
        <>
          <label htmlFor="height">Max height</label>
          <select
            id="height"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          >
            {qualities.map((q) => (
              <option key={q} value={q}>
                {q}p
              </option>
            ))}
          </select>
          {qualityMsg && (
            <p className={`hint${probing ? " hint--active" : ""}`}>{qualityMsg}</p>
          )}
        </>
      )}

      <label htmlFor="out">Destination</label>
      <p className="hint">
        Saves to <code>~/YutubuDownload-Desktop</code> — separate from terminal{" "}
        <code>ytd</code>. Uses the same shared cookies as CLI for fast starts.
      </p>
      <div className="row">
        <input id="out" type="text" value={outputDir} readOnly />
        <button type="button" className="btn btn-secondary" onClick={pickFolder}>
          Browse
        </button>
      </div>

      {metadata && (
        <div className="preview-card">
          {metadata.thumbnail_url && (
            <div className="preview-thumb">
              <img src={metadata.thumbnail_url} alt="" loading="lazy" />
            </div>
          )}
          <div className="preview-info">
            {isPlaylist ? (
              <>
                <span className="preview-badge">Playlist</span>
                <strong>
                  {metadata.playlist_title ??
                    metadata.title ??
                    "Loading playlist…"}
                </strong>
                {metadata.entry_count != null && (
                  <div>{metadata.entry_count} videos</div>
                )}
                {metadata.playlist_id && (
                  <div className="preview-meta-id">ID: {metadata.playlist_id}</div>
                )}
                {playlistFolder && (
                  <div className="preview-folder">
                    Folder: <code>{playlistFolder}/</code>
                    <span className="hint-inline">
                      {" "}
                      (CLI default — same playlist reuses this folder, skips finished
                      files)
                    </span>
                  </div>
                )}
                {playlistFullPath && (
                  <div className="preview-folder-path" title={playlistFullPath}>
                    → {playlistFullPath}/
                  </div>
                )}
              </>
            ) : (
              <>
                <strong>
                  {metadata.title ??
                    metadata.playlist_title ??
                    (metadata.video_id ? "Loading title…" : "Unknown")}
                </strong>
                {metadata.duration && <div>Duration: {metadata.duration}</div>}
              </>
            )}
            {metadata.video_id && !isPlaylist && <div>ID: {metadata.video_id}</div>}
          </div>
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={probing || preparing || !url}
          onClick={onProbe}
        >
          {probing ? "Checking…" : "Preview & verify quality"}
        </button>
        {downloadComplete ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart || busy || preparing}
            onClick={onRedownload}
          >
            {preparing ? "Preparing…" : "Redownload"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart || busy || preparing}
            onClick={onDownload}
          >
            {preparing ? "Starting…" : probing ? "Start download (preview loading…)" : "Start download"}
          </button>
        )}
      </div>
    </div>
  );
}

export type { QualityResolution };
