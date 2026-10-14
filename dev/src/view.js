// Rendu 3D (three.js), caméras, navigation clavier/souris, sélection, déplacement, outils mesure / câble / placement, export d'images.
import * as THREE from 'three';
import { def, buildObjectMesh, flatText, CABLE_KINDS } from './catalog.js';
import { applyEnvironment } from './gfx.js';
import { floorDef, floorTexture } from './floors.js';
import { tr } from './i18n.js';
import * as st from './store.js';

const { T, sel } = st;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// deux thèmes : « aero » (clair, Y2K / Frutiger Aero) et « dark » (sobre)
const THEMES = {
  // interface Aero, mais sol de scène sombre (les objets sombres et les câbles ressortent mieux)
  aero: {
    floor: '#232a36', slabSide: '#7cc4e6', gridMinor: '#2c3443', grid1: '#374258', grid5: '#53627f',
    outline: '#58c4f0', cross: '#ff8a1f', text: '#7f9bbd', foot: '#d7e6f7', sel: '#ff8a00',
    measure: '#ff9a1f', measureSel: '#7be4ff', cableSel: '#ffffff', hemiGround: '#6f8aa6', env: 0.8,
  },
  // sol clair : réservé aux exports (fiche PDF, PNG) pour économiser l'encre
  print: {
    floor: '#edf6fc', slabSide: '#bfe6f8', gridMinor: '#d6e6f2', grid1: '#bcd4e8', grid5: '#8fb4d3',
    outline: '#2b86bf', cross: '#ff8a1f', text: '#5a87ac', foot: '#0d4a7a', sel: '#ff8a00',
    measure: '#ff7a00', measureSel: '#0a7fc4', cableSel: '#06385f', hemiGround: '#a9c9e2', env: 0.85,
  },
  dark: {
    floor: '#1d222c', slabSide: '#2b3240', gridMinor: '#242a36', grid1: '#2f384a', grid5: '#46526c',
    outline: '#7b88a8', cross: '#ffb02e', text: '#6c7a9c', foot: '#cfd9ee', sel: '#ffb02e',
    measure: '#ffd23d', measureSel: '#ffffff', cableSel: '#ffffff', hemiGround: '#3a3f4d', env: 0.55,
  },
};
// palette de la scène : sol sombre (réglage « Sol sombre ») ou clair ; les exports sont toujours clairs
function resolveTH() {
  if (T.theme === 'print' || !T.floorDark) return THEMES.print;
  return THEMES[T.theme] || THEMES.aero;
}
let TH = THEMES.aero;

let host, canvas, renderer, scene, persp, ortho, hemi, sun;
let gFloor, gObjs, gCables, gMeasures, gGhost, gTemp, gBeams;
let dirty = true, floorSig = '';
const views = new Map(); // id -> { group, sig, lsig, csig, selBox, foot, label, cov }
const orb = { tx: 0, ty: 1, tz: 2, yaw: 0.45, pitch: 0.62, dist: 30 };
const ort = { cx: 0, cy: 1.5, cz: 2, ppm: 38 };
let ghost = null, ghostObj = null, ghostType = null;
let mStart = null; // mesure en cours
let cPts = []; // câble en cours
let cursor = { x: 0, z: 0, valid: false };
let drag = null;
let marqueeEl, overlayEl, scaleEl, compassEl, stageEl;
let lastCompass = '';
const tagPool = [];
export const V = { onCursor: null, onHint: null };

export const cam = () => (T.view === '3d' ? persp : ortho);
export function invalidate() { dirty = true; }
export function stats() {
  let shown = 0, beams = 0, ghosted = 0, tags = 0;
  views.forEach(v => { if (v.group.visible) shown++; if (v.beam) beams++; if (v.ghost) ghosted++; if (v.tag) tags++; });
  return { objects: views.size, shown, beams, ghosted, tags, cables: gCables.children.length, measures: gMeasures.children.length };
}
const hint = t => V.onHint && V.onHint(tr(t));

/* ================= initialisation ================= */
export function init(hostEl) {
  host = hostEl;
  stageEl = hostEl;
  canvas = host.querySelector('canvas');
  marqueeEl = host.querySelector('#marquee');
  overlayEl = host.querySelector('#overlay');
  scaleEl = host.querySelector('#scalebar');
  compassEl = host.querySelector('#compass');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  persp = new THREE.PerspectiveCamera(45, 1, 0.05, 900);
  ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
  TH = resolveTH();
  document.body.dataset.theme = T.theme === 'dark' ? 'dark' : 'aero';
  applyEnvironment(renderer, scene, TH.env);
  hemi = new THREE.HemisphereLight('#ffffff', TH.hemiGround, 0.6);
  scene.add(hemi);
  sun = new THREE.DirectionalLight('#fffaf0', 2.3);
  sun.position.set(9, 20, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  [gFloor, gObjs, gCables, gMeasures, gGhost, gTemp, gBeams] = [0, 0, 0, 0, 0, 0, 0].map(() => { const g = new THREE.Group(); scene.add(g); return g; });

  new ResizeObserver(() => { resize(); }).observe(host);
  resize();
  bindPointer();
  st.on('change', () => { syncAll(); });
  st.on('selection', () => { syncSelection(); });
  st.on('moving', () => { syncTransforms(); });
  st.on('view', () => { host.dataset.view = T.view; invalidate(); });
  host.dataset.view = T.view;
  syncAll();
  requestAnimationFrame(loop);
}
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  invalidate();
}
let lastT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  stepNav(dt);
  stepTween(now);
  stepZoom(dt);
  if (!dirty) return;
  dirty = false;
  applyCamera(cam(), host.clientWidth, host.clientHeight);
  updateLabelScale();
  renderer.render(scene, cam());
  updateOverlays();
  updateCompass();
  const zi = zoomInfo().label;
  if (zi !== lastZoom) { lastZoom = zi; st.emit('zoom'); }
}
let lastZoom = '';

/* ================= caméras ================= */
function applyCamera(c, w, h, o = orb, r = ort) {
  if (T.view === '3d' || c === persp) {
    persp.aspect = w / h;
    persp.near = clamp(o.dist * 0.04, 0.01, 0.4); // plan proche plus loin = meilleure précision de profondeur (moins de flicker en zoom arrière)
    const cp = Math.cos(o.pitch);
    persp.position.set(o.tx + o.dist * cp * Math.sin(o.yaw), o.ty + o.dist * Math.sin(o.pitch), o.tz + o.dist * cp * Math.cos(o.yaw));
    persp.up.set(0, 1, 0);
    persp.lookAt(o.tx, o.ty, o.tz);
    persp.updateProjectionMatrix();
    persp.updateMatrixWorld();
    return;
  }
  ortho.left = -w / 2 / r.ppm; ortho.right = w / 2 / r.ppm;
  ortho.top = h / 2 / r.ppm; ortho.bottom = -h / 2 / r.ppm;
  if (T.view === 'plan') { ortho.position.set(r.cx, 300, r.cz); ortho.up.set(0, 0, -1); ortho.lookAt(r.cx, 0, r.cz); }
  else if (T.view === 'front') { ortho.position.set(r.cx, r.cy, r.cz + 300); ortho.up.set(0, 1, 0); ortho.lookAt(r.cx, r.cy, r.cz); }
  else { ortho.position.set(r.cx - 300, r.cy, r.cz); ortho.up.set(0, 1, 0); ortho.lookAt(r.cx, r.cy, r.cz); }
  ortho.updateProjectionMatrix();
  ortho.updateMatrixWorld();
}
export function setView(v) {
  if (v === T.view) return;
  tw = null;
  if (T.view === '3d' && v !== '3d') { ort.cx = orb.tx; ort.cz = orb.tz; }
  if (v === '3d' && T.view !== '3d') { orb.tx = ort.cx; orb.tz = ort.cz; }
  T.view = v;
  if (v === 'front' || v === 'side') ort.cy = 1.6;
  updateSun();
  syncFoot();
  host.dataset.view = v;
  st.emit('view');
  invalidate();
}
export function contentBounds(objs) {
  const S = st.S;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
  const add = (x, z) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); };
  (objs || S.objects.filter(st.isVisible)).forEach(o => {
    const e = st.extents(o);
    add(o.x - e.hx, o.z - e.hz); add(o.x + e.hx, o.z + e.hz);
    maxY = Math.max(maxY, o.y + o.h);
  });
  if (!objs) {
    if (!st.isGroupHidden('cables')) S.cables.forEach(c => c.pts.forEach(p => add(p[0], p[1])));
    if (!st.isGroupHidden('mesures')) S.measures.forEach(m => { add(m.a[0], m.a[1]); add(m.b[0], m.b[1]); });
  }
  if (!isFinite(minX)) { minX = -S.room.w / 2; maxX = S.room.w / 2; minZ = -S.room.back; maxZ = S.room.d - S.room.back; maxY = 3; }
  return { minX, maxX, minZ, maxZ, maxY };
}
export function frame(selectionOnly, resetAngle) {
  const objs = selectionOnly && sel.ids.size ? st.selObjs() : null;
  const b = contentBounds(objs);
  const w = host.clientWidth, h = host.clientHeight;
  const m = objs ? 0.8 : 3;
  const bw = b.maxX - b.minX + m, bd = b.maxZ - b.minZ + m;
  const minY = objs ? Math.min(...objs.map(o => o.y)) : 0;
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  const availH = Math.max(120, h - 130); // les barres d'outils recouvrent le haut de la vue
  const to = objs
    ? { tx: cx, tz: cz, ty: (minY + b.maxY) / 2, dist: clamp(Math.max(bw, bd, b.maxY - minY + 0.4) * 1.25 + 0.3, 0.6, 150) }
    : { tx: cx, tz: cz, ty: Math.min(1.5, b.maxY / 2), dist: clamp(Math.max(bw, bd) * 1.0 + 5, 4, 150) };
  ort.cx = cx;
  if (T.view === 'plan' || T.view === '3d') {
    ort.ppm = clamp(Math.min(w / bw, availH / bd), 6, 300);
    ort.cz = cz - 35 / ort.ppm;
  } else {
    const cy = Math.max(1.2, b.maxY / 2);
    ort.cz = cz;
    ort.ppm = clamp(Math.min(w / (T.view === 'front' ? bw : bd), availH / (b.maxY + 1.5)), 6, 300);
    ort.cy = cy + 35 / ort.ppm;
  }
  if (resetAngle) { to.yaw = 0.45; to.pitch = 0.62; }
  if (T.view === '3d') animateOrb(to, 500); else Object.assign(orb, to);
  updateSun();
  invalidate();
}
// réinitialise la vue : angle par défaut, tout le plan cadré, aucun mouvement en cours (si l'on est perdu dans la scène)
export function resetView() {
  tw = null; zq.k = 0; nav.vel.set(0, 0, 0); nav.keys.clear();
  frame(false, true);
}
// en vue Plan, le soleil est à la verticale : les ombres restent sous les objets (plan lisible)
function updateSun() {
  const r = st.S.room, zc = (-r.back + r.d - r.back) / 2;
  if (T.view === 'plan') sun.position.set(1.5, 40, zc + 2.5);
  else sun.position.set(9, 26, zc + 12);
  sun.target.position.set(0, 0, zc - (T.view === 'plan' ? 0 : 2));
  sun.target.updateMatrixWorld();
}
export function setCamera(patch) { Object.assign(orb, patch); invalidate(); }
export function worldToScreen(x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(cam());
  const r = canvas.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}
