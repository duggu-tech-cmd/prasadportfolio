/* ============================================================================
   render.js — PURE HTML BUILDERS
   ----------------------------------------------------------------------------
   Every function here is a pure string function. No DOM access, no browser
   globals. That is deliberate: this module is imported by BOTH

     · the browser  (js/ui.js, for client-side rendering + hydration)
     · Node         (tools/prerender.mjs, to bake static HTML at deploy time)

   so the markup has exactly one definition and cannot drift between the
   crawler-visible version and the interactive version.

   If you add a browser global (document, window, location) to this file the
   prerender step will crash. Put that in ui.js instead.
   ========================================================================== */

import { DATA, SECTIONS } from './data.js';

/* ---- escaping -------------------------------------------------------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

/* Escape for use inside a JSON string embedded in <script> tags. */
const jsonLd = (obj) =>
  JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');

/* ---- inline SVG icon set (no external requests) ---------------------- */
export const ICONS = {
  github:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.64-5.48 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg>',
  linkedin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>',
  mail:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  phone:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.31 1.85.53 2.81.66A2 2 0 0 1 22 16.92z"/></svg>',
  globe:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  doc:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  print:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  play:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
  wrench:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5l-9.6 9.6a2.4 2.4 0 0 1-3.4-3.4z"/><path d="m14.7 6.3 3-3 3 3-3 3z"/></svg>',
  hike:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 21 3-9M8 21H4l5.5-11L12 6"/><circle cx="13" cy="3.5" r="1.8"/><path d="m12 12 4 2 1 7M17 21h3"/><path d="m2 21 4.5-6"/></svg>',
  ride:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3.4"/><circle cx="19" cy="17" r="3.4"/><path d="M5 17h4l4-7h4l2 7M9 10h5M13 10 11 6h3"/></svg>',
  drive:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18v4H3zM5 14l2-5h10l2 5"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  travel:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  humour:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z"/></svg>',
};
export const icon = (n) => ICONS[n] || ICONS.globe;

/* ---- url helpers ----------------------------------------------------- */
export const siteOrigin = () => String(DATA.identity.siteUrl || '').replace(/\/+$/, '');
export const projectUrl = (id) => `work/${encodeURIComponent(id)}/`;
export const absUrl = (rel) => `${siteOrigin()}/${String(rel).replace(/^\/+/, '')}`;

/* ============================================================================
   SECTION BUILDERS
   ========================================================================== */

function head(idx, title, accent) {
  return `
    <div class="sec-head reveal">
      <div class="sec-idx">${esc(idx)}</div>
      <h2 class="sec-title">${esc(title)}${accent ? ` <em>${esc(accent)}</em>` : ''}</h2>
    </div>`;
}

const chips = (list, cls = 'chip') => !list?.length ? '' :
  `<div class="chips">${list.map((c) => `<span class="${cls}">${esc(c)}</span>`).join('')}</div>`;

export function buildHero() {
  const { identity } = DATA;
  // Only offer "play" in the hero if something is actually playable — a CTA
  // that leads to two "in development" cards is worse than no CTA.
  const playable = (DATA.games?.items || []).some((g) => g.status === 'live' && g.embed);
  return `
    <section id="hero" class="section">
      <canvas id="gauge-canvas" aria-hidden="true"></canvas>
      <div class="hero-scrim" aria-hidden="true"></div>
      <div class="hero-copy">
        <div class="hero-eyebrow">${esc(identity.title)} &nbsp;//&nbsp; ${esc(identity.location)}</div>
        <h1 class="hero-name">
          <span class="ln1">${esc(identity.firstName)}</span>
          <span class="ln2">${esc(identity.lastName)}</span>
        </h1>
        <p class="hero-role">${esc(identity.title)}</p>
        <p class="hero-tagline">${esc(identity.tagline)}</p>
        ${identity.availability ? `
          <p class="hero-avail"><span class="avail-dot"></span>${esc(identity.availability)}</p>` : ''}
        <div class="hero-cta">
          ${playable ? `
          <a class="btn btn-primary btn-play" href="#games">
            <span class="bp-icon">${ICONS.play}</span>Play a Game
          </a>
          <a class="btn" href="#projects">Selected Work</a>` : `
          <a class="btn btn-primary" href="#projects">Selected Work</a>`}
          <a class="btn" href="resume.html">Resume</a>
          <a class="btn btn-ghost" href="#contact">Contact</a>
        </div>
      </div>
    </section>`;
}

