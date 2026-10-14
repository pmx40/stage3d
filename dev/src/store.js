// État de l'application, historique (annuler/rétablir), géométrie et calculs métier.
import { def, CABLE_KINDS, STD_LENGTHS, GROUPS, PSEUDO_GROUPS, mountGeom, dmxInfo } from './catalog.js';
import { tr, decimal } from './i18n.js';

/* ---------- événements ---------- */
const bus = new EventTarget();
export const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
export const on = (n, f) => bus.addEventListener(n, e => f(e.detail));

/* ---------- état ---------- */
// Version du format de plan (.stage3d.json et sauvegarde automatique). À incrémenter à chaque ajout de champ, avec une étape dans MIGRATIONS.
//   1 = première version publique
//   2 = calques (S.groups, o.group), numéros de retour (o.num), type de sol (room.floor)
//   4 = intensité individuelle des projecteurs (o.level, 0-100, absent = 100)
//   3 = plateaux et changement de plateau (S.plateaux, o.pl), fixation des projecteurs (o.mount), patch lumière DMX (o.dmxU, o.dmxA, o.dmxM), famille des voies du patch son (patch[].grp)
// Règle : un plan plus ancien doit toujours s'ouvrir ; les champs inconnus (plan plus récent) sont conservés tels quels.
export const STATE_VERSION = 4;
export function blankState() {
  return {
    app: 'Stage3D',
    v: STATE_VERSION,
    meta: { name: tr('Nouvel événement'), date: '', lieu: '', auteur: '', notes: '', temp: 20 },
    room: { w: 20, d: 28, back: 5, floor: 'std' },
    settings: { grid: 0.25, snap: true, magnet: true, margin: 10, rab: 1 },
    objects: [],
    groups: [], // calques personnalisés : [{ id, name }]
    plateaux: [], // plateaux (groupes qui se succèdent sur scène) : [{ id, name }]
    cables: [],
    measures: [],
    patch: [],
    nextId: 1,
  };
}
// étapes de migration : MIGRATIONS[n] transforme un plan de version n en version n + 1 (sur une copie déjà complétée par les valeurs par défaut)
const MIGRATIONS = {
  1: r => { // v1 -> v2 : calques, sol ; num et group sont facultatifs sur les objets (absents = valeurs par défaut)
    if (!Array.isArray(r.groups)) r.groups = [];
    if (!r.room.floor) r.room.floor = 'std';
  },
  3: () => { /* v3 -> v4 : o.level est facultatif (absent = 100 %) */ },
  2: r => { // v2 -> v3 : plateaux ; o.pl, o.mount, o.dmx* et patch[].grp sont facultatifs (absents = valeurs par défaut)
    if (!Array.isArray(r.plateaux)) r.plateaux = [];
  },
};
const finite = (v, d) => (v !== null && v !== '' && Number.isFinite(+v) ? +v : d);
function migrate(s) {
  const b = blankState();
  s = s && typeof s === 'object' ? s : {};
  const from = finite(s.v, 1) >= 1 ? Math.floor(finite(s.v, 1)) : 1;
  const r = {
    ...b, ...s, // les champs inconnus d'un plan plus récent sont conservés
    meta: { ...b.meta, ...(s.meta || {}) },
    room: { ...b.room, ...(s.room || {}) },
    settings: { ...b.settings, ...(s.settings || {}) },
    objects: Array.isArray(s.objects) ? s.objects.filter(o => o && typeof o === 'object') : [],
    groups: Array.isArray(s.groups) ? s.groups.filter(g => g && g.id != null) : [],
    plateaux: Array.isArray(s.plateaux) ? s.plateaux.filter(p => p && p.id != null) : [],
    cables: Array.isArray(s.cables) ? s.cables : [], measures: Array.isArray(s.measures) ? s.measures : [], patch: Array.isArray(s.patch) ? s.patch : [],
  };
  for (let n = from; n < STATE_VERSION; n++) if (MIGRATIONS[n]) MIGRATIONS[n](r);
  // objets : champs numériques manquants ou illisibles remplacés par ceux de leur type ; identifiants uniques
  const used = new Set();
  let maxId = 0;
  r.objects.forEach(o => { const id = finite(o.id, 0); if (id > 0) maxId = Math.max(maxId, id); });
  r.objects.forEach(o => {
    const d = def(o.type);
    for (const k of ['w', 'd', 'h']) o[k] = finite(o[k], d[k]);
    for (const k of ['x', 'y', 'z', 'rot']) o[k] = finite(o[k], 0);
    let id = finite(o.id, 0);
    if (id <= 0 || used.has(id)) id = ++maxId;
    o.id = id; used.add(id);
    if (typeof o.color !== 'string') o.color = d.color;
  });
  r.nextId = Math.max(finite(r.nextId, 1), maxId + 1);
  r.v = Math.max(from, STATE_VERSION); // un plan plus récent garde son numéro
  r.app = 'Stage3D';
  return r;
}
export let S = blankState();
export function setState(s) { S = migrate(s); pruneLayerPrefs(); clampSel(); }

