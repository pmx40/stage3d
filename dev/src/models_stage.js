// Modèles 3D : scène, structure, lumière, vidéo, backline, musiciens, mobilier.
import { THREE, mat, shade, box, rbox, cyl, sph, tor, capsule, plane, disc, edges, strut, profile, texPlane, canvasTex, rr, T, diamondTex, scaleUV, flatTextMesh } from './gfx.js';
import { keysTex, cdjTex, djmTex, ledTex } from './textures.js';

const BLK = '#0c0d0f';
const ALU = { metal: 0.85, rough: 0.28 };
const STEEL = { metal: 0.8, rough: 0.35 };

/* ---------- praticable : tôle larmée, cadre alu, pieds ---------- */
export function bPrat(g, o) {
  const { w, d, h } = o, t = Math.min(0.05, h);
  g.add(box(w - 0.08, Math.max(0.001, h - t), d - 0.08, '#1b1e26', 0, 0, 0, { rough: 0.8 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.05, Math.max(0.001, h - t), 0.05, '#2d323d', sx * (w / 2 - 0.04), 0, sz * (d / 2 - 0.04), STEEL)));
  // plateau 2 mm sous le cadre alu : plus aucune face coplanaire (c'était la cause du flicker des praticables)
  g.add(box(w - 0.004, t - 0.002, d - 0.004, '#23272f', 0, h - t, 0, { rough: 0.7 }));
  const top = texPlane(w - 0.044, d - 0.044, diamondTex(), 0, h + 0.0012, 0, { rough: 0.7, metal: 0.2 }, [Math.max(1, w / 0.22), Math.max(1, d / 0.22)]);
  top.material = mat(shade(o.color, 1.25), { map: diamondTex(), rough: 0.65, metal: 0.15, po: true });
  top.rotation.x = -Math.PI / 2;
  g.add(top);
  // cadre aluminium sur le pourtour
  const fr = 0.022;
  [-1, 1].forEach(s => {
    g.add(box(w, t, fr, '#b4bac4', 0, h - t, s * (d / 2 - fr / 2), ALU));
    g.add(box(fr, t, d - 2 * fr, '#b4bac4', s * (w / 2 - fr / 2), h - t, 0, ALU));
  });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.007, 0.007, 0.004, '#444850', sx * (w / 2 - 0.045), h + 0.0, sz * (d / 2 - 0.045), ALU, 8)));
}

/* ---------- escalier de scène : limons, marches en tôle larmée, rampes (option) ---------- */
export function bStairs(g, o) {
  const rails = (o.opt | 0) === 0;
  const n = Math.max(2, Math.ceil(o.h / 0.18)), sd = o.d / n;
  const tw = o.w - 0.06;
  for (let i = 0; i < n; i++) {
    const hh = (o.h * (i + 1)) / n, zc = o.d / 2 - sd * (i + 0.5);
    g.add(box(tw, 0.03, sd - 0.004, '#3a404c', 0, hh - 0.03, zc, { rough: 0.7 }));
    const top = texPlane(tw - 0.01, sd - 0.016, diamondTex(), 0, hh + 0.0006, zc, { rough: 0.65, metal: 0.2 }, [Math.max(1, tw / 0.22), Math.max(1, sd / 0.22)]);
    top.rotation.x = -Math.PI / 2;
    g.add(top);
    g.add(box(tw, 0.012, 0.022, '#d8dce4', 0, hh - 0.004, zc + sd / 2 - 0.013, { rough: 0.5 })); // nez de marche
    g.add(box(tw, hh - 0.03, 0.01, '#20242c', 0, 0, o.d / 2 - sd * (i + 1) + 0.005, { rough: 0.8 }));
  }
  const prof = [[o.d / 2, 0], [-o.d / 2, 0], [-o.d / 2, o.h], [o.d / 2 - sd, o.h / n]];
  [-1, 1].forEach(s => {
    const x = s * (o.w / 2 - 0.015);
    g.add(profile(prof, 0.03, '#2d323d', STEEL).translateX(x));
    g.add(box(0.05, 0.012, 0.12, '#0b0b0d', x, 0, o.d / 2 - 0.08));
    if (!rails) return;
    g.add(strut([x, 0.95, o.d / 2 - 0.02], [x, o.h + 0.95, -o.d / 2 + 0.02], 0.016, '#b4bac4', ALU, 8));
    g.add(cyl(0.014, 0.014, 0.95, '#b4bac4', x, 0, o.d / 2 - 0.02, ALU, 8));
    g.add(cyl(0.014, 0.014, o.h + 0.95, '#b4bac4', x, 0, -o.d / 2 + 0.02, ALU, 8));
    g.add(strut([x, 0.45, o.d / 2 - 0.02], [x, o.h + 0.45, -o.d / 2 + 0.02], 0.01, '#b4bac4', ALU, 6)); // lisse intermédiaire
  });
}

