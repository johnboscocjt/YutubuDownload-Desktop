import { invoke } from "@tauri-apps/api/core";
import type {
  DependencyStatus,
  DownloadJobConfig,
  MetadataInfo,
  QualityResolution,
} from "./types";

export function checkDependencies(): Promise<DependencyStatus> {
  return invoke("check_dependencies_cmd");
}

export function refreshCookies(force = false): Promise<string> {
  return invoke("refresh_cookies", { force });
}

export function listQualities(url: string): Promise<number[]> {
  return invoke("list_qualities", { url });
}

export function resolveQuality(
  url: string,
  height: number
): Promise<QualityResolution> {
  return invoke("resolve_quality", { url, height });
}

export function fetchMetadata(
  url: string,
  playlist: boolean
): Promise<MetadataInfo> {
  return invoke("fetch_metadata_cmd", { url, playlist });
}

export interface VideoProbeResult {
  metadata: MetadataInfo;
  qualities: number[];
  quality?: QualityResolution;
}

export function probeVideo(
  url: string,
  playlist: boolean,
  height: number,
  isMp3: boolean
): Promise<VideoProbeResult> {
  return invoke("probe_video_cmd", { url, playlist, height, isMp3 });
}

export function startDownload(config: DownloadJobConfig): Promise<string> {
  return invoke("start_download", { config });
}

export function cancelDownload(jobId: string): Promise<void> {
  return invoke("cancel_download", { jobId });
}

export function pauseDownload(jobId: string): Promise<void> {
  return invoke("pause_download", { jobId });
}

export function resumeDownload(jobId: string): Promise<void> {
  return invoke("resume_download", { jobId });
}

export function openOutputFolder(path: string): Promise<void> {
  return invoke("open_output_folder", { path });
}

export function openFileLocation(path: string): Promise<void> {
  return invoke("open_file_location", { path });
}

export interface DocEntry {
  id: string;
  title: string;
  description: string;
  category: string;
}

export function listDocumentation(): Promise<DocEntry[]> {
  return invoke("list_documentation");
}

export function readDocumentation(id: string): Promise<string> {
  return invoke("read_documentation", { id });
}

export interface PlayableHint {
  title: string;
  itemIndex?: number;
  filePath?: string;
}

import type { PlayableFile } from "./types";

export function resolvePlayableFiles(
  outputDir: string,
  hints: PlayableHint[]
): Promise<PlayableFile[]> {
  return invoke("resolve_playable_files", { outputDir, hints });
}

export interface PlaybackPrepInfo {
  needsTranscode: boolean;
  codec?: string;
}

export function probePlaybackPrep(sourcePath: string): Promise<PlaybackPrepInfo> {
  return invoke("probe_playback_prep", { sourcePath });
}

export function stageMediaForPlayback(sourcePath: string): Promise<string> {
  return invoke("stage_media_for_playback", { sourcePath });
}

export function openMediaFile(path: string): Promise<void> {
  return invoke("open_media_file", { path });
}

export interface NativePlayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
}

export function hasNativePlayer(): Promise<boolean> {
  return invoke("has_native_player_cmd");
}

export function startNativePlayer(args: {
  path: string;
  bounds: NativePlayerBounds;
}): Promise<void> {
  return invoke("start_native_player", args);
}

export function updateNativePlayerBounds(args: {
  bounds: NativePlayerBounds;
}): Promise<void> {
  return invoke("update_native_player_bounds", args);
}

export function stopNativePlayer(): Promise<void> {
  return invoke("stop_native_player_cmd");
}

export type NativePlayerAction =
  | "pause"
  | "seekBack"
  | "seekForward"
  | "fullscreen"
  | "volumeUp"
  | "volumeDown"
  | "mute"
  | "fitWindow"
  | "fillFrame";

export function nativePlayerControl(action: NativePlayerAction): Promise<void> {
  return invoke("native_player_control", { action });
}

export function nativePlayerPaused(): Promise<boolean> {
  return invoke("native_player_paused");
}

export interface NativePlayerProgress {
  position: number;
  duration: number;
}

export function nativePlayerProgress(): Promise<NativePlayerProgress> {
  return invoke("native_player_progress");
}

export interface NativePlayerVolume {
  volume: number;
  muted: boolean;
}

export function nativePlayerVolume(): Promise<NativePlayerVolume> {
  return invoke("native_player_volume");
}

export function nativePlayerSetVolume(volume: number): Promise<void> {
  return invoke("native_player_set_volume", { volume });
}

export function nativePlayerSeek(seconds: number): Promise<void> {
  return invoke("native_player_seek", { seconds });
}

export interface PointerInWindow {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pointerInAppWindow(): Promise<PointerInWindow | null> {
  return invoke("pointer_in_app_window");
}

export function setCinemaPointerWatch(enabled: boolean): Promise<void> {
  return invoke("set_cinema_pointer_watch", { enabled });
}