export function getCameraState() { return { ...orb, view: T.view }; }

/* ================= navigation ================= */
const nav = { keys: new Set(), vel: new THREE.Vector3() };
let tw = null;
export function navKey(code, down) {
  if (down) { if (!nav.keys.has(code)) { nav.keys.add(code); tw = null; } } else nav.keys.delete(code);
  invalidate();
}
export function navClear() { nav.keys.clear(); }
export const navHeld = () => nav.keys.size > 0;
export const navKeys = () => nav.keys;

// caméra au-dessus du sol : relève la cible si besoin
function groundClamp() {
  const camY = orb.ty + orb.dist * Math.sin(orb.pitch);
  if (camY < 0.08) orb.ty += 0.08 - camY;
}
function stepNav(dt) {
  const k = nav.keys;
  const fwd = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
  const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
  const up = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
  const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? 3 : k.has('AltLeft') || k.has('AltRight') ? 0.25 : 1;
  if (T.view === '3d') {
    const base = clamp(orb.dist * 0.45, 2.5, 14) * boost;
    const sy = Math.sin(orb.yaw), cy = Math.cos(orb.yaw);
    const want = new THREE.Vector3(
      (-sy * fwd + cy * side) * base,
      up * base * 0.6,
      (-cy * fwd - sy * side) * base
    );
    nav.vel.lerp(want, 1 - Math.exp(-dt * 9));
    if (nav.vel.lengthSq() > 1e-5) {
      orb.tx += nav.vel.x * dt; orb.ty = Math.max(0, orb.ty + nav.vel.y * dt); orb.tz += nav.vel.z * dt;
      groundClamp();
      dirty = true;
    } else nav.vel.set(0, 0, 0);
  } else {
    const sp = ((700 * boost) / ort.ppm) * dt;
    if (fwd || side || up) {
      if (T.view === 'plan') { ort.cx += side * sp; ort.cz -= fwd * sp; }
      else if (T.view === 'front') { ort.cx += side * sp; ort.cy += fwd * sp; }
      else { ort.cz += side * sp; ort.cy += fwd * sp; }
      if (up) ort.ppm = clamp(ort.ppm * Math.exp(up * 1.3 * dt), ZMIN_PPM, ZMAX_PPM);
      dirty = true;
    }
  }
}
function animateOrb(to, ms = 450) {
  tw = { from: { ...orb }, to: { ...orb, ...to }, t0: performance.now(), ms };
}
function stepTween(now) {
  if (!tw) return;
  const k = (now - tw.t0) / tw.ms;
  if (k >= 1) { Object.assign(orb, tw.to); tw = null; dirty = true; return; }
  const e = 1 - Math.pow(1 - k, 3);
  for (const f of ['tx', 'ty', 'tz', 'dist', 'pitch']) orb[f] = tw.from[f] + (tw.to[f] - tw.from[f]) * e;
  let dy = tw.to.yaw - tw.from.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  orb.yaw = tw.from.yaw + dy * e;
  dirty = true;
}
function camPos() {
  const cp = Math.cos(orb.pitch);
  return new THREE.Vector3(orb.tx + orb.dist * cp * Math.sin(orb.yaw), orb.ty + orb.dist * Math.sin(orb.pitch), orb.tz + orb.dist * cp * Math.cos(orb.yaw));
}
// place la caméra en `pos` et regarde dans la direction horizontale (dx, dz)
function lookFrom(pos, dx, dz, pitch = 0.03, dist = 6) {
  if (T.view !== '3d') setView('3d');
  const yaw = Math.atan2(-dx, -dz), cp = Math.cos(pitch);
  animateOrb({
    yaw, pitch, dist,
    tx: pos.x - dist * cp * Math.sin(yaw),
    ty: pos.y - dist * Math.sin(pitch),
    tz: pos.z - dist * cp * Math.cos(yaw),
  }, 600);
  invalidate();
}
// hauteur d'yeux (1,70 m) à l'endroit où l'on se trouve
export function eyeLevel() {
  if (T.view !== '3d') setView('3d');
  const p = camPos(), dir = [-Math.sin(orb.yaw), -Math.cos(orb.yaw)];
  const tgt = { x: orb.tx, z: orb.tz };
  lookFrom(new THREE.Vector3(T.view === '3d' ? tgt.x - dir[0] * 0 : p.x, 1.7, tgt.z), dir[0], dir[1]);
}
export function viewFromListener() {
  const L = st.listeners()[0] || st.S.objects.find(o => o.type === 'foh' || o.type === 'console_cl3');
  if (!L) return false;
  const b = contentBounds(st.S.objects.filter(o => def(o.type).praticable));
  const tx = (b.minX + b.maxX) / 2, tz = (b.minZ + b.maxZ) / 2;
  let dx = tx - L.x, dz = tz - L.z;
  if (Math.hypot(dx, dz) < 0.5) { dx = 0; dz = -1; }
  const n = Math.hypot(dx, dz);
  lookFrom(new THREE.Vector3(L.x, L.y + (def(L.type).listener ? L.h : 1.7), L.z), dx / n, dz / n, 0.02, 6);
  return true;
}
export function viewFromStage() {
  const pr = st.S.objects.filter(o => def(o.type).praticable);
  const b = contentBounds(pr.length ? pr : null);
  // au bord de la scène (point de vue du chanteur), pas au milieu des musiciens
  const topY = pr.length ? Math.max(...pr.map(o => o.y + o.h)) : 0;
  lookFrom(new THREE.Vector3((b.minX + b.maxX) / 2, topY + 1.7, pr.length ? b.maxZ - 0.35 : (b.minZ + b.maxZ) / 2), 0, 1, 0.03, 6);
}
function lookBy(dx, dy) {
  const p = camPos();
  orb.yaw -= dx * 0.0042;
  orb.pitch = clamp(orb.pitch + dy * 0.0036, -1.25, 1.5);
  const cp = Math.cos(orb.pitch);
  orb.tx = p.x - orb.dist * cp * Math.sin(orb.yaw);
  orb.ty = p.y - orb.dist * Math.sin(orb.pitch);
  orb.tz = p.z - orb.dist * cp * Math.cos(orb.yaw);
  invalidate();
}
function updateCompass() {
  if (!compassEl) return;
  const show = T.view === '3d' || T.view === 'plan';
  const v = T.view === '3d' ? orb.yaw.toFixed(3) + 'rad' : '0rad';
  const key = (show ? '1' : '0') + v;
  if (key === lastCompass) return;
  lastCompass = key;
  compassEl.style.display = show ? 'block' : 'none';
  compassEl.style.setProperty('--r', v);
}

