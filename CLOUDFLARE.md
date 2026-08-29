# Hosting on Cloudflare Pages

Short answer to "are all the steps already done?" — **the repo side is done, the
Cloudflare side is not.** Nothing in this repository can create the Pages
project for you; that part is four clicks in a dashboard. Everything a Pages
build needs is now committed.

---

## What was already in place

| File | Purpose | Status |
|---|---|---|
| `_headers` | Unity Brotli `Content-Encoding`, Godot COOP/COEP, caching, security headers | ✅ already existed, now extended |

## What was missing and has now been added

| File | Why Cloudflare needs it |
|---|---|
| `_redirects` | Short aliases (`/resume`, `/cv`, `/work`) and legacy-URL redirects |
| `.node-version` | Pins the build image to Node 20, so the prerender step is reproducible |
| `package.json` | Sets `"type": "module"` so `node tools/prerender.mjs` can import `js/*.js` |
| `robots.txt` | Points crawlers at the sitemap |
| `sitemap.xml` | Lists all 6 indexable URLs |

## What still needs doing (by you, in the dashboard)

1. **Set the real URL.** `js/data.js` → `identity.siteUrl` is currently
   `https://prasad-hegde.pages.dev`. Cloudflare assigns the subdomain from your
   *project name*, so create the project first, see what URL you get, then set
   this to match and push again.

   This one value drives canonical tags, `sitemap.xml`, JSON-LD and every social
   share card. Social crawlers need absolute URLs and cannot guess. Getting it
   wrong means LinkedIn tries to fetch your preview image from a domain that
   isn't serving your site.

2. **Create the Pages project** (below).

3. **Verify the two profile links.** `js/data.js` → `links`. The GitHub and
   LinkedIn handles in there were inferred from your name by whoever scaffolded
   this — they may not resolve.

---

## Creating the project

**dash.cloudflare.com** → Workers & Pages → Create → Pages → Connect to Git →
pick this repo, then:

| Field | Value |
|---|---|
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `node tools/prerender.mjs` |
| Build output directory | `/` |
| Root directory | *(leave empty)* |

Deploy. Every `git push` to `main` redeploys automatically, and every pull
request gets its own preview URL.

### About that build command

It is optional. The prerendered HTML is **committed to the repo**, so the site
deploys correctly with an empty build command too — that is deliberate, so a
misconfigured build can never take the site down.

Setting it anyway is better: it guarantees the deployed HTML matches
`js/data.js` even if you edit content and forget to run the prerender locally.
There are no dependencies to install, so the build takes about a second.

If you prefer to leave the build command empty, run this before every push:

```bash
node tools/prerender.mjs
```

The GitHub Actions workflow in `.github/workflows/deploy.yml` fails the build if
you forget, so you will find out either way.

### Free tier limits

Everything here fits comfortably:

| Limit | Free tier | This site |
|---|---|---|
| Builds | 500 / month | ~1 per push |
| Bandwidth | Unlimited | — |
| Files per deploy | 20,000 | ~50 (plus game builds later) |
| File size | 25 MB each | largest is 1.3 MB (`three.module.js`) |
| Custom domains | 100 | 0 or 1 |

**Watch the 25 MB per-file cap once you add Unity WebGL builds.** A `.data`
file can exceed it. If that happens, export with Brotli compression on — which
`_headers` is already configured for, and which is the main reason to be on
Cloudflare rather than GitHub Pages.

---

## After the first deploy

### 1. Enable Web Analytics (free, no code, no cookies)

Pages project → Analytics → Web Analytics → Enable. You currently have no idea
whether anyone reaches your contact section or clicks through to a case study.
For a job hunt that is worth knowing.

(`js/data.js` → `analytics` also supports Plausible or Umami if you would
rather use those. Leave `src` empty to keep it off.)

### 2. Force the preview URL out of the search index

Cloudflare gives every deploy a unique `<hash>.<project>.pages.dev` URL. Those
are crawlable and will compete with your real URL for the same search terms.

Pages project → Settings → Builds & deployments → **Preview deployments** →
set access to *Private* (Cloudflare Access), or at minimum rely on the
`<link rel="canonical">` tag that is now baked into every page.

### 3. Submit the sitemap

[Google Search Console](https://search.google.com/search-console) → add your
property → Sitemaps → submit `sitemap.xml`. This is how you get indexed in days
instead of weeks. Do the same at
[Bing Webmaster Tools](https://www.bing.com/webmasters) — it feeds DuckDuckGo,
and more recruiter tools use Bing's index than you would expect.

### 4. Re-scrape your social cards

Paste your URL into the
[LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and hit
re-scrape. LinkedIn caches preview cards aggressively — for up to seven days —
so if you shared the URL while the tags still said *"Portfolio / Personal
portfolio"*, that stale card will keep appearing until you force a refresh.

Do the same for Twitter/X via the
[Card Validator](https://cards-dev.twitter.com/validator).

### 5. Custom domain (optional, ~₹800–1200/yr)

A domain like `prasadhegde.dev` reads better on a resume than
`prasad-hegde.pages.dev`, and it means you never have to re-print anything if
you move hosts.

Pages project → Custom domains → Set up a domain. If you buy through Cloudflare
Registrar it is at-cost with no markup and DNS is configured automatically.
Then update `identity.siteUrl` in `js/data.js` and push.

---

## Local development

```bash
node tools/serve.mjs          # http://localhost:8080
```

Or `python -m http.server 8080`. Either works — the Node one additionally
serves `/work/<id>/` directory URLs the way Cloudflare does, so local links
behave identically to production.

Opening `index.html` by double-clicking will **not** work: browsers block ES
modules over `file://`. It must be served over HTTP.

---

## Why not GitHub Pages?

It cannot send the response headers this site needs:

- **`Content-Encoding: br`** — Unity ships pre-compressed Brotli builds. Without
  this header the browser will not decompress them, so you are forced to export
  uncompressed at roughly 3× the size.
- **`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`** — required
  for Godot 4's threaded web export. Without them it simply does not run.

Since you are actively building game builds to embed, this is not a
hypothetical. Stay on Cloudflare.

The `.github/workflows/deploy.yml` workflow used to deploy to GitHub Pages and
has been converted to a **verification-only** workflow. Publishing to two hosts
would give you two indexable copies of the same site competing for the same
search terms, two URLs to keep straight when sharing, and a canonical tag that
can only point at one of them.
