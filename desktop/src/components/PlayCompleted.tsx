import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  hasNativePlayer,
  nativePlayerControl,
  nativePlayerAlive,
  nativePlayerLoad,
  nativePlayerPaused,
  nativePlayerProgress,
  nativePlayerSeek,
  nativePlayerSetVolume,
  nativePlayerVolume,
  openFileLocation,
  openMediaFile,
  resolvePlayableFiles,
  setCinemaPointerWatch,
  startNativePlayer,
  stopNativePlayer,
  updateNativePlayerBounds,
  type NativePlayerAction,
  type NativePlayerBounds,
  type PointerInWindow,
} from "../api";
import {
  getHighlightSegments,
  isPlaylistEntry,
  searchCompletedDownloads,
  type CompletedLibraryFilter,
} from "../searchCompleted";
import { entryDisplayTitle, entryMetaLabel, fileBasename } from "../history";
import { loadSettings, saveSettings } from "../settings";
import type { HistoryEntry, PlayableFile } from "../types";
import PlayerProgressBar from "./PlayerProgressBar";

interface QueueItem extends PlayableFile {
  entryId: string;
  entryTitle: string;
  thumbnailUrl?: string;
  isPlaylist: boolean;
}

interface Props {
  entries: HistoryEntry[];
  panelVisible?: boolean;
  playInBackground?: boolean;
  onBackgroundPlaybackChange?: (active: boolean) => void;
}

function isTransientMpvError(message: string): boolean {
  return (
    message.includes("Could not reach mpv") ||
    message.includes("Player is not running") ||
    message.includes("Invalid mpv response")
  );
}

function playlistTrackOptions(entry: HistoryEntry) {
  if (entry.children?.length) return entry.children;
  const count = entry.itemCount ?? 0;
  if (count <= 1) return [];
  return Array.from({ length: count }, (_, i) => ({
    id: `${entry.id}-track-${i + 1}`,
    itemIndex: i + 1,
    title: `Video ${i + 1}`,
  }));
}

const ALL_COMPLETED_LOADING_ID = "__all-completed__";
const BOUNDS_SYNC_TOLERANCE = 2;
const MIN_PLAYER_WIDTH = 120;
const MIN_PLAYER_HEIGHT = 48;
const HIDDEN_PLAYER_BOUNDS: NativePlayerBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  visible: false,
};

function boundsNearlyEqual(
  a: { x: number; y: number; width: number; height: number; visible?: boolean },
  b: { x: number; y: number; width: number; height: number; visible?: boolean }
): boolean {
  return (
    Boolean(a.visible ?? true) === Boolean(b.visible ?? true) &&
    Math.abs(a.x - b.x) <= BOUNDS_SYNC_TOLERANCE &&
    Math.abs(a.y - b.y) <= BOUNDS_SYNC_TOLERANCE &&
    Math.abs(a.width - b.width) <= BOUNDS_SYNC_TOLERANCE &&
    Math.abs(a.height - b.height) <= BOUNDS_SYNC_TOLERANCE
  );
}

function getPlayerBoundsFromRect(
  rect: DOMRect,
  cinemaMode: boolean,
  panelVisible: boolean
): NativePlayerBounds | null {
  if (!panelVisible || rect.width < 80 || rect.height < 40) return null;

  const offScreen =
    rect.bottom <= 0 ||
    rect.top >= window.innerHeight ||
    rect.right <= 0 ||
    rect.left >= window.innerWidth;

  if (offScreen) return HIDDEN_PLAYER_BOUNDS;

  const visLeft = Math.max(rect.left, 0);
  const visTop = Math.max(rect.top, 0);
  const visRight = Math.min(rect.right, window.innerWidth);
  const visBottom = Math.min(rect.bottom, window.innerHeight);
  const visW = visRight - visLeft;
  const visH = visBottom - visTop;

  if (visW < MIN_PLAYER_WIDTH || visH < MIN_PLAYER_HEIGHT) {
    return HIDDEN_PLAYER_BOUNDS;
  }

  const clipped =
    !cinemaMode &&
    (rect.top < -2 ||
      rect.bottom > window.innerHeight + 2 ||
      rect.left < -2 ||
      rect.right > window.innerWidth + 2);

  if (clipped) {
    // Scrolled above the viewport — never pin embed to y=0 (that overlaps the page header).
    if (rect.top < -2 || rect.left < -2) {
      return HIDDEN_PLAYER_BOUNDS;
    }
    return {
      x: Math.round(visLeft),
      y: Math.round(visTop),
      width: Math.round(visW),
      height: Math.round(visH),
      visible: true,
    };
  }

  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    visible: true,
  };
}

function PlayerIconRewind() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M11 7v10l-7-5 7-5zm1 0v2.5A6.5 6.5 0 0 1 18.5 16H20A8.5 8.5 0 0 0 12 7V7z" fill="currentColor" />
      <text x="13.5" y="15" fontSize="6" fontWeight="700" fill="currentColor">10</text>
    </svg>
  );
}

function PlayerIconForward() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M13 7v10l7-5-7-5zm-1 0v2.5A6.5 6.5 0 0 0 5.5 16H4A8.5 8.5 0 0 1 12 7v0z" fill="currentColor" />
      <text x="4.5" y="15" fontSize="6" fontWeight="700" fill="currentColor">10</text>
    </svg>
  );
}

function PlayerIconSkipPrevious() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M7 6v12l8-6-8-6zm9 0v12h2V6h-2z" fill="currentColor" />
    </svg>
  );
}

function PlayerIconSkipNext() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M17 18V6l-8 6 8 6zm-10 0V6H5v12h2z" fill="currentColor" />
    </svg>
  );
}

function PlayerIconReplay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path
        d="M12 6V3L7 8l5 5V9c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5H6c0 3.31 2.69 6 6 6s6-2.69 6-6-2.69-6-6-6z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayerIconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M8 6.2v11.6c0 .8.9 1.2 1.5.8l8.4-5.4c.6-.4.6-1.2 0-1.6L9.5 5.4C8.9 5 8 5.4 8 6.2z" fill="currentColor" />
    </svg>
  );
}

function PlayerIconPause() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <rect x="7" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" />
      <rect x="13.2" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}

function PlayerIconVolume({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume <= 0) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
        <path
          d="M4 10v4h3l5 4V6L7 10H4zm11.5 1.5L19 18l1.4-1.4-3.8-3.8 3.8-3.8L19 8l-3.5 3.5z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (volume < 35) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
        <path d="M4 10v4h3l5 4V6L7 10H4z" fill="currentColor" />
      </svg>
    );
  }

  if (volume < 70) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
        <path d="M4 10v4h3l5 4V6L7 10H4zm9.5 2c0-1.2-.68-2.23-1.67-2.76v5.52A2.99 2.99 0 0 0 13.5 12z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M4 10v4h3l5 4V6L7 10H4zm10.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" fill="currentColor" />
      <path d="M14 4.27v2.05c2.86.63 5 3.04 5 5.68s-2.14 5.05-5 5.68v2.05c4.01-.91 7-4.49 7-8.73s-2.99-7.82-7-8.73z" fill="currentColor" />
    </svg>
  );
}

