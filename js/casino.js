/* ============================================================================
   casino.js — ambient 3D casino layer: falling + floating chips and cards
   ----------------------------------------------------------------------------
   A nod to the ETG work. Two populations share the scene:

     · CHIPS — short cylinders with an edge-stripe pattern and a ring face.
               Tumble as they fall.
     · CARDS — thin rounded planes with a pip painted on the face and a
               lattice on the back. Flutter and spin more slowly.

   Both wrap vertically: once something falls below the floor it is recycled
   to the top with fresh randomised properties, so the field never depletes.
   Instances are built once and reused via InstancedMesh where possible to
   keep the draw-call count low.
   ========================================================================== */

import * as THREE from './vendor/three.module.js';

const CHIP_COLORS = [0xff3b30, 0x5fe6ff, 0xeaf9ff, 0x1a2f3d, 0xffb020];

export function createCasinoLayer(scene, { reduceMotion = false } = {}) {
  const group = new THREE.Group();
  scene.add(group);

  /* --- how much stuff: scale down on small screens ------------------- */
  const narrow = window.innerWidth < 760;
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4
                || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const CHIP_N = reduceMotion ? 8 : lowPower ? 12 : (narrow ? 16 : 26);
  const CARD_N = reduceMotion ? 5 : lowPower ? 7  : (narrow ? 9 : 15);

  // zBack/zFront keep every prop BEHIND the dash plane (dash sits at z ~ 0),
  // so nothing ever sails between the camera and the instrument cluster.
  const BOUND = { x: 17, yTop: 11, yBot: -11, zBack: -17, zFront: -4 };

  /* =====================================================================
     CHIPS
     ===================================================================== */
  // A chip used to be 9 separate meshes (body + 2 face rings + 6 edge dashes),
  // i.e. ~270 draw calls for 30 chips. Now each chip is ONE mesh: the face
  // detail is baked into a texture and the edge dashes into the side material.
  const chipGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24);
  const chips = [];

  // Cylinder materials are indexed [side, top, bottom]; give the faces the
  // printed texture and the rim the striped one.
  const faceTexCache = new Map();
  const edgeTexCache = new Map();

  for (let i = 0; i < CHIP_N; i++) {
    const color = CHIP_COLORS[i % CHIP_COLORS.length];

    if (!faceTexCache.has(color)) faceTexCache.set(color, makeChipFaceTexture(color));
    if (!edgeTexCache.has(color)) edgeTexCache.set(color, makeChipEdgeTexture(color));

    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTexCache.get(color), color: 0xffffff,
      metalness: 0.3, roughness: 0.5,
      emissive: color, emissiveIntensity: 0.12,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      map: edgeTexCache.get(color), color: 0xffffff,
      metalness: 0.3, roughness: 0.5,
      emissive: color, emissiveIntensity: 0.12,
    });

    const chip = new THREE.Mesh(chipGeo, [edgeMat, faceMat, faceMat]);

    resetChip(chip, true);
    chips.push(chip);
    group.add(chip);
  }

  /* =====================================================================
     CARDS
     ===================================================================== */
  const cardGeo = roundedPlane(0.62, 0.88, 0.09, 6);
  const cards = [];
  const faceTex = makeCardFaceTexture();
  const backTex = makeCardBackTexture();

  for (let i = 0; i < CARD_N; i++) {
    const card = new THREE.Group();

    // One double-sided mesh instead of two single-sided ones. At the size
    // these render, the separate back texture was not distinguishable.
    const face = new THREE.Mesh(cardGeo, new THREE.MeshStandardMaterial({
      map: i % 2 ? backTex : faceTex, color: 0xffffff,
      metalness: 0.08, roughness: 0.58,
      emissive: 0x5fbcd8, emissiveIntensity: 0.12,
      side: THREE.DoubleSide,
    }));
    card.add(face);

    resetCard(card, true);
    cards.push(card);
    group.add(card);
  }

  /* =====================================================================
     RESET / RECYCLE
     ===================================================================== */
  function resetChip(c, initial = false) {
    c.position.set(
      (Math.random() - 0.5) * BOUND.x * 2,
      initial ? (Math.random() - 0.5) * BOUND.yTop * 2 : BOUND.yTop + Math.random() * 3,
      BOUND.zBack + Math.random() * (BOUND.zFront - BOUND.zBack)
    );
    c.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    c.userData = {
      fall: 0.55 + Math.random() * 1.05,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ),
      driftAmp: 0.3 + Math.random() * 0.7,
      driftFreq: 0.25 + Math.random() * 0.5,
      phase: Math.random() * 6.28,
      baseX: 0,
    };
    c.userData.baseX = c.position.x;
    const s = 0.30 + Math.random() * 0.42;
    c.scale.setScalar(s);
  }

  function resetCard(c, initial = false) {
    c.position.set(
      (Math.random() - 0.5) * BOUND.x * 2,
      initial ? (Math.random() - 0.5) * BOUND.yTop * 2 : BOUND.yTop + Math.random() * 3,
      BOUND.zBack + Math.random() * (BOUND.zFront - BOUND.zBack)
    );
    c.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    c.userData = {
      fall: 0.4 + Math.random() * 0.7,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 0.7
      ),
      driftAmp: 0.5 + Math.random() * 1.0,
      driftFreq: 0.2 + Math.random() * 0.4,
      phase: Math.random() * 6.28,
      baseX: 0,
    };
    c.userData.baseX = c.position.x;
    const s = 0.40 + Math.random() * 0.45;
    c.scale.setScalar(s);
  }

  /* =====================================================================
     UPDATE
     ===================================================================== */
  function update(dt, t, state = {}) {
    // scrolling speeds the fall — the page itself acts like a throttle
    const boost = 1 + (state.rpm ?? 0) * 2.2 + (state.velocity ?? 0) * 3;
    const step = reduceMotion ? dt * 0.15 : dt;

    for (const c of chips) {
      const u = c.userData;
      c.position.y -= u.fall * boost * step;
      c.position.x = u.baseX + Math.sin(t * u.driftFreq + u.phase) * u.driftAmp;
      c.rotation.x += u.spin.x * step;
      c.rotation.y += u.spin.y * step;
      c.rotation.z += u.spin.z * step;
      if (c.position.y < BOUND.yBot) resetChip(c);
    }

    for (const c of cards) {
      const u = c.userData;
      c.position.y -= u.fall * boost * step;
      c.position.x = u.baseX + Math.sin(t * u.driftFreq + u.phase) * u.driftAmp;
      // flutter: cards wobble more than they tumble
      c.rotation.x += u.spin.x * step;
      c.rotation.y += u.spin.y * step;
      c.rotation.z = Math.sin(t * u.driftFreq * 1.6 + u.phase) * 0.4;
      if (c.position.y < BOUND.yBot) resetCard(c);
    }
  }

  function dispose() {
    scene.remove(group);
    chipGeo.dispose();
    cardGeo.dispose();
    faceTex.dispose();
    backTex.dispose();
    faceTexCache.forEach((t) => t.dispose());
    edgeTexCache.forEach((t) => t.dispose());
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }

  return { update, dispose, group };
}