// préférences d'affichage / outil courant (non annulables)
export const T = { tool: 'select', placeType: null, view: '3d', labels: false, labelsSet: false, floorDark: true, coverage: false, beams: false, grid: true, cableKind: 'xlr', tab: 'obj', theme: 'dark', themeSet: false,
  hiddenG: [], lockedG: [], beamOff: [], listVisibleOnly: true,
  co: { on: false, from: '', to: '' }, placeMount: 'auto', patchMode: 'son',
  beamLevel: 100, beamSize: 100 }; // intensité et taille des faisceaux (réglage général d'affichage, en %) // mode changement de plateau ; fixation d'un projecteur à la pose ; patch affiché // calques masqués / verrouillés, types de faisceaux désactivés, liste limitée aux calques visibles
export const sel = { ids: new Set(), cable: null, measure: null };

export const getObj = id => S.objects.find(o => o.id === id);
export const getCable = id => S.cables.find(c => c.id === id);
export const selObjs = () => [...sel.ids].map(getObj).filter(Boolean);
function clampSel() {
  for (const id of [...sel.ids]) if (!getObj(id)) sel.ids.delete(id);
  if (sel.cable && !getCable(sel.cable)) sel.cable = null;
  if (sel.measure && !S.measures.find(m => m.id === sel.measure)) sel.measure = null;
}
export function selectOnly(id) { sel.ids = new Set(id == null ? [] : [id]); sel.cable = null; sel.measure = null; emit('selection'); }
export function selectIds(ids) { sel.ids = new Set(ids); sel.cable = null; sel.measure = null; emit('selection'); }
export function toggleSel(id) { sel.ids.has(id) ? sel.ids.delete(id) : sel.ids.add(id); sel.cable = null; sel.measure = null; emit('selection'); }
export function selectCable(id) { sel.ids = new Set(); sel.cable = id; sel.measure = null; emit('selection'); }
export function selectMeasure(id) { sel.ids = new Set(); sel.cable = null; sel.measure = id; emit('selection'); }
export function clearSel() { selectOnly(null); }

/* ---------- formats ---------- */
export const fn = (n, dec = 1) => n.toFixed(dec).replace('.', decimal());
export const fm = (n, dec = 2) => fn(n, dec) + ' m';

/* ---------- historique ---------- */
let past = [], future = [];
const KEY = 'stage3d.v1';
const PKEY = 'stage3d.prefs';
export function resetHistory() { past = [JSON.stringify(S)]; future = []; }
export function commit() {
  const s = JSON.stringify(S);
  if (s === past[past.length - 1]) return false;
  past.push(s);
  if (past.length > 150) past.shift();
  future = [];
  saveLocal();
  emit('change');
  return true;
}
export function change(fnc) { fnc(); commit(); }
export function undo() {
  if (past.length < 2) return;
  future.push(past.pop());
  S = migrate(JSON.parse(past[past.length - 1]));
  pruneLayerPrefs(); clampSel(); saveLocal(); emit('change'); emit('selection');
}
export function redo() {
  if (!future.length) return;
  const s = future.pop();
  past.push(s);
  S = migrate(JSON.parse(s));
  pruneLayerPrefs(); clampSel(); saveLocal(); emit('change'); emit('selection');
}
export const canUndo = () => past.length > 1;
export const canRedo = () => future.length > 0;

/* ---------- persistance ---------- */
let saveTimer = 0;
export function saveLocal() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage indisponible */ } }, 250);
}
export function loadLocal() {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* ignore */ }
  return null;
}
export function savePrefs() {
  try { localStorage.setItem(PKEY, JSON.stringify({ labels: T.labels, labelsSet: T.labelsSet, floorDark: T.floorDark, coverage: T.coverage, beams: T.beams, grid: T.grid, cableKind: T.cableKind, theme: T.theme, themeSet: T.themeSet, hiddenG: T.hiddenG, lockedG: T.lockedG, beamOff: T.beamOff, listVisibleOnly: T.listVisibleOnly, co: T.co, beamLevel: T.beamLevel, beamSize: T.beamSize })); } catch (e) { /* ignore */ }
}
export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PKEY) || 'null');
    if (p) {
      const { theme, themeSet, labels, labelsSet, ...rest } = p;
      Object.assign(T, rest);
      // les noms sont masqués par défaut ; l'ancien réglage n'est repris que s'il a été choisi explicitement
      if (labelsSet) { T.labels = !!labels; T.labelsSet = true; }
      // le thème n'est repris que s'il a été choisi explicitement ; sinon le dark mode par défaut s'applique
      if (themeSet && (theme === 'aero' || theme === 'dark')) { T.theme = theme; T.themeSet = true; }
    }
  } catch (e) { /* ignore */ }
  for (const k of ['hiddenG', 'lockedG', 'beamOff']) if (!Array.isArray(T[k])) T[k] = [];
  if (!T.co || typeof T.co !== 'object') T.co = { on: false, from: '', to: '' };
  for (const k of ['beamLevel', 'beamSize']) if (!Number.isFinite(+T[k])) T[k] = 100; else T[k] = Math.min(100, Math.max(k === 'beamSize' ? 20 : 0, +T[k]));
}
export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export const safeName = () => (S.meta.name || 'plan').replace(/[^\w\-àâäéèêëîïôöùûüç ]+/gi, '').trim().replace(/\s+/g, '_') || 'plan';
export function exportJSON() {
  downloadBlob(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), safeName() + '.stage3d.json');
}
// renvoie { newer: true } si le plan vient d'une version plus récente de Stage3D (ouvert au mieux, sans rien supprimer)
export function importJSONText(text) {
  const s = JSON.parse(text);
  if (!s || !Array.isArray(s.objects)) throw new Error(tr('Fichier invalide'));
  const newer = finite(s.v, 1) > STATE_VERSION;
  setState(s);
  resetHistory(); saveLocal();
  clearSel(); emit('change');
  return { newer, version: finite(s.v, 1) };
}

