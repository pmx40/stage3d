// Modèles 3D : micros, pieds de micro, guitares sur pied, pédalboard, clavier MIDI, carte son, boîtes de direct, multiprises.
// Repère local : origine au centre de la base, +Z = face avant, +Y = haut.
import { THREE, mat, shade, box, rbox, cyl, sph, tor, disc, strut, tube, slab, smooth2, planarUV, canvasTex, scaleUV, texPlane, rr, T } from './gfx.js';

const ALU = { metal: 0.85, rough: 0.28 };
const STEEL = { metal: 0.8, rough: 0.35 };
const CHROME = { metal: 0.9, rough: 0.2 };
const BLK = '#0c0d0f';

const xcyl = (g, r, len, color, x, y, z, o, seg = 12) => { const c = cyl(r, r, len, color, 0, 0, 0, o, seg); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };
const zcyl = (g, r, len, color, x, y, z, o, seg = 12) => { const c = cyl(r, r, len, color, 0, 0, 0, o, seg); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };

/* =================================================================== MICROS */
function micMeshTex() {
  return canvasTex('micmesh', 64, 64, (c, W, H) => {
    c.fillStyle = '#8d939d'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#3d4048'; c.lineWidth = 2;
    for (let i = 0; i < W; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
  }, { repeat: true });
}
const meshM = () => ({ rough: 0.55, metal: 0.6, map: micMeshTex() });
const MIC_OFF = 0.034; // hauteur de la pince sous le micro
export const MIC_LEN = { 0: 0.254, 1: 0.2, 2: 0.29, 3: 0.23 }; // longueur totale pince + micro (m)
export const MIC_NAMES = ['Chant (type SM58)', 'Instrument (type SM57)', 'Condensateur grande membrane', 'Overhead crayon'];

/* micro + pince, axe +Y, origine = point de fixation sur le pied */
export function micModel(kind, clip = true) {
  const m = new THREE.Group();
  const dk = { metal: 0.6, rough: 0.35 }, o = MIC_OFF;
  // pince micro noire
  if (clip) {
    m.add(cyl(0.017, 0.015, 0.036, '#101113', 0, 0, 0, { rough: 0.6 }, 14));
    m.add(tor(0.0225, 0.0045, '#101113', 0, o + 0.045, 0, { rough: 0.6 }, true));
    m.add(box(0.012, 0.05, 0.012, '#101113', -0.021, o + 0.0, 0, { rough: 0.6 }));
  }
  const mesh = (g) => g;
  void mesh;
  const add = (x) => m.add(x);
  add(cyl(0.012, 0.012, 0.024, BLK, 0, o - 0.002, 0, { rough: 0.6 }, 14));
  add(cyl(0.0125, 0.0125, 0.004, '#c9ced6', 0, o - 0.002, 0, ALU, 14));
  if (kind === 0) {
    add(cyl(0.0165, 0.0125, 0.108, '#2b2e36', 0, o + 0.022, 0, dk, 20));
    add(cyl(0.0255, 0.0255, 0.008, '#aab0ba', 0, o + 0.13, 0, ALU, 22));
    const c = cyl(0.0255, 0.0255, 0.02, '#ffffff', 0, o + 0.138, 0, meshM(), 22);
    scaleUV(c.geometry, 6, 1); add(c);
    const s = sph(0.0255, '#ffffff', 0, o + 0.158, 0, meshM(), 22);
    scaleUV(s.geometry, 8, 5); add(s);
  } else if (kind === 1) {
    add(cyl(0.0165, 0.0125, 0.1, '#2b2e36', 0, o + 0.022, 0, dk, 20));
    add(cyl(0.0185, 0.0185, 0.008, '#aab0ba', 0, o + 0.12, 0, ALU, 20));
    const c = cyl(0.0165, 0.0165, 0.034, '#ffffff', 0, o + 0.128, 0, meshM(), 20);
    scaleUV(c.geometry, 5, 1); add(c);
    const t = disc(0.0165, '#ffffff', 0, 0, 0, meshM(), 20);
    t.rotation.x = -Math.PI / 2; t.position.set(0, o + 0.1621, 0); add(t);
  } else if (kind === 2) {
    add(cyl(0.0235, 0.0235, 0.13, '#b9bec7', 0, o + 0.022, 0, CHROME, 24));
    add(cyl(0.0243, 0.0243, 0.01, '#2a2c31', 0, o + 0.08, 0, dk, 24));
    const c = cyl(0.0262, 0.0262, 0.07, '#ffffff', 0, o + 0.152, 0, meshM(), 24);
    scaleUV(c.geometry, 8, 2); add(c);
    const s = sph(0.0262, '#ffffff', 0, o + 0.222, 0, meshM(), 24);
    scaleUV(s.geometry, 8, 4); add(s);
  } else {
    add(cyl(0.0095, 0.0095, 0.11, '#b0b5be', 0, o + 0.022, 0, CHROME, 16));
    const c = cyl(0.0105, 0.0105, 0.03, '#ffffff', 0, o + 0.132, 0, meshM(), 16);
    scaleUV(c.geometry, 4, 1); add(c);
    const n = cyl(0.0075, 0.0105, 0.022, '#ffffff', 0, o + 0.162, 0, meshM(), 16);
    scaleUV(n.geometry, 4, 1); add(n);
  }
  return m;
}
// place un micro (rx : inclinaison autour de X, 0 = vertical) ; renvoie le groupe
function putMic(g, kind, x, y, z, rx) {
  const m = micModel(kind);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  g.add(m);
  m.updateMatrix();
  return m;
}
const micBottom = m => new THREE.Vector3(0, -0.012, 0).applyMatrix4(m.matrix);

/* =================================================================== PIEDS DE MICRO */
const TUBE = { metal: 0.55, rough: 0.4 };
function tripodBase(g, spread, hubY) {
  g.add(cyl(0.032, 0.036, 0.05, '#17181b', 0, hubY - 0.03, 0, TUBE, 14));
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 + 0.6, c = Math.cos(a), s = Math.sin(a);
    g.add(strut([c * 0.02, hubY - 0.01, s * 0.02], [c * spread, 0.016, s * spread], 0.0095, '#17181b', TUBE, 8));
    g.add(cyl(0.015, 0.017, 0.016, '#0b0b0d', c * spread, 0, s * spread, { rough: 0.9 }, 10));
    g.add(strut([0, hubY + 0.12, 0], [c * spread * 0.5, hubY * 0.55, s * spread * 0.5], 0.0035, '#8d939d', { metal: 0.7, rough: 0.35 }, 5));
    g.add(box(0.026, 0.02, 0.026, '#101113', c * 0.04, hubY - 0.034, s * 0.04));
  }
  g.add(cyl(0.02, 0.02, 0.06, '#101113', 0, hubY + 0.1, 0, { rough: 0.7 }, 12)); // manchon de blocage des jambes
}
function roundBase(g) {
  g.add(cyl(0.11, 0.125, 0.02, '#1a1b1e', 0, 0, 0, { rough: 0.5, metal: 0.55 }, 36));
  g.add(cyl(0.07, 0.108, 0.016, '#202226', 0, 0.02, 0, { rough: 0.5, metal: 0.55 }, 36));
  g.add(cyl(0.028, 0.05, 0.05, '#202226', 0, 0.036, 0, { rough: 0.5, metal: 0.55 }, 20));
  g.add(tor(0.121, 0.006, '#0b0b0d', 0, 0.006, 0, { rough: 0.9 }, true));
}
function shaftTelescopic(g, y0, top) {
  const split = y0 + (top - y0) * 0.5;
  g.add(cyl(0.0125, 0.0125, split - y0, '#1c1d20', 0, y0, 0, TUBE, 14));
  g.add(cyl(0.0095, 0.0095, top - split, '#c8cdd5', 0, split, 0, CHROME, 14));
  g.add(cyl(0.021, 0.021, 0.045, '#0d0e10', 0, split - 0.025, 0, { rough: 0.8 }, 14)); // collier de serrage
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(box(0.003, 0.04, 0.003, '#2a2c31', Math.cos(a) * 0.0215, split - 0.0225, Math.sin(a) * 0.0215)); }
  g.add(cyl(0.011, 0.011, 0.014, '#17181b', 0, top - 0.006, 0, { rough: 0.7 }, 10));
}
function standBase(g, o, spread, hubY) {
  if ((o.base | 0) === 1) { roundBase(g); return 0.06; }
  tripodBase(g, spread, hubY);
  return hubY + 0.1;
}
// câble XLR qui descend le long du pied puis fait une boucle au sol
function cableToFloor(g, from, side = 1, loop = 0.45) {
  const x = from.x + side * 0.02;
  g.add(tube([
    [from.x, from.y, from.z], [x, from.y - 0.08, from.z * 0.8], [x, from.y * 0.6, from.z * 0.3], [x, 0.3, 0.012], [x + side * 0.02, 0.008, 0.04],
    [x + side * loop * 0.5, 0.005, loop * 0.5], [x + side * loop * 0.9, 0.005, loop * 0.2], [x + side * loop * 0.6, 0.005, -loop * 0.35], [x + side * 0.25, 0.005, -loop * 0.7],
  ], 0.0036, '#0b0b0d', { rough: 0.85 }, 40, 5));
}
function boomArm(g, top, back, front, rise) {
  g.add(rbox(0.05, 0.055, 0.05, 0.008, '#17181b', 0, top - 0.03, 0, { rough: 0.7 }));
  [-1, 1].forEach(s => xcyl(g, 0.019, 0.012, '#0d0e10', s * 0.035, top - 0.005, 0, { rough: 0.8 }, 10)); // molettes
  g.add(strut([0, top, -back], [0, top + rise, front], 0.0088, '#c8cdd5', CHROME, 10));
  // contrepoids
  const A = new THREE.Vector3(0, top, -back), B = new THREE.Vector3(0, top + rise, front), d = B.clone().sub(A).normalize();
  const p0 = A.clone(), p1 = A.clone().addScaledVector(d, 0.065);
  g.add(strut([p0.x, p0.y, p0.z], [p1.x, p1.y, p1.z], 0.024, '#101113', { rough: 0.7 }, 14));
  const e = B.clone().addScaledVector(d, -0.01);
  g.add(strut([e.x, e.y, e.z], [B.x, B.y, B.z], 0.0115, '#101113', { rough: 0.7 }, 10));
}

