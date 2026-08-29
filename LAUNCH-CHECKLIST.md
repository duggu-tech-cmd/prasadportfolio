# Launch checklist

Current state after the machine-readability and performance pass. The earlier
version of this file listed blockers that have since been fixed — this is the
live version.

---

## 🟢 Fixed

### Machine-readability (the "can an ATS scan it" question)

First, the correction: **an ATS cannot scan a website.** Applicant Tracking
Systems (Workday, Greenhouse, Lever, Taleo, iCIMS) parse *uploaded files*. A
portfolio URL pasted into an application is stored as a text field; nothing
crawls it. What *does* read this site is a different set of machines, and all
three used to fail:

- **Social crawlers** — LinkedIn, Slack, WhatsApp, Discord and Twitter do not
  run JavaScript. The static HTML said `<title>Portfolio</title>` and
  `"Personal portfolio"`, with the real values applied at runtime, too late.
  **Every share of this site rendered a blank card.** Now every tag, including
  `og:image:width/height/alt` and Twitter equivalents, is baked in at build
  time. The image also pointed at `prasadhegde.github.io` while the site was
  destined for Cloudflare, so the thumbnail would have 404'd too.
- **Recruiter sourcing tools** — SeekOut, HireEZ, Juicebox keyword-scrape HTML.
  The shipped page contained the name zero times. It now carries ~2,300 words
  including every employer, title, date and technology.
- **Search** — added `robots.txt`, `sitemap.xml`, per-page `<link rel=canonical>`,
  and JSON-LD `Person` + `WebSite` schema with `worksFor`, `alumniOf`,
  `knowsAbout` and `sameAs`.

### Broken links and dead ends

- The **Resume link 404'd** (`assets/resume.pdf` never existed). There is now a
  real `/resume.html` — clean, single-column, static, and it prints to a
  correctly paginated PDF. It cannot 404. If you later add the PDF, a Download
  button appears automatically via a HEAD check.
- Three case studies shared one URL (`project.html?id=`) with no per-page
  title, share card or canonical — three case studies, zero indexable pages.
  Each now lives at `/work/<id>/`. The old URLs still redirect.
- **Developer instructions were visible to visitors**: empty galleries printed
  *"Add images to assets/work/, then list them under media in js/data.js"*, and
  game cards showed `data.js → games → embed`. Both removed. Empty galleries are
  now omitted entirely rather than showing a placeholder.

### First impression

- **~1.75 MB of JavaScript loaded before a single word appeared**, behind a
  full-screen preloader whose percentage was literally `Math.random() * 18` and
  which had a 4-second hard timeout. Content is now in the HTML; Three.js is
  dynamically imported after first paint. Critical path is ~153 KB, and the
  preloader is a 2px line reporting real load stage.
- Google Fonts no longer block render. Social card went from 623 KB to 94 KB
  (PNG → JPEG, no visible difference).
- 3D is skipped entirely on `save-data` or 2G connections. Vehicle viewers only
  initialise when scrolled near.

### Credibility

- **Skill percentages are gone.** "C# 93%" is 93% of what? Self-assigned
  numbers read as naive and invite a recruiter to filter you out on a figure you
  invented. Worse: the site claimed **"JavaScript 55%"** while being a
  hand-written WebGL project in vanilla JavaScript. Replaced with evidence
  tiers — Current / Shipped / AI-Assisted — each with a note saying what you
  shipped with it. "Shipped, not current" is a thing almost no portfolio says
  out loud, and it reads as honest rather than rusty.
- **The HUD showed a fabricated RPM number.** Anyone technical opens devtools
  and notices. It now reports real `renderer.info` stats: FPS, draw calls,
  triangles.
- **This site is now listed as a project.** The hand-written instrument cluster
  was the best-proven engineering here and it appeared nowhere in Selected Work,
  while the 3D models you built illustrated *"I Ride"* and *"I Drive"*.
- Hobbies moved after Education. A five-card hobby section outranking your
  degree was inverted priority.
- Hero tagline leads with the progression and the first-of-its-kind ownership
  story rather than a language list — much harder for another candidate to claim.
- Credit inflation fixed: the tagline said *"shipping* casino games to 100+
  terminals" while the bullet said *"contributed to"*. Now consistent.

### Accessibility