/* ---------- garde-corps de scène ---------- */
export function bHandrail(g, o) {
  const c = '#b4bac4';
  const n = Math.max(2, Math.round(o.w / 0.8) + 1);
  for (let i = 0; i < n; i++) g.add(cyl(0.017, 0.017, o.h, c, -o.w / 2 + (o.w * i) / (n - 1), 0, 0, ALU, 10));
  [o.h * 0.95, o.h * 0.5].forEach(y => { const r = cyl(0.016, 0.016, o.w, c, 0, 0, 0, ALU, 10); r.rotation.z = Math.PI / 2; r.position.set(0, y, 0); g.add(r); });
  g.add(box(o.w, 0.12, 0.012, '#26282c', 0, 0.04, 0));
}

/* ---------- barrière Vauban ---------- */
export function bBarrier(g, o) {
  const c = '#c2c8d2';
  [0.1, 0.55, 1.03].forEach(y => { const r = cyl(0.013, 0.013, o.w, c, 0, 0, 0, ALU, 8); r.rotation.z = Math.PI / 2; r.position.set(0, y + 0.0, 0); g.add(r); });
  const n = Math.round(o.w / 0.11);
  for (let i = 0; i <= n; i++) g.add(cyl(0.007, 0.007, o.h - 0.1, c, -o.w / 2 + 0.02 + ((o.w - 0.04) * i) / n, 0.06, 0, ALU, 6));
  [-1, 1].forEach(s => {
    g.add(cyl(0.018, 0.018, o.h - 0.05, c, s * (o.w / 2 - 0.02), 0.04, 0, ALU, 10));
    g.add(box(0.05, 0.02, o.d, '#9aa1ad', s * (o.w / 2 - 0.03), 0, 0, ALU));
    g.add(box(0.035, 0.012, 0.18, '#7e8591', s * (o.w / 2 - 0.03), 0.02, o.d / 2 - 0.1, ALU));
  });
  g.add(box(o.w * 0.6, 0.002, 0.002, c, 0, 0.0, 0));
}

