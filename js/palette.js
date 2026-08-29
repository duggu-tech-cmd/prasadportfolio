/* ============================================================================
   palette.js — command palette (⌘K / Ctrl+K)
   ----------------------------------------------------------------------------
   Jump to any section, case study, or contact action by typing. Indexes the
   content out of data.js, so it stays in sync automatically.

   Deliberately dependency-free and lazy: nothing is built until the palette is
   opened for the first time, so it costs one keydown listener at boot.
   ========================================================================== */

import { DATA, SECTIONS } from './data.js';

/* These two are duplicated from render.js on purpose. Importing them from
   there would pull the whole 31 KB builder module onto the critical path for
   the sake of four lines, which is exactly what dynamic-importing render.js in
   ui.js was meant to avoid. Keep them in sync if you change the originals. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));
const projectUrl = (id) => `work/${encodeURIComponent(id)}/`;

/* ---- index ------------------------------------------------------------- */
function buildIndex() {
  const out = [];

  SECTIONS.forEach((s) => out.push({
    kind: 'Section',
    label: s.label,
    hint: `Gear ${s.gear}`,
    keys: `${s.label} ${s.id} ${s.gear}`,
    action: { type: 'scroll', target: s.id },
  }));

  DATA.projects.forEach((p) => out.push({
    kind: 'Case study',
    label: p.name,
    hint: p.sub || '',
    keys: `${p.name} ${p.sub} ${(p.stack || []).join(' ')} ${p.blurb}`,
    action: { type: 'href', href: projectUrl(p.id) },
  }));

  // Skills point at the skills section but make the technology searchable,
  // so typing "unity" or "wpf" finds something instead of coming up empty.
  DATA.skills.forEach((g) => g.items.forEach((s) => out.push({
    kind: 'Skill',
    label: s.name,
    hint: s.note || g.group,
    keys: `${s.name} ${g.group} ${s.note || ''}`,
    action: { type: 'scroll', target: 'skills' },
  })));

  DATA.titles.forEach((t) => out.push({
    kind: 'Shipped title',
    label: t,
    hint: 'Light & Wonder',
    keys: t,
    action: { type: 'scroll', target: 'about' },
  }));

  out.push(
    { kind: 'Action', label: 'Resume', hint: 'Clean, printable version',
      keys: 'resume cv pdf print download recruiter',
      action: { type: 'href', href: 'resume.html' } },
    { kind: 'Action', label: 'Email me', hint: DATA.identity.email,
      keys: 'email mail contact reach hire',
      action: { type: 'mail', to: DATA.identity.email } },
  );

  DATA.links.filter((l) => /^https?:/.test(l.url)).forEach((l) => out.push({
    kind: 'Link',
    label: l.label,
    hint: l.url.replace(/^https?:\/\//, ''),
    keys: `${l.label} ${l.url}`,
    action: { type: 'external', href: l.url },
  }));

  return out;
}

/* ---- scoring ----------------------------------------------------------
   Small subsequence matcher. Exact substring beats scattered characters, and
   a hit on the label beats a hit in the searchable blob.                  */
function score(item, q) {
  if (!q) return 1;
  const label = item.label.toLowerCase();
  const blob  = (item.keys || '').toLowerCase();

  if (label === q) return 1000;
  if (label.startsWith(q)) return 700;
  if (label.includes(q)) return 500;
  if (blob.includes(q)) return 200;

  // subsequence fallback: "unty" still finds "Unity"
  let i = 0;
  for (const ch of label) if (ch === q[i]) i++;
  if (i === q.length) return 90;

  i = 0;
  for (const ch of blob) if (ch === q[i]) i++;
  return i === q.length ? 20 : 0;
}

/* ---- ui ---------------------------------------------------------------- */
export function initPalette() {
  let root = null, input = null, list = null;
  let index = null, results = [], active = 0, lastFocus = null;

  const isTypingTarget = (el) =>
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

  function ensure() {
    if (root) return;
    index = buildIndex();

    root = document.createElement('div');
    root.className = 'cmdk';
    root.hidden = true;
    root.innerHTML = `
      <div class="cmdk-scrim" data-close></div>
      <div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmdk-inputrow">
          <svg class="cmdk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input id="cmdk-input" type="text" autocomplete="off" spellcheck="false"
                 placeholder="Jump to a section, project, or skill…"
                 aria-label="Search the site" aria-controls="cmdk-list" aria-expanded="true">
          <kbd data-close>esc</kbd>
        </div>
        <ul class="cmdk-list" id="cmdk-list" role="listbox"></ul>
        <div class="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span>${DATA.projects.length} case studies indexed</span>
        </div>
      </div>`;
    document.body.appendChild(root);

    input = root.querySelector('#cmdk-input');
    list  = root.querySelector('.cmdk-list');

    input.addEventListener('input', () => { active = 0; render(); });
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
      const li = e.target.closest('.cmdk-item');
      if (li) run(results[Number(li.dataset.i)]);
    });
    // Pointer highlight follows the mouse so hover and keyboard agree.
    list.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.cmdk-item');
      if (li && Number(li.dataset.i) !== active) {
        active = Number(li.dataset.i);
        paintActive();
      }
    });
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    results = index
      .map((it) => ({ it, s: score(it, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((r) => r.it);

    if (!results.length) {
      list.innerHTML = `<li class="cmdk-empty">Nothing matches “${esc(input.value)}”</li>`;
      return;
    }

    list.innerHTML = results.map((r, i) => `
      <li class="cmdk-item${i === active ? ' on' : ''}" data-i="${i}"
          role="option" aria-selected="${i === active}">
        <span class="cmdk-kind">${esc(r.kind)}</span>
        <span class="cmdk-label">${esc(r.label)}</span>
        ${r.hint ? `<span class="cmdk-hint">${esc(r.hint)}</span>` : ''}
      </li>`).join('');
  }

  function paintActive() {
    [...list.children].forEach((li, i) => {
      const on = i === active;
      li.classList.toggle('on', on);
      li.setAttribute('aria-selected', String(on));
      if (on) li.scrollIntoView({ block: 'nearest' });
    });
  }

  function move(d) {
    if (!results.length) return;
    active = (active + d + results.length) % results.length;
    paintActive();
  }

  function run(item) {
    if (!item) return;
    const a = item.action;
    close();
    if (a.type === 'scroll') {
      document.getElementById(a.target)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + a.target);
    } else if (a.type === 'href') {
      location.href = a.href;
    } else if (a.type === 'external') {
      window.open(a.href, '_blank', 'noopener');
    } else if (a.type === 'mail') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) location.href = 'mailto:' + a.to;
      else window.open(
        'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(a.to),
        '_blank', 'noopener'
      );
    }
  }

  function open() {
    ensure();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('cmdk-open');
    input.value = '';
    active = 0;
    render();
    input.focus();
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('cmdk-open');
    lastFocus?.focus?.();
  }

  document.addEventListener('keydown', (e) => {
    const open_ = root && !root.hidden;

    // ⌘K / Ctrl+K anywhere, or "/" when not already typing in a field
    if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && !open_ && !isTypingTarget(e.target))) {
      e.preventDefault();
      open_ ? close() : open();
      return;
    }

    if (!open_) return;

    if (e.key === 'Escape')    { e.preventDefault(); close(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); }
    if (e.key === 'Enter')     { e.preventDefault(); run(results[active]); }
    // Keep focus trapped in the input — the palette has no other controls.
    if (e.key === 'Tab')       { e.preventDefault(); }
  });

  // Anything with [data-cmdk] opens it (the HUD hint button).
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cmdk]')) { e.preventDefault(); open(); }
  });

  return { open, close };
}