export function bMicBoom(g, o) {
  const top = o.h - 0.1, back = o.d * 0.2, front = o.d * 0.5, rise = 0.1;
  const attach = standBase(g, o, Math.min(0.27, o.w * 0.45), 0.15);
  shaftTelescopic(g, attach, top);
  boomArm(g, top, back, front, rise);
  const m = putMic(g, o.mic | 0, 0, top + rise + 0.012, front, -0.8);
  cableToFloor(g, micBottom(m).setX(0), 1);
}
export function bMicStraight(g, o) {
  const len = MIC_LEN[o.mic | 0];
  const top = Math.max(0.3, o.h - len);
  const attach = standBase(g, o, Math.min(0.26, Math.max(0.12, o.h * 0.18)), Math.min(0.15, top * 0.35));
  shaftTelescopic(g, attach, top);
  const m = putMic(g, o.mic | 0, 0, top, 0, 0);
  cableToFloor(g, new THREE.Vector3(0, top + 0.02, 0), 1, 0.35);
  void m;
}
/* petit pied à perche courte pour micro d'ampli ou de caisse claire : la perche part vers +Z et le micro vise l'avant, légèrement vers le bas */
export function bMicShort(g, o) {
  const baseZ = -o.d / 2 + Math.min(0.2, o.w * 0.5) + 0.02;
  const base = new THREE.Group();
  base.position.z = baseZ;
  const top = Math.max(0.2, o.h - 0.04), spread = Math.min(0.2, o.w * 0.5);
  const attach = standBase(base, o, spread, 0.12);
  shaftTelescopic(base, attach, top);
  const tip = o.d / 2 - baseZ - 0.17;
  g.add(base);
  // perche courte
  base.add(rbox(0.045, 0.05, 0.045, 0.008, '#17181b', 0, top - 0.026, 0, { rough: 0.7 }));
  [-1, 1].forEach(s => xcyl(base, 0.017, 0.012, '#0d0e10', s * 0.032, top - 0.004, 0, { rough: 0.8 }, 10));
  base.add(strut([0, top, -0.06], [0, top, tip], 0.0082, '#c8cdd5', CHROME, 10));
  base.add(strut([0, top, -0.06], [0, top, -0.0], 0.02, '#101113', { rough: 0.7 }, 12));
  const m = putMic(base, o.mic | 0, 0, top + 0.004, tip, Math.PI / 2 + 0.32);
  cableToFloor(base, micBottom(m).clone().setX(0), -1, 0.3);
}

