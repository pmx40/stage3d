// Modèles 3D : consoles, régie, racks, flight-cases, passages de câbles, tente, tabourets, ordinateur.
import { THREE, mat, shade, box, rbox, cyl, sph, tor, plane, disc, strut, profile, slopePlane, texPlane, canvasTex, rr, T, stencilTex, ribTex, scaleUV } from './gfx.js';
import { cl3Tex, x32Tex, q20Tex, rioTex, rackFrontTex, laptopKeysTex, laptopScreenTex } from './textures.js';

const BLK = '#0c0d0f';
const ALU = { metal: 0.85, rough: 0.28 };

/* ---------- châssis de console : coin incliné + surface texturée ---------- */
function consoleShell(g, W, D, hF, hR, tex, o = {}) {
  const prof = [[-D / 2, 0], [D / 2, 0], [D / 2, hF], [-D / 2, hR]];
  g.add(profile(prof, W - 0.02, o.body || '#1f2126', { rough: 0.5 }));
  [-1, 1].forEach(s => g.add(profile(prof, 0.01, o.cheek || '#0f1012', { rough: 0.4, metal: 0.25 }).translateX(s * (W / 2 - 0.005))));
  g.add(slopePlane(W - 0.02, [D / 2, hF], [-D / 2, hR], mat('#ffffff', { map: tex, rough: 0.4, cc: 0.25 }), null, 0.0009));
  // lèvre avant caoutchoutée
  g.add(box(W - 0.02, 0.012, 0.012, '#08090a', 0, hF - 0.004, D / 2 - 0.004, { rough: 0.9 }));
  // face arrière : connectique
  g.add(rbox(W * 0.62, hR * 0.5, 0.01, 0.003, '#17181b', 0, hR * 0.12, -D / 2 - 0.004));
  for (let i = 0; i < 10; i++) g.add(cyl(0.0105, 0.0105, 0.006, '#b8bec8', -W * 0.26 + (W * 0.52 * i) / 9, hR * 0.38, -D / 2 - 0.01, ALU, 12).rotateX(Math.PI / 2));
  for (let i = 0; i < 10; i++) g.add(cyl(0.0085, 0.0085, 0.006, '#050506', -W * 0.26 + (W * 0.52 * i) / 9, hR * 0.38, -D / 2 - 0.012, null, 10).rotateX(Math.PI / 2));
  g.add(box(W * 0.16, hR * 0.28, 0.006, '#26282c', W * 0.18, hR * 0.12, -D / 2 - 0.01));
  // pieds
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.02, 0.022, 0.01, '#050506', sx * (W / 2 - 0.05), -0.004, sz * (D / 2 - 0.05), { rough: 0.9 }, 10)));
}
export function bCL3(g, o) { consoleShell(g, o.w, o.d, o.h * 0.318, o.h, cl3Tex(), { body: '#202226' }); }
export function bX32(g, o) { consoleShell(g, o.w, o.d, o.h * 0.4, o.h, x32Tex(), { body: '#25272c' }); }
export function bQ20(g, o) { consoleShell(g, o.w, o.d, o.h * 0.33, o.h, q20Tex(), { body: '#17181b', cheek: '#2a2d33' }); }

/* ---------- stagebox Rio3224-D2 (480 × 220 × 368 mm) ---------- */
export function bRio(g, o) {
  g.add(rbox(o.w, o.h, o.d, 0.006, '#2a2d33', 0, 0, 0, { rough: 0.5, metal: 0.3 }));
  g.add(texPlane(o.w - 0.0005, o.h - 0.0005, rioTex(), 0, o.h / 2, o.d / 2 + 0.0012, { rough: 0.45 }));
  [-1, 1].forEach(s => {
    g.add(rbox(0.012, 0.03, 0.12, 0.004, BLK, s * (o.w / 2 + 0.002), o.h * 0.5 - 0.015, 0));
    g.add(tor(0.034, 0.006, '#c3c8d0', s * (o.w / 2 + 0.008), o.h * 0.5, 0, ALU, false));
  });
  for (let i = 0; i < 14; i++) g.add(box(o.w * 0.8, 0.004, 0.008, '#0c0d0f', 0, o.h + 0.0, -o.d * 0.4 + i * 0.012));
  for (let i = 0; i < 6; i++) g.add(cyl(0.011, 0.011, 0.006, '#c3c8d0', -o.w * 0.3 + i * 0.045, o.h * 0.5, -o.d / 2 - 0.004, ALU, 12).rotateX(Math.PI / 2));
}

