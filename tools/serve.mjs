#!/usr/bin/env node
/* ============================================================================
   tools/serve.mjs — zero-dependency local static server
   ----------------------------------------------------------------------------
   `python -m http.server` works fine too, but this one does three things that
   matter for this site:

     · serves directory/index.html for the /work/<id>/ case-study URLs, so
       local links behave exactly like Cloudflare Pages
     · sends `Content-Encoding: br` / `gzip` for pre-compressed Unity WebGL
       builds, mirroring what /_headers does in production. Without this the
       Unity build fails to decode, because it is exported with Brotli and no
       decompression fallback. This is the single most common reason a WebGL
       build "works on the server but not locally".
     · sends the correct Content-Type for .mjs / .wasm / .data / .bundle

   Usage:  node tools/serve.mjs [port]
           node tools/serve.mjs --no-build     (skip the prerender on startup)
   ========================================================================== */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname, normalize } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const PORT = Number(ARGS.find((a) => /^\d+$/.test(a)) || process.env.PORT || 8080);

/* ---- rebuild before serving --------------------------------------------
   The static HTML is generated from js/data.js. Editing data.js and forgetting
   to re-run the prerender means you are looking at stale output and wondering
   why your change did nothing — so run it automatically. Pass --no-build to
   skip the prerender on startup.

   Run as a child process rather than an import: prerender.mjs is a CLI and
   calls process.exit(1) when it fails, which would take the server down with
   it. A failed build should leave you serving the existing HTML instead.      */
if (!ARGS.includes('--no-build')) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'prerender.mjs')], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  if (r.status !== 0) {
    console.error('\n  Prerender failed — serving the existing HTML instead.');
    console.error('  Fix the error above, then just refresh (the server rebuilds on start).\n');
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.pdf':  'application/pdf',
  '.data': 'application/octet-stream',
  '.bundle': 'application/octet-stream',
  '.symbols': 'application/octet-stream',
};

/* ---- pre-compressed assets ---------------------------------------------
   Unity ships .br / .gz variants. The browser only decompresses them when the
   server advertises the encoding, so we strip the compression suffix to work
   out the real Content-Type and declare the encoding separately — exactly what
   the /_headers rules do on Cloudflare Pages.                              */
const ENCODINGS = { '.br': 'br', '.gz': 'gzip' };

function contentHeaders(file) {
  const ext = extname(file).toLowerCase();
  const enc = ENCODINGS[ext];

  if (!enc) {
    return { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
  }

  // e.g. JWF.framework.js.br -> inner ext .js ; JWF.wasm.br -> .wasm
  const inner = extname(file.slice(0, -ext.length)).toLowerCase();
  return {
    'Content-Type': TYPES[inner] || 'application/octet-stream',
    'Content-Encoding': enc,
  };
}

async function resolveTarget(urlPath) {
  // Strip query/hash, decode, and refuse to escape the project root.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const abs = join(ROOT, normalize(clean).replace(/^(\.\.[\/\\])+/, ''));
  if (!abs.startsWith(ROOT)) return null;

  try {
    const s = await stat(abs);
    if (s.isDirectory()) {
      const idx = join(abs, 'index.html');
      await stat(idx);
      return idx;
    }
    return abs;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  let file = await resolveTarget(req.url);
  let code = 200;

  if (!file) {
    file = join(ROOT, '404.html');
    code = 404;
    try { await stat(file); } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404');
    }
  }

  res.writeHead(code, {
    ...contentHeaders(file),
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

/* ---- a busy port should be a hint, not a stack trace ------------------- */
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(
    `\n  Port ${PORT} is already in use.\n\n` +
    `  If that is "python -m http.server", stop it — it cannot serve this site\n` +
    `  correctly. It does not send Content-Encoding: br, so the Brotli Unity\n` +
    `  build fails to decode, and it sends no Cache-Control, which lets the\n` +
    `  browser silently reuse a stale js/ui.js.\n\n` +
    `  Then either re-run this, or pick another port:\n` +
    `      node tools/serve.mjs ${PORT + 1}\n`
  );
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n  Serving ${ROOT}`);
  console.log(`  →  http://localhost:${PORT}\n`);
  console.log(`  Pages   /            /resume.html       /work/tournament-display/`);
  console.log(`  Game    /assets/games/unity-game/index.html   (build in isolation)`);
  console.log(`  Stop    Ctrl+C\n`);
  console.log(`  Sending Content-Encoding for .br/.gz, so Unity WebGL builds work here`);
  console.log(`  exactly as they will on Cloudflare. python -m http.server does not.\n`);
});