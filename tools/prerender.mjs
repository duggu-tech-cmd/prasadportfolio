#!/usr/bin/env node
/* ============================================================================
   tools/prerender.mjs — bake js/data.js into static HTML
   ----------------------------------------------------------------------------
   WHY THIS EXISTS
   ---------------
   The site used to render everything client-side into an empty <main>. That
   meant the shipped HTML contained the name zero times, and:

     · LinkedIn / Slack / WhatsApp / Discord / Twitter crawlers do NOT run
       JavaScript. Every share preview read "Portfolio — Personal portfolio",
       because the real values were only applied at runtime.
     · Recruiter sourcing tools (SeekOut, HireEZ, Juicebox) keyword-scrape
       HTML. They extracted nothing — no "Unity", no "C#", no employer.
     · Googlebot does render JS, but on a delayed second pass and a budget.

   This script closes that hole without adding a framework, a bundler, or a
   single npm dependency. It imports the SAME render functions the browser
   uses (js/render.js), so the crawler-visible markup cannot drift from the
   interactive markup.

   USAGE
   -----
     node tools/prerender.mjs            # write files
     node tools/prerender.mjs --check    # verify output is current, write nothing

   It is idempotent: running it twice produces identical output. The generated
   HTML is committed to the repo, so the site still deploys correctly even on a
   host with no build step configured.

   GENERATES
   ---------
     index.html          (head / nav / content / footer blocks, in place)
     resume.html         recruiter + print view, fully static
     work/<id>/index.html   one real URL per case study
     project.html        legacy ?id= redirect, kept so old links survive
     sitemap.xml
     robots.txt
   ========================================================================== */

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { DATA, SECTIONS } from '../js/data.js';
import {
  buildSections, buildGearNav, buildHead, buildProjectDetail,
  buildResumeBody, footerText, esc, siteOrigin, projectUrl, ICONS,
} from '../js/render.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CHECK = process.argv.includes('--check');

const rd = (p) => readFile(join(ROOT, p), 'utf8');
const changed = [];

async function write(relPath, content) {
  const abs = join(ROOT, relPath);
  let prev = null;
  try { prev = await readFile(abs, 'utf8'); } catch { /* new file */ }
  if (prev === content) return false;

  changed.push(relPath);
  if (CHECK) return true;

  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
  return true;
}

/* ---- marker replacement ------------------------------------------------
   Replaces the content between <!--#SSR:name--> and <!--#/SSR:name-->,
   leaving the markers in place so the operation is repeatable.            */
function inject(html, name, content) {
  const open = `<!--#SSR:${name}-->`;
  const close = `<!--#/SSR:${name}-->`;
  const a = html.indexOf(open);
  const b = html.indexOf(close);
  if (a === -1 || b === -1) {
    throw new Error(
      `index.html is missing the ${open} ... ${close} markers. ` +
      `Restore them or the prerender cannot place content.`
    );
  }
  return html.slice(0, a + open.length) + content + html.slice(b);
}

const now = new Date();
const YEAR = now.getFullYear();
const TODAY = now.toISOString().slice(0, 10);

const { identity } = DATA;
const ORIGIN = siteOrigin();

if (!/^https:\/\/[^/]+$/.test(ORIGIN)) {
  console.warn(
    `\n  ⚠  identity.siteUrl is "${identity.siteUrl}".\n` +
    `     This drives canonical tags, sitemap.xml, JSON-LD and every social\n` +
    `     share card. Social crawlers need absolute URLs and cannot guess.\n` +
    `     Set it to your real address in js/data.js (no trailing slash).\n`
  );
}

/* ============================================================================
   0. GAME LOGOS — filesystem discovery
   ----------------------------------------------------------------------------
   Drop `logo.png` (or .jpg / .gif / .webp / .svg) into a game's own folder and
   it appears on the card. No data.js edit required.

   This has to happen here rather than in js/render.js because render.js is
   shared with the browser and must never touch the filesystem. So the build
   step resolves the path and assigns it onto the DATA object; render.js just
   reads `x.logo`.

   Extension order is preference order: vector first, then modern raster, then
   GIF (animated logos work), then JPEG last since it cannot do transparency
   and a logo almost always wants it.
   ========================================================================== */