/* ---------- géométrie ---------- */
const rad = o => (-o.rot * Math.PI) / 180;
export function corners(o) {
  const th = rad(o), c = Math.cos(th), s = Math.sin(th), hw = o.w / 2, hd = o.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, lz]) => [o.x + lx * c + lz * s, o.z - lx * s + lz * c]);
}
export function extents(o) {
  const th = rad(o), c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  return { hx: (o.w * c + o.d * s) / 2, hz: (o.w * s + o.d * c) / 2 };
}
export function contains(o, px, pz, shrink = 0, scale = 1) {
  const th = rad(o), c = Math.cos(th), s = Math.sin(th), dx = px - o.x, dz = pz - o.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) <= (o.w / 2) * scale - shrink && Math.abs(lz) <= (o.d / 2) * scale - shrink;
}
export const liftsDef = d => !d.fixed && (!d.support || d.lifts);
// un projecteur posé (au sol ou sur pied) se pose sur ce qu'il y a dessous comme un objet ordinaire ; accroché, il reste en hauteur
export const liftsObj = o => { const d = def(o.type); return (!d.fixed || (d.mount && (o.mount | 0) > 0)) && (!d.support || d.lifts); };
export function supportTop(px, pz, exceptId, forSupport, selfArea = 0, cover = false) {
  let top = 0;
  for (const o of S.objects) {
    if (o.id === exceptId) continue;
    const d = def(o.type);
    if (!d.support) continue;
    if (cover && !d.praticable) continue; // un tapis ne se pose que sur le sol ou sur des praticables (même plus petits que lui)
    // un support qui se pose lui-même (case, table) ne repose que sur un support de plus grande surface : évite les boucles
    if (forSupport && !cover && d.lifts && !(o.w * o.d > selfArea * 1.02)) continue;
    if (contains(o, px, pz, 0.02, d.supportScale || 1)) top = Math.max(top, o.y + o.h);
  }
  return top;
}
// hauteur du support sous l'objet : on échantillonne 5 points pour éviter l'effet « joint entre deux praticables »
function sampleTop(o, forSupport) {
  const cover = !!def(o.type).covering;
  const small = o.w < 0.5 && o.d < 0.5;
  const th = rad(o), c = Math.cos(th), s = Math.sin(th);
  const loc = small ? [[0, 0]] : [[0, 0], [-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]];
  const tops = loc.map(([a, b]) => {
    const lx = a * o.w, lz = b * o.d;
    return supportTop(o.x + lx * c + lz * s, o.z - lx * s + lz * c, o.id, forSupport, o.w * o.d, cover);
  });
  if (tops.length === 1) return tops[0];
  for (const t of [...new Set(tops)].filter(v => v > 0).sort((a, b) => b - a)) if (tops.filter(x => x >= t).length >= 2) return t;
  return tops[0]; // un objet plus grand que son support (console sur un petit case) : le centre suffit
}
export function autoLift(o) {
  const d = def(o.type);
  if (!liftsObj(o) || o.manualY) return;
  o.y = sampleTop(o, !!d.support);
}
export function relift() {
  // supports qui se posent eux-mêmes : les plus grands d'abord (praticable > riser > table > case)
  const withSup = S.objects.filter(o => def(o.type).support && def(o.type).lifts).sort((a, b) => b.w * b.d - a.w * a.d);
  withSup.forEach(autoLift);
  S.objects.filter(o => !withSup.includes(o)).forEach(autoLift);
}

/* ---------- accrochage des projecteurs sur un truss : aimant sur la membrure la plus proche, hauteur sous le truss ---------- */
const isTruss = o => /^truss[0-9]/.test(o.type);
export function hangOnTruss(o) {
  const d = def(o.type);
  if (!d.hang || o.manualY || (o.mount | 0) > 0) return false;
  let best = null;
  for (const t of S.objects) {
    if (!isTruss(t)) continue;
    const th = rad(t), c = Math.cos(th), s = Math.sin(th), dx = o.x - t.x, dz = o.z - t.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const ex = Math.max(0, Math.abs(lx) - t.w / 2), ez = Math.max(0, Math.abs(lz) - t.d / 2);
    if (ex > 0.3 || ez > 0.5) continue;
    const dist = Math.hypot(ex, ez);
    if (!best || dist < best.dist) best = { t, c, s, lx, lz, dist };
  }
  if (!best) return false;
  const { t, c, s } = best, half = Math.max(0, t.w / 2 - 0.06);
  const lx = Math.max(-half, Math.min(half, best.lx)), lz = (best.lz < 0 ? -1 : 1) * (t.d / 2 - 0.02);
  o.x = Math.round((t.x + lx * c + lz * s) * 1000) / 1000;
  o.z = Math.round((t.z - lx * s + lz * c) * 1000) / 1000;
  o.y = Math.round((t.y + (d.y0 - 4.0)) * 1000) / 1000;
  return true;
}

