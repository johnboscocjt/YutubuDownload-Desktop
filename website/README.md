# YutubuDownload Website

Modern landing page for [YutubuDownload Desktop](https://github.com/johnboscocjt/YutubuDownload-Desktop).

> **Important:** This folder (`website/`) is the live site. On Vercel, **Root Directory must be `website`** — see [../VERCEL.md](../VERCEL.md).

## Features

- Platform downloads: **Linux** (`.deb`), **Windows** (`.exe`), **macOS** (`.dmg`), plus **terminal** install script
- Install & uninstall guides for Linux, Windows, and macOS on the landing page
- Screenshot gallery for all six desktop screens
- Auto-detects visitor OS and highlights the right download card
- **Live download counter** (polls every 12s): site-hosted downloads + GitHub Release asset counts (no fake baseline)
- Pulls latest `.deb` from GitHub Releases on `YutubuDownload-Desktop`

## Deploy to Vercel

1. Push this repo to GitHub (`YutubuDownload-Desktop`)
2. [vercel.com/new](https://vercel.com/new) → Import the repository
3. **Root Directory → Edit → set to `website`** (required — do not leave as `.`)
4. Framework: **Next.js** (auto-detected)
5. Deploy

If Root Directory is wrong, Vercel will not build this Next.js app.

Full troubleshooting: [../VERCEL.md](../VERCEL.md)

### Enable live download tracking (recommended for production)

1. In Vercel project → **Storage** → Create **KV** database
2. Connect KV to the project (adds env vars automatically)
3. Redeploy

**Local development:** Without KV, site-hosted download clicks are saved to `website/.data/download-stats.json` and persist across `npm run dev` restarts. The counter shows `storage: "local"` in `/api/stats`. GitHub Release downloads are pulled from the GitHub API.

## Local development

```bash
cd website
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Desktop release assets

Publish desktop builds to **YutubuDownload-Desktop** GitHub Releases, or host the `.deb` on this site:

```bash
# After building the desktop app:
cp ../target/release/bundle/deb/YutubuDownload_*.deb public/downloads/
```

| Platform | Asset | Website behaviour |
|----------|-------|-------------------|
| Linux | `public/downloads/*.deb` or GitHub Release | **Download .deb** + [install guide](#linux-install) |
| Windows | `public/downloads/*-setup.exe` or GitHub Release | **Download .exe** + [install guide](#windows-install) |
| macOS | `public/downloads/*_universal.dmg` or GitHub Release | **Download .dmg** + [install guide](#macos-install) |
| Terminal | `install.sh` on terminal repo | Always available |

Screenshots open **full screen** on click (lightbox).

## API routes

| Route | Purpose |
|-------|---------|
| `GET /api/stats` | Live download statistics |
| `GET /api/releases` | Latest release + resolved download URLs |
| `GET /api/download?platform=linux` | Track click + serve `.deb` |
| `GET /api/download?platform=windows` | Track click + serve `.exe` |
| `GET /api/download?platform=macos` | Track click + serve `.dmg` |
