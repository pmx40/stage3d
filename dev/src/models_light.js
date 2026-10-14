// Modèles 3D : projecteurs orientables (traditionnels PC 750, PAR 64, découpe ; PAR LED, lyre, barre LED), guirlande, pendrillons.
// Les projecteurs ont un étrier fixe et une lampe qui bascule autour de l'axe de l'étrier (o.tilt, en degrés, positif = vers le sol).
// Le pivotement horizontal (pan) est la rotation de l'objet (o.rot).
import { THREE, mat, box, rbox, cyl, sph, tor, disc, strut, tube, texPlane, canvasTex, T } from './gfx.js';
import { tripod } from './models_audio.js';

const ALU = { metal: 0.85, rough: 0.28 };
const STEEL = { metal: 0.8, rough: 0.35 };
const HOUS = { rough: 0.55, metal: 0.35 };
const rad = d => ((d || 0) * Math.PI) / 180;

/* cylindre d'axe Z (rt = rayon côté avant +Z) centré en z */
function zcyl(L, rt, rb, len, z, color = '#17181b', m = HOUS, seg = 28) {
  const c = cyl(rt, rb, len, color, 0, 0, 0, m, seg);
  c.rotation.x = Math.PI / 2;
  c.position.set(0, 0, z);
  L.add(c);
  return c;
}
/* crochet, étrier en U et groupe pivotant ; py = hauteur de l'axe de bascule, r = rayon de la lampe */
function rig(g, o, py, r) {
  const h = o.h, armW = r + 0.022;
  const barY = Math.max(py + r + 0.014, h - 0.115);
  const stemTop = Math.max(barY + 0.034, h - 0.07);
  const hk = tor(0.032, 0.006, '#c9ced6', 0, stemTop + 0.014 + 0.026, 0, ALU, false);
  hk.rotation.y = Math.PI / 2;
  g.add(hk);
  g.add(box(0.07, 0.014, 0.06, '#2d323d', 0, stemTop, 0, STEEL));
  g.add(box(0.034, stemTop - barY, 0.03, '#2d323d', 0, barY, 0, STEEL));
  g.add(cyl(0.013, 0.013, 0.034, '#c9ced6', 0.044, stemTop - 0.01, 0, ALU, 10)); // vis de serrage
  g.add(box(2 * armW + 0.024, 0.014, 0.042, '#202226', 0, barY, 0, STEEL));
  [-1, 1].forEach(s => {
    g.add(box(0.012, barY - (py - 0.03), 0.042, '#202226', s * armW, py - 0.03, 0, STEEL));
    const bolt = cyl(0.011, 0.011, 0.03, '#c9ced6', 0, 0, 0, ALU, 10);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(s * (armW + 0.013), py, 0);
    g.add(bolt);
  });
  // molette de blocage de l'inclinaison
  const knob = cyl(0.024, 0.024, 0.016, '#0d0e10', 0, 0, 0, { rough: 0.8 }, 12);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(armW + 0.036, py, 0);
  g.add(knob);
  const L = new THREE.Group();
  L.position.set(0, py, 0);
  L.rotation.x = rad(o.tilt);
  g.add(L);
  return L;
}
const lensMat = (c, ei = 1.0) => ({ emissive: c, ei, rough: 0.12 });
function dome(L, r, z, color, scaleZ = 0.3) {
  const m = sph(r, color, 0, 0, z, lensMat(color, 0.9), 24);
  m.scale.z = scaleZ;
  L.add(m);
}

