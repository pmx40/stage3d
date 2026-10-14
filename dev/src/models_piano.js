// Modèles 3D : piano à queue (3 tailles, couvercle ouvert ou fermé) et banquette de piano.
// Repère local : origine au centre de l'emprise, +Z = côté clavier (là où s'assoit le pianiste), basses à gauche (-X).
import { THREE, mat, shade, box, rbox, cyl, strut, prism, texPlane, canvasTex } from './gfx.js';
import { whiteKeysTex } from './models_gear.js';

const BRASS = { metal: 0.85, rough: 0.3 };
const BASE_Y = 0.7; // dessous du caisson
const RIM_TOP = 0.95; // dessus du caisson
const KEY_BED = 0.665; // dessous du sabot de clavier
const gloss = { rough: 0.16, cc: 1 };

/* ---------- contour vu de dessus : queue arrondie, flanc droit courbe, dos (basses) rectiligne ---------- */
function outline(W, D, zf) {
  const L = zf + D / 2;
  const X = u => (u * W) / 2, Z = v => -D / 2 + v * L;
  const ctrl = [[1, 0.8], [0.99, 0.64], [0.91, 0.45], [0.74, 0.26], [0.47, 0.11], [0.16, 0.03], [-0.2, 0], [-0.55, 0], [-0.85, 0.012], [-0.97, 0.05], [-1, 0.13]];
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([u, v]) => new THREE.Vector3(X(u), 0, Z(v))), false, 'centripetal');
  return [[-W / 2, zf], [W / 2, zf], ...curve.getPoints(56).map(p => [p.x, p.z])];
}
// contour décalé vers l'intérieur de d mètres
function inset(pts, d) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % n]; area += x1 * z2 - x2 * z1; }
  const s = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    return [p[0] + s * -tz * d, p[1] + s * tx * d];
  });
}
const pathOf = (P, pts) => { pts.forEach(([x, z], i) => (i ? P.lineTo(x, -z) : P.moveTo(x, -z))); return P; };
// anneau (caisson creux) : contour extérieur percé du contour intérieur, extrudé en hauteur
function ring(outer, inner, y0, hgt, color, o) {
  const sh = pathOf(new THREE.Shape(), outer);
  sh.holes.push(pathOf(new THREE.Path(), inner));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: hgt, bevelEnabled: false, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color, o));
  m.position.y = y0; m.castShadow = true; m.receiveShadow = true;
  return m;
}
// plaque plate horizontale texturée (table d'harmonie, cadre en fonte) : UV planaires sur l'emprise du contour
function plate(pts, y, color, o, tex) {
  const geo = new THREE.ShapeGeometry(pathOf(new THREE.Shape(), pts), 1);
  geo.rotateX(-Math.PI / 2);
  if (tex) {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / (x1 - x0), (p.getZ(i) - z0) / (z1 - z0));
  }
  const m = new THREE.Mesh(geo, mat(color, tex ? { ...o, map: tex, po: true } : o));
  m.position.y = y; m.receiveShadow = true;
  return m;
}
const stringsTex = () => canvasTex('piano_strings', 512, 1024, (c, W, H) => {
  c.fillStyle = '#a8842f'; c.fillRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(0,0,0,.3)'); g.addColorStop(0.45, 'rgba(255,238,180,.18)'); g.addColorStop(1, 'rgba(0,0,0,.34)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(40,28,8,.55)'; c.lineWidth = 6;
  [0.3, 0.62].forEach(v => { c.beginPath(); c.moveTo(W * 0.04, H * v); c.lineTo(W * 0.96, H * (v - 0.14)); c.stroke(); }); // chevalets
  c.strokeStyle = 'rgba(236,236,228,.85)'; c.lineWidth = 1.3;
  for (let i = 0; i < 96; i++) {
    const u = (i + 0.5) / 96;
    c.beginPath(); c.moveTo(W * (0.1 + 0.8 * u), H * 0.97); c.lineTo(W * (0.03 + 0.94 * u), H * 0.05); c.stroke();
  }
});
const soundboardTex = () => canvasTex('piano_board', 256, 256, (c, W, H) => {
  c.fillStyle = '#8a5d36'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(60,35,15,.35)'; c.lineWidth = 1;
  for (let i = 0; i < W; i += 5) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 2, H); c.stroke(); }
}, { repeat: true });