/* ---------- orientation des projecteurs (pan = rotation de l'objet, tilt = inclinaison, positive vers le sol) ---------- */
export const lampPivotY = o => {
  const d = def(o.type);
  if (d.mount && (o.mount | 0) > 0) { const g = mountGeom(o); return o.y + g.stand + g.pivot; }
  return o.y + (d.tilt ? d.tilt.at * o.h : 0);
};
// fixation d'un projecteur : 0 = accroché (truss), 1 = au sol, 2 = sur pied (la hauteur H de l'objet = pied + projecteur)
export function setMount(o, m) {
  const d = def(o.type);
  if (!d.mount) return;
  m = m | 0;
  o.manualY = false;
  if (m === 0) {
    delete o.mount;
    o.h = d.h; o.y = d.y0 ?? 0;
    o.tilt = d.props && d.props.tilt != null ? d.props.tilt : 30;
    hangOnTruss(o);
    return;
  }
  const keep = (o.mount | 0) > 0 ? o.h : null;
  o.mount = m;
  const g = mountGeom({ ...o, h: d.h, mount: 1 });
  if (m === 1) o.h = Math.round(g.block * 1000) / 1000;
  else o.h = keep != null && (o.mount | 0) === 2 && keep > g.block + 0.3 ? keep : Math.round((1.8 + g.block) * 100) / 100;
  if (m === 1 && (o.tilt | 0) > 0) o.tilt = -25; // au sol, on vise vers le haut / l'avant
  if (m === 2 && (o.tilt | 0) < 0) o.tilt = 15; // sur pied, légèrement vers le bas
  autoLift(o);
}
export function aimAt(o, x, y, z) {
  const dx = x - o.x, dz = z - o.z, dy = y - lampPivotY(o), hd = Math.hypot(dx, dz);
  if (hd > 0.03) o.rot = Math.round((((Math.atan2(-dx, dz) * 180) / Math.PI) % 360 + 360) % 360);
  o.tilt = Math.round(Math.min(90, Math.max(-90, (Math.atan2(-dy, hd) * 180) / Math.PI)));
}
export const orientable = o => !!def(o.type).tilt;