/* ---------- PC 750 W (plan-convexe, traditionnel) ---------- */
function lampPC(L, o) {
  const r = 0.095;
  zcyl(L, r, r, 0.22, -0.06);
  for (let i = 0; i < 6; i++) zcyl(L, 0.101, 0.101, 0.008, -0.165 + i * 0.022, '#202226');
  zcyl(L, 0.06, 0.095, 0.045, -0.2);
  const hd = tor(0.04, 0.006, '#c9ced6', 0, 0, -0.226, ALU, false); // poignée arrière
  L.add(hd);
  zcyl(L, 0.108, 0.108, 0.1, 0.1, '#101113');
  zcyl(L, 0.113, 0.113, 0.012, 0.152, '#202226');
  dome(L, 0.098, 0.14, o.color || '#fff2d0');
  // tige de mise au point
  L.add(strut([0, -0.092, -0.02], [0, -0.17, -0.1], 0.0055, '#c9ced6', ALU, 6));
  L.add(sph(0.015, '#0d0e10', 0, -0.17, -0.1, { rough: 0.8 }, 10));
  if ((o.opt | 0) === 0) {
    // volets 4 faces, articulés sur la bague de lentille
    const leaf = (x, y, rx, ry, sx, sy) => {
      const gp = new THREE.Group();
      gp.position.set(x, y, 0.158);
      gp.rotation.set(rx, ry, 0);
      gp.add(box(sx, sy, sx > sy ? 0.11 : 0.11, '#0d0e10', 0, 0, 0.055, { rough: 0.7 }));
      L.add(gp);
    };
    leaf(0, 0.112, -0.4, 0, 0.17, 0.003);
    leaf(0, -0.112, 0.4, 0, 0.17, 0.003);
    leaf(0.112, 0, 0, 0.4, 0.003, 0.17);
    leaf(-0.112, 0, 0, -0.4, 0.003, 0.17);
  }
}

/* ---------- PAR 64 (CP62) ---------- */
function lampPar64(L, o) {
  zcyl(L, 0.1, 0.1, 0.27, -0.07, '#23252a', { rough: 0.5, metal: 0.45 });
  [-0.15, -0.09, -0.03].forEach(z => zcyl(L, 0.103, 0.103, 0.01, z, '#3a3d44', { rough: 0.5, metal: 0.5 }));
  zcyl(L, 0.05, 0.1, 0.075, -0.24, '#23252a', { rough: 0.5, metal: 0.45 });
  zcyl(L, 0.106, 0.106, 0.016, 0.068, '#2d3036', { rough: 0.45, metal: 0.55 });
  L.add(disc(0.094, o.color || '#fff2d0', 0, 0, 0.078, lensMat(o.color || '#fff2d0', 0.9), 28));
  // porte-gélatine
  const fz = 0.1;
  [-1, 1].forEach(s => {
    L.add(box(0.235, 0.008, 0.016, '#17181b', 0, s * 0.115 - 0.004, fz - 0.008, STEEL));
    L.add(box(0.008, 0.235, 0.016, '#17181b', s * 0.115 - 0.004, -0.1175, fz - 0.008, STEEL));
  });
  L.add(tor(0.03, 0.005, '#c9ced6', 0, 0, -0.275, ALU, false));
}

/* ---------- découpe 1 kW (type 614) ---------- */
function lampProfile(L, o) {
  zcyl(L, 0.085, 0.085, 0.2, -0.22);
  zcyl(L, 0.08, 0.08, 0.2, -0.02, '#17181b');
  for (let i = 0; i < 5; i++) zcyl(L, 0.088, 0.088, 0.008, -0.27 + i * 0.03, '#202226');
  zcyl(L, 0.068, 0.068, 0.22, 0.19, '#101113');
  zcyl(L, 0.075, 0.075, 0.018, 0.3, '#202226');
  L.add(disc(0.062, o.color || '#fff2d0', 0, 0, 0.311, lensMat(o.color || '#fff2d0', 0.9), 26));
  // poignées de couteaux
  [0, 1, 2, 3].forEach(i => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    L.add(strut([Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0.07], [Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.07], 0.004, '#c9ced6', ALU, 6));
    L.add(sph(0.011, '#0d0e10', Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.07, { rough: 0.8 }, 8));
  });
  L.add(box(0.045, 0.014, 0.05, '#c9ced6', 0, 0.082, 0.07, ALU)); // fente à gobo
  const k = cyl(0.01, 0.01, 0.03, '#c9ced6', 0, 0.065, 0.2, ALU, 8);
  L.add(k);
  L.add(tor(0.035, 0.006, '#c9ced6', 0, 0, -0.325, ALU, false));
}