/* ---- zoom : lissé (accumulateur logarithmique), fin avec Ctrl / Alt + molette, très proche en 3D (12 cm) ---- */
const ZMIN_DIST = 0.12, ZMAX_DIST = 170, ZMIN_PPM = 3, ZMAX_PPM = 2500;
const zq = { k: 0, mx: 0, my: 0 };
function pushZoom(logK, mx, my) {
  zq.k = clamp(zq.k + logK, -3, 3); zq.mx = mx; zq.my = my;
  invalidate();
}
function stepZoom(dt) {
  if (!zq.k) return;
  const a = 1 - Math.exp(-dt * 16), part = Math.abs(zq.k) < 0.0006 ? zq.k : zq.k * a;
  zq.k -= part;
  if (Math.abs(zq.k) < 0.0006) zq.k = 0;
  zoomAt(zq.mx, zq.my, Math.exp(part));
}
export function zoomBy(f, fine) { pushZoom(Math.log(fine ? Math.pow(f, 0.25) : f), host.clientWidth / 2, host.clientHeight / 2); }
// valeur de zoom pour l'interface : fraction 0..1 (1 = très proche) et texte lisible
export function zoomInfo() {
  if (T.view === '3d') {
    const lo = Math.log(ZMIN_DIST), hi = Math.log(ZMAX_DIST);
    const d = orb.dist;
    return { frac: 1 - (Math.log(d) - lo) / (hi - lo), label: st.fn(d, d < 10 ? 2 : 1) + ' m' };
  }
  const lo = Math.log(ZMIN_PPM), hi = Math.log(ZMAX_PPM);
  return { frac: (Math.log(ort.ppm) - lo) / (hi - lo), label: '1:' + Math.max(1, Math.round(3779 / ort.ppm)) };
}
export function setZoomFrac(fr) {
  fr = clamp(fr, 0, 1);
  tw = null; zq.k = 0;
  if (T.view === '3d') {
    const lo = Math.log(ZMIN_DIST), hi = Math.log(ZMAX_DIST);
    orb.dist = Math.exp(lo + (1 - fr) * (hi - lo));
    groundClamp();
  } else ort.ppm = Math.exp(Math.log(ZMIN_PPM) + fr * (Math.log(ZMAX_PPM) - Math.log(ZMIN_PPM)));
  invalidate();
}
// point visé sous le curseur (objet ou sol)
function pointUnder(mx, my) {
  ndc.set((mx / host.clientWidth) * 2 - 1, -(my / host.clientHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam());
  const hit = firstObjHit(ray.intersectObjects(gObjs.children, true), false);
  if (hit) return hit.point.clone();
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null;
}
function zoomAt(mx, my, f) {
  const w = host.clientWidth, h = host.clientHeight;
  if (T.view === '3d') {
    const nd = clamp(orb.dist * f, ZMIN_DIST, ZMAX_DIST), P = pointUnder(mx, my);
    if (P) {
      const k = (1 - nd / orb.dist) * 0.9;
      orb.tx += (P.x - orb.tx) * k; orb.ty = Math.max(0, orb.ty + (P.y - orb.ty) * k); orb.tz += (P.z - orb.tz) * k;
    }
    orb.dist = nd;
    groundClamp();
  } else {
    const sx = mx - w / 2, sy = my - h / 2, np = clamp(ort.ppm / f, ZMIN_PPM, ZMAX_PPM);
    if (T.view === 'plan') { const wx = ort.cx + sx / ort.ppm, wz = ort.cz + sy / ort.ppm; ort.ppm = np; ort.cx = wx - sx / np; ort.cz = wz - sy / np; }
    else if (T.view === 'front') { const wx = ort.cx + sx / ort.ppm, wy = ort.cy - sy / ort.ppm; ort.ppm = np; ort.cx = wx - sx / np; ort.cy = wy + sy / np; }
    else { const wz = ort.cz + sx / ort.ppm, wy = ort.cy - sy / ort.ppm; ort.ppm = np; ort.cz = wz - sx / np; ort.cy = wy + sy / np; }
  }
  invalidate();
}
function panBy(dx, dy) {
  if (T.view === '3d') {
    const s = (2 * orb.dist * Math.tan((persp.fov * Math.PI) / 360)) / host.clientHeight;
    const rx = Math.cos(orb.yaw), rz = -Math.sin(orb.yaw);
    const fx = -Math.sin(orb.yaw), fz = -Math.cos(orb.yaw);
    const k = s / Math.max(0.3, Math.sin(Math.max(orb.pitch, 0.05)));
    orb.tx += -rx * dx * s - fx * dy * k;
    orb.tz += -rz * dx * s - fz * dy * k;
  } else if (T.view === 'plan') { ort.cx -= dx / ort.ppm; ort.cz -= dy / ort.ppm; }
  else if (T.view === 'front') { ort.cx -= dx / ort.ppm; ort.cy += dy / ort.ppm; }
  else { ort.cz -= dx / ort.ppm; ort.cy += dy / ort.ppm; }
  invalidate();
}
function orbitBy(dx, dy) {
  orb.yaw -= dx * 0.006;
  orb.pitch = clamp(orb.pitch + dy * 0.005, 0.06, 1.52);
  groundClamp();
  invalidate();
}

/* ================= construction de la scène ================= */
function disposeTree(g) {
  g.traverse(c => { if (c.geometry) c.geometry.dispose(); });
}
function clearGroup(g) { while (g.children.length) { const c = g.children[0]; g.remove(c); disposeTree(c); } }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// étiquette : « pastille de verre » (aero) ou pastille sombre sobre (dark)
const labelCache = new Map();
function labelTex(text) {
  const key = (T.theme === 'dark' ? 'd|' : 'a|') + text;
  if (labelCache.has(key)) return labelCache.get(key);
  const dark = T.theme === 'dark';
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), f = '700 34px "Segoe UI", Arial, sans-serif';
  ctx.font = f;
  const w = Math.ceil(ctx.measureText(text).width) + 34;
  c.width = w; c.height = 56;
  ctx.font = f;
  ctx.shadowColor = dark ? 'rgba(0,0,0,.5)' : 'rgba(0,70,120,.45)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
  if (dark) {
    ctx.fillStyle = 'rgba(14,17,23,.88)'; rr(ctx, 4, 3, w - 8, 46, dark ? 14 : 22); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2.5; rr(ctx, 4, 3, w - 8, 46, 14); ctx.stroke();
    ctx.fillStyle = '#ffffff';
  } else {
    const g = ctx.createLinearGradient(0, 4, 0, 50);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e4f6ff'); g.addColorStop(0.52, '#bfe8fa'); g.addColorStop(1, '#e6f8ff');
    ctx.fillStyle = g; rr(ctx, 4, 3, w - 8, 46, 22); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#3b9fd1'; ctx.lineWidth = 2.5; rr(ctx, 4, 3, w - 8, 46, 22); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(ctx, 12, 6, w - 24, 16, 8); ctx.fill();
    ctx.fillStyle = '#06385f';
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 27);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const res = { tex, aspect: w / 56 };
  labelCache.set(key, res);
  return res;
}
// bascule de thème : reconstruit sol, grille, étiquettes, cotes
export function setTheme(name) {
  name = THEMES[name] ? name : 'aero';
  T.theme = name;
  TH = resolveTH();
  if (name !== 'print') document.body.dataset.theme = name;
  hemi.groundColor.set(TH.hemiGround);
  scene.environmentIntensity = TH.env;
  floorSig = '';
  for (const v of views.values()) {
    v.lsig = null;
    v.selBox.material.color.set(TH.sel);
    if (v.foot) v.foot.material.color.set(TH.foot);
  }
  lastLabelK = 0;
  syncAll();
  invalidate();
}
function makeLabel(text) {
  const { tex, aspect } = labelTex(text);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
  s.scale.set(0.3 * aspect, 0.3, 1);
  s.userData.aspect = aspect;
  s.renderOrder = 10;
  s.raycast = () => {};
  return s;
}
// pastille numérotée des retours de scène : toujours visible, elle garde une taille constante à l'écran comme les étiquettes
const badgeCache = new Map();
function makeBadge(text) {
  let tex = badgeCache.get(text);
  if (!tex) {
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    c.width = c.height = 96;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#f2b800'; ctx.beginPath(); ctx.arc(48, 46, 38, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1b1d22'; ctx.stroke();
    ctx.fillStyle = '#14161a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${text.length > 2 ? 34 : text.length > 1 ? 44 : 54}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText(text, 48, 49);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    badgeCache.set(text, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
  s.scale.set(0.34, 0.34, 1);
  s.renderOrder = 11;
  s.raycast = () => {};
  return s;
}
// étiquette du changement de plateau : « À SORTIR · nom » (rouge) ou « À RENTRER · nom » (vert)
const tagCache = new Map();
function makeTag(text, kind) {
  const key = kind + '|' + text;
  let res = tagCache.get(key);
  if (!res) {
    const c = document.createElement('canvas'), ctx = c.getContext('2d'), f = '800 30px "Segoe UI", Arial, sans-serif';
    ctx.font = f;
    const w = Math.ceil(ctx.measureText(text).width) + 30;
    c.width = w; c.height = 52;
    ctx.font = f;
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    ctx.fillStyle = kind === 'out' ? '#d83a3a' : '#1f9d55';
    rr(ctx, 4, 3, w - 8, 42, 12); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; rr(ctx, 4, 3, w - 8, 42, 12); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, 25);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    res = { tex, aspect: w / 52 };
    tagCache.set(key, res);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: res.tex, depthTest: false, transparent: true, toneMapped: false }));
  sp.userData.aspect = res.aspect;
  sp.scale.set(0.26 * res.aspect, 0.26, 1);
  sp.center.set(0.5, 1.6); // sous le point d'ancrage : l'étiquette de nom reste au-dessus
  sp.renderOrder = 12; sp.raycast = () => {};
  return sp;
}
// objet « à sortir » : grisé et transparent (les maillages gardent leur matériau d'origine pour le restaurer)
const GHOST_MAT = new THREE.MeshStandardMaterial({ color: '#8f97a4', transparent: true, opacity: 0.3, roughness: 0.9, metalness: 0, depthWrite: false });
function setGhost(v, on) {
  if (v.ghost === on) return;
  v.ghost = on;
  v.group.children[0].traverse(m => {
    if (m.isMesh) {
      if (on) {
        if (m.material && m.material.opacity === 0) return; // zones de sélection invisibles
        m.userData.m0 = m.userData.m0 || m.material; m.userData.c0 = m.castShadow;
        m.material = GHOST_MAT; m.castShadow = false;
      } else if (m.userData.m0) { m.material = m.userData.m0; m.castShadow = m.userData.c0; }
    } else if (m.isLine || m.isLineSegments) m.visible = !on;
  });
}
// les étiquettes gardent une taille constante à l'écran (≈ 22 px de haut), quel que soit le zoom
let lastLabelK = 0;
function updateLabelScale() {
  const k = clamp(T.view === '3d'
    ? (2 * orb.dist * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * (20 / host.clientHeight)) / 0.3
    : (17 / ort.ppm) / 0.3, 0.2, 3);
  if (Math.abs(k - lastLabelK) < 0.015) return;
  setLabelK(k);
}
function setLabelK(k) {
  lastLabelK = k;
  for (const v of views.values()) {
    if (v.label) v.label.scale.set(0.3 * v.label.userData.aspect * k, 0.3 * k, 1);
    if (v.badge) v.badge.scale.set(0.34 * k, 0.34 * k, 1);
    if (v.tag) v.tag.scale.set(0.26 * v.tag.userData.aspect * k, 0.26 * k, 1);
  }
}
const COV_COL = { delay: '#1f8fe8', sub: '#a64be0', sub2: '#a64be0', sub_act: '#a64be0', sub_21: '#a64be0', wedge: '#f2b800', wedge_act: '#f2b800', wedge_coax: '#f2b800', front_fill: '#2fbf5a', front_fill_act: '#2fbf5a' };
function makeCoverage(o) {
  const g = new THREE.Group();
  const half = THREE.MathUtils.degToRad(clamp(o.angle || 90, 5, 360) / 2);
  const R = Math.max(0.5, o.range || 10);
  const col = COV_COL[o.type] || '#ff7a1f';
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(R, 48, -Math.PI / 2 - half, half * 2),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide })
  );
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(R - 0.06, R, 64, 1, -Math.PI / 2 - half, half * 2),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  );
  [fill, arc].forEach(m => { m.rotation.x = -Math.PI / 2; m.raycast = () => {}; g.add(m); });
  if (half < Math.PI - 0.01) {
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.sin(half) * R, 0, Math.cos(half) * R), new THREE.Vector3(0, 0, 0), new THREE.Vector3(-Math.sin(half) * R, 0, Math.cos(half) * R)];
    const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
    l.raycast = () => {};
    g.add(l);
  }
  g.renderOrder = 1;
  return g;
}
/* ---------- faisceaux des projecteurs ----------
   Cône lumineux à gradient (trois couches emboîtées : plus dense près de l'axe et près de la source), tache au sol à bords doux
   (point chaud au centre, pénombre réglée par type de projecteur : nette pour une découpe, douce pour un PC), halo à la source.
   Sur sol sombre les faisceaux s'additionnent (lumière) ; sur sol clair (exports) ils se superposent en transparence. */
