// Modèles 3D : sonorisation (enceintes amplifiées, passives, subs, retours, pieds, line arrays).
// Repère local : origine au centre de la base, +Z = face avant, +Y = haut.
import { THREE, mat, shade, box, rbox, cyl, sph, tor, plane, disc, strut, prism, profile, slopePlane, texPlane } from './gfx.js';
import { spkGrilleTex } from './textures.js';

const BLK = '#0c0d0f';

/* ---------- pied d'enceinte tripode (la hauteur h est celle du haut du mât) ---------- */
export function tripod(g, h, color = '#1b1c1f', spread = 0.42) {
  const collarY = 0.45, steel = { metal: 0.55, rough: 0.4 };
  g.add(cyl(0.05, 0.05, 0.1, color, 0, collarY - 0.05, 0, steel, 16));
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    g.add(strut([c * 0.045, collarY - 0.03, s * 0.045], [c * spread, 0.03, s * spread], 0.0125, color, steel));
    g.add(strut([c * 0.045, collarY - 0.28, s * 0.045], [c * spread * 0.62, 0.2, s * spread * 0.62], 0.006, '#8d939d', { metal: 0.7, rough: 0.35 }, 6));
    g.add(cyl(0.02, 0.022, 0.03, '#0b0b0d', c * spread, 0, s * spread, { rough: 0.9 }, 12));
  }
  g.add(cyl(0.02, 0.02, (h - collarY) * 0.55 + 0.1, '#232529', 0, collarY, 0, steel, 16));
  g.add(cyl(0.0155, 0.0155, (h - collarY) * 0.5, '#c8cdd5', 0, collarY + (h - collarY) * 0.5, 0, { metal: 0.85, rough: 0.22 }, 16));
  const k = cyl(0.011, 0.011, 0.05, '#d4432f', 0.035, collarY + (h - collarY) * 0.55, 0, { rough: 0.5 }, 10);
  k.rotation.z = Math.PI / 2;
  g.add(k);
  g.add(cyl(0.024, 0.024, 0.012, '#111214', 0, h - 0.012, 0, null, 14));
}

/* ---------- caisson trapézoïdal (façade / retour sur pied), actif ou passif ---------- */
function trapCab(g, w, h, d, y0, color, active, kind) {
  const rw = w * 0.6, bev = Math.min(0.012, w * 0.04);
  const cab = prism([[-w / 2 + bev, d / 2 - bev], [w / 2 - bev, d / 2 - bev], [rw / 2 - bev, -d / 2 + bev], [-rw / 2 + bev, -d / 2 + bev]], h, bev, color, { rough: 0.55, cc: 0.15 });
  cab.position.y = y0;
  g.add(cab);
  g.add(texPlane(w - 0.026, h - 0.026, spkGrilleTex(kind, w, h), 0, y0 + h / 2, d / 2 + 0.0015, { rough: 0.75 }));
  // poignée de dessus + logo
  g.add(rbox(Math.min(0.17, w * 0.45), 0.006, 0.05, 0.003, BLK, 0, y0 + h - 0.003, -d * 0.12));
  // face arrière : radiateur à ailettes (actif) ou plaque Speakon (passif)
  if (active) {
    g.add(box(rw * 0.8, h * 0.62, 0.012, '#26282c', 0, y0 + h * 0.1, -d / 2 - 0.004, { metal: 0.6, rough: 0.45 }));
    for (let i = 0; i < 9; i++) g.add(box(0.005, h * 0.58, 0.026, '#3a3d44', -rw * 0.34 + (rw * 0.68 * i) / 8, y0 + h * 0.12, -d / 2 - 0.016, { metal: 0.6, rough: 0.4 }));
    g.add(rbox(0.14, 0.07, 0.014, 0.004, '#c9ced6', 0, y0 + h * 0.8, -d / 2 - 0.006, { metal: 0.7, rough: 0.3 }));
    [-0.035, 0.035].forEach(x => g.add(cyl(0.011, 0.011, 0.006, BLK, x, y0 + h * 0.8 + 0.018, -d / 2 - 0.012, null, 12).rotateX(Math.PI / 2)));
  } else {
    g.add(rbox(0.1, 0.06, 0.012, 0.003, '#c9ced6', 0, y0 + h * 0.5, -d / 2 - 0.004, { metal: 0.7, rough: 0.3 }));
    [-0.025, 0.025].forEach(x => g.add(cyl(0.012, 0.012, 0.01, BLK, x, y0 + h * 0.5, -d / 2 - 0.01, null, 12).rotateX(Math.PI / 2)));
  }
  // pied de pole-mount sous le caisson
  g.add(cyl(0.032, 0.032, 0.006, '#111214', 0, y0 - 0.002, 0, null, 14));
}
export function bTopStand(g, o) {
  const active = !!o.active;
  const cabH = Math.min(0.62, o.h * 0.4), poleH = Math.max(0.3, o.h - cabH);
  tripod(g, poleH);
  trapCab(g, o.w, cabH, o.d, poleH, o.color, active, 'top');
}
export function bActiveBox(g, o) {
  trapCab(g, o.w, o.h, o.d, 0, o.color, o.active !== false, 'top');
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.017, 0.019, 0.012, '#0b0b0d', sx * o.w * 0.32, -0.0, sz * o.d * 0.3, { rough: 0.9 }, 10)));
}
export function bSpeakerStand(g, o) {
  tripod(g, o.h);
  g.add(cyl(0.012, 0.012, 0.06, '#c8cdd5', 0, o.h, 0, { metal: 0.85, rough: 0.22 }, 12));
}