/* ---------- PAR LED ---------- */
function lampParLed(L, o) {
  const r = o.w * 0.4;
  zcyl(L, r, r * 0.85, o.d * 0.7, 0, '#202226', { rough: 0.5, metal: 0.4 }, 22);
  L.add(disc(o.w * 0.37, o.color || '#ffd9a0', 0, 0, o.d * 0.35 + 0.002, { emissive: o.color || '#ffcf80', ei: 1.1, rough: 0.2 }, 24));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; L.add(sph(0.011, '#ffffff', Math.cos(a) * o.w * 0.22, Math.sin(a) * o.w * 0.22, o.d * 0.355, { emissive: '#ffffff', ei: 1.4 }, 8)); }
}

/* ---------- PC LED (Fresnel à LED) : radiateur à ailettes, lentille de Fresnel à gradins, volets ---------- */
function lampPcLed(L, o) {
  const c = o.color || '#fff2d0';
  zcyl(L, 0.088, 0.088, 0.2, -0.07, '#1c1e22');
  for (let i = 0; i < 8; i++) zcyl(L, 0.097, 0.097, 0.007, -0.17 + i * 0.022, '#2b2e35', { rough: 0.45, metal: 0.55 });
  zcyl(L, 0.06, 0.088, 0.04, -0.19, '#17181b');
  L.add(rbox(0.07, 0.022, 0.06, 0.005, '#101113', 0, 0.098, -0.09, { rough: 0.5 })); // bloc commandes sur le dessus
  L.add(box(0.034, 0.003, 0.02, '#58e0ff', 0, 0.121, -0.09, { emissive: '#58e0ff', ei: 0.9 }));
  L.add(tor(0.04, 0.006, '#c9ced6', 0, 0, -0.222, ALU, false)); // poignée arrière
  zcyl(L, 0.106, 0.106, 0.1, 0.08, '#101113');
  zcyl(L, 0.113, 0.113, 0.012, 0.135, '#202226');
  L.add(disc(0.098, c, 0, 0, 0.131, lensMat(c, 0.95), 32));
  [0.03, 0.055, 0.075, 0.092].forEach(R => L.add(tor(R, 0.0028, c, 0, 0, 0.1325, lensMat(c, 1.25), false))); // gradins de Fresnel
  L.add(strut([0, -0.09, 0], [0, -0.16, -0.08], 0.0055, '#c9ced6', ALU, 6));
  L.add(sph(0.015, '#0d0e10', 0, -0.16, -0.08, { rough: 0.8 }, 10));
  if ((o.opt | 0) === 0) {
    const leaf = (x, y, rx, ry, sx, sy) => {
      const gp = new THREE.Group();
      gp.position.set(x, y, 0.14);
      gp.rotation.set(rx, ry, 0);
      gp.add(box(sx, sy, 0.11, '#0d0e10', 0, 0, 0.055, { rough: 0.7 }));
      L.add(gp);
    };
    leaf(0, 0.117, -0.4, 0, 0.17, 0.003);
    leaf(0, -0.117, 0.4, 0, 0.17, 0.003);
    leaf(0.117, 0, 0, 0.4, 0.003, 0.17);
    leaf(-0.117, 0, 0, -0.4, 0.003, 0.17);
  }
}