const rad = d => ((d || 0) * Math.PI) / 180;
const beamMats = new Map();
function beamMat(additive) {
  let m = beamMats.get(additive);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    m.opacity = T.beamLevel / 100;
    beamMats.set(additive, m);
  }
  return m;
}
let glowTex = null;
function beamGlow() {
  if (!glowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
  }
  return glowTex;
}
// intensité générale des faisceaux : s'applique tout de suite, sans reconstruire les faisceaux
export function applyBeamLevel() {
  const k = clamp(T.beamLevel, 0, 100) / 100;
  beamMats.forEach(m => { m.opacity = k; });
  gBeams.traverse(c => { if (c.isSprite && c.userData.base != null) c.material.opacity = c.userData.base * k; });
  invalidate();
}
// taille des faisceaux : reconstruit tous les faisceaux
export function refreshBeams() { for (const v of views.values()) v.bsig = null; syncBeams(); invalidate(); }
const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function makeBeam(o) {
  const d = def(o.type), additive = TH !== THEMES.print;
  const half = (rad(clamp(o.beam ?? d.beam.angle, 3, 120)) / 2) * clamp(T.beamSize / 100, 0.2, 1), soft = d.beam.soft ?? 0.4;
  const lv = clamp((o.level ?? 100) / 100, 0, 1); // intensité de ce projecteur
  if (lv <= 0) return new THREE.Group();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rad(o.tilt), -rad(o.rot), 0, 'YXZ'));
  const pivot = new THREE.Vector3(o.x, st.lampPivotY(o), o.z);
  const apex = pivot.clone().addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(q), d.beam.front);
  const col = new THREE.Color(o.color || d.color);
  const N = 40, tmp = new THREE.Vector3();
  const rayDir = (sc, a) => tmp.set(Math.sin(half * sc) * Math.cos(a), Math.sin(half * sc) * Math.sin(a), Math.cos(half * sc)).applyQuaternion(q).clone();
  // arrivée d'un rayon : le sol ou le dessus du support visé (praticable…) ; vers le haut, la lumière s'éteint à 12 m
  const reach = (dv, iters) => {
    if (dv.y < -1e-3) {
      let top = 0, tt = 9;
      for (let k = 0; k < iters; k++) { tt = Math.max(0.05, (apex.y - top) / -dv.y); top = st.supportTop(apex.x + dv.x * tt, apex.z + dv.z * tt, o.id, false); }
      tt = Math.min(40, Math.max(0.05, (apex.y - top) / -dv.y));
      return { p: new THREE.Vector3(apex.x + dv.x * tt, top + 0.004, apex.z + dv.z * tt), hit: true, t: tt };
    }
    return { p: apex.clone().addScaledVector(dv, 12), hit: false, t: 12 };
  };
  const mk = (pos, color) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 4));
    const m = new THREE.Mesh(geo, beamMat(additive));
    m.raycast = () => {}; m.renderOrder = 2;
    return m;
  };
  const kA = (additive ? 1 : 1.5) * lv * 0.7; // 0,7 : moins éblouissant par défaut
  /* cône : 3 couches (bord, milieu, cœur), brillant près de la source et qui s'estompe vers le sol */
  const cp = [], cc = [];
  const layers = [[1, 0.02 + 0.045 * (1 - soft)], [0.82, 0.032], [0.64, 0.036], [0.46, 0.04], [0.28, 0.05]];
  for (const [sc, a] of layers) {
    const ring = [];
    for (let i = 0; i < N; i++) ring.push(reach(rayDir(sc, (i / N) * Math.PI * 2), 2));
    for (let i = 0; i < N; i++) {
      const A = ring[i], B = ring[(i + 1) % N];
      cp.push(apex.x, apex.y, apex.z, A.p.x, A.p.y, A.p.z, B.p.x, B.p.y, B.p.z);
      cc.push(col.r, col.g, col.b, a * 2.4 * kA, col.r, col.g, col.b, (A.hit ? a * 0.5 : 0) * kA, col.r, col.g, col.b, (B.hit ? a * 0.5 : 0) * kA);
    }
  }
  const g = new THREE.Group();
  g.add(mk(cp, cc));
  /* tache au sol : anneaux concentriques, intensité = point chaud puis pénombre */
  const center = reach(rayDir(0, 0), 3);
  if (center.hit) {
    const peak = (additive ? 0.5 : 0.42) * clamp(1.3 - center.t / 30, 0.35, 1);
    const inten = sc => { const e = 1 - soft; return smooth01(sc <= e ? 1 : 1 - (sc - e) / soft) * (0.8 + 0.2 * (1 - sc * sc)); };
    const scs = [0.3, 0.55, 0.75, 0.9, 1];
    const rings = scs.map(sc => { const r = []; for (let i = 0; i < N; i++) r.push(reach(rayDir(sc, (i / N) * Math.PI * 2), 2)); return r; });
    const sp = [], scol = [];
    const v = (P, a) => { sp.push(P.x, P.y, P.z); scol.push(col.r, col.g, col.b, peak * a * kA); };
    for (let i = 0; i < N; i++) {
      const A = rings[0][i], B = rings[0][(i + 1) % N];
      if (!A.hit || !B.hit) continue;
      v(center.p, inten(0)); v(A.p, inten(scs[0])); v(B.p, inten(scs[0]));
    }
    for (let k = 0; k < scs.length - 1; k++) {
      for (let i = 0; i < N; i++) {
        const A = rings[k][i], B = rings[k][(i + 1) % N], C = rings[k + 1][(i + 1) % N], D = rings[k + 1][i];
        if (!A.hit || !B.hit || !C.hit || !D.hit) continue;
        const i0 = inten(scs[k]), i1 = inten(scs[k + 1]);
        v(A.p, i0); v(B.p, i0); v(C.p, i1);
        v(A.p, i0); v(C.p, i1); v(D.p, i1);
      }
    }
    if (sp.length) g.add(mk(sp, scol));
  }
  if (additive) { // halo à la sortie de la lampe
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamGlow(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 * lv * (T.beamLevel / 100), toneMapped: false }));
    gl.userData.base = 0.6 * lv;
    gl.scale.set(0.5, 0.5, 1); gl.position.copy(apex); gl.raycast = () => {};
    g.add(gl);
  }
  return g;
}
let supSig = '';
function syncBeams() {
  const S = st.S;
  supSig = S.objects.filter(o => def(o.type).support).map(o => [o.x, o.y, o.z, o.w, o.d, o.h, o.rot].join(',')).join(';');
  for (const o of S.objects) {
    const v = views.get(o.id), d = def(o.type);
    if (!v) continue;
    // calque visible, pas un projecteur « à sortir », type de projecteur coché (ou projecteur sélectionné)
    const want = !!d.beam && st.isVisible(o) && st.changeStatus(o) !== 'out' && ((T.beams && st.beamTypeOn(o.type)) || sel.ids.has(o.id));
    const sig = want ? [o.x, o.y, o.z, o.rot, o.tilt, o.beam, o.h, o.color, o.mount, o.level, T.beamSize, supSig, TH.floor].join('|') : '';
    if (v.bsig === sig) continue;
    v.bsig = sig;
    if (v.beam) { gBeams.remove(v.beam); disposeTree(v.beam); v.beam = null; }
    if (want) { v.beam = makeBeam(o); gBeams.add(v.beam); }
  }
}

const objSig = o => {
  const d = def(o.type);
  return [o.type, o.w, o.d, o.h, o.color, o.opt, o.mount, o.active, o.wheels, o.grille, o.tilt, ...Object.keys(d.props || {}).map(k => o[k]), (o.type === 'text' || d.stencil) ? o.label : ''].join('|');
};