/* ---------- table de régie avec jupe noire ---------- */
export function clothTable(g, w, d, hh) {
  const cloth = '#16171a', top = '#202226';
  g.add(box(w + 0.01, 0.03, d + 0.01, top, 0, hh - 0.03, 0, { rough: 0.85 }));
  const drop = hh - 0.045;
  g.add(box(w, drop, 0.012, cloth, 0, 0.012, d / 2 - 0.004, { rough: 1 }));
  g.add(box(w, drop, 0.012, cloth, 0, 0.012, -d / 2 + 0.004, { rough: 1 }));
  g.add(box(0.012, drop, d, cloth, w / 2 - 0.004, 0.012, 0, { rough: 1 }));
  g.add(box(0.012, drop, d, cloth, -w / 2 + 0.004, 0.012, 0, { rough: 1 }));
  const n = Math.max(6, Math.round(w / 0.07));
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + 0.02 + ((w - 0.04) * i) / n;
    g.add(box(0.012, drop - 0.02, 0.008, '#1e1f23', x, 0.02, d / 2 + 0.004, { rough: 1 }));
  }
  g.add(box(w + 0.014, 0.012, d + 0.014, '#2a2d33', 0, 0.004, 0));
}
export function bTableRegie(g, o) { clothTable(g, o.w, o.d, o.h); }

/* ---------- ordinateur portable ---------- */
export function bLaptop(g, o) {
  g.add(rbox(o.w, 0.018, o.d, 0.006, '#8b929e', 0, 0, 0, { metal: 0.75, rough: 0.35 }));
  const k = texPlane(o.w - 0.012, o.d - 0.012, laptopKeysTex(), 0, 0.0185, 0.0, { rough: 0.55 });
  k.rotation.x = -Math.PI / 2;
  g.add(k);
  const hinge = new THREE.Group();
  hinge.add(rbox(o.w, o.h * 0.9, 0.009, 0.004, '#8b929e', 0, 0, 0, { metal: 0.75, rough: 0.35 }));
  const sc = texPlane(o.w - 0.016, o.h * 0.9 - 0.016, laptopScreenTex(), 0, o.h * 0.45, 0.0052, { rough: 0.2, emissive: '#ffffff', ei: 0.35, emap: laptopScreenTex() });
  hinge.add(sc);
  hinge.position.set(0, 0.018, -o.d / 2 + 0.004);
  hinge.rotation.x = -0.34;
  g.add(hinge);
}

