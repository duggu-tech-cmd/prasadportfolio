/* ============================================================================
   project.js — behaviour for a case study page
   ----------------------------------------------------------------------------
   The page content is prerendered into work/<id>/index.html by
   tools/prerender.mjs, so there is nothing to build here. This module only
   attaches the interactive bits: the gallery lightbox and the Gmail upgrade
   on email links.
   ========================================================================== */

import { DATA } from './data.js';
import { wireGmail } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);

/* Duplicated from render.js rather than imported — see the note in palette.js.
   A case-study page has no reason to download the whole builder module. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

/**
 * @param {string} id     project id, injected by the prerender step
 * @param {string} depth  relative prefix back to site root, e.g. '../../'
 */
export function initProjectPage(id, depth = '') {
  const project = DATA.projects.find((p) => p.id === id);
  if (!project) {
    console.warn(`project.js: no project with id "${id}" in data.js`);
    return;
  }
  wireGallery(project.media || [], depth);
  wireGmail();
}

/* ---- lightbox --------------------------------------------------------- */
function wireGallery(media, depth) {
  const tiles = [...document.querySelectorAll('.tile')];
  if (!media.length || !tiles.length) return;

  const lb   = $('#lightbox');
  if (!lb) return;
  const body = $('.lb-body', lb);
  const cap  = $('.lb-caption', lb);
  let idx = 0;
  let lastFocus = null;

  const src = (p) =>
    !p || /^(https?:)?\/\//.test(p) || p.startsWith('/') ? p : depth + p;

  const show = (i) => {
    idx = (i + media.length) % media.length;
    const m = media[idx];
    if (m.type === 'video') {
      body.innerHTML = `<video src="${esc(src(m.src))}" controls autoplay playsinline></video>`;
    } else if (m.type === 'youtube') {
      body.innerHTML = `<iframe src="https://www.youtube.com/embed/${esc(m.id)}?autoplay=1"
                          title="${esc(m.caption || 'Video')}" allow="autoplay; fullscreen"
                          allowfullscreen frameborder="0"></iframe>`;
    } else {
      body.innerHTML = `<img src="${esc(src(m.src))}" alt="${esc(m.caption || '')}">`;
    }
    cap.textContent = m.caption || '';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lb-close', lb)?.focus();
  };

  const close = () => {
    lb.hidden = true;
    body.innerHTML = '';                 // stops video/iframe playback
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };

  tiles.forEach((t) => {
    t.addEventListener('click', () => {
      lastFocus = t;
      show(Number(t.dataset.i));
    });
  });

  $('.lb-close', lb)?.addEventListener('click', close);
  $('.lb-prev',  lb)?.addEventListener('click', () => show(idx - 1));
  $('.lb-next',  lb)?.addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape')     { e.preventDefault(); close(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
  });
}