function buildView(o) {
  const g = new THREE.Group();
  g.userData.objId = o.id;
  const mesh = buildObjectMesh(o);
  g.add(mesh);
  const selBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(o.w + 0.06, o.h + 0.06, o.d + 0.06)),
    new THREE.LineBasicMaterial({ color: TH.sel, depthTest: false, transparent: true })
  );
  selBox.position.y = o.h / 2; selBox.renderOrder = 9; selBox.raycast = () => {};
  g.add(selBox);
  // contour d'emprise (vue Plan) : montre les vraies dimensions au sol
  let foot = null;
  if (!['zone', 'text', 'listener'].includes(o.type)) {
    const fp = [[-o.w / 2, -o.d / 2], [o.w / 2, -o.d / 2], [o.w / 2, o.d / 2], [-o.w / 2, o.d / 2]].map(p => new THREE.Vector3(p[0], 0.02, p[1]));
    foot = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(fp), new THREE.LineBasicMaterial({ color: TH.foot, transparent: true, opacity: 0.55, depthTest: false }));
    foot.renderOrder = 3; foot.raycast = () => {}; foot.visible = T.view === 'plan';
    g.add(foot);
  }
  return { group: g, sig: objSig(o), selBox, foot, label: null, lsig: null, badge: null, nsig: null, tag: null, tsig: null, cofoot: null, ghost: false, cov: null, csig: null, beam: null, bsig: '' };
}
function syncFoot() {
  for (const v of views.values()) if (v.foot) v.foot.visible = T.view === 'plan';
}
function syncObjects() {
  const S = st.S, seen = new Set();
  for (const o of S.objects) {
    seen.add(o.id);
    let v = views.get(o.id);
    const needBuild = !v || v.sig !== objSig(o);
    if (needBuild) {
      if (v) { gObjs.remove(v.group); disposeTree(v.group); if (v.beam) { gBeams.remove(v.beam); disposeTree(v.beam); } }
      v = buildView(o);
      views.set(o.id, v);
      gObjs.add(v.group);
      v.sig = objSig(o); // recalculé après construction (les textes ajustent leur largeur)
    }
    // étiquette
    const d = def(o.type);
    const ltxt = o.type === 'text' ? '' : (o.label || tr(d.short || ''));
    const bnum = d.monitor && o.num != null ? String(o.num).trim() : '';
    const lsig = T.labels ? ltxt + '|' + o.h + '|' + (bnum ? 1 : 0) : '';
    if (v.lsig !== lsig) {
      if (v.label) { v.group.remove(v.label); v.label = null; }
      if (T.labels && ltxt) {
        v.label = makeLabel(ltxt); v.label.position.set(0, o.h + (bnum ? 0.12 : 0.32), 0); v.group.add(v.label);
        if (bnum) v.label.center.set(0.5, -0.63); // l'étiquette se place au-dessus de la pastille numérotée
      }
      v.lsig = lsig;
    }
    const nsig = bnum + '|' + o.h;
    if (v.nsig !== nsig) {
      if (v.badge) { v.group.remove(v.badge); v.badge.material.dispose(); v.badge = null; }
      if (bnum) { v.badge = makeBadge(bnum); v.badge.position.set(0, o.h + 0.12, 0); v.group.add(v.badge); }
      v.nsig = nsig;
    }
    // changement de plateau : à sortir (grisé, rouge) / à rentrer (vert) ; ce qui reste reste en place
    const cs = st.changeStatus(o);
    const tsig = cs === 'out' || cs === 'in' ? [cs, o.h, o.w, o.d, o.label || ''].join('|') : '';
    if (v.tsig !== tsig) {
      if (v.tag) { v.group.remove(v.tag); v.tag.material.dispose(); v.tag = null; }
      if (v.cofoot) { v.group.remove(v.cofoot); v.cofoot.geometry.dispose(); v.cofoot.material.dispose(); v.cofoot = null; }
      if (tsig) {
        const nm = (o.label || tr(d.short || '') || tr(d.name)).slice(0, 24);
        v.tag = makeTag((cs === 'out' ? tr('À SORTIR') : tr('À RENTRER')) + ' · ' + nm, cs);
        v.tag.position.set(0, o.h + 0.55, 0);
        v.group.add(v.tag);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(o.w + 0.1, o.d + 0.1), new THREE.MeshBasicMaterial({ color: cs === 'out' ? '#e04848' : '#2fbf5a', transparent: true, opacity: 0.32, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
        pl.rotation.x = -Math.PI / 2; pl.position.y = 0.03 - 0; pl.renderOrder = 3; pl.raycast = () => {};
        v.cofoot = pl; v.group.add(pl);
      }
      v.tsig = tsig;
    }
    setGhost(v, cs === 'out');
    // couverture
    const wantCov = T.coverage && d.speaker;
    const csig = wantCov ? [o.angle, o.range, o.d].join('|') : '';
    if (v.csig !== csig) {
      if (v.cov) { v.group.remove(v.cov); disposeTree(v.cov); v.cov = null; }
      if (wantCov) { v.cov = makeCoverage(o); v.group.add(v.cov); }
      v.csig = csig;
    }
    v.selBox.visible = sel.ids.has(o.id);
    v.group.visible = st.isVisible(o); // calque masqué : l'objet, son étiquette, sa pastille et sa couverture disparaissent
  }
  for (const [id, v] of views) if (!seen.has(id)) { gObjs.remove(v.group); disposeTree(v.group); if (v.beam) { gBeams.remove(v.beam); disposeTree(v.beam); } views.delete(id); }
  lastLabelK = 0;
  syncTransforms();
}
function syncTransforms() {
  for (const o of st.S.objects) {
    const v = views.get(o.id);
    if (!v) continue;
    v.group.position.set(o.x, o.y, o.z);
    v.group.rotation.y = (-o.rot * Math.PI) / 180;
    if (v.cov) v.cov.position.set(0, -o.y + 0.04, o.d / 2);
  }
  syncBeams();
  invalidate();
}
function syncSelection() {
  for (const [id, v] of views) v.selBox.visible = sel.ids.has(id);
  syncBeams();
  rebuildCables(); rebuildMeasures();
  invalidate();
}

function ribbon(a, b, w, color, y, depthTest = false) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 1e-4) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, w), new THREE.MeshBasicMaterial({ color, depthTest, transparent: true, opacity: 0.95, toneMapped: false }));
  m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
  m.rotation.y = -Math.atan2(dz, dx);
  m.renderOrder = 4;
  return m;
}
function rebuildCables() {
  clearGroup(gCables);
  if (st.isGroupHidden('cables')) return;
  for (const c of st.S.cables) {
    const on = sel.cable === c.id;
    const col = on ? TH.cableSel : CABLE_KINDS[c.kind]?.color || '#fff';
    const w = on ? 0.15 : 0.1;
    for (let i = 1; i < c.pts.length; i++) {
      const m = ribbon(c.pts[i - 1], c.pts[i], w, col, 0.06);
      if (m) { m.userData.cableId = c.id; gCables.add(m); }
    }
    c.pts.forEach(p => {
      const j = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.75, w * 0.75, 0.03, 12), new THREE.MeshBasicMaterial({ color: col, depthTest: false, toneMapped: false }));
      j.position.set(p[0], 0.06, p[1]); j.renderOrder = 4; j.userData.cableId = c.id;
      gCables.add(j);
    });
  }
}
function rebuildMeasures() {
  clearGroup(gMeasures);
  if (st.isGroupHidden('mesures')) return;
  for (const m of st.S.measures) {
    const on = sel.measure === m.id;
    const col = on ? TH.measureSel : TH.measure;
    const r = ribbon(m.a, m.b, 0.05, col, 0.08);
    if (r) { r.userData.measureId = m.id; gMeasures.add(r); }
    [m.a, m.b].forEach(p => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), new THREE.MeshBasicMaterial({ color: col, depthTest: false, toneMapped: false }));
      t.position.set(p[0], 0.08, p[1]); t.renderOrder = 4; t.userData.measureId = m.id;
      gMeasures.add(t);
    });
  }
}

// salle : dalle de verre bleutée posée dans le ciel
function buildFloor() {
  const S = st.S, r = S.room, g = S.settings.grid;
  const sig = [r.w, r.d, r.back, g, T.grid, r.floor || 'std'].join('|');
  if (sig === floorSig) return;
  floorSig = sig;
  clearGroup(gFloor);
  const x0 = -r.w / 2, x1 = r.w / 2, z0 = -r.back, z1 = r.d - r.back;
  const side = new THREE.MeshPhysicalMaterial({ color: TH.slabSide, roughness: 0.18, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.1 });
  const fd = floorDef(r.floor);
  let top = new THREE.MeshStandardMaterial({ color: TH.floor, roughness: 0.55, metalness: 0 });
  const slabGeo = new THREE.BoxGeometry(r.w, 0.22, r.d);
  if (fd.draw) {
    // sol texturé : la texture est répétée à l'échelle réelle (fd.tile mètres par motif) ; teinte sobre en scène sombre, pastel à l'export
    const light = TH === THEMES.print;
    top = new THREE.MeshStandardMaterial({ color: light ? '#ffffff' : fd.mul, map: floorTexture(fd.id, light), roughness: /parquet|chevron|plancher/.test(fd.id) ? 0.5 : 0.85, metalness: 0 });
    const p = slabGeo.attributes.position, n = slabGeo.attributes.normal, uv = slabGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) if (n.getY(i) > 0.5) uv.setXY(i, (p.getX(i) + r.w / 2) / fd.tile, (r.d / 2 - p.getZ(i)) / fd.tile);
  }
  // le dessus du sol est légèrement repoussé en profondeur : grille, repères et objets posés restent toujours nets (pas de flicker)
  top.polygonOffset = true; top.polygonOffsetFactor = 0; top.polygonOffsetUnits = 6;
  const slab = new THREE.Mesh(slabGeo, [side, side, top, side, side, side]);
  slab.position.set(0, -0.11, (z0 + z1) / 2);
  slab.receiveShadow = true; slab.raycast = () => {};
  gFloor.add(slab);
  if (T.grid) {
    const mk = (step, color, y) => {
      if (step < 0.05) return;
      const v = [];
      for (let x = Math.ceil(x0 / step - 1e-6) * step; x <= x1 + 1e-6; x += step) v.push(x, y, z0, x, y, z1);
      for (let z = Math.ceil(z0 / step - 1e-6) * step; z <= z1 + 1e-6; z += step) v.push(x0, y, z, x1, y, z);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }));
      l.raycast = () => {};
      gFloor.add(l);
    };
    const count = (r.w / g) * (r.d / g);
    if (g < 1 && count < 20000) mk(g, TH.gridMinor, 0.001);
    mk(1, TH.grid1, 0.0014);
    mk(5, TH.grid5, 0.0018); // grille très près du sol : un tapis de danse ou un praticable la recouvre toujours
  }
  const ol = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(p => new THREE.Vector3(p[0], 0.01, p[1]))),
    new THREE.LineBasicMaterial({ color: TH.outline })
  );
  gFloor.add(ol);
  const cross = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]].map(p => new THREE.Vector3(p[0], 0.012, p[1]))),
    new THREE.LineBasicMaterial({ color: TH.cross })
  );
  gFloor.add(cross);
  const txt = (t, x, z, size, rotY = 0) => {
    const { mesh } = flatText(t, size, TH.text);
    const w = new THREE.Group();
    mesh.position.y = 0.015; w.add(mesh); w.position.set(x, 0, z); w.rotation.y = rotY;
    gFloor.add(w);
  };
  txt('▼  ' + tr('PUBLIC') + '  ▼', 0, z1 - 0.9, 0.55);
  txt('▲  ' + tr('FOND DE SCÈNE') + '  ▲', 0, z0 + 0.9, 0.55);
  txt(tr('CÔTÉ JARDIN'), x0 + 0.8, 0, 0.45, Math.PI / 2);
  txt(tr('CÔTÉ COUR'), x1 - 0.8, 0, 0.45, Math.PI / 2);
  txt('0,0', 0.6, -0.4, 0.3);
  const R = Math.max(r.w, r.d) * 0.8;
  sun.shadow.camera.left = -R; sun.shadow.camera.right = R; sun.shadow.camera.top = R; sun.shadow.camera.bottom = -R;
  sun.shadow.camera.far = 120; sun.shadow.camera.updateProjectionMatrix();
  updateSun();
}
function syncAll() {
  buildFloor();
  syncObjects();
  rebuildCables();
  rebuildMeasures();
  invalidate();
}
export function refreshDisplay() { floorSig = ''; for (const v of views.values()) { v.lsig = null; v.tsig = null; } labelCache.clear(); syncAll(); }