/* ---------- flight-case (malle) ---------- */
function caseEdges(g, w, h, d, y0) {
  const t = 0.016;
  const e = (bw, bh, bd, x, y, z) => g.add(box(bw, bh, bd, '#b9bec7', x, y, z, ALU));
  // montants
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => e(t, h, t, sx * (w / 2 - t / 2), y0, sz * (d / 2 - t / 2)));
  // traverses haut et bas
  [y0, y0 + h - t].forEach(y => {
    [-1, 1].forEach(s => { e(w - 2 * t, t, t, 0, y, s * (d / 2 - t / 2)); e(t, t, d - 2 * t, s * (w / 2 - t / 2), y, 0); });
  });
  // coins boule
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => [y0 + 0.012, y0 + h - 0.012].forEach(y => g.add(sph(0.021, '#c9ced6', sx * (w / 2 - 0.006), y, sz * (d / 2 - 0.006), ALU, 12))));
}
function wheels(g, w, d, wh) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const x = sx * (w / 2 - 0.07), z = sz * (d / 2 - 0.07);
    g.add(box(0.07, 0.008, 0.07, '#a9afb9', x, wh - 0.006, z, ALU));
    g.add(box(0.012, wh * 0.55, 0.05, '#2a2c31', x - 0.022, wh * 0.4, z));
    g.add(box(0.012, wh * 0.55, 0.05, '#2a2c31', x + 0.022, wh * 0.4, z));
    const wc = cyl(wh * 0.38, wh * 0.38, 0.03, '#17181b', x, wh * 0.38, z, { rough: 0.8 }, 16);
    wc.rotation.z = Math.PI / 2;
    g.add(wc);
  });
}
export function bFlight(g, o) {
  const wh = o.wheels ? 0.1 : 0.0, h = o.h - wh;
  g.add(rbox(o.w, h, o.d, 0.012, '#1d1e22', 0, wh, 0, { rough: 0.6 }));
  caseEdges(g, o.w, h, o.d, wh);
  g.add(box(o.w + 0.002, 0.005, o.d + 0.002, '#07080a', 0, wh + h * 0.62, 0));
  // papillons
  [-1, 1].forEach(s => {
    g.add(rbox(0.05, 0.07, 0.012, 0.004, '#c3c8d0', s * o.w * 0.26, wh + h * 0.62 - 0.045, o.d / 2 + 0.004, ALU));
    g.add(rbox(0.036, 0.034, 0.008, 0.003, '#8d939d', s * o.w * 0.26, wh + h * 0.62 + 0.018, o.d / 2 + 0.006, ALU));
    g.add(cyl(0.007, 0.007, 0.012, '#444850', s * o.w * 0.26, wh + h * 0.62 - 0.01, o.d / 2 + 0.01, ALU, 8).rotateX(Math.PI / 2));
  });
  // poignées encastrées sur les côtés
  [-1, 1].forEach(s => {
    g.add(rbox(0.012, 0.07, 0.17, 0.004, BLK, s * (o.w / 2 + 0.001), wh + h * 0.5 - 0.02, 0));
    g.add(rbox(0.014, 0.014, 0.14, 0.006, '#c3c8d0', s * (o.w / 2 + 0.008), wh + h * 0.5 + 0.004, 0, ALU));
  });
  // pochoir
  const txt = (o.label || 'CASE').toUpperCase().slice(0, 14);
  const front = texPlane(Math.min(0.42, o.w * 0.5), Math.min(0.42, o.w * 0.5) / 4, stencilTex(txt), 0, wh + h * 0.3, o.d / 2 + 0.0015, { rough: 0.8, opacity: 1 });
  front.material = mat('#ffffff', { map: stencilTex(txt), rough: 0.8 });
  front.material.transparent = true; front.material.depthWrite = false; front.material.needsUpdate = true;
  g.add(front);
  const topP = texPlane(Math.min(0.36, o.w * 0.45), Math.min(0.36, o.w * 0.45) / 4, stencilTex(txt), 0, 0, 0, null);
  topP.material = front.material;
  topP.rotation.x = -Math.PI / 2; topP.position.set(0, o.h + 0.0015, 0);
  g.add(topP);
  if (wh) wheels(g, o.w, o.d, wh);
}

/* ---------- rack 19" sur roulettes (amplis, HF, FX) ---------- */
export function bRackCase(g, o) {
  const kind = { rack: 'amp', rack_hf: 'hf', rack_fx: 'fx' }[o.type] || 'amp';
  const wh = 0.1, h = o.h - wh;
  const units = Math.max(4, Math.floor((h - 0.16) / 0.04445));
  g.add(rbox(o.w, h, o.d, 0.012, '#1d1e22', 0, wh, 0, { rough: 0.6 }));
  caseEdges(g, o.w, h, o.d, wh);
  const rh = units * 0.04445;
  g.add(rbox(0.5, rh + 0.03, 0.01, 0.004, '#050506', 0, wh + 0.07, o.d / 2 - 0.002));
  g.add(texPlane(0.483, rh, rackFrontTex(kind, units), 0, wh + 0.085 + rh / 2, o.d / 2 + 0.0035, { rough: 0.45, metal: 0.2 }));
  [-1, 1].forEach(s => {
    g.add(rbox(0.012, 0.07, 0.17, 0.004, BLK, s * (o.w / 2 + 0.001), wh + h * 0.55, 0));
    g.add(rbox(0.014, 0.014, 0.14, 0.006, '#c3c8d0', s * (o.w / 2 + 0.008), wh + h * 0.55 + 0.02, 0, ALU));
  });
  const txt = (o.label || { rack_hf: 'HF', rack_fx: 'FX' }[o.type] || 'RACK').toUpperCase().slice(0, 14);
  const lab = texPlane(0.3, 0.075, stencilTex(txt), 0, 0, 0, null);
  lab.material = mat('#ffffff', { map: stencilTex(txt), rough: 0.8 });
  lab.material.transparent = true; lab.material.depthWrite = false;
  lab.rotation.x = -Math.PI / 2; lab.position.set(0, o.h + 0.0015, 0);
  g.add(lab);
  if (kind === 'hf') [-0.09, 0.09].forEach(x => {
    g.add(cyl(0.012, 0.012, 0.03, '#2a2c31', x, o.h, o.d * 0.2, null, 10));
    g.add(cyl(0.006, 0.006, 0.22, '#17181b', x, o.h + 0.03, o.d * 0.2, null, 8));
    g.add(sph(0.011, '#17181b', x, o.h + 0.25, o.d * 0.2, null, 8));
  });
  wheels(g, o.w, o.d, wh);
}