export function buildAbout() {
  const { about, identity } = DATA;
  return `
    <section id="about" class="section">
      ${head('01 / PROFILE', 'Rider', 'Profile')}
      <div class="about-wrap">
        <div class="about-body reveal">
          ${about.body.map((p) => `<p>${esc(p)}</p>`).join('')}
          <div class="info-row">
            <div class="info-item"><b>Location</b>${esc(identity.location)}</div>
            <div class="info-item"><b>Email</b><a href="mailto:${esc(identity.email)}" data-gmail="${esc(identity.email)}">${esc(identity.email)}</a></div>
          </div>
          ${DATA.competencies?.length ? `
            <div class="comp-block">
              <div class="mini-head">Core Competencies</div>
              ${chips(DATA.competencies)}
            </div>` : ''}
          ${DATA.titles?.length ? `
            <div class="comp-block">
              <div class="mini-head">Shipped Titles</div>
              ${chips(DATA.titles, 'chip chip-hot')}
            </div>` : ''}
        </div>
        <div class="stat-stack reveal">
          ${about.stats.map((s) => `
            <div class="stat">
              <span class="stat-val" data-count="${esc(s.value)}">${esc(s.value)}</span>
              <span class="stat-lbl">${esc(s.label)}</span>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
}

export function buildExperience() {
  return `
    <section id="experience" class="section">
      ${head('02 / TRACK RECORD', 'Experience')}
      <div class="timeline">
        ${DATA.experience.map((j) => `
          <article class="tl-item panel reveal">
            <div class="tl-top">
              <div>
                <h3 class="tl-role">${esc(j.role)}</h3>
                <div class="tl-company">${esc(j.company)}</div>
              </div>
              <span class="tl-period">${esc(j.period)}</span>
            </div>
            ${j.location ? `<div class="tl-loc">${esc(j.location)}</div>` : ''}
            <ul class="tl-points">
              ${j.points.map((p) => `<li>${esc(p)}</li>`).join('')}
            </ul>
            ${chips(j.stack)}
          </article>`).join('')}
      </div>
    </section>`;
}