/* ---------- objets ---------- */
export function newObject(type, x, z, extra = {}) {
  const d = def(type);
  const { temp, ...rest } = extra; // temp : objet fantôme, sans consommer d'identifiant
  const o = {
    id: temp ? -1 : S.nextId++, type, x, z, y: d.y0 ?? 0, rot: d.rot0 ?? 0,
    w: d.w, d: d.d, h: d.h, color: d.color, label: '', note: '', locked: false, manualY: false, ...(d.props || {}), ...rest,
  };
  if (d.opts) o.opt = o.opt ?? 0;
  if (d.speaker) { o.angle = d.speaker.angle; o.range = d.speaker.range; }
  if (d.tilt && o.tilt == null) o.tilt = 0;
  if (d.beam) o.beam = d.beam.angle;
  if (type === 'text') o.label = tr('Texte');
  autoLift(o);
  return o;
}
export function addObject(type, x, z, extra) {
  const o = newObject(type, x, z, extra);
  S.objects.push(o);
  return o;
}
export function deleteSelection() {
  if (sel.cable) { S.cables = S.cables.filter(c => c.id !== sel.cable); sel.cable = null; }
  else if (sel.measure) { S.measures = S.measures.filter(m => m.id !== sel.measure); sel.measure = null; }
  else if (sel.ids.size) { S.objects = S.objects.filter(o => !sel.ids.has(o.id)); sel.ids = new Set(); }
  else return;
  commit(); emit('selection');
}
export function duplicateObjects(objs, dx = 0.5, dz = 0.5) {
  const out = objs.map(o => {
    const n = JSON.parse(JSON.stringify(o));
    n.id = S.nextId++; n.x += dx; n.z += dz;
    if (!n.manualY) autoLift(n);
    S.objects.push(n);
    return n;
  });
  return out;
}
let clip = null;
export function copySel() { const os = selObjs(); if (os.length) clip = JSON.stringify(os); return os.length; }
export function pasteClip() {
  if (!clip) return;
  const os = JSON.parse(clip);
  const ids = os.map(o => {
    o.id = S.nextId++; o.x += 0.5; o.z += 0.5;
    if (!o.manualY) autoLift(o);
    S.objects.push(o);
    return o.id;
  });
  clip = JSON.stringify(os);
  commit(); selectIds(ids);
}
export function rotateSel(deg) {
  const os = selObjs().filter(o => !o.locked);
  if (!os.length) return;
  if (os.length > 1) {
    const cx = os.reduce((a, o) => a + o.x, 0) / os.length, cz = os.reduce((a, o) => a + o.z, 0) / os.length;
    const th = (-deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
    os.forEach(o => {
      const dx = o.x - cx, dz = o.z - cz;
      o.x = cx + dx * c + dz * s; o.z = cz - dx * s + dz * c;
      o.rot = (((o.rot + deg) % 360) + 360) % 360;
    });
  } else os.forEach(o => { o.rot = (((o.rot + deg) % 360) + 360) % 360; });
  relift(); commit();
}
export function nudgeSel(dx, dz) {
  const os = selObjs().filter(o => !o.locked);
  if (!os.length) return;
  os.forEach(o => { o.x += dx; o.z += dz; });
  relift(); commit();
}
export function alignSel(mode) {
  const os = selObjs().filter(o => !o.locked);
  if (os.length < 2) return;
  const ex = os.map(o => ({ o, ...extents(o) }));
  const minX = Math.min(...ex.map(e => e.o.x - e.hx)), maxX = Math.max(...ex.map(e => e.o.x + e.hx));
  const minZ = Math.min(...ex.map(e => e.o.z - e.hz)), maxZ = Math.max(...ex.map(e => e.o.z + e.hz));
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  ex.forEach(e => {
    if (mode === 'left') e.o.x = minX + e.hx;
    else if (mode === 'right') e.o.x = maxX - e.hx;
    else if (mode === 'top') e.o.z = minZ + e.hz;
    else if (mode === 'bottom') e.o.z = maxZ - e.hz;
    else if (mode === 'centerx') e.o.x = cx;
    else if (mode === 'centerz') e.o.z = cz;
  });
  if (mode === 'distx' || mode === 'distz') {
    const key = mode === 'distx' ? 'x' : 'z';
    const sorted = [...os].sort((a, b) => a[key] - b[key]);
    if (sorted.length > 2) {
      const a = sorted[0][key], b = sorted[sorted.length - 1][key];
      sorted.forEach((o, i) => { o[key] = a + ((b - a) * i) / (sorted.length - 1); });
    }
  }
  relift(); commit();
}
// duplication en série : n copies décalées de (dx, dz)
export function seriesSel(n, dx, dz) {
  const base = selObjs();
  if (!base.length || n < 1) return;
  const ids = [];
  for (let i = 1; i <= n; i++) duplicateObjects(base, dx * i, dz * i).forEach(o => ids.push(o.id));
  commit(); selectIds([...base.map(o => o.id), ...ids]);
}

/* ---------- câbles & mesures ---------- */
export function addCable(kind, pts) {
  const c = { id: S.nextId++, kind, pts, label: '' };
  S.cables.push(c);
  commit();
  return c;
}
export function cableLength(c) {
  let L = 0;
  for (let i = 1; i < c.pts.length; i++) L += Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]);
  return L;
}
export const cableNeeded = c => cableLength(c) * (1 + S.settings.margin / 100) + 2 * S.settings.rab;
export const stdLength = len => STD_LENGTHS.find(l => l >= len - 1e-6) ?? Math.ceil(len / 10) * 10;
export function addMeasure(a, b) {
  const m = { id: S.nextId++, a, b };
  S.measures.push(m);
  commit();
  return m;
}

/* ---------- liste de matériel ---------- */
export function bom() {
  const rows = new Map();
  const objs = T.listVisibleOnly ? S.objects.filter(isVisible) : S.objects; // « fiche = ce que l'on voit » (réglable dans l'onglet Calques)
  for (const o of objs) {
    const d = def(o.type);
    if (d.id === 'text' || d.id === 'zone' || d.id === 'listener') continue;
    const dims = `${fn(o.w, 2)}×${fn(o.d, 2)}` + ((d.support || d.praticable) && o.h >= 0.01 ? ` h ${fn(o.h, 2)}` : '');
    const key = o.type + '|' + dims;
    const r = rows.get(key) || { cat: d.cat, name: tr(d.name), dims, qty: 0 };
    r.qty++;
    rows.set(key, r);
  }
  const list = [...rows.values()];
  const prat = objs.filter(o => def(o.type).praticable);
  const surface = prat.reduce((a, o) => a + o.w * o.d, 0);
  const cables = new Map();
  for (const c of S.cables) {
    const need = cableNeeded(c), std = stdLength(need);
    const key = c.kind + '|' + std;
    const r = cables.get(key) || { kind: c.kind, std, qty: 0 };
    r.qty++;
    cables.set(key, r);
  }
  const cl = [...cables.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.std - b.std);
  return { list, filtered: S.objects.length - objs.length, surface, nPrat: prat.length, cables: cl, cableTotal: S.cables.reduce((a, c) => a + cableNeeded(c), 0) };
}