/* ---------- distribution électrique ---------- */
function distriTex() {
  return canvasTex('distri', 512, 640, (c, W, H) => {
    c.fillStyle = '#3b3f47'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d7dbe2'; rr(c, 14, 14, W - 28, 66, 8); c.fill();
    T(c, 'DISTRIBUTION 63A · 400V', W / 2, 47, 30, '#16181c', 'center', '800');
    for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) {
      const x = 90 + q * 165, y = 160 + r * 130;
      c.fillStyle = '#0b3a8a'; c.beginPath(); c.arc(x, y, 46, 0, 7); c.fill();
      c.fillStyle = '#16181c'; c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill();
      c.fillStyle = '#c8a53a'; [[-9, 0], [9, 0], [0, 12]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx, y + dy, 4.5, 0, 7); c.fill(); });
    }
    for (let i = 0; i < 6; i++) { c.fillStyle = '#16181c'; rr(c, 50 + i * 74, 430, 44, 70, 6); c.fill(); c.fillStyle = i % 3 ? '#e9ecf1' : '#ff5d4a'; c.fillRect(58 + i * 74, 440, 28, 26); }
    const cols = ['#d4432f', '#2f6fd8', '#58b848'];
    cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(100 + i * 160, 570, 38, 0, 7); c.fill(); c.fillStyle = '#16181c'; c.beginPath(); c.arc(100 + i * 160, 570, 22, 0, 7); c.fill(); });
  });
}
export function bDistri(g, o) {
  g.add(rbox(o.w, o.h, o.d, 0.01, '#4a4e57', 0, 0.03, 0, { metal: 0.4, rough: 0.5 }));
  g.add(texPlane(o.w - 0.02, o.h - 0.02, distriTex(), 0, 0.03 + o.h / 2, o.d / 2 + 0.0015, { rough: 0.5 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.05, 0.03, 0.05, '#17181b', sx * (o.w / 2 - 0.05), 0, sz * (o.d / 2 - 0.05))));
  g.add(rbox(0.12, 0.02, 0.03, 0.006, '#c3c8d0', 0, o.h + 0.03, 0, ALU));
}

/* ---------- enrouleurs ---------- */
export function bReel(g, o) {
  const R = Math.min(o.w, o.h) / 2;
  const c = '#e0b21c';
  const fl = (x) => { const m = cyl(R, R, 0.012, '#17181b', 0, 0, 0, { rough: 0.6 }, 28); m.rotation.z = Math.PI / 2; m.position.set(x, R + 0.04, 0); return m; };
  g.add(fl(-o.d * 0.4)); g.add(fl(o.d * 0.4));
  const core = cyl(R * 0.45, R * 0.45, o.d * 0.8, '#26282c', 0, 0, 0, null, 20); core.rotation.z = Math.PI / 2; core.position.set(0, R + 0.04, 0); g.add(core);
  const cab = cyl(R * 0.9, R * 0.9, o.d * 0.72, '#111214', 0, 0, 0, { rough: 0.8 }, 28); cab.rotation.z = Math.PI / 2; cab.position.set(0, R + 0.04, 0); g.add(cab);
  for (let i = -3; i <= 3; i++) { const st = cyl(R * 0.905, R * 0.905, 0.01, c, 0, 0, 0, { rough: 0.7 }, 28); st.rotation.z = Math.PI / 2; st.position.set(i * o.d * 0.1, R + 0.04, 0); g.add(st); }
  [-1, 1].forEach(s => { g.add(box(0.012, R * 1.9 + 0.04, 0.045, '#3a3d44', s * o.d * 0.43, 0, 0)); g.add(box(0.03, 0.02, o.w * 0.7, '#3a3d44', s * o.d * 0.43, 0, 0)); });
  g.add(rbox(o.d * 0.9, 0.012, 0.03, 0.004, '#c3c8d0', 0, R * 2 + 0.06, 0, ALU));
}
export function bSnakeReel(g, o) { bReel(g, o); }