/* ---------- rideau de fond plissé ---------- */
export function bBackdrop(g, o) {
  const seg = Math.max(12, Math.round(o.w * 8));
  const geo = new THREE.PlaneGeometry(o.w, o.h - 0.05, seg, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(((p.getX(i) + o.w / 2) / 0.32) * Math.PI * 2) * (o.d / 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(o.color, { rough: 1, side: THREE.DoubleSide }));
  m.position.set(0, (o.h - 0.05) / 2, 0);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  const pipe = cyl(0.025, 0.025, o.w + 0.1, '#9aa1ad', 0, 0, 0, ALU, 12);
  pipe.rotation.z = Math.PI / 2; pipe.position.set(0, o.h - 0.02, 0);
  g.add(pipe);
  [-1, 1].forEach(s => g.add(cyl(0.02, 0.02, o.h, '#2d323d', s * (o.w / 2 + 0.05), 0, 0, STEEL, 10)));
}

/* ---------- truss à treillis (section carrée 30 × 30 cm) ---------- */
export function bTruss(g, o) {
  const r = 0.0125, ch = { ...ALU }, W = o.w, hh = o.h / 2 - 0.02, dd = o.d / 2 - 0.02;
  const chord = (y, z) => { const c = cyl(r, r, W, '#b9bfc9', 0, 0, 0, ch, 8); c.rotation.z = Math.PI / 2; c.position.set(0, o.h / 2 + y, z); g.add(c); };
  [-hh, hh].forEach(y => [-dd, dd].forEach(z => chord(y, z)));
  const n = Math.max(2, Math.round(W / 0.29));
  for (let i = 0; i < n; i++) {
    const x0 = -W / 2 + (W * i) / n, x1 = -W / 2 + (W * (i + 1)) / n, up = i % 2 === 0;
    [-dd, dd].forEach(z => g.add(strut([x0, o.h / 2 + (up ? -hh : hh), z], [x1, o.h / 2 + (up ? hh : -hh), z], 0.007, '#b9bfc9', ch, 6)));
    [-hh, hh].forEach(y => g.add(strut([x0, o.h / 2 + y, up ? -dd : dd], [x1, o.h / 2 + y, up ? dd : -dd], 0.006, '#b9bfc9', ch, 6)));
  }
  [-1, 1].forEach(s => g.add(box(0.01, o.h - 0.02, o.d - 0.02, '#8d939d', s * (W / 2 - 0.005), 0.01, 0, ALU)));
  // zone de sélection transparente (le treillis seul est presque impossible à cliquer)
  const pick = new THREE.Mesh(new THREE.BoxGeometry(W, o.h, o.d), mat('#ffffff', { opacity: 0 }));
  pick.position.set(0, o.h / 2, 0);
  g.add(pick);
}
export function bTower(g, o) {
  g.add(box(o.w, 0.014, o.d, '#2d323d', 0, 0, 0, STEEL));
  const c = o.w * 0.18, r = 0.014;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(r, r, o.h, '#b9bfc9', sx * c, 0, sz * c, ALU, 8)));
  const n = Math.round(o.h / 0.29);
  for (let i = 0; i < n; i++) {
    const y0 = (o.h * i) / n, y1 = (o.h * (i + 1)) / n, up = i % 2;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ax, az]) => {
      const a = ax ? [ax * c, up ? y0 : y1, -c] : [-c, up ? y0 : y1, az * c], b = ax ? [ax * c, up ? y1 : y0, c] : [c, up ? y1 : y0, az * c];
      g.add(strut(a, b, 0.006, '#b9bfc9', ALU, 6));
    });
  }
  g.add(box(o.w * 0.5, 0.02, o.d * 0.5, '#2d323d', 0, o.h, 0, STEEL));
  g.add(box(o.w * 0.7, 0.018, o.d * 0.7, '#3a3f49', 0, 0.014, 0, STEEL));
  const pick = new THREE.Mesh(new THREE.BoxGeometry(o.w * 0.5, o.h, o.d * 0.5), mat('#ffffff', { opacity: 0 }));
  pick.position.set(0, o.h / 2, 0);
  g.add(pick);
}

/* ---------- machine à fumée ---------- */
export function bFog(g, o) {
  g.add(rbox(o.w, o.h, o.d, 0.02, '#1d1f24', 0, 0.02, 0, { rough: 0.5 }));
  const n = cyl(0.026, 0.03, 0.08, '#8d939d', 0, 0, o.d / 2 + 0.03, ALU, 14); n.rotation.x = Math.PI / 2; n.position.set(0, o.h * 0.55, o.d / 2 + 0.02); g.add(n);
  g.add(rbox(o.w * 0.3, 0.012, o.d * 0.4, 0.004, '#303339', -o.w * 0.2, o.h + 0.02, 0));
  g.add(sph(0.009, '#58e06b', o.w * 0.28, o.h + 0.03, 0, { emissive: '#58e06b', ei: 1.2 }, 8));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.02, 0.022, 0.02, '#0b0b0d', sx * (o.w / 2 - 0.05), 0, sz * (o.d / 2 - 0.04), null, 8)));
}

