/* ============================================================================
   ui.js — BROWSER BEHAVIOUR
   ----------------------------------------------------------------------------
   Markup lives in render.js (shared with the prerender step). This file only
   does things that need a real browser: hydration, observers, nav, telemetry.

   Rendering strategy
   ------------------
   tools/prerender.mjs bakes the full markup into index.html at deploy time, so
   the page has real content before any JavaScript runs. On boot we check
   whether that content is already present:

     · present  → hydrate (attach behaviour, touch nothing else)
     · absent   → render client-side (dev convenience: edit data.js, refresh,
                  no prerender needed)

   Either way the visitor sees the same page. Crawlers and social scrapers only
   ever see the prerendered one, which is the whole point.
   ========================================================================== */

import { DATA, SECTIONS } from './data.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ============================================================================
   MOUNT
   ----------------------------------------------------------------------------
   render.js is imported DYNAMICALLY and only on the fallback path. In
   production the page is always prerendered, so the 31 KB of builder code is
   never fetched — it is only needed when you have edited data.js and skipped
   the prerender step, which is a local-development situation.
   ========================================================================== */
export async function renderSite() {
  const app = $('#app');
  const nav = $('#gear-nav');

  // Was this page prerendered? If so, leave the DOM alone.
  const prerendered = !!app?.querySelector('.section');

  if (!prerendered) {
    console.info(
      'Content not prerendered — rendering client-side. ' +
      'Run `node tools/prerender.mjs` before deploying, or crawlers and ' +
      'social scrapers will see an empty page.'
    );
    const { buildSections, buildGearNav, footerText } = await import('./render.js');
    if (app) app.innerHTML = buildSections();
    if (nav && !nav.querySelector('.gear-btn')) nav.innerHTML = buildGearNav();
    const f = $('#footer-text');
    if (f && !f.dataset.baked) f.textContent = footerText(new Date().getFullYear());
  }

  // HUD identity text (static in prerendered HTML; set here for the CSR path)
  const mark = $('.hud-tl .mark');
  if (mark && !mark.textContent.trim()) mark.textContent = DATA.identity.name;
  const sub = $('.hud-tl .sub');
  if (sub && !sub.textContent.trim()) sub.textContent = DATA.identity.title;

  return { prerendered };
}

/* ============================================================================
   BEHAVIOUR
   ----------------------------------------------------------------------------
   Split in two on purpose. initInteractions() runs the moment the DOM is
   parsed and needs nothing from WebGL, so the page is fully usable before the
   1.3 MB Three.js bundle has even started downloading. attachGauge() wires the
   handful of things that genuinely need the 3D scene, once it exists.
   ========================================================================== */

/** The live gauge handle, once the 3D scene has booted. */
let GAUGE = null;

export function initInteractions() {
  revealOnScroll();
  fillSkillBars();
  wireGearNav();
  trackActiveSection();
  countUpStats();
  wireGmail();
  wireGameLoaders();
  verifyOptionalLinks();
  mountAnalytics();
}

/** Called after the WebGL scene finishes booting (or fails to). */
export function attachGauge(gauge) {
  GAUGE = gauge;
  wireTelemetry(gauge);
}

/* --- scroll reveal ----------------------------------------------------- */
function revealOnScroll() {
  const targets = $$('.reveal');
  if (!targets.length) return;

  // No IntersectionObserver (very old browsers) → just show everything.
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  targets.forEach((el) => io.observe(el));
}

/* --- skill bars sweep in like gauges powering up ----------------------- */
function fillSkillBars() {
  const bars = $$('.skill-fill');
  if (!bars.length) return;

  if (!('IntersectionObserver' in window)) {
    bars.forEach((el) => { el.style.width = el.dataset.level + '%'; });
    return;
  }

  const sio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const delay = Number(el.dataset.i || 0) * 90;   // stagger
      setTimeout(() => { el.style.width = el.dataset.level + '%'; }, delay);
      sio.unobserve(el);
    });
  }, { threshold: 0.3 });

  bars.forEach((el, i) => {
    el.dataset.i = i % 5;
    sio.observe(el);
  });
}

/* --- gear nav: real anchors, upgraded to smooth scroll + throttle blip -- */
function wireGearNav() {
  $$('.gear-btn').forEach((b) => {
    b.addEventListener('click', (e) => {
      const el = document.getElementById(b.dataset.target);
      if (!el) return;                      // let the href do its job
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + b.dataset.target);
      GAUGE?.rev?.(0.6);                    // no-op until the scene has booted
    });
  });
}