export function bGrandPiano(g, o) {
  const W = o.w, D = o.d, kb = 0.17, zf = D / 2 - kb, col = o.color || '#0d0e11';
  const open = (o.lid | 0) === 0 ? 40 : (o.lid | 0) === 1 ? 14 : 0; // 0 = grande ouverture, 1 = petit bâton, 2 = fermé
  const out = outline(W, D, zf);
  /* caisson creux + fond */
  g.add(ring(out, inset(out, 0.028), BASE_Y + 0.005, RIM_TOP - BASE_Y - 0.005, col, gloss));
  g.add(prism(inset(out, 0.002), 0.012, 0, col, gloss).translateY(BASE_Y));
  g.add(plate(inset(out, 0.03), 0.84, '#ffffff', { rough: 0.55 }, soundboardTex()));
  g.add(plate(inset(out, 0.1), 0.843, '#ffffff', { rough: 0.35, metal: 0.55 }, stringsTex()));
  /* clavier : sabot noir, touches blanches (texture), touches noires, joues (cheek blocks) */
  const kx = Math.min(1.225, W * 0.84), nW = 52, kw = kx / nW, kd = kb - 0.015, kz = zf + kd / 2;
  g.add(box(kx + 0.02, BASE_Y - KEY_BED - 0.015 + 0.04, kb, col, 0, KEY_BED, D / 2 - kb / 2, gloss));
  g.add(box(kx, 0.022, kd, '#f2f2ee', 0, 0.715, kz, { rough: 0.35 }));
  const kt = texPlane(kx, kd, whiteKeysTex(), 0, 0, 0, { rough: 0.35 });
  kt.rotation.x = -Math.PI / 2; kt.position.set(0, 0.7375, kz);
  g.add(kt);
  for (let i = 0; i < nW - 1; i++) {
    const m = (i + 5) % 7;
    if (m === 2 || m === 6) continue;
    g.add(box(kw * 0.6, 0.016, kd * 0.62, '#0d0e10', -kx / 2 + (i + 1) * kw, 0.731, kz - kd * 0.19, { rough: 0.35 }));
  }
  const cw = (W - kx) / 2 - 0.01;
  [-1, 1].forEach(s => g.add(rbox(cw, RIM_TOP - 0.68, kb, 0.008, col, s * (W / 2 - cw / 2), 0.68, D / 2 - kb / 2, gloss)));
  g.add(box(kx + 0.02, 0.012, 0.012, col, 0, 0.74, zf + 0.006, gloss)); // tringle de fond de clavier (sous le tablier)
  /* pieds, roulettes, lyre et pédales */
  const leg = (x, z) => {
    g.add(cyl(0.05, 0.03, BASE_Y - 0.06, col, x, 0.06, z, gloss, 10));
    g.add(cyl(0.036, 0.034, 0.03, '#c9a24a', x, 0.045, z, BRASS, 14));
    const w = cyl(0.026, 0.026, 0.022, '#17181b', 0, 0, 0, { rough: 0.7 }, 12);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.026, z);
    g.add(w);
  };
  leg(-W / 2 + 0.1, zf - 0.09);
  leg(W / 2 - 0.1, zf - 0.09);
  leg(-W * 0.12, -D / 2 + 0.28);
  [-1, 1].forEach(s => g.add(cyl(0.017, 0.017, BASE_Y - 0.13, col, s * 0.085, 0.13, zf - 0.04, gloss, 10)));
  g.add(rbox(0.26, 0.1, 0.2, 0.012, col, 0, 0.05, zf - 0.04, gloss));
  [-1, 0, 1].forEach(s => g.add(rbox(0.05, 0.012, 0.17, 0.005, '#c9a24a', s * 0.075, 0.032, zf + 0.075, BRASS)));
  /* couvercle et pupitre */
  if (open === 0) {
    g.add(prism(inset(out, 0.001), 0.035, 0.012, col, gloss).translateY(RIM_TOP));
    return;
  }
  const th = (open * Math.PI) / 180;
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, RIM_TOP + 0.004, 0);
  hinge.rotation.z = th;
  hinge.add(prism(out.map(([x, z]) => [x + W / 2, z]), 0.035, 0.012, col, gloss));
  g.add(hinge);
  // béquille entre le flanc droit du caisson et le dessous du couvercle
  const right = out.slice(2).filter(p => p[0] > 0 && Math.abs(p[1] - (-D / 2 + 0.62 * (zf + D / 2))) < 0.06).sort((a, b) => b[0] - a[0])[0] || [W / 2, 0];
  const A = [right[0] - 0.03, RIM_TOP, right[1]];
  const uB = Math.min((A[0] - 0.3 + W / 2) / Math.cos(th), (right[0] + W / 2) * 0.92); // abscisse le long du couvercle
  const B = [-W / 2 + uB * Math.cos(th), RIM_TOP + 0.004 + uB * Math.sin(th) - 0.002, right[1]];
  g.add(strut(A, B, 0.011, '#b79a52', BRASS, 8));
  // pupitre
  const mp = new THREE.Group();
  mp.position.set(0, RIM_TOP, zf - 0.06);
  mp.rotation.x = -0.32;
  mp.add(rbox(0.72, 0.26, 0.012, 0.004, col, 0, 0.0, 0, gloss));
  mp.add(box(0.72, 0.014, 0.05, col, 0, 0.0, 0.02, gloss));
  g.add(mp);
}

