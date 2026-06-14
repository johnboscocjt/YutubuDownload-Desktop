import type { DependencyStatus } from "../types";

interface Props {
  deps: DependencyStatus | null;
  onRefresh: () => void;
  onRefreshCookies: () => void;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return <span className={ok ? "ok" : "bad"}>{ok ? "OK" : "Missing"}</span>;
}

export default function DependencyPanel({
  deps,
  onRefresh,
  onRefreshCookies,
}: Props) {
  if (!deps) {
    return (
      <div className="card glass">
        <h2>System dependencies</h2>
        <p className="hint">Loading…</p>
      </div>
    );
  }

  return (
    <div className="card glass">
      <h2>System dependencies</h2>
      <div className="status-grid">
        <div className="status-item">
          <span>yt-dlp</span>
          <StatusBadge ok={deps.ytdlp.found} />
        </div>
        <div className="status-item">
          <span>ffmpeg</span>
          <StatusBadge ok={deps.ffmpeg.found} />
        </div>
        <div className="status-item">
          <span>JS runtime (Deno/Node)</span>
          <StatusBadge ok={deps.js_runtime.found} />
        </div>
        <div className="status-item">
          <span>Python cookies</span>
          <StatusBadge ok={deps.python_cookies.found} />
        </div>
      </div>

      {!deps.all_ready && (
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
            Install hints
          </h3>
          <p className="hint">
            <strong>yt-dlp:</strong> {deps.install_hints.ytdlp}
          </p>
          <p className="hint">
            <strong>ffmpeg:</strong> {deps.install_hints.ffmpeg}
          </p>
          <p className="hint">
            <strong>JS runtime:</strong> {deps.install_hints.js_runtime}
          </p>
          <p className="hint">
            <strong>Python cookies:</strong> {deps.install_hints.python_cookies}
          </p>
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onRefresh}>
          Re-check
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRefreshCookies}
        >
          Refresh cookies
        </button>
      </div>
    </div>
  );
}
