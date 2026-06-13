# Fix Vercel serving the old website

## What went wrong

`https://ytddesktop.vercel.app` was showing **"ytd - Investor, Customer & Docs"** (old static HTML) instead of the new Next.js site in `website/`.

**Cause:** The Vercel project was connected to this repo with **Root Directory = `.`** instead of **`website/`**, so the Next.js app was never built for production.

The new site lives only in:

```
website/
  app/          ← Next.js pages
  components/   ← Hero, downloads, screenshots, install guide
  public/       ← .deb, icons, screenshots
```

## Fix (one-time in Vercel dashboard)

1. Open [Vercel Dashboard](https://vercel.com) → project **ytddesktop** (or your linked project)
2. **Settings** → **General** → **Root Directory**
3. Click **Edit** → set to: `website`
4. **Save**
5. **Deployments** → **Redeploy** latest (or push any commit to `main`)

After redeploy you should see:

- YutubuDownload hero with app icon
- Linux `.deb` download card
- Screenshot gallery
- Live download counter

## Verify locally first

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000 — that is what production should match.