/* ---------- acoustique : temps de propagation & délais ---------- */
export const soundSpeed = () => 331.3 + 0.606 * S.meta.temp;
export const monitors = () => S.objects.filter(o => def(o.type).monitor);
// numérote tous les retours de 1 à n, du côté jardin (gauche de l'écran) au côté cour (droite), puis par profondeur
export function numberMonitors() {
  monitors().sort((a, b) => a.x - b.x || a.z - b.z).forEach((o, i) => { o.num = String(i + 1); });
}
export const speakers = () => S.objects.filter(o => def(o.type).speaker);
export const listeners = () => S.objects.filter(o => def(o.type).listener);
const center = o => ({ x: o.x, y: o.y + o.h * 0.55, z: o.z });
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function arrivalTable(listenerId) {
  const L = getObj(listenerId);
  if (!L) return [];
  const ear = { x: L.x, y: L.y + L.h, z: L.z };
  const rows = speakers().map(s => {
    const dist = d3(center(s), ear);
    return { obj: s, dist, ms: (dist / soundSpeed()) * 1000 };
  });
  const max = Math.max(0, ...rows.map(r => r.ms));
  rows.forEach(r => { r.align = max - r.ms; });
  return rows.sort((a, b) => a.dist - b.dist);
}
export function delayTable(refId, haas) {
  const R = getObj(refId);
  if (!R) return [];
  return speakers().filter(s => def(s.type).speaker.delay && s.id !== R.id).map(s => {
    const dist = d3(center(R), center(s));
    const ms = (dist / soundSpeed()) * 1000;
    return { obj: s, dist, ms, value: ms + haas };
  });
}

/* ---------- calques (groupes) ---------- */
// groupes intégrés (selon le type d'objet) + groupes personnalisés de S.groups ; o.group force le groupe d'un objet
export const groupList = () => [...GROUPS, ...S.groups.map(g => ({ id: g.id, name: g.name, icon: '🗂', custom: true }))];
export const groupLabel = g => (g.custom ? g.name : tr(g.name));
const BUILTIN = new Set([...GROUPS, ...PSEUDO_GROUPS].map(g => g.id));
const isCustomId = id => S.groups.some(g => g.id === id);
export function groupOf(o) { return o.group && (BUILTIN.has(o.group) || isCustomId(o.group)) ? o.group : def(o.type).group; }
export function groupName(id) {
  const g = [...groupList(), ...PSEUDO_GROUPS].find(x => x.id === id);
  return g ? groupLabel(g) : id;
}
export const groupCount = id => S.objects.reduce((n, o) => n + (groupOf(o) === id ? 1 : 0), 0);
export const isGroupHidden = id => T.hiddenG.includes(id);
export const isGroupLocked = id => T.lockedG.includes(id);
export const isVisible = o => (!T.hiddenG.length || !T.hiddenG.includes(groupOf(o))) && !(T.co.on && changeStatus(o) === 'none');
// sélectionnable à la souris : visible et calque non verrouillé
export const isPickable = o => isVisible(o) && !(T.lockedG.length && T.lockedG.includes(groupOf(o)));
export const hiddenGroupNames = () => T.hiddenG.filter(id => BUILTIN.has(id) || isCustomId(id)).map(groupName);
export const hiddenObjectCount = () => (T.hiddenG.length ? S.objects.filter(o => !isVisible(o)).length : 0);

// les ids de calques personnalisés qui n'existent plus (autre plan, annulation) sont retirés des préférences
function pruneLayerPrefs() {
  const ok = id => BUILTIN.has(id) || isCustomId(id);
  T.hiddenG = T.hiddenG.filter(ok); T.lockedG = T.lockedG.filter(ok);
  const pl = id => S.plateaux.some(p => p.id === id);
  if (T.co.on && (!pl(T.co.from) || !pl(T.co.to) || T.co.from === T.co.to)) T.co.on = false; // le mode s'arrête si ses plateaux n'existent plus
}
export const refreshLayers = () => layersChanged(); // après un changement de groupe d'objets : retire de la sélection ce qui n'est plus visible
function layersChanged() {
  // la sélection ne garde que ce qui reste visible et déverrouillé
  const keep = [...sel.ids].filter(id => { const o = getObj(id); return o && isPickable(o); });
  let selChanged = keep.length !== sel.ids.size;
  if (selChanged) sel.ids = new Set(keep);
  if (sel.cable && isGroupHidden('cables')) { sel.cable = null; selChanged = true; }
  if (sel.measure && isGroupHidden('mesures')) { sel.measure = null; selChanged = true; }
  savePrefs();
  if (selChanged) emit('selection');
  emit('change');
}
const withId = (list, id, on) => (on ? [...new Set([...list, id])] : list.filter(x => x !== id));
export function setGroupHidden(id, hide) { T.hiddenG = withId(T.hiddenG, id, hide); layersChanged(); }
export const toggleGroupHidden = id => setGroupHidden(id, !isGroupHidden(id));
export function setGroupLocked(id, lock) { T.lockedG = withId(T.lockedG, id, lock); layersChanged(); }
// n'affiche que ce calque (les câbles et les mesures restent visibles) ; un second appel réaffiche tout
export function isolateGroup(id) {
  const others = groupList().map(g => g.id).filter(x => x !== id);
  const already = others.every(x => T.hiddenG.includes(x)) && !T.hiddenG.includes(id);
  T.hiddenG = already ? T.hiddenG.filter(x => !others.includes(x)) : [...T.hiddenG.filter(x => !others.includes(x) && x !== id), ...others];
  layersChanged();
}
export function showAllGroups() { T.hiddenG = []; layersChanged(); }
// filtre rapide : retire (ou remet) les musiciens et le backline
const BACK = ['backline', 'musiciens'];
export const backlineHidden = () => BACK.every(isGroupHidden);
export function toggleBackline() {
  T.hiddenG = backlineHidden() ? T.hiddenG.filter(x => !BACK.includes(x)) : [...new Set([...T.hiddenG, ...BACK])];
  layersChanged();
}
// création / renommage / suppression (modifient le plan : à encadrer par commit)
export function addGroup(name) {
  const n = S.groups.reduce((m, g) => Math.max(m, +String(g.id).slice(1) || 0), 0) + 1;
  const g = { id: 'g' + n, name: (name || '').trim() || tr('Calque {n}', { n }) };
  S.groups.push(g);
  return g.id;
}
export function renameGroup(id, name) { const g = S.groups.find(x => x.id === id); if (g && name.trim()) g.name = name.trim(); }
export function deleteGroup(id) {
  S.groups = S.groups.filter(g => g.id !== id);
  S.objects.forEach(o => { if (o.group === id) delete o.group; });
  pruneLayerPrefs();
}
// rattache des objets à un groupe (le groupe par défaut de leur type efface l'attribut)
export function setObjectsGroup(objs, gid) {
  objs.forEach(o => { if (gid === def(o.type).group) delete o.group; else o.group = gid; });
}

