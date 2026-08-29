# Cloudflare Pages Deployment Guide - One-Time Fix

## Problem
You're currently deploying as a Cloudflare Worker (`wrangler deploy`) which is causing 502 errors and not serving your site correctly. Your site is designed to work with Cloudflare Pages, which serves your static files directly with the correct headers.

## Solution: Switch to Cloudflare Pages (One-Time Setup)

### Step 1: Remove Worker Deployment (Optional but Clean)
Go to your Cloudflare Dashboard → Workers & Pages → Workers → Find your worker `prasad-hegde-gamesdev-pro` → Delete it
*(This prevents confusion but isn't strictly required)*

### Step 2: Create Cloudflare Pages Project
1. Go to: https://dash.cloudflare.com → Workers & Pages → Pages → Create Application → Pages
2. Connect to Git: Select `prasad1231/prasad-hegde-gamesdev-pro`
3. **CRITICAL SETTINGS** (must be exactly as shown):
   - **Production branch**: `main`
   - **Framework preset**: `None` ← IMPORTANT
   - **Build command**: *(leave completely empty)* ← IMPORTANT
   - **Build directory**: *(leave completely empty)* ← IMPORTANT
4. Click **Save and Deploy**

### Step 3: Get Your Pages URL & Update siteUrl
After deployment (wait 1-2 minutes), your dashboard will show:
```
Your site is deployed at:
https://prasad-hegde-gamesdev-pro.pages.dev
```

**Update `js/data.js`** with this exact URL:
```javascript
siteUrl:   'https://prasad-hegde-gamesdev-pro.pages.dev',
```

### Step 4: Push the Changes
```bash
git add js/data.js
git commit -m "Update siteUrl for Cloudflare Pages deployment"
git push origin main
```

### Step 5: Verify Your Deployment
1. Wait for the automatic redeploy to complete (check Pages dashboard for build logs)
2. Visit: `https://prasad-hegde-gamesdev-pro.pages.dev`
3. Click on your Unity game in the Arcade section
4. The game should load and run without any "Content-Encoding: br missing" errors

### Verification Checklist
Confirm:
- [ ] Changes pushed to GitHub
- [ ] Pages deployed successfully (check dashboard - should show "Build succeeded")
- [ ] URL noted: `https://prasad-hegde-gamesdev-pro.pages.dev`
- [ ] Test Unity file headers:
  ```bash
  curl -I https://prasad-hegde-gamesdev-pro.pages.dev/assets/games/unity-game/Build/JWF.framework.js.br
  # Should show: content-encoding: br
  ```
- [ ] Game loads and runs correctly in browser

## Why This Fixes Your Issue Permanently

Your current Worker approach (`src/worker.js` + `wrangler.toml`) has multiple failure points:
- External fetches to GitHub can fail or be rate-limited
- Header setting logic can have bugs
- Extra complexity introduces more failure points
- You mentioned having a "read-only dashboard issue" with Workers

Cloudflare Pages eliminates these issues by:
- Serving files directly from your GitHub repo (no external fetches)
- Applying your `_headers` file exactly as configured (which we know is correct)
- Providing automatic SSL, global CDN, and instant cache invalidation
- Requiring **zero** Worker code or Wrangler configuration

## Troubleshooting If Issues Persist

If you still see problems after following these steps:

1. **Check Pages Build Logs**: In Cloudflare Dashboard → Pages → Your project → Builds & deployments → Look at the latest build log
2. **Verify _headers is working**: The Pages build output should show it's processing your _headers file
3. **Clear browser cache**: Try a hard refresh (Ctrl+Shift+R) or incognito window
4. **Check file existence**: Verify your Unity files exist at the expected paths in your repo

## Expected Outcome

After completing these steps:
- ✅ **NO MORE** 502 errors from Worker
- ✅ **NO MORE** "Content-Encoding: br missing" errors
- ✅ Your Unity game loads and runs correctly in the browser
- ✅ Same behavior as your verified local setup (`node tools/serve.mjs`)
- ✅ **Zero Worker maintenance required** - completely avoids your read-only issue
- ✅ Simple, reliable deployment matching your project's actual files

This is a one-time fix. Once Pages is set up correctly, every `git push` to `main` will automatically update your site with no further configuration needed.