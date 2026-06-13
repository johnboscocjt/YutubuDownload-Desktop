# Deploy the YutubuDownload website on Vercel

Production URL: **https://ytddesktop.vercel.app**

The site source is **`website/`** (Next.js). It is **not** the repo root.

## If you see `404: NOT_FOUND` (plain Vercel page)

That means **no successful production deployment** is attached to the domain — not a bug in the Next.js app itself.

Common causes:

| Cause | Fix |
|-------|-----|
| **Root Directory** is `.` (repo root) | Set to **`website`** |
| **Output Directory** manually set (e.g. `public`, `dist`) | **Clear it** — leave empty for Next.js |
| **Framework** is "Other" | Set to **Next.js** |
| Latest deploy **failed** | Open Deployments → failed build → read logs → Redeploy |
| Old static `index.html` was removed from root | Expected — you must deploy `website/` instead |

## One-time Vercel project settings

1. [Vercel Dashboard](https://vercel.com) → project **ytddesktop**
2. **Settings → General → Root Directory** → **Edit** → `website` → **Save**
3. **Settings → Build & Deployment**
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (default)
   - **Install Command:** `npm ci` (or default)
   - **Output Directory:** *(leave empty)*
   - **Node.js Version:** 20.x
4. **Deployments** → latest → **⋯** → **Redeploy** → check **Use existing Build Cache: No**

After a successful deploy, https://ytddesktop.vercel.app should show the YutubuDownload hero, download cards, and screenshots.

## Verify locally

```bash
cd website
npm ci
npm run build
npm run start   # http://localhost:3000
```

## CI

GitHub Actions workflow **Website CI** (`.github/workflows/website.yml`) builds `website/` on every push. If that passes but Vercel still 404s, the problem is Vercel project settings above.

## Optional: live download counter (KV)

1. Vercel project → **Storage** → add **Upstash Redis** (replaces deprecated KV)
2. Connect to project → redeploy

Without storage, `/api/stats` still works using ephemeral local fallback in dev; on Vercel serverless, site click counts may reset between invocations unless Redis is connected.

## After building a new `.deb`

```bash
cp target/release/bundle/deb/YutubuDownload_*.deb website/public/downloads/
git add website/public/downloads/
git commit -m "Update website .deb download"
git push
```