/* ================= interactions ================= */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function setRay(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam());
}
function planeHit(e, normal, point) {
  setRay(e);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point), p) ? p : null;
}
const floorPoint = e => planeHit(e, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
// premier objet touché par le rayon : les objets masqués sont ignorés ; pour la sélection, ceux d'un calque verrouillé aussi
function firstObjHit(hits, forSelect) {
  for (const h of hits) {
    let o = h.object;
    while (o && o.userData.objId == null) o = o.parent;
    if (!o) continue;
    const ob = st.getObj(o.userData.objId);
    if (ob && (forSelect ? st.isPickable(ob) : st.isVisible(ob))) return { id: ob.id, point: h.point };
  }
  return null;
}
function pickObject(e, forSelect = false) {
  setRay(e);
  return firstObjHit(ray.intersectObjects(gObjs.children, true), forSelect);
}
// point visé : si la souris survole un objet (dessus d'un praticable, d'une table…), on prend ce point,
// sinon l'intersection avec le sol. Évite le décalage de parallaxe en vue 3D.
function groundPoint(e) {
  const hit = pickObject(e);
  return hit ? new THREE.Vector3(hit.point.x, 0, hit.point.z) : floorPoint(e);
}
function pickIn(e, group, key) {
  setRay(e);
  for (const h of ray.intersectObjects(group.children, true)) if (h.object.userData[key] != null) return h.object.userData[key];
  return null;
}
const snapThr = () => (T.view === '3d' ? 0.12 : 9 / ort.ppm);

function snapXZ(o, nx, nz, excl) {
  const s = st.S.settings;
  let x = nx, z = nz;
  if (s.snap) { x = Math.round(x / s.grid) * s.grid; z = Math.round(z / s.grid) * s.grid; }
  if (s.magnet) {
    const thr = snapThr(), { hx, hz } = st.extents(o);
    let bx = null, bz = null;
    for (const p of st.S.objects) {
      if (excl.has(p.id) || p.id === o.id || !st.isVisible(p)) continue;
      const pd = def(p.type);
      if (pd.id === 'zone' || pd.id === 'text' || pd.passive) continue;
      const e = st.extents(p);
      if (Math.abs(p.x - x) > hx + e.hx + 0.6 || Math.abs(p.z - z) > hz + e.hz + 0.6) continue;
      for (const [mine, theirs] of [[x - hx, p.x - e.hx], [x - hx, p.x + e.hx], [x + hx, p.x - e.hx], [x + hx, p.x + e.hx], [x, p.x]]) {
        const df = theirs - mine;
        if (Math.abs(df) < thr && (bx === null || Math.abs(df) < Math.abs(bx))) bx = df;
      }
      for (const [mine, theirs] of [[z - hz, p.z - e.hz], [z - hz, p.z + e.hz], [z + hz, p.z - e.hz], [z + hz, p.z + e.hz], [z, p.z]]) {
        const df = theirs - mine;
        if (Math.abs(df) < thr && (bz === null || Math.abs(df) < Math.abs(bz))) bz = df;
      }
    }
    if (bx !== null) x += bx;
    if (bz !== null) z += bz;
  }
  return { x: Math.round(x * 1000) / 1000, z: Math.round(z * 1000) / 1000 };
}
// point de mesure / câble : coins et centres d'objets, sinon grille
function snapPoint(e, p, forCable) {
  let best = null, bd = snapThr() * 1.6;
  for (const o of st.S.objects) {
    if (def(o.type).passive || !st.isVisible(o)) continue;
    const pts = st.corners(o).concat([[o.x, o.z]]);
    for (const q of pts) { const dd = Math.hypot(q[0] - p.x, q[1] - p.z); if (dd < bd) { bd = dd; best = q; } }
  }
  if (best) return [Math.round(best[0] * 1000) / 1000, Math.round(best[1] * 1000) / 1000];
  if (forCable) {
    const hit = pickObject(e);
    const o = hit && st.getObj(hit.id);
    if (o && !['zone', 'text'].includes(o.type) && !def(o.type).passive) return [o.x, o.z];
  }
  const s = st.S.settings;
  if (s.snap) return [Math.round(p.x / s.grid) * s.grid, Math.round(p.z / s.grid) * s.grid];
  return [Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100];
}
function axisLock(a, b) {
  return Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? [b[0], a[1]] : [a[0], b[1]];
}

/* ---------- fantôme de placement ---------- */
function ghostMesh() {
  const g = new THREE.Group();
  const m = buildObjectMesh(ghostObj);
  m.traverse(c => {
    if (c.material) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = Math.min(c.material.opacity ?? 1, 0.6); c.material.depthWrite = false; }
    c.castShadow = false;
  });
  g.add(m);
  const d = def(ghostObj.type);
  if (d.speaker) {
    const cov = makeCoverage(ghostObj);
    cov.position.set(0, -ghostObj.y + 0.04, ghostObj.d / 2);
    g.add(cov);
  }
  g.visible = false;
  return g;
}
function rebuildGhost() {
  clearGroup(gGhost);
  ghost = null; ghostObj = null; ghostType = null;
  if (T.tool !== 'place' || !T.placeType) return;
  ghostType = T.placeType;
  ghostObj = st.newObject(T.placeType, 0, 0, { temp: true });
  if (T.placeRot != null) ghostObj.rot = T.placeRot;
  // projecteur : fixation choisie à la pose (Auto = accroché s'il y a un truss à portée, sinon posé au sol)
  if (def(ghostType).mount && T.placeMount !== 'auto' && +T.placeMount > 0) st.setMount(ghostObj, +T.placeMount);
  ghost = ghostMesh();
  gGhost.add(ghost);
}
function remeshGhost() {
  const vis = ghost.visible;
  clearGroup(gGhost);
  ghost = ghostMesh();
  ghost.visible = vis;
  gGhost.add(ghost);
}
function moveGhost(e) {
  if (!ghost) return;
  const p = groundPoint(e);
  if (!p) { ghost.visible = false; return; }
  const s = snapXZ(ghostObj, p.x, p.z, new Set());
  ghostObj.x = s.x; ghostObj.z = s.z;
  if (def(ghostObj.type).mount && T.placeMount === 'auto') {
    const want = st.hangOnTruss({ ...ghostObj, mount: 0, manualY: false }) ? 0 : 1;
    if (want !== (ghostObj.mount | 0)) { st.setMount(ghostObj, want); remeshGhost(); }
  }
  st.autoLift(ghostObj);
  st.hangOnTruss(ghostObj);
  ghost.visible = true;
  ghost.position.set(ghostObj.x, ghostObj.y, ghostObj.z);
  ghost.rotation.y = (-ghostObj.rot * Math.PI) / 180;
  invalidate();
}
export function rotateGhost(deg) {
  if (!ghostObj) return;
  T.placeRot = (((ghostObj.rot + deg) % 360) + 360) % 360;
  ghostObj.rot = T.placeRot;
  if (ghost) ghost.rotation.y = (-ghostObj.rot * Math.PI) / 180;
  invalidate();
}