/* paire de micros statiques sur barre stéréo, au sommet d'un pied droit : AB (espacés), XY (croisés) ou ORTF (110°, 17 cm) */
export function bMicPair(g, o) {
  const top = Math.max(0.5, o.h - 0.07), layout = o.layout | 0, kind = o.mic | 0;
  const attach = standBase(g, o, Math.min(0.3, Math.max(0.14, o.h * 0.14)), Math.min(0.15, top * 0.3));
  shaftTelescopic(g, attach, top);
  const span = layout === 0 ? Math.min(o.w * 0.9, 0.6) : layout === 2 ? 0.17 : 0.05;
  g.add(rbox(0.05, 0.05, 0.05, 0.008, '#17181b', 0, top - 0.005, 0, { rough: 0.7 }));
  xcyl(g, 0.008, span + 0.08, '#c8cdd5', 0, top + 0.03, 0, CHROME, 10); // barre stéréo
  const yaw = layout === 0 ? 0.06 : layout === 2 ? 0.96 : 0.785; // demi-angle entre les axes
  [-1, 1].forEach(s => {
    const gp = new THREE.Group();
    gp.position.set(s * span / 2, top + 0.04, 0);
    gp.rotation.y = s * yaw; // chaque micro vise vers l'extérieur
    putMic(gp, kind, 0, 0, 0, Math.PI / 2 + 0.22);
    g.add(gp);
    g.add(cyl(0.012, 0.012, 0.03, '#101113', s * span / 2, top + 0.025, 0, { rough: 0.6 }, 10)); // pince sur la barre
  });
  cableToFloor(g, new THREE.Vector3(span / 2, top + 0.03, 0.03), 1, 0.35);
}

/* =================================================================== GUITARES */
const STRAT = [[0, 0], [.07, .005], [.12, .03], [.15, .075], [.155, .12], [.14, .16], [.11, .185], [.105, .215], [.125, .255], [.135, .30], [.12, .34], [.095, .335], [.075, .31], [.045, .295], [-.045, .295], [-.08, .31], [-.105, .34], [-.135, .33], [-.14, .29], [-.125, .25], [-.105, .215], [-.11, .185], [-.14, .16], [-.155, .12], [-.15, .075], [-.12, .03], [-.07, .005]];
const LP = [[0, 0], [.08, .003], [.14, .03], [.165, .08], [.168, .13], [.15, .175], [.125, .2], [.125, .235], [.14, .27], [.13, .31], [.09, .335], [.04, .335], [-.03, .322], [-.07, .29], [-.11, .265], [-.125, .235], [-.125, .2], [-.15, .175], [-.168, .13], [-.165, .08], [-.14, .03], [-.08, .003]];
const ACOU = [[0, 0], [.07, .004], [.14, .03], [.185, .08], [.195, .14], [.18, .2], [.135, .245], [.12, .275], [.135, .31], [.15, .365], [.14, .43], [.1, .485], [.04, .5], [-.04, .5], [-.1, .485], [-.14, .43], [-.15, .365], [-.135, .31], [-.12, .275], [-.135, .245], [-.18, .2], [-.195, .14], [-.185, .08], [-.14, .03], [-.07, .004]];
const scaled = (pts, kx, ky) => pts.map(([x, y]) => [x * kx, y * ky]);

const burstTex = () => canvasTex('burst', 256, 256, (c, W, H) => {
  const g = c.createRadialGradient(W * 0.5, H * 0.46, 8, W * 0.5, H * 0.46, W * 0.62);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#c8c8c8'); g.addColorStop(1, '#5a5a5a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
});
const spruceTex = () => canvasTex('spruce', 128, 128, (c, W, H) => {
  c.fillStyle = '#d9b46e'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(120,80,30,.35)'; c.lineWidth = 1;
  for (let i = 0; i < W; i += 3) { c.beginPath(); c.moveTo(i + (i % 7), 0); c.lineTo(i + (i % 5), H); c.stroke(); }
});
const fretTex = () => canvasTex('fretboard', 96, 1024, (c, W, H) => {
  c.fillStyle = '#34201a'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
  for (let i = 0; i < W; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 1, H); c.stroke(); }
  const Lr = 1 - Math.pow(2, -21 / 12), fy = n => ((1 - Math.pow(2, -n / 12)) / Lr) * H;
  c.fillStyle = '#e9e3cf'; c.fillRect(0, 0, W, 9);
  for (let n = 1; n <= 21; n++) { c.fillStyle = '#d4d7dd'; c.fillRect(0, fy(n) - 2, W, 4); }
  c.fillStyle = '#e6e0c8';
  [3, 5, 7, 9, 15, 17, 19, 12].forEach(n => {
    const ym = (fy(n - 1) + fy(n)) / 2;
    const dots = n === 12 ? [W * 0.3, W * 0.7] : [W / 2];
    dots.forEach(x => { c.beginPath(); c.arc(x, ym, n === 12 ? 6 : 7, 0, 7); c.fill(); });
  });
});