/* ----------------------------------------------------------------------------
   Active-section tracking for the gear rail.

   This used to use an IntersectionObserver with `threshold: 0.4` and a shrunken
   rootMargin, and it did not work reliably. Two reasons:

     1. `threshold: 0.4` requires 40% of a section to be inside the (already
        shrunken) root box. The sections here are tall — the hero is 100svh and
        the rest run well past a viewport — so on many screens NO section ever
        satisfies it and the callback simply never fires.
     2. It only reacted to entries that were intersecting, and never decided
        between two sections that both were. Scrolling a boundary left whichever
        entry happened to fire last as the winner.

   Replaced with a deterministic scroll calculation: whichever section's top is
   the last one above a line 38% down the viewport is the active one. Always
   exactly one answer, no thresholds to tune, and rAF-throttled so it costs
   nothing while scrolling.
   ---------------------------------------------------------------------------- */
function trackActiveSection() {
  const buttons = $$('.gear-btn');
  const sections = $$('.section');
  if (!buttons.length || !sections.length) return;

  const byId = new Map(buttons.map((b) => [b.dataset.target, b]));
  let current = null;
  let queued = false;

  const apply = (id) => {
    if (id === current) return;
    current = id;
    buttons.forEach((b) => {
      const on = b.dataset.target === id;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  };

  const compute = () => {
    queued = false;
    // The reference line, in viewport coordinates. Using getBoundingClientRect
    // rather than offsetTop on purpose: offsetTop is measured from the nearest
    // positioned ancestor, and `main` is position:relative, so offsetTop would
    // only happen to be right as long as `main` starts at document y=0.
    const line = window.innerHeight * 0.38;

    let best = sections[0];
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= line) best = s;
      else break;                    // sections are in document order
    }

    // At the very bottom the last section may never reach the line (a short
    // final section cannot scroll far enough), so claim it explicitly.
    const atBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
    if (atBottom) best = sections[sections.length - 1];

    if (best && byId.has(best.id)) apply(best.id);
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(compute);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  compute();                          // set the correct gear on load
}

/* --- count-up on the stat blocks --------------------------------------- */
function countUpStats() {
  const els = $$('[data-count]');
  if (!els.length || !('IntersectionObserver' in window)) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;                       // the final value is already in the DOM

  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const raw = el.dataset.count || '';
      const num = parseFloat(raw.replace(/[^\d.]/g, ''));
      if (!isNaN(num)) {
        const suffix = raw.replace(/[\d.]/g, '');
        let cur = 0;
        const step = num / 34;
        const run = () => {
          cur = Math.min(cur + step, num);
          el.textContent = (num % 1 === 0 ? Math.round(cur) : cur.toFixed(1)) + suffix;
          if (cur < num) requestAnimationFrame(run);
        };
        run();
      }
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });

  els.forEach((el) => cio.observe(el));
}

/* ============================================================================
   GAME EMBEDS — load on click, not on scroll
   ----------------------------------------------------------------------------
   A Unity WebGL build is several megabytes. Auto-loading it in an iframe means
   every visitor who scrolls past the Arcade section downloads the whole thing,
   which is precisely the kind of cost that makes a portfolio feel slow. The
   iframe is created on click instead, and the button says how big the download
   is so nobody is ambushed by it.
   ========================================================================== */
function wireGameLoaders() {
  const links = $$('.game-play');
  if (!links.length) return;

  links.forEach((link) => {
    // Inspectable from devtools: if this attribute is missing on the element,
    // this function never ran and you are looking at a stale or blocked ui.js.
    link.dataset.inlinePlay = 'ready';

    link.addEventListener('click', (e) => {
      // Respect the browser's own gestures — ctrl/cmd/shift/middle-click should
      // still open the build in a new tab, exactly as the href promises.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      const src = link.dataset.embed || link.getAttribute('href');
      if (!src) return;                // fall through to the href
      e.preventDefault();
      openTheater(src, link);
    });
  });

  console.info(
    `[games] ${links.length} embed(s) wired. ` +
    `If a Play button does nothing, this message is missing, or the element ` +
    `lacks data-inline-play="ready", you are running a stale or blocked ui.js.`
  );
}

