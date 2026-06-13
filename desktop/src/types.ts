export interface ToolStatus {
  found: boolean;
  path?: string;
  version?: string;
  detail?: string;
}

export interface InstallHints {
  ytdlp: string;
  ffmpeg: string;
  js_runtime: string;
  python_cookies: string;
}

export interface DependencyStatus {
  ytdlp: ToolStatus;
  ffmpeg: ToolStatus;
  js_runtime: ToolStatus;
  python_cookies: ToolStatus;
  all_ready: boolean;
  install_hints: InstallHints;
}

export interface QualityResolution {
  requested_height: number;
  chosen_height?: number;
  confirmed: boolean;
  message: string;
  format_string: string;
}

export interface MetadataInfo {
  video_id?: string;
  playlist_id?: string;
  title?: string;
  duration?: string;
  thumbnail_url?: string;
  is_playlist: boolean;
  playlist_title?: string;
  entry_count?: number;
}

export interface DownloadJobConfig {
  url: string;
  isPlaylist: boolean;
  isMp3: boolean;
  audioQuality?: string;
  requestedHeight?: number;
  outputDir: string;
  usePlaylistFolder: boolean;
  customFolderName?: string;
  concurrentFragments: number;
  skipQualityCheck?: boolean;
  forceRedownload?: boolean;
}

export interface PlaylistTrackItem {
  itemIndex: number;
  title: string;
  percent: number;
  status: "pending" | "downloading" | "complete";
  filePath?: string;
}

export interface ProgressEvent {
  jobId: string;
  percent?: number;
  speed?: string;
  eta?: string;
  fileSize?: string;
  title?: string;
  itemIndex?: number;
  totalItems?: number;
  lowNetwork: boolean;
  logLine?: string;
  outputFile?: string;
  phase: string;
}

export interface DownloadCompleteEvent {
  jobId: string;
  success: boolean;
  outputDir: string;
  message: string;
  outputFile?: string;
}

export interface HistoryChild {
  id: string;
  itemIndex: number;
  title: string;
  filePath?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  status: "complete" | "cancelled" | "error" | "incomplete";
  finishedAt: string;
  outputDir: string;
  isPlaylist?: boolean;
  isMp3?: boolean;
  itemCount?: number;
  requestedHeight?: number;
  filePath?: string;
  children?: HistoryChild[];
  /** Absolute path to `Title [PLAYLIST_ID]/` on disk — used for playback lookup. */
  playlistFolder?: string;
}

export interface PlayableFile {
  path: string;
  title: string;
  itemIndex?: number;
  isAudio: boolean;
}