/* ---------- aperçus mesure / câble ---------- */
// point visé par la souris, en ignorant les objets en cours d'orientation
function aimTarget(e) {
  setRay(e);
  for (const h of ray.intersectObjects(gObjs.children, true)) {
    let o = h.object;
    while (o && o.userData.objId == null) o = o.parent;
    if (o && !sel.ids.has(o.userData.objId) && st.isVisible(st.getObj(o.userData.objId))) return h.point.clone();
  }
  return floorPoint(e);
}
function updateTemp(e) {
  clearGroup(gTemp);
  if (T.tool === 'aim') {
    const P = aimTarget(e);
    const lamps = st.selObjs().filter(st.orientable);
    if (P && lamps.length) {
      const mk = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 24), new THREE.MeshBasicMaterial({ color: '#ff8a1f', depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
      mk.rotation.x = -Math.PI / 2; mk.position.set(P.x, P.y + 0.03, P.z); mk.renderOrder = 8;
      gTemp.add(mk);
      const v = [];
      lamps.forEach(o => v.push(o.x, st.lampPivotY(o), o.z, P.x, P.y, P.z));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#ff8a1f', depthTest: false, transparent: true, opacity: 0.9 }));
      ln.renderOrder = 8; ln.raycast = () => {};
      gTemp.add(ln);
    }
    invalidate();
    return;
  }
  if (T.tool === 'measure' || T.tool === 'cable') {
    const p = groundPoint(e);
    if (!p) { invalidate(); return; }
    let q = snapPoint(e, p, T.tool === 'cable');
    const base = T.tool === 'measure' ? mStart : cPts[cPts.length - 1];
    if (base && e.shiftKey) q = axisLock(base, q);
    cursor.q = q;
    const mk = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 20), new THREE.MeshBasicMaterial({ color: '#0a7fc4', depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
    mk.rotation.x = -Math.PI / 2; mk.position.set(q[0], 0.1, q[1]); mk.renderOrder = 8;
    gTemp.add(mk);
    const pts = T.tool === 'measure' ? (mStart ? [mStart, q] : []) : [...cPts, q];
    const col = T.tool === 'measure' ? TH.measure : CABLE_KINDS[T.cableKind].color;
    for (let i = 1; i < pts.length; i++) {
      const r = ribbon(pts[i - 1], pts[i], T.tool === 'measure' ? 0.05 : 0.1, col, 0.09);
      if (r) { r.material.opacity = 0.65; gTemp.add(r); }
    }
    cursor.preview = pts;
  }
  invalidate();
}
export function refreshTool() {
  mStart = null; cPts = []; cursor.preview = null;
  clearGroup(gTemp);
  if (['place', 'measure', 'cable', 'aim'].includes(T.tool) && (T.view === 'front' || T.view === 'side')) setView('plan');
  rebuildGhost();
  canvas.style.cursor = T.tool === 'select' ? 'default' : 'crosshair';
  if (T.tool === 'measure') hint('Mesure : cliquez le point A puis le point B (Maj = axe droit). Échap pour quitter.');
  else if (T.tool === 'cable') hint('Câble : cliquez les points du chemin, double-clic / clic droit / Entrée pour finir, Retour arrière = annuler un point.');
  else if (T.tool === 'place') hint('Placement : cliquez pour poser, R / T pour pivoter, clic droit ou Échap pour terminer.');
  else if (T.tool === 'aim') hint('Viser : cliquez le point à éclairer (sol, scène, personne…). Tous les projecteurs sélectionnés s\'orientent vers ce point. Échap ou clic droit pour annuler.');
  else hint('');
  invalidate();
}
export function finishCable() {
  if (cPts.length >= 2) {
    const c = st.addCable(T.cableKind, cPts.map(p => [...p]));
    st.selectCable(c.id);
  }
  cPts = []; cursor.preview = null; clearGroup(gTemp); invalidate();
}
export function cableBackspace() { cPts.pop(); invalidate(); }
export function cancelTool() {
  if (T.tool === 'cable' && cPts.length) { cPts = []; cursor.preview = null; clearGroup(gTemp); invalidate(); return true; }
  if (T.tool === 'measure' && mStart) { mStart = null; cursor.preview = null; clearGroup(gTemp); invalidate(); return true; }
  return false;
}

/* ---------- événements souris ---------- */
function bindPointer() {
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    tw = null;
    const r = canvas.getBoundingClientRect();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 33; else if (e.deltaMode === 2) dy *= 100;
    const pinch = e.ctrlKey && e.deltaMode === 0 && Math.abs(e.deltaY) < 40; // pincement du pavé tactile
    const sens = pinch ? 0.011 : (e.ctrlKey || e.altKey) ? 0.0003 : 0.0012; // Ctrl / Alt + molette = zoom fin
    pushZoom(dy * sens, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('dblclick', onDbl);
  canvas.addEventListener('pointerleave', () => { if (ghost) { ghost.visible = false; invalidate(); } });
  window.addEventListener('blur', () => navClear());
}
// double-clic : recentre la vue (3D : se déplace vers le point visé, Plan : centre)
function onDbl(e) {
  if (T.tool === 'cable') { finishCable(); return; }
  if (T.tool !== 'select') return;
  const hit = pickObject(e);
  const P = hit ? hit.point.clone() : floorPoint(e);
  if (!P) return;
  if (T.view === '3d') animateOrb({ tx: P.x, ty: Math.max(0, P.y), tz: P.z, dist: clamp(orb.dist * 0.6, 4, 40) }, 450);
  else { ort.cx = P.x; if (T.view === 'plan') ort.cz = P.z; else ort.cz = T.view === 'side' ? P.z : ort.cz; }
  invalidate();
}
function onDown(e) {
  canvas.focus && canvas.focus();
  tw = null;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  const base = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, button: e.button, shift: e.shiftKey || e.ctrlKey || e.metaKey };
  if (e.button === 2) { drag = { ...base, kind: T.view === '3d' ? 'look' : 'pan' }; return; }
  if (e.button === 1) { drag = { ...base, kind: 'pan' }; return; }
  if (e.button !== 0) return;
  if (T.tool !== 'select') { drag = { ...base, kind: 'tool' }; return; }
  const cid = pickIn(e, gCables, 'cableId');
  if (cid != null) { st.selectCable(cid); drag = { ...base, kind: 'none' }; return; }
  const mid = pickIn(e, gMeasures, 'measureId');
  if (mid != null) { st.selectMeasure(mid); drag = { ...base, kind: 'none' }; return; }
  const hit = pickObject(e, true);
  const camKind = T.view === 'plan' ? 'marquee' : T.view === '3d' ? (base.shift ? 'pan' : 'orbit') : 'pan';
  if (hit) {
    const o = st.getObj(hit.id);
    const d = def(o.type);
    // objet verrouillé, ou zone / tente pas encore sélectionnée : le glisser agit sur la vue, le simple clic sélectionne
    if (o.locked || (d.passive && !sel.ids.has(hit.id))) { drag = { ...base, kind: camKind, passiveId: hit.id }; return; }
    if (base.shift) st.toggleSel(hit.id);
    else if (!sel.ids.has(hit.id)) st.selectOnly(hit.id);
    if (!sel.ids.has(hit.id)) { drag = { ...base, kind: 'none' }; return; }
    const normal = T.view === 'front' ? new THREE.Vector3(0, 0, 1) : T.view === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const p0 = planeHit(e, normal, hit.point);
    const starts = new Map(st.selObjs().filter(s => !s.locked).map(s => [s.id, { x: s.x, y: s.y, z: s.z }]));
    // les objets posés sur un support déplacé (console sur table, ampli sur case…) suivent le mouvement
    for (let pass = 0; pass < 3; pass++) {
      for (const sid of [...starts.keys()]) {
        const s = st.getObj(sid), sd = def(s.type);
        if (!sd.support) continue;
        for (const q of st.S.objects) {
          if (starts.has(q.id) || q.locked || q.id === s.id) continue;
          if (st.contains(s, q.x, q.z, 0.02, sd.supportScale || 1) && Math.abs(q.y - (s.y + s.h)) < 0.03) starts.set(q.id, { x: q.x, y: q.y, z: q.z });
        }
      }
    }
    drag = { ...base, kind: 'move', id: hit.id, normal, plane: hit.point.clone(), p0, starts, started: false, narrow: !base.shift && sel.ids.size > 1 };
    return;
  }
  drag = { ...base, kind: camKind };
}
function onMove(e) {
  const fp = T.view === '3d' || T.view === 'plan' ? floorPoint(e) : null;
  if (fp) { cursor.x = fp.x; cursor.z = fp.z; cursor.valid = true; V.onCursor && V.onCursor(fp.x, fp.z); }
  if (!drag) {
    if (T.tool === 'place') moveGhost(e);
    else if (T.tool !== 'select') updateTemp(e);
    else {
      const hit = pickObject(e, true);
      const c = pickIn(e, gCables, 'cableId') != null || pickIn(e, gMeasures, 'measureId') != null;
      canvas.style.cursor = c ? 'pointer' : hit ? (st.getObj(hit.id)?.locked ? 'not-allowed' : 'move') : 'default';
    }
    return;
  }
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
  drag.lx = e.clientX; drag.ly = e.clientY;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) {
    drag.moved = true;
    if (['pan', 'orbit', 'look', 'tool'].includes(drag.kind)) canvas.style.cursor = 'grabbing';
  }
  if (!drag.moved) return;
  switch (drag.kind) {
    case 'pan': panBy(dx, dy); break;
    case 'orbit': orbitBy(dx, dy); break;
    case 'look': lookBy(dx, dy); break;
    case 'tool': if (T.view === '3d') orbitBy(dx, dy); else panBy(dx, dy); break;
    case 'marquee': {
      const r = host.getBoundingClientRect();
      const x0 = Math.min(drag.sx, e.clientX) - r.left, y0 = Math.min(drag.sy, e.clientY) - r.top;
      Object.assign(marqueeEl.style, { display: 'block', left: x0 + 'px', top: y0 + 'px', width: Math.abs(e.clientX - drag.sx) + 'px', height: Math.abs(e.clientY - drag.sy) + 'px' });
      break;
    }
    case 'move': doMove(e); break;
    default: break;
  }
}
function doMove(e) {
  if (!drag.p0) return;
  const P = planeHit(e, drag.normal, drag.plane);
  if (!P) return;
  drag.started = true;
  const prim = drag.starts.get(drag.id), po = st.getObj(drag.id);
  if (!prim || !po) return;
  const excl = new Set(drag.starts.keys());
  const S = st.S.settings;
  let nx = prim.x, nz = prim.z, ny = prim.y;
  if (T.view === 'front') { nx = prim.x + (P.x - drag.p0.x); ny = prim.y + (P.y - drag.p0.y); }
  else if (T.view === 'side') { nz = prim.z + (P.z - drag.p0.z); ny = prim.y + (P.y - drag.p0.y); }
  else { nx = prim.x + (P.x - drag.p0.x); nz = prim.z + (P.z - drag.p0.z); }
  const s = snapXZ(po, nx, nz, excl);
  if (T.view === 'front') s.z = prim.z;
  if (T.view === 'side') s.x = prim.x;
  if (T.view === 'front') s.x = S.snap ? Math.round(nx / S.grid) * S.grid : nx;
  if (T.view === 'side') s.z = S.snap ? Math.round(nz / S.grid) * S.grid : nz;
  const ddx = s.x - prim.x, ddz = s.z - prim.z;
  const vertical = T.view === 'front' || T.view === 'side';
  const dy = vertical ? (S.snap ? Math.round((ny - prim.y) / 0.05) * 0.05 : ny - prim.y) : 0;
  for (const [id, st0] of drag.starts) {
    const o = st.getObj(id);
    o.x = Math.round((st0.x + ddx) * 1000) / 1000; o.z = Math.round((st0.z + ddz) * 1000) / 1000;
    if (vertical) { o.y = Math.max(0, st0.y + dy); if (dy !== 0) o.manualY = true; }
  }
  if (!vertical) { st.relift(); drag.starts.forEach((_, id) => { const o = st.getObj(id); if (o) st.hangOnTruss(o); }); } // recalcule les hauteurs une fois toutes les positions mises à jour
  st.emit('moving');
}
function onUp(e) {
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  const d = drag;
  drag = null;
  marqueeEl.style.display = 'none';
  canvas.style.cursor = T.tool === 'select' ? 'default' : 'crosshair';
  if (!d) return;
  const click = !d.moved;
  if ((d.kind === 'pan' || d.kind === 'look') && click && d.button === 2) {
    if (T.tool === 'cable' && cPts.length >= 2) finishCable();
    else if (!cancelTool() && T.tool !== 'select') { T.tool = 'select'; st.emit('tool'); refreshTool(); }
    return;
  }
  if (d.kind === 'tool' && click) { toolClick(e); return; }
  if (d.kind === 'move') {
    if (d.started) { st.relift(); st.commit(); st.emit('moving'); }
    else if (d.narrow) st.selectOnly(d.id);
    return;
  }
  if (d.kind === 'marquee') {
    if (click) { clickEmpty(d); return; }
    const r = canvas.getBoundingClientRect();
    const x0 = Math.min(d.sx, e.clientX), x1 = Math.max(d.sx, e.clientX), y0 = Math.min(d.sy, e.clientY), y1 = Math.max(d.sy, e.clientY);
    const ids = [];
    const v = new THREE.Vector3();
    for (const o of st.S.objects) {
      if (!st.isPickable(o)) continue;
      v.set(o.x, 0, o.z).project(ortho);
      const px = r.left + ((v.x + 1) / 2) * r.width, py = r.top + ((1 - v.y) / 2) * r.height;
      if (px >= x0 && px <= x1 && py >= y0 && py <= y1) ids.push(o.id);
    }
    st.selectIds(d.shift ? [...new Set([...sel.ids, ...ids])] : ids);
    return;
  }
  if ((d.kind === 'orbit' || d.kind === 'pan') && click && d.button === 0) clickEmpty(d);
}
// clic simple sans glisser : sélectionne l'objet « passif » visé, sinon vide la sélection
function clickEmpty(d) {
  if (d.passiveId != null) { if (d.shift) st.toggleSel(d.passiveId); else st.selectOnly(d.passiveId); }
  else if (!d.shift) st.clearSel();
}
function toolClick(e) {
  if (T.tool === 'place') {
    if (!ghost) return;
    moveGhost(e);
    if (!ghost.visible) return;
    const o = st.addObject(ghostType, ghostObj.x, ghostObj.z, { rot: ghostObj.rot, ...((ghostObj.mount | 0) > 0 ? { mount: ghostObj.mount, h: ghostObj.h, tilt: ghostObj.tilt } : {}) });
    st.hangOnTruss(o);
    st.commit();
    st.selectOnly(o.id);
    return;
  }
  if (T.tool === 'aim') {
    const P = aimTarget(e), lamps = st.selObjs().filter(o => st.orientable(o) && !o.locked);
    if (P && lamps.length) {
      lamps.forEach(o => st.aimAt(o, P.x, P.y, P.z));
      st.commit();
    }
    T.tool = 'select'; st.emit('tool'); refreshTool();
    return;
  }
  const p = groundPoint(e);
  if (!p) return;
  let q = snapPoint(e, p, T.tool === 'cable');
  if (T.tool === 'measure') {
    if (!mStart) { mStart = q; updateTemp(e); return; }
    if (e.shiftKey) q = axisLock(mStart, q);
    if (Math.hypot(q[0] - mStart[0], q[1] - mStart[1]) > 0.01) {
      const m = st.addMeasure(mStart, q);
      st.selectMeasure(m.id);
    }
    mStart = null; cursor.preview = null; clearGroup(gTemp);
  } else if (T.tool === 'cable') {
    const last = cPts[cPts.length - 1];
    if (last && e.shiftKey) q = axisLock(last, q);
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 0.01) cPts.push(q);
    updateTemp(e);
  }
}