/* ============================================================================
   THEATER MODE — the game expands to fill the viewport
   ----------------------------------------------------------------------------
   Design constraint that drives everything here: MOVING AN IFRAME IN THE DOM
   RELOADS IT. Appending an already-running iframe to a new parent restarts the
   document, which for a Unity build means a fresh 8 MB boot. So the iframe is
   created inside the full-screen container from the outset and never reparented.

   That has a pleasant side effect: the card on the page is never touched, so
   its poster and Play button are still intact when the game closes, and
   replaying works with no extra code.

   The open/close animation is FLIP-style using transforms only. Animating
   width/height would relayout the iframe on every frame, forcing Unity to
   resize its drawing buffer continuously — visibly janky and expensive. The
   container instead sits at its final full-viewport size the whole time and is
   only transformed, so Unity initialises its canvas exactly once.
   ========================================================================== */

let theater = null;   // the single open instance, if any

function openTheater(src, sourceLink) {
  if (theater) return;

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR  = calm ? 0 : 520;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  // Where the animation starts from: the card's stage on the page.
  const origin = (sourceLink.closest('.game-stage') || sourceLink).getBoundingClientRect();
  const title  = sourceLink.closest('.game-card')
    ?.querySelector('.garage-name')?.textContent?.trim() || 'Game';

  /* ---- structure ---- */
  const root = document.createElement('div');
  root.className = 'game-theater';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', `${title} — fullscreen`);
  root.innerHTML = `
    <div class="gt-scrim"></div>
    <div class="gt-frame">
      <div class="gt-boot"><span class="gt-spin"></span><span>Starting ${esc(title)}</span></div>
      <div class="gt-bar">
        <span class="gt-title">${esc(title)}</span>
        <span class="gt-hint"><kbd>Esc</kbd> to exit</span>
        <button class="gt-close" type="button" aria-label="Exit game">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
          <span>Exit</span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const frameBox = root.querySelector('.gt-frame');
  const boot     = root.querySelector('.gt-boot');

  /* ---- lock the page behind it ---- */
  const prevOverflow = document.body.style.overflow;
  const prevScrollY  = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.classList.add('theater-open');

  /* ---- the iframe: created here, never moved ---- */
  const frame = document.createElement('iframe');
  frame.className = 'gt-iframe';
  frame.setAttribute('title', title);
  frame.setAttribute('allowfullscreen', '');
  frame.setAttribute('allow', 'autoplay; fullscreen; gamepad; keyboard-map; cross-origin-isolated');
  frame.addEventListener('load', () => {
    boot.classList.add('gone');
    // Keyboard input has to land inside the iframe for the game to receive it.
    try { frame.contentWindow?.focus(); } catch { /* cross-origin */ }
  }, { once: true });
  frame.addEventListener('error', () => {
    console.error(`[games] "${src}" failed to load.`);
    boot.innerHTML = '<span class="gt-err">Build failed to load. Check the console.</span>';
  }, { once: true });
  frameBox.appendChild(frame);
  frame.src = src;

  /* ---- open animation (FLIP) ---- */
  const sx = origin.width  / Math.max(window.innerWidth, 1);
  const sy = origin.height / Math.max(window.innerHeight, 1);

  const anims = [
    frameBox.animate([
      { transform: `translate(${origin.left}px, ${origin.top}px) scale(${sx}, ${sy})`, opacity: 0.55 },
      { transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1 },
    ], { duration: DUR, easing: EASE, fill: 'both' }),
    root.querySelector('.gt-scrim').animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: DUR, easing: 'linear', fill: 'both' }
    ),
  ];

  /* ---- exit paths ------------------------------------------------------
     Four of them, deliberately. The in-game Exit button is the one the user
     asked for, but it needs a bridge on the Unity side (tools/unity-bridge/),
     and a visitor must never be trapped if that bridge is missing. */
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };
  const onMessage = (e) => {
    // Same-origin build, so verify the sender is our own frame.
    if (e.source !== frame.contentWindow) return;
    const type = e.data && (e.data.type || e.data);
    if (type === 'portfolio:game-exit' || type === 'game:exit' || type === 'unity:quit') close();
  };

  document.addEventListener('keydown', onKey);
  window.addEventListener('message', onMessage);
  root.querySelector('.gt-close').addEventListener('click', close);
  root.querySelector('.gt-scrim').addEventListener('click', close);

  let closing = false;
  function close() {
    if (closing) return;
    closing = true;

    document.removeEventListener('keydown', onKey);
    window.removeEventListener('message', onMessage);
    anims.forEach((a) => a.cancel());

    // Re-measure: the page may have been resized while the game was open.
    const back = (sourceLink.closest('.game-stage') || sourceLink).getBoundingClientRect();
    const bx = back.width  / Math.max(window.innerWidth, 1);
    const by = back.height / Math.max(window.innerHeight, 1);

    const out = frameBox.animate([
      { transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1 },
      { transform: `translate(${back.left}px, ${back.top}px) scale(${bx}, ${by})`, opacity: 0 },
    ], { duration: calm ? 0 : 380, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'both' });

    root.querySelector('.gt-scrim').animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: calm ? 0 : 380, easing: 'linear', fill: 'both' }
    );

    out.finished.catch(() => {}).then(() => {
      // Removing the iframe is what actually stops the game and frees its
      // memory — Unity has no way to unload itself from inside the document.
      frame.src = 'about:blank';
      root.remove();
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('theater-open');
      window.scrollTo({ top: prevScrollY, behavior: 'auto' });
      sourceLink.focus?.();
      theater = null;
    });
  }

  theater = { close };
}

/* Minimal escaping for the few strings interpolated into theater markup. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

/* ============================================================================
   HUD TELEMETRY — real numbers, not decoration
   ----------------------------------------------------------------------------
   The old readout showed a fabricated RPM figure. Anyone technical opens
   devtools and notices. Showing the actual render cost of the scene turns the
   HUD from a prop into a demonstration — and it is genuinely useful while
   tuning the thing.
   ========================================================================== */
function wireTelemetry(gauge) {
  const el = $('#hud-telemetry');
  if (!el) return;

  if (!gauge?.ok || !gauge.getStats) {
    el.textContent = 'RENDER OFFLINE';
    el.classList.add('offline');
    return;
  }

  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K' : String(n);
  let last = 0;

  const tick = (t) => {
    // 4Hz is plenty — a number that changes every frame is unreadable anyway.
    if (t - last > 250) {
      last = t;
      const s = gauge.getStats();
      el.innerHTML =
        `<span class="t-v">${s.fps}</span><span class="t-k">fps</span>` +
        `<span class="t-sep">·</span>` +
        `<span class="t-v">${s.calls}</span><span class="t-k">draws</span>` +
        `<span class="t-sep">·</span>` +
        `<span class="t-v">${fmt(s.tris)}</span><span class="t-k">tris</span>`;
      el.classList.toggle('warn', s.fps > 0 && s.fps < 40);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ============================================================================
   OPTIONAL LINKS — never ship a 404
   ----------------------------------------------------------------------------
   assets/resume.pdf may not exist yet. Rather than advertising a link that
   404s (which reads as untested), HEAD-check it and only reveal the download
   when it is really there. resume.html always exists, so the Resume entry in
   the contact row is safe regardless.
   ========================================================================== */
async function verifyOptionalLinks() {
  const pdfBtn = $('#r-pdf');
  if (!pdfBtn) return;
  try {
    const res = await fetch(pdfBtn.getAttribute('href'), { method: 'HEAD' });
    if (res.ok) pdfBtn.hidden = false;
  } catch { /* offline or blocked — leave it hidden */ }
}

/* ============================================================================
   EMAIL — open Gmail compose on desktop
   ----------------------------------------------------------------------------
   The href stays a plain mailto: so the link is valid, copyable, and works
   with JS disabled. Here we upgrade the click: on desktop open Gmail's web
   compose; on mobile let the OS handle mailto: (which opens the Gmail app when
   it is the default handler, and does the right thing when it is not).
   ========================================================================== */
export function wireGmail() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  $$('[data-gmail]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (isMobile) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const to = a.dataset.gmail;
      const w = window.open(
        'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to),
        '_blank', 'noopener'
      );
      if (!w) window.location.href = 'mailto:' + to;   // popup blocked → fall back
    });
  });
}

/* ============================================================================
   ANALYTICS — optional, cookieless, loaded last
   ========================================================================== */
function mountAnalytics() {
  const a = DATA.analytics || {};
  if (!a.src) return;
  const s = document.createElement('script');
  s.src = a.src;
  s.defer = true;
  if (a.domain)    s.setAttribute('data-domain', a.domain);
  if (a.websiteId) s.setAttribute('data-website-id', a.websiteId);
  document.head.appendChild(s);
}

/* ============================================================================
   IGNITION LOADER
   ----------------------------------------------------------------------------
   A full-screen loader is a real risk on a portfolio: it puts a delay between
   a recruiter and the content, and the classic version of this fakes its own
   percentage (the previous one here literally used Math.random). So this one is
   built to a few rules:

     · every step maps to a REAL signal — stylesheet applied, webfonts ready,
       DOM parsed, deferred 3D bundle loaded
     · hard 2500ms ceiling, whatever happens
     · click or any keypress skips it
     · shown once per browser session, so navigating back is instant
     · not shown at all for prefers-reduced-motion

   The 3D bundle finishing is treated as the last 15%, not a blocker — it is
   loaded after first paint and the loader will not wait around for it.
   ========================================================================== */

const REV_SEGMENTS = 28;
const HARD_CEILING_MS = 2500;

let ig = null;

export function boot(stage) {
  // The thin top line handles anything that happens after the loader has gone.
  const bar = $('#boot-bar');

  if (!ig) ig = initIgnition();

  const pct = { start: 15, content: 55, engine: 88, done: 100 }[stage] ?? 0;

  if (ig && !ig.finished) {
    ig.set(pct, { start: 'booting', content: 'content', engine: 'render', done: 'ready' }[stage] || '');
    if (stage === 'done') ig.finish();
    return;
  }

  if (bar) {
    bar.style.width = pct + '%';
    if (stage === 'done') {
      bar.classList.add('done');
      setTimeout(() => bar.remove(), 700);
    }
  }
}

function initIgnition() {
  const root = $('#ignition');
  if (!root) return null;

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = (() => {
    try { return sessionStorage.getItem('ignition-seen') === '1'; } catch { return false; }
  })();

  // Skip conditions: remove it immediately and let the page be the page.
  if (calm || seen) {
    root.remove();
    return { finished: true, set() {}, finish() {} };
  }

  const fill  = $('#ig-fill');
  const bike  = $('#ig-bike');
  const pctEl = $('#ig-pct');
  const stgEl = $('#ig-stage');
  const rev   = $('#ig-revbar');

  // Build the segmented rev bar once.
  if (rev && !rev.childElementCount) {
    const redFrom = Math.round(REV_SEGMENTS * 0.78);
    for (let i = 0; i < REV_SEGMENTS; i++) {
      const seg = document.createElement('i');
      if (i >= redFrom) seg.classList.add('red');
      rev.appendChild(seg);
    }
  }
  const segs = rev ? [...rev.children] : [];

  let shown = 0;             // what the user currently sees
  let target = 0;            // where we want to get to
  let raf = null;
  const state = { finished: false };

  const paint = () => {
    raf = null;
    // Ease toward the target so the bike never teleports.
    shown += (target - shown) * 0.18;
    if (target - shown < 0.4) shown = target;

    const v = Math.max(0, Math.min(100, shown));
    if (fill)  fill.style.width = v + '%';
    if (bike)  bike.style.setProperty('--p', v + '%');
    if (pctEl) pctEl.textContent = String(Math.round(v));

    const lit = Math.round((v / 100) * segs.length);
    segs.forEach((s, i) => s.classList.toggle('on', i < lit));

    if (shown !== target) raf = requestAnimationFrame(paint);
  };

  const set = (to, label) => {
    if (state.finished) return;
    target = Math.max(target, to);
    if (label && stgEl) stgEl.textContent = label;
    if (raf === null) raf = requestAnimationFrame(paint);
  };

  const finish = () => {
    if (state.finished) return;
    state.finished = true;
    target = shown = 100;
    if (fill)  fill.style.width = '100%';
    if (bike)  bike.style.setProperty('--p', '100%');
    if (pctEl) pctEl.textContent = '100';
    if (stgEl) stgEl.textContent = 'ready';
    segs.forEach((s) => s.classList.add('on'));

    try { sessionStorage.setItem('ignition-seen', '1'); } catch { /* private mode */ }

    // Let 100% register for a beat, then get out of the way.
    setTimeout(() => {
      root.classList.add('done');
      setTimeout(() => root.remove(), 700);
    }, 260);
  };

  /* --- skip paths ------------------------------------------------------- */
  $('#ig-skip')?.addEventListener('click', finish);
  root.addEventListener('click', finish);
  const onKey = () => { finish(); document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);

  /* --- real signals ----------------------------------------------------- */
  // Webfonts: the biggest visible pop on this page, worth waiting a beat for.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => set(72, 'fonts'));
  } else {
    set(72);
  }
  if (document.readyState === 'complete') set(88, 'render');
  else window.addEventListener('load', () => set(88, 'render'), { once: true });

  /* --- hard ceiling ----------------------------------------------------- */
  // Nothing justifies holding a visitor longer than this.
  setTimeout(finish, HARD_CEILING_MS);

  return { set, finish, get finished() { return state.finished; } };
}

export { SECTIONS };
