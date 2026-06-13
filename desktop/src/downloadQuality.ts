import type { QualityResolution } from "./types";

export interface DownloadQualityInfo {
  requestedHeight?: number;
  chosenHeight?: number;
  confirmed?: boolean;
  isMp3?: boolean;
  isPlaylist?: boolean;
}

export function qualityInfoFromResolution(
  resolution: QualityResolution | null | undefined,
  isMp3: boolean,
  isPlaylist: boolean,
  fallbackHeight?: number
): DownloadQualityInfo | null {
  if (isMp3) {
    return { isMp3: true, isPlaylist };
  }
  if (isPlaylist) {
    return {
      requestedHeight: fallbackHeight,
      chosenHeight: fallbackHeight,
      confirmed: true,
      isPlaylist: true,
    };
  }
  if (!resolution && fallbackHeight == null) return null;
  return {
    requestedHeight: resolution?.requested_height ?? fallbackHeight,
    chosenHeight: resolution?.chosen_height ?? fallbackHeight,
    confirmed: resolution?.confirmed ?? true,
    isPlaylist: false,
  };
}

export function formatCompletedQuality(
  quality: DownloadQualityInfo | null | undefined
): string | null {
  if (!quality) return null;
  if (quality.isMp3) {
    return quality.isPlaylist
      ? "Downloaded as MP3 audio (each playlist item)"
      : "Downloaded as MP3 audio";
  }

  const requested = quality.requestedHeight;
  const chosen = quality.chosenHeight ?? requested;
  if (chosen == null && requested == null) return null;

  if (quality.isPlaylist && requested != null) {
    if (quality.confirmed !== false && chosen === requested) {
      return `Each video downloaded at up to ${requested}p`;
    }
    if (chosen != null && chosen !== requested) {
      return `Each video up to ${requested}p — unavailable heights fall back (often ${chosen}p)`;
    }
    return `Each video downloaded at up to ${requested}p`;
  }

  if (chosen == null) return null;

  if (quality.confirmed || chosen === requested) {
    return `Downloaded at ${chosen}p (verified)`;
  }

  if (requested != null && chosen != null && chosen !== requested) {
    return `Downloaded at ${chosen}p (${requested}p was not available)`;
  }

  return `Downloaded at ${chosen}p`;
}