function quad(p0, p1, p2, p3, color, o) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(18).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  const m = new THREE.Mesh(geo, mat(color, o));
  m.receiveShadow = true;
  return m;
}

const GUITARS = {
  strat: { out: STRAT, t: 0.045, bridge: 0.105, scale: 0.648, nStr: 6, neck: '#d9b36e', head: '#d9b36e', tune: 'line', neckW: [0.042, 0.056] },
  lp: { out: LP, t: 0.05, bridge: 0.118, scale: 0.628, nStr: 6, neck: '#4a2a18', head: '#17181b', tune: '33', neckW: [0.043, 0.057] },
  bass: { out: scaled(STRAT, 1.08, 1.12), t: 0.047, bridge: 0.12, scale: 0.864, nStr: 4, neck: '#d9b36e', head: '#d9b36e', tune: 'line', neckW: [0.042, 0.062], headLen: 0.2 },
  acou: { out: ACOU, t: 0.1, bridge: 0.2, scale: 0.645, nStr: 6, neck: '#9a6a3a', head: '#6a4226', tune: '33', neckW: [0.043, 0.058] },
};
/* guitare debout, origine au bas du corps, face (cordes) vers +Z */
export function guitarModel(kind, bodyColor) {
  const G = GUITARS[kind], g = new THREE.Group(), topZ = G.t / 2, ac = kind === 'acou';
  const outline = smooth2(G.out, 96);
  const ymax = Math.max(...G.out.map(p => p[1])), xmax = 0.21;
  const body = slab(outline, G.t, 0.007, ac ? '#ffffff' : bodyColor, ac ? { map: spruceTex(), rough: 0.35, cc: 0.4 } : { map: burstTex(), rough: 0.28, cc: 0.7 });
  planarUV(body, -xmax, 0, xmax * 2, ymax);
  g.add(body);
  const nutY = G.bridge + G.scale, fbLen = G.scale * (1 - Math.pow(2, -21 / 12)), fbEnd = nutY - fbLen;
  const nz = topZ - 0.0105, [wn, wf] = G.neckW;
  // manche : dos puis touche
  const joinY = ymax * (ac ? 0.74 : 0.6);
  g.add(slab([[-wf * 0.5, joinY], [wf * 0.5, joinY], [wn * 0.5, nutY], [-wn * 0.5, nutY]], 0.021, 0.004, G.neck, { rough: 0.45 }).translateZ(nz));
  const wAt = y => wn + (wf - wn) * ((nutY - y) / fbLen);
  g.add(quad([-wn / 2, nutY, topZ + 0.0006], [wn / 2, nutY, topZ + 0.0006], [wAt(fbEnd) / 2, fbEnd, topZ + 0.0006], [-wAt(fbEnd) / 2, fbEnd, topZ + 0.0006], '#ffffff', { map: fretTex(), rough: 0.45 }));
  // sillet + tête
  g.add(box(wn, 0.004, 0.006, '#efe9d6', 0, nutY - 0.002, topZ + 0.002));
  const hl = G.headLen || 0.18, hw = kind === 'lp' ? 0.032 : 0.03;
  const hs = new THREE.Group();
  hs.position.set(0, nutY, nz);
  hs.rotation.x = -0.1;
  hs.add(slab(kind === 'strat' || kind === 'bass'
    ? [[-wn / 2, 0], [wn / 2, 0], [0.022, hl * 0.3], [hw, hl * 0.75], [0.026, hl], [-0.004, hl * 1.02], [-0.03, hl * 0.9], [-hw, hl * 0.7], [-0.022, hl * 0.3]]
    : [[-wn / 2, 0], [wn / 2, 0], [0.024, hl * 0.25], [hw + 0.003, hl * 0.6], [hw, hl * 0.98], [-hw, hl * 0.98], [-hw - 0.003, hl * 0.6], [-0.024, hl * 0.25]], 0.016, 0.003, G.head, { rough: 0.4, cc: 0.4 }));
  const nT = G.nStr;
  for (let i = 0; i < nT; i++) {
    const side = G.tune === 'line' ? -1 : (i < nT / 2 ? -1 : 1);
    const k = G.tune === 'line' ? i : (i % (nT / 2));
    const y = hl * (0.2 + 0.7 * ((k + 0.5) / (G.tune === 'line' ? nT : nT / 2)));
    const x = side * (hw + 0.004);
    xcyl(hs, 0.0035, 0.024, '#c9ced6', x, y, -0.004, ALU, 6);
    hs.add(rbox(0.01, 0.016, 0.007, 0.002, '#e8e6dc', x + side * 0.014, y - 0.008, -0.004, { rough: 0.4, metal: 0.4 }));
  }
  g.add(hs);
  // cordes
  const zb = topZ + (ac ? 0.01 : 0.009), zn = topZ + 0.004;
  for (let i = 0; i < nT; i++) {
    const u = i - (nT - 1) / 2;
    g.add(strut([u * (nT === 4 ? 0.0155 : 0.0108), G.bridge, zb], [u * (nT === 4 ? 0.0092 : 0.0068), nutY, zn], 0.0006 + (nT === 4 ? 0.0004 : 0) , '#d6d9de', { metal: 0.9, rough: 0.25 }, 4));
  }
  // chevalet, micros, boutons
  if (ac) {
    g.add(rbox(0.16, 0.034, 0.012, 0.004, '#2a1a12', 0, G.bridge - 0.017, topZ + 0.004, { rough: 0.5 }));
    g.add(box(0.14, 0.004, 0.004, '#efe9d6', 0, G.bridge, topZ + 0.011));
    const hole = disc(0.05, '#050506', 0, 0.31, topZ + 0.0008, null, 32);
    g.add(hole);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.052, 0.062, 40), mat('#2a1a12', { rough: 0.5 }));
    ring.position.set(0, 0.31, topZ + 0.0012);
    g.add(ring);
    g.add(slab([[0.035, 0.2], [0.14, 0.255], [0.152, 0.285], [0.11, 0.29], [0.04, 0.24]], 0.003, 0.001, '#0d0e10', { rough: 0.3 }).translateZ(topZ + 0.002));
  } else {
    const pg = scaled(outline.map(p => p), 0.86, 0.86).map(([x, y]) => [x, y + 0.05]);
    if (kind !== 'lp') g.add(slab(pg.filter(p => p[1] < ymax * 0.93), 0.004, 0.001, kind === 'bass' ? '#17181b' : '#efece0', { rough: 0.35 }).translateZ(topZ + 0.002));
    const pu = (y, w, h, col) => {
      g.add(rbox(w, h, 0.012, 0.003, col, 0, y - h / 2, topZ + 0.002, { rough: 0.45 }));
      for (let i = 0; i < 6; i++) { const p = cyl(0.0022, 0.0022, 0.004, '#c9ced6', 0, 0, 0, ALU, 6); p.rotation.x = Math.PI / 2; p.position.set((i - 2.5) * 0.0118, y, topZ + 0.0145); g.add(p); }
    };
    if (kind === 'lp') {
      pu(G.bridge + 0.09, 0.075, 0.042, '#c9ced6'); pu(G.bridge + 0.185, 0.075, 0.042, '#c9ced6');
      g.add(box(0.07, 0.012, 0.012, '#c9ced6', 0, G.bridge + 0.015, topZ + 0.002, ALU));
      g.add(box(0.07, 0.012, 0.012, '#c9ced6', 0, G.bridge - 0.075, topZ + 0.002, ALU));
      [[.095, .035], [.125, .06], [.1, .095], [.13, .12]].forEach(([x, y]) => { const k = cyl(0.0115, 0.0115, 0.02, '#17181b', 0, 0, 0, { rough: 0.5 }, 14); k.rotation.x = Math.PI / 2; k.position.set(x, y, topZ + 0.012); g.add(k); });
    } else if (kind === 'bass') {
      pu(G.bridge + 0.17, 0.095, 0.03, '#17181b'); pu(G.bridge + 0.075, 0.08, 0.026, '#17181b');
      g.add(box(0.1, 0.05, 0.012, '#c9ced6', 0, G.bridge - 0.03, topZ + 0.002, ALU));
      [[.07, .065], [.095, .09]].forEach(([x, y]) => { const k = cyl(0.012, 0.012, 0.02, '#17181b', 0, 0, 0, { rough: 0.5 }, 14); k.rotation.x = Math.PI / 2; k.position.set(x, y, topZ + 0.012); g.add(k); });
    } else {
      pu(G.bridge + 0.035, 0.075, 0.018, '#f2efe2'); pu(G.bridge + 0.1, 0.075, 0.018, '#f2efe2'); pu(G.bridge + 0.165, 0.075, 0.018, '#f2efe2');
      g.add(box(0.055, 0.075, 0.006, '#c9ced6', 0, G.bridge - 0.045, topZ + 0.0035, ALU));
      [[.065, .06], [.09, .085], [.112, .11]].forEach(([x, y]) => { const k = cyl(0.011, 0.011, 0.018, '#efece0', 0, 0, 0, { rough: 0.45 }, 14); k.rotation.x = Math.PI / 2; k.position.set(x, y, topZ + 0.012); g.add(k); });
    }
  }
  return g;
}
function guitarStand(g) {
  const poleZ = -0.02;
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 + Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    g.add(strut([0, 0.14, poleZ], [c * 0.27, 0.016, poleZ + s * 0.27], 0.0095, '#17181b', TUBE, 8));
    g.add(cyl(0.017, 0.02, 0.016, '#0b0b0d', c * 0.27, 0, poleZ + s * 0.27, { rough: 0.9 }, 10));
  }
  g.add(cyl(0.03, 0.036, 0.05, '#101113', 0, 0.115, poleZ, TUBE, 14));
  g.add(cyl(0.0115, 0.0115, 0.6, '#1c1d20', 0, 0.14, poleZ, TUBE, 12));
  g.add(cyl(0.019, 0.019, 0.04, '#0d0e10', 0, 0.45, poleZ, { rough: 0.8 }, 12));
  // berceau en U (mousse noire)
  const foam = { rough: 0.95 };
  g.add(strut([-0.06, 0.2, 0.1], [0.06, 0.2, 0.1], 0.018, '#0d0e10', foam, 10));
  [-1, 1].forEach(s => g.add(strut([s * 0.06, 0.2, 0.1], [s * 0.02, 0.2, poleZ], 0.016, '#0d0e10', foam, 10)));
  g.add(box(0.05, 0.02, 0.03, '#101113', 0, 0.19, poleZ + 0.015));
  // appui de manche
  [-1, 1].forEach(s => g.add(strut([s * 0.05, 0.725, 0.02], [s * 0.012, 0.715, poleZ], 0.0125, '#0d0e10', foam, 10)));
  g.add(sph(0.012, '#0d0e10', 0, 0.725, poleZ, foam, 8));
}
export function bGuitarStand(g, o) {
  guitarStand(g);
  const k = ['strat', 'lp', 'bass', 'acou'][o.inst | 0];
  if (!k) return;
  const gt = guitarModel(k, o.color);
  gt.position.set(0, 0.215, 0.09);
  gt.rotation.x = -0.17;
  g.add(gt);
}