/* ---------- boîte de direct ---------- */
export function bDI(g, o) {
  g.add(rbox(o.w, o.h, o.d, 0.006, '#c5303a', 0, 0, 0, { rough: 0.5, metal: 0.3 }));
  g.add(rbox(o.w * 0.6, 0.004, o.d * 0.45, 0.002, '#e9ecf1', 0, o.h, 0.0));
  g.add(cyl(0.011, 0.011, 0.006, '#050506', -o.w * 0.28, o.h * 0.5, o.d / 2, null, 12).rotateX(Math.PI / 2));
  g.add(cyl(0.011, 0.011, 0.006, '#c3c8d0', o.w * 0.28, o.h * 0.5, o.d / 2, ALU, 12).rotateX(Math.PI / 2));
}

/* ---------- passage de câbles 5 / 2 canaux (jaune + rampes noires) ---------- */
export function bRamp(g, o) {
  const { w, d, h } = o, lw = Math.min(0.22, d * 0.44), L = (d - lw) / 2;
  g.add(profile([[-d / 2, 0], [d / 2, 0], [lw / 2, h * 0.985], [-lw / 2, h * 0.985]], w, '#151619', { rough: 0.7 }));
  const rib = ribTex();
  [-1, 1].forEach(s => {
    const sp = slopePlane(w - 0.012, [s * (d / 2 - 0.004), 0.002], [s * (lw / 2 + 0.002), h * 0.975], mat('#ffffff', { map: rib, rough: 0.8 }), null, 0.0012);
    scaleUV(sp.geometry, Math.max(1, w / 0.1), Math.max(1, L / 0.06));
    g.add(sp);
  });
  g.add(rbox(w - 0.02, 0.012, lw, 0.004, '#f2c200', 0, h * 0.985 - 0.004, 0, { rough: 0.45, cc: 0.2 }));
  [-1, 1].forEach(s => { const hg = cyl(0.006, 0.006, w - 0.03, '#2a2c31', 0, 0, 0, ALU, 8); hg.rotation.z = Math.PI / 2; hg.position.set(0, h * 0.985 + 0.004, (s * lw) / 2); g.add(hg); });
  [-1, 1].forEach(s => g.add(rbox(0.006, 0.006, lw * 0.8, 0.002, '#d4a800', s * (w / 2 - 0.012), h * 0.985 + 0.0, 0)));
  g.add(box(w - 0.02, 0.003, 0.006, '#0b0b0d', 0, h * 0.985 + 0.0, 0));
}