/* ---------- plateaux : changement de plateau ---------- */
// o.pl = liste des plateaux où l'objet est présent ; absent = présent sur tous (l'ordinaire : sono, régie, truss…)
const plExists = id => S.plateaux.some(p => p.id === id);
export const plateauName = id => (S.plateaux.find(p => p.id === id) || {}).name || id;
export const inPlateau = (o, id) => !Array.isArray(o.pl) || o.pl.includes(id);
// en mode changement : 'stay' reste en place, 'out' part (à sortir), 'in' arrive (à rentrer), 'none' absent des deux plateaux ; null si le mode est arrêté
export function changeStatus(o) {
  const c = T.co;
  if (!c.on) return null;
  const a = inPlateau(o, c.from), b = inPlateau(o, c.to);
  return a && b ? 'stay' : a ? 'out' : b ? 'in' : 'none';
}
export function addPlateau(name) {
  const n = S.plateaux.reduce((m, p) => Math.max(m, +String(p.id).slice(1) || 0), 0) + 1;
  const p = { id: 'p' + n, name: (name || '').trim() || tr('Plateau {n}', { n }) };
  S.plateaux.push(p);
  return p.id;
}
export function renamePlateau(id, name) { const p = S.plateaux.find(x => x.id === id); if (p && name.trim()) p.name = name.trim(); }
export function deletePlateau(id) {
  S.plateaux = S.plateaux.filter(p => p.id !== id);
  S.objects.forEach(o => { if (Array.isArray(o.pl)) { o.pl = o.pl.filter(x => x !== id); if (!o.pl.length) delete o.pl; } });
  pruneLayerPrefs();
}
const normPl = (o, set) => { if (S.plateaux.every(p => set.has(p.id))) delete o.pl; else o.pl = S.plateaux.map(p => p.id).filter(id => set.has(id)); };
const plSet = o => new Set(Array.isArray(o.pl) ? o.pl : S.plateaux.map(p => p.id));
// présence d'un objet sur un plateau (case à cocher du panneau Objet)
export function setObjectPlateau(o, id, on) { const set = plSet(o); on ? set.add(id) : set.delete(id); if (!set.size) set.add(id); normPl(o, set); }
// marque des objets pour le changement en cours : reste en place / part (plateau actuel seulement) / arrive (plateau suivant seulement)
export function markObjects(objs, kind) {
  const { from, to } = T.co;
  objs.forEach(o => {
    const set = plSet(o);
    if (kind === 'stay') { set.add(from); set.add(to); }
    else if (kind === 'out') { set.add(from); set.delete(to); }
    else { set.add(to); set.delete(from); }
    normPl(o, set);
  });
}
export function ensurePlateaux() {
  while (S.plateaux.length < 2) addPlateau();
  if (!plExists(T.co.from)) T.co.from = S.plateaux[0].id;
  if (!plExists(T.co.to) || T.co.to === T.co.from) T.co.to = (S.plateaux.find(p => p.id !== T.co.from) || S.plateaux[1]).id;
}
export function setChangeover(on) {
  if (on) { const had = S.plateaux.length >= 2; ensurePlateaux(); T.co.on = true; if (!had) commit(); } else T.co.on = false;
  refreshLayers();
}
export const toggleChangeover = () => setChangeover(!T.co.on);
export function setChangeoverPlateaux(from, to) {
  const old = { ...T.co };
  if (from != null) { T.co.from = from; if (from === T.co.to) T.co.to = old.from; } // choisir le même plateau des deux côtés les échange
  if (to != null) { T.co.to = to; if (to === T.co.from) T.co.from = old.to; }
  refreshLayers();
}
export function swapChangeover() { const { from, to } = T.co; T.co.from = to; T.co.to = from; refreshLayers(); }
// listes du changement en cours : objets qui sortent, qui rentrent, qui restent
export function changeLists() {
  const r = { out: [], in: [], stay: [] };
  if (!T.co.on) return r;
  S.objects.forEach(o => { const k = changeStatus(o); if (r[k]) r[k].push(o); });
  return r;
}
// regroupe des objets identiques (type + étiquette) pour les listes à imprimer
export function changeRows(list) {
  const m = new Map();
  list.forEach(o => {
    const key = o.type + '|' + (o.label || '');
    const r = m.get(key) || { name: def(o.type).name, label: o.label || '', qty: 0, ids: [], notes: [], cat: def(o.type).cat };
    r.qty++; r.ids.push(o.id); if (o.note) r.notes.push(o.note);
    m.set(key, r);
  });
  return [...m.values()].sort((a, b) => a.cat.localeCompare(b.cat) || tr(a.name).localeCompare(tr(b.name)));
}

