const SETTINGS_KEY = "yutubu-settings";

export interface AppSettings {
  playInBackground: boolean;
  outputDir: string;
  playbackAutoplayNext: boolean;
  playbackLoopPlaylist: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  playInBackground: false,
  outputDir: "",
  playbackAutoplayNext: true,
  playbackLoopPlaylist: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      playInBackground: Boolean(parsed.playInBackground),
      outputDir: typeof parsed.outputDir === "string" ? parsed.outputDir : "",
      playbackAutoplayNext:
        parsed.playbackAutoplayNext !== undefined
          ? Boolean(parsed.playbackAutoplayNext)
          : DEFAULT_SETTINGS.playbackAutoplayNext,
      playbackLoopPlaylist: Boolean(parsed.playbackLoopPlaylist),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
