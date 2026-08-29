/* ============================================================================
   resume.js — behaviour for resume.html
   ----------------------------------------------------------------------------
   The page itself is prerendered and fully functional without JavaScript —
   that is the point of it. This module adds two conveniences:

     1. A print button (the @media print rules in style.css handle pagination,
        so Ctrl+P / this button produce a clean PDF).
     2. A "Download PDF" button that only appears if assets/resume.pdf really
        exists. The old site advertised that file unconditionally and it
        404'd — a broken resume link reads as untested, which is worse than
        offering no link at all.
   ========================================================================== */

import { DATA } from './data.js';
import { wireGmail } from './ui.js';

export function initResumePage() {
  const printBtn = document.getElementById('r-print');
  printBtn?.addEventListener('click', () => window.print());

  revealPdfIfPresent();
  wireGmail();
}

/* ---- only show the download when the file is actually there ------------ */
async function revealPdfIfPresent() {
  const btn = document.getElementById('r-pdf');
  if (!btn) return;

  const href = btn.getAttribute('href');
  try {
    const res = await fetch(href, { method: 'HEAD', cache: 'no-store' });
    // Some static hosts answer 200 with an HTML 404 page. Check the type.
    const type = res.headers.get('content-type') || '';
    if (res.ok && !/text\/html/i.test(type)) {
      btn.hidden = false;
      return;
    }
  } catch { /* offline, blocked, or file:// — stay hidden */ }

  console.info(
    `resume.js: ${href} not found — download button hidden rather than 404ing.\n` +
    `Add the file (suggested name: ${DATA.resume.fileName}) to enable it.\n` +
    `Reminder: an ATS parses THAT pdf, never this page. Export single-column, ` +
    `selectable text (not an image), no tables or text boxes, standard headings.`
  );
}