const MOUNT_R = { pc750: 0.108, par64: 0.106, decoupe: 0.09, pc_led: 0.108 }; // rayon de la lampe (étrier)
// block = hauteur du bloc étrier + lampe ; pivot = hauteur de l'axe de bascule au-dessus de la base ; stand = hauteur du pied (0 au sol)
export function mountGeom(o) {
  const moving = o.type === 'moving';
  const r = moving ? 0.15 : MOUNT_R[o.type] ?? o.w * 0.42;
  const block = moving ? 0.5 : 2 * r + 0.07;
  const pivot = moving ? 0.29 : 0.045 + r;
  const stand = (o.mount | 0) === 2 ? Math.max(0.3, o.h - block) : 0;
  return { r, block, pivot, stand };
}
// base commune : pied télescopique (sur pied) ou pieds caoutchouc (au sol), platine et étrier montant ; renvoie le groupe de la lampe
function mountedRig(g, o) {
  const G = mountGeom(o), yb = G.stand, r = G.r, armW = r + 0.022, py = yb + G.pivot;
  if ((o.mount | 0) === 2) {
    tripod(g, yb, '#222428', Math.min(0.55, 0.2 + yb * 0.14));
    g.add(box(0.08, 0.03, 0.07, '#2d323d', 0, yb - 0.004, 0, STEEL)); // adaptateur sur le tourillon du pied
  }
  g.add(box(2 * armW + 0.024, 0.014, 0.1, '#202226', 0, yb, 0, STEEL)); // platine
  [-1, 1].forEach(s => {
    g.add(box(0.012, py + 0.03 - yb - 0.014, 0.042, '#202226', s * armW, yb + 0.014, 0, STEEL));
    const bolt = cyl(0.011, 0.011, 0.03, '#c9ced6', 0, 0, 0, ALU, 10);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(s * (armW + 0.013), py, 0);
    g.add(bolt);
    if ((o.mount | 0) === 1) g.add(cyl(0.016, 0.018, 0.008, '#0b0b0d', s * (armW - 0.01), -0.0, 0.035, { rough: 0.9 }, 10)); // pieds caoutchouc
  });
  const knob = cyl(0.024, 0.024, 0.016, '#0d0e10', 0, 0, 0, { rough: 0.8 }, 12);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(armW + 0.036, py, 0);
  g.add(knob);
  const L = new THREE.Group();
  L.position.set(0, py, 0);
  L.rotation.x = rad(o.tilt);
  g.add(L);
  return L;
}
function build(g, o, py, r, lamp) {
  const L = (o.mount | 0) > 0 ? mountedRig(g, o) : rig(g, o, py, r);
  lamp(L, o);
}
export function bPc750(g, o) { build(g, o, o.h * 0.45, 0.108, lampPC); }
export function bPar64(g, o) { build(g, o, o.h * 0.45, 0.106, lampPar64); }
export function bProfile(g, o) { build(g, o, o.h * 0.45, 0.09, lampProfile); }
export function bPar(g, o) { build(g, o, o.h * 0.45, o.w * 0.42, lampParLed); }
export function bPcLed(g, o) { build(g, o, o.h * 0.45, 0.108, lampPcLed); }

/* ---------- lyre asservie : la tête bascule entre les bras ---------- */
function movingMounted(g, o) {
  const G = mountGeom(o), yb = G.stand, py = yb + G.pivot;
  if ((o.mount | 0) === 2) tripod(g, yb, '#222428', Math.min(0.55, 0.2 + yb * 0.14));
  g.add(rbox(o.w * 0.78, 0.11, o.d * 0.7, 0.018, '#1b1c20', 0, yb, 0, { rough: 0.5 }));
  [-1, 1].forEach(s => g.add(rbox(0.03, G.pivot + 0.1 - 0.11, 0.1, 0.01, '#232529', s * o.w * 0.38, yb + 0.11, 0)));
  const L = new THREE.Group();
  L.position.set(0, py, 0);
  L.rotation.x = rad(o.tilt);
  g.add(L);
  zcyl(L, o.w * 0.3, o.w * 0.26, o.d * 0.62, 0, '#17181b', { rough: 0.45, metal: 0.4 }, 22);
  L.add(disc(o.w * 0.26, o.color || '#9fe0ff', 0, 0, o.d * 0.31 + 0.002, lensMat(o.color || '#9fe0ff', 1.0), 24));
}
export function bMovingHead(g, o) {
  if ((o.mount | 0) > 0) return movingMounted(g, o);
  const h = o.h, py = h * 0.42;
  const hk = tor(0.032, 0.006, '#c9ced6', 0, h + 0.03, 0, ALU, false);
  hk.rotation.y = Math.PI / 2;
  g.add(hk);
  g.add(box(0.06, 0.012, 0.05, '#2d323d', 0, h, 0, STEEL));
  g.add(rbox(o.w * 0.78, 0.11, o.d * 0.7, 0.018, '#1b1c20', 0, h - 0.115, 0, { rough: 0.5 }));
  [-1, 1].forEach(s => g.add(rbox(0.03, h * 0.66, 0.1, 0.01, '#232529', s * o.w * 0.38, py - h * 0.22, 0)));
  const L = new THREE.Group();
  L.position.set(0, py, 0);
  L.rotation.x = rad(o.tilt);
  g.add(L);
  zcyl(L, o.w * 0.3, o.w * 0.26, o.d * 0.62, 0, '#17181b', { rough: 0.45, metal: 0.4 }, 22);
  L.add(disc(o.w * 0.26, o.color || '#9fe0ff', 0, 0, o.d * 0.31 + 0.002, lensMat(o.color || '#9fe0ff', 1.0), 24));
}