const LOGO_EXTS = ['svg', 'png', 'webp', 'gif', 'jpg', 'jpeg'];
const logos = [];
const warnings = [];

/* Widest the stage is ever rendered, in CSS pixels.
   Derived from the layout, not guessed:
     .section   max-width 1180  −  2 x --gut (64 at >=1280px)      = 1052
     .games-grid  repeat(auto-fit, minmax(340px, 1fr)) + 22px gap
                  3 cols would need 3*340+2*22 = 1064 > 1052, so 2 cols
                  (1052 − 22) / 2                                  =  515
     .panel     −2 x 28px padding                                  =  459
   Doubling that for retina gives the recommended export width. */
const MAX_STAGE_W = 459;
const RECOMMEND_W = 960;        // clean 16:9 at 2x, with a little headroom

/** '16 / 9' -> 1.777…  Accepts '16/9', '16 / 9', or a bare number. */
function parseAspect(s) {
  const m = String(s).match(/([\d.]+)\s*\/\s*([\d.]+)/);
  if (m) return (+m[1]) / (+m[2]);
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 16 / 9;
}

/* ----------------------------------------------------------------------------
   imageSize — read intrinsic dimensions from the file header.

   Needed because the card layout has to adapt to the logo's shape: a portrait
   logo stacked above the Play button in a 16:9 stage gets squeezed to a sliver,
   whereas beside it there is plenty of room. Guessing is not good enough, so
   parse the headers. Dependency-free — the whole point of this repo is that
   `npm install` is never required.

   Returns { w, h } or null if the format is not recognised.
   ---------------------------------------------------------------------------- */
