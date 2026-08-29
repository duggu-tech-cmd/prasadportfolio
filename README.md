# Prasad Hegde — Portfolio

A portfolio built as a **digital motorcycle instrument cluster**. The hero is a
live WebGL scene: a segmented TFT rev bar painted to a canvas texture and mapped
onto a 3D screen plane, an ambient layer of instanced casino chips and cards, a
bloom post-processing chain, and drag-to-rotate vehicle models. Playable Unity
WebGL builds embed straight into the page, and every case study gets its own
indexable URL.

**Stack:** vanilla HTML + CSS + ES modules, vendored Three.js r160.
**No dependencies. `npm install` is never required.**

**Live:** set `identity.siteUrl` in [`js/data.js`](js/data.js) — see
[CLOUDFLARE.md](CLOUDFLARE.md).

----

## Run it

```bash
node tools/serve.mjs          # → http://localhost:8080
```

That's the whole setup. The server rebuilds the static HTML on startup, so
editing content and restarting is the full loop.

> **Use this server, not `python -m http.server`.** Python sends no
> `Content-Encoding: br`, so the Brotli-compressed Unity build cannot be
> decoded, and no `Cache-Control`, which lets the browser silently serve a
> stale `js/ui.js`. Both failures are silent and confusing.

Double-clicking `index.html` will not work — browsers block ES modules over
`file://`. It must be served over HTTP.

| Command | What it does |
|---|---|
| `node tools/serve.mjs` | Rebuild + serve on :8080 |
| `node tools/serve.mjs 3000` | Different port |
| `node tools/serve.mjs --no-build` | Serve without rebuilding |
| `node tools/prerender.mjs` | Rebuild the static HTML only |
| `node tools/prerender.mjs --check` | Verify output is current (CI uses this) |

---

## How the page works

### 1. One content file

Everything — every heading, job, bullet, skill, project and game — lives in
[`js/data.js`](js/data.js). Nothing else needs touching for normal edits.

### 2. Rendered twice, from one definition

[`js/render.js`](js/render.js) holds pure HTML builder functions. It is imported
by **both** the browser and the build script, so the markup a crawler sees and
the markup a visitor sees cannot drift apart.

```
js/data.js  ──►  js/render.js  ──┬──►  tools/prerender.mjs  ──►  static HTML
                                 └──►  js/ui.js (hydrates + enhances)
```

`render.js` must never touch `document`, `window` or `location` — it runs in
Node during the build, and adding a browser global there breaks the build.

### 3. Prerendered, then progressively enhanced

`tools/prerender.mjs` bakes the content into `index.html` between
`<!--#SSR:*-->` markers, and generates `resume.html`, `work/<id>/index.html`,
`sitemap.xml` and `robots.txt`.

This exists because the site used to render everything client-side into an empty
`<main>`, which broke three things at once:

- **Social previews.** LinkedIn, Slack, WhatsApp and Twitter crawlers do not run
  JavaScript. Every share of the site rendered a card titled "Portfolio".
- **Recruiter sourcing tools.** SeekOut, HireEZ and similar keyword-scrape HTML.
  They found no "Unity", no "C#", no employer — nothing.
- **Search.** Googlebot renders JS, but on a delayed second pass and a budget.

The generated HTML is **committed**, so the site deploys correctly even on a
host with no build step configured. CI fails if it goes stale.

### 4. The 3D loads last

`index.html` boots in two stages. Stage one (~12 KB) hydrates and wires every
interaction that does not need WebGL — the page is fully usable at that point.
Stage two dynamically imports Three.js (1.3 MB) *after* first paint, and skips it
entirely on `save-data` or 2G connections. The 3D bundle never sits between a
visitor and the text.

### 5. Games load on click

A Unity WebGL build is ~8 MB. Auto-loading it in an iframe would download all of
it for anyone who scrolls past the Arcade, so the card shows a Play control that
states the size, and the iframe is created on click — inside a full-viewport
"theater" container that animates open and closed.

The Play control is a real `<a href>`, not a `<button>`: if JavaScript fails, is
stale, or is blocked, the game still opens in a new tab instead of a dead
button doing nothing silently.

**The embedded page is [`assets/games/host/unity-game.html`](assets/games/host/unity-game.html), deliberately outside the build folder** — every Unity export
overwrites `index.html` inside the build folder, so anything hand-edited there
gets destroyed. Re-export freely; copy only `Build/` and `StreamingAssets/`.

---

## Layout

| Path | What it is |
|---|---|
| **[`js/data.js`](js/data.js)** | **All content. Start here.** |
| `js/render.js` | Pure HTML builders. Shared by browser and build. No DOM access. |
| `js/ui.js` | Hydration, observers, gear nav, theater mode, ignition loader |
| `js/palette.js` | ⌘K command palette |
| `js/speedometer.js` | The TFT instrument cluster |
| `js/casino.js` | Ambient chips and cards |
| `js/garage.js` | Drag-to-rotate vehicle viewers |
| `js/project.js` · `js/resume.js` | Case-study and resume page behaviour |
| `tools/prerender.mjs` | Static site generation, logo detection, image sizing |
| `tools/serve.mjs` | Dev server with Brotli support |
| `tools/unity-bridge/` | `.jslib` + C# so an in-game Exit button closes the embed |
| `_headers` · `_redirects` | Cloudflare Pages config |
| **[CLOUDFLARE.md](CLOUDFLARE.md)** | Deployment, and what is still left to do |
| **[DOCUMENTATION.md](DOCUMENTATION.md)** | 3D internals, troubleshooting |
| **[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md)** | Current status and open items |

