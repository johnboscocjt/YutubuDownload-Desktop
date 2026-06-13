# YutubuDownload v2.0.1

**Release date:** June 08, 2026  
**Codename:** Multi-Instance Shared-Cookie Edition  
**Tag:** `v2.0.1`

---

## Summary

v2.0.1 is the **latest stable release** of YutubuDownload (`ytd`). It fixes video ID detection on Bash, adds **stable video quality selection**, **loop download sessions**, stronger MP3 reliability, safe reinstall, and expanded documentation — all on top of the v2.0.0 multi-instance architecture.

---

## Highlights

### Stable Video Quality

Your typed resolution (e.g. `1080`) is **verified before download** — the script does not downgrade just because a quick format list was incomplete.

- Lists real video heights from `bv*` streams (with cookie-less retry if needed)
- Runs `yt-dlp --simulate` to **confirm exact height** before starting
- Falls back to the nearest lower standard **only when probe proves it is unavailable**
- Download format chain tries exact height first, then `height<=requested`, then best
- Clear feedback: `1080p confirmed` or `Will download at 720p instead`
- See **[DOWNLOAD_GUIDE.md](DOWNLOAD_GUIDE.md)** for full diagrams

### Loop Download Mode

Stay in one `ytd` session and paste multiple URLs without restarting.

- At startup choose **2 = Keep downloading**
- Paste URLs one after another; type **`q`** at the URL prompt to quit
- Cancel a single job and continue with another URL in loop mode
- Per-download logs under your session folder

### MP3 & Engine Reliability

- MP3 path uses `bestaudio/best` fallback when audio-only streams are blocked
- Auto-refreshes `yt-dlp` in `~/.local/bin` without sudo when outdated
- Installer updates remain one-command safe

### Bug Fixes

- **Video ID regex** — Bash-compatible patterns; fixes `invalid regular expression`
- **Safe reinstall** — `install.sh` detects existing installs; uses local script from cloned repo
- **Troubleshooting** — Reinstall guide and on-screen hint when URL parsing fails

### Documentation

- **[DOWNLOAD_GUIDE.md](DOWNLOAD_GUIDE.md)** — Quality, single video, playlist, and MP3 flows with diagrams
- Release history merged into `README.md` and full technical manual
- Docs hub updated in `index.html`

---

## User-Facing Improvements

| Area | What you get |
|------|----------------|
| Video quality | Probe-verified exact height; honest fallback messaging |
| Session flow | One-shot or loop-until-quit download modes |
| MP3 | More reliable extraction on blocked audio streams |
| Progress | Single-line UI; adaptive `low-network` mode on weak links |
| Playlists | Numbered files + `[PLAYLIST_ID]` folders to avoid mix-ups |
| Multi-terminal | Shared cookies + per-session isolation (from v2.0.0) |

---

## Upgrade

```bash
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)"
```

**From a cloned repo:**

```bash
cd /path/to/Youtube-Downloader-For-UbuntuTerminal
sudo bash install.sh
```

Run `ytd` **without** `sudo`.

---

## Verify

```bash
ytd --version
```

Expected output:

```text
ytd (YutubuDownload) v2.0.1 (2026-06-08) • Tanzania-Optimized • MULTI-INSTANCE + SHARED COOKIES
```

---

## Quick Start — Loop Mode

```bash
ytd
# Choose 2 = Keep downloading
# Paste URL → complete prompts → download
# Paste another URL, or type q to quit
```

---

## Quick Start — Stable Quality (Video)

```bash
ytd
# Paste URL → Single or Playlist → Video
# Enter height e.g. 1080
# Wait for: "1080p confirmed — will download at requested quality"
# Confirm and download
```

---

## Compatibility

| Item | Detail |
|------|--------|
| Primary command | `ytd` |
| Legacy command | `YutubuDownload` |
| Platform | Ubuntu / Debian terminal (WSL, macOS with Unix deps) |
| JS runtime | Deno preferred, Node fallback |
| Quality range | 360p – 4K (standard heights) |

---

## Full Changelog

### v2.0.1 (2026-06-08)
- **Stable video quality**: probe-based resolver + exact-first format chain
- **Loop download mode**: keep pasting URLs until `q`
- Fixed MP3 downloads with `bestaudio/best` fallback
- Auto-refresh `yt-dlp` without sudo
- Fixed Bash-compatible video ID regex
- Safe reinstall in `install.sh`
- Added `DOWNLOAD_GUIDE.md` with quality/playlist/audio diagrams
- Consolidated docs into main README and technical manual
- `TROUBLESHOOTING.md` reinstall section

### v2.0.0 (2026-04-20)
- Multi-instance downloads with shared cookie lock
- Session-isolated temp/log paths
- Adaptive low-network progress mode
- `ytd` command alias

---

**Repository:** https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal
