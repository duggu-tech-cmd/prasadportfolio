/* ============================================================================
   garage.js — SOLID 3D models of the dream bike and dream car
   ----------------------------------------------------------------------------
   Replaces the earlier wireframes with shaded, lit, solid geometry:
   real materials (painted metal, glass, rubber, chrome), an environment map
   for believable reflections, a ground shadow, and studio lighting.

   Everything is still generated procedurally from primitives and lathed /
   extruded profiles — no external model files to download, and NO logos,
   badges or brand marks anywhere. They are proportion studies:

     · Bike → tall adventure-sport: beaked fairing, upright stance,
              inline-4 engine, high tail, USD forks, single-sided swingarm look
     · Car  → fastback coupé-SUV: long hood, raked screen, falling roofline,
              flush handles, short overhangs

   If you later want a real licensed model, drop a .glb in assets/models/ and
   swap buildBike()/buildCar() for a GLTFLoader call — the viewer harness
   below stays exactly the same.
   ========================================================================== */

import * as THREE from './vendor/three.module.js';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import * as BufferGeometryUtils from './vendor/addons/utils/BufferGeometryUtils.js';

/* ---- shared palette --------------------------------------------------- */
const PAINT_BIKE = 0x1c6f8c;   // deep teal
const PAINT_CAR  = 0x243a47;   // graphite blue
const ACCENT     = 0x5fe6ff;
const RED        = 0xff3b30;

/* ---- material factory -------------------------------------------------- */
const M = {
  paint: (color) => new THREE.MeshStandardMaterial({
    // Standard + a strong env map reads almost identically to clearcoat here,
    // without the extra shader cost.
    color, metalness: 0.6, roughness: 0.24, envMapIntensity: 1.3,
  }),
  matte: (color, rough = 0.78) => new THREE.MeshStandardMaterial({
    color, metalness: 0.15, roughness: rough,
  }),
  metal: (color = 0xbcccd4, rough = 0.22) => new THREE.MeshStandardMaterial({
    color, metalness: 1, roughness: rough,
  }),
  dark: () => new THREE.MeshStandardMaterial({
    color: 0x14202a, metalness: 0.7, roughness: 0.45,
  }),
  rubber: () => new THREE.MeshStandardMaterial({
    color: 0x0d1216, metalness: 0.0, roughness: 0.92,
  }),
  glass: () => new THREE.MeshStandardMaterial({
    // Deliberately NOT MeshPhysicalMaterial+transmission: transmission forces
    // an extra full-scene render pass per frame, which tanked these viewers
    // from ~30fps to ~1fps for refraction nobody can see at this canvas size.
    color: 0x0a1c26, metalness: 0.9, roughness: 0.08,
    transparent: true, opacity: 0.55,
    envMapIntensity: 1.6,
  }),
  lamp: (color, intensity = 1.6) => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity,
    metalness: 0.2, roughness: 0.3,
  }),
};

/* ---- geometry helpers --------------------------------------------------- */

/** Rounded-rect extrusion, centred, returned as a mesh. */
function slab(w, h, d, r, mat, bevel = 0.02) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12,
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/** Extrude a 2D profile (array of [x,y]) into a solid. */
function profile(pts, depth, mat, bevel = 0.03) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/** A cylinder oriented along X (handy for axles, tubes, exhausts). */
function tubeX(r1, r2, len, mat, seg = 20) {
  const g = new THREE.CylinderGeometry(r1, r2, len, seg);
  g.rotateZ(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

/** A solid wheel: rubber tyre, rim barrel, spokes, brake disc. */
function solidWheel(radius, width, spokes = 10, opts = {}) {
  const g = new THREE.Group();

  // tyre — torus gives a rounded shoulder like a real bike tyre
  const tyreThick = opts.round ? radius * 0.22 : radius * 0.17;
  const tyre = new THREE.Mesh(
    new THREE.TorusGeometry(radius - tyreThick, tyreThick, 16, 40),
    M.rubber()
  );
  g.add(tyre);

  // tread band
  const tread = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width * 0.92, 40, 1, true),
    M.rubber()
  );
  tread.rotation.x = Math.PI / 2;
  g.add(tread);

  // rim barrel
  const rimR = radius * 0.62;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR, rimR, width * 0.72, 32),
    M.metal(opts.rimColor ?? 0x9fb3bd, 0.24)
  );
  rim.rotation.x = Math.PI / 2;
  g.add(rim);

  // hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.17, radius * 0.17, width * 0.95, 20),
    M.metal(0x7d8f99, 0.3)
  );
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  // spokes
  const spokeMat = M.metal(opts.rimColor ?? 0xa8bcc6, 0.26);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const sp = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.48, width * 0.34, radius * 0.09),
      spokeMat
    );
    sp.position.set(Math.cos(a) * radius * 0.36, Math.sin(a) * radius * 0.36, 0);
    sp.rotation.z = a;
    g.add(sp);
  }

  // brake disc
  if (opts.disc !== false) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, 0.018, 32),
      M.metal(0x6f8189, 0.36)
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.z = width * 0.44;
    g.add(disc);
  }

  return g;
}

/* ============================================================================
   BIKE — solid adventure-sport
   ========================================================================== */
export function buildBike() {
  const bike = new THREE.Group();
  const paint = M.paint(PAINT_BIKE);
  const dark  = M.dark();
  const metal = M.metal();

  const R = 0.46;
  const FX = 1.32, RX = -1.30;

  /* --- wheels ---------------------------------------------------------- */
  const fw = solidWheel(R, 0.14, 10, { round: true, rimColor: 0x8fa6b2 });
  fw.position.set(FX, R, 0);
  bike.add(fw);

  const rw = solidWheel(R, 0.20, 10, { round: true, rimColor: 0x8fa6b2 });
  rw.position.set(RX, R, 0);
  bike.add(rw);

  /* --- USD fork legs ---------------------------------------------------- */
  [-0.135, 0.135].forEach((z) => {
    // lower slider (fat)
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 14), M.metal(0xc9d6dc, 0.2));
    lower.position.set(FX + 0.045, R + 0.30, z);
    lower.rotation.z = 0.30;
    bike.add(lower);
    // upper stanchion (thin, gold-ish anodised)
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.60, 14), M.metal(0x8c8f94, 0.26));
    upper.position.set(FX - 0.14, R + 0.86, z);
    upper.rotation.z = 0.30;
    bike.add(upper);
  });

  // triple clamps
  [1.18, 1.40].forEach((y, i) => {
    const clamp = slab(0.30, 0.10, 0.40, 0.04, dark);
    clamp.position.set(0.99 - i * 0.03, y, 0);
    bike.add(clamp);
  });

  /* --- front mudguard / beak -------------------------------------------- */
  const beak = profile([
    [1.56, 0.84], [1.44, 1.03], [1.12, 1.08], [1.02, 0.95], [1.20, 0.80],
  ], 0.24, paint, 0.03);
  bike.add(beak);

  /* --- upper fairing ------------------------------------------------------ */
  const fairing = profile([
    [1.32, 1.00], [1.20, 1.32], [1.00, 1.52], [0.80, 1.46], [0.86, 1.12], [1.10, 0.94],
  ], 0.30, paint, 0.045);
  bike.add(fairing);

  // fairing side panels taper inward
  [-0.20, 0.20].forEach((z) => {
    const side = profile([
      [1.22, 1.02], [1.12, 1.28], [0.94, 1.42], [0.84, 1.16], [1.02, 0.96],
    ], 0.06, paint, 0.02);
    side.position.z = z;
    side.rotation.y = z > 0 ? -0.16 : 0.16;
    bike.add(side);
  });

  /* --- windscreen --------------------------------------------------------- */
  const screen = profile([
    [1.02, 1.50], [0.94, 1.80], [0.76, 1.78], [0.82, 1.46],
  ], 0.20, M.glass(), 0.015);
  screen.rotation.y = 0;
  bike.add(screen);

  /* --- headlight ----------------------------------------------------------- */
  const hl = slab(0.26, 0.20, 0.22, 0.06, M.lamp(0xdff6ff, 1.4));
  hl.position.set(1.24, 1.14, 0);
  hl.rotation.z = -0.25;
  bike.add(hl);

  /* --- handlebar ------------------------------------------------------------ */
  const bar = tubeX(0.028, 0.028, 0.74, metal);
  bar.position.set(0.84, 1.48, 0);
  bike.add(bar);
  [-0.32, 0.32].forEach((z) => {
    const grip = tubeX(0.036, 0.036, 0.12, M.matte(0x11181e, 0.9));
    grip.position.set(0.84, 1.48, z);
    bike.add(grip);
    // mirror
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8), metal);
    stalk.position.set(0.87, 1.60, z * 0.92);
    stalk.rotation.z = -0.2;
    bike.add(stalk);
    const mir = slab(0.16, 0.09, 0.03, 0.03, dark);
    mir.position.set(0.90, 1.72, z * 0.88);
    bike.add(mir);
  });

  /* --- fuel tank -------------------------------------------------------------- */
  const tank = profile([
    [0.80, 1.04], [0.66, 1.36], [0.18, 1.44], [-0.14, 1.30], [-0.18, 1.06], [0.24, 0.96],
  ], 0.42, paint, 0.07);
  bike.add(tank);
  // tank shoulders taper
  [-0.24, 0.24].forEach((z) => {
    const sh = profile([
      [0.72, 1.06], [0.60, 1.30], [0.20, 1.37], [-0.10, 1.25], [-0.13, 1.08],
    ], 0.10, paint, 0.05);
    sh.position.z = z;
    sh.rotation.y = z > 0 ? -0.2 : 0.2;
    bike.add(sh);
  });

  /* --- seat ---------------------------------------------------------------------- */
  const seat = profile([
    [-0.16, 1.24], [-0.62, 1.20], [-0.92, 1.26], [-0.94, 1.14], [-0.66, 1.06], [-0.18, 1.10],
  ], 0.30, M.matte(0x0e1418, 0.88), 0.04);
  bike.add(seat);

  /* --- tail unit ------------------------------------------------------------------- */
  const tail = profile([
    [-0.90, 1.24], [-1.16, 1.36], [-1.32, 1.34], [-1.24, 1.16], [-0.94, 1.10],
  ], 0.22, paint, 0.035);
  bike.add(tail);

  const tl = slab(0.14, 0.07, 0.16, 0.03, M.lamp(RED, 1.8));
  tl.position.set(-1.30, 1.27, 0);
  bike.add(tl);

  /* --- engine: block + cylinder head + exhaust header ---------------------------- */
  const block = slab(0.66, 0.50, 0.44, 0.07, M.metal(0x5d6a72, 0.5));
  block.position.set(0.28, 0.76, 0);
  bike.add(block);

  const head = slab(0.44, 0.24, 0.46, 0.05, M.metal(0x7c8a92, 0.42));
  head.position.set(0.34, 1.04, 0);
  bike.add(head);

  // cooling fins
  for (let i = 0; i < 5; i++) {
    const fin = slab(0.40, 0.016, 0.44, 0.008, M.metal(0x9aa8b0, 0.4), 0);
    fin.position.set(0.34, 0.92 + i * 0.035, 0);
    bike.add(fin);
  }

  // radiator
  const rad = slab(0.10, 0.40, 0.40, 0.03, M.matte(0x2a3339, 0.7));
  rad.position.set(0.66, 0.86, 0);
  bike.add(rad);

  // exhaust headers curving down
  [-0.12, -0.04, 0.04, 0.12].forEach((z) => {
    const hdr = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 18, Math.PI * 0.55), M.metal(0xb9c6cc, 0.28));
    hdr.position.set(0.52, 0.78, z);
    hdr.rotation.set(Math.PI / 2, 0, -0.5);
    bike.add(hdr);
  });

  /* --- frame spars --------------------------------------------------------------- */
  [-0.21, 0.21].forEach((z) => {
    const spar = profile([
      [0.70, 1.16], [0.10, 1.06], [-0.30, 0.98], [-0.30, 0.86], [0.10, 0.94], [0.70, 1.04],
    ], 0.06, M.metal(0x93a4ac, 0.34), 0.015);
    spar.position.z = z;
    bike.add(spar);
  });

  /* --- swingarm ------------------------------------------------------------------- */
  [-0.13, 0.13].forEach((z) => {
    const sa = profile([
      [-0.32, 0.68], [RX, R + 0.05], [RX, R - 0.06], [-0.32, 0.56],
    ], 0.07, M.metal(0x8b9ba3, 0.3), 0.015);
    sa.position.z = z;
    bike.add(sa);
  });

  // chain
  const chain = profile([
    [-0.36, 0.58], [RX + 0.02, R + 0.09], [RX + 0.02, R + 0.03], [-0.36, 0.52],
  ], 0.03, M.metal(0x59656c, 0.55), 0.006);
  chain.position.z = -0.17;
  bike.add(chain);

  // sprocket
  const spr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 22), M.metal(0x76858d, 0.4));
  spr.rotation.x = Math.PI / 2;
  spr.position.set(RX, R, -0.17);
  bike.add(spr);

  /* --- monoshock -------------------------------------------------------------------- */
  const shockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.34, 12), M.metal(0xc0ccd2, 0.25));
  shockBody.position.set(-0.38, 0.86, 0);
  shockBody.rotation.z = 0.22;
  bike.add(shockBody);
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 26), M.paint(RED));
  for (let i = 0; i < 6; i++) {
    const c = spring.clone();
    c.position.set(-0.372 + i * 0.012, 0.74 + i * 0.055, 0);
    c.rotation.x = Math.PI / 2;
    bike.add(c);
  }

  /* --- exhaust can ---------------------------------------------------------------- */
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.115, 0.40, 16), M.metal(0xaebbc2, 0.3));
  can.rotation.z = Math.PI / 2;
  can.rotation.y = 0.10;
  can.position.set(-0.80, 0.58, 0.21);
  bike.add(can);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.06, 16), M.dark());
  tip.rotation.z = Math.PI / 2;
  tip.position.set(-1.00, 0.57, 0.215);
  bike.add(tip);

  /* --- footpegs + brake lever ------------------------------------------------------- */
  [-0.26, 0.26].forEach((z) => {
    const peg = tubeX(0.018, 0.018, 0.14, metal);
    peg.position.set(-0.16, 0.60, z * 1.15);
    peg.rotation.y = Math.PI / 2;
    bike.add(peg);
  });

  bike.position.y = -0.86;
  return bike;
}