**Generated — do not hand-edit:** the `<!--#SSR:*-->` blocks in `index.html`,
`resume.html`, `work/<id>/index.html`, `project.html`, `sitemap.xml`,
`robots.txt`.

## Pages

| URL | Notes |
|---|---|
| `/` | The full experience |
| `/resume.html` | Clean single-column recruiter view. `Ctrl+P` → correctly paginated PDF. Static, so it is also the most crawler-legible page. |
| `/work/<id>/` | One real, indexable URL per case study |
| `/assets/games/host/unity-game.html` | The Unity build standalone, for debugging |

## Keyboard

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` / `/` | Command palette — search every section, project, skill |
| `Esc` | Close the palette, the gallery lightbox, or exit a game |
| `Tab` | First stop is Skip to content |

---

## Adding things

### A game

1. Export from Unity: **Compression Format: Brotli**, **Decompression
   Fallback: Off**.
2. Copy `Build/` and `StreamingAssets/` into `assets/games/<id>/`.
3. Copy `assets/games/host/unity-game.html` to `assets/games/host/<id>.html`
   and update the `BUILD`, `STEM` and `STREAMING` constants at the top.
4. In `data.js` → `games.items`, set `status: 'live'`, `folder`, `embed`, `size`.
5. Optional: wire the in-game Exit button via
   [`tools/unity-bridge/`](tools/unity-bridge/README.md).

### A game logo

Drop `logo.png` (or `.jpg` / `.gif` / `.webp` / `.svg`) into the game's folder.
That's it — the build step finds it, reads its dimensions, and picks a layout.
It reports what it found and warns if the file is oversized or the wrong shape.

**Target: 960 × 540 (16:9).** The stage renders at most 459 × 258 CSS px, so
that is already 2× for retina. Keep critical artwork out of the **bottom 25%**,
where the Play button sits. Under 400 KB for animated, 150 KB for static.

### Case study media

`data.js` → `projects` → `media`, with files in `assets/work/`. Supports
`image`, `video` and `youtube`. An empty gallery is omitted entirely rather than
showing a placeholder, so partial content never looks broken.

---

## What you still need to fill in

Ordered by impact. The first two are ~65 minutes and worth more than the rest
combined.

### 🔴 Do these first

**1. Verify your GitHub and LinkedIn URLs** — `data.js` → `links`.
These were inferred from your name and may not resolve. They are now also
emitted into JSON-LD `sameAs`, where a wrong value actively misinforms Google.

**2. Set `identity.siteUrl`** — `data.js`.
Currently `https://prasad-hegde.pages.dev`, which is a guess. It drives every
canonical tag, the sitemap, JSON-LD and every social share card. Create the
Cloudflare project, see the URL you get, set it, push.

**3. Add `assets/resume.pdf`** — optional but high value.
`/resume.html` already covers the Resume link and prints cleanly, so nothing is
broken without it. When you add it, a Download button appears automatically.
**An ATS parses that PDF, never this website** — export single column, selectable
text (not an image), no tables or text boxes, standard headings. Verify by
opening it, `Ctrl+A`, `Ctrl+C`, pasting into a text editor: if the reading order
is scrambled, that is exactly what the ATS sees.

### 🟠 Content only you can write

**4. Numbers for the Tournament System case study** — `data.js` → `projects` →
`tournament-system`. It is written from what you described, but the specifics
are yours: how many titles it went into, leaderboard size, update cadence,
anything you can say without breaching NDA. One real number beats three
paragraphs.

**5. A blurb for the Unity game** — `data.js` → `games.items[0].blurb`.
It currently describes the delivery mechanism (Brotli, Addressables), which is
the least interesting part. Say what the player *does* and the one technical
thing you are proudest of.

**6. Case study media** — screenshots, video, or **architecture diagrams you
drew yourself**. Diagrams carry no NDA risk and show systems thinking better
than a screenshot. A clean diagram you made > a blurred screenshot > nothing.

**7. Certification issuers and years** — `data.js` → `certifications`.
Four bare names read as padding. Two dated certs beat four undated ones.

### 🟡 Polish

**8. Pick a tagline.** `data.js` → `identity.tagline` has four options in a
comment above it, from dry to cheeky.

**9. Shrink `Logo.gif`.** It is ~2.5 MB; the build step warns about it. An
animated `.webp` at 960×540 is typically 80% smaller. Detection already prefers
`.webp` over `.gif`, so dropping one in takes over automatically.

**10. Self-host the fonts.** Two subset `.woff2` files (~30 KB) would remove a
third-party round-trip from the critical path. Delete the Google Fonts block in
`index.html` and `tools/prerender.mjs` when you do.

**11. Enable analytics.** Cloudflare Web Analytics is free and needs no code, or
set `analytics.src` in `data.js` for Plausible/Umami.

**12. Pin some GitHub repos.** The site links your profile prominently and
recruiters click it. Start with this repo.

---

## Licence

Three.js is MIT licensed. The content is yours.