/* ---------- barre LED : le corps bascule ; opt 0 = horizontale (w = longueur), opt 1 = verticale (h = longueur) ---------- */
export function bLedBar(g, o) {
  const vert = (o.opt | 0) === 1, col = o.color || '#7fe0ff';
  const L = new THREE.Group();
  L.position.set(0, o.h / 2, 0);
  L.rotation.x = rad(o.tilt);
  g.add(L);
  L.add(rbox(o.w, o.h, o.d, 0.012, '#1a1b1e', 0, -o.h / 2, 0, { rough: 0.5 }));
  const len = vert ? o.h : o.w, n = Math.max(2, Math.round(len / 0.07));
  for (let i = 0; i < n; i++) {
    const u = -len / 2 + 0.05 + ((len - 0.1) * i) / (n - 1);
    L.add(sph(0.016, col, vert ? 0 : u, vert ? u : 0, o.d / 2, { emissive: col, ei: 1.2 }, 8));
  }
  if (vert) {
    // embase à plat : le corps tient debout dessus
    g.add(box(Math.max(0.22, o.w * 2.2), 0.016, Math.max(0.2, o.d * 2), '#2d323d', 0, 0.008, 0, STEEL));
    g.add(box(0.03, 0.05, 0.03, '#2d323d', 0, 0.04, 0, STEEL));
  } else {
    [-1, 1].forEach(s => g.add(box(0.012, o.h * 1.5, 0.05, '#2d323d', s * (o.w / 2 - 0.05), -o.h * 0.25, 0, STEEL)));
  }
}

/* ---------- guirlande (type guinguette) : fil en chaînette, douilles et ampoules ---------- */
const MULTI = ['#ff5a4a', '#ffd23d', '#4fd36a', '#4aa8ff', '#c36cff'];
export function bGarland(g, o) {
  const w = o.w, H = o.h, sag = Math.max(0.05, H - 0.11);
  const yAt = t => H - sag * 4 * t * (1 - t);
  const N = Math.max(10, Math.round(w * 6));
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([-w / 2 + w * t, yAt(t), 0]); }
  g.add(tube(pts, 0.004, '#101113', { rough: 0.7 }, N * 2, 5));
  [-1, 1].forEach(s => g.add(tor(0.012, 0.0035, '#c9ced6', s * w / 2, H, 0, ALU, false)));
  const n = Math.max(2, Math.round(w / 0.45));
  const opt = o.opt | 0;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, x = -w / 2 + w * t, y = yAt(t);
    const col = opt === 1 ? MULTI[k % MULTI.length] : opt === 2 ? (o.color || '#ffcf7a') : opt === 3 ? '#e6f1ff' : '#ffcf7a';
    g.add(cyl(0.0085, 0.0085, 0.04, '#101113', x, y - 0.04, 0, { rough: 0.6 }, 8));
    g.add(sph(0.028, col, x, y - 0.062, 0, { emissive: col, ei: 1.5, rough: 0.2 }, 14));
  }
  // zone de sélection transparente
  const pick = new THREE.Mesh(new THREE.BoxGeometry(w, H, 0.12), mat('#ffffff', { opacity: 0 }));
  pick.position.set(0, H / 2, 0);
  g.add(pick);
}