function imageSize(buf, ext) {
  try {
    if (ext === 'gif' && buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
      // Logical screen descriptor: two little-endian uint16 at offset 6.
      return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    }

    if (ext === 'png' && buf.length > 24 && buf.toString('ascii', 12, 16) === 'IHDR') {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }

    if ((ext === 'jpg' || ext === 'jpeg') && buf[0] === 0xFF && buf[1] === 0xD8) {
      // Walk the segment chain looking for a Start-Of-Frame marker.
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xFF) { i++; continue; }
        const marker = buf[i + 1];
        // SOF0-3, SOF5-7, SOF9-11 carry the frame dimensions.
        if ((marker >= 0xC0 && marker <= 0xC3) ||
            (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB)) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) { i += 2; continue; }
        i += 2 + buf.readUInt16BE(i + 2);
      }
      return null;
    }

    if (ext === 'webp' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') {
        // Canvas size is stored minus one, as two 24-bit little-endian values.
        const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return { w, h };
      }
      if (chunk === 'VP8 ') {
        return { w: buf.readUInt16LE(26) & 0x3FFF, h: buf.readUInt16LE(28) & 0x3FFF };
      }
      if (chunk === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: 1 + (b & 0x3FFF), h: 1 + ((b >> 14) & 0x3FFF) };
      }
      return null;
    }

    if (ext === 'svg') {
      const s = buf.toString('utf8', 0, 4096);
      const vb = s.match(/viewBox\s*=\s*["']\s*[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
      if (vb) return { w: Math.round(+vb[1]), h: Math.round(+vb[2]) };
      const w = s.match(/\bwidth\s*=\s*["']([\d.]+)/i);
      const h = s.match(/\bheight\s*=\s*["']([\d.]+)/i);
      if (w && h) return { w: Math.round(+w[1]), h: Math.round(+h[1]) };
      return null;
    }
  } catch { /* malformed header — fall through */ }
  return null;
}

async function resolveGameLogos() {
  const items = DATA.games?.items || [];

  for (const g of items) {
    if (g.logo) continue;                     // explicit value in data.js wins

    /* Prefer an explicit `folder`. It matters because `embed` now points at a
       host page outside the build folder (assets/games/host/<id>.html), so
       deriving the directory from the embed path would look for the logo in
       the wrong place. */
    let dir = g.folder
      || (g.embed && !/^(https?:)?\/\//.test(g.embed) && !/\/host\//.test(g.embed)
            ? dirname(g.embed).split(/[\\/]/).join('/')
            : `assets/games/${g.id}`);

    let files;
    try {
      files = await readdir(join(ROOT, dir));
    } catch {
      continue;                               // folder does not exist yet
    }

    // Case-insensitive match, but keep the real filename for the URL — some
    // hosts are case-sensitive and Logo.PNG must be linked as Logo.PNG.
    const byLower = new Map(files.map((f) => [f.toLowerCase(), f]));
    for (const ext of LOGO_EXTS) {
      const hit = byLower.get(`logo.${ext}`);
      if (!hit) continue;

      g.logo = `${dir}/${hit}`;

      // Measure it so the card can lay itself out around the real shape.
      const abs = join(ROOT, dir, hit);
      const buf = await readFile(abs);
      const dim = imageSize(buf, ext);
      const kb  = buf.length / 1024;

      if (dim && dim.w && dim.h) {
        g.logoW = dim.w;
        g.logoH = dim.h;
      }

      const shape = dim ? (dim.w / dim.h >= 1.15 ? 'wide' : 'tall') : 'unknown';
      logos.push(
        `${g.id} → ${g.logo}` +
        (dim ? `  (${dim.w}×${dim.h}, ${shape}, ${kb.toFixed(0)} KB)` : `  (${kb.toFixed(0)} KB)`)
      );

      /* --- aspect-ratio check -------------------------------------------
         In the default logo-fill layout the logo is stretched across the whole
         stage with object-fit: cover, so an asset cut to a different aspect
         ratio gets cropped. Report the exact target rather than letting the
         crop be a surprise. */
      const stage = parseAspect(g.aspect || '16 / 9');
      if (dim && dim.w && dim.h && g.logoFill !== false) {
        const have = dim.w / dim.h;
        const drift = Math.abs(have - stage) / stage;
        if (drift > 0.12) {
          const targetH = Math.round(RECOMMEND_W / stage);
          warnings.push(
            `${hit} is ${dim.w}×${dim.h} (${have.toFixed(2)}:1) but the stage is ` +
            `${g.aspect || '16 / 9'} (${stage.toFixed(2)}:1), so object-fit: cover will ` +
            `crop about ${Math.round(drift * 100)}% of it.\n` +
            `     Re-export at ${RECOMMEND_W}×${targetH} to fill the stage exactly, ` +
            `or set logoFit: 'contain' / logoFill: false in js/data.js.`
          );
        }
      }

      // A logo is decoration on a page whose whole point is loading fast.
      // Say so rather than letting it slide.
      if (kb > 400) {
        const targetH = Math.round(RECOMMEND_W / stage);
        warnings.push(
          `${hit} is ${kb.toFixed(0)} KB` +
          (dim ? ` at ${dim.w}×${dim.h}` : '') +
          ` — the stage renders at most ${MAX_STAGE_W}×${Math.round(MAX_STAGE_W / stage)} CSS px, ` +
          `so ${RECOMMEND_W}×${targetH} is already 2x for retina.\n` +
          `     An animated .webp at that size is typically 80% smaller than a GIF.`
        );
      }
      break;
    }
  }
}

/* ============================================================================
   1. index.html
   ========================================================================== */
async function doIndex() {
  let html = await rd('index.html');

  html = inject(html, 'head', '\n' + buildHead({
    title: `${identity.name} — ${identity.title}`,
    desc:  identity.metaBlurb,
    path:  '',
    type:  'profile',
  }) + '\n');

  html = inject(html, 'nav', buildGearNav());
  html = inject(html, 'app', '\n' + buildSections() + '\n');
  html = inject(html, 'footer', esc(footerText(YEAR)));

  // Mark the footer as baked so ui.js does not overwrite it on hydrate.
  html = html.replace(
    '<p id="footer-text">',
    '<p id="footer-text" data-baked="1">'
  );

  await write('index.html', html);
}

/* ============================================================================
   2. shared page shell for generated pages
   ========================================================================== */
function shell({ head, body, depth, bodyClass = '', scripts = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#04070a">
<meta name="robots" content="index, follow, max-image-preview:large">

<!-- Progressive enhancement flag — see the note in index.html. -->
<script>document.documentElement.classList.add('js')</script>

<!-- Generated by tools/prerender.mjs from js/data.js — do not edit by hand. -->
${head}

<link rel="icon" href="${depth}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" media="print" onload="this.media='all';this.onload=null"
      href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap">
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap">
</noscript>
<link rel="stylesheet" href="${depth}css/style.css">
</head>

<body class="${bodyClass}">
<a class="skip-link" href="#main">Skip to content</a>
${body}
${scripts}
</body>
</html>
`;
}

/* ============================================================================
   3. work/<id>/index.html — a real URL per case study
   ----------------------------------------------------------------------------
   Previously all three case studies lived at project.html?id=<x>: one page,
   three query strings, no per-page title, no per-page share card, no
   canonical. Three case studies, zero indexable pages.
   ========================================================================== */
async function doProjects() {
  const depth = '../../';

  for (const p of DATA.projects) {
    const head = buildHead({
      title: `${p.name} — ${identity.name}`,
      desc:  p.blurb.slice(0, 300),
      path:  projectUrl(p.id),
      type:  'article',
    });

    const body = `
<div class="bg-grid" aria-hidden="true"></div>
<div class="bg-vignette" aria-hidden="true"></div>
<div class="bg-scan" aria-hidden="true"></div>

<div class="hud hud-tl">
  <a class="mark" href="${depth}index.html">${esc(identity.name)}</a>
  <span class="sub">${esc(identity.title)}</span>
</div>

<header class="subnav">
  <a class="back-link" href="${depth}index.html#projects">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
    Back to Work
  </a>
</header>

<main id="main">
${buildProjectDetail(p, { depth })}
</main>

<footer>
  <p>${esc(footerText(YEAR))}</p>
</footer>

<div id="lightbox" class="lightbox" hidden>
  <button class="lb-close" aria-label="Close">&times;</button>
  <button class="lb-prev" aria-label="Previous">&#8249;</button>
  <button class="lb-next" aria-label="Next">&#8250;</button>
  <div class="lb-body"></div>
  <div class="lb-caption"></div>
</div>`;

    const scripts = `
<script type="module">
  import { initProjectPage } from '${depth}js/project.js';
  initProjectPage(${JSON.stringify(p.id)}, ${JSON.stringify(depth)});
</script>`;

    await write(`work/${p.id}/index.html`,
      shell({ head, body, depth, bodyClass: 'subpage', scripts }));
  }

  // Remove stale directories for projects that no longer exist in data.js.
  const workDir = join(ROOT, 'work');
  if (existsSync(workDir)) {
    const ids = new Set(DATA.projects.map((p) => p.id));
    for (const entry of await readdir(workDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !ids.has(entry.name)) {
        changed.push(`work/${entry.name}/ (removed)`);
        if (!CHECK) await rm(join(workDir, entry.name), { recursive: true, force: true });
      }
    }
  }
}

/* ============================================================================
   4. resume.html — the recruiter view
   ----------------------------------------------------------------------------
   Solves three problems at once:
     · The Resume link used to 404 (assets/resume.pdf never existed). This
       page always exists, so it cannot.
     · Recruiters who want facts rather than a rendering demo get a clean
       single-column document.
     · Ctrl+P produces a correctly paginated PDF via the print stylesheet.
   ========================================================================== */
async function doResume() {
  const head = buildHead({
    title: `Resume — ${identity.name}, ${identity.title}`,
    desc:  `Resume of ${identity.name}. ${identity.metaBlurb}`,
    path:  'resume.html',
    type:  'profile',
  });

  const body = `
<main id="main" class="resume-shell">
${buildResumeBody()}
</main>`;

  const scripts = `
<script type="module">
  import { initResumePage } from './js/resume.js';
  initResumePage();
</script>`;

  await write('resume.html',
    shell({ head, body, depth: '', bodyClass: 'resume-mode', scripts }));
}

/* ============================================================================
   5. project.html — legacy redirect
   ----------------------------------------------------------------------------
   Anything already shared as project.html?id=<x> keeps working and lands on
   the new canonical URL.
   ========================================================================== */
async function doLegacyRedirect() {
  const map = Object.fromEntries(DATA.projects.map((p) => [p.id, projectUrl(p.id)]));
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Redirecting…</title>
<link rel="stylesheet" href="css/style.css">
<script>
  /* Case studies moved from project.html?id=<x> to /work/<x>/.
     Generated by tools/prerender.mjs — do not edit by hand. */
  (function () {
    var map = ${JSON.stringify(map, null, 2)};
    var id = new URLSearchParams(location.search).get('id');
    location.replace(map[id] || 'index.html#projects');
  })();
</script>
</head>
<body class="subpage">
  <noscript>
    <div class="loading-state">
      <p>This page moved.</p>
      <ul>
        ${DATA.projects.map((p) => `<li><a href="${projectUrl(p.id)}">${esc(p.name)}</a></li>`).join('\n        ')}
      </ul>
    </div>
  </noscript>
  <div class="loading-state">Redirecting…</div>
</body>
</html>
`;
  await write('project.html', html);
}

/* ============================================================================
   6. sitemap.xml + robots.txt
   ========================================================================== */
async function doSitemap() {
  const urls = [
    { loc: `${ORIGIN}/`,            pri: '1.0', freq: 'weekly'  },
    { loc: `${ORIGIN}/resume.html`, pri: '0.9', freq: 'monthly' },
    ...DATA.projects.map((p) => ({
      loc: `${ORIGIN}/${projectUrl(p.id)}`, pri: '0.8', freq: 'monthly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/prerender.mjs — do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
  await write('sitemap.xml', xml);

  await write('robots.txt', `# ${identity.name} — portfolio
User-agent: *
Allow: /
Disallow: /tools/

Sitemap: ${ORIGIN}/sitemap.xml
`);
}

/* ============================================================================
   RUN
   ========================================================================== */
try {
  await resolveGameLogos();   // must run before anything renders a game card
  await doIndex();
  await doProjects();
  await doResume();
  await doLegacyRedirect();
  await doSitemap();

  const label = CHECK ? 'would change' : 'wrote';
  if (!changed.length) {
    console.log('✓ prerender: everything already up to date');
  } else {
    console.log(`✓ prerender: ${label} ${changed.length} file(s)`);
    changed.forEach((f) => console.log(`    ${f}`));
  }
  console.log(`  site      ${ORIGIN}`);
  console.log(`  sections  ${SECTIONS.length}`);
  console.log(`  projects  ${DATA.projects.length}`);

  const games = DATA.games?.items || [];
  console.log(`  games     ${games.filter((g) => g.status === 'live' && g.embed).length} playable / ${games.length}`);
  if (logos.length) {
    console.log(`  logos     ${logos.length} found`);
    logos.forEach((l) => console.log(`    ${l}`));
    warnings.forEach((w) => console.log(`\n  ⚠  ${w}`));
  } else if (games.length) {
    // Tell the user where to put the file rather than staying silent about it.
    console.log('  logos     none found — drop logo.png / .jpg / .gif into:');
    games.forEach((g) => {
      console.log(`    ${g.folder || `assets/games/${g.id}`}/logo.png`);
    });
  }

  if (CHECK && changed.length) {
    console.error('\n✗ Output is stale. Run: node tools/prerender.mjs');
    process.exit(1);
  }
} catch (err) {
  console.error('\n✗ prerender failed:', err.message);
  process.exit(1);
}