/* ================= annotations HTML (cotes) ================= */
function tagFor(i) {
  while (tagPool.length <= i) {
    const d = document.createElement('div');
    d.className = 'tag';
    overlayEl.appendChild(d);
    tagPool.push(d);
  }
  return tagPool[i];
}
function polyMid(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let t = L / 2;
  for (let i = 1; i < pts.length; i++) {
    const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (t <= s || i === pts.length - 1) { const k = s ? t / s : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
    t -= s;
  }
  return pts[0];
}
export function overlayItems(forCapture) {
  const S = st.S, items = [];
  for (const m of st.isGroupHidden('mesures') ? [] : S.measures) {
    const L = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]);
    items.push({ p: [(m.a[0] + m.b[0]) / 2, 0.12, (m.a[1] + m.b[1]) / 2], text: st.fm(L), cls: 'mea' + (sel.measure === m.id ? ' on' : '') });
  }
  for (const c of st.isGroupHidden('cables') ? [] : S.cables) {
    const mp = polyMid(c.pts);
    const L = st.cableLength(c);
    items.push({ p: [mp[0], 0.14, mp[1]], text: st.fn(L, 1) + ' m', cls: 'cab' + (sel.cable === c.id ? ' on' : ''), color: CABLE_KINDS[c.kind]?.color });
  }
  if (!forCapture) {
    const os = st.selObjs();
    if (os.length === 1) {
      const o = os[0];
      items.push({ p: [o.x, o.y + o.h + 0.55, o.z], text: `${st.fn(o.w, 2)} × ${st.fn(o.d, 2)} × ${st.fn(o.h, 2)} m`, cls: 'dim' });
    }
    const pv = cursor.preview;
    if (pv && pv.length >= 2) {
      const a = pv[pv.length - 2], b = pv[pv.length - 1];
      let tot = 0;
      for (let i = 1; i < pv.length; i++) tot += Math.hypot(pv[i][0] - pv[i - 1][0], pv[i][1] - pv[i - 1][1]);
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      items.push({ p: [(a[0] + b[0]) / 2, 0.15, (a[1] + b[1]) / 2], text: pv.length > 2 ? `${st.fm(seg)} · total ${st.fm(tot)}` : st.fm(seg), cls: 'live' });
    }
  }
  return items;
}
function updateOverlays() {
  const w = host.clientWidth, h = host.clientHeight, c = cam();
  const items = overlayItems(false);
  const v = new THREE.Vector3();
  let n = 0;
  for (const it of items) {
    v.set(it.p[0], it.p[1], it.p[2]).project(c);
    if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
    const el = tagFor(n++);
    el.className = 'tag ' + it.cls;
    el.textContent = it.text;
    el.style.display = 'block';
    el.style.transform = `translate(-50%,-50%) translate(${((v.x + 1) / 2) * w}px,${((1 - v.y) / 2) * h}px)`;
    el.style.borderColor = it.color || '';
  }
  for (let i = n; i < tagPool.length; i++) tagPool[i].style.display = 'none';
  // barre d'échelle
  if (T.view === '3d') scaleEl.style.display = 'none';
  else {
    const sp = scaleSpec(ort.ppm);
    scaleEl.style.display = 'block';
    scaleEl.querySelector('i').style.width = sp.px + 'px';
    scaleEl.querySelector('b').textContent = sp.len >= 1 ? sp.len + ' m' : Math.round(sp.len * 100) + ' cm';
  }
}
export function scaleSpec(ppm) {
  for (const len of [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]) if (len * ppm >= 70) return { len, px: len * ppm };
  return { len: 50, px: 50 * ppm };
}

/* ================= export d'images (réutilise le rendu principal, redimensionné le temps d'une capture) ================= */
export function capture(kind, W, H) {
  // les exports (fiche, PNG) restent toujours clairs, pour l'impression
  const wasTheme = T.theme, wasLabels = T.labels;
  setTheme('print');
  if (!wasLabels) { T.labels = true; syncAll(); } // les noms figurent toujours sur les exports
  const res = captureNow(kind, W, H);
  if (!wasLabels) { T.labels = false; syncAll(); }
  setTheme(wasTheme);
  return res;
}
function captureNow(kind, W, H) {
  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevPR = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  const hidden = [];
  const hide = obj => { if (obj.visible) { obj.visible = false; hidden.push(obj); } };
  hide(gGhost); hide(gTemp);
  views.forEach(v => hide(v.selBox));
  const footWas = [];
  views.forEach(v => { if (v.foot) { footWas.push([v.foot, v.foot.visible]); v.foot.visible = kind === 'plan'; } });
  scene.background = new THREE.Color(kind === 'plan' ? '#f1f8fd' : '#e3f2fc');
  const b = contentBounds();
  let camera, ppm = 1, centerX = 0, centerZ = 0, capDist = 20;
  if (kind === 'plan') {
    const bw = b.maxX - b.minX + 3, bd = b.maxZ - b.minZ + 3;
    ppm = Math.min(W / bw, H / bd);
    centerX = (b.minX + b.maxX) / 2; centerZ = (b.minZ + b.maxZ) / 2;
    camera = new THREE.OrthographicCamera(-W / 2 / ppm, W / 2 / ppm, H / 2 / ppm, -H / 2 / ppm, 0.1, 1000);
    camera.position.set(centerX, 300, centerZ); camera.up.set(0, 0, -1); camera.lookAt(centerX, 0, centerZ);
  } else {
    camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 600);
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const R = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ, b.maxY) / 2 + 1;
    const dist = (R / Math.sin(THREE.MathUtils.degToRad(21))) * 0.62;
    const cp = Math.cos(0.55);
    camera.position.set(cx + dist * cp * Math.sin(0.5), Math.min(1.5, b.maxY / 2) + dist * Math.sin(0.55), cz + dist * cp * Math.cos(0.5));
    camera.lookAt(cx, Math.min(1.5, b.maxY / 2), cz);
    capDist = dist;
  }
  camera.updateMatrixWorld();
  // étiquettes à ≈ 22 px (à la taille d'écran habituelle) quelle que soit la résolution de l'image
  setLabelK(clamp(kind === 'plan'
    ? ((17 * (W / 1300)) / ppm) / 0.3
    : (2 * capDist * Math.tan(THREE.MathUtils.degToRad(21)) * (22 / 800)) / 0.3, 0.2, 3));
  renderer.render(scene, camera);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  ctx.drawImage(renderer.domElement, 0, 0);
  // restauration
  lastLabelK = 0;
  scene.background = null;
  hidden.forEach(o => { o.visible = true; });
  footWas.forEach(([f, vis]) => { f.visible = vis; });
  renderer.setPixelRatio(prevPR);
  renderer.setSize(prevSize.x, prevSize.y, false);
  // cotes (taille proportionnelle à la résolution de l'image)
  const k = Math.max(1, W / 1300);
  const v = new THREE.Vector3();
  ctx.font = `bold ${Math.round(13 * k)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const it of overlayItems(true)) {
    v.set(it.p[0], it.p[1], it.p[2]).project(camera);
    if (v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02) continue;
    const x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * H, tw2 = ctx.measureText(it.text).width + 14 * k;
    ctx.fillStyle = it.cls.startsWith('mea') ? 'rgba(255,170,40,.97)' : 'rgba(255,255,255,.95)';
    rr(ctx, x - tw2 / 2, y - 11 * k, tw2, 22 * k, 11 * k); ctx.fill();
    ctx.strokeStyle = it.color || (it.cls.startsWith('mea') ? '#c26a00' : '#3b9fd1'); ctx.lineWidth = 2 * k; rr(ctx, x - tw2 / 2, y - 11 * k, tw2, 22 * k, 11 * k); ctx.stroke();
    ctx.fillStyle = it.cls.startsWith('mea') ? '#3a1d00' : '#06385f';
    ctx.fillText(it.text, x, y + k);
  }
  let scale = null;
  if (kind === 'plan') {
    const sp = scaleSpec(ppm / k);
    const bar = sp.px * k;
    const x = 24 * k, y = H - 28 * k;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, x - 10 * k, y - 20 * k, bar + 90 * k, 40 * k, 12 * k); ctx.fill();
    ctx.strokeStyle = '#3b9fd1'; ctx.lineWidth = 2 * k; ctx.stroke();
    ctx.fillStyle = '#06385f'; ctx.fillRect(x, y - 3 * k, bar, 6 * k);
    ctx.fillRect(x, y - 9 * k, 2 * k, 18 * k); ctx.fillRect(x + bar - 2 * k, y - 9 * k, 2 * k, 18 * k);
    ctx.textAlign = 'left';
    ctx.fillText(sp.len >= 1 ? sp.len + ' m' : sp.len * 100 + ' cm', x + bar + 10 * k, y);
    scale = { ppm, imageWidthM: W / ppm };
  }
  invalidate();
  return { canvas: out, scale };
}