/* ---------- pendrillon noir plissé (sur pieds ou suspendu) ---------- */
export function bPendrillon(g, o) {
  const stands = o.type === 'pendrillon';
  const { w, h, d } = o;
  const top = h - (stands ? 0.05 : 0.04), bot = stands ? 0.07 : 0.03, fh = top - bot - 0.06;
  const fw = stands ? w - 0.08 : w - 0.02;
  const seg = Math.max(14, Math.round(fw / 0.05));
  const geo = new THREE.PlaneGeometry(fw, fh, seg, 8);
  const p = geo.attributes.position, amp = Math.min(d / 2, 0.07);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.sin(((x + fw / 2) / 0.13) * Math.PI * 2) * amp * (0.9 + 0.1 * (y / fh)));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(o.color, { rough: 1, side: THREE.DoubleSide }));
  m.position.set(0, bot + fh / 2, 0);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.add(box(fw, 0.06, 0.02, '#17181b', 0, top - 0.06, 0, { rough: 1 })); // ruban de tête
  g.add(box(fw, 0.018, 0.024, '#08090a', 0, bot - 0.006, 0, { rough: 0.9 })); // lestage
  const bar = cyl(0.0125, 0.0125, w, '#9aa1ad', 0, 0, 0, ALU, 10);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, top + 0.01, 0);
  g.add(bar);
  if (stands) {
    [-1, 1].forEach(s => {
      const x = s * (w / 2 - 0.02);
      g.add(cyl(0.0125, 0.0125, h - 0.04, '#9aa1ad', x, 0.03, 0, ALU, 10));
      g.add(cyl(0.02, 0.02, 0.05, '#17181b', x, h * 0.45, 0, { rough: 0.8 }, 10));
      g.add(box(0.036, 0.036, 0.036, '#17181b', x, top - 0.012, 0));
      // base en croix
      const L = Math.min(0.46, d * 0.95);
      g.add(box(0.03, 0.025, L, '#2d323d', x, 0.012, 0, STEEL));
      g.add(box(L, 0.025, 0.03, '#2d323d', x, 0.012, 0, STEEL));
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ax, az]) => g.add(cyl(0.02, 0.022, 0.014, '#0b0b0d', x + ax * L / 2, 0, az * L / 2, { rough: 0.9 }, 10)));
    });
  } else {
    [-1, 1].forEach(s => g.add(cyl(0.014, 0.014, 0.05, '#c9ced6', s * (w / 2 - 0.06), top + 0.02, 0, ALU, 8)));
  }
}

/* ---------- pied lumière T-bar + 2 PAR orientables ---------- */
export function bTotem(g, o) {
  tripod(g, o.h, '#222428', 0.44);
  const bw = Math.min(1.5, o.w * 2.2);
  g.add(rbox(bw, 0.04, 0.04, 0.01, '#b4bac4', 0, o.h - 0.04, 0, ALU));
  [-1, 1].forEach(s => {
    const p = new THREE.Group();
    bPar(p, { ...o, w: 0.2, h: 0.4, d: 0.26, color: o.color2 || '#ffd9a0' });
    p.position.set(s * bw * 0.36, o.h - 0.4 - 0.04, 0);
    g.add(p);
  });
}

/* ---------- pied de lumière : trépied télescopique, option T-bar (seule ou avec 2 / 4 PAR LED) ---------- */
export function bLightStand(g, o) {
  const cfg = o.cfg | 0;
  if (cfg === 0) {
    tripod(g, o.h - 0.06, '#222428', Math.min(0.5, 0.2 + o.h * 0.1));
    g.add(cyl(0.0145, 0.0145, 0.075, '#c8cdd5', 0, o.h - 0.075, 0, { metal: 0.85, rough: 0.22 }, 12)); // tourillon 28 mm
    g.add(cyl(0.021, 0.021, 0.012, '#111214', 0, o.h - 0.083, 0, null, 12));
    return;
  }
  tripod(g, o.h, '#222428', Math.min(0.5, 0.2 + o.h * 0.1));
  const bw = Math.min(1.5, Math.max(0.9, o.w * 2.2));
  g.add(rbox(bw, 0.04, 0.04, 0.01, '#b4bac4', 0, o.h - 0.04, 0, ALU));
  if (cfg === 1) return;
  const n = cfg === 2 ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Group();
    bPar(p, { ...o, w: 0.2, h: 0.4, d: 0.26, color: o.color2 || '#ffd9a0' });
    p.position.set((i - (n - 1) / 2) * (n === 2 ? bw * 0.72 : bw * 0.27), o.h - 0.44, 0);
    g.add(p);
  }
}