/* =================================================================== PEDALBOARD */
const PEDAL_COL = ['#2f5fb8', '#3da35d', '#e08a1e', '#7a3fa6', '#3ec1d3', '#b9bec7', '#c5303a', '#e0c21e', '#d9d9d2', '#27a39a'];
function pedal(g, x, y, z, w, d, hh, col, i) {
  g.add(rbox(w, hh, d, 0.006, col, x, y, z, { rough: 0.45, metal: 0.2 }));
  g.add(box(w * 0.82, 0.0012, d * 0.34, shade(col, 0.82), x, y + hh, z + d * 0.28, { rough: 0.5 }));
  g.add(cyl(0.0115, 0.0115, 0.016, '#c9ced6', x, y + hh, z - d * 0.26, ALU, 14));
  g.add(cyl(0.014, 0.014, 0.004, '#101113', x, y + hh, z - d * 0.26, { rough: 0.7 }, 14));
  const nk = i % 3 === 0 ? 2 : 3;
  for (let k = 0; k < nk; k++) {
    const kx = x + (k - (nk - 1) / 2) * w * 0.3;
    g.add(cyl(0.0085, 0.0085, 0.013, '#0d0e10', kx, y + hh, z + d * 0.28, { rough: 0.6 }, 12));
    g.add(box(0.0016, 0.0016, 0.007, '#e9ecf1', kx, y + hh + 0.013, z + d * 0.28 + 0.003));
  }
  g.add(sph(0.0036, i % 2 ? '#ff3b30' : '#58e06b', x, y + hh, z + d * 0.02, { emissive: i % 2 ? '#ff3b30' : '#58e06b', ei: 1.4 }, 8));
  [-1, 1].forEach(s => xcyl(g, 0.0055, 0.01, '#c9ced6', x + s * (w / 2 + 0.003), y + hh * 0.55, z + d * 0.3, ALU, 8));
}
export function bPedalboard(g, o) {
  const { w, d } = o, plateY = 0.012, plate = 0.028, top = plateY + plate;
  g.add(rbox(w, plate, d, 0.006, '#1f2126', 0, plateY, 0, { rough: 0.7 }));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(cyl(0.012, 0.014, plateY, '#0b0b0d', sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03), { rough: 0.9 }, 8))));
  [-1, 1].forEach(s => xcyl(g, 0.007, w - 0.02, '#9aa1ad', 0, top + 0.004, s * (d / 2 - 0.012), ALU, 8));
  const pw = 0.073, pd = 0.129, ph = 0.058, riser = 0.038, rd = Math.min(d * 0.45, pd + 0.01);
  const n1 = Math.max(1, Math.floor((w - 0.04) / (pw + 0.005))), x1 = -((n1 - 1) * (pw + 0.005)) / 2;
  const z1 = -d / 2 + 0.012 + pd / 2;
  for (let i = 0; i < n1; i++) pedal(g, x1 + i * (pw + 0.005), top, z1, pw, pd, ph, PEDAL_COL[i % PEDAL_COL.length], i);
  for (let i = 0; i < n1 - 1; i++) {
    const xa = x1 + i * (pw + 0.005) + pw / 2 + 0.003, xb = x1 + (i + 1) * (pw + 0.005) - pw / 2 - 0.003, y = top + ph * 0.55, z = z1 + pd * 0.3;
    g.add(tube([[xa, y, z], [xa + 0.012, y, z + 0.02], [xb - 0.012, y, z + 0.02], [xb, y, z]], 0.0026, ['#c5303a', '#f2c200', '#2f6fd8'][i % 3], { rough: 0.7 }, 12, 5));
  }
  if (d > 0.28) {
    g.add(rbox(w - 0.03, riser, rd, 0.004, '#2a2d33', 0, top, d / 2 - rd / 2 - 0.012, { rough: 0.7 }));
    const n2 = Math.max(1, Math.floor((w - 0.04) / (0.064 + 0.005))), x2 = -((n2 - 1) * 0.069) / 2, z2 = d / 2 - 0.012 - rd / 2;
    for (let i = 0; i < n2; i++) pedal(g, x2 + i * 0.069, top + riser, z2, 0.064, Math.min(0.11, rd - 0.006), 0.05, PEDAL_COL[(i + 4) % PEDAL_COL.length], i + 1);
  }
  // cordon d'alimentation et jack d'entrée
  g.add(tube([[x1 + (n1 - 1) * (pw + 0.005) / 2 + pw / 2, top + ph * 0.55, z1 + pd * 0.3], [w / 2 - 0.01, top + 0.03, z1 + 0.05], [w / 2 + 0.015, top + 0.02, z1 + 0.08]], 0.0032, '#0b0b0d', { rough: 0.8 }, 12, 5));
}