/* ---------- patch lumière (DMX) : univers, adresse de départ, mode ---------- */
export const dmxObjs = () => S.objects.filter(o => dmxInfo(o));
export function dmxMode(o) {
  const i = dmxInfo(o);
  if (!i) return null;
  const idx = Math.min(Math.max(o.dmxM | 0, 0), i.modes.length - 1), m = i.modes[idx];
  return { idx, key: m[0], n: m[1], params: m[2], modes: i.modes };
}
export const dmxAddressed = o => (o.dmxA | 0) >= 1;
// plage occupée { u, a, b } (adresse de départ à adresse de fin)
export function dmxSpan(o) {
  const m = dmxMode(o);
  if (!m || !dmxAddressed(o)) return null;
  const u = Math.max(1, o.dmxU | 0 || 1), a = Math.min(512, o.dmxA | 0);
  return { u, a, b: a + m.n - 1 };
}
// projecteurs en conflit : plages qui se chevauchent dans un même univers, ou qui dépassent 512
export function dmxConflicts() {
  const bad = new Set(), by = new Map();
  dmxObjs().forEach(o => {
    const sp = dmxSpan(o);
    if (!sp) return;
    if (sp.b > 512) bad.add(o.id);
    (by.get(sp.u) || by.set(sp.u, []).get(sp.u)).push({ o, sp });
  });
  by.forEach(list => {
    list.sort((x, y) => x.sp.a - y.sp.a);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].sp.a <= list[i].sp.b; j++) { bad.add(list[i].o.id); bad.add(list[j].o.id); }
  });
  return bad;
}
export function dmxUsage() {
  const u = new Map();
  dmxObjs().forEach(o => { const sp = dmxSpan(o); if (sp) u.set(sp.u, (u.get(sp.u) || 0) + (sp.b - sp.a + 1)); });
  return [...u.entries()].sort((a, b) => a[0] - b[0]);
}
// ordre du patch : d'abord les projecteurs adressés (univers, adresse), puis les autres (jardin -> cour, de gauche à droite)
export function dmxRows() {
  const pos = (a, b) => a.x - b.x || a.z - b.z || a.id - b.id;
  const done = dmxObjs().filter(dmxAddressed).sort((a, b) => ((a.dmxU | 0) || 1) - ((b.dmxU | 0) || 1) || a.dmxA - b.dmxA || a.id - b.id);
  const todo = dmxObjs().filter(o => !dmxAddressed(o)).sort(pos);
  return [...done, ...todo];
}
const DMX_ORDER = {
  x: (a, b) => a.x - b.x || a.z - b.z || a.id - b.id, // jardin -> cour (gauche -> droite)
  z: (a, b) => a.z - b.z || a.x - b.x || a.id - b.id, // fond -> face
  type: (a, b) => a.type.localeCompare(b.type) || a.x - b.x || a.id - b.id,
};
// adresse les projecteurs à la suite, sans jamais couper un projecteur entre deux univers ; onlyNew : seulement ceux qui n'ont pas d'adresse
export function autoAddress({ order = 'x', startU = 1, startA = 1, onlyNew = false } = {}) {
  let list = dmxObjs();
  let u = Math.max(1, startU | 0), a = Math.min(512, Math.max(1, startA | 0));
  if (onlyNew) {
    list.filter(dmxAddressed).forEach(o => { const sp = dmxSpan(o); if (sp.u > u || (sp.u === u && sp.b + 1 > a)) { u = sp.u; a = sp.b + 1; } });
    list = list.filter(o => !dmxAddressed(o));
  }
  list.sort(DMX_ORDER[order] || DMX_ORDER.x);
  list.forEach(o => {
    const n = dmxMode(o).n;
    if (a + n - 1 > 512) { u++; a = 1; }
    o.dmxU = u; o.dmxA = a;
    a += n;
  });
  return list.length;
}
export function clearAddresses() { dmxObjs().forEach(o => { delete o.dmxU; delete o.dmxA; }); }

/* ---------- filtre des faisceaux par type de projecteur ---------- */
export const beamTypeOn = id => !T.beamOff.includes(id);
export function setBeamType(id, on) { T.beamOff = withId(T.beamOff, id, !on); savePrefs(); emit('change'); }
export function setAllBeamTypes(ids, on) { T.beamOff = on ? T.beamOff.filter(x => !ids.includes(x)) : [...new Set([...T.beamOff, ...ids])]; savePrefs(); emit('change'); }

export { CABLE_KINDS };
