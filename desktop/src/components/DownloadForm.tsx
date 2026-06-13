import { open } from "@tauri-apps/plugin-dialog";
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
  preparing: boolean;
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
  preparing,
  downloadComplete,
  onProbe,
  onDownload,
  onRedownload,
}: Props) {
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
          {qualityMsg && <p className="hint">{qualityMsg}</p>}
        </>
      )}

      <label htmlFor="out">Destination</label>
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
            <strong>{metadata.title ?? metadata.playlist_title ?? "Unknown"}</strong>
            {metadata.duration && <div>Duration: {metadata.duration}</div>}
            {metadata.entry_count != null && (
              <div>Playlist items: {metadata.entry_count}</div>
            )}
            {metadata.video_id && <div>ID: {metadata.video_id}</div>}
          </div>
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || preparing || !url}
          onClick={onProbe}
        >
          {busy && !preparing ? "Checking…" : "Preview & verify quality"}
        </button>
        {downloadComplete ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || preparing || !url || !outputDir}
            onClick={onRedownload}
          >
            {preparing ? "Preparing…" : "Redownload"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || preparing || !url || !outputDir}
            onClick={onDownload}
          >
            {preparing ? "Starting…" : "Start download"}
          </button>
        )}
      </div>
    </div>
  );
}

export type { QualityResolution };
