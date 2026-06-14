import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  cancelDownload,
  checkDependencies,
  defaultDownloadDir,
  fetchMetadata,
  listPlaylistTitles,
  openMediaFile,
  openFileLocation,
  openOutputFolder,
  openPlaylistInSystemPlayer,
  pauseDownload,
  probeVideo,
  resolveQuality,
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
import { clearHistory, loadHistory, prependHistory, removeHistoryEntries, saveHistory, updateHistoryEntry } from "./history";
import { loadSettings, saveSettings } from "./settings";
import type {
  DependencyStatus,
  DownloadCompleteEvent,
  HistoryEntry,
  MetadataInfo,
  PlaylistTrackItem,
  ProgressEvent,
  QualityResolution,
} from "./types";
import {
  qualityInfoFromResolution,
  type DownloadQualityInfo,
} from "./downloadQuality";
import {
  buildHistoryEntryFromDownload,
  reconcilePartialPlaylists,
} from "./incompletePlaylists";
import {
  buildPlaylistTracksFromTitles,
  isPlaceholderPlaylistTitle,
  mergePlaylistProgress,
  playlistDisplayTitle,
  playlistFolderPath,
  playlistFolderForEntry,
  playlistIdFromEntry,
  playlistTitleFromOutputPath,
  resolveTrackTitle,
  titleFromPlaylistFolderPath,
} from "./playlistProgress";

const STANDARD = [2160, 1440, 1080, 720, 480, 360];

function looksLikeYoutubeUrl(url: string): boolean {
  const trimmed = url.trim();
  return /youtu(\.be|be\.com)/i.test(trimmed) && trimmed.length > 12;
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([A-Za-z0-9_-]+)/i);
  return match ? match[1] : null;
}

function normalizeYoutubeUrl(url: string): string {
  const trimmed = url.trim();
  const videoMatch = trimmed.match(/(?:v=|youtu\.be\/)([^&?/]{11})/i);
  const videoId = videoMatch ? videoMatch[1] : null;
  const playlistId = extractPlaylistId(trimmed);

  if (videoId && playlistId) {
    return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
  }
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  if (playlistId) return `https://www.youtube.com/playlist?list=${playlistId}`;
  return trimmed;
}

function hasDownloadMetadata(meta: MetadataInfo | null, isPlaylist: boolean): boolean {
  if (!meta) return false;
  if (isPlaylist) {
    return Boolean(
      (meta.playlist_title && !isPlaceholderPlaylistTitle(meta.playlist_title)) ||
        (meta.title && !isPlaceholderPlaylistTitle(meta.title)) ||
        meta.entry_count
    );
  }
  return Boolean(meta.title || meta.video_id);
}

function placeholderPlaylistTracks(total: number): PlaylistTrackItem[] {
  return Array.from({ length: total }, (_, i) => ({
    itemIndex: i + 1,
    title: `Video ${i + 1}`,
    percent: 0,
    status: "pending" as const,
  }));
}