export function buildSkills() {
  const tiers = DATA.skillTiers || {};
  return `
    <section id="skills" class="section">
      ${head('03 / PERFORMANCE', 'Skill', 'Matrix')}
      <p class="garage-intro reveal">Graded by evidence, not by a number I made up.
        <b>Current</b> is what I work in every day. <b>Shipped</b> means production work
        went out the door with it, but it is not my current stack. <b>AI-Assisted</b>
        means I build with it occasionally, with an AI in the loop — including
        this page.</p>
      <div class="skill-groups">
        ${DATA.skills.map((g) => `
          <div class="panel reveal">
            <h3 class="skill-group-title">${esc(g.group)}</h3>
            ${g.items.map((s) => {
              const t = tiers[s.tier] || { fill: 50, label: s.tier || '' };
              return `
              <div class="skill" data-tier="${esc(s.tier)}">
                <div class="skill-top">
                  <span class="skill-name">${esc(s.name)}</span>
                  <span class="skill-pct">${esc(t.label)}</span>
                </div>
                <div class="skill-track">
                  <div class="skill-fill${s.tier === 'current' ? ' redline' : ''}"
                       data-level="${esc(t.fill)}" style="--lvl:${esc(t.fill)}%"></div>
                </div>
                ${s.note ? `<div class="skill-note">${esc(s.note)}</div>` : ''}
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </section>`;
}

export function buildProjects() {
  return `
    <section id="projects" class="section">
      ${head('04 / BUILDS', 'Selected', 'Work')}
      <div class="proj-grid">
        ${DATA.projects.map((p) => `
          <article class="proj panel reveal${p.featured ? ' proj-featured' : ''}">
            <div class="proj-top">
              <div>
                <h3 class="proj-name">${esc(p.name)}</h3>
                ${p.sub ? `<div class="proj-sub">${esc(p.sub)}</div>` : ''}
              </div>
              ${p.metric ? `
                <div class="proj-metric">
                  <div class="m-val">${esc(p.metric.value)}</div>
                  <div class="m-lbl">${esc(p.metric.label)}</div>
                </div>` : ''}
            </div>
            <p class="proj-blurb">${esc(p.blurb)}</p>
            ${chips(p.stack)}
            <a class="proj-link" href="${projectUrl(p.id)}">
              Read the case study <span aria-hidden="true">&rarr;</span>
            </a>
          </article>`).join('')}
      </div>
    </section>`;
}

export function buildGames() {
  const g = DATA.games || {};
  const items = g.items || [];
  if (!items.length) return '';
  return `
    <section id="games" class="section">
      ${head('05 / PLAYABLE', esc(g.heading || 'Arcade'))}
      ${g.intro ? `<p class="garage-intro reveal">${esc(g.intro)}</p>` : ''}
      <div class="games-grid">
        ${items.map((x) => {
          const live = x.status === 'live' && x.embed;
          return `
          <article class="panel game-card reveal${live ? '' : ' game-building'}">
            <div class="game-top">
              <div>
                <div class="game-engine">${esc(x.engine)}</div>
                <h3 class="garage-name">${esc(x.name)}</h3>
              </div>
              ${live
                ? '<span class="game-badge live">Playable</span>'
                : `<span class="game-badge soon">${esc(x.eta || 'In development')}</span>`}
            </div>
            <div class="game-stage" style="aspect-ratio:${esc(x.aspect || '16 / 9')}">
              ${live ? gameStage(x) : gamePending(x)}
            </div>
            <p class="garage-blurb">${esc(x.blurb)}</p>
            <div class="game-foot">
              ${chips(x.stack)}
              ${x.controls && live ? `<span class="game-controls">${esc(x.controls)}</span>` : ''}
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}

/* ----------------------------------------------------------------------------
   A playable game's stage. Two modes:

   clickToLoad (default)  A poster and a Play control. The iframe is only
                          created on click, so the multi-megabyte build is not
                          downloaded by everyone who scrolls past. The control
                          states the download size, because surprising someone
                          with 8 MB is worse than telling them about it.

   direct                 A lazy-loaded iframe. Only sensible for small builds.

   The Play control is a real <a href> pointing straight at the build, NOT a
   <button>. That is deliberate: the primary action on this section must not
   depend on JavaScript. If ui.js fails to load, is served stale from cache, or
   is blocked (opening the page over file:// blocks ES modules entirely), a
   <button> silently does nothing — no error, no feedback, and the game looks
   broken. An anchor still opens the build in a new tab in every one of those
   cases. When JS is healthy it intercepts the click and plays inline instead.
   ---------------------------------------------------------------------------- */
function gameStage(x) {
  const iframeAttrs =
    `title="${esc(x.name)}" allowfullscreen ` +
    `allow="autoplay; fullscreen; gamepad; keyboard-map"`;

  if (x.clickToLoad === false) {
    return `<iframe src="${esc(x.embed)}" loading="lazy" ${iframeAttrs}></iframe>`;
  }

  const meta = [x.engine, x.size].filter(Boolean).join(' · ');
  return poster(x, `
      <a class="game-play" href="${esc(x.embed)}" target="_blank" rel="noopener"
         data-embed="${esc(x.embed)}">
        <span class="gp-icon">${ICONS.play}</span>
        <span class="gp-main">Play</span>
        ${meta ? `<span class="gp-sub">${esc(meta)}</span>` : ''}
      </a>`);
}

/* A build that is not playable yet. Same poster treatment as a live game, so a
   logo dropped into a not-yet-shipped game's folder still reads as key art
   rather than a placeholder. */
function gamePending(x) {
  return poster(x, `
      <div class="game-pending">
        <span class="gp-icon">${ICONS.wrench}</span>
        <span class="gp-main">${esc(x.eta || 'In development')}</span>
        <span class="gp-sub">Playable right here soon</span>
      </div>`);
}

/**
 * The stage overlay: optional screenshot background, optional logo, and one
 * action block anchored at bottom-centre.
 */
function poster(x, action) {
  const cls = ['game-poster'];
  if (x.logo) cls.push('has-logo', logoLayout(x));
  if (!x.logo && !x.poster) cls.push('is-bare');
  const bg = x.poster ? ` style="background-image:url('${esc(x.poster)}')"` : '';
  return `
    <div class="${cls.join(' ')}"${bg}>
      ${gameLogo(x)}
      ${action}
    </div>`;
}

/* ----------------------------------------------------------------------------
   Game logo.

   `x.logo` is normally resolved by tools/prerender.mjs, which looks for
   logo.{svg,png,webp,gif,jpg,jpeg} inside the game's own folder — so dropping
   a file in is the whole workflow, no config edit needed. An explicit `logo`
   path in data.js takes precedence.

   Sized entirely in CSS with max-width/max-height rather than width/height
   attributes: the build step does not parse image headers, and because the
   logo sits in an absolutely-positioned overlay there is no layout to shift.
   ---------------------------------------------------------------------------- */
function gameLogo(x) {
  if (!x.logo) return '';
  // width/height come from the build step reading the file header. They let the
  // browser know the aspect ratio before the bytes arrive, and make the
  // max-width/max-height interaction exact rather than approximate.
  const dims = (x.logoW && x.logoH) ? ` width="${esc(x.logoW)}" height="${esc(x.logoH)}"` : '';
  return `<img class="game-logo" src="${esc(x.logo)}"${dims}
       alt="${esc(x.logoAlt || `${x.name} logo`)}" loading="lazy" decoding="async">`;
}

/**
 * How the logo relates to the stage.
 *
 *   logo-fill (default)  The logo IS the artwork: full-bleed across the whole
 *                        stage, with the action block floating over its lower
 *                        third. Wants an asset cut to the stage aspect ratio —
 *                        the build step warns when it is not.
 *
 *   logo-inset           The logo is a mark rather than key art, sized down and
 *                        laid out next to the action block. Use this for a
 *                        small wordmark that would look stretched or badly
 *                        cropped if blown up to full bleed. Set
 *                        `logoFill: false` in data.js.
 *
 * `logoFit` ('cover' | 'contain') controls the fill behaviour. cover fills the
 * stage completely and crops any overhang; contain shows the whole logo and
 * leaves bars where the aspect ratios disagree.
 */
function logoLayout(x) {
  if (x.logoFill === false) {
    // Inset mode still cares about shape: a portrait mark stacked above the
    // button in a short, wide stage gets squeezed to a sliver, so put it
    // beside instead.
    const tall = x.logoW && x.logoH && (x.logoW / x.logoH) < 1.15;
    return tall ? 'logo-inset logo-tall' : 'logo-inset logo-wide';
  }
  return x.logoFit === 'contain' ? 'logo-fill logo-contain' : 'logo-fill logo-cover';
}

export function buildEducation() {
  // Only render certs that carry an issuer or a year — a bare name reads as padding.
  const certs = (DATA.certifications || []).filter((c) => c.name);
  const dated = certs.filter((c) => c.issuer || c.year);
  return `
    <section id="education" class="section">
      ${head('06 / FOUNDATION', 'Education')}
      <div class="edu-wrap">
        ${DATA.education.map((e) => `
          <div class="panel reveal">
            <h3 class="edu-degree">${esc(e.degree)}</h3>
            <div class="edu-school">${esc(e.school)}</div>
            <div class="edu-meta">${esc(e.period)}${e.detail ? ' &nbsp;·&nbsp; ' + esc(e.detail) : ''}</div>
            ${e.note ? `<p class="edu-note">${esc(e.note)}</p>` : ''}
          </div>`).join('')}
        ${certs.length ? `
          <div class="panel reveal">
            <h3 class="skill-group-title">Certifications</h3>
            <div class="cert-list">
              ${certs.map((c) => `
                <div class="cert">
                  <span class="cert-name">
                    ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}
                    ${c.issuer ? `<span class="cert-issuer">${esc(c.issuer)}</span>` : ''}
                  </span>
                  ${c.year ? `<span class="cert-year">${esc(c.year)}</span>` : ''}
                </div>`).join('')}
            </div>
            ${dated.length < certs.length ? `
              <!-- TODO(data.js → certifications): add issuer + year, or delete the
                   undated entries. Recruiters and resume parsers weight dated
                   certifications far more heavily. -->` : ''}
          </div>` : ''}
        ${DATA.languages?.length ? `
          <div class="panel reveal">
            <h3 class="skill-group-title">Languages</h3>
            <div class="cert-list">
              ${DATA.languages.map((l) => `
                <div class="cert">
                  <span class="cert-name">${esc(l.name)}</span>
                  <span class="cert-year">${esc(l.level)}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
      </div>
    </section>`;
}

export function buildBits() {
  const b = DATA.bits;
  if (!b) return '';
  return `
    <section id="bits" class="section">
      ${head('07 / OFF THE CLOCK', 'Interesting', 'Bits')}
      <p class="garage-intro reveal">${esc(b.intro)}</p>

      <div class="bits-grid">
        ${b.cards.map((c) => `
          <article class="panel bit-card reveal">
            <div class="bit-icon">${ICONS[c.icon] || ICONS.globe}</div>
            <h3 class="bit-title">${esc(c.title)}</h3>
            <p class="bit-text">${esc(c.text)}</p>
          </article>`).join('')}
      </div>

      <h3 class="sub-head reveal">${esc(b.vehiclesHeading)}</h3>
      ${b.vehiclesNote ? `<p class="garage-intro reveal">${esc(b.vehiclesNote)}</p>` : ''}
      <div class="garage-grid">
        ${b.vehicles.map((v) => `
          <article class="panel garage-card reveal">
            <div class="garage-label">${esc(v.label)}</div>
            <h3 class="garage-name">${esc(v.name)}</h3>
            <div class="vehicle-stage">
              <canvas class="vehicle-canvas" data-kind="${esc(v.kind)}"
                      aria-label="Rotatable 3D model of ${esc(v.name)}"></canvas>
              <span class="drag-hint">Drag to rotate</span>
            </div>
            <p class="garage-blurb">${esc(v.blurb)}</p>
            <div class="spec-row">
              ${v.specs.map((sp) => `
                <div class="spec"><b>${esc(sp.k)}</b><span>${esc(sp.v)}</span></div>`).join('')}
            </div>
          </article>`).join('')}
      </div>
    </section>`;
}

export function buildContact() {
  const { contact, identity, links } = DATA;
  return `
    <section id="contact" class="section">
      ${head('08 / FINISH LINE', contact.heading)}
      <p class="contact-body reveal">${esc(contact.body)}</p>
      <a class="contact-mail reveal" href="mailto:${esc(identity.email)}"
         data-gmail="${esc(identity.email)}">${esc(identity.email)}</a>
      <div class="social reveal">
        ${links.map((l) => `
          <a href="${esc(l.url)}" ${l.url.startsWith('mailto:')
                ? `data-gmail="${esc(l.url.slice(7))}"`
                : (/^https?:/.test(l.url) ? 'target="_blank" rel="noopener"' : '')}
             aria-label="${esc(l.label)}" title="${esc(l.label)}">
            ${icon(l.icon)}
          </a>`).join('')}
      </div>
    </section>`;
}

/* ============================================================================
   COMPOSITION
   ========================================================================== */

const BUILDERS = {
  hero: buildHero, about: buildAbout, experience: buildExperience,
  skills: buildSkills, projects: buildProjects, games: buildGames,
  education: buildEducation, bits: buildBits, contact: buildContact,
};

/** All page sections, in SECTIONS order — so nav and content cannot drift. */
export function buildSections() {
  return SECTIONS.map((s) => BUILDERS[s.id]?.() || '').join('');
}

export function buildGearNav() {
  return SECTIONS.map((s) => `
    <a class="gear-btn" href="#${esc(s.id)}" data-target="${esc(s.id)}" aria-label="${esc(s.label)}">
      ${esc(s.gear)}<span class="flag">${esc(s.label)}</span>
    </a>`).join('');
}

export function footerText(year) {
  return `© ${year} ${DATA.identity.name} — hand-built with Three.js`;
}

/* ============================================================================
   HEAD / METADATA
   ----------------------------------------------------------------------------
   Baked into static HTML at build time. This matters more than it looks:
   LinkedIn, Slack, WhatsApp, Discord and Twitter crawlers do NOT execute
   JavaScript, so anything set at runtime is invisible to them.
   ========================================================================== */

/**
 * @param {object} o
 * @param {string} o.title      full <title>
 * @param {string} o.desc       meta description (<160 chars ideally)
 * @param {string} o.path       path relative to site root, e.g. '' or 'work/x/'
 * @param {string} [o.type]     og:type
 * @param {string} [o.depth]    relative prefix back to root, e.g. '../../'
 */
export function buildHead({ title, desc, path = '', type = 'website', depth = '' }) {
  const origin = siteOrigin();
  const url    = `${origin}/${String(path).replace(/^\/+/, '')}`;
  const { identity, seo } = DATA;
  const img    = `${origin}/${(identity.ogImage || 'assets/og-image.jpg').replace(/^\/+/, '')}`;

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: identity.name,
    jobTitle: identity.title,
    description: identity.metaBlurb,
    email: `mailto:${identity.email}`,
    url: `${origin}/`,
    image: img,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      addressCountry: 'IN',
    },
    worksFor: {
      '@type': 'Organization',
      name: seo?.employer?.name || 'Light & Wonder',
      url:  seo?.employer?.url  || undefined,
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: seo?.school?.name || undefined,
      url:  seo?.school?.url  || undefined,
    },
    knowsAbout: seo?.knowsAbout || [],
    knowsLanguage: (DATA.languages || []).map((l) => l.name),
    sameAs: (DATA.links || [])
      .map((l) => l.url)
      .filter((u) => /^https?:/.test(u)),
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${identity.name} — Portfolio`,
    url: `${origin}/`,
    author: { '@type': 'Person', name: identity.name },
  };

  return `
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(identity.name)}">
<link rel="canonical" href="${esc(url)}">

<!-- Open Graph / social preview. Baked in at build time on purpose:
     social crawlers do not run JavaScript, so runtime values never reach them. -->
<meta property="og:type"            content="${esc(type)}">
<meta property="og:site_name"       content="${esc(identity.name)}">
<meta property="og:title"           content="${esc(title)}">
<meta property="og:description"     content="${esc(desc)}">
<meta property="og:url"             content="${esc(url)}">
<meta property="og:image"           content="${esc(img)}">
<meta property="og:image:width"     content="${esc(identity.ogImageW || 1200)}">
<meta property="og:image:height"    content="${esc(identity.ogImageH || 630)}">
<meta property="og:image:alt"       content="${esc(identity.name)} — ${esc(identity.title)}">
<meta property="og:locale"          content="en_US">
<meta name="twitter:card"           content="summary_large_image">
<meta name="twitter:title"          content="${esc(title)}">
<meta name="twitter:description"    content="${esc(desc)}">
<meta name="twitter:image"          content="${esc(img)}">

<script type="application/ld+json">
${jsonLd(person)}
</script>
<script type="application/ld+json">
${jsonLd(website)}
</script>`.trim();
}

/* ============================================================================
   PROJECT DETAIL PAGE BODY
   ========================================================================== */

export function buildProjectDetail(p, { depth = '' } = {}) {
  const d = p.detail || {};
  const media = p.media || [];
  const root = depth;

  const metaItem = (label, value) => `
    <div class="meta-item">
      <b>${esc(label)}</b>
      <span>${esc(value)}</span>
    </div>`;

  return `
    <article class="section detail-wrap">

      <div class="sec-head">
        <div class="sec-idx">CASE STUDY</div>
        <h1 class="sec-title">${esc(p.name)}</h1>
        ${p.sub ? `<p class="detail-sub">${esc(p.sub)}</p>` : ''}
      </div>

      <div class="detail-meta panel">
        ${d.role     ? metaItem('Role', d.role)          : ''}
        ${d.timeline ? metaItem('Timeline', d.timeline)  : ''}
        ${d.company  ? metaItem('Context', d.company)    : ''}
        ${p.metric   ? metaItem(p.metric.label, p.metric.value) : ''}
      </div>

      ${p.stack?.length ? `
        <div class="chips detail-chips">
          ${p.stack.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
        </div>` : ''}

      ${d.summary?.length ? `
        <div class="detail-body">
          ${d.summary.map((para) => `<p>${esc(para)}</p>`).join('')}
        </div>` : `<div class="detail-body"><p>${esc(p.blurb)}</p></div>`}

      ${d.highlights?.length ? `
        <section class="detail-block">
          <h2 class="block-head">Highlights</h2>
          <ul class="hl-list">
            ${d.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
          </ul>
        </section>` : ''}

      ${media.length ? `
        <section class="detail-block">
          <h2 class="block-head">Gallery</h2>
          <div class="gallery">
            ${media.map((m, i) => galleryTile(m, i, root)).join('')}
          </div>
        </section>` : '<!-- No media yet: the Gallery block is omitted entirely rather than showing a placeholder. -->'}

      <div class="detail-foot">
        <a class="btn" href="${root}index.html#projects">&larr; All Work</a>
        <a class="btn btn-primary" href="mailto:${esc(DATA.identity.email)}"
           data-gmail="${esc(DATA.identity.email)}">Get in Touch</a>
      </div>
    </article>`;
}

/**
 * @param {object} m      media entry from data.js
 * @param {number} i      index, used by the lightbox
 * @param {string} depth  relative prefix back to site root ('' or '../../'),
 *                        so the same media paths work from /work/<id>/
 */
export function galleryTile(m, i, depth = '') {
  const cap = m.caption ? `<span class="tile-cap">${esc(m.caption)}</span>` : '';
  const src = rel(m.src, depth);
  if (m.type === 'video') {
    return `
      <button class="tile" data-i="${i}" type="button">
        <video src="${esc(src)}" muted playsinline preload="metadata"></video>
        <span class="tile-badge">▶ Video</span>${cap}
      </button>`;
  }
  if (m.type === 'youtube') {
    return `
      <button class="tile" data-i="${i}" type="button">
        <img src="https://img.youtube.com/vi/${esc(m.id)}/hqdefault.jpg" alt="${esc(m.caption || 'Video thumbnail')}" loading="lazy" width="480" height="360">
        <span class="tile-badge">▶ Video</span>${cap}
      </button>`;
  }
  return `
    <button class="tile" data-i="${i}" type="button">
      <img src="${esc(src)}" alt="${esc(m.caption || altFor(m))}" loading="lazy">
      ${cap}
    </button>`;
}

/** Prefix a site-relative path with `depth`; leave absolute URLs alone. */
const rel = (p, depth) =>
  !p || /^(https?:)?\/\//.test(p) || p.startsWith('/') ? p : depth + p;

const altFor = (m) => `Screenshot: ${String(m.src || '').split('/').pop()}`;

/* ============================================================================
   RESUME / RECRUITER VIEW
   ----------------------------------------------------------------------------
   A clean, single-column, high-contrast, semantic document. Three jobs:
     1. Recruiters who want facts, not a rendering demo, get them in one screen
     2. Ctrl+P produces a correctly paginated PDF (see the @media print rules)
     3. It is fully static HTML, so it is the most crawler-legible page here
   ========================================================================== */

export function buildResumeBody() {
  const { identity, about, experience, education, skills, skillTiers,
          languages, certifications, titles, competencies, resume, links } = DATA;

  const groupedSkills = (skills || []).map((g) => {
    const byTier = { production: [], working: [], familiar: [] };
    g.items.forEach((s) => (byTier[s.tier] || byTier.working).push(s.name));
    const parts = Object.entries(byTier)
      .filter(([, v]) => v.length)
      .map(([k, v]) => `<span class="r-tier"><b>${esc(skillTiers[k]?.label || k)}</b> ${esc(v.join(', '))}</span>`);
    return `<div class="r-skillrow"><h3>${esc(g.group)}</h3><div>${parts.join('')}</div></div>`;
  }).join('');

  const certs = (certifications || []).filter((c) => c.name);
  const profileLinks = (links || []).filter((l) => /^https?:/.test(l.url));

  return `
  <div class="resume-page">

    <header class="r-head">
      <div>
        <h1>${esc(identity.name)}</h1>
        <p class="r-title">${esc(identity.title)}</p>
      </div>
      <ul class="r-contact">
        <li><a href="mailto:${esc(identity.email)}">${esc(identity.email)}</a></li>
        <li>${esc(identity.location)}</li>
        ${profileLinks.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url.replace(/^https?:\/\//, ''))}</a></li>`).join('')}
      </ul>
    </header>

    <div class="r-actions no-print">
      <button class="btn btn-primary" id="r-print" type="button">${ICONS.print} Print / Save as PDF</button>
      <a class="btn" id="r-pdf" href="${esc(resume.pdf)}" download="${esc(resume.fileName)}" hidden>${ICONS.download} Download PDF</a>
      <a class="btn btn-ghost" href="index.html">Back to the full site</a>
    </div>

    <section class="r-block">
      <h2>Summary</h2>
      ${about.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    </section>

    <section class="r-block">
      <h2>Experience</h2>
      ${experience.map((j) => `
        <article class="r-job">
          <div class="r-jobtop">
            <h3>${esc(j.role)} <span class="r-at">·</span> ${esc(j.company)}</h3>
            <span class="r-when">${esc(j.period)}</span>
          </div>
          ${j.location ? `<p class="r-loc">${esc(j.location)}</p>` : ''}
          <ul>${j.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          ${j.stack?.length ? `<p class="r-stack"><b>Stack</b> ${esc(j.stack.join(', '))}</p>` : ''}
        </article>`).join('')}
    </section>

    <section class="r-block">
      <h2>Skills</h2>
      ${groupedSkills}
    </section>

    ${titles?.length ? `
      <section class="r-block">
        <h2>Shipped Titles</h2>
        <p>${esc(titles.join(' · '))}</p>
      </section>` : ''}

    ${competencies?.length ? `
      <section class="r-block">
        <h2>Core Competencies</h2>
        <p>${esc(competencies.join(' · '))}</p>
      </section>` : ''}

    <section class="r-block">
      <h2>Selected Projects</h2>
      ${DATA.projects.map((p) => `
        <article class="r-proj">
          <h3>${esc(p.name)}${p.metric ? ` <span class="r-metric">${esc(p.metric.value)} ${esc(p.metric.label)}</span>` : ''}</h3>
          <p>${esc(p.blurb)}</p>
          ${p.stack?.length ? `<p class="r-stack"><b>Stack</b> ${esc(p.stack.join(', '))}</p>` : ''}
        </article>`).join('')}
    </section>

    <section class="r-block">
      <h2>Education</h2>
      ${education.map((e) => `
        <article class="r-job">
          <div class="r-jobtop">
            <h3>${esc(e.degree)}</h3>
            <span class="r-when">${esc(e.period)}</span>
          </div>
          <p class="r-loc">${esc(e.school)}${e.detail ? ` · ${esc(e.detail)}` : ''}</p>
          ${e.note ? `<p>${esc(e.note)}</p>` : ''}
        </article>`).join('')}
    </section>

    ${certs.length ? `
      <section class="r-block">
        <h2>Certifications</h2>
        <ul class="r-plain">
          ${certs.map((c) => `<li>${esc(c.name)}${c.issuer ? ` — ${esc(c.issuer)}` : ''}${c.year ? ` (${esc(c.year)})` : ''}</li>`).join('')}
        </ul>
      </section>` : ''}

    ${languages?.length ? `
      <section class="r-block">
        <h2>Languages</h2>
        <p>${languages.map((l) => `${esc(l.name)} (${esc(l.level)})`).join(' · ')}</p>
      </section>` : ''}

  </div>`;
}