- `<h1>` split the name across two adjacent spans with no whitespace, so text
  extractors read **"PRASADHEGDE"**. Fixed; capitals are CSS now.
- Added a skip link, real `<a href="#...">` nav anchors (was `<button>` +
  `scrollIntoView`, so there were no crawlable internal links), `aria-current`
  on the active section, focus management and focus trapping in the lightbox
  and command palette.
- Scroll-reveal is scoped to `html.js`, so a JavaScript failure shows the
  prerendered content rather than a page of `opacity: 0` elements.

### New

- **⌘K command palette** — indexes every section, case study, skill and shipped
  title from `data.js`.
- **`/resume.html`** doubles as the recruiter view and the PDF generator.
- Useful 404 page with recovery links instead of one button.
- CI verifies the prerender is current, JSON-LD parses, and placeholder
  metadata never comes back.
- Untracked `.local/share/pki/nssdb/*` and `.sudo_as_admin_successful` — a
  Linux home directory had been committed. They stay on disk but are no longer
  published. *(They remain in git history; rewriting that is a separate call.)*

---

## 🔴 Still blocking — these need you, not code

### 1. Verify your GitHub and LinkedIn URLs

`js/data.js` → `links`. `github.com/prasadhegde` and
`linkedin.com/in/prasadhegde` were **inferred from your name** by whoever
scaffolded this. A 404 on your own profile is the easiest own-goal on this list,
and both are now also emitted into JSON-LD `sameAs`, where a wrong value
actively misinforms Google. Check them today.

### 2. Set `identity.siteUrl`

Currently `https://prasad-hegde.pages.dev` — a guess. It drives canonical tags,
the sitemap, JSON-LD and every share card. Create the Cloudflare project, see
what URL you get, set it, push. See [CLOUDFLARE.md](CLOUDFLARE.md).

### 3. Ship one playable game

`js/data.js` → `games.items` → `status: 'live'` + `embed`. You are a game
developer whose portfolio has no playable game. Nothing else available to you
comes close to this for impact — a recruiter *playing something you built*, in
one click, in their browser.

### 4. Add media to the case studies

`js/data.js` → `projects` → `media`. You said videos and pictures are coming.

For the NDA'd Light & Wonder work, an **architecture diagram you drew yourself**
carries no NDA risk and demonstrates systems thinking better than a screenshot
would. A clean diagram you made > a blurred screenshot > nothing.

### 5. Fill in certification issuers and years

`js/data.js` → `certifications`. Four bare names read as padding. Two dated
certs beat four undated ones. Entries without a year now render without an empty
column, but that is a cosmetic patch over a content gap.

---

## 🟡 Worth doing

- **Self-host the two fonts** as subset `.woff2` (~30 KB total) and delete the
  Google Fonts block from `index.html` and `tools/prerender.mjs`. Removes a
  third-party round-trip from the critical path.
- **Enable analytics.** Cloudflare Web Analytics is free and needs no code, or
  set `analytics.src` in `data.js` for Plausible/Umami. You currently have no
  idea whether anyone reaches your contact section.
- **Submit the sitemap** to Google Search Console and Bing Webmaster Tools.
- **Re-scrape the LinkedIn card** via the Post Inspector. LinkedIn caches
  previews for up to seven days, so the old blank card will persist otherwise.
- **Add a hook line to the social card.** `assets/og-image.jpg` currently says
  only name + "Software Engineer". One more line — the first-of-its-kind
  tournament display, or intern-to-senior-in-two-years — would make it work
  harder in a LinkedIn feed.
- **`assets/og-image.png`** is now unreferenced (623 KB). Safe to delete.
- **Reconsider "100+ casino terminals."** A gaming-industry hiring manager
  knows L&W ships to tens of thousands. Framing it around markets,
  jurisdictions or titles may land better.
- **Your GitHub profile will be clicked.** If it is sparse, pin some repos —
  starting with this one.

---

## The honest summary

The build quality was always the strong part, and for a game developer a site
that is itself a rendering project is the right instinct.

The problem was never the craft — it was that **none of it was legible.** Not to
crawlers, not to LinkedIn, not to a recruiter who clicked Resume and got a 404.
A lot of chrome wrapped around three empty galleries, two "Coming Soon" cards,
and a broken link.

That layer is fixed. What remains is content only you can supply: one playable
game and real media on one case study. Those two things are worth more than any
further engineering on this list.