/* =================================================================== CLAVIER MIDI */
const midiKeysTex = nW => canvasTex('midikeys|' + nW, nW * 24, 240, (c, W, H) => {
  c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#9a9a94'; c.lineWidth = 2;
  for (let i = 0; i <= nW; i++) { c.beginPath(); c.moveTo(i * 24, 0); c.lineTo(i * 24, H); c.stroke(); }
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(0.1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
});
export function bMidiKb(g, o) {
  const { w, d, h } = o, big = (o.keys | 0) !== 25, nW = big ? 29 : 15;
  const bodyH = Math.max(0.02, h - 0.026), margin = big ? 0.02 : 0.012;
  g.add(rbox(w, bodyH, d, 0.008, '#1b1d22', 0, 0, 0, { rough: 0.5 }));
  const kw = (w - 2 * margin) / nW, kd = d * 0.56, zc = d / 2 - kd / 2 - 0.008, kx = nW * kw;
  g.add(box(kx, 0.012, kd, '#f2f2ee', 0, bodyH, zc, { rough: 0.35 }));
  const kt = texPlane(kx, kd, midiKeysTex(nW), 0, 0, 0, { rough: 0.35 });
  kt.rotation.x = -Math.PI / 2; kt.position.set(0, bodyH + 0.0124, zc);
  g.add(kt);
  for (let i = 0; i < nW - 1; i++) {
    if (![0, 1, 3, 4, 5].includes(i % 7)) continue;
    g.add(box(kw * 0.58, 0.014, kd * 0.62, '#0d0e10', -kx / 2 + (i + 1) * kw, bodyH + 0.0, zc - kd * 0.19, { rough: 0.35 }));
  }
  // zone de commandes
  const zb = -d / 2 + (d - kd - 0.02) / 2 + 0.004, db = d - kd - 0.024;
  const nPad = big ? 8 : 8, ps = Math.min(0.03, db * 0.44);
  const px0 = big ? w / 2 - margin - 2 * ps * 2.1 - 0.01 : -w / 2 + margin + 0.012;
  for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) g.add(rbox(ps, 0.008, ps, 0.003, ['#e5484d', '#3b82f6', '#f2b800', '#58e06b'][q], px0 + q * ps * 1.12, bodyH, zb + (r - 0.5) * ps * 1.12, { rough: 0.5, emissive: ['#e5484d', '#3b82f6', '#f2b800', '#58e06b'][q], ei: 0.35 }));
  void nPad;
  const nk = big ? 8 : 4, kx0 = big ? -w / 2 + margin + 0.1 : w / 2 - margin - 0.04 - (nk - 1) * 0.03;
  for (let i = 0; i < nk; i++) {
    g.add(cyl(0.0095, 0.0095, 0.012, '#0d0e10', kx0 + i * (big ? 0.036 : 0.03), bodyH, zb, { rough: 0.6 }, 12));
    g.add(box(0.0018, 0.0018, 0.008, '#e9ecf1', kx0 + i * (big ? 0.036 : 0.03), bodyH + 0.012, zb - 0.003));
  }
  if (big) {
    g.add(rbox(0.07, 0.004, 0.03, 0.002, '#050607', -w / 2 + margin + 0.035, bodyH, zb + 0.005, { rough: 0.2 }));
    g.add(box(0.058, 0.0008, 0.018, '#58e0ff', -w / 2 + margin + 0.035, bodyH + 0.004, zb + 0.005, { emissive: '#58e0ff', ei: 0.9 }));
  }
  [0, 1].forEach(i => g.add(rbox(0.014, 0.012, 0.03, 0.004, '#101113', -w / 2 + 0.004 + i * 0.016, bodyH, zc + kd * 0.3, { rough: 0.7 })));
}