/* ---------- écran LED ---------- */
export function bLED(g, o) {
  g.add(rbox(o.w, o.h, o.d, 0.01, '#0e1014', 0, 0, 0, { rough: 0.5 }));
  g.add(texPlane(o.w * 0.97, o.h * 0.96, ledTex(), 0, o.h / 2, o.d / 2 + 0.002, { rough: 0.25, emissive: '#ffffff', ei: 0.8, emap: ledTex() }));
  [-1, 1].forEach(s => g.add(box(0.05, 0.4, 0.4, '#1a1c20', s * (o.w / 2 - 0.1), 0, -o.d / 2 - 0.2, STEEL)));
  g.add(box(o.w * 0.92, 0.04, 0.04, '#2d323d', 0, o.h * 0.5, -o.d / 2 - 0.02, STEEL));
}

/* ---------- DJ : 2 platines + table de mixage ---------- */
export function bDJ(g, o) {
  const cw = 0.329, mw = 0.38, gap = (o.w - 2 * cw - mw) / 2;
  const unit = (x, w, tex) => {
    g.add(rbox(w, o.h, o.d, 0.008, '#25272c', x, 0, 0, { rough: 0.45 }));
    const tp = texPlane(w - 0.01, o.d - 0.01, tex, 0, 0, 0, { rough: 0.35, cc: 0.2 });
    tp.rotation.x = -Math.PI / 2; tp.position.set(x, o.h + 0.0012, 0);
    g.add(tp);
  };
  unit(-(mw / 2 + gap + cw / 2), cw, cdjTex());
  unit(0, mw, djmTex());
  unit(mw / 2 + gap + cw / 2, cw, cdjTex());
}

/* ---------- personnes (échelle) ---------- */
export function bPerson(g, o) {
  const s = o.h / 1.75, shirt = o.color, pants = shade(o.color, 0.4), skin = '#e3bd9a';
  [-1, 1].forEach(x => { g.add(capsule(0.07 * s, 0.62 * s, pants, x * 0.1 * s, 0.4 * s, 0, { rough: 0.85 })); g.add(rbox(0.1 * s, 0.06 * s, 0.24 * s, 0.02, '#17181b', x * 0.1 * s, 0, 0.04 * s)); });
  g.add(capsule(0.17 * s, 0.34 * s, shirt, 0, 1.12 * s, 0, { rough: 0.85 }));
  [-1, 1].forEach(x => { const a = capsule(0.045 * s, 0.5 * s, shirt, x * 0.25 * s, 1.1 * s, 0, { rough: 0.85 }); a.rotation.z = x * 0.12; g.add(a); g.add(sph(0.045 * s, skin, x * 0.28 * s, 0.8 * s, 0, null, 10)); });
  g.add(cyl(0.05 * s, 0.05 * s, 0.07 * s, skin, 0, 1.46 * s, 0, null, 10));
  g.add(sph(0.105 * s, skin, 0, 1.64 * s, 0));
  g.add(sph(0.108 * s, '#2d2a28', 0, 1.67 * s, -0.012 * s, { rough: 0.9 }));
}

/* ---------- mobilier ---------- */
export function bChair(g, o) {
  g.add(rbox(o.w, 0.04, o.d, 0.012, o.color, 0, o.h * 0.5, 0, { rough: 0.7 }));
  g.add(rbox(o.w, o.h * 0.42, 0.035, 0.012, o.color, 0, o.h * 0.54, -o.d / 2 + 0.02, { rough: 0.7 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.012, 0.012, o.h * 0.5, '#9aa1ad', sx * (o.w / 2 - 0.03), 0, sz * (o.d / 2 - 0.03), ALU, 8)));
  [-1, 1].forEach(s => { const r = cyl(0.01, 0.01, o.d - 0.06, '#9aa1ad', s * (o.w / 2 - 0.03), 0, 0, ALU, 8); r.rotation.x = Math.PI / 2; r.position.y = o.h * 0.2; g.add(r); });
}
export function bTable(g, o) {
  g.add(rbox(o.w, 0.035, o.d, 0.008, o.color, 0, o.h - 0.035, 0, { rough: 0.7 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.02, 0.02, o.h - 0.035, '#9aa1ad', sx * (o.w / 2 - 0.08), 0, sz * (o.d / 2 - 0.06), ALU, 10)));
  [-1, 1].forEach(s => { const r = cyl(0.012, 0.012, o.d - 0.12, '#9aa1ad', s * (o.w / 2 - 0.08), 0, 0, ALU, 8); r.rotation.x = Math.PI / 2; r.position.y = o.h * 0.3; g.add(r); });
}
export function bTableRound(g, o) {
  g.add(cyl(o.w / 2, o.w / 2, 0.04, o.color, 0, o.h - 0.04, 0, { rough: 0.7 }, 40));
  g.add(cyl(0.05, 0.05, o.h - 0.04, '#17181b', 0, 0, 0, null, 12));
  g.add(cyl(o.w * 0.24, o.w * 0.26, 0.025, '#17181b', 0, 0, 0, null, 24));
}

