// Modèles 3D : musiciens articulés (squelette + cinématique inverse à deux segments pour les bras et les jambes).
// Repère local : origine au centre des pieds, +Z = face avant, +Y = haut. Côté gauche du personnage = +X.
import { THREE, box, rbox, cyl, sph, limb, tube, mat } from './gfx.js';
import { micModel, guitarModel } from './models_backline.js';

const SKIN = ['#f0c9a8', '#c8946a', '#7a4b2e'];
const HAIRC = ['#2b2220', '#6b4423', '#c9a35a', '#8d8d90'];
export const POSE_NAMES = ['Debout', 'Chanteur / chanteuse (micro en main)', 'Guitariste (guitare en bandoulière)', 'Bassiste (basse en bandoulière)', 'Batteur (assis)', 'Claviériste (debout)'];
export const HAIR_NAMES = ['Cheveux courts', 'Cheveux longs', 'Chauve', 'Casquette'];
export const SKIN_NAMES = ['Peau claire', 'Peau mate', 'Peau foncée'];

// hanche (hipY), inclinaison du buste (lean), cibles des poignets (aL / aR) et des chevilles (fL / fR) pour un personnage de 1,75 m
const POSES = [
  { hipY: 0.95, lean: 0, aL: [0.27, 0.9, 0.05], aR: [-0.27, 0.9, 0.05], fL: [0.1, 0.085, 0], fR: [-0.1, 0.085, 0], pole: [0.5, -0.3, -0.7] },
  { hipY: 0.94, lean: 0.03, aL: [0.42, 1.2, 0.22], aR: [-0.1, 1.5, 0.2], fL: [0.18, 0.085, 0.1], fR: [-0.16, 0.085, -0.1], pole: [0.6, -0.4, -0.5], mic: true },
  { hipY: 0.94, lean: 0, aL: [0.47, 1.2, 0.2], aR: [-0.08, 0.98, 0.2], fL: [0.2, 0.085, 0.05], fR: [-0.18, 0.085, -0.05], pole: [0.6, -0.5, -0.4], guitar: 'strat' },
  { hipY: 0.94, lean: 0, aL: [0.64, 1.16, 0.2], aR: [-0.08, 0.98, 0.2], fL: [0.2, 0.085, 0.05], fR: [-0.18, 0.085, -0.05], pole: [0.6, -0.5, -0.4], guitar: 'bass' },
  { hipY: 0.52, hipZ: -0.05, lean: 0.14, aL: [0.24, 0.88, 0.42], aR: [-0.24, 0.88, 0.42], fL: [0.14, 0.1, 0.4], fR: [-0.14, 0.1, 0.4], pole: [0.8, -0.5, 0], kneeUp: true, sticks: true },
  { hipY: 0.95, lean: 0.08, aL: [0.2, 1.0, 0.42], aR: [-0.2, 1.0, 0.42], fL: [0.12, 0.085, 0.02], fR: [-0.12, 0.085, 0.02], pole: [0.8, -0.5, 0] },
];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// cinématique inverse à deux segments : coude / genou entre l'origine S et la cible W
function ik(S, W, L1, L2, pole) {
  const d = Math.max(0.05, Math.min(S.distanceTo(W), L1 + L2 - 0.002)), dir = W.clone().sub(S).normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (p.lengthSq() < 1e-6) p.set(0, 0, -1);
  p.normalize();
  return { E: S.clone().addScaledVector(dir, a).addScaledVector(p, hh), W: S.clone().addScaledVector(dir, d) };
}
const arr = v => [v.x, v.y, v.z];