/* =================================================================== CARTE SON */
const aifTex = n => canvasTex('aif|' + n, 1024, 128, (c, W, H) => {
  c.fillStyle = '#26282d'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#d7dbe2'; c.font = '700 13px "Segoe UI", Arial'; c.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const x = 60 + (i * (W - 330)) / Math.max(1, n - 1 || 1);
    c.fillStyle = '#050506'; c.beginPath(); c.arc(x, 62, 27, 0, 7); c.fill();
    c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(x, 62, 11, 0, 7); c.fill();
    c.fillStyle = '#0b0b0d'; c.fillRect(x - 3, 54, 6, 3); c.fillRect(x - 3, 66, 6, 3);
    c.strokeStyle = '#9aa1ad'; c.lineWidth = 3; c.beginPath(); c.arc(x, 62, 33, 0, 7); c.stroke();
    c.fillStyle = '#58e06b'; c.fillRect(x - 12, 112, 24, 5);
    c.fillStyle = '#d7dbe2'; c.fillText(String(i + 1), x - 4, 20);
  }
  c.fillStyle = '#050506'; c.fillRect(W - 250, 28, 120, 60);
  c.fillStyle = '#58e0ff'; c.font = '700 28px Arial'; c.fillText('48 kHz', W - 238, 58);
  for (let i = 0; i < 3; i++) { c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(W - 90 + i * 30, 62, 11, 0, 7); c.fill(); }
});
export function bAudioIf(g, o) {
  if (o.type === 'audio_if8') {
    g.add(rbox(o.w, o.h, o.d, 0.004, '#2a2c31', 0, 0, 0, { metal: 0.3, rough: 0.5 }));
    g.add(texPlane(o.w - 0.034, o.h - 0.008, aifTex(8), 0, o.h / 2, o.d / 2 + 0.0012, { rough: 0.45 }));
    [-1, 1].forEach(s => { g.add(rbox(0.017, o.h, 0.004, 0.001, '#b9bec7', s * (o.w / 2 - 0.0085), 0, o.d / 2 + 0.002, ALU)); g.add(cyl(0.003, 0.003, 0.003, '#101113', s * (o.w / 2 - 0.0085), o.h / 2, o.d / 2 + 0.005, null, 8).rotateX(Math.PI / 2)); });
    for (let i = 0; i < 8; i++) zcyl(g, 0.0075, 0.006, '#c9ced6', -o.w * 0.4 + (o.w * 0.8 * i) / 7, o.h * 0.5, -o.d / 2 - 0.003, ALU, 12);
    return;
  }
  g.add(rbox(o.w, o.h, o.d, 0.009, o.color, 0, 0, 0, { rough: 0.35, metal: 0.25 }));
  g.add(box(o.w * 0.92, 0.0014, o.d * 0.7, '#17181b', 0, o.h, -o.d * 0.04, { rough: 0.5 }));
  [-1, 1].forEach(s => {
    const x = s * o.w * 0.2;
    g.add(cyl(0.0155, 0.0155, 0.014, '#0d0e10', x, o.h, -o.d * 0.05, { rough: 0.55 }, 20));
    g.add(tor(0.0185, 0.0013, '#58e06b', x, o.h + 0.001, -o.d * 0.05, { emissive: '#58e06b', ei: 1.2 }, true));
    g.add(box(0.002, 0.0015, 0.011, '#e9ecf1', x, o.h + 0.014, -o.d * 0.05 - 0.004));
    zcyl(g, 0.0085, 0.01, '#050506', x, o.h * 0.5, o.d / 2 + 0.001, null, 14);
    zcyl(g, 0.0092, 0.003, '#c9ced6', x, o.h * 0.5, o.d / 2 + 0.002, ALU, 14);
  });
  g.add(cyl(0.011, 0.011, 0.012, '#0d0e10', 0, o.h, o.d * 0.28, { rough: 0.55 }, 16));
  g.add(sph(0.0035, '#ff3b30', o.w * 0.4, o.h + 0.001, o.d * 0.3, { emissive: '#ff3b30', ei: 1.5 }, 8));
  zcyl(g, 0.0045, 0.004, '#c9ced6', 0, o.h * 0.3, o.d / 2 + 0.001, ALU, 8);
  g.add(box(0.012, 0.007, 0.006, '#17181b', o.w * 0.3, o.h * 0.5, -o.d / 2 - 0.002)); // USB
}