function PlayerIconExpand({ exit = false }: { exit?: boolean }) {
  return exit ? (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M8 4H4v4l3.3-3.3L12 9.4 14.6 7 8.3.7 8 4zm8 0l-.3 3.3L14.6 7 17.2 9.6 20.7 6 20 4h-4zm0 16h4v-4l-3.3 3.3L12 14.6 9.4 17l6.3 6.3L16 20zm-8 0l.3-3.3L9.4 17 6.8 14.4 3.3 18 4 20h4z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden className="player-icon-svg">
      <path d="M7 7H3v4l3.3-3.3L12 10.4 14.6 8 8.3 1.7 7 3v4zm10 0V3h-4l3.3 3.3L12 10.4 9.4 8l6.3 6.3L17 13h4V7zM7 17H3v4h4l-1.7-1.3L12 13.6l2.6 2.6 6.3-6.3L17 11H7v6zm10 0v-4l-3.3 3.3L12 13.6 9.4 16l6.3 6.3L17 21h4v-4z" fill="currentColor" />
    </svg>
  );
}

export default function PlayCompleted({
  entries,
  panelVisible = true,
  playInBackground = false,
  onBackgroundPlaybackChange,
}: Props) {
  const completed = entries.filter((e) => e.status === "complete");
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<CompletedLibraryFilter>("all");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [preferEmbed, setPreferEmbed] = useState(true);
  const [playerMode, setPlayerMode] = useState<"embed" | "builtin">("embed");
  const [nativeActive, setNativeActive] = useState(false);
  const [playerPaused, setPlayerPaused] = useState(false);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(100);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [playbackEnded, setPlaybackEnded] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(
    () => loadSettings().playbackAutoplayNext
  );
  const [loopPlaylist, setLoopPlaylist] = useState(
    () => loadSettings().playbackLoopPlaylist
  );
  const [volumeHudVisible, setVolumeHudVisible] = useState(false);
  const [volumeHover, setVolumeHover] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [controlsIdle, setControlsIdle] = useState(false);
  const [blobSrc, setBlobSrc] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);
  const playerToolbarRef = useRef<HTMLDivElement>(null);
  const [cinemaToolbarH, setCinemaToolbarH] = useState(156);
  const cinemaToolbarInsetRef = useRef(156);
  const syncRafRef = useRef(0);
  const scrollSyncRafRef = useRef(0);
  const scrollEndTimerRef = useRef(0);
  const controlsIdleTimerRef = useRef(0);
  const cinemaBoundsTimerRef = useRef(0);
  const volumeHudTimerRef = useRef(0);
  const playInBackgroundRef = useRef(playInBackground);
  const panelVisibleRef = useRef(panelVisible);
  const playbackEndedRef = useRef(false);
  const autoplayNextRef = useRef(autoplayNext);
  const loopPlaylistRef = useRef(loopPlaylist);
  const currentIndexRef = useRef(currentIndex);
  const queueLengthRef = useRef(queue.length);
  const queueRef = useRef(queue);
  const embedSessionRef = useRef(false);
  const trackSwitchingRef = useRef(false);
  const playerRestartRef = useRef(false);
  const deadPlayerPollsRef = useRef(0);

  useEffect(() => {
    autoplayNextRef.current = autoplayNext;
  }, [autoplayNext]);

  useEffect(() => {
    loopPlaylistRef.current = loopPlaylist;
  }, [loopPlaylist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    queueLengthRef.current = queue.length;
    queueRef.current = queue;
  }, [queue]);

  const current = queue[currentIndex] ?? null;
  const upNext = queue.slice(currentIndex + 1);
  const hasQueueNav = queue.length > 1;
  const showUpNextList = hasQueueNav && current?.isPlaylist && upNext.length > 0 && upNext.length <= 8;

  useEffect(() => {
    playInBackgroundRef.current = playInBackground;
    panelVisibleRef.current = panelVisible;
  }, [playInBackground, panelVisible]);

  useEffect(() => {
    hasNativePlayer()
      .then((ok) => {
        setPreferEmbed(ok);
        if (!ok) setPlayerMode("builtin");
      })
      .catch(() => {
        setPreferEmbed(false);
        setPlayerMode("builtin");
      });
    return () => {
      if (!playInBackgroundRef.current) {
        embedSessionRef.current = false;
        void stopNativePlayer();
      }
    };
  }, []);

  useEffect(() => {
    const active = nativeActive && queue.length > 0 && Boolean(current);
    onBackgroundPlaybackChange?.(Boolean(playInBackground && !panelVisible && active));
  }, [
    playInBackground,
    panelVisible,
    nativeActive,
    queue.length,
    current,
    onBackgroundPlaybackChange,
  ]);

  useEffect(() => {
    return () => {
      if (blobSrc) URL.revokeObjectURL(blobSrc);
    };
  }, [blobSrc]);

  const buildQueue = useCallback(
    async (entry: HistoryEntry, startAt = 0, playAll = false): Promise<QueueItem[]> => {
      const hints =
        isPlaylistEntry(entry) && entry.children?.length
          ? entry.children.map((c) => ({
              title: c.title,
              itemIndex: c.itemIndex,
              filePath: c.filePath,
            }))
          : [{ title: entry.title, filePath: entry.filePath }];

      const files = await resolvePlayableFiles(entry.outputDir, hints);
      if (!files.length) return [];

      const playlist = isPlaylistEntry(entry);
      let ordered = files;

      if (playlist && !playAll && startAt > 0) {
        const idx = files.findIndex((f) => f.itemIndex === startAt);
        if (idx >= 0) ordered = [...files.slice(idx), ...files.slice(0, idx)];
      }

      return ordered.map((f) => ({
        ...f,
        title: fileBasename(f.path) || f.title,
        entryId: entry.id,
        entryTitle: entry.title,
        thumbnailUrl: entry.thumbnailUrl,
        isPlaylist: playlist && ordered.length > 1,
      }));
    },
    []
  );

  const scrollPlayerIntoView = useCallback(() => {
    const wrap = playerWrapRef.current;
    if (!wrap) return;
    const main = wrap.closest(".main--play");
    if (main instanceof HTMLElement) {
      main.scrollTop = 0;
    }
    wrap.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  async function playEntry(entry: HistoryEntry, startAt = 0, playAll = true) {
    setLoadingId(entry.id);
    setError("");
    try {
      const items = await buildQueue(entry, startAt, playAll);
      if (!items.length) {
        setError(`No playable files found in destination for "${entryDisplayTitle(entry)}".`);
        return;
      }
      setQueue(items);
      embedSessionRef.current = false;
      setCurrentIndex(0);
      window.requestAnimationFrame(() => scrollPlayerIntoView());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingId(null);
    }
  }

  async function playSingleItem(entry: HistoryEntry, itemIndex: number) {
    await playEntry(entry, itemIndex, false);
  }

  async function playAllCompleted() {
    if (!completed.length) return;
    setLoadingId(ALL_COMPLETED_LOADING_ID);
    setError("");
    try {
      const allItems: QueueItem[] = [];
      for (const entry of completed) {
        const items = await buildQueue(entry, 0, true);
        allItems.push(...items);
      }
      if (!allItems.length) {
        setError("No playable files found in completed downloads.");
        return;
      }
      setQueue(allItems);
      embedSessionRef.current = false;
      setCurrentIndex(0);
      window.requestAnimationFrame(() => scrollPlayerIntoView());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingId(null);
    }
  }

  const isLibraryLoading = loadingId != null;

  const handleVideoError = useCallback(async () => {
    if (!current || current.isAudio) return;

    const streamSrc = convertFileSrc(current.path, "ytd-media");
    if (!blobSrc && videoRef.current) {
      try {
        const resp = await fetch(streamSrc);
        if (resp.ok) {
          const raw = await resp.blob();
          const typed =
            raw.type && raw.type.includes("video")
              ? raw
              : new Blob([raw], { type: "video/mp4" });
          const url = URL.createObjectURL(typed);
          setBlobSrc(url);
          setError("");
          return;
        }
      } catch {
        // try mpv embed next
      }
    }

    if (playerMode === "builtin") {
      try {
        const canEmbed = await hasNativePlayer();
        if (canEmbed) {
          setPlayerMode("embed");
          setError("");
          return;
        }
      } catch {
        // fall through
      }
    }

    setError("Built-in player could not load this file. Use Open in system player.");
  }, [current, blobSrc, playerMode]);

  const resetPlaybackEnded = useCallback(() => {
    playbackEndedRef.current = false;
    setPlaybackEnded(false);
  }, []);

  const replayCurrent = useCallback(async () => {
    resetPlaybackEnded();
    try {
      if (nativeActiveRef.current && playerModeRef.current === "embed") {
        await nativePlayerSeek(0);
        if (await nativePlayerPaused()) {
          await nativePlayerControl("pause");
        }
        return;
      }
      const el = current?.isAudio ? audioRef.current : videoRef.current;
      if (el) {
        el.currentTime = 0;
        await el.play();
      }
    } catch (e) {
      if (!isTransientMpvError(String(e))) {
        setError(String(e));
      }
    }
  }, [current?.isAudio, resetPlaybackEnded]);

  const handlePlaybackEndedRef = useRef<() => void>(() => {});

  function handleEnded() {
    handlePlaybackEndedRef.current();
  }

  useEffect(() => {
    setBlobSrc("");
    setCinemaMode(false);
    resetPlaybackEnded();
    if (preferEmbed) setPlayerMode("embed");
  }, [current?.path, preferEmbed, resetPlaybackEnded]);

  const controlsWakeThrottleRef = useRef(0);
  const lastBoundsKeyRef = useRef("");
  const lastBoundsRef = useRef<NativePlayerBounds | null>(null);
  const controlsIdleRef = useRef(false);
  const cinemaModeRef = useRef(false);
  const nativeActiveRef = useRef(false);
  const playerModeRef = useRef<"embed" | "builtin">("embed");

  const getPlayerBounds = useCallback((): NativePlayerBounds | null => {
    const wrap = playerWrapRef.current;
    if (!wrap) return null;
    return getPlayerBoundsFromRect(
      wrap.getBoundingClientRect(),
      cinemaModeRef.current,
      panelVisibleRef.current
    );
  }, []);

  const startNative = useCallback(async (): Promise<"ok" | "retry" | "fail"> => {
    if (!current || current.isAudio || playerMode !== "embed") return "fail";
    const bounds = getPlayerBounds();
    if (!bounds || !bounds.visible) return "retry";
    try {
      await startNativePlayer({
        path: current.path,
        bounds: { ...bounds, visible: true },
      });
      setError("");
      embedSessionRef.current = true;
      setNativeActive(true);
      deadPlayerPollsRef.current = 0;
      lastBoundsRef.current = null;
      lastBoundsKeyRef.current = "";
      const reveal = async () => {
        const b = getPlayerBounds();
        if (!b?.visible) return false;
        try {
          await updateNativePlayerBounds({ bounds: b });
          try {
            await nativePlayerControl("fitWindow");
          } catch {
            // mpv IPC may still be starting; embed is already visible
          }
          return true;
        } catch {
          return false;
        }
      };
      if (await reveal()) return "ok";
      window.setTimeout(() => {
        void (async () => {
          if (await reveal()) return;
          window.setTimeout(() => void reveal(), 250);
        })();
      }, 120);
      return "ok";
    } catch (e) {
      embedSessionRef.current = false;
      setNativeActive(false);
      const msg = String(e);
      if (msg.includes("embed_unavailable")) {
        setError(
          "In-app mpv player could not start (needs X11). Use Open in system player below."
        );
      } else if (!isTransientMpvError(msg)) {
        setError(msg);
      }
      return "fail";
    }
  }, [current, playerMode, getPlayerBounds]);

  const restartNativePlayback = useCallback(async () => {
    if (playerRestartRef.current || !current || current.isAudio || playerMode !== "embed") {
      return;
    }
    playerRestartRef.current = true;
    embedSessionRef.current = false;
    setNativeActive(false);
    try {
      await stopNativePlayer();
      await startNative();
    } finally {
      playerRestartRef.current = false;
    }
  }, [current, playerMode, startNative]);

  const switchToTrack = useCallback(
    async (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= queueLengthRef.current) return;
      const item = queueRef.current[nextIndex];
      if (!item) return;

      trackSwitchingRef.current = true;
      resetPlaybackEnded();
      setCurrentIndex(nextIndex);

      if (item.isAudio || playerModeRef.current !== "embed") {
        trackSwitchingRef.current = false;
        embedSessionRef.current = false;
        return;
      }

      if (embedSessionRef.current) {
        try {
          await nativePlayerLoad(item.path);
          const alive = await nativePlayerAlive();
          if (!alive) {
            throw new Error("Player is not running.");
          }
          setPlayerPosition(0);
          setPlayerDuration(0);
          setPlayerPaused(false);
          setNativeActive(true);
          const bounds = getPlayerBounds();
          if (bounds?.visible) {
            await updateNativePlayerBounds({ bounds });
          }
          trackSwitchingRef.current = false;
          return;
        } catch {
          embedSessionRef.current = false;
          trackSwitchingRef.current = false;
          void restartNativePlayback();
          return;
        }
      }

      trackSwitchingRef.current = false;
      void startNative();
    },
    [getPlayerBounds, resetPlaybackEnded, startNative, restartNativePlayback]
  );

  const handlePlaybackEnded = useCallback(() => {
    if (playbackEndedRef.current || trackSwitchingRef.current) return;
    playbackEndedRef.current = true;
    setPlaybackEnded(true);

    const idx = currentIndexRef.current;
    const total = queueLengthRef.current;

    if (autoplayNextRef.current) {
      if (idx + 1 < total) {
        void switchToTrack(idx + 1);
        return;
      }
      if (loopPlaylistRef.current && total > 1) {
        void switchToTrack(0);
        return;
      }
    }

    if (loopPlaylistRef.current && total === 1) {
      playbackEndedRef.current = false;
      setPlaybackEnded(false);
      window.queueMicrotask(() => {
        void replayCurrent();
      });
    }
  }, [replayCurrent, switchToTrack]);

  useEffect(() => {
    handlePlaybackEndedRef.current = handlePlaybackEnded;
  }, [handlePlaybackEnded]);

  function goToPreviousTrack() {
    if (currentIndex > 0) void switchToTrack(currentIndex - 1);
  }

  function goToNextTrack() {
    if (currentIndex + 1 < queue.length) void switchToTrack(currentIndex + 1);
  }

  const syncNativeBounds = useCallback(
    async (options?: { applyFill?: boolean }) => {
      if (!nativeActive || playerMode !== "embed") return;
      const bounds = getPlayerBounds();
      if (!bounds) return;
      if (lastBoundsRef.current && boundsNearlyEqual(lastBoundsRef.current, bounds)) return;

      const key = `${bounds.visible ? 1 : 0},${bounds.x},${bounds.y},${bounds.width},${bounds.height}`;
      lastBoundsKeyRef.current = key;
      lastBoundsRef.current = bounds;
      try {
        await updateNativePlayerBounds({ bounds });
        if (options?.applyFill && cinemaMode && bounds.visible) {
          await nativePlayerControl("fillFrame");
        }
      } catch {
        // ignore resize glitches
      }
    },
    [nativeActive, playerMode, getPlayerBounds, cinemaMode]
  );

  const forceRevealEmbed = useCallback(async () => {
    if (!nativeActiveRef.current || playerModeRef.current !== "embed") return;
    lastBoundsRef.current = null;
    lastBoundsKeyRef.current = "";
    const bounds = getPlayerBounds();
    if (!bounds?.visible) return;
    try {
      await updateNativePlayerBounds({ bounds: { ...bounds, visible: true } });
      await nativePlayerControl("fitWindow");
      if (cinemaModeRef.current) {
        await nativePlayerControl("fillFrame");
      }
    } catch {
      // ignore reveal glitches
    }
  }, [getPlayerBounds]);

  const scheduleCinemaBoundsSync = useCallback(
    (applyFill = false) => {
      if (!cinemaModeRef.current || !nativeActiveRef.current) return;
      window.clearTimeout(cinemaBoundsTimerRef.current);
      cinemaBoundsTimerRef.current = window.setTimeout(() => {
        lastBoundsKeyRef.current = "";
        lastBoundsRef.current = null;
        void syncNativeBounds({ applyFill });
      }, 150);
    },
    [syncNativeBounds]
  );

  const scheduleSyncBounds = useCallback(
    (force = false) => {
      if (!nativeActive || playerMode !== "embed" || cinemaMode || !panelVisibleRef.current) {
        return;
      }
      if (force) lastBoundsRef.current = null;
      window.cancelAnimationFrame(syncRafRef.current);
      syncRafRef.current = window.requestAnimationFrame(() => {
        void syncNativeBounds();
      });
    },
    [nativeActive, playerMode, cinemaMode, syncNativeBounds]
  );

  useEffect(() => {
    if (!queue.length || !panelVisible) return;

    scrollPlayerIntoView();
    lastBoundsRef.current = null;
    lastBoundsKeyRef.current = "";

    const timers = [0, 120, 320, 600].map((ms) =>
      window.setTimeout(() => {
        scrollPlayerIntoView();
        lastBoundsRef.current = null;
        scheduleSyncBounds(true);
        void forceRevealEmbed();
      }, ms)
    );

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [
    queue.length,
    current?.path,
    panelVisible,
    scrollPlayerIntoView,
    scheduleSyncBounds,
    forceRevealEmbed,
  ]);

  const startScrollBoundsLoop = useCallback(() => {
    if (!nativeActive || playerMode !== "embed" || cinemaMode || !panelVisibleRef.current) {
      return;
    }

    const tick = () => {
      lastBoundsRef.current = null;
      void syncNativeBounds();
      scrollSyncRafRef.current = window.requestAnimationFrame(tick);
    };

    if (!scrollSyncRafRef.current) {
      scrollSyncRafRef.current = window.requestAnimationFrame(tick);
    }

    window.clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = window.setTimeout(() => {
      window.cancelAnimationFrame(scrollSyncRafRef.current);
      scrollSyncRafRef.current = 0;
      lastBoundsRef.current = null;
      void syncNativeBounds();
    }, 160);
  }, [nativeActive, playerMode, cinemaMode, syncNativeBounds]);

  useEffect(() => {
    if (!current) {
      embedSessionRef.current = false;
      void stopNativePlayer();
      setNativeActive(false);
      return;
    }

    if (current.isAudio || playerMode !== "embed") {
      embedSessionRef.current = false;
      void stopNativePlayer();
      setNativeActive(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25;

    const tryStart = async () => {
      if (cancelled) return;
      if (trackSwitchingRef.current) {
        window.setTimeout(() => void tryStart(), 120);
        return;
      }

      if (embedSessionRef.current) {
        const alive = await nativePlayerAlive();
        if (alive) {
          setNativeActive(true);
          const bounds = getPlayerBounds();
          if (bounds?.visible) {
            void updateNativePlayerBounds({ bounds: { ...bounds, visible: true } });
            void forceRevealEmbed();
          }
          return;
        }
        embedSessionRef.current = false;
        setNativeActive(false);
        await stopNativePlayer();
      }

      attempts += 1;
      const result = await startNative();
      if (cancelled) return;
      if (result === "retry" && attempts < maxAttempts) {
        window.setTimeout(() => void tryStart(), 120);
        return;
      }
      if (result === "fail" && attempts < 3) {
        embedSessionRef.current = false;
        await stopNativePlayer();
        window.setTimeout(() => void tryStart(), 250);
        return;
      }
      if (!nativeActiveRef.current && !cancelled) {
        setError(
          "In-app player could not start. Try again or use Open in system player below."
        );
      }
    };

    scrollPlayerIntoView();
    let timer = window.setTimeout(() => void tryStart(), 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [current?.path, current?.isAudio, playerMode, startNative, getPlayerBounds, forceRevealEmbed, scrollPlayerIntoView]);

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed" || cinemaMode || !panelVisible) return;
    const el = playerWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      scheduleSyncBounds(true);
    });
    ro.observe(el);

    const card = el.closest(".player-card");
    if (card) ro.observe(card);

    const playerSection = el.closest(".play-completed-player");
    if (playerSection) ro.observe(playerSection);

    const scrollRoot = el.closest(".main--play");
    if (scrollRoot) ro.observe(scrollRoot);

    const onResize = () => startScrollBoundsLoop();
    window.addEventListener("resize", onResize);

    const onScroll = () => startScrollBoundsLoop();
    scrollRoot?.addEventListener("scroll", onScroll, { passive: true });

    scheduleSyncBounds(true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      scrollRoot?.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(syncRafRef.current);
      window.cancelAnimationFrame(scrollSyncRafRef.current);
      scrollSyncRafRef.current = 0;
      window.clearTimeout(scrollEndTimerRef.current);
    };
  }, [nativeActive, playerMode, cinemaMode, panelVisible, scheduleSyncBounds, startScrollBoundsLoop]);

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed" || !panelVisible) return;
    lastBoundsRef.current = null;
    window.requestAnimationFrame(() => {
      scheduleSyncBounds(true);
    });
  }, [nativeActive, playerMode, panelVisible, scheduleSyncBounds]);

  const syncCursorVisibility = useCallback(async () => {
      const win = getCurrentWindow();
      if (
        !nativeActiveRef.current ||
        playerModeRef.current !== "embed" ||
        !cinemaModeRef.current ||
        !controlsIdleRef.current
      ) {
        await win.setCursorVisible(true);
        return;
      }

      await win.setCursorVisible(false);
  }, []);

  const scheduleControlsIdle = useCallback(() => {
    if (!cinemaModeRef.current) return;
    window.clearTimeout(controlsIdleTimerRef.current);
    controlsIdleTimerRef.current = window.setTimeout(() => {
      if (!cinemaModeRef.current) return;
      controlsIdleRef.current = true;
      setControlsIdle(true);
    }, 2500);
  }, []);

  const setControlsActive = useCallback(() => {
    controlsIdleRef.current = false;
    setControlsIdle(false);
  }, []);

  useEffect(() => {
    if (panelVisible) return;

    window.clearTimeout(controlsIdleTimerRef.current);
    setCinemaMode(false);
    cinemaModeRef.current = false;
    setControlsActive();
    void getCurrentWindow().setCursorVisible(true);
    void setCinemaPointerWatch(false);

    if (!playInBackground) return;

    lastBoundsRef.current = null;
    if (nativeActive && playerMode === "embed") {
      void updateNativePlayerBounds({ bounds: HIDDEN_PLAYER_BOUNDS });
    }
  }, [panelVisible, playInBackground, nativeActive, playerMode, setControlsActive]);

  useEffect(() => {
    if (!playInBackground && !panelVisible) {
      void stopNativePlayer();
      setNativeActive(false);
      setQueue([]);
      setCurrentIndex(0);
      onBackgroundPlaybackChange?.(false);
    }
  }, [playInBackground, panelVisible, onBackgroundPlaybackChange]);

  useEffect(() => {
    if (!panelVisible || playerMode !== "embed") return;

    let cancelled = false;
    const restore = () => {
      if (cancelled) return;
      lastBoundsRef.current = null;
      lastBoundsKeyRef.current = "";
      if (nativeActive) {
        void forceRevealEmbed();
        return;
      }
      const wrap = playerWrapRef.current;
      if (!wrap || !current || current.isAudio) return;
      void startNative();
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });

    return () => {
      cancelled = true;
    };
  }, [panelVisible, nativeActive, playerMode, current, syncNativeBounds, startNative, forceRevealEmbed]);

  const wakeControls = useCallback(
    (force = false) => {
      if (!cinemaModeRef.current) return;

      const now = Date.now();
      if (!force && now - controlsWakeThrottleRef.current < 150) {
        if (!controlsIdleRef.current) scheduleControlsIdle();
        return;
      }
      controlsWakeThrottleRef.current = now;

      const wasIdle = controlsIdleRef.current;
      if (wasIdle) {
        setControlsActive();
        void getCurrentWindow().setCursorVisible(true);
        scheduleCinemaBoundsSync();
      }
      scheduleControlsIdle();
    },
    [scheduleControlsIdle, setControlsActive, scheduleCinemaBoundsSync]
  );

  const toggleCinema = useCallback(() => {
    setCinemaMode((on) => {
      const next = !on;
      cinemaModeRef.current = next;
      if (next) {
        setControlsActive();
        window.setTimeout(scheduleControlsIdle, 100);
      } else {
        window.clearTimeout(controlsIdleTimerRef.current);
        setControlsActive();
        void getCurrentWindow().setCursorVisible(true);
      }
      return next;
    });
  }, [scheduleControlsIdle, setControlsActive]);

  const handlePlayerDoubleClick = useCallback(() => {
    if (!current || current.isAudio) return;
    if (playerMode === "embed" && !nativeActive) return;
    wakeControls(true);
    toggleCinema();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void forceRevealEmbed();
      });
    });
  }, [current, playerMode, nativeActive, wakeControls, toggleCinema, forceRevealEmbed]);

  const showVolumeHud = useCallback(() => {
    setVolumeHudVisible(true);
    window.clearTimeout(volumeHudTimerRef.current);
    volumeHudTimerRef.current = window.setTimeout(() => setVolumeHudVisible(false), 2500);
  }, []);

  const sendPlayerAction = useCallback(
    async (action: NativePlayerAction) => {
      try {
        await nativePlayerControl(action);
        if (action === "pause") {
          const paused = await nativePlayerPaused();
          setPlayerPaused(paused);
        }
        if (action === "mute" || action === "volumeUp" || action === "volumeDown") {
          const { volume, muted } = await nativePlayerVolume();
          setPlayerVolume(volume);
          setPlayerMuted(muted);
          showVolumeHud();
        }
      } catch (e) {
        if (!isTransientMpvError(String(e))) {
          setError(String(e));
        }
      }
    },
    [showVolumeHud]
  );

  const refreshPlayerPaused = useCallback(async () => {
    if (!nativeActive || playerMode !== "embed") return;
    try {
      const paused = await nativePlayerPaused();
      setPlayerPaused(paused);
    } catch {
      // ignore polling glitches
    }
  }, [nativeActive, playerMode]);

  const refreshPlayerProgress = useCallback(async () => {
    if (!nativeActive || playerMode !== "embed" || trackSwitchingRef.current) return;
    try {
      const { position, duration, ended } = await nativePlayerProgress();
      setPlayerPosition(position);
      setPlayerDuration(duration);

      const alive = await nativePlayerAlive();
      if (!alive) {
        deadPlayerPollsRef.current += 1;
        if (deadPlayerPollsRef.current >= 2 && !playerRestartRef.current) {
          deadPlayerPollsRef.current = 0;
          void restartNativePlayback();
        }
        return;
      }
      deadPlayerPollsRef.current = 0;

      if (
        !playbackEndedRef.current &&
        (ended || (duration > 0.5 && position >= Math.max(0, duration - 0.35)))
      ) {
        handlePlaybackEnded();
      }
    } catch {
      // ignore transient IPC glitches during polling
    }
  }, [nativeActive, playerMode, handlePlaybackEnded, restartNativePlayback]);

  const refreshPlayerVolume = useCallback(async () => {
    if (!nativeActive || playerMode !== "embed") return;
    try {
      const { volume, muted } = await nativePlayerVolume();
      setPlayerVolume(volume);
      setPlayerMuted(muted);
    } catch {
      // ignore polling glitches
    }
  }, [nativeActive, playerMode]);

  const handleVolumeChange = useCallback(
    async (nextVolume: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(nextVolume)));
      try {
        await nativePlayerSetVolume(clamped);
        setPlayerVolume(clamped);
        setPlayerMuted(clamped === 0);
        showVolumeHud();
        wakeControls(true);
      } catch (e) {
        if (!isTransientMpvError(String(e))) {
          setError(String(e));
        }
      }
    },
    [showVolumeHud, wakeControls]
  );

  const handlePlayerSeek = useCallback(
    async (seconds: number) => {
      try {
        await nativePlayerSeek(seconds);
        setPlayerPosition(seconds);
        wakeControls(true);
      } catch (e) {
        if (!isTransientMpvError(String(e))) {
          setError(String(e));
        }
      }
    },
    [wakeControls]
  );

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed") {
      setPlayerPaused(false);
      setPlayerPosition(0);
      setPlayerDuration(0);
      setPlayerVolume(100);
      setPlayerMuted(false);
      setVolumeHudVisible(false);
      return;
    }

    void refreshPlayerPaused();
    void refreshPlayerProgress();
    void refreshPlayerVolume();
    const id = window.setInterval(() => {
      void refreshPlayerPaused();
      void refreshPlayerProgress();
      void refreshPlayerVolume();
    }, 500);
    return () => window.clearInterval(id);
  }, [nativeActive, playerMode, refreshPlayerPaused, refreshPlayerProgress, refreshPlayerVolume]);

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed" || !panelVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      let action: NativePlayerAction | null = null;
      switch (event.key) {
        case " ":
        case "k":
          if (playbackEnded) {
            event.preventDefault();
            void replayCurrent();
            return;
          }
          action = "pause";
          break;
        case "ArrowLeft":
        case "j":
          if (event.shiftKey && hasQueueNav && currentIndex > 0) {
            event.preventDefault();
            goToPreviousTrack();
            return;
          }
          action = "seekBack";
          break;
        case "ArrowRight":
        case "l":
          if (event.shiftKey && hasQueueNav && currentIndex < queue.length - 1) {
            event.preventDefault();
            goToNextTrack();
            return;
          }
          action = "seekForward";
          break;
        case "[":
          if (hasQueueNav && currentIndex > 0) {
            event.preventDefault();
            goToPreviousTrack();
            return;
          }
          break;
        case "]":
          if (hasQueueNav && currentIndex < queue.length - 1) {
            event.preventDefault();
            goToNextTrack();
            return;
          }
          break;
        case "f":
          toggleCinema();
          break;
        case "m":
          action = "mute";
          break;
        case "ArrowUp":
          event.preventDefault();
          action = "volumeUp";
          break;
        case "ArrowDown":
          event.preventDefault();
          action = "volumeDown";
          break;
        default:
          break;
      }

      if (!action) {
        if (event.key === "Escape" && cinemaMode) {
          window.clearTimeout(controlsIdleTimerRef.current);
          setControlsActive();
          cinemaModeRef.current = false;
          setCinemaMode(false);
          void getCurrentWindow().setCursorVisible(true);
        }
        return;
      }
      if (action === "pause") event.preventDefault();
      wakeControls(true);
      void sendPlayerAction(action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    nativeActive,
    playerMode,
    panelVisible,
    sendPlayerAction,
    cinemaMode,
    toggleCinema,
    wakeControls,
    setControlsActive,
    hasQueueNav,
    currentIndex,
    queue.length,
    playbackEnded,
    replayCurrent,
  ]);

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed") return;

    lastBoundsKeyRef.current = "";
    lastBoundsRef.current = null;

    const t = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        void syncNativeBounds({ applyFill: cinemaMode });
        void forceRevealEmbed();
      });
    }, cinemaMode ? 300 : 200);

    return () => window.clearTimeout(t);
  }, [cinemaMode, nativeActive, playerMode, syncNativeBounds, forceRevealEmbed]);

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed" || !current || current.isAudio) return;

    let unlisten: (() => void) | undefined;
    void listen("player-double-click", () => {
      handlePlayerDoubleClick();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [nativeActive, playerMode, current, handlePlayerDoubleClick]);

  useEffect(() => {
    if (!nativeActive || playerMode !== "embed") {
      void setCinemaPointerWatch(false);
      return;
    }

    void setCinemaPointerWatch(true);
    return () => {
      void setCinemaPointerWatch(false);
    };
  }, [nativeActive, playerMode]);

  useEffect(() => {
    if (!nativeActive || !cinemaMode || playerMode !== "embed") {
      return;
    }

    let unlisten: (() => void) | undefined;

    void listen<PointerInWindow>("cinema-pointer", () => {
      if (controlsIdleRef.current) {
        wakeControls(true);
      } else {
        scheduleControlsIdle();
      }
      void syncCursorVisibility();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [
    cinemaMode,
    nativeActive,
    playerMode,
    wakeControls,
    scheduleControlsIdle,
    syncCursorVisibility,
  ]);

  useEffect(() => {
    controlsIdleRef.current = controlsIdle;
    if (!cinemaMode || !nativeActive) return;

    void syncCursorVisibility();
    if (!controlsIdle) {
      void getCurrentWindow().setCursorVisible(true);
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduleCinemaBoundsSync();
      });
    });
  }, [controlsIdle, cinemaMode, nativeActive, scheduleCinemaBoundsSync, syncCursorVisibility]);

  useEffect(() => {
    const toolbar = playerToolbarRef.current;
    if (!toolbar || !cinemaMode || !nativeActive) return;

    const updateToolbarHeight = () => {
      if (controlsIdleRef.current) return;
      const next = Math.ceil(toolbar.offsetHeight);
      if (next <= 0) return;
      if (Math.abs(next - cinemaToolbarInsetRef.current) < 8) return;
      cinemaToolbarInsetRef.current = next;
      setCinemaToolbarH(next);
      scheduleCinemaBoundsSync();
    };

    updateToolbarHeight();
    const ro = new ResizeObserver(updateToolbarHeight);
    ro.observe(toolbar);
    return () => ro.disconnect();
  }, [cinemaMode, nativeActive, scheduleCinemaBoundsSync]);

  useEffect(() => {
    cinemaModeRef.current = cinemaMode;
    if (!cinemaMode) {
      window.clearTimeout(controlsIdleTimerRef.current);
      setControlsActive();
      void getCurrentWindow().setCursorVisible(true);
    } else if (nativeActive && playerMode === "embed") {
      window.setTimeout(scheduleControlsIdle, 100);
    }
  }, [cinemaMode, nativeActive, playerMode, scheduleControlsIdle, setControlsActive]);

  useEffect(() => {
    nativeActiveRef.current = nativeActive;
    playerModeRef.current = playerMode;
    if (!nativeActive || playerMode !== "embed") {
      window.clearTimeout(controlsIdleTimerRef.current);
      setControlsActive();
      void getCurrentWindow().setCursorVisible(true);
      return;
    }

    if (cinemaMode) {
      setControlsActive();
      window.setTimeout(scheduleControlsIdle, 100);
    }
  }, [nativeActive, playerMode, cinemaMode, scheduleControlsIdle, setControlsActive]);

  useEffect(() => {
    return () => {
      window.clearTimeout(controlsIdleTimerRef.current);
      window.clearTimeout(cinemaBoundsTimerRef.current);
      window.clearTimeout(volumeHudTimerRef.current);
      window.clearTimeout(scrollEndTimerRef.current);
      window.cancelAnimationFrame(scrollSyncRafRef.current);
      void getCurrentWindow().setCursorVisible(true);
    };
  }, []);

  const useBuiltinVideo = current && !current.isAudio && playerMode === "builtin";

  const streamSrc =
    current && (current.isAudio || useBuiltinVideo)
      ? convertFileSrc(current.path, "ytd-media")
      : "";

  const mediaSrc = blobSrc || streamSrc;

  useEffect(() => {
    if (!current || !mediaSrc || playerMode === "embed") return;
    const el = current.isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    setError("");
    el.load();
  }, [mediaSrc, current?.isAudio, currentIndex, playerMode]);

  const filteredCompleted = useMemo(
    () => searchCompletedDownloads(completed, searchQuery, libraryFilter),
    [completed, searchQuery, libraryFilter]
  );

  if (!panelVisible && !playInBackground) {
    return null;
  }

  const hasActiveSearch = searchQuery.trim().length > 0 || libraryFilter !== "all";
  const showVolumeUi = volumeHudVisible || volumeHover;
  const volumeSliderValue = playerMuted ? 0 : playerVolume;
  const volumeLabel = playerMuted ? "Muted" : `${Math.round(playerVolume)}%`;

  return (
    <div
      className={`play-completed${cinemaMode ? " play-completed--cinema" : ""}${
        !panelVisible ? " play-completed--panel-hidden" : ""
      }`}
      aria-hidden={!panelVisible}
    >
      <div className="play-completed-player">
        <div
          className={`card player-card${cinemaMode ? " player-card--cinema" : ""}${
            controlsIdle && cinemaMode && nativeActive ? " player-card--cinema-idle" : ""
          }`}
        >
        {cinemaMode && (
          <button
            type="button"
            className="player-cinema-back"
            title="Back to player (Esc)"
            aria-label="Exit fullscreen"
            onClick={() => toggleCinema()}
          >
            ← Back
          </button>
        )}
        {!cinemaMode && <h2>Now playing</h2>}
        {current ? (
          <>
            <div
              className={`player-wrap${cinemaMode ? " player-wrap--cinema" : ""}${
                cinemaMode && !controlsIdle ? " player-wrap--cinema-bar" : ""
              }${controlsIdle && cinemaMode && nativeActive ? " player-wrap--controls-idle" : ""}${
                nativeActive ? " player-wrap--active" : ""
              }`}
              ref={playerWrapRef}
              onDoubleClick={handlePlayerDoubleClick}
              style={
                cinemaMode
                  ? ({ ["--cinema-toolbar-h" as string]: `${cinemaToolbarH}px` } as CSSProperties)
                  : undefined
              }
            >
              {playerMode === "embed" && !current.isAudio ? (
                <div className="player-native-hole">
                  {!nativeActive && (
                    <p className="hint player-native-loading">Starting player…</p>
                  )}
                  {nativeActive && volumeHudVisible && (
                    <div className="player-volume-hud" aria-live="polite">
                      <PlayerIconVolume muted={playerMuted} volume={playerVolume} />
                      <div className="player-volume-hud-track" aria-hidden>
                        <div
                          className="player-volume-hud-fill"
                          style={{ width: `${volumeSliderValue}%` }}
                        />
                      </div>
                      <span className="player-volume-hud-label">{volumeLabel}</span>
                    </div>
                  )}
                </div>
              ) : current.isAudio ? (
                <audio
                  ref={audioRef}
                  src={mediaSrc}
                  controls
                  autoPlay
                  className="player-audio"
                  onEnded={handleEnded}
                  onError={() =>
                    setError("Could not play audio. Try Open in system player.")
                  }
                />
              ) : (
                <video
                  ref={videoRef}
                  src={mediaSrc}
                  controls
                  preload="auto"
                  playsInline
                  className="player-video"
                  onEnded={handleEnded}
                  onError={() => void handleVideoError()}
                />
              )}
            </div>
            {playerMode === "embed" && !current.isAudio && nativeActive && (
              <div
                ref={playerToolbarRef}
                className={`player-toolbar${
                  cinemaMode ? " player-toolbar--cinema" : ""
                }${controlsIdle && cinemaMode ? " player-toolbar--hidden" : ""}`}
                onMouseEnter={
                  cinemaMode
                    ? () => {
                        wakeControls(true);
                        if (!controlsIdle) scheduleControlsIdle();
                      }
                    : undefined
                }
              >
                <PlayerProgressBar
                  title={current.title}
                  position={playerPosition}
                  duration={playerDuration}
                  onSeek={(seconds) => void handlePlayerSeek(seconds)}
                  onInteract={() => wakeControls(true)}
                />
                <div className="player-controls-dock">
                  <div className="player-controls-row">
                    <div
                      className="player-volume-wrap"
                      onMouseEnter={() => setVolumeHover(true)}
                      onMouseLeave={() => setVolumeHover(false)}
                    >
                      {showVolumeUi && (
                        <div className="player-volume-popover" role="group" aria-label="Volume">
                          <PlayerIconVolume muted={playerMuted} volume={playerVolume} />
                          <input
                            type="range"
                            className="player-volume-slider"
                            min={0}
                            max={100}
                            step={1}
                            value={volumeSliderValue}
                            aria-label="Volume"
                            aria-valuetext={volumeLabel}
                            onChange={(e) => void handleVolumeChange(Number(e.target.value))}
                            onPointerDown={() => wakeControls(true)}
                          />
                          <span className="player-volume-label">{volumeLabel}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="player-ctrl-icon player-ctrl-icon--side"
                        title={playerMuted ? "Unmute (M)" : "Mute (M)"}
                        aria-label={playerMuted ? "Unmute" : "Mute"}
                        onClick={() => void sendPlayerAction("mute")}
                      >
                        <PlayerIconVolume muted={playerMuted} volume={playerVolume} />
                      </button>
                    </div>
                    <div className="player-controls-cluster">
                      {hasQueueNav && (
                        <button
                          type="button"
                          className="player-ctrl-icon"
                          title="Previous video (Shift+← or [)"
                          aria-label="Previous video"
                          disabled={currentIndex === 0}
                          onClick={goToPreviousTrack}
                        >
                          <PlayerIconSkipPrevious />
                        </button>
                      )}
                      <button
                        type="button"
                        className="player-ctrl-icon"
                        title="Back 10 seconds (←)"
                        aria-label="Back 10 seconds"
                        onClick={() => void sendPlayerAction("seekBack")}
                      >
                        <PlayerIconRewind />
                      </button>
                      <button
                        type="button"
                        className={`player-ctrl-icon player-ctrl-icon--primary${
                          playbackEnded ? " player-ctrl-icon--replay" : ""
                        }`}
                        title={
                          playbackEnded
                            ? "Replay"
                            : playerPaused
                              ? "Play (Space)"
                              : "Pause (Space)"
                        }
                        aria-label={playbackEnded ? "Replay" : playerPaused ? "Play" : "Pause"}
                        onClick={() =>
                          playbackEnded
                            ? void replayCurrent()
                            : void sendPlayerAction("pause")
                        }
                      >
                        {playbackEnded ? (
                          <PlayerIconReplay />
                        ) : playerPaused ? (
                          <PlayerIconPlay />
                        ) : (
                          <PlayerIconPause />
                        )}
                      </button>
                      <button
                        type="button"
                        className="player-ctrl-icon"
                        title="Forward 10 seconds (→)"
                        aria-label="Forward 10 seconds"
                        onClick={() => void sendPlayerAction("seekForward")}
                      >
                        <PlayerIconForward />
                      </button>
                      {hasQueueNav && (
                        <button
                          type="button"
                          className="player-ctrl-icon"
                          title="Next video (Shift+→ or ])"
                          aria-label="Next video"
                          disabled={currentIndex >= queue.length - 1}
                          onClick={goToNextTrack}
                        >
                          <PlayerIconSkipNext />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="player-ctrl-icon player-ctrl-icon--side"
                      title={
                        cinemaMode
                          ? "Exit fullscreen (Esc or double-click)"
                          : "Fullscreen (F or double-click)"
                      }
                      aria-label={cinemaMode ? "Exit fullscreen" : "Fullscreen"}
                      onClick={() => toggleCinema()}
                    >
                      <PlayerIconExpand exit={cinemaMode} />
                    </button>
                  </div>
                </div>
                <p className="player-controls-hint">
                  {playbackEnded
                    ? "Ended — click Replay or press Space"
                    : cinemaMode
                      ? hasQueueNav
                        ? "Space · ←/→ seek · Shift+←/→ or [ ] track · Esc exit"
                        : "Space · ←/→ seek · Esc or double-click exit · M mute"
                      : hasQueueNav
                        ? "Space pause · ←/→ seek · Shift+←/→ or [ ] track · F expand · M mute"
                        : "Space pause · ←/→ seek · ↑/↓ volume · F or double-click expand · M mute"}
                </p>
              </div>
            )}
            {!cinemaMode && playbackEnded && (
              <div className="player-ended-banner">
                <span>Finished</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void replayCurrent()}
                >
                  Replay
                </button>
              </div>
            )}

            {!cinemaMode && (
            <div className="player-now">
              <strong>{fileBasename(current.path) || current.title}</strong>
              <span className="file-path" title={current.path}>
                {current.path}
              </span>
              {current.isPlaylist && current.itemIndex != null && (
                <span className="hint">
                  Track {current.itemIndex}
                  {queue.length > 1 ? ` · ${currentIndex + 1} of ${queue.length}` : ""}
                </span>
              )}
              {hasQueueNav && (
                <label className="player-track-picker">
                  <span className="sr-only">Jump to video in playlist</span>
                  <select
                    className="play-track-select"
                    value={currentIndex}
                    onChange={(e) => void switchToTrack(Number(e.target.value))}
                  >
                    {queue.map((item, i) => (
                      <option key={`${item.path}-${i}`} value={i}>
                        {item.itemIndex != null
                          ? `${String(item.itemIndex).padStart(2, "0")} — `
                          : ""}
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!current.isPlaylist && current.entryTitle && current.entryTitle !== (fileBasename(current.path) || current.title) && (
                <span className="hint">{current.entryTitle}</span>
              )}
            </div>
            )}

            {!cinemaMode && showUpNextList && (
              <div className="player-upnext">
                <h3>Up next</h3>
                <ul className="upnext-list">
                  {upNext.map((item, i) => (
                    <li key={`${item.path}-${i}`}>
                      <button
                        type="button"
                        className="upnext-item"
                        onClick={() => void switchToTrack(currentIndex + 1 + i)}
                      >
                        {item.itemIndex != null && (
                          <span className="history-child-index">
                            {String(item.itemIndex).padStart(2, "0")}
                          </span>
                        )}
                        <span>{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!cinemaMode && hasQueueNav && (
              <div className="player-queue-nav">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={currentIndex === 0}
                  onClick={goToPreviousTrack}
                >
                  Previous video
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={currentIndex >= queue.length - 1}
                  onClick={goToNextTrack}
                >
                  Next video
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="history-empty">
            <span className="history-empty-icon">▶</span>
            <p>Nothing playing</p>
            <span className="hint">Pick a completed download below to play in the app.</span>
          </div>
        )}
        </div>

        {error && (
          <div className="player-error-row">
            <p className="error-text">{error}</p>
            {current && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openMediaFile(current.path)}
              >
                Open in system player
              </button>
            )}
          </div>
        )}
      </div>

      {!cinemaMode && (
      <div className="play-completed-library card">
        <h2>Completed downloads</h2>

        <div className="play-library-toolbar">
          <div className="play-library-search">
            <input
              type="search"
              aria-label="Search completed downloads"
              placeholder='Search title, filename, playlist item, or URL — use quotes for exact phrases'
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

          <div className="play-library-filter-row">
            <div className="play-library-filters" role="group" aria-label="Filter completed downloads">
              {(
                [
                  ["all", "All"],
                  ["playlist", "Playlists"],
                  ["single", "Singles"],
                  ["audio", "Audio"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`play-library-filter${libraryFilter === id ? " play-library-filter--active" : ""}`}
                  aria-pressed={libraryFilter === id}
                  onClick={() => setLibraryFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {completed.length > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm play-all-completed-btn"
                disabled={isLibraryLoading}
                onClick={() => void playAllCompleted()}
              >
                {loadingId === ALL_COMPLETED_LOADING_ID
                  ? "Loading…"
                  : "Play all completed"}
              </button>
            )}
          </div>

          <div className="play-playback-options" role="group" aria-label="Playback options">
            <label className="play-playback-toggle">
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={(e) => {
                  const next = e.target.checked;
                  setAutoplayNext(next);
                  saveSettings({ playbackAutoplayNext: next });
                }}
              />
              <span>Autoplay next</span>
            </label>
            <label className="play-playback-toggle">
              <input
                type="checkbox"
                checked={loopPlaylist}
                onChange={(e) => {
                  const next = e.target.checked;
                  setLoopPlaylist(next);
                  saveSettings({ playbackLoopPlaylist: next });
                }}
              />
              <span>Loop playlist / queue</span>
            </label>
          </div>

          {completed.length > 0 && (
            <p className="play-library-meta hint">
              {hasActiveSearch
                ? `${filteredCompleted.length} of ${completed.length} downloads`
                : `${completed.length} download${completed.length === 1 ? "" : "s"}`}
            </p>
          )}
        </div>

        {filteredCompleted.length === 0 ? (
          <p className="hint">
            No completed downloads
            {hasActiveSearch ? " match your search or filter." : " yet. Finish a download first."}
          </p>
        ) : (
          <ul className="play-library">
            {filteredCompleted.map((entry) => {
              const playlist = isPlaylistEntry(entry);
              const count = entry.itemCount ?? entry.children?.length ?? 1;
              return (
                <li key={entry.id} className="play-library-item">
                  <div className="play-library-thumb">
                    {entry.thumbnailUrl ? (
                      <img src={entry.thumbnailUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="history-thumb-fallback">{playlist ? "📋" : "▶"}</span>
                    )}
                  </div>
                  <div className="play-library-body">
                    <strong>
                      {getHighlightSegments(entryDisplayTitle(entry), searchQuery).map((part, i) =>
                        part.highlight ? (
                          <mark key={i} className="search-hit">
                            {part.text}
                          </mark>
                        ) : (
                          <span key={i}>{part.text}</span>
                        )
                      )}
                    </strong>
                    <span className="hint">
                      {playlist ? `Playlist · ${count} items` : "Single video"}
                      {entry.isMp3 ? " · Audio" : ""}
                      {entryMetaLabel(entry) ? ` · ${entryMetaLabel(entry)}` : ""}
                    </span>
                    {entry.filePath && (
                      <span className="file-path" title={entry.filePath}>
                        {entry.filePath}
                      </span>
                    )}
                    {!entry.filePath && entry.outputDir && (
                      <span className="file-path" title={entry.outputDir}>
                        {entry.outputDir}
                      </span>
                    )}
                  </div>
                  <div className="play-library-actions">
                    {playlist ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={isLibraryLoading}
                          onClick={() => playEntry(entry, 0, true)}
                        >
                          Play all
                        </button>
                        {playlistTrackOptions(entry).length > 0 && (
                          <label className="play-track-picker">
                            <span className="sr-only">Play one video from playlist</span>
                            <select
                              className="play-track-select"
                              value=""
                              disabled={isLibraryLoading}
                              onChange={(e) => {
                                const itemIndex = Number(e.target.value);
                                if (itemIndex > 0) {
                                  void playSingleItem(entry, itemIndex);
                                }
                              }}
                            >
                              <option value="">Pick video…</option>
                              {playlistTrackOptions(entry).map((child) => (
                                <option key={child.id} value={child.itemIndex}>
                                  {String(child.itemIndex).padStart(2, "0")} — {child.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={isLibraryLoading}
                          onClick={() => playEntry(entry)}
                        >
                          Play
                        </button>
                        {entry.filePath && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openFileLocation(entry.filePath!)}
                            title={entry.filePath}
                          >
                            Open location
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}