/* ============================================================================
   CAR — solid fastback coupé-SUV
   ========================================================================== */
export function buildCar() {
  const car = new THREE.Group();
  const paint = M.paint(PAINT_CAR);
  const dark  = M.dark();

  const BODY_D = 1.52;
  const WR = 0.46;
  const FX = 1.52, RX = -1.52;

  /* --- lower body: the main volume, arches cut out --------------------- */
  const body = new THREE.Shape();
  body.moveTo(2.32, 0.52);
  body.lineTo(2.36, 0.80);
  body.lineTo(2.24, 0.97);
  body.lineTo(1.56, 1.06);
  body.lineTo(1.04, 1.10);
  body.lineTo(0.98, 1.10);
  body.lineTo(-1.86, 1.04);
  body.lineTo(-2.20, 0.95);
  body.lineTo(-2.34, 0.83);
  body.lineTo(-2.32, 0.52);
  body.lineTo(-2.04, 0.44);
  body.absarc(RX, 0.44, 0.58, Math.PI, 0, true);
  body.lineTo(FX - 0.58, 0.44);
  body.absarc(FX, 0.44, 0.58, Math.PI, 0, true);
  body.lineTo(2.32, 0.52);

  const bodyGeo = new THREE.ExtrudeGeometry(body, {
    depth: BODY_D, bevelEnabled: true,
    bevelThickness: 0.05, bevelSize: 0.06, bevelSegments: 3, curveSegments: 18,
  });
  bodyGeo.translate(0, 0, -BODY_D / 2);
  bodyGeo.computeVertexNormals();
  car.add(new THREE.Mesh(bodyGeo, paint));

  /* --- greenhouse: the cabin, narrower than the body -------------------- */
  const cabin = new THREE.Shape();
  cabin.moveTo(1.00, 1.06);
  cabin.lineTo(0.50, 1.48);
  cabin.lineTo(-0.44, 1.52);
  cabin.lineTo(-1.24, 1.34);
  cabin.lineTo(-1.92, 1.04);
  cabin.lineTo(1.00, 1.06);

  const cabinGeo = new THREE.ExtrudeGeometry(cabin, {
    depth: BODY_D - 0.30, bevelEnabled: true,
    bevelThickness: 0.07, bevelSize: 0.08, bevelSegments: 2, curveSegments: 14,
  });
  cabinGeo.translate(0, 0, -(BODY_D - 0.30) / 2);
  cabinGeo.computeVertexNormals();
  car.add(new THREE.Mesh(cabinGeo, paint));

  /* --- glass: windscreen, side windows, rear screen ---------------------- */
  const glassMat = M.glass();

  const wsGeo = profile([
    [0.98, 1.10], [0.52, 1.46], [0.44, 1.44], [0.92, 1.09],
  ], BODY_D - 0.34, glassMat, 0.01);
  car.add(wsGeo);

  const sideGlass = profile([
    [0.46, 1.44], [-0.42, 1.48], [-1.20, 1.31], [-1.26, 1.18], [-0.40, 1.34], [0.40, 1.30],
  ], BODY_D - 0.20, glassMat, 0.01);
  car.add(sideGlass);

  const rearGlass = profile([
    [-1.22, 1.32], [-1.88, 1.05], [-1.80, 1.01], [-1.16, 1.26],
  ], BODY_D - 0.36, glassMat, 0.01);
  car.add(rearGlass);

  /* --- roof panel ---------------------------------------------------------- */
  const roof = profile([
    [0.48, 1.50], [-0.44, 1.54], [-1.22, 1.36], [-1.18, 1.30], [-0.44, 1.48], [0.46, 1.44],
  ], BODY_D - 0.34, paint, 0.03);
  car.add(roof);

  /* --- wheels ---------------------------------------------------------------- */
  [[FX, 1], [FX, -1], [RX, 1], [RX, -1]].forEach(([x, side]) => {
    const w = solidWheel(WR, 0.26, 12, { rimColor: 0xb4c3cb });
    // sit just proud of the flank so the wheels actually read
    w.position.set(x, WR, side * (BODY_D / 2 + 0.10));
    car.add(w);
  });

  /* --- wheel arch trims ------------------------------------------------------- */
  [[FX, 1], [FX, -1], [RX, 1], [RX, -1]].forEach(([x, side]) => {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.60, 0.05, 10, 22, Math.PI),
      M.matte(0x11181d, 0.85)
    );
    arch.position.set(x, 0.44, side * (BODY_D / 2 + 0.03));
    car.add(arch);
  });

  /* --- lamps ------------------------------------------------------------------- */
  [0.56, -0.56].forEach((z) => {
    const hl = slab(0.10, 0.11, 0.40, 0.04, M.lamp(0xdff6ff, 1.5));
    hl.position.set(2.24, 0.91, z);
    car.add(hl);

    const tl = slab(0.09, 0.10, 0.34, 0.035, M.lamp(RED, 1.7));
    tl.position.set(-2.28, 0.90, z);
    car.add(tl);
  });

  /* --- grille ---------------------------------------------------------------------- */
    const grilleW = slab(0.10, 0.22, 0.98, 0.04, M.matte(0x0c1216, 0.6));
  grilleW.position.set(2.32, 0.68, 0);
  car.add(grilleW);
  for (let i = 0; i < 4; i++) {
    const slat = slab(0.06, 0.018, 0.94, 0.008, M.metal(0x93a3ab, 0.34), 0);
    slat.position.set(2.35, 0.60 + i * 0.05, 0);
    car.add(slat);
  }

  /* --- lower valances / skid plates -------------------------------------------- */
  const frontLip = slab(0.28, 0.14, 1.34, 0.05, M.matte(0x10171c, 0.8));
  frontLip.position.set(2.22, 0.42, 0);
  car.add(frontLip);

  const rearLip = slab(0.28, 0.14, 1.34, 0.05, M.matte(0x10171c, 0.8));
  rearLip.position.set(-2.24, 0.42, 0);
  car.add(rearLip);

  // side sills
  [1, -1].forEach((side) => {
    const sill = slab(2.5, 0.11, 0.12, 0.04, M.matte(0x10171c, 0.8));
    sill.position.set(0, 0.36, side * (BODY_D / 2 - 0.02));
    car.add(sill);
  });

  /* --- flush door handles ---------------------------------------------------------- */
  [1, -1].forEach((side) => {
    [0.02, -1.10].forEach((x) => {
      const h = slab(0.24, 0.045, 0.03, 0.02, M.metal(0xc3d0d6, 0.3));
      h.position.set(x, 1.00, side * (BODY_D / 2 + 0.02));
      car.add(h);
    });
  });

  /* --- mirrors ----------------------------------------------------------------------- */
  [1, -1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), dark);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0.62, 1.24, side * (BODY_D / 2 + 0.02));
    car.add(arm);
    const cap = slab(0.20, 0.10, 0.09, 0.04, paint);
    cap.position.set(0.60, 1.26, side * (BODY_D / 2 + 0.10));
    car.add(cap);
  });

  /* --- roof rails ---------------------------------------------------------------------- */
  [1, -1].forEach((side) => {
    const rail = slab(1.36, 0.045, 0.05, 0.02, M.metal(0xa9b8c0, 0.3));
    rail.position.set(-0.34, 1.55, side * 0.56);
    car.add(rail);
  });

  car.position.y = -0.80;
  return car;
}