/* =================================================================== BOÎTES DE DIRECT */
export function bDI(g, o) {
  const active = o.type === 'di_active', stereo = o.type === 'di_stereo';
  const col = o.color, w = o.w, d = o.d, h = o.h;
  g.add(rbox(w, h, d, 0.0055, col, 0, 0, 0, { rough: active ? 0.4 : 0.5, metal: active ? 0.55 : 0.3 }));
  g.add(rbox(w * 0.86, 0.0016, d * 0.5, 0.001, active ? '#c9ced6' : '#e9ecf1', 0, h, -d * 0.1, { rough: 0.5 }));
  const nCh = stereo ? 2 : 1;
  for (let c = 0; c < nCh; c++) {
    const cx = stereo ? (c - 0.5) * w * 0.46 : 0;
    // sortie XLR (avant)
    zcyl(g, 0.0125, 0.012, '#050506', cx, h * 0.5, d / 2 + 0.0005, null, 16);
    zcyl(g, 0.0135, 0.004, '#c9ced6', cx, h * 0.5, d / 2 + 0.002, ALU, 16);
    // entrée et sortie Jack (arrière)
    [-0.28, 0.28].forEach(k => {
      zcyl(g, 0.0062, 0.016, '#c9ced6', cx + k * (stereo ? w * 0.38 : w), h * 0.5, -d / 2 - 0.007, ALU, 10);
      zcyl(g, 0.0042, 0.018, '#050506', cx + k * (stereo ? w * 0.38 : w), h * 0.5, -d / 2 - 0.0075, null, 8);
    });
    // inverseurs pad / ground lift
    g.add(box(0.012, 0.004, 0.007, '#101113', cx - w * (stereo ? 0.1 : 0.2), h, d * 0.2));
    g.add(box(0.012, 0.004, 0.007, '#101113', cx + w * (stereo ? 0.1 : 0.2), h, d * 0.2));
  }
  if (active) g.add(sph(0.0035, '#58e06b', w * 0.32, h + 0.0015, -d * 0.3, { emissive: '#58e06b', ei: 1.6 }, 8));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.006, 0.007, 0.003, '#0b0b0d', sx * (w / 2 - 0.012), -0.0005, sz * (d / 2 - 0.012), null, 8)));
}

/* =================================================================== MULTIPRISES */
export function bPowerStrip(g, o) {
  const n = o.sockets || 6, cab = Math.min(0.13, o.w * 0.3), L = o.w - cab, x0 = -o.w / 2;
  g.add(rbox(L, o.h, o.d, 0.006, o.color, x0 + L / 2, 0, 0, { rough: 0.6 }));
  const sp = Math.min(0.062, (L - 0.1) / Math.max(1, n - 1)), sx0 = x0 + 0.045;
  for (let i = 0; i < n; i++) {
    const x = sx0 + i * sp;
    g.add(cyl(0.0185, 0.0185, 0.004, '#e9ecf1', x, o.h, 0, { rough: 0.45 }, 20));
    [-1, 1].forEach(s => g.add(cyl(0.0024, 0.0024, 0.0012, '#050506', x + s * 0.0085, o.h + 0.004, 0, null, 6)));
    g.add(cyl(0.0026, 0.0026, 0.0014, '#c9ced6', x, o.h + 0.004, 0.0125, ALU, 6));
  }
  g.add(rbox(0.026, 0.007, 0.016, 0.002, '#c5303a', x0 + L - 0.028, o.h, 0, { rough: 0.4, emissive: '#c5303a', ei: 0.5 }));
  const y = o.h * 0.5, xe = x0 + L;
  g.add(tube([[xe, y, 0], [xe + cab * 0.35, y, 0.01], [xe + cab * 0.7, 0.008, 0.035], [xe + cab, 0.008, 0.02]], 0.0042, '#0b0b0d', { rough: 0.85 }, 12, 6));
  g.add(rbox(0.032, 0.022, 0.036, 0.004, '#0b0b0d', xe + cab - 0.006, 0, 0.02, { rough: 0.7 }));
}