/* ---------- caisson de grave ---------- */
export function bSub(g, o) {
  const { w, h, d } = o, act = !!o.active;
  g.add(rbox(w, h, d, 0.014, o.color, 0, 0, 0, { rough: 0.55, cc: 0.12 }));
  g.add(texPlane(w - 0.03, h - 0.03, spkGrilleTex('sub', w, h), 0, h / 2, d / 2 + 0.0015, { rough: 0.75 }));
  [-1, 1].forEach(s => g.add(rbox(0.012, 0.075, 0.2, 0.004, BLK, s * (w / 2 - 0.002), h * 0.5 - 0.0375, 0)));
  g.add(cyl(0.036, 0.036, 0.006, '#111214', 0, h - 0.002, 0, null, 14));
  // arête métallique
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.03, 0.03, 0.03, '#2d3036', sx * (w / 2 - 0.012), h - 0.02, sz * (d / 2 - 0.012), { metal: 0.6 })));
  // face arrière
  if (act) {
    g.add(box(w * 0.7, h * 0.62, 0.012, '#26282c', 0, h * 0.14, -d / 2 - 0.004, { metal: 0.6, rough: 0.45 }));
    for (let i = 0; i < 10; i++) g.add(box(0.005, h * 0.55, 0.024, '#3a3d44', -w * 0.29 + (w * 0.58 * i) / 9, h * 0.17, -d / 2 - 0.014, { metal: 0.6, rough: 0.4 }));
  } else {
    g.add(rbox(0.16, 0.07, 0.012, 0.004, '#c9ced6', 0, h * 0.5, -d / 2 - 0.004, { metal: 0.7, rough: 0.3 }));
  }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.025, 0.028, 0.012, '#0b0b0d', sx * (w / 2 - 0.06), -0.0, sz * (d / 2 - 0.06), { rough: 0.9 }, 10)));
}

/* ---------- retour de scène (wedge) passif / actif ---------- */
export function bWedge(g, o) {
  const { w, d, h } = o, act = !!o.active, front = Math.min(0.14, h * 0.45);
  g.add(profile([[-d / 2, 0], [d / 2, 0], [d / 2, front], [-d / 2, h]], w, o.color, { rough: 0.55, cc: 0.12 }));
  const pts = [[d / 2 - 0.01, front + 0.004], [-d / 2 + 0.012, h - 0.004]];
  const sl = slopePlane(w - 0.04, pts[0], pts[1], mat('#ffffff', { map: spkGrilleTex(o.grille || 'top', w - 0.04, Math.hypot(d, h - front)), rough: 0.75 }), null, 0.0015);
  g.add(sl);
  // arêtes et poignées
  g.add(rbox(w * 0.3, 0.012, 0.05, 0.004, BLK, 0, h - 0.004, -d / 2 + 0.05));
  [-1, 1].forEach(s => g.add(rbox(0.012, 0.05, 0.14, 0.004, BLK, s * (w / 2 - 0.003), h * 0.4, -d * 0.1)));
  if (act) {
    g.add(box(w * 0.66, h * 0.56, 0.012, '#26282c', 0, h * 0.14, -d / 2 - 0.004, { metal: 0.6, rough: 0.45 }));
    for (let i = 0; i < 9; i++) g.add(box(0.005, h * 0.5, 0.022, '#3a3d44', -w * 0.27 + (w * 0.54 * i) / 8, h * 0.17, -d / 2 - 0.014, { metal: 0.6, rough: 0.4 }));
  } else g.add(rbox(0.1, 0.05, 0.01, 0.003, '#c9ced6', 0, h * 0.45, -d / 2 - 0.004, { metal: 0.7, rough: 0.3 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.02, 0.022, 0.01, '#0b0b0d', sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), { rough: 0.9 }, 10)));
}

