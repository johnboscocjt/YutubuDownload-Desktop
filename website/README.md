# YutubuDownload Website

Modern landing page for [YutubuDownload](https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal) — deploy to **Vercel** in minutes.

## Features

- Platform downloads: **Linux**, **Windows**, **macOS**, plus **terminal** install script
- Auto-detects visitor OS and highlights the right download card
- **Live download counter** (polls every 12s) combining:
  - Baseline count (`NEXT_PUBLIC_STATS_BASELINE`)
  - Site-tracked clicks via Vercel KV
  - GitHub Release asset download counts
- Pulls latest release assets from GitHub API automatically

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import repository
3. Set **Root Directory** to `website`
4. Deploy

### Enable live download tracking (recommended)

1. In Vercel project → **Storage** → Create **KV** database
2. Connect KV to the project (adds env vars automatically)
3. Redeploy

Optional: set `NEXT_PUBLIC_STATS_BASELINE` to seed the total (e.g. `5000`).

## Local development

```bash
cd website
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Desktop release assets

When you publish desktop builds to GitHub Releases, name assets with hints the site recognizes:

| Platform | Filename hints |
|----------|----------------|
| Linux | `AppImage`, `.deb`, `linux` |
| Windows | `.exe`, `.msi`, `windows` |
| macOS | `.dmg`, `macos`, `darwin` |

Until desktop assets exist, download buttons link to the latest GitHub Release page. Terminal install always works via `install.sh`.

## API routes

| Route | Purpose |
|-------|---------|
| `GET /api/stats` | Live download statistics |
| `GET /api/releases` | Latest release + resolved download URLs |
| `GET /api/download?platform=linux` | Track click + redirect to file |