/* ============================================================================
   GEOMETRY BATCHING
   ----------------------------------------------------------------------------
   These models are assembled from many small primitives (a single wheel is
   ~18 meshes; the car has four of them). That is fine for authoring but means
   hundreds of draw calls per frame. Since nothing animates *within* a model,
   we can bake it down: group every mesh by material and merge the geometry.
   Typical result is ~8 draw calls instead of ~250.
   ========================================================================== */
function batchModel(root) {
  root.updateMatrixWorld(true);

  const byMaterial = new Map();
  const keep = [];

  root.traverse((o) => {
    if (!o.isMesh) return;
    // multi-material meshes are rare here; leave them intact
    if (Array.isArray(o.material)) { keep.push(o); return; }
    const key = o.material.uuid;
    if (!byMaterial.has(key)) byMaterial.set(key, { mat: o.material, geos: [] });
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    // merging requires a consistent attribute set
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.uv) {
      const c = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c * 2), 2));
    }
    byMaterial.get(key).geos.push(g);
  });

  const batched = new THREE.Group();
  for (const { mat, geos } of byMaterial.values()) {
    if (!geos.length) continue;
    try {
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (merged) {
        merged.computeVertexNormals();
        batched.add(new THREE.Mesh(merged, mat));
        geos.forEach((g) => g.dispose());
        continue;
      }
    } catch (e) { /* fall through */ }
    // merge failed for this material — keep the parts as-is
    geos.forEach((g) => batched.add(new THREE.Mesh(g, mat)));
  }
  keep.forEach((o) => batched.add(o.clone()));
  return batched;
}

