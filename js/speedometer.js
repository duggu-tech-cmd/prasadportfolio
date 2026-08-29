/* ============================================================================
   speedometer.js — Digital TFT instrument cluster (BMW big-bike style)
   ----------------------------------------------------------------------------
   Not an analog dial. This is the modern TFT layout:
     · a segmented rev bar sweeping around the outside, lighting up
       segment-by-segment like an LED tach, red past the redline
     · a large digital speed readout in the centre
     · a gear indicator, and small side readouts
     · everything drawn to a canvas texture and mapped onto a screen plane,
       so it reads as a backlit display rather than a physical gauge
   Plus the ambient casino layer: 3D chips and playing cards falling and
   floating through the scene behind the dash.
   ========================================================================== */

import * as THREE from './vendor/three.module.js';
import { EffectComposer }  from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from './vendor/addons/postprocessing/OutputPass.js';
import { DATA } from './data.js';
import { createCasinoLayer } from './casino.js';

const COL = {
  cyan: 0x5fe6ff, ice: 0xeaf9ff, dim: 0x2b98b5,
  deep: 0x0d3d4d, red: 0xff3b30, amber: 0xffb020, dark: 0x04070a,
};

export function initSpeedometer(canvas) {
  let gl = null;
  try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { /* noop */ }
  if (!gl) return { ok: false };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scene ---------------------------------------------------------- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COL.dark, 0.05);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 11.4);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: window.devicePixelRatio < 2,
    alpha: true, powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const dash = new THREE.Group();
  dash.rotation.x = -0.1;
  scene.add(dash);

  /* =====================================================================
     1. HOUSING — the bezel around the TFT screen
     ===================================================================== */
  // rounded-rect screen surround
  const housingShape = roundedRect(9.4, 4.9, 0.5);
  const housingGeo = new THREE.ExtrudeGeometry(housingShape, {
    depth: 0.34, bevelEnabled: true,
    bevelThickness: 0.07, bevelSize: 0.09, bevelSegments: 2,
  });
  housingGeo.center();
  const housing = new THREE.Mesh(housingGeo, new THREE.MeshStandardMaterial({
    color: 0x0d151d, metalness: 0.9, roughness: 0.42,
  }));
  housing.position.z = -0.3;
  dash.add(housing);

  // thin emissive trim following the screen edge
  const trim = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      roundedRect(9.1, 4.62, 0.44).getPoints(80).map((p) => new THREE.Vector3(p.x, p.y, 0))
    ),
    new THREE.LineBasicMaterial({ color: COL.dim, transparent: true, opacity: 0.65 })
  );
  trim.position.z = -0.06;
  dash.add(trim);

  /* =====================================================================
     2. THE TFT SCREEN — a canvas texture on a plane
     ===================================================================== */
  const SC_W = 1280, SC_H = 640;
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = SC_W; screenCanvas.height = SC_H;
  const sx = screenCanvas.getContext('2d');

  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(8.96, 4.48),
    new THREE.MeshBasicMaterial({ map: screenTex, transparent: true })
  );
  screen.position.z = -0.05;
  dash.add(screen);

  // glass sheen over the display
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(8.96, 4.48),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uC: { value: new THREE.Color(COL.cyan) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `
        uniform vec3 uC; varying vec2 vUv;
        void main(){
          // soft diagonal reflection band
          float b = smoothstep(0.62,0.30,abs(vUv.x*0.8+vUv.y-0.9));
          float e = smoothstep(0.0,0.16,vUv.x)*smoothstep(1.0,0.84,vUv.x)
                  * smoothstep(0.0,0.16,vUv.y)*smoothstep(1.0,0.84,vUv.y);
          gl_FragColor = vec4(uC*b*0.05*e, b*0.05*e);
        }`,
    })
  );
  sheen.position.z = 0.02;
  dash.add(sheen);

  /* =====================================================================
     3. CASINO LAYER — falling / floating chips and cards
     ===================================================================== */
  const casino = createCasinoLayer(scene, { reduceMotion });

  /* =====================================================================
     4. LIGHTS
     ===================================================================== */
  scene.add(new THREE.AmbientLight(0x2a4252, 1.7));
  const key = new THREE.DirectionalLight(COL.ice, 1.9);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(COL.cyan, 20, 20);
  rim.position.set(-4, -2, 5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xff6a4d, 9, 18);
  warm.position.set(5, -3, 3);
  scene.add(warm);

  /* =====================================================================
     5. POST
     ===================================================================== */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.46, 0.5, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* =====================================================================
     6. RESIZE
     ===================================================================== */
  // Declared before resize() runs — adaptive quality lowers this if the
  // device turns out to be slow.
  let currentScale = 1;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    // Bloom is fill-rate bound: rendering at 2x DPR costs 4x the pixels for
    // very little visible gain on a glowing display. 1.5 is the sweet spot.
    const dpr = Math.min(window.devicePixelRatio, 1.5) * currentScale;
    camera.aspect = w / h;
    camera.position.z = w < 640 ? 17.5 : w < 980 ? 14.2 : 11.4;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* =====================================================================
     7. INPUT STATE
     ===================================================================== */
  const state = {
    scroll: 0, velocity: 0,
    targetRpm: 0, rpm: 0,
    speed: 0, targetSpeed: 0,
    pointerX: 0, pointerY: 0, px: 0, py: 0,
  };

  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    state.scroll = Math.min(y / max, 1);
    state.velocity = Math.min(Math.abs(y - lastY) / 42, 1);
    lastY = y;
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    state.pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    state.pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---- ignition self-test sweep (wall-clock, framerate independent) --- */
  const SWEEP_MS = 2200;
  const t0 = performance.now();
  let sweeping = true;
  let screenAccum = 0;
  let frameSamples = 0, frameTimeSum = 0, qualityLocked = false;

  /* =====================================================================
     8. LOOP
     ===================================================================== */
  const clock = new THREE.Clock();
  let raf = null, visible = true, onScreen = true;

  /* Smoothed frame rate for the HUD telemetry readout. Exponential moving
     average — a raw per-frame figure jitters too much to read. */
  let fpsAvg = 0;

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && onScreen && raf === null) loop();
  });

  // The hero is a full-screen canvas with post-processing. Once the user has
  // scrolled past it there is no reason to keep rendering it at all — this was
  // the single biggest cost on the page.
  const heroIO = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && visible && raf === null) loop();
  }, { threshold: 0.01 });
  heroIO.observe(canvas);

  function loop() {
    if (!visible || !onScreen) { raf = null; return; }
    raf = requestAnimationFrame(loop);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (dt > 0) fpsAvg = fpsAvg ? fpsAvg * 0.9 + (1 / dt) * 0.1 : 1 / dt;

    /* --- adaptive quality -------------------------------------------
       Measure real frame cost and, if the device is struggling, drop the
       render resolution once. Cheap insurance for old laptops and phones
       without hurting anything on capable hardware. */
    if (!qualityLocked) {
      frameSamples++;
      frameTimeSum += dt;
      if (frameSamples === 90) {
        const avgFps = 1 / (frameTimeSum / frameSamples);
        if (avgFps < 40) {
          currentScale = 0.72;
          bloom.strength *= 0.85;
          resize();
        }
        qualityLocked = true;
      }
    }

    if (sweeping) {
      const s = Math.min((performance.now() - t0) / SWEEP_MS, 1);
      const v = s < 0.5 ? easeOut(s * 2) : 1 - easeInOut((s - 0.5) * 2);
      state.targetRpm = Math.max(v, 0);
      if (s >= 1) { sweeping = false; }
    } else {
      const idle = reduceMotion ? 0.05 : 0.06 + Math.sin(t * 2.1) * 0.017 + Math.sin(t * 5.3) * 0.007;
      state.targetRpm = Math.min(idle + state.scroll * 0.70 + state.velocity * 0.3, 1);
    }
    state.rpm += (state.targetRpm - state.rpm) * Math.min(dt * 7.5, 1);
    state.velocity *= 0.92;

    // digital speed trails the revs, as it would through the gears
    state.targetSpeed = state.rpm * DATA.gauge.maxSpeed;
    state.speed += (state.targetSpeed - state.speed) * Math.min(dt * 3.4, 1);

    // Repaint the display at ~30fps. The 3D scene still runs at full rate;
    // only the canvas->GPU texture upload is throttled.
    screenAccum += dt;
    if (screenAccum >= 1 / 30) {
      screenAccum = 0;
      drawScreen(sx, SC_W, SC_H, state, t);
      screenTex.needsUpdate = true;
    }

    const overRed = state.rpm > DATA.gauge.redline / DATA.gauge.maxRpm;
    bloom.strength = 0.46 + state.rpm * 0.3 + (overRed ? 0.14 : 0);

    /* parallax */
    state.px += (state.pointerX - state.px) * Math.min(dt * 3, 1);
    state.py += (state.pointerY - state.py) * Math.min(dt * 3, 1);
    dash.rotation.y = state.px * 0.17;
    dash.rotation.x = -0.1 + state.py * 0.1;
    dash.position.y = state.scroll * 3.2;
    dash.scale.setScalar(1 - state.scroll * 0.2);

    casino.update(dt, t, state);

    camera.position.x = state.px * 0.4;
    camera.position.y = -state.py * 0.28;
    camera.lookAt(0, dash.position.y * 0.34, 0);

    composer.render();
  }
  loop();

  return {
    ok: true,
    getRpm: () => state.rpm,
    getSpeed: () => state.speed,
    rev: (a = 0.45) => { state.velocity = Math.max(state.velocity, a); },

    /* Real render cost, for the HUD telemetry strip. renderer.info.render is
       reset every frame by three.js, so these are per-frame figures for the
       most recent composer pass. Reports 0 fps while the hero is parked
       off-screen, which is accurate — the loop really has stopped. */
    getStats() {
      const r = renderer.info.render;
      const running = raf !== null && visible && onScreen;
      return {
        fps:   running ? Math.round(fpsAvg) : 0,
        ms:    running ? +(1000 / Math.max(fpsAvg, 1)).toFixed(1) : 0,
        calls: r.calls,
        tris:  r.triangles,
      };
    },

    dispose() {
      if (raf) cancelAnimationFrame(raf);
      heroIO.disconnect();
      window.removeEventListener('resize', resize);
      casino.dispose();
      renderer.dispose();
    },
  };
}