export function bPerson(g, o) {
  const pose = (o.pose | 0) in POSES ? o.pose | 0 : 0, cfg = POSES[pose];
  const s = o.h / (pose === 4 ? 1.35 : 1.75);
  const P = new THREE.Group();
  P.scale.setScalar(s);
  g.add(P);
  const skin = SKIN[o.skin | 0] || SKIN[0], shirt = o.color, pants = '#262a33', shoe = '#17181b';
  const hairC = HAIRC[Math.abs(o.id | 0) % 4];
  const R = { rough: 0.85 }, SK = { rough: 0.65 };
  const hip = V(0, cfg.hipY, cfg.hipZ || 0);
  const Rl = new THREE.Matrix4().makeRotationX(cfg.lean);
  const up = (x, y, z) => V(x, y, z).applyMatrix4(Rl).add(hip);

  /* --- buste : bassin, ventre, poitrine, cou, tête --- */
  const T = new THREE.Group();
  T.position.copy(hip);
  T.rotation.x = cfg.lean;
  P.add(T);
  const pel = sph(0.13, pants, 0, 0.0, 0, R, 16); pel.scale.set(1.12, 0.78, 0.8); T.add(pel);
  const belly = limb([0, 0.0, 0], [0, 0.4, 0], 0.125, 0.16, shirt, R, 16); belly.scale.set(1.12, 1, 0.78); T.add(belly);
  const chest = sph(0.17, shirt, 0, 0.41, 0, R, 18); chest.scale.set(1.05, 0.95, 0.72); T.add(chest);
  const sL = up(0.2, 0.5, 0), sR = up(-0.2, 0.5, 0);
  [sL, sR].forEach(p => P.add(sph(0.062, shirt, p.x, p.y, p.z, R, 12)));
  const nk0 = up(0, 0.56, 0), nk1 = up(0, 0.67, 0.012), hd = up(0, 0.76, 0.02);
  P.add(limb(arr(nk0), arr(nk1), 0.05, 0.043, skin, SK, 10));
  const head = sph(0.1, skin, hd.x, hd.y, hd.z, SK, 20); head.scale.set(0.93, 1.12, 1.02); P.add(head);
  P.add(sph(0.014, skin, hd.x, hd.y - 0.012, hd.z + 0.1, SK, 8));
  [-1, 1].forEach(k => {
    P.add(sph(0.009, '#17181b', hd.x + k * 0.034, hd.y + 0.02, hd.z + 0.088, R, 6));
    P.add(sph(0.02, skin, hd.x + k * 0.092, hd.y - 0.005, hd.z - 0.005, SK, 8));
  });
  P.add(box(0.05, 0.005, 0.004, '#8a5a4a', hd.x, hd.y - 0.05, hd.z + 0.097, R));
  const hs = o.hair | 0;
  if (hs === 0 || hs === 1) {
    const hair = sph(0.108, hairC, hd.x, hd.y + 0.025, hd.z - 0.022, R, 18); hair.scale.set(0.96, 1.05, 1.04); P.add(hair);
    if (hs === 1) { const lg = limb([hd.x, hd.y, hd.z - 0.085], [hd.x, hd.y - 0.3, hd.z - 0.1], 0.1, 0.07, hairC, R, 12); lg.scale.set(1.0, 1, 0.55); P.add(lg); }
  } else if (hs === 3) {
    const cap = sph(0.108, '#2a3f66', hd.x, hd.y + 0.03, hd.z - 0.01, R, 16); cap.scale.set(0.96, 0.78, 1.04); P.add(cap);
    P.add(box(0.12, 0.008, 0.09, '#2a3f66', hd.x, hd.y + 0.055, hd.z + 0.1, R));
  }

  /* --- jambes --- */
  [[1, cfg.fL], [-1, cfg.fR]].forEach(([k, f]) => {
    const H = V(k * 0.095, cfg.hipY - 0.02, hip.z), A = V(f[0], f[1] + 0.06, f[2]);
    const { E: K, W: Ac } = ik(H, A, 0.45, 0.43, cfg.kneeUp ? V(k * 0.25, 0.7, 1) : V(k * 0.05, 0.1, 1));
    P.add(limb(arr(H), arr(K), 0.078, 0.058, pants, R, 12));
    P.add(sph(0.058, pants, K.x, K.y, K.z, R, 10));
    P.add(limb(arr(K), arr(Ac), 0.056, 0.04, pants, R, 10));
    P.add(rbox(0.1, 0.075, 0.27, 0.025, shoe, Ac.x - 0.05 * 0 - 0.05, Ac.y - 0.06, Ac.z - 0.06, { rough: 0.7 }).translateX(0.05));
    P.add(box(0.1, 0.014, 0.28, '#d9dce2', Ac.x, Ac.y - 0.072, Ac.z + 0.07, R));
  });

  /* --- bras --- */
  const wr = {};
  [[1, cfg.aL, sL], [-1, cfg.aR, sR]].forEach(([k, a, S]) => {
    const Wt = V(a[0], a[1], a[2]);
    const pl = V(k * cfg.pole[0], cfg.pole[1], cfg.pole[2]);
    const { E, W } = ik(S, Wt, 0.29, 0.26, pl);
    P.add(limb(arr(S), arr(E), 0.052, 0.042, shirt, R, 10));
    P.add(sph(0.042, shirt, E.x, E.y, E.z, R, 10));
    P.add(limb(arr(E), arr(W), 0.04, 0.032, skin, SK, 10));
    const dir = W.clone().sub(E).normalize(), hp = W.clone().addScaledVector(dir, 0.04);
    const hand = sph(0.042, skin, hp.x, hp.y, hp.z, SK, 10); hand.scale.set(0.8, 1, 1.2); P.add(hand);
    wr[k] = { W, hp };
  });

  /* --- accessoires --- */
  if (cfg.mic) {
    const m = micModel(0, false);
    const from = wr[-1].hp, to = V(hd.x, hd.y - 0.04, hd.z + 0.1);
    const dir = to.clone().sub(from).normalize();
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    m.position.copy(from).addScaledVector(dir, -0.06);
    P.add(m);
  }
  if (cfg.guitar) {
    const gt = guitarModel(cfg.guitar, cfg.guitar === 'bass' ? '#2a5fa8' : '#c4361d');
    gt.rotation.set(0, 0, -Math.PI / 2 + 0.38);
    gt.position.copy(up(-0.22, 0.04, 0.19));
    gt.scale.setScalar(1);
    P.add(gt);
    const strap = tube([arr(up(0.1, 0.18, 0.19)), arr(up(0.2, 0.52, 0.04)), arr(up(0.06, 0.46, -0.14)), arr(up(-0.2, 0.06, -0.1)), arr(up(-0.22, 0.04, 0.15))], 0.017, '#17181b', R, 24, 6);
    strap.scale.set(1, 1, 1);
    P.add(strap);
  }
  if (cfg.sticks) [1, -1].forEach(k => {
    const h0 = wr[k].hp;
    P.add(limb(arr(h0.clone().add(V(0, 0.03, -0.1))), arr(h0.clone().add(V(-k * 0.03, -0.06, 0.26))), 0.007, 0.005, '#d9b37a', { rough: 0.6 }, 6));
  });
}