/* ============================================================================
   VIEWER
   ========================================================================== */
export function initVehicleViewer(canvas, kind) {
  let gl = null;
  try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { /* noop */ }
  if (!gl) return { ok: false };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Declared up front: resize() and the visibility observer both read it.
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4
                || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* --- environment map: gives the paint something to reflect ----------
     Built per-renderer on purpose: a PMREM lives in a render target owned by
     the renderer that created it, so it cannot be safely shared across
     contexts. This is a one-off init cost, not a per-frame one. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  /* --- model ------------------------------------------------------------ */
  const raw = kind === 'bike' ? buildBike() : buildCar();
  const model = batchModel(raw);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  /* --- lights ------------------------------------------------------------ */
  scene.add(new THREE.AmbientLight(0x5a7688, 0.7));

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(4, 6, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x5fe6ff, 1.1);
  fill.position.set(-5, 2, 3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x9fe8ff, 1.5);
  rim.position.set(-3, 3, -6);
  scene.add(rim);

  const under = new THREE.PointLight(0x2b98b5, 3, 12);
  under.position.set(0, -1.4, 2);
  scene.add(under);

  /* --- ground: subtle reflective disc + contact shadow ------------------- */
  const shadowTex = makeShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 4),
    new THREE.MeshBasicMaterial({
      map: shadowTex, transparent: true, opacity: 0.6, depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.87;
  scene.add(shadow);

  const grid = new THREE.GridHelper(14, 28, 0x14556a, 0x0d2b36);
  grid.position.y = -0.875;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  scene.add(grid);

  /* --- auto-frame from the bounding box ---------------------------------- */
  const box  = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centreY = box.getCenter(new THREE.Vector3()).y;
  const halfH = 0.5 * Math.hypot(size.x, size.z);
  const halfV = 0.5 * size.y;
  const MARGIN = 1.16;

  /* --- drag to rotate ------------------------------------------------------ */
  let dragging = false, lastX = 0, lastY = 0;
  let spin = kind === 'bike' ? -0.55 : -0.38;
  let tilt = kind === 'bike' ? 0.08 : 0.06;
  let vel = 0, idle = 0;

  const down = (e) => {
    dragging = true; idle = 0;
    lastX = e.clientX ?? 0; lastY = e.clientY ?? 0;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    const dx = (e.clientX ?? 0) - lastX;
    const dy = (e.clientY ?? 0) - lastY;
    spin += dx * 0.008;
    tilt = Math.max(-0.12, Math.min(0.62, tilt + dy * 0.004));
    vel = dx * 0.008;
    lastX = e.clientX ?? 0; lastY = e.clientY ?? 0;
    if (e.cancelable) e.preventDefault();
  };
  const up = (e) => {
    dragging = false;
    canvas.style.cursor = 'grab';
    canvas.releasePointerCapture?.(e?.pointerId);
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  /* --- resize -------------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 300;
    camera.aspect = w / h;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(halfV / Math.tan(vFov / 2), halfH / Math.tan(hFov / 2)) * MARGIN;
    const dir = kind === 'bike'
      ? new THREE.Vector3(0.56, 0.22, 0.80).normalize()
      : new THREE.Vector3(0.50, 0.26, 0.83).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.position.y += centreY * 0.5;
    camera.lookAt(0, centreY, 0);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5));
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* --- render only while visible ---------------------------------------
     On low-power devices we additionally require a decent slice of the canvas
     to be on screen before spinning up, so two models never render at once
     while the user is mid-scroll. */
  let onScreen = false, raf = null;
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting && (!lowPower || e.intersectionRatio > 0.45);
    if (onScreen && raf === null) tick();
  }, { threshold: lowPower ? [0, 0.45, 0.6] : 0.05 });
  io.observe(canvas);

  /* Two lit, environment-mapped scenes side by side is a lot to run every
     frame when the user is only ever looking at one. Full rate while hovered
     or dragged; a slow idle spin otherwise. */
  let hovered = false;
  canvas.addEventListener('pointerenter', () => { hovered = true; });
  canvas.addEventListener('pointerleave', () => { hovered = false; });

  const IDLE_FPS = lowPower ? 12 : 20;
  let acc = 0;

  const clock = new THREE.Clock();
  function tick() {
    if (!onScreen || document.hidden) { raf = null; return; }
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!dragging) {
      idle += dt;
      vel *= 0.94;
      const auto = reduce ? 0 : 0.17 * Math.min(idle, 1);
      spin += vel + auto * dt;
      tilt += ((kind === 'bike' ? 0.08 : 0.06) - tilt) * dt * 0.7;
    }

    // throttle when the user is not interacting with this particular model
    const active = hovered || dragging;
    acc += dt;
    if (!active && acc < 1 / IDLE_FPS) return;
    acc = 0;

    pivot.rotation.y = spin;
    pivot.rotation.x = tilt;
    renderer.render(scene, camera);
  }
  tick();

  return {
    ok: true,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      envRT.dispose();
      renderer.dispose();
    },
  };
}

/** Soft radial blob used as a fake contact shadow. */
function makeShadowTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0,   'rgba(0,0,0,0.75)');
  g.addColorStop(0.45,'rgba(0,0,0,0.35)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}