/* ============================================================================
   SCREEN PAINTER — the actual TFT layout
   ========================================================================== */
function drawScreen(x, W, H, st, time) {
  const { maxRpm, redline, maxSpeed } = DATA.gauge;

  x.clearRect(0, 0, W, H);

  /* --- panel background ------------------------------------------------ */
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(9,17,24,0.95)');
  bg.addColorStop(1, 'rgba(4,8,12,0.97)');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // faint pixel grid so it reads as a backlit display
  x.strokeStyle = 'rgba(95,230,255,0.026)';
  x.lineWidth = 1;
  for (let i = 0; i < W; i += 30) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let i = 0; i < H; i += 30) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }

  /* =====================================================================
     LAYOUT: this is a WIDE dash. The centre band is deliberately left
     empty because the hero name sits over it in the DOM. All instruments
     live in the left and right thirds.
     ===================================================================== */

  /* --- linear segmented rev bar across the very top -------------------- */
  const barX = W * 0.085, barW = W * 0.83;
  const barY = H * 0.085, barH = H * 0.052;
  const SEGS = 64;
  const gap  = 3;
  const segW = (barW - gap * (SEGS - 1)) / SEGS;
  const lit    = st.rpm * SEGS;
  const redSeg = (redline / maxRpm) * SEGS;

  for (let i = 0; i < SEGS; i++) {
    const on = i < lit;
    const isRed = i >= redSeg;
    // segments grow taller toward the redline, like a real LED tach
    const grow = 0.55 + 0.45 * (i / SEGS);
    const h = barH * grow;
    const px = barX + i * (segW + gap);
    const py = barY + (barH - h);

    if (on) {
      x.fillStyle = isRed ? '#ff3b30' : '#5fe6ff';
      x.shadowColor = isRed ? '#ff3b30' : '#5fe6ff';
      x.shadowBlur = 22;
    } else {
      x.fillStyle = isRed ? 'rgba(255,59,48,0.12)' : 'rgba(95,230,255,0.09)';
      x.shadowBlur = 0;
    }
    x.fillRect(px, py, segW, h);
  }
  x.shadowBlur = 0;

  // scale numerals under the bar
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 ${Math.round(W * 0.0155)}px Orbitron, sans-serif`;
  for (let i = 0; i <= maxRpm; i += 2) {
    const f = i / maxRpm;
    x.fillStyle = i >= redline ? 'rgba(255,59,48,0.9)' : 'rgba(150,198,220,0.65)';
    x.fillText(String(i), barX + f * barW, barY + barH + H * 0.042);
  }
  x.textAlign = 'left';
  x.fillStyle = 'rgba(120,200,230,0.5)';
  x.font = `600 ${Math.round(W * 0.0125)}px Orbitron, sans-serif`;
  x.fillText('RPM  x1000', barX, barY - H * 0.032);

  // blinking shift light at the far right of the bar
  if (st.rpm > redline / maxRpm && Math.sin(time * 14) > 0) {
    x.textAlign = 'right';
    x.fillStyle = '#ff3b30';
    x.shadowColor = '#ff3b30'; x.shadowBlur = 18;
    x.font = `800 ${Math.round(W * 0.017)}px Orbitron, sans-serif`;
    x.fillText('SHIFT UP', barX + barW, barY - H * 0.032);
    x.shadowBlur = 0;
  }

  /* --- LEFT CLUSTER: big digital speed --------------------------------- */
  const LX = W * 0.125;      // centre of the left instrument group
  const midY = H * 0.60;

  x.textAlign = 'center';
  x.shadowColor = '#5fe6ff'; x.shadowBlur = 26;
  x.fillStyle = '#ffffff';
  x.font = `900 ${Math.round(W * 0.092)}px Orbitron, sans-serif`;
  x.fillText(String(Math.round(st.speed)).padStart(3, '0'), LX, midY);
  x.shadowBlur = 0;

  x.fillStyle = 'rgba(120,200,230,0.78)';
  x.font = `600 ${Math.round(W * 0.019)}px Orbitron, sans-serif`;
  x.fillText('km/h', LX, midY + H * 0.085);

  // small rpm digits beneath
  x.fillStyle = 'rgba(95,230,255,0.85)';
  x.font = `700 ${Math.round(W * 0.024)}px Orbitron, sans-serif`;
  x.fillText(String(Math.round(st.rpm * maxRpm * 1000)).padStart(5, '0') + ' rpm', LX, midY + H * 0.155);

  /* --- RIGHT CLUSTER: gear + mode -------------------------------------- */
  const RX = W * 0.876;
  const gear = st.rpm < 0.02 ? 'N' : String(Math.min(6, Math.max(1, Math.ceil(st.rpm * 6))));

  // gear box outline
  x.strokeStyle = 'rgba(95,230,255,0.26)';
  x.lineWidth = 2.5;
  const gs = W * 0.044;
  roundRectPath(x, RX - gs, midY - gs - H * 0.02, gs * 2, gs * 2, 12);
  x.stroke();

  x.shadowColor = '#5fe6ff'; x.shadowBlur = 22;
  x.fillStyle = '#eaf9ff';
  x.font = `900 ${Math.round(W * 0.052)}px Orbitron, sans-serif`;
  x.fillText(gear, RX, midY - H * 0.018);
  x.shadowBlur = 0;

  x.fillStyle = 'rgba(120,200,230,0.62)';
  x.font = `600 ${Math.round(W * 0.0125)}px Orbitron, sans-serif`;
  x.fillText('GEAR', RX, midY + H * 0.062);

  x.fillStyle = 'rgba(95,230,255,0.8)';
  x.font = `700 ${Math.round(W * 0.0165)}px Orbitron, sans-serif`;
  x.fillText('SPORT', RX, midY + H * 0.125);
  x.fillStyle = 'rgba(120,200,230,0.5)';
  x.font = `500 ${Math.round(W * 0.012)}px Orbitron, sans-serif`;
  x.fillText('ABS  ·  DTC  ·  DDC', RX, midY + H * 0.175);

  /* --- corner status strip ---------------------------------------------- */
  x.textAlign = 'left';
  x.fillStyle = 'rgba(120,200,230,0.5)';
  x.font = `600 ${Math.round(W * 0.0118)}px Orbitron, sans-serif`;
  x.fillText('READY', barX, H * 0.945);
  x.textAlign = 'right';
  x.fillText('TRIP  128 km', barX + barW, H * 0.945);

  /* --- fuel + temp bars at the outer bottom corners ---------------------- */
  miniBar(x, W * 0.085, H * 0.855, W * 0.15, H * 0.014, 0.72, '#5fe6ff', 'FUEL');
  miniBar(x, W * 0.765, H * 0.855, W * 0.15, H * 0.014, 0.45, '#ffb020', 'TEMP');
}

function miniBar(x, px, py, w, h, frac, color, label) {
  x.fillStyle = 'rgba(95,230,255,0.10)';
  x.fillRect(px, py, w, h);
  x.fillStyle = color;
  x.shadowColor = color; x.shadowBlur = 10;
  x.fillRect(px, py, w * frac, h);
  x.shadowBlur = 0;
  x.textAlign = 'left';
  x.fillStyle = 'rgba(120,200,230,0.55)';
  x.font = `600 ${Math.round(w * 0.10)}px Orbitron, sans-serif`;
  x.fillText(label, px, py - h * 1.4);
}

function roundRectPath(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r);
  x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
  x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r);
  x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py);
  x.closePath();
}

/** Rounded rectangle as a THREE.Shape, centred on the origin. */
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const easeOut   = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