/* ---------- splitter DMX : boîtier 1 → 4 ou rack 1U 1 → 8, connecteurs XLR 5 broches à l'arrière ---------- */
const dmxTex = (n, rack) => canvasTex('dmxsplit|' + n + '|' + (rack ? 1 : 0), 1024, rack ? 90 : 300, (c, W, H) => {
  c.fillStyle = '#25272c'; c.fillRect(0, 0, W, H);
  const f = Math.round(H * (rack ? 0.3 : 0.12));
  c.fillStyle = '#e6e9ee'; c.font = '800 ' + f + 'px "Segoe UI", Arial'; c.textBaseline = 'middle'; c.textAlign = 'left';
  c.fillText('DMX SPLITTER', W * 0.04, H * (rack ? 0.5 : 0.22));
  c.font = '700 ' + Math.round(f * 0.62) + 'px "Segoe UI", Arial'; c.textAlign = 'center';
  const x0 = W * (rack ? 0.4 : 0.1), x1 = W * 0.95;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n, y = H * (rack ? 0.64 : 0.62);
    c.fillStyle = '#58e06b'; c.beginPath(); c.arc(x, y, H * (rack ? 0.1 : 0.05), 0, 7); c.fill();
    c.fillStyle = '#c9ced6'; c.fillText(String(i + 1), x, y - H * (rack ? 0.3 : 0.17));
  }
  c.fillStyle = '#c5303a'; c.beginPath(); c.arc(W * 0.35, H * (rack ? 0.64 : 0.82), H * (rack ? 0.1 : 0.05), 0, 7); c.fill();
  c.fillStyle = '#c9ced6'; c.fillText('PWR', W * 0.35, H * (rack ? 0.3 : 0.7));
});
export function bDmxSplit(g, o) {
  const n = o.outs | 0 || 8, rack = o.w > 0.4;
  g.add(rbox(o.w, o.h, o.d, 0.004, '#2a2c31', 0, 0, 0, { metal: 0.3, rough: 0.5 }));
  // façade (rack) ou dessus (boîtier) : texte et voyants
  if (rack) {
    g.add(texPlane(o.w - 0.034, o.h - 0.008, dmxTex(n, true), 0, o.h / 2, o.d / 2 + 0.0012, { rough: 0.45 }));
    [-1, 1].forEach(s => g.add(rbox(0.017, o.h, 0.004, 0.001, '#b9bec7', s * (o.w / 2 - 0.0085), 0, o.d / 2 + 0.002, ALU)));
  } else {
    const t = texPlane(o.w - 0.02, o.d - 0.03, dmxTex(n, false), 0, 0, 0, { rough: 0.45 });
    t.rotation.x = -Math.PI / 2; t.position.set(0, o.h + 0.0012, 0);
    g.add(t);
  }
  // connecteurs XLR 5 : entrée, sortie « thru » et n sorties
  const nC = n + 2, x0 = -o.w * 0.44, sp = (o.w * 0.88) / (nC - 1);
  for (let i = 0; i < nC; i++) {
    const x = x0 + i * sp, y = o.h * 0.5, z = -o.d / 2;
    const ring = cyl(0.0125, 0.0125, 0.012, '#c9ced6', 0, 0, 0, ALU, 16); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z - 0.004); g.add(ring);
    const hole = cyl(0.0095, 0.0095, 0.014, '#050506', 0, 0, 0, null, 14); hole.rotation.x = Math.PI / 2; hole.position.set(x, y, z - 0.0045); g.add(hole);
    g.add(sph(0.0016, '#c9a24a', x - 0.004, y + 0.003, z - 0.0115, ALU, 5));
    g.add(sph(0.0016, '#c9a24a', x + 0.004, y + 0.003, z - 0.0115, ALU, 5));
    g.add(sph(0.0016, '#c9a24a', x, y - 0.004, z - 0.0115, ALU, 5));
  }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.007, 0.008, 0.003, '#0b0b0d', sx * (o.w / 2 - 0.016), -0.0005, sz * (o.d / 2 - 0.016), null, 8)));
}
