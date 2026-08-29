# Portfolio — Full Documentation

Everything about how this site is built, how it works, and how it is hosted.
Written so you can pick it up months from now and still know where things are.

**Live URL:** set `identity.siteUrl` in `js/data.js`. See
[CLOUDFLARE.md](CLOUDFLARE.md).

---

> ### ⚠ Sections 3, 4, 8 and 9 predate the static-rendering change
>
> The site no longer renders its content in the browser. It is prerendered to
> static HTML at deploy time by `tools/prerender.mjs`, because client-side-only
> rendering meant crawlers, LinkedIn and recruiter sourcing tools saw an empty
> page. What changed:
>
> | Then | Now |
> |---|---|
> | `<main id="app">` empty, filled by `ui.js` | Content baked into `index.html`; `ui.js` hydrates |
> | Markup defined in `ui.js` | Markup in `js/render.js`, shared by browser **and** build |
> | Full-screen preloader with fake progress (`Math.random`) | Ignition loader on real signals, 2.5s hard cap, session-once |
> | Three.js on the critical path (~1.4 MB) | Dynamically imported after first paint |
> | `project.html?id=<x>` | `/work/<x>/` — a real page each |
> | Resume link → `assets/resume.pdf` (404) | `/resume.html`, always exists, prints to PDF |
> | `og:image` → 623 KB PNG | 94 KB JPEG, same artwork |
> | Meta tags set at runtime | Baked in at build time (crawlers do not run JS) |
> | Skill percentages (`C# 93%`) | Evidence tiers (Current / Shipped / AI-Assisted) |
>
> Sections 5, 6, 7, 10, 11 and 13 are still accurate. For the current
> architecture read [README.md](README.md), and for deployment read
> [CLOUDFLARE.md](CLOUDFLARE.md).

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Tech stack, and why](#2-tech-stack-and-why)
3. [Folder structure](#3-folder-structure)
4. [How the page boots](#4-how-the-page-boots)
5. [The content system — `data.js`](#5-the-content-system--datajs)
6. [The 3D work explained](#6-the-3d-work-explained)
7. [Performance engineering](#7-performance-engineering)
8. [Hosting on Cloudflare Pages](#8-hosting-on-cloudflare-pages)
9. [The `_headers` file, line by line](#9-the-_headers-file-line-by-line)
10. [Adding your games](#10-adding-your-games)
11. [Adding project media](#11-adding-project-media)
12. [Running it locally](#12-running-it-locally)
13. [Troubleshooting](#13-troubleshooting)
14. [Editing recipes](#14-editing-recipes)

---

## 1. What this is

A single-page portfolio built around a **digital motorcycle instrument
cluster** — the kind found on larger BMW bikes. The tachometer, speed readout
and gear indicator are all live and respond to scrolling. Casino chips and
playing cards drift in the background as a nod to the ETG work at
Light & Wonder.

There are two pages:

| Page | Purpose |
|---|---|
| `index.html` | The whole portfolio — hero, profile, experience, skills, work, games, personal, education, contact |
| `project.html` | Case-study page for a single project, driven by `?id=` in the URL |

Plus `404.html` for unmatched routes.

**Design intent:** for a game developer, a portfolio that is itself a real-time
rendering project demonstrates capability more directly than a list of bullet
points. The 3D is the argument, not the decoration.

---

## 2. Tech stack, and why

| Layer | Choice | Reason |
|---|---|---|
| Markup | Hand-written HTML | Two pages. A framework would add a build step for nothing. |
| Styling | One CSS file, custom properties | ~1400 lines. All theming sits in `:root` at the top. |
| Logic | Vanilla ES modules | Native `import`/`export`. No bundler, no `node_modules`, no build. |
| 3D | Three.js r160 (**vendored**) | The whole visual concept. Committed into the repo, not loaded from a CDN. |
| Hosting | Cloudflare Pages | Free, unmetered bandwidth, and — critically — can set HTTP headers. |

### Why there is no build step

Nothing here needs compiling. No JSX, no TypeScript, no SCSS, no tree-shaking.
Adding Vite or webpack would mean `npm install`, a lockfile, a build command
and a `dist/` folder — all to produce files nearly identical to the ones
already written.

Concretely, this means:

- **Deploy = push.** Cloudflare copies the files. Build command is empty.
- **Debug = view source.** What runs in the browser is what is in the repo.
- **No dependency rot.** Nothing to `npm audit`, nothing to update.

### Why Three.js is vendored

`js/vendor/three.module.js` (1.3 MB) is committed rather than pulled from a
CDN. That is deliberate:

- The site works with no third-party network dependency.
- No CDN outage can break it.
- The version is pinned forever; a CDN cannot silently ship a breaking change.
- Cloudflare caches it at the edge, so the size is a one-time cost per visitor.

The addons in `js/vendor/addons/` shipped with bare `import ... from 'three'`
specifiers, which browsers cannot resolve. Those were rewritten to relative
paths so no import map is required.

---

## 3. Folder structure

```
.
├── index.html              Main page. Shell, HUD chrome, boot script.
├── project.html            Case-study page. Reads ?id= from the URL.
├── 404.html                Themed not-found page. Fully self-contained.
├── _headers                Cloudflare Pages header rules. See §9.
├── .gitignore
├── README.md               Short version of this document.
├── DOCUMENTATION.md        This file.
├── LAUNCH-CHECKLIST.md     Honest review + what to fill in before sharing.
│
├── css/
│   └── style.css           All styling. Theme variables at the top.
│
├── js/
│   ├── data.js             ★ ALL CONTENT. The only file you normally edit.
│   ├── ui.js               Renders every section of index.html from data.js.
│   ├── project.js          Renders project.html, incl. gallery + lightbox.
│   ├── speedometer.js      The digital TFT instrument cluster.
│   ├── casino.js           Falling / floating chips and cards.
│   ├── garage.js           Solid 3D bike and car models + their viewers.
│   └── vendor/
│       ├── three.module.js         Three.js r160 (MIT)
│       └── addons/                 Post-processing, loaders, utils
│
└── assets/
    ├── favicon.svg         Speedometer icon.
    ├── og-image.png        1200x630 social share card.
    ├── resume.pdf          ← YOU ADD THIS
    ├── work/               ← Project screenshots / video
    └── games/              ← Unity + Godot web builds
```

### Which files you will actually touch

- **`js/data.js`** — all text, jobs, skills, projects, games. 95% of edits.
- **`css/style.css`** — only the `:root` block, to change colours.
- **`assets/`** — dropping in your PDF, images, and game builds.

Everything else is machinery.

---

## 4. How the page boots

The boot sequence lives in the inline `<script type="module">` at the bottom of
`index.html`. In order:

1. **Preloader shows.** A fake-but-honest progress bar runs while modules parse.
2. **`renderSite()`** (`ui.js`) reads `DATA` and writes every section into
   `#app` as HTML, then builds the gear-shifter nav from `SECTIONS`.
3. **`initSpeedometer()`** (`speedometer.js`) starts the hero WebGL scene.
   It returns `{ok:false}` if WebGL is unavailable, and the hero falls back to
   a CSS glow rather than showing a dead canvas.
4. **Vehicle viewers** start for each `.vehicle-canvas` found.
5. **`initInteractions()`** wires scroll reveals, skill-bar fills, gear nav,
   the live RPM readout, stat count-ups, and the Gmail click handler.
6. **Preloader hides.** There is a hard 4-second timeout so a visitor can never
   get stuck behind it, even if something above throws.

Every step is inside a `try/catch`. A failure in the 3D never blocks the text.

### Why content is rendered by JS rather than written in HTML

One source of truth. Your job title appears in the page `<title>`, the HUD
corner, the hero eyebrow, the hero role line, and the meta description. Written
by hand that is five places to update and four places to forget. From `data.js`
it is one line.

The trade-off is that the raw HTML is nearly empty, which matters for SEO
crawlers that do not execute JavaScript. Google does execute it. For a personal
portfolio, where traffic comes from a link you send rather than a search
result, this is the right trade.

---

## 5. The content system — `data.js`

Everything on the site comes from one exported object.

```js
export const DATA = {
  identity:       { ... },   // name, title, tagline, email, location
  links:          [ ... ],   // social icons (github/linkedin/mail/globe)
  gauge:          { ... },   // maxRpm, redline, maxSpeed for the cluster
  about:          { ... },   // profile paragraphs + 3 stat readouts
  competencies:   [ ... ],   // chips under the profile
  experience:     [ ... ],   // timeline entries
  projects:       [ ... ],   // work cards AND their case-study pages
  games:          [ ... ],   // playable embeds
  skills:         [ ... ],   // grouped bars, level 0-100
  bits:           { ... },   // "Interesting Bits" cards + dream vehicles
  education:      [ ... ],
  certifications: [ ... ],
  languages:      [ ... ],
  titles:         [ ... ],   // shipped game titles
  contact:        { ... },
};

export const SECTIONS = [ ... ];  // gear nav: order, gear letter, label
```

### How a project becomes a page

Each entry in `projects` has an `id`:

```js
{
  id: 'tournament-display',
  name: 'Tournament Display',
  sub: 'First video-integrated tournament system on the platform',
  blurb: '...',                    // shown on the card
  stack: ['C#', '.NET', 'Unity'],
  metric: { value: '1st', label: 'of its kind' },
  detail: {                        // shown on the case-study page
    role: '...', timeline: '...', company: '...',
    summary: [ 'para', 'para' ],
    highlights: [ 'bullet', 'bullet' ],
  },
  media: [ ... ],                  // gallery, see §11
}
```

The card links to `project.html?id=tournament-display`. `project.js` reads that
query parameter, finds the matching object, and renders it. An unknown id shows
a clean "not found" state instead of a blank page.

**To add a project:** append an object with a unique `id`. The card and the page
both appear. Nothing else to wire.

### Reordering or removing sections

`SECTIONS` controls the gear nav and nothing else renders without it:

```js
{ id: 'games', gear: '5', label: 'Games' },
```

Delete the entry to remove it from the nav. Delete the matching data key
(e.g. `games`) and the section stops rendering entirely — the builders return
an empty string when their data is missing.

---

## 6. The 3D work explained

Three separate WebGL scenes run on the page.

### 6.1 The instrument cluster — `speedometer.js`

A **digital TFT dash**, not an analog needle. The entire display is painted to
a 2D canvas each frame and mapped as a texture onto a screen plane inside a
modelled housing, so it reads as a backlit panel rather than a gauge.

What is drawn:

- **Segmented LED tachometer** across the top. Segments grow taller toward the
  redline, turn red past it, and a `SHIFT UP` warning blinks at the limiter.
- **Digital speed readout**, large, left of centre.
- **Gear indicator** (N, 1–6) and `SPORT / ABS / DTC / DDC` mode text, right.
- Fuel and temperature bars, trip readout, `READY` status.

The **centre band is deliberately left empty** — that is where the hero name
sits in the DOM. The instruments were pushed to the outer thirds specifically
so the text stays legible over the display.

**What drives the needle:** an ignition self-test sweep on load (wall-clock
timed, so it takes 2.2s regardless of frame rate), then
`idle + scrollProgress + scrollVelocity`. Bloom strength rises with revs.

### 6.2 Casino layer — `casino.js`

Chips and playing cards falling and drifting behind the dash.

- **Chips** are single cylinders. Face rings and edge dashes are baked into
  canvas textures rather than built as child meshes — that change alone cut
  roughly 270 draw calls down to 30.
- **Cards** are rounded planes with a painted suit face and a lattice back,
  drawn double-sided as one mesh.

Everything is constrained to a z-range **behind** the cluster so nothing ever
crosses in front of the text. Scroll speed increases their fall rate. Counts
scale down on narrow screens and low-core devices.

### 6.3 Vehicles — `garage.js`

Solid, shaded 3D models of a BMW S1000XR and a Range Rover Velar, generated
procedurally from primitives and extruded profiles. **No logos or brand marks
anywhere** — they are proportion studies, not replicas.

- **Bike:** beaked fairing, USD forks, inline-4 block with cooling fins,
  swingarm, chain, sprocket, monoshock with spring coils, exhaust can.
- **Car:** long hood, raked A-pillar, falling fastback roofline, flush door
  handles, roof rails, arch trims, lamp units.

Materials are painted metal, glass, rubber and chrome, lit by a three-point rig
with a `RoomEnvironment` map for reflections and a soft contact shadow.

**Interaction:** drag to rotate; release and it eases into a slow auto-spin.

**Auto-framing:** the camera fits each model from its bounding box, computing
the distance needed against *both* the vertical and horizontal field of view,
using the box diagonal so the model cannot clip mid-rotation. This is why both
vehicles sit correctly in frame at any card size.

**Swapping in a real model:** `GLTFLoader.js` is already vendored. Replace the
`buildBike()` / `buildCar()` call with a loader call — the viewer harness around
it is unchanged.

---

## 7. Performance engineering

Three WebGL contexts on one page is a lot. These guards keep it smooth, and
each one came from an actual measurement.

| Guard | What it fixed |
|---|---|
| **Hero stops rendering when scrolled past** | Biggest single win. A full-screen canvas with a bloom pass was rendering forever. Measured ~2 → ~25 fps on a software renderer. |
| **TFT canvas repaints at 30fps, not 60** | The canvas→GPU texture upload was the hot path, not the 3D. |
| **Screen texture is 1280×640, was 2048×1024** | 4x fewer pixels to paint and upload per update. |
| **No `transmission` materials** | `MeshPhysicalMaterial` with transmission forces an extra full-scene render pass *per material, per frame*. Cost ~30fps for refraction invisible at 455px wide. |
| **Vehicle viewers throttle to 20fps unless hovered** | Two lit scenes were rendering simultaneously when you only ever look at one. |
| **Geometry batched by material** | A single wheel is ~18 primitives; the car has four. Merged at load. |
| **Chip detail baked into textures** | ~270 draw calls → ~30. |
| **DPR capped at 1.5 (1 on low-power)** | Bloom is fill-rate bound; 2x DPR costs 4x the pixels for little visible gain. |
| **Adaptive resolution** | If the hero measures under 40fps over its first 90 frames, it drops render scale once, automatically. |
| **Everything pauses off-screen and on hidden tabs** | `IntersectionObserver` + `visibilitychange`. |

Chip and card counts also scale down on `hardwareConcurrency <= 4` and on
mobile user agents.

### Accessibility and fallbacks

- **No WebGL:** every viewer returns `{ok:false}`; the hero shows a CSS glow.
- **`prefers-reduced-motion`:** ambient rotation, idle rev and drift disabled.
- **No JavaScript:** the page is empty. Accepted trade-off (see §4).

---

## 8. Hosting on Cloudflare Pages

### Why Cloudflare rather than GitHub Pages

The deciding factor is the Games section.

**GitHub Pages cannot set HTTP response headers.** That has two consequences:

1. Unity WebGL builds must be exported with compression **Disabled**. A build
   that would be ~8 MB with Brotli ships as ~25 MB.
2. Godot 4's multi-threaded web export **cannot work at all**, because it needs
   `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers.

**Cloudflare Pages can set headers**, via the `_headers` file in this repo. So
you get Brotli-compressed Unity builds and working Godot exports.

Secondary benefits: unmetered bandwidth on the free tier, a 330+ location edge
network, and no commercial-use restriction.

### One-time setup

1. Push this repo to GitHub (Cloudflare reads from it; you are not *hosting*
   there).
2. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**.
3. Authorise and select the repository.
4. Build settings:

   | Field | Value |
   |---|---|
   | Framework preset | **None** |
   | Build command | **(leave completely empty)** |
   | Build output directory | **`/`** |
   | Root directory | **(leave empty)** |

5. **Save and Deploy.**

Live at `https://<project-name>.pages.dev` in under a minute.

> The build command **must be empty**. If you put anything there, Cloudflare
> will try to run it, fail, and the deploy stops. There is nothing to build.

### Ongoing use

```bash
git add .
git commit -m "Update projects"
git push
```

Cloudflare redeploys automatically. Each branch also gets its own preview URL,
so you can push a `draft` branch and review it before merging to `main`.

### Custom domain

Cloudflare Pages → your project → **Custom domains** → **Set up a domain**.

If the domain is already on Cloudflare DNS, it configures itself. If not, you
add a `CNAME` record pointing at `<project>.pages.dev`. HTTPS is automatic.

You do **not** need a `CNAME` file in the repo — that is a GitHub Pages
convention and is ignored here.

### Free tier limits (and where this site sits)

| Limit | Cloudflare free tier | This site |
|---|---|---|
| Bandwidth | Unmetered | — |
| Requests | Unlimited | — |
| Builds | 500 / month | ~1 per push |
| Files per deploy | 20,000 | **36** |
| Max file size | 25 MiB | **1.3 MB** (three.module.js) |
| Total site size | — | **~2.3 MB** |

Adding a Unity build is the only thing likely to move these numbers. A large
build can add hundreds of files; still far inside 20,000. Watch the **25 MiB
per-file** cap — a single uncompressed `.data` file can exceed it, which is
another reason to use Brotli.

---

## 9. The `_headers` file, line by line

`_headers` is a plain text file in the repo root. Cloudflare parses it and
applies the rules to matching responses. It is **not** served as a public asset.

### Syntax rules that bite

```
/some/path/*
  Header-Name: value
  Another-Header: value
```

- The path line is **not indented**. Header lines **are**.
- **Only one `*` per path.** `/games/*/Build/*.wasm` is invalid — two splats.
  This is the most common mistake, and Cloudflare **fails silently**: no build
  error, the headers simply never apply.
- Max **100 rules**, max **2000 characters** per line.

Because of the single-splat rule, the game folder names are written out in
full (`/assets/games/unity-game/Build/*.wasm.br`). **If you rename a folder
under `assets/games/`, rename it in `_headers` too** or the headers stop
applying and Unity will fail to load with a `Content-Encoding` error.

### What each block does

| Block | Purpose |
|---|---|
| `/assets/games/unity-game/Build/*.br` | Tells the browser these files are Brotli-compressed, with correct MIME types. Without this Unity throws "Unable to parse … build compression was enabled but web server … misconfigured". |
| `…*.gz` variants | Same, if you export with Gzip instead. |
| `…*.wasm` | Correct MIME on uncompressed wasm enables streaming compilation (faster start). |
| `/assets/games/godot-game/*` | COOP/COEP headers for `SharedArrayBuffer`. **Scoped to that folder only** — applying site-wide would break embedded YouTube iframes in the project galleries. |
| `/js/vendor/*` | Three.js is version-pinned, so cache for a year. |
| `/*.html` | Always revalidate, so edits appear immediately after deploy. |
| `/js/*.js` | Short cache — this is where your content lives. |
| `/*` | Baseline security headers. |

### Verifying headers actually applied

After deploying, from a terminal:

```bash
curl -I https://your-site.pages.dev/assets/games/unity-game/Build/xxx.wasm.br
```

You want to see `content-encoding: br` and `content-type: application/wasm`.
If those are missing, the rule did not match — check for a double splat or a
renamed folder.

---

## 10. Adding your games

Both cards currently show "Coming Soon" because `embed` is `null` in `data.js`.

### Unity WebGL

1. **File → Build Settings → WebGL → Switch Platform**
2. **Player Settings → Publishing Settings:**
   - Compression Format: **Brotli**
   - Decompression Fallback: **OFF**
   - (Brotli works here precisely because `_headers` sets the encoding.)
3. Build into `assets/games/unity-game/`
4. In `data.js`:
   ```js
   embed: 'assets/games/unity-game/index.html',
   ```

If the folder name differs from `unity-game`, update `_headers` to match.

### Godot 4

1. **Project → Export → Add… → Web**
2. Export path: `assets/games/godot-game/index.html`
3. Threading: the COOP/COEP headers in `_headers` mean you **can** use the
   multi-threaded export here (unlike on GitHub Pages). If you hit issues,
   turning **Extensions Support off** gives a single-threaded build that works
   without those headers.
4. In `data.js`:
   ```js
   embed: 'assets/games/godot-game/index.html',
   ```

### Size warning

Unity builds are large. GitHub has a **100 MB per-file** hard limit and warns
above 50 MB — and your repo still goes through GitHub even though Cloudflare
does the hosting. If a build is too big, host it on itch.io and point `embed`
at the itch embed URL instead. The iframe does not care where it points.

---

## 11. Adding project media

Drop files in `assets/work/`, then list them in the project's `media` array:

```js
media: [
  { type: 'image',   src: 'assets/work/tournament-01.jpg', caption: 'Overlay in play' },
  { type: 'video',   src: 'assets/work/demo.mp4',          caption: 'Live playback' },
  { type: 'youtube', id:  'dQw4w9WgXcQ',                   caption: 'Walkthrough' },
],
```

Clicking a tile opens a lightbox — arrow keys navigate, `Esc` closes. With an
empty array the page shows a tidy placeholder instead of a broken gallery.

**Use `youtube` for anything long.** Video files inflate the repo and hit
GitHub's file size limits. An unlisted YouTube video works fine and costs
nothing.

> **Confidentiality:** the L&W work is internal product software. Confirm what
> you are cleared to publish before adding screenshots. Architecture diagrams
> you draw yourself are usually safe and arguably demonstrate systems thinking
> better than a screenshot anyway.

---

## 12. Running it locally

ES modules will **not** load over `file://`. You must serve over HTTP.

```bash
cd path/to/portfolio
python -m http.server 8080
```

Open `http://localhost:8080`. (`python3` on some systems.)

Alternatives: `npx serve -l 8080`, or the **Live Server** extension in VS Code
(right-click `index.html` → Open with Live Server), which auto-reloads on save.

### What to check

- Cluster boots with a rev sweep, settles to idle
- Scrolling revs the tach and speeds up the falling chips
- Gear buttons scroll to sections
- **View Details** opens a case-study page
- Bike and car drag to rotate
- Console (F12) is clean

> `_headers` does nothing locally — Python's server ignores it. Header
> behaviour can only be verified on a real Cloudflare deploy.

---

## 13. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Blank page, console: "Failed to load module" | Opened via `file://`. Use a local server (§12). |
| Cloudflare build fails immediately | Build command must be **empty**, output directory `/`. |
| Unity: "Unable to parse … Content-Encoding" | `_headers` rule not matching. Check for a double splat, or a game folder renamed without updating `_headers`. Verify with `curl -I`. |
| Godot: "SharedArrayBuffer is not defined" | COOP/COEP headers not applied. Check the `/assets/games/godot-game/*` rule, or use a single-threaded export. |
| Headers seem ignored | Cloudflare fails silently on invalid `_headers`. Most likely two `*` in one path. |
| Social preview shows nothing | `og:image` must be an absolute URL. It is generated from the live origin at runtime, so it self-corrects — but the scraper needs to reach `assets/og-image.png`. |
| Page feels heavy on an old laptop | Adaptive quality should kick in after ~90 frames. To force it lower, reduce `CHIP_N` / `CARD_N` in `casino.js`. |
| Changes not appearing | Hard refresh (`Ctrl/Cmd+Shift+R`). HTML revalidates, but the browser may hold JS for up to 10 min per the cache rule. |

---

## 14. Editing recipes

### Change the accent colour

`css/style.css`, the `:root` block:

```css
--cyan: #5fe6ff;   /* primary accent */
--red:  #ff3b30;   /* redline + tail lamps */
--bg:   #04070a;   /* background */
```

Then match the 3D: the `COL` object at the top of `speedometer.js` and the
`ACCENT` / `RED` constants in `garage.js` use hex **numbers** (`0x5fe6ff`), not
strings.

### Change the vehicle paint

`garage.js`:

```js
const PAINT_BIKE = 0x1c6f8c;   // deep teal
const PAINT_CAR  = 0x243a47;   // graphite blue
```

### Change the tachometer range

`data.js`:

```js
gauge: { maxRpm: 14, redline: 12, maxSpeed: 299 },
```

The scale, segment count, redline colouring and the digital readout all derive
from these.

### Remove a whole section

Delete its key from `DATA` and its entry from `SECTIONS`. The builder returns
an empty string when its data is missing, so nothing breaks.

### Add a new social link

`data.js` → `links`. Available `icon` values: `github`, `linkedin`, `mail`,
`phone`, `globe`, `twitter`. Anything starting with `mailto:` is automatically
upgraded to open Gmail compose on desktop.

---

## Licence

Your content is yours. Three.js is MIT licensed — see the header in
`js/vendor/three.module.js`.
