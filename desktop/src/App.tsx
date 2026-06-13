import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { homeDir } from "@tauri-apps/api/path";
import {
  cancelDownload,
  checkDependencies,
  fetchMetadata,
  openMediaFile,
  openFileLocation,
  openOutputFolder,
  pauseDownload,
  probeVideo,
  refreshCookies,
  resumeDownload,
  resolvePlayableFiles,
  startDownload,
} from "./api";
import DependencyPanel from "./components/DependencyPanel";
import DocsPage from "./components/DocsPage";
import DownloadForm from "./components/DownloadForm";
import DownloadHistory from "./components/DownloadHistory";
import PlayCompleted from "./components/PlayCompleted";
import ProgressPanel from "./components/ProgressPanel";
import { clearHistory, loadHistory, prependHistory, removeHistoryEntries, saveHistory } from "./history";
import { loadSettings, saveSettings } from "./settings";
import type {
  DependencyStatus,
  DownloadCompleteEvent,
  HistoryEntry,
  MetadataInfo,
  ProgressEvent,
} from "./types";

const STANDARD = [2160, 1440, 1080, 720, 480, 360];

type Tab = "download" | "play" | "history" | "setup" | "settings" | "docs";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "download", label: "Download", icon: "⬇" },
  { id: "play", label: "Play Completed", icon: "▶" },
  { id: "history", label: "History", icon: "🕘" },
  { id: "docs", label: "Docs", icon: "📖" },
  { id: "setup", label: "Setup", icon: "⚙" },
  { id: "settings", label: "Settings", icon: "🎛" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("download");
  const [deps, setDeps] = useState<DependencyStatus | null>(null);
  const [url, setUrl] = useState("");
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [isMp3, setIsMp3] = useState(false);
  const [height, setHeight] = useState(720);
  const [qualities, setQualities] = useState<number[]>(STANDARD);
  const [qualityMsg, setQualityMsg] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [metadata, setMetadata] = useState<MetadataInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparingMessage, setPreparingMessage] = useState<string | null>(null);
  const [qualityVerified, setQualityVerified] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(null);
  const [concurrentFragments, setConcurrentFragments] = useState(1);
  const [playInBackground, setPlayInBackground] = useState(
    () => loadSettings().playInBackground
  );
  const [backgroundPlaybackActive, setBackgroundPlaybackActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [activeDownload, setActiveDownload] = useState<{
    url: string;
    title: string;
    thumbnailUrl?: string;
    isPlaylist: boolean;
    isMp3: boolean;
    playlistTitle?: string;
    entryCount?: number;
  } | null>(null);
  const activeDownloadRef = useRef(activeDownload);
  const progressRef = useRef(progress);
  const playlistItemsRef = useRef<
    Map<number, { title: string; filePath?: string }>
  >(new Map());
  const lastOutputFileRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    activeDownloadRef.current = activeDownload;
  }, [activeDownload]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const loadDeps = useCallback(async () => {
    setDeps(await checkDependencies());
  }, []);

  useEffect(() => {
    loadDeps();
    homeDir().then((h) => setOutputDir(h ?? ""));
  }, [loadDeps]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = loadHistory();
      let changed = false;
      const next = await Promise.all(
        entries.map(async (entry) => {
          if (entry.status !== "complete") return entry;
          const badPath =
            !entry.filePath ||
            /\.f\d+(\.[a-z0-9]+)?$/i.test(entry.filePath) ||
            /\.f\d+\./i.test(entry.filePath);
          if (!badPath && !entry.isPlaylist) return entry;

          try {
            const hints =
              entry.isPlaylist && entry.children?.length
                ? entry.children.map((c) => ({
                    title: c.title,
                    itemIndex: c.itemIndex,
                    filePath: c.filePath,
                  }))
                : [{ title: entry.title, filePath: entry.filePath }];

            const files = await resolvePlayableFiles(entry.outputDir, hints);
            if (!files.length) return entry;

            changed = true;
            if (entry.isPlaylist && entry.children?.length) {
              const children = entry.children.map((child) => {
                const match = files.find((f) => f.itemIndex === child.itemIndex);
                return match ? { ...child, filePath: match.path } : child;
              });
              return { ...entry, children };
            }
            return { ...entry, filePath: files[0]?.path ?? entry.filePath };
          } catch {
            return entry;
          }
        })
      );
      if (!cancelled && changed) setHistory(saveHistory(next));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCompleteMessage(null);
  }, [url, isPlaylist, isMp3]);

  useEffect(() => {
    setQualityVerified(false);
  }, [url, isPlaylist, isMp3, height]);

  useEffect(() => {
    const unProgress = listen<ProgressEvent>("download-progress", (e) => {
      setProgress(e.payload);
      if (e.payload.logLine) {
        setLogs((prev) => [...prev, e.payload.logLine!]);
      }
      const active = activeDownloadRef.current;
      if (e.payload.outputFile) {
        lastOutputFileRef.current = e.payload.outputFile;
      }
      if (active?.isPlaylist && e.payload.itemIndex != null) {
        const prev = playlistItemsRef.current.get(e.payload.itemIndex);
        playlistItemsRef.current.set(e.payload.itemIndex, {
          title:
            e.payload.title?.trim() ||
            prev?.title ||
            `Item ${e.payload.itemIndex}`,
          filePath: e.payload.outputFile ?? prev?.filePath,
        });
      }
    });
    const unComplete = listen<DownloadCompleteEvent>("download-complete", (e) => {
      const { success, message, outputDir: outDir, outputFile } = e.payload;
      setJobId(null);
      setPaused(false);
      setCompleteMessage(message);
      setBusy(false);

      const current = activeDownloadRef.current;
      if (current) {
        const status: HistoryEntry["status"] = message.toLowerCase().includes("cancelled")
          ? "cancelled"
          : success
            ? "complete"
            : "error";

        const children = current.isPlaylist
          ? [...playlistItemsRef.current.entries()]
              .sort(([a], [b]) => a - b)
              .map(([itemIndex, item]) => ({
                id: `${e.payload.jobId}-${itemIndex}`,
                itemIndex,
                title: item.title,
                filePath: item.filePath,
              }))
          : undefined;

        const displayTitle = current.isPlaylist
          ? current.playlistTitle ?? current.title
          : progressRef.current?.title ?? current.title ?? current.url;

        const filePath =
          outputFile ??
          progressRef.current?.outputFile ??
          lastOutputFileRef.current;

        const resolvedPath = current.isPlaylist ? undefined : filePath;
        if (resolvedPath) setLastDownloadedFile(resolvedPath);

        setHistory(
          prependHistory({
            id: e.payload.jobId,
            url: current.url,
            title: displayTitle,
            thumbnailUrl: current.thumbnailUrl,
            status,
            finishedAt: new Date().toISOString(),
            outputDir: outDir,
            isPlaylist: current.isPlaylist,
            isMp3: current.isMp3,
            filePath: resolvedPath,
            itemCount: current.entryCount ?? children?.length,
            children: children?.length ? children : undefined,
          })
        );
        setActiveDownload(null);
        playlistItemsRef.current = new Map();
        lastOutputFileRef.current = undefined;
      }
    });
    return () => {
      unProgress.then((f) => f());
      unComplete.then((f) => f());
    };
  }, []);

  async function handleProbe() {
    setBusy(true);
    setQualityMsg("Fetching video info…");
    setMetadata(null);
    setQualityVerified(false);
    try {
      const probe = await probeVideo(url, isPlaylist, height, isMp3);
      setQualities(probe.qualities.length ? probe.qualities : STANDARD);
      setMetadata(probe.metadata);
      if (probe.quality) {
        setQualityMsg(probe.quality.message);
        if (probe.quality.chosen_height) setHeight(probe.quality.chosen_height);
      } else {
        setQualityMsg("");
      }
      setQualityVerified(true);
    } catch (e) {
      setQualityMsg(String(e));
      setQualityVerified(false);
    } finally {
      setBusy(false);
    }
  }

  async function runDownload(forceRedownload = false) {
    setBusy(true);
    setPreparing(true);
    setPreparingMessage(
      forceRedownload ? "Preparing redownload…" : "Preparing download…"
    );
    setCompleteMessage(null);
    setLastDownloadedFile(null);
    setLogs([]);
    setProgress(null);
    setPaused(false);
    playlistItemsRef.current = new Map();
    lastOutputFileRef.current = undefined;
    try {
      let meta = metadata;
      if (!meta && url) {
        setPreparingMessage("Fetching video info…");
        meta = await fetchMetadata(url, isPlaylist);
        setMetadata(meta);
      }
      setPreparingMessage("Starting yt-dlp…");
      setActiveDownload({
        url,
        title: meta?.title ?? meta?.playlist_title ?? url,
        thumbnailUrl: meta?.thumbnail_url,
        isPlaylist,
        isMp3,
        playlistTitle: meta?.playlist_title ?? meta?.title,
        entryCount: meta?.entry_count,
      });
      const id = await startDownload({
        url,
        isPlaylist,
        isMp3,
        audioQuality: isMp3 ? "0" : undefined,
        requestedHeight: isMp3 ? undefined : height,
        outputDir,
        usePlaylistFolder: isPlaylist,
        customFolderName: undefined,
        concurrentFragments,
        skipQualityCheck: qualityVerified,
        forceRedownload,
      });
      setJobId(id);
      setPreparing(false);
      setPreparingMessage(null);
    } catch (e) {
      setCompleteMessage(String(e));
      setBusy(false);
      setPreparing(false);
      setPreparingMessage(null);
      setActiveDownload(null);
    }
  }

  function handleDownload() {
    return runDownload(false);
  }

  function handleRedownload() {
    return runDownload(true);
  }

  const downloadComplete =
    !jobId &&
    !preparing &&
    completeMessage?.toLowerCase().includes("complete") === true;

  async function handleCancel() {
    if (!jobId) return;
    try {
      await cancelDownload(jobId);
    } catch (e) {
      setCompleteMessage(String(e));
      setJobId(null);
      setBusy(false);
      setPaused(false);
    }
  }

  async function handlePause() {
    if (!jobId) return;
    try {
      await pauseDownload(jobId);
      setPaused(true);
    } catch (e) {
      setCompleteMessage(String(e));
    }
  }

  async function handleResume() {
    if (!jobId) return;
    try {
      await resumeDownload(jobId);
      setPaused(false);
    } catch (e) {
      setCompleteMessage(String(e));
    }
  }

  function handlePlayInBackgroundChange(enabled: boolean) {
    setPlayInBackground(enabled);
    saveSettings({ playInBackground: enabled });
  }

  function handleClearHistory() {
    setHistory(clearHistory());
  }

  function handleRemoveHistoryEntries(ids: string[]) {
    setHistory(removeHistoryEntries(ids));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Y</div>
          <div>
            <strong>YutubuDownload</strong>
            <span>Desktop v2.0.1</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">
                {item.label}
                {item.id === "play" && backgroundPlaybackActive && tab !== "play" && (
                  <span className="nav-playing-badge" title="Playing in background">
                    ▶
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {deps?.all_ready ? (
            <span className="status-dot ok">Ready</span>
          ) : (
            <span className="status-dot bad">Setup required</span>
          )}
        </div>
      </aside>

      <main className={`main${tab === "play" ? " main--play" : ""}`}>
        <header className="page-header">
          <h1>{NAV.find((n) => n.id === tab)?.label}</h1>
          <p>Tanzania-optimized · probe-verified quality · terminal-grade reliability</p>
        </header>

        {tab === "setup" && (
          <DependencyPanel
            deps={deps}
            onRefresh={loadDeps}
            onRefreshCookies={async () => {
              await refreshCookies(true);
              await loadDeps();
            }}
          />
        )}

        {tab === "settings" && (
          <div className="settings-stack">
            <div className="card glass">
              <h2>Background playback</h2>
              <p className="settings-lead">
                Keep video or audio playing when you switch to Download, History, Docs, or
                other sidebar pages. Turn off to stop playback whenever you leave Play
                Completed.
              </p>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={playInBackground}
                  onChange={(e) => handlePlayInBackgroundChange(e.target.checked)}
                />
                <span className="settings-toggle-label">
                  Play in background when switching sidebar tabs
                </span>
              </label>

              <p className="hint">
                {playInBackground
                  ? "Playback continues while you browse other pages. Return to Play Completed to see the video."
                  : "Playback stops when you leave Play Completed."}
              </p>
            </div>

            <div className="card glass">
              <h2>Concurrent fragments</h2>
              <p className="settings-lead">
                Controls how many pieces of a video yt-dlp downloads at the same time.
                Modern YouTube streams are split into small fragments; raising this value
                lets yt-dlp fetch several fragments in parallel.
              </p>

              <label htmlFor="frag">Concurrent fragments</label>
              <input
                id="frag"
                type="number"
                min={1}
                max={8}
                value={concurrentFragments}
                onChange={(e) =>
                  setConcurrentFragments(Math.min(8, Math.max(1, Number(e.target.value) || 1)))
                }
              />

              <div className="settings-grid">
                <div className="settings-tip">
                  <strong>Why it exists</strong>
                  <p>
                    On a fast, stable connection, parallel fragments reduce wait time because
                    the download uses more of your available bandwidth. On weak or mobile
                    networks, too many parallel requests can cause timeouts and retries.
                  </p>
                </div>
                <div className="settings-tip">
                  <strong>What to use</strong>
                  <ul>
                    <li><code>1</code> — default, safest (Tanzania mobile / shared Wi‑Fi)</li>
                    <li><code>2–3</code> — good home Wi‑Fi, fewer stalls</li>
                    <li><code>4</code> — strong fibre / office network</li>
                    <li><code>5–8</code> — only if you have very fast, stable internet</li>
                  </ul>
                </div>
                <div className="settings-tip">
                  <strong>How it helps</strong>
                  <p>
                    Higher values can noticeably speed up large 1080p/4K downloads when your
                    link is fast enough. Lower values keep downloads reliable when the network
                    is slow — same behaviour as terminal{" "}
                    <code>YTDL_CONCURRENT_FRAGMENTS</code>.
                  </p>
                </div>
              </div>

              <p className="hint">
                Tip: start at <code>1</code>. If downloads finish quickly without “Low network”
                warnings, try <code>2</code> or <code>3</code> on the next download.
              </p>
            </div>
          </div>
        )}

        {tab === "docs" && <DocsPage />}

        {tab === "history" && (
          <DownloadHistory
            entries={history}
            onClear={handleClearHistory}
            onRemoveSelected={handleRemoveHistoryEntries}
            onOpenFolder={openOutputFolder}
            onOpenFile={openMediaFile}
            onOpenLocation={openFileLocation}
          />
        )}

        {(tab === "play" || playInBackground) && (
          <div className={tab !== "play" ? "play-completed-host--background" : undefined}>
            <PlayCompleted
              entries={history}
              panelVisible={tab === "play"}
              playInBackground={playInBackground}
              onBackgroundPlaybackChange={setBackgroundPlaybackActive}
            />
          </div>
        )}

        {tab === "download" && (
          <>
            {!deps?.all_ready && (
              <div className="banner banner-warn">
                Some dependencies are missing. Open <strong>Setup</strong> for install hints.
              </div>
            )}
            <DownloadForm
              url={url}
              setUrl={setUrl}
              isPlaylist={isPlaylist}
              setIsPlaylist={setIsPlaylist}
              isMp3={isMp3}
              setIsMp3={setIsMp3}
              height={height}
              setHeight={setHeight}
              qualities={qualities}
              qualityMsg={qualityMsg}
              outputDir={outputDir}
              setOutputDir={setOutputDir}
              metadata={metadata}
              busy={busy}
              preparing={preparing}
              downloadComplete={downloadComplete}
              onProbe={handleProbe}
              onDownload={handleDownload}
              onRedownload={handleRedownload}
            />
            <ProgressPanel
              jobId={jobId}
              progress={progress}
              logs={logs}
              thumbnailUrl={
                activeDownload?.thumbnailUrl ?? metadata?.thumbnail_url
              }
              paused={paused}
              preparing={preparing}
              preparingMessage={preparingMessage}
              onCancel={handleCancel}
              onPause={handlePause}
              onResume={handleResume}
              onOpenFolder={() => openOutputFolder(outputDir)}
              outputDir={outputDir}
              outputFile={
                lastDownloadedFile ??
                progress?.outputFile ??
                undefined
              }
              completeMessage={completeMessage}
            />
          </>
        )}
      </main>
    </div>
  );
}
