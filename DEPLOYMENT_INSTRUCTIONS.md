# Deployment Instructions for Unity WebGL Game on Cloudflare

## Approach 1: Cloudflare Pages with _headers (Recommended - Simpler)

This approach uses Cloudflare Pages' native _headers file support to serve Unity Brotli-compressed files with correct headers.

### Steps:
1. **Ensure files are committed**: Your Unity build files and _headers file are already tracked by git
   - ✓ assets/games/unity-game/Build/JWF.data.br
   - ✓ assets/games/unity-game/Build/JWF.framework.js.br  
   - ✓ assets/games/unity-game/Build/JWF.wasm.br
   - ✓ assets/games/unity-game/Build/JWF.symbols.json.br
   - ✓ _headers (with Brotli rules at the end)

2. **Push to GitHub**: 
   ```bash
   git add .
   git commit -m "Deploy Unity game with correct headers"
   git push origin main
   ```

3. **Wait for deployment**: Cloudflare Pages will automatically rebuild (usually 1-2 minutes)

4. **Test the deployment**:
   - Visit your Cloudflare Pages URL (typically: `https://[your-project-name].pages.dev`)
   - The Unity game should load without the "Content-Encoding: br missing" error

### Verification:
To verify headers are set correctly, run:
```bash
curl -v "https://[your-project-name].pages.dev/assets/games/unity-game/Build/JWF.framework.js.br" 2>&1 | grep -i "content-encoding"
```
Should show: `content-encoding: br`

## Approach 2: Cloudflare Worker (Alternative)

If you prefer to use a Worker (for example, if you need more dynamic behavior), use the fixed Worker in `src/worker.js`.

### Steps:
1. **Deploy the Worker**:
   - Log in to Cloudflare Dashboard
   - Go to Workers & Pages → Create Application → Workers
   - Select "Create Worker"
   - Copy-paste the contents of `src/worker.js`
   - Save and Deploy

2. **Configure route** (if needed):
   - In Workers settings, add a route to capture your Unity game URLs
   - Example: `https://your-domain.com/assets/games/unity-game/Build/*`

3. **Test the Worker**:
   - Visit: `https://your-worker.[your-subdomain].workers.dev/assets/games/unity-game/Build/JWF.framework.js.br`
   - Should return the file with correct Content-Encoding: br header

### Verification:
```bash
curl -v "https://your-worker.[your-subdomain].workers.dev/assets/games/unity-game/Build/JWF.framework.js.br" 2>&1 | grep -i "content-encoding"
```

## Troubleshooting

### If you see 502 errors from Worker:
This usually means the Worker can't fetch from GitHub. Check:
1. Is your GitHub repository public? (Workers can't access private repos without auth)
2. Is the repo name correct in the Worker? (`prasad1231/prasad-hegde-gamesdev-pro`)
3. Is the branch correct? (`main` vs `master`)
4. Can you access the raw URL directly in browser?
   ```
   https://raw.githubusercontent.com/prasad1231/prasad-hegde-gamesdev-pro/main/assets/games/unity-game/Build/JWF.framework.js.br
   ```

### If you see 404 errors:
1. Verify the file path is correct
2. Check that files were actually pushed to GitHub
3. Wait a few minutes for GitHub to propagate

### If Content-Encoding header is still missing:
1. Double-check that _headers file is in the root of your deployed site
2. Verify the _headers rules are at the END of the file (last matching rule wins)
3. Purge Cloudflare cache if needed
4. Try with cache-busting parameter: `?v=123`

## Local Testing
You can continue to test locally with:
```bash
node tools/serve
```
Then visit `http://localhost:8080` in your browser.