function instantMetadataFromUrl(url: string, isPlaylist: boolean): MetadataInfo | null {
  const probeUrl = normalizeYoutubeUrl(url);
  const playlistId = extractPlaylistId(probeUrl);
  const videoMatch = probeUrl.match(/(?:v=|youtu\.be\/)([^&?/]{11})/i);
  const videoId = videoMatch?.[1];

  if (isPlaylist && playlistId) {
    return {
      video_id: videoId,
      playlist_id: playlistId,
      title: undefined,
      duration: undefined,
      thumbnail_url: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined,
      is_playlist: true,
      playlist_title: undefined,
      entry_count: undefined,
    };
  }

  if (!videoId) return null;
  return {
    video_id: videoId,
    playlist_id: playlistId ?? undefined,
    title: undefined,
    duration: undefined,
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    is_playlist: isPlaylist,
    playlist_title: undefined,
    entry_count: undefined,
  };
}

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
  const [qualityResolution, setQualityResolution] = useState<QualityResolution | null>(null);
  const [downloadQuality, setDownloadQuality] = useState<DownloadQualityInfo | null>(null);
  const [outputDir, setOutputDir] = useState("");
  const [metadata, setMetadata] = useState<MetadataInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [probing, setProbing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparingMessage, setPreparingMessage] = useState<string | null>(null);
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
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrackItem[]>([]);
  const [playlistTotal, setPlaylistTotal] = useState<number | null>(null);
  const playlistTracksRef = useRef(playlistTracks);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [activeDownload, setActiveDownload] = useState<{
    url: string;
    title: string;
    thumbnailUrl?: string;
    isPlaylist: boolean;
    isMp3: boolean;
    playlistTitle?: string;
    playlistId?: string;
    entryCount?: number;
    requestedHeight?: number;
  } | null>(null);
  const activeDownloadRef = useRef(activeDownload);
  const progressRef = useRef(progress);
  const playlistItemsRef = useRef<
    Map<number, { title: string; filePath?: string }>
  >(new Map());
  const lastOutputFileRef = useRef<string | undefined>(undefined);
  const probeRequestRef = useRef(0);
  const heightRef = useRef(height);
  const availableHeightsRef = useRef<number[]>([]);
  const lastAutoProbeKeyRef = useRef("");

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  const setOutputDirAndSave = useCallback((dir: string) => {
    setOutputDir(dir);
    saveSettings({ outputDir: dir });
  }, []);

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
    void refreshCookies(false).catch(() => undefined);
    (async () => {
      const saved = loadSettings().outputDir;
      if (saved) {
        setOutputDir(saved);
        return;
      }
      try {
        const dir = await defaultDownloadDir();
        setOutputDirAndSave(dir);
      } catch {
        setOutputDirAndSave("");
      }
    })();
  }, [loadDeps, setOutputDirAndSave]);

  useEffect(() => {
    if (!outputDir) return;
    let cancelled = false;
    void reconcilePartialPlaylists(outputDir).then((next) => {
      if (!cancelled && next) setHistory(next);
    });
    return () => {
      cancelled = true;
    };
  }, [outputDir]);

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
    setDownloadQuality(null);
    setQualityResolution(null);
  }, [url, isPlaylist, isMp3]);

  useEffect(() => {
    availableHeightsRef.current = [];
  }, [url, isPlaylist, isMp3]);

  useEffect(() => {
    if (isMp3 || !availableHeightsRef.current?.length) return;
    const probeUrl = normalizeYoutubeUrl(url);
    if (!looksLikeYoutubeUrl(probeUrl)) return;

    let cancelled = false;
    void resolveQuality(probeUrl, height, availableHeightsRef.current).then(
      (quality) => {
        if (cancelled) return;
        setQualityResolution(quality);
        setQualityMsg(quality.message);
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [height, isMp3, url]);

  useEffect(() => {
    playlistTracksRef.current = playlistTracks;
  }, [playlistTracks]);

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
      if (active?.isPlaylist && e.payload.outputFile) {
        const realTitle = playlistTitleFromOutputPath(e.payload.outputFile);
        if (realTitle) {
          setActiveDownload((prev) =>
            prev
              ? {
                  ...prev,
                  playlistTitle: realTitle,
                  title: realTitle,
                }
              : prev
          );
          setMetadata((prev) =>
            prev
              ? {
                  ...prev,
                  playlist_title: realTitle,
                  title: realTitle,
                }
              : prev
          );
        }
      }
      if (active?.isPlaylist && e.payload.itemIndex != null) {
        const idx = e.payload.itemIndex;
        const total = e.payload.totalItems ?? active.entryCount ?? undefined;
        if (total) setPlaylistTotal(total);
        setPlaylistTracks((prev) =>
          mergePlaylistProgress(
            prev,
            idx,
            total,
            e.payload.title,
            e.payload.percent,
            e.payload.outputFile
          )
        );
        const prev = playlistItemsRef.current.get(idx);
        const trackTitle = resolveTrackTitle(
          e.payload.title,
          e.payload.outputFile ?? prev?.filePath,
          idx
        );
        playlistItemsRef.current.set(idx, {
          title: trackTitle,
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
        const entry = buildHistoryEntryFromDownload({
          jobId: e.payload.jobId,
          message,
          success,
          outputDir: outDir,
          outputFile,
          active: current,
          tracks: playlistTracksRef.current,
          playlistItems: playlistItemsRef.current,
          progressTitle: progressRef.current?.title,
          progressOutputFile: progressRef.current?.outputFile,
          lastOutputFile: lastOutputFileRef.current,
        });

        if (!current.isPlaylist && entry.filePath) {
          setLastDownloadedFile(entry.filePath);
        }

        setHistory(prependHistory(entry));
        const savedLastOutput = lastOutputFileRef.current;
        setActiveDownload(null);
        playlistItemsRef.current = new Map();
        lastOutputFileRef.current = undefined;

        if (
          current.isPlaylist &&
          isPlaceholderPlaylistTitle(entry.title) &&
          current.url
        ) {
          const jobId = entry.id;
          const folderHint =
            entry.children?.find((c) => c.filePath)?.filePath ??
            outputFile ??
            progressRef.current?.outputFile ??
            savedLastOutput;
          const fromFolder = titleFromPlaylistFolderPath(folderHint);
          if (fromFolder) {
            setHistory(
              updateHistoryEntry(jobId, {
                title: playlistDisplayTitle(
                  fromFolder,
                  fromFolder,
                  current.playlistId,
                  folderHint
                ),
                playlistFolder: playlistFolderPath(outDir, folderHint) ?? undefined,
              })
            );
          } else {
            void fetchMetadata(current.url, true)
              .then((meta) => {
                const better = playlistDisplayTitle(
                  meta.playlist_title,
                  meta.title,
                  current.playlistId ?? meta.playlist_id
                );
                if (!isPlaceholderPlaylistTitle(better)) {
                  setHistory(
                    updateHistoryEntry(jobId, {
                      title: better,
                      thumbnailUrl: meta.thumbnail_url ?? entry.thumbnailUrl,
                      itemCount: meta.entry_count ?? entry.itemCount,
                    })
                  );
                }
              })
              .catch(() => undefined);
          }
        }
      }
      if (!success && !message.toLowerCase().includes("cancelled")) {
        setPlaylistTracks([]);
        setPlaylistTotal(null);
      }
    });
    return () => {
      unProgress.then((f) => f());
      unComplete.then((f) => f());
    };
  }, []);

  const handleProbe = useCallback(async () => {
    const probeUrl = normalizeYoutubeUrl(url);
    if (!probeUrl || !looksLikeYoutubeUrl(probeUrl)) return;
    const requestId = ++probeRequestRef.current;

    const instant = instantMetadataFromUrl(probeUrl, isPlaylist);
    if (instant) setMetadata(instant);

    setProbing(true);
    setQualityMsg(isPlaylist ? "Fetching playlist info…" : "Fetching title & qualities…");

    try {
      const result = await probeVideo(
        probeUrl,
        isPlaylist,
        heightRef.current,
        isMp3
      );
      if (requestId !== probeRequestRef.current) return;

      setMetadata(result.metadata);
      availableHeightsRef.current = result.availableHeights ?? [];
      setQualities(result.qualities.length ? result.qualities : STANDARD);

      if (isMp3) {
        setQualityMsg(
          isPlaylist
            ? "Ready to download playlist audio"
            : "Ready to download audio"
        );
        return;
      }

      if (isPlaylist) {
        const count = result.metadata.entry_count;
        const folder =
          result.metadata.playlist_title && result.metadata.playlist_id
            ? `${result.metadata.playlist_title} [${result.metadata.playlist_id}]`
            : "playlist folder";
        setQualityMsg(
          count
            ? `Playlist ready — ${count} videos · max ${heightRef.current}p · saves to ${folder}/`
            : `Playlist ready — max ${heightRef.current}p per video · CLI-style folder naming`
        );
        return;
      }

      if (result.quality) {
        setQualityResolution(result.quality);
        setQualityMsg(result.quality.message);
        const chosen = result.quality.chosen_height;
        if (chosen != null && chosen < heightRef.current) {
          setHeight(chosen);
        }
      } else {
        setQualityMsg("Ready — pick a quality and start download");
      }
    } catch (e) {
      if (requestId !== probeRequestRef.current) return;
      setQualityMsg(String(e));
    } finally {
      if (requestId === probeRequestRef.current) setProbing(false);
    }
  }, [url, isPlaylist, isMp3]);

  useEffect(() => {
    const probeUrl = normalizeYoutubeUrl(url);
    if (!looksLikeYoutubeUrl(probeUrl)) {
      lastAutoProbeKeyRef.current = "";
      return;
    }

    const probeKey = `${probeUrl}|${isPlaylist}|${isMp3}`;
    if (probeKey === lastAutoProbeKeyRef.current) return;

    setMetadata(instantMetadataFromUrl(probeUrl, isPlaylist));
    setQualityMsg("");

    const timer = window.setTimeout(() => {
      lastAutoProbeKeyRef.current = probeKey;
      void handleProbe();
    }, 500);

    return () => {
      window.clearTimeout(timer);
      probeRequestRef.current += 1;
    };
  }, [url, isPlaylist, isMp3, handleProbe]);

  async function runDownload(forceRedownload = false, resumeEntry?: HistoryEntry) {
    const useUrl = resumeEntry?.url ?? url;
    const usePlaylist = resumeEntry?.isPlaylist ?? isPlaylist;
    const useMp3 = resumeEntry?.isMp3 ?? isMp3;
    const useHeight = resumeEntry?.requestedHeight ?? height;
    const useOutputDir = resumeEntry?.outputDir ?? outputDir;

    setBusy(true);
    setPreparing(true);
    setPreparingMessage(
      forceRedownload ? "Preparing redownload…" : "Preparing download…"
    );
    setCompleteMessage(null);
    setLastDownloadedFile(null);
    setDownloadQuality(null);
    setLogs([]);
    setProgress(null);
    setPaused(false);
    playlistItemsRef.current = new Map();
    setPlaylistTracks([]);
    setPlaylistTotal(null);
    lastOutputFileRef.current = undefined;
    try {
      let meta = metadata;
      const downloadUrl = normalizeYoutubeUrl(useUrl);

      // Refresh metadata in the background for UI only — never block yt-dlp startup.
      if (!hasDownloadMetadata(meta, usePlaylist) && downloadUrl) {
        void fetchMetadata(downloadUrl, usePlaylist)
          .then((fresh) => {
            setMetadata(fresh);
          })
          .catch(() => undefined);
      }

      setPreparingMessage("Starting yt-dlp…");

      let resolvedQuality = qualityResolution;
      if (!useMp3 && !usePlaylist && downloadUrl) {
        try {
          resolvedQuality = await resolveQuality(
            downloadUrl,
            useHeight,
            availableHeightsRef.current.length
              ? availableHeightsRef.current
              : undefined
          );
          setQualityResolution(resolvedQuality);
          setQualityMsg(resolvedQuality.message);
        } catch {
          resolvedQuality = null;
        }
      }

      setDownloadQuality(
        qualityInfoFromResolution(resolvedQuality, useMp3, usePlaylist, useHeight)
      );

      const downloadHeight =
        !useMp3 && resolvedQuality?.chosen_height != null
          ? resolvedQuality.chosen_height
          : useHeight;
      const downloadFormat =
        !useMp3 && resolvedQuality?.format_string
          ? resolvedQuality.format_string
          : undefined;

      if (usePlaylist && downloadUrl) {
        const total = meta?.entry_count ?? undefined;
        if (total) {
          setPlaylistTotal(total);
          setPlaylistTracks(placeholderPlaylistTracks(total));
        }

        // Load real titles in the background — do not block yt-dlp startup.
        void listPlaylistTitles(downloadUrl)
          .then((titles) => {
            if (!titles.length) return;
            setPlaylistTracks(
              buildPlaylistTracksFromTitles(titles, total ?? titles.length)
            );
            if (!total) setPlaylistTotal(titles.length);
          })
          .catch(() => undefined);
      }

      const playlistName = playlistDisplayTitle(
        meta?.playlist_title,
        meta?.title,
        meta?.playlist_id
      );

      setActiveDownload({
        url: downloadUrl,
        title: usePlaylist ? playlistName : meta?.title ?? downloadUrl,
        thumbnailUrl: meta?.thumbnail_url,
        isPlaylist: usePlaylist,
        isMp3: useMp3,
        playlistTitle: playlistName,
        playlistId: meta?.playlist_id,
        entryCount: meta?.entry_count,
        requestedHeight: useMp3 ? undefined : downloadHeight,
      });
      const id = await startDownload({
        url: downloadUrl,
        isPlaylist: usePlaylist,
        isMp3: useMp3,
        audioQuality: useMp3 ? "0" : undefined,
        requestedHeight: useMp3 ? undefined : downloadHeight,
        videoFormat: downloadFormat,
        outputDir: useOutputDir,
        usePlaylistFolder: usePlaylist,
        customFolderName: undefined,
        concurrentFragments,
        skipQualityCheck: !downloadFormat,
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
    const id = jobId;
    const snapshot = {
      active: activeDownloadRef.current,
      tracks: playlistTracksRef.current,
      playlistItems: new Map(playlistItemsRef.current),
      progressTitle: progressRef.current?.title,
      progressOutputFile: progressRef.current?.outputFile,
      lastOutputFile: lastOutputFileRef.current,
      outputDir,
    };

    const persistCancelled = () => {
      if (!snapshot.active) return;
      setHistory(
        prependHistory(
          buildHistoryEntryFromDownload({
            jobId: id,
            message: "Download cancelled",
            success: false,
            outputDir: snapshot.outputDir,
            active: snapshot.active,
            tracks: snapshot.tracks,
            playlistItems: snapshot.playlistItems,
            progressTitle: snapshot.progressTitle,
            progressOutputFile: snapshot.progressOutputFile,
            lastOutputFile: snapshot.lastOutputFile,
          })
        )
      );
      setCompleteMessage("Download cancelled");
      setJobId(null);
      setBusy(false);
      setPaused(false);
      setActiveDownload(null);
      playlistItemsRef.current = new Map();
    };

    try {
      await cancelDownload(id);
      persistCancelled();
    } catch (e) {
      persistCancelled();
      setCompleteMessage(String(e));
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

  function handleResumeFromHistory(entry: HistoryEntry) {
    setUrl(entry.url);
    setIsPlaylist(!!entry.isPlaylist);
    setIsMp3(!!entry.isMp3);
    if (entry.requestedHeight) setHeight(entry.requestedHeight);
    setOutputDirAndSave(entry.outputDir);
    setTab("download");
    void runDownload(false, entry);
  }

  function handleRedownloadFromHistory(entry: HistoryEntry) {
    setUrl(entry.url);
    setIsPlaylist(!!entry.isPlaylist);
    setIsMp3(!!entry.isMp3);
    if (entry.requestedHeight) setHeight(entry.requestedHeight);
    setOutputDirAndSave(entry.outputDir);
    setTab("download");
    void runDownload(true, entry);
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
          <img
            className="brand-icon"
            src="/icon.png"
            srcSet="/icon-64.png 64w, /icon.png 128w"
            sizes="40px"
            alt=""
            width={40}
            height={40}
          />
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
            onResume={handleResumeFromHistory}
            onRedownload={handleRedownloadFromHistory}
            onOpenFolder={openOutputFolder}
            onOpenFile={openMediaFile}
            onOpenLocation={openFileLocation}
            onOpenPlaylist={async (entry) => {
              const hints =
                entry.children?.map((c) => ({
                  title: c.title,
                  itemIndex: c.itemIndex,
                  filePath: c.filePath,
                })) ?? [];
              await openPlaylistInSystemPlayer({
                outputDir: entry.outputDir,
                hints,
                folderPath: playlistFolderForEntry(entry) ?? undefined,
                playlistId: playlistIdFromEntry(entry) ?? undefined,
              });
            }}
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
              setOutputDir={setOutputDirAndSave}
              metadata={metadata}
              busy={busy}
              probing={probing}
              preparing={preparing}
              canStart={looksLikeYoutubeUrl(normalizeYoutubeUrl(url)) && !!outputDir}
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
              onOpenPlaylistFolder={() => {
                const folder =
                  playlistFolderPath(
                    outputDir,
                    progress?.outputFile ?? lastDownloadedFile ?? undefined
                  ) ?? outputDir;
                return openOutputFolder(folder);
              }}
              outputDir={outputDir}
              outputFile={
                lastDownloadedFile ??
                progress?.outputFile ??
                undefined
              }
              completeMessage={completeMessage}
              isPlaylist={activeDownload?.isPlaylist ?? isPlaylist}
              playlistTitle={
                playlistDisplayTitle(
                  activeDownload?.playlistTitle ??
                    metadata?.playlist_title ??
                    metadata?.title,
                  metadata?.title,
                  metadata?.playlist_id ?? activeDownload?.playlistId
                )
              }
              playlistTotal={
                playlistTotal ??
                progress?.totalItems ??
                activeDownload?.entryCount ??
                metadata?.entry_count ??
                undefined
              }
              playlistTracks={playlistTracks}
              playlistFolder={playlistFolderPath(
                outputDir,
                progress?.outputFile ?? lastDownloadedFile ?? undefined
              )}
              downloadQuality={downloadQuality}
            />
          </>
        )}
      </main>
    </div>
  );
}