/* ---------- colonne PA (sub intégré + tête verticale à 8 transducteurs) ---------- */
export function bColumn(g, o) {
  const subH = o.h * 0.3, colH = o.h - subH - 0.02;
  g.add(rbox(o.w, subH, o.d, 0.012, o.color, 0, 0, 0, { rough: 0.55, cc: 0.12 }));
  g.add(texPlane(o.w - 0.03, subH - 0.03, spkGrilleTex('sub', o.w, subH), 0, subH / 2, o.d / 2 + 0.0015, { rough: 0.75 }));
  g.add(cyl(0.022, 0.022, 0.05, '#c8cdd5', 0, subH, 0, { metal: 0.85, rough: 0.25 }, 14));
  const cw = o.w * 0.34, cd = o.d * 0.42;
  g.add(rbox(cw, colH, cd, 0.01, '#1a1b1e', 0, subH + 0.02, 0, { rough: 0.5, cc: 0.15 }));
  g.add(texPlane(cw - 0.014, colH - 0.04, spkGrilleTex('la', cw, colH * 0.5), 0, subH + 0.02 + colH / 2, cd / 2 + 0.0015, { rough: 0.75 }));
  for (let i = 0; i < 8; i++) g.add(disc(cw * 0.3, '#2a2c31', 0, subH + 0.06 + ((colH - 0.1) * (i + 0.5)) / 8, cd / 2 + 0.003, { rough: 0.6 }, 16));
  g.add(box(o.w * 0.7, 0.012, o.d * 0.7, '#0b0b0d', 0, -0.0, 0));
}

/* ---------- line array ---------- */
export function bLineArray(g, o) {
  const n = Math.max(2, Math.round(o.h / 0.3)), eh = o.h / n;
  const steel = { metal: 0.75, rough: 0.35 };
  // bumper
  g.add(rbox(o.w * 0.96, 0.05, o.d * 0.9, 0.006, '#9aa0aa', 0, o.h, 0, steel));
  g.add(box(o.w * 0.9, 0.03, 0.03, '#c3c8d0', 0, o.h + 0.05, -o.d * 0.3, steel));
  g.add(box(o.w * 0.9, 0.03, 0.03, '#c3c8d0', 0, o.h + 0.05, o.d * 0.3, steel));
  [-1, 1].forEach(s => {
    g.add(tor(0.028, 0.006, '#d6dae0', s * o.w * 0.3, o.h + 0.12, 0, steel, false));
    g.add(cyl(0.005, 0.005, 0.3, '#8d939d', s * o.w * 0.3, o.h + 0.14, 0, steel, 6));
  });
  for (let i = 0; i < n; i++) {
    const e = new THREE.Group();
    e.add(rbox(o.w, eh * 0.955, o.d, 0.012, o.color, 0, -eh * 0.4775, 0, { rough: 0.55, cc: 0.12 }));
    e.add(texPlane(o.w * 0.92, eh * 0.78, spkGrilleTex('la', o.w, eh), 0, 0, o.d / 2 + 0.0015, { rough: 0.75 }));
    [-1, 1].forEach(s => {
      e.add(box(0.006, eh * 0.8, o.d * 0.7, '#a7adb7', s * (o.w / 2 + 0.002), -eh * 0.4, 0, steel));
      e.add(cyl(0.01, 0.01, 0.012, '#d6dae0', s * (o.w / 2 + 0.008), -eh * 0.1, o.d * 0.28, steel, 8).rotateZ(Math.PI / 2));
    });
    e.position.set(0, o.h - (i + 0.5) * eh, 0);
    e.rotation.x = i * 0.04;
    g.add(e);
  }
}