/* ---------- banquette de piano : assise rembourrée, pieds fuselés ; version réglable à vis ---------- */
export function bPianoBench(g, o) {
  const { w, d, h } = o, wood = '#0d0e11', skin = o.color || '#17181b';
  const seatH = Math.min(0.085, h * 0.2);
  if ((o.opt | 0) === 1) {
    // banquette réglable : deux supports en T avec colonnes à vis
    [-1, 1].forEach(s => {
      const x = s * (w / 2 - 0.07);
      g.add(box(0.05, 0.03, d - 0.02, wood, x, 0, 0, gloss));
      [-1, 1].forEach(t => {
        g.add(cyl(0.02, 0.02, h - seatH - 0.03, '#c9ced6', x, 0.03, t * (d / 2 - 0.07), { metal: 0.85, rough: 0.25 }, 12));
        g.add(cyl(0.028, 0.028, 0.03, '#17181b', x, 0.13, t * (d / 2 - 0.07), { rough: 0.6 }, 12));
      });
    });
    g.add(rbox(w - 0.02, 0.025, d - 0.03, 0.006, wood, 0, h - seatH - 0.025, 0, gloss));
  } else {
    const lh = h - seatH - 0.05;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.026, 0.016, lh, wood, sx * (w / 2 - 0.045), 0, sz * (d / 2 - 0.045), gloss, 10)));
    [-1, 1].forEach(sz => g.add(box(w - 0.1, 0.035, 0.022, wood, 0, h - seatH - 0.085, sz * (d / 2 - 0.045), gloss)));
    [-1, 1].forEach(sx => g.add(box(0.022, 0.035, d - 0.1, wood, sx * (w / 2 - 0.045), h - seatH - 0.085, 0, gloss)));
    g.add(rbox(w - 0.03, 0.05, d - 0.03, 0.01, wood, 0, h - seatH - 0.05, 0, gloss));
  }
  g.add(rbox(w, seatH, d, Math.min(0.03, seatH * 0.45), skin, 0, h - seatH, 0, { rough: 0.55 }));
  g.add(box(w * 0.9, 0.003, 0.003, shade(skin, 0.5), 0, h - seatH * 0.55, d / 2 + 0.0005)); // couture
}