/* ---------- tente de régie (3×3 par module, toit pyramidal translucide) ---------- */
export function bTent(g, o) {
  const { w, d, h } = o, eave = h * 0.64, walls = (o.opt | 0);
  const nx = Math.max(1, Math.round(w / 3)), nz = Math.max(1, Math.round(d / 3));
  const fab = o.color || '#14161a';
  const lum = new THREE.Color(fab).getHSL({}).l;
  const darkFab = lum < 0.3; // tente noire : armature noire, toile plus opaque
  const frame = darkFab ? '#2b2e35' : '#b5bbc5';
  // pieds, poutres, ciseaux
  const xs = Array.from({ length: nx + 1 }, (_, i) => -w / 2 + (w * i) / nx), zs = Array.from({ length: nz + 1 }, (_, i) => -d / 2 + (d * i) / nz);
  for (const x of xs) for (const z of zs) {
    g.add(rbox(0.05, eave, 0.05, 0.008, frame, x, 0, z, ALU));
    g.add(box(0.14, 0.012, 0.14, '#2a2c31', x, 0, z));
  }
  for (const z of zs) g.add(box(w, 0.04, 0.04, frame, 0, eave - 0.04, z, ALU));
  for (const x of xs) g.add(box(0.04, 0.04, d, frame, x, eave - 0.04, 0, ALU));
  const scis = (a, b, axisX) => {
    const fix = (p, y) => (axisX ? [p, y, 0] : [0, y, p]);
    void fix;
  };
  void scis;
  [-d / 2, d / 2].forEach(z => { for (let i = 0; i < nx; i++) { const x0 = xs[i], x1 = xs[i + 1]; g.add(strut([x0, 0.1, z], [x1, eave - 0.12, z], 0.012, frame, ALU, 6)); g.add(strut([x1, 0.1, z], [x0, eave - 0.12, z], 0.012, frame, ALU, 6)); } });
  [-w / 2, w / 2].forEach(x => { for (let j = 0; j < nz; j++) { const z0 = zs[j], z1 = zs[j + 1]; g.add(strut([x, 0.1, z0], [x, eave - 0.12, z1], 0.012, frame, ALU, 6)); g.add(strut([x, 0.1, z1], [x, eave - 0.12, z0], 0.012, frame, ALU, 6)); } });
  // toit : une pyramide par module, tissu translucide
  const roofM = mat(fab, { rough: 0.9, opacity: darkFab ? 0.5 : 0.42, side: THREE.DoubleSide });
  const pos = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1], cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const A = [x0, eave, z0], B = [x1, eave, z0], C = [x1, eave, z1], D = [x0, eave, z1], P = [cx, h, cz];
    [[A, B, P], [B, C, P], [C, D, P], [D, A, P]].forEach(t => t.forEach(v => pos.push(...v)));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, roofM);
  roof.raycast = () => {};
  g.add(roof);
  // jupe de toit (volant)
  const vm = mat(fab, { rough: 0.9, opacity: darkFab ? 0.85 : 0.55, side: THREE.DoubleSide });
  const val = (bw, bd, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.2, bd), vm); m.position.set(x, eave - 0.1, z); m.raycast = () => {}; g.add(m); };
  val(w + 0.02, 0.01, 0, -d / 2); val(w + 0.02, 0.01, 0, d / 2); val(0.01, d, -w / 2, 0); val(0.01, d, w / 2, 0);
  // parois
  const wm = mat(darkFab ? shade(fab, 1.6) : '#e6f1fa', { rough: 0.9, opacity: darkFab ? 0.45 : 0.32, side: THREE.DoubleSide });
  const wall = (bw, bd, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, eave - 0.2, bd), wm); m.position.set(x, (eave - 0.2) / 2, z); m.raycast = () => {}; g.add(m); };
  if (walls >= 1) { wall(w, 0.012, 0, -d / 2); wall(0.012, d, -w / 2, 0); wall(0.012, d, w / 2, 0); }
  if (walls >= 2) wall(w, 0.012, 0, d / 2);
  // moquette au sol (sert aussi à saisir la tente)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), mat(darkFab ? '#2a2d34' : '#c9d5e2', { rough: 0.95, opacity: darkFab ? 0.35 : 0.4 }));
  floor.position.y = 0.005;
  g.add(floor);
}

/* ---------- tabourets ---------- */
export function bStool(g, o) {
  const r = o.w / 2, h = o.h, steel = { metal: 0.85, rough: 0.25 };
  g.add(cyl(r * 0.92, r, 0.06, '#17181c', 0, h - 0.06, 0, { rough: 0.7 }, 28));
  g.add(cyl(r * 0.99, r * 0.99, 0.012, '#26282c', 0, h - 0.07, 0, { rough: 0.5 }, 28));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    g.add(strut([c * r * 0.55, h - 0.07, s * r * 0.55], [c * r * 0.95, 0.01, s * r * 0.95], 0.012, '#c9ced6', steel, 8));
    g.add(cyl(0.015, 0.016, 0.012, '#0b0b0d', c * r * 0.95, 0, s * r * 0.95, null, 8));
  }
  g.add(tor(r * 0.8, 0.008, '#c9ced6', 0, h * 0.4, 0, steel, true));
}
export function bThroneDrum(g, o) {
  const r = o.w / 2, h = o.h, steel = { metal: 0.85, rough: 0.25 };
  g.add(cyl(r * 0.94, r, 0.07, '#17181c', 0, h - 0.07, 0, { rough: 0.7 }, 28));
  g.add(cyl(0.016, 0.016, h - 0.1, '#c9ced6', 0, 0.1, 0, steel, 12));
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 + 0.5, c = Math.cos(a), s = Math.sin(a);
    g.add(strut([0, 0.22, 0], [c * r * 1.3, 0.012, s * r * 1.3], 0.011, '#c9ced6', steel, 8));
  }
}
