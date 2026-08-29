# Playable game builds

Drop each exported web build in its own folder here, then point `embed` at its
`index.html` in `js/data.js`.

```
assets/games/
├── unity-game/     ← Unity WebGL export (index.html + Build/ + TemplateData/)
└── godot-game/     ← Godot HTML5 export (index.html + .wasm + .pck)
```

## Unity WebGL export settings
- File → Build Settings → WebGL → Switch Platform
- Player Settings → Publishing Settings → **Compression Format: Disabled**
  (GitHub Pages cannot serve the Brotli/Gzip `Content-Encoding` headers Unity
  expects; "Disabled" is the reliable choice. Gzip also works if you enable
  "Decompression Fallback".)
- Player Settings → Publishing Settings → uncheck **Data Caching** if you hit
  IndexedDB issues.
- Build into `assets/games/unity-game/`.

## Godot 4 export settings
- Project → Export → Add… → **Web**
- Export Path: `assets/games/godot-game/index.html`
- Godot 4 web builds need `SharedArrayBuffer`, which requires COOP/COEP headers
  that GitHub Pages does **not** send. Two ways around it:
  1. In Godot 4.3+, set **Export → Web → Extensions Support: off** and use the
     single-threaded build — this works on GitHub Pages.
  2. Or host the build on itch.io (tick "SharedArrayBuffer support") and point
     `embed` at the itch.io embed URL instead.

Both engines export plain static files, so they deploy with the rest of the site.