/* ---------- annotations ---------- */
export function bZone(g, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.02, o.d), mat(o.color, { opacity: 0.3 }));
  m.position.y = 0.01;
  g.add(m);
  g.add(edges(o.w, 0.02, o.d, 0, 0, 0, o.color));
}
export function bText(g, o) {
  const size = Math.max(0.15, o.d);
  const { mesh, width } = flatTextMesh(o.label || 'Texte', size, o.color);
  o.w = Math.max(0.3, width);
  mesh.position.y = 0.025;
  mesh.raycast = THREE.Mesh.prototype.raycast;
  g.add(mesh);
}
export function bListener(g, o) {
  g.add(cyl(0.012, 0.012, o.h - 0.1, '#6fe7ff', 0, 0, 0, { emissive: '#2bb6d6', ei: 0.6 }, 8));
  g.add(sph(0.11, '#6fe7ff', 0, o.h - 0.08, 0, { emissive: '#2bb6d6', ei: 0.8 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.27, 32), new THREE.MeshBasicMaterial({ color: '#10a6d6', side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.raycast = () => {};
  g.add(ring);
}

/* ---------- tapis de danse (revêtement vinyle type Marley) : bandes adhésives sur le pourtour et aux jonctions de lés ---------- */
const MAT_COLORS = ['#17181b', '#8d939d', '#e9ecf1', '#2f5fb8', '#b32d36', '#2f8a4a'];
const marleyTex = () => canvasTex('marley', 256, 256, (c, W, H) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
  let s = 5;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1800; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.09)'; c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1); }
}, { repeat: true });
export function bDanceMat(g, o) {
  const { w, d, h } = o;
  const base = o.color !== '#17181b' ? o.color : MAT_COLORS[o.opt | 0] || o.color; // une couleur choisie à la main l'emporte sur la version
  g.add(box(w, h, d, base, 0, 0, 0, { rough: 0.8 }));
  const top = texPlane(w, d, marleyTex(), 0, 0, 0, { rough: 0.7 }, [Math.max(1, w / 1.2), Math.max(1, d / 1.2)]);
  top.material = mat(base, { map: marleyTex(), rough: 0.75, po: true });
  top.rotation.x = -Math.PI / 2; top.position.set(0, h + 0.0005, 0);
  g.add(top);
  // bande adhésive : pourtour + jonction des lés (largeur d'un lé ≈ 1,6 m)
  const tape = shade(base, base === '#e9ecf1' || base === '#8d939d' ? 0.62 : 2.6);
  const strip = (sw, sd, x, z) => { const t = plane(sw, sd, tape, 0, 0, 0, { rough: 0.5 }); t.rotation.x = -Math.PI / 2; t.position.set(x, h + 0.001, z); g.add(t); };
  const tw = 0.04;
  strip(w, tw, 0, d / 2 - tw / 2 - 0.004);
  strip(w, tw, 0, -d / 2 + tw / 2 + 0.004);
  strip(tw, d, w / 2 - tw / 2 - 0.004, 0);
  strip(tw, d, -w / 2 + tw / 2 + 0.004, 0);
  for (let k = 1; k < Math.floor(d / 1.6 + 0.05); k++) strip(w, tw, 0, -d / 2 + k * (d / Math.floor(d / 1.6 + 0.05)));
}