/* ============================================================================
   GEOMETRY / TEXTURE HELPERS
   ========================================================================== */

/** A rounded rectangle plane (cards have rounded corners). */
function roundedPlane(w, h, r, seg = 6) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, seg);
  // normalise UVs across the card face
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2]     = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Chip face: concentric rings + inset dashes, printed into one texture. */
function makeChipFaceTexture(color) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const hex = '#' + color.toString(16).padStart(6, '0');
  const cx = S / 2, cy = S / 2;

  x.fillStyle = hex;
  x.beginPath(); x.arc(cx, cy, S / 2, 0, Math.PI * 2); x.fill();

  // inset ring pair
  x.strokeStyle = 'rgba(255,255,255,0.55)';
  x.lineWidth = S * 0.035;
  x.beginPath(); x.arc(cx, cy, S * 0.33, 0, Math.PI * 2); x.stroke();
  x.lineWidth = S * 0.015;
  x.beginPath(); x.arc(cx, cy, S * 0.24, 0, Math.PI * 2); x.stroke();

  // radial dashes around the edge
  x.strokeStyle = 'rgba(255,255,255,0.5)';
  x.lineWidth = S * 0.055;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * S * 0.38, cy + Math.sin(a) * S * 0.38);
    x.lineTo(cx + Math.cos(a) * S * 0.48, cy + Math.sin(a) * S * 0.48);
    x.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Chip edge: alternating stripes wrapped around the rim. */
function makeChipEdgeTexture(color) {
  const W = 128, H = 16;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#' + color.toString(16).padStart(6, '0');
  x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 6; i++) x.fillRect((i / 6) * W, 0, W / 18, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Card face: a corner index and a large centred pip. */
function makeCardFaceTexture() {
  const W = 256, H = 358;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  x.fillStyle = '#f4fbff';
  x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(20,60,80,0.30)';
  x.lineWidth = 4;
  x.strokeRect(7, 7, W - 14, H - 14);

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', 'K', 'Q', 'J', '10'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  const red  = (suit === '♥' || suit === '♦');
  const ink  = red ? '#e0342a' : '#0e2732';

  x.fillStyle = ink;
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  // centre pip
  x.font = `${Math.round(W * 0.62)}px Georgia, serif`;
  x.fillText(suit, W / 2, H / 2 + 8);

  // corner index (top-left, and rotated bottom-right)
  x.font = `700 ${Math.round(W * 0.19)}px Georgia, serif`;
  x.textAlign = 'left';
  x.fillText(rank, 20, 38);
  x.font = `${Math.round(W * 0.15)}px Georgia, serif`;
  x.fillText(suit, 22, 74);

  x.save();
  x.translate(W - 20, H - 38);
  x.rotate(Math.PI);
  x.font = `700 ${Math.round(W * 0.19)}px Georgia, serif`;
  x.fillText(rank, 0, 0);
  x.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Card back: cyan lattice on a dark ground. */
function makeCardBackTexture() {
  const W = 256, H = 358;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  x.fillStyle = '#0b1a24';
  x.fillRect(0, 0, W, H);

  x.strokeStyle = 'rgba(95,230,255,0.5)';
  x.lineWidth = 2;
  const step = 26;
  for (let i = -H; i < W + H; i += step) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke();
    x.beginPath(); x.moveTo(i + H, 0); x.lineTo(i, H); x.stroke();
  }

  x.strokeStyle = 'rgba(95,230,255,0.85)';
  x.lineWidth = 5;
  x.strokeRect(12, 12, W - 24, H - 24);

  x.fillStyle = 'rgba(4,8,12,0.72)';
  x.fillRect(W * 0.22, H * 0.40, W * 0.56, H * 0.20);
  x.fillStyle = '#5fe6ff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `700 ${Math.round(W * 0.15)}px Orbitron, sans-serif`;
  x.fillText('PH', W / 2, H * 0.50);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
