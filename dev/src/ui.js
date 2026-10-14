// Interface : bibliothèque, barres d'outils, panneaux latéraux, raccourcis clavier.
import { CATS, DEFS, def, CABLE_KINDS, PSEUDO_GROUPS, BEAM_DEFS, dmxInfo } from './catalog.js';
import { PGROUPS, PCOL, patchGroup, fixName, mountText, addrText } from './patchutil.js';
import { h, $, toast } from './dom.js';
import { tr, LANGS, lang, setLang, applyStatic } from './i18n.js';
import * as st from './store.js';
import * as view from './view.js';
import { TEMPLATES, applyTemplate, rockPatch } from './templates.js';
import { openSheet, exportPng, bomCsv } from './sheet.js';
import { FLOORS, floorSwatch } from './floors.js';

const { T, sel } = st;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- fenêtres modales ---------- */
let holdTab = false;
// exécute une action sans quitter l'onglet courant (une sélection ramène sinon sur l'onglet Objet)
const keepTab = fn => { const was = holdTab; holdTab = true; try { return fn(); } finally { holdTab = was; } };
function pick(id) { holdTab = true; st.selectOnly(id); holdTab = false; }
function pickMeasure(id) { holdTab = true; st.selectMeasure(id); holdTab = false; }
function modal(content, wide) {
  const m = $('#modal');
  const box = m.querySelector('.mbox');
  box.className = 'mbox' + (wide === 'xl' ? ' wide xl' : wide ? ' wide' : '');
  box.replaceChildren(content);
  m.hidden = false;
}
export function closeModal() { $('#modal').hidden = true; renderPanel(); } // le panneau reflète ce qui a été modifié dans la fenêtre
function ask(title, text, okLabel = 'Continuer') {
  return new Promise(res => {
    const done = v => { closeModal(); res(v); };
    modal(h('div', {}, h('h3', {}, title), h('p', {}, text),
      h('div', { class: 'row end' }, h('button', { onclick: () => done(false) }, 'Annuler'), h('button', { class: 'primary', onclick: () => done(true) }, okLabel))));
  });
}

/* ---------- édition ---------- */
let selfEdit = false;
const live = [];
function edit(fn, relift = true) {
  selfEdit = true;
  try { fn(); if (relift) st.relift(); st.commit(); st.emit('moving'); } finally { selfEdit = false; }
  updateLive();
}
function updateLive() {
  live.forEach(l => { if (document.activeElement !== l.el) l.set(); });
}
function num(label, get, set, o = {}) {
  const { step = 0.05, min, max, unit = 'm', dec = 2, cls = '' } = o;
  const inp = h('input', { type: 'number', step });
  if (min != null) inp.min = min;
  if (max != null) inp.max = max;
  const setv = () => { inp.value = +(+get()).toFixed(dec); };
  setv();
  inp.addEventListener('change', () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (!isFinite(v)) { setv(); return; }
    set(clamp(v, min ?? -1e6, max ?? 1e6));
  });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
  live.push({ el: inp, set: setv });
  return h('label', { class: 'fld ' + cls }, h('span', {}, label), inp, unit ? h('em', {}, unit) : null);
}
function txt(label, get, set, o = {}) {
  const inp = o.area ? h('textarea', { rows: 3 }) : h('input', { type: o.type || 'text', placeholder: o.ph || '' });
  const setv = () => { inp.value = get() ?? ''; };
  setv();
  inp.addEventListener('change', () => set(inp.value));
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !o.area) inp.blur(); });
  live.push({ el: inp, set: setv });
  return h('label', { class: 'fld wide ' + (o.cls || '') }, h('span', {}, label), inp);
}
function chk(label, get, set) {
  const inp = h('input', { type: 'checkbox', checked: !!get() });
  inp.addEventListener('change', () => set(inp.checked));
  live.push({ el: inp, set: () => { inp.checked = !!get(); } });
  return h('label', { class: 'chk' }, inp, h('span', {}, label));
}
const section = (title, ...kids) => h('div', { class: 'sec' }, title ? h('h4', {}, title) : null, ...kids);

/* ================= bibliothèque ================= */
const openCats = new Set(); // toutes les catégories sont repliées à l'ouverture
function renderLib() {
  const f = $('#libSearch').value.trim().toLowerCase();
  const box = $('#libList');
  box.replaceChildren();
  for (const cat of CATS) {
    const items = DEFS.filter(d => d.cat === cat.id && !d.hidden && (!f || (tr(d.name) + ' ' + d.name + ' ' + tr(cat.name) + ' ' + d.id).toLowerCase().includes(f)));
    if (!items.length) continue;
    const det = h('details', { open: f ? true : openCats.has(cat.id) },
      h('summary', {}, h('span', {}, `${cat.icon}  ${tr(cat.name)}`), h('em', {}, items.length)),
      h('div', { class: 'grid' }, items.map(d => h('button', {
        class: 'item' + (T.tool === 'place' && T.placeType === d.id ? ' on' : ''),
        title: `${tr(d.name)} — ${st.fn(d.w, 2)} × ${st.fn(d.d, 2)} × ${st.fn(d.h, 2)} m`,
        onclick: () => startPlace(d.id),
      }, h('span', { class: 'ic' }, d.icon), h('span', { class: 'nm' }, d.name),
        h('span', { class: 'dm' }, ['zone', 'text', 'listener'].includes(d.id) ? '' : `${st.fn(d.w, 2)}×${st.fn(d.d, 2)}` + (d.h >= 0.3 ? ` · h ${st.fn(d.h, 2)}` : ''))))));
    det.addEventListener('toggle', () => { if (!f) det.open ? openCats.add(cat.id) : openCats.delete(cat.id); });
    box.append(det);
  }
  if (!box.children.length) box.append(h('p', { class: 'muted pad' }, 'Aucun objet ne correspond.'));
}
function startPlace(id) {
  const g = def(id).group;
  if (st.isGroupHidden(g)) { keepTab(() => st.setGroupHidden(g, false)); toast(tr('Calque « {n} » réaffiché', { n: st.groupName(g) })); }
  T.tool = 'place'; T.placeType = id; T.placeRot = null;
  st.emit('tool');
  view.refreshTool();
}
function setTool(t) {
  const pg = { cable: 'cables', measure: 'mesures' }[t];
  if (pg && st.isGroupHidden(pg)) { keepTab(() => st.setGroupHidden(pg, false)); toast(tr('Calque « {n} » réaffiché', { n: st.groupName(pg) })); }
  T.tool = t;
  if (t !== 'place') T.placeType = null;
  st.emit('tool');
  view.refreshTool();
}

/* ================= barres d'outils ================= */
function renderBars() {
  const views = [['3d', '3D'], ['plan', 'Plan'], ['front', 'Face'], ['side', 'Côté']];
  const vb = $('#vbar');
  vb.replaceChildren(
    h('div', { class: 'grp' }, views.map(([id, n], i) => h('button', { class: 'vbtn', 'data-view': id, title: `${tr('Vue')} ${tr(n)} (${i + 1})`, onclick: () => view.setView(id) }, n))),
    h('div', { class: 'grp zoomgrp' },
      h('button', { title: 'Réinitialiser la vue : angle par défaut, tout le plan cadré (0 ou Origine)', class: 'rst', onclick: () => view.resetView() }, '⟲'),
      h('button', { title: 'Cadrer tout (F)', onclick: () => view.frame() }, '⤢'),
      h('button', { title: 'Zoom − (Maj : pas fin)', onclick: e => view.zoomBy(e.shiftKey ? 1.08 : 1.3) }, '−'),
      (() => {
        const r = h('input', { type: 'range', min: 0, max: 1000, step: 1, id: 'zoomRange', title: 'Zoom précis : glisser. Molette + Ctrl ou Alt = pas fin.' });
        r.addEventListener('input', () => view.setZoomFrac(r.value / 1000));
        return r;
      })(),
      h('button', { class: 'zval', id: 'zoomVal', title: '3D : distance de la caméra à la cible · Plan, Face, Côté : échelle. Cliquer pour cadrer tout.', onclick: () => view.frame() }, '—'),
      h('button', { title: 'Zoom + (Maj : pas fin)', onclick: e => view.zoomBy(e.shiftKey ? 1 / 1.08 : 1 / 1.3) }, '+'))
  );
  const tools = [['select', '↖', 'Sélection (V)'], ['measure', '📏', 'Mesurer (M)'], ['cable', '〰', 'Tirer un câble (C)']];
  const kind = h('select', { id: 'cableKind', title: 'Type de câble', onchange: e => { T.cableKind = e.target.value; st.savePrefs(); } },
    Object.entries(CABLE_KINDS).map(([k, v]) => h('option', { value: k, selected: k === T.cableKind }, v.name)));
  const grid = h('select', { id: 'gridSel', title: 'Pas de la grille', onchange: e => { st.S.settings.grid = +e.target.value; st.commit(); st.emit('change'); } },
    [0.05, 0.1, 0.25, 0.5, 1].map(v => h('option', { value: v, selected: v === st.S.settings.grid }, st.fn(v, 2) + ' m')));
  $('#tbar').replaceChildren(
    h('div', { class: 'grp' }, tools.map(([id, ic, tt]) => h('button', { class: 'tbtn', 'data-tool': id, title: tt, onclick: () => setTool(id) }, ic))),
    h('div', { class: 'grp cablegrp' }, kind),
    h('div', { class: 'grp' },
      toggle('Grille', 'grid', 'Afficher la grille (G)'),
      toggle('Noms', 'labels', 'Afficher les étiquettes (L)'),
      toggle('Sol sombre', 'floorDark', 'Sol de la scène sombre ou clair'),
      toggle('Couverture', 'coverage', 'Afficher la couverture des enceintes (H)'),
      toggle('Faisceaux', 'beams', 'Afficher les faisceaux des projecteurs (B) : toujours visible pour les projecteurs sélectionnés'),
      h('button', { class: 'caret', title: 'Filtrer les faisceaux par type de projecteur', onclick: () => openLayersTab('beamSec') }, '▾')),
    h('div', { class: 'grp' },
      h('button', { class: 'tg', id: 'layBtn', title: "Calques : afficher ou masquer des groupes d'objets en un clic", onclick: () => openLayersTab() }, '🗂 Calques', h('i', { class: 'badge', id: 'layBadge' })),
      h('button', { class: 'tg', id: 'nobackBtn', title: 'Retirer (ou remettre) les musiciens et le backline', onclick: () => keepTab(() => st.toggleBackline()) }, 'Sans backline'),
      h('button', { class: 'tg', id: 'chgBtn', title: 'Changement de plateau : ce qui reste reste en place, ce qui part est grisé avec une note', onclick: () => toggleChangeover() }, '⇄ Changement')),
    h('div', { class: 'grp', id: 'mountGrp', style: 'display:none' },
      h('span', { class: 'glabel' }, 'Fixation'),
      [['auto', 'Auto', 'Accroché s\'il y a un truss à portée, sinon posé au sol'], [0, 'Truss', 'Accroché à un truss'], [2, 'Sur pied', 'Sur un pied télescopique'], [1, 'Au sol', 'Posé au sol ou sur un praticable']].map(([v, t, tt]) =>
        h('button', { class: 'tg', 'data-mount': v, title: tt, onclick: () => { T.placeMount = v; view.refreshTool(); syncBars(); } }, t))),
    h('div', { class: 'grp' }, h('button', { id: 'roomBtn', title: 'Dimensions de la salle', onclick: () => openRoom() }, '📐 Salle')),
    h('div', { class: 'grp' },
      h('button', { class: 'tg' + (st.S.settings.snap ? ' on' : ''), id: 'snapBtn', title: 'Accrochage à la grille', onclick: () => { st.S.settings.snap = !st.S.settings.snap; st.commit(); st.emit('change'); syncBars(); } }, '⌗ Grille'),
      grid,
      h('button', { class: 'tg' + (st.S.settings.magnet ? ' on' : ''), id: 'magBtn', title: 'Aimant : colle les bords aux autres objets', onclick: () => { st.S.settings.magnet = !st.S.settings.magnet; st.commit(); st.emit('change'); syncBars(); } }, '🧲 Aimant'))
  );
  syncBars();
}
function openLayersTab(anchor) {
  T.tab = 'lay'; renderTabs(); renderPanel();
  if (anchor) { const el = document.getElementById(anchor); if (el) el.scrollIntoView({ block: 'start' }); }
}
function toggle(label, key, title) {
  return h('button', { class: 'tg', 'data-tg': key, title, onclick: () => toggleOpt(key) }, label);
}
function toggleOpt(key) {
  T[key] = !T[key];
  if (key === 'labels') T.labelsSet = true;
  if (key === 'floorDark') view.setTheme(T.theme); // reconstruit le sol avec la nouvelle palette
  st.savePrefs();
  st.emit('change');
  syncBars();
}
function syncBars() {
  document.querySelectorAll('.vbtn').forEach(b => b.classList.toggle('on', b.dataset.view === T.view));
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('on', b.dataset.tool === T.tool));
  document.querySelectorAll('[data-tg]').forEach(b => b.classList.toggle('on', !!T[b.dataset.tg]));
  const cg = document.querySelector('.cablegrp');
  if (cg) cg.style.display = T.tool === 'cable' ? '' : 'none';
  const sb = $('#snapBtn'), mb = $('#magBtn'), gs = $('#gridSel');
  if (sb) sb.classList.toggle('on', st.S.settings.snap);
  if (mb) mb.classList.toggle('on', st.S.settings.magnet);
  if (gs) gs.value = st.S.settings.grid;
  const nb = $('#nobackBtn'), lb = $('#layBtn'), bd = $('#layBadge');
  if (nb) nb.classList.toggle('on', st.backlineHidden());
  if (lb) lb.classList.toggle('on', T.hiddenG.length > 0); // la barre signale qu'un calque est masqué
  if (bd) { bd.textContent = T.hiddenG.length || ''; bd.style.display = T.hiddenG.length ? '' : 'none'; }
  const cb = $('#chgBtn'), mg = $('#mountGrp');
  if (cb) cb.classList.toggle('on', !!T.co.on);
  if (mg) {
    const pd = T.tool === 'place' && T.placeType ? def(T.placeType) : null;
    mg.style.display = pd && pd.mount ? '' : 'none';
    mg.querySelectorAll('[data-mount]').forEach(b => b.classList.toggle('on', String(T.placeMount) === b.dataset.mount));
  }
  renderCoBar();
  $('#bUndo').disabled = !st.canUndo();
  $('#bRedo').disabled = !st.canRedo();
}

/* ================= panneaux ================= */
const TABS = [['obj', 'Objet'], ['lay', 'Calques'], ['plat', 'Plateaux'], ['list', 'Liste'], ['calc', 'Calculs'], ['patch', 'Patch'], ['ev', 'Projet']];
function renderTabs() {
  $('#tabs').replaceChildren(...TABS.map(([id, n]) => h('button', { class: 'tab' + (T.tab === id ? ' on' : ''), onclick: () => { T.tab = id; renderTabs(); renderPanel(); } }, n)));
}
function renderPanel() {
  const p = $('#panel');
  live.length = 0;
  const scroll = p.scrollTop;
  let node;
  if (T.tab === 'obj') node = panelObj();
  else if (T.tab === 'lay') node = panelLayers();
  else if (T.tab === 'plat') node = panelPlateaux();
  else if (T.tab === 'list') node = panelList();
  else if (T.tab === 'calc') node = panelCalc();
  else if (T.tab === 'patch') node = panelPatch();
  else node = panelEvent();
  p.replaceChildren(node);
  p.scrollTop = scroll;
}

/* ---------- onglet Objet ---------- */
const series = { n: 3, dx: 1, dz: 0 };
function panelObj() {
  const root = h('div', { class: 'pn' });
  if (sel.cable) return panelCable(root, st.getCable(sel.cable));
  if (sel.measure) return panelMeasure(root, st.S.measures.find(m => m.id === sel.measure));
  const os = st.selObjs();
  if (!os.length) return panelNone(root);
  if (os.length > 1) return panelMulti(root, os);
  return panelOne(root, os[0]);
}
function panelNone(root) {
  root.append(
    h('div', { class: 'card' }, h('b', {}, 'Rien de sélectionné'),
      h('p', { class: 'muted' }, 'Cliquez un objet de la bibliothèque (à gauche) puis posez-le sur le plan. Cliquez un objet posé pour modifier sa position, sa rotation, ses dimensions.')),
    section('Raccourcis utiles',
      h('ul', { class: 'keys' },
        ['Z Q S D|Se déplacer en 3D (WASD en QWERTY)', 'E / A|Monter / descendre · Maj = vite', 'Clic droit + souris|Regarder autour de soi', 'V / M / C|Sélection · Mesure · Câble', '1 2 3 4|Vues 3D · Plan · Face · Côté', 'R / T|Pivoter (15° / 90°, Maj = sens inverse)', 'Flèches|Décaler les objets (ou la vue si rien n\'est sélectionné)',
          'Ctrl+D|Dupliquer', 'Ctrl+Z / Y|Annuler / Rétablir', 'Suppr|Supprimer', 'F|Cadrer la sélection / tout', 'Double-clic|Aller à cet endroit', 'Molette|Zoom vers le curseur']
          .map(s => { let [k, v] = s.split('|'); if (lang() !== 'fr') k = k === 'Z Q S D' ? 'W A S D' : k === 'E / A' ? 'E / Q' : k; return h('li', {}, h('kbd', {}, k), h('span', {}, v)); }))),
    section('Astuces',
      h('p', { class: 'muted' }, 'Les objets se posent automatiquement sur les praticables et les tables (hauteur calculée). En vue Plan, tracez un cadre pour sélectionner plusieurs objets.')));
  return root;
}
function panelOne(root, o) {
  const d = def(o.type);
  const ed = fn => edit(fn);
  root.append(...[
    h('div', { class: 'phead' }, h('span', { class: 'ic big' }, d.icon), h('div', {}, h('b', {}, d.name), h('small', {}, tr('repère n°{id}', { id: o.id })))),
    txt(o.type === 'text' ? 'Texte affiché' : 'Étiquette', () => o.label, v => ed(() => { o.label = v; }), { ph: d.short || 'nom affiché sur le plan' }),
    d.monitor ? section('Numéro de retour',
      txt('N° du retour (mix)', () => o.num ?? '', v => ed(() => { o.num = v.trim().slice(0, 4); }, false), { ph: 'ex. 1' }),
      h('p', { class: 'hint' }, 'Une pastille jaune numérotée s\'affiche sur le retour (3D, plan, PNG et fiche PDF).'),
      h('button', { class: 'small', title: 'Numérote tous les retours du plan, du côté jardin au côté cour', onclick: () => ed(() => { st.numberMonitors(); }, false) }, '🔢 Numéroter tous les retours (jardin → cour)')) : null,
    d.opts ? section('Version',
      h('label', { class: 'fld wide' }, h('select', { onchange: e => ed(() => { const v = +e.target.value; if (d.swapWH && v !== (o.opt | 0)) { const w = o.w; o.w = o.h; o.h = w; } o.opt = v; }, false) }, d.opts.map((t, i) => h('option', { value: i, selected: (o.opt | 0) === i }, t))))) : null,
    d.props && 'active' in d.props ? chk('Enceinte amplifiée (active)', () => !!o.active, v => ed(() => { o.active = v; }, false)) : null,
    d.selects ? section('Version', ...d.selects.map(s => h('label', { class: 'fld wide' }, h('span', {}, s.label),
      h('select', { onchange: e => ed(() => { o[s.key] = +e.target.value; }, false) }, s.values.map((t, i) => h('option', { value: i, selected: (o[s.key] | 0) === i }, t)))))) : null,
    section('Position (m)',
      h('div', { class: 'two' },
        num('X', () => o.x, v => ed(() => { o.x = v; }), { unit: '' }),
        num('Z', () => o.z, v => ed(() => { o.z = v; }), { unit: '' })),
      h('div', { class: 'two' },
        num('Hauteur sol', () => o.y, v => ed(() => { o.y = Math.max(0, v); o.manualY = true; }), { unit: '' }),
        h('button', { class: 'small', title: 'Hauteur calculée selon le praticable dessous', onclick: () => ed(() => { o.manualY = false; st.autoLift(o); }) }, '↺ Auto')),
      h('p', { class: 'hint' }, o.manualY ? 'Hauteur fixée à la main.' : (d.fixed ? 'Objet suspendu / fixe.' : 'Hauteur automatique : posé sur ce qui est dessous.'))),
    section('Rotation',
      h('div', { class: 'two' },
        num('Angle', () => o.rot, v => ed(() => { o.rot = ((v % 360) + 360) % 360; }), { unit: '°', step: 5, dec: 0 }),
        h('div', { class: 'btnrow' }, [[-90, '⟲90'], [-15, '−15'], [15, '+15'], [90, '⟳90']].map(([a, t]) => h('button', { class: 'small', onclick: () => { st.selectOnly(o.id); st.rotateSel(a); } }, t)))),
      h('p', { class: 'hint' }, '0° = face avant tournée vers le public. Sens horaire.')),
    section('Dimensions (m)',
      h('div', { class: 'three' },
        num('L', () => o.w, v => ed(() => { o.w = Math.max(0.05, v); }), { unit: '', min: 0.05 }),
        num('P', () => o.d, v => ed(() => { o.d = Math.max(0.02, v); }), { unit: '', min: 0.02 }),
        num('H', () => o.h, v => ed(() => { o.h = Math.max(0.02, v); }), { unit: '', min: 0.02 })),
      d.hchips ? h('div', { class: 'chips' }, d.hchips.map(v => h('button', { class: 'chip' + (Math.abs(o.h - v) < 0.001 ? ' on' : ''), onclick: () => ed(() => { o.h = v; }) }, v < 1.05 ? `${Math.round(v * 100)} cm` : `${st.fn(v, 1)} m`))) : null,
      h('button', { class: 'small', onclick: () => ed(() => { o.w = d.w; o.d = d.d; o.h = d.h; }) }, '↺ Dimensions d\'origine')),
    d.mount ? mountSection(o) : null,
    d.tilt ? tiltSection([o], d) : null,
    dmxInfo(o) ? dmxSection(o) : null,
    plateauSection(o),
    d.speaker ? section('Enceinte',
      h('div', { class: 'two' },
        num('Ouverture', () => o.angle, v => ed(() => { o.angle = v; }, false), { unit: '°', step: 5, dec: 0, min: 10, max: 360 }),
        num('Portée', () => o.range, v => ed(() => { o.range = v; }, false), { unit: 'm', step: 1, dec: 0, min: 1 })),
      !T.coverage ? h('button', { class: 'small', onclick: () => toggleOpt('coverage') }, 'Afficher la couverture') : null) : null,
    section('Aspect',
      groupSelect([o]),
      h('label', { class: 'fld' }, h('span', {}, 'Couleur'),
        (() => { const c = h('input', { type: 'color', value: o.color }); c.addEventListener('change', () => ed(() => { o.color = c.value; }, false)); live.push({ el: c, set: () => { c.value = o.color; } }); return c; })(),
        h('button', { class: 'small', onclick: () => ed(() => { o.color = d.color; }, false) }, '↺')),
      txt('Note', () => o.note, v => ed(() => { o.note = v; }, false), { area: true, ph: 'ex. alim 16 A, patch 1-8…' }),
      chk('Verrouillé (non déplaçable)', () => o.locked, v => ed(() => { o.locked = v; }, false))),
    actionRow(),
    seriesBox(),
  ].filter(Boolean));
  return root;
}
// orientation (inclinaison + visée) : un ou plusieurs projecteurs / objets orientables
function tiltSection(list, d) {
  const o = list[0], single = list.length === 1;
  const setAll = v => edit(() => { list.forEach(x => { if (!x.locked) x.tilt = v; }); }, false);
  const rng = h('input', { type: 'range', min: -90, max: 90, step: 1, value: o.tilt | 0, class: 'rng', title: 'Inclinaison : 0° horizontal, 90° vers le sol' });
  rng.addEventListener('input', () => {
    selfEdit = true;
    try { list.forEach(x => { if (!x.locked) x.tilt = +rng.value; }); st.emit('change'); } finally { selfEdit = false; }
    updateLive();
  });
  rng.addEventListener('change', () => setAll(+rng.value));
  live.push({ el: rng, set: () => { rng.value = o.tilt | 0; } });
  const hasBeam = single && d && d.beam;
  return section('Orientation (inclinaison)',
    h('div', { class: 'two' }, num('Inclinaison', () => o.tilt | 0, v => setAll(clamp(v, -90, 90)), { unit: '°', step: 5, dec: 0, min: -90, max: 90 }),
      h('button', { class: 'small', title: 'Cliquer le point à éclairer : pivotement et inclinaison calculés', onclick: () => startAim() }, '🎯 Viser un point')),
    rng,
    h('div', { class: 'chips' }, ((o.mount | 0) > 0 ? [[-90, '90° vers le haut'], [-60, '60° vers le haut'], [-30, '30° vers le haut'], [0, '0° horizontal'], [30, '30°']] : [[0, '0° horizontal'], [30, '30°'], [45, '45°'], [60, '60°'], [90, '90° vers le sol']]).map(([v, t]) => h('button', { class: 'chip' + ((o.tilt | 0) === v ? ' on' : ''), onclick: () => setAll(v) }, t))),
    hasBeam ? num('Ouverture du faisceau', () => o.beam ?? d.beam.angle, v => edit(() => { o.beam = v; }, false), { unit: '°', step: 1, dec: 0, min: 3, max: 120 }) : null,
    list.some(x => def(x.type).beam) ? (() => {
      const bl = list.filter(x => def(x.type).beam), out = h('em', {}, (o.level ?? 100) + ' %');
      const r = h('input', { type: 'range', min: 0, max: 100, step: 1, value: o.level ?? 100, class: 'rng', title: "Intensité du faisceau de ce projecteur" });
      const put = v => bl.forEach(x => { if (v >= 100) delete x.level; else x.level = v; });
      r.addEventListener('input', () => { out.textContent = r.value + ' %'; selfEdit = true; try { put(+r.value); st.emit('change'); } finally { selfEdit = false; } });
      r.addEventListener('change', () => edit(() => put(+r.value), false));
      live.push({ el: r, set: () => { r.value = o.level ?? 100; out.textContent = r.value + ' %'; } });
      return h('label', { class: 'fld wide beamsl' }, h('span', {}, 'Intensité du faisceau'), h('div', { class: 'slrow' }, r, out));
    })() : null,
    hasBeam && !T.beams ? h('button', { class: 'small', onclick: () => toggleOpt('beams') }, 'Afficher tous les faisceaux') : null,
    h('p', { class: 'hint' }, 'Inclinaison : 0° = à l\'horizontale, 90° = vers le sol (négatif = vers le haut). Le pivotement horizontal se règle avec la rotation.'));
}
function startAim() {
  if (!st.selObjs().some(st.orientable)) { toast('Sélectionnez d\'abord un projecteur'); return; }
  setTool('aim');
}
function actionRow() {
  return h('div', { class: 'btnrow wrap' },
    h('button', { onclick: () => dup() }, '⧉ Dupliquer'),
    h('button', { class: 'danger', onclick: () => st.deleteSelection() }, '🗑 Supprimer'));
}
function dup() {
  const os = st.selObjs();
  if (!os.length) return;
  const ids = st.duplicateObjects(os).map(o => o.id);
  st.commit(); st.selectIds(ids);
}
function seriesBox() {
  return section('Duplication en série',
    h('div', { class: 'three' },
      num('Nb', () => series.n, v => { series.n = Math.round(v); }, { unit: '', step: 1, dec: 0, min: 1, max: 100 }),
      num('Pas X', () => series.dx, v => { series.dx = v; }, { unit: 'm' }),
      num('Pas Z', () => series.dz, v => { series.dz = v; }, { unit: 'm' })),
    h('button', { onclick: () => st.seriesSel(series.n, series.dx, series.dz) }, 'Créer la série'));
}
function panelMulti(root, os) {
  const al = (m, t, tt) => h('button', { class: 'small', title: tt, onclick: () => st.alignSel(m) }, t);
  root.append(
    h('div', { class: 'phead' }, h('span', { class: 'ic big' }, '▦'), h('div', {}, h('b', {}, tr('{n} objets sélectionnés', { n: os.length })), h('small', {}, 'Maj + clic pour ajuster'))),
    section('Aligner',
      h('div', { class: 'btnrow wrap' }, al('left', '⇤ Gauche', 'Aligner les bords gauches'), al('centerx', '↔ Centre', 'Centrer horizontalement'), al('right', '⇥ Droite', 'Aligner les bords droits')),
      h('div', { class: 'btnrow wrap' }, al('top', '⤒ Fond', 'Aligner vers le fond de scène'), al('centerz', '↕ Centre', 'Centrer verticalement'), al('bottom', '⤓ Public', 'Aligner vers le public')),
      h('div', { class: 'btnrow wrap' }, al('distx', '⇔ Répartir H', 'Répartir régulièrement en largeur'), al('distz', '⇕ Répartir V', 'Répartir régulièrement en profondeur'))),
    section('Calque', groupSelect(os)),
    os.some(st.orientable) ? tiltSection(os.filter(st.orientable), null) : null,
    section('Rotation du groupe',
      h('div', { class: 'btnrow' }, [[-90, '⟲90'], [-15, '−15'], [15, '+15'], [90, '⟳90']].map(([a, t]) => h('button', { class: 'small', onclick: () => st.rotateSel(a) }, t)))),
    actionRow(),
    seriesBox(),
    section('', h('button', { class: 'small', onclick: () => { st.selObjs().forEach(o => { o.locked = true; }); st.commit(); } }, '🔒 Verrouiller'),
      h('button', { class: 'small', onclick: () => { st.selObjs().forEach(o => { o.locked = false; }); st.commit(); } }, '🔓 Déverrouiller')));
  return root;
}
function panelCable(root, c) {
  const need = st.cableNeeded(c), L = st.cableLength(c);
  root.append(
    h('div', { class: 'phead' }, h('span', { class: 'ic big', style: `color:${CABLE_KINDS[c.kind].color}` }, '〰'), h('div', {}, h('b', {}, 'Câble'), h('small', {}, CABLE_KINDS[c.kind].name))),
    h('label', { class: 'fld wide' }, h('span', {}, 'Type'),
      h('select', { onchange: e => edit(() => { c.kind = e.target.value; }, false) }, Object.entries(CABLE_KINDS).map(([k, v]) => h('option', { value: k, selected: k === c.kind }, v.name)))),
    txt('Repère', () => c.label, v => edit(() => { c.label = v; }, false), { ph: 'ex. Multipaire scène → FOH' }),
    section('Longueur',
      h('table', { class: 'kv' },
        h('tr', {}, h('td', {}, 'Tracé au sol'), h('td', {}, st.fm(L))),
        h('tr', {}, h('td', {}, tr('+ marge {m} % + 2 × {r} m de rab', { m: st.S.settings.margin, r: st.fn(st.S.settings.rab, 1) })), h('td', {}, st.fm(need))),
        h('tr', { class: 'big' }, h('td', {}, 'Câble à prévoir'), h('td', {}, `${st.stdLength(need)} m`))),
      h('p', { class: 'hint' }, tr('{n} points. Marge et rab réglables dans l\'onglet Projet.', { n: c.pts.length }))),
    h('div', { class: 'btnrow wrap' }, h('button', { class: 'danger', onclick: () => st.deleteSelection() }, '🗑 Supprimer le câble')));
  return root;
}
function panelMeasure(root, m) {
  const dx = Math.abs(m.b[0] - m.a[0]), dz = Math.abs(m.b[1] - m.a[1]), L = Math.hypot(dx, dz);
  root.append(
    h('div', { class: 'phead' }, h('span', { class: 'ic big' }, '📏'), h('div', {}, h('b', {}, 'Mesure'), h('small', {}, 'distance au sol'))),
    h('table', { class: 'kv' },
      h('tr', { class: 'big' }, h('td', {}, 'Distance'), h('td', {}, st.fm(L))),
      h('tr', {}, h('td', {}, 'Écart en largeur (X)'), h('td', {}, st.fm(dx))),
      h('tr', {}, h('td', {}, 'Écart en profondeur (Z)'), h('td', {}, st.fm(dz))),
      h('tr', {}, h('td', {}, 'Délai acoustique'), h('td', {}, st.fn((L / st.soundSpeed()) * 1000, 1) + ' ms'))),
    h('div', { class: 'btnrow wrap' }, h('button', { class: 'danger', onclick: () => st.deleteSelection() }, '🗑 Supprimer la mesure')));
  return root;
}

/* ---------- onglet Liste ---------- */
/* ---------- onglet Calques : groupes d'objets, filtre rapide, faisceaux par type de projecteur ---------- */
let editingG = null;
function groupSelect(objs) {
  const cur = new Set(objs.map(st.groupOf));
  const one = cur.size === 1 ? [...cur][0] : '';
  return h('label', { class: 'fld wide' }, h('span', {}, 'Calque (groupe)'),
    h('select', { onchange: e => { const v = e.target.value; if (v) keepTab(() => { edit(() => st.setObjectsGroup(objs, v), false); st.refreshLayers(); renderPanel(); }); } },
      one ? null : h('option', { value: '', selected: true }, '— plusieurs calques —'),
      st.groupList().map(g => h('option', { value: g.id, selected: g.id === one }, `${g.icon} ${st.groupLabel(g)}`))));
}
async function deleteLayer(g) {
  const n = st.groupCount(g.id);
  if (n && !(await ask('Supprimer ce calque ?', tr('« {name} » contient {n} objet(s) : ils retrouvent leur calque d\'origine (rien n\'est supprimé du plan).', { name: g.name, n }), 'Supprimer'))) return;
  keepTab(() => { edit(() => st.deleteGroup(g.id), false); st.refreshLayers(); renderPanel(); });
}
function layerRow(g, pseudo) {
  const hidden = st.isGroupHidden(g.id), locked = !pseudo && st.isGroupLocked(g.id);
  const n = pseudo ? (g.id === 'cables' ? st.S.cables.length : st.S.measures.length) : st.groupCount(g.id);
  const b = (txt, title, fn, cls = '') => h('button', { class: 'lb ' + cls, title, onclick: e => { e.stopPropagation(); keepTab(fn); } }, txt);
  let nameEl;
  if (editingG === g.id) {
    nameEl = h('input', { type: 'text', value: g.name });
    const done = ok => { if (editingG !== g.id) return; editingG = null; if (ok) edit(() => st.renameGroup(g.id, nameEl.value), false); renderPanel(); };
    nameEl.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); });
    nameEl.addEventListener('blur', () => done(true));
    setTimeout(() => { nameEl.focus(); nameEl.select(); }, 0);
  } else {
    nameEl = h('button', { class: 'nm', title: pseudo ? '' : 'Sélectionner tous les objets de ce calque',
      onclick: () => keepTab(() => { if (!pseudo) st.selectIds(st.S.objects.filter(o => st.groupOf(o) === g.id && st.isPickable(o)).map(o => o.id)); }) }, st.groupLabel(g));
  }
  return h('div', { class: 'lay' + (hidden ? ' off' : '') + (locked ? ' lock' : '') },
    b(hidden ? '⊘' : '👁', hidden ? 'Afficher ce calque' : 'Masquer ce calque', () => st.toggleGroupHidden(g.id), 'eye'),
    h('span', { class: 'ic' }, g.icon), nameEl, h('em', {}, n),
    pseudo ? null : [
      b('◎', "Isoler : n'afficher que ce calque (cliquer encore pour tout réafficher)", () => st.isolateGroup(g.id)),
      b(locked ? '🔒' : '🔓', locked ? 'Déverrouiller (les objets redeviennent sélectionnables)' : 'Verrouiller (visible mais non sélectionnable)', () => st.setGroupLocked(g.id, !locked), locked ? 'on' : ''),
      sel.ids.size ? b('⇥', 'Mettre la sélection dans ce calque', () => { edit(() => st.setObjectsGroup(st.selObjs(), g.id), false); st.refreshLayers(); renderPanel(); }) : null,
      g.custom ? [b('✎', 'Renommer', () => { editingG = g.id; renderPanel(); }), b('🗑', "Supprimer ce calque (ses objets retrouvent leur calque d'origine)", () => deleteLayer(g))] : null]);
}
function newLayerBox() {
  const i = h('input', { type: 'text', placeholder: 'Nom du nouveau calque' });
  const create = withSel => keepTab(() => {
    edit(() => { const id = st.addGroup(i.value); if (withSel) st.setObjectsGroup(st.selObjs(), id); }, false);
    i.value = ''; st.refreshLayers(); renderPanel();
  });
  i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') create(false); });
  return h('div', { class: 'newlay' },
    h('label', { class: 'fld wide' }, h('span', {}, 'Nouveau calque'), i),
    h('div', { class: 'btnrow wrap' },
      h('button', { class: 'small', onclick: () => create(false) }, '＋ Créer'),
      sel.ids.size ? h('button', { class: 'small', onclick: () => create(true) }, '＋ Créer avec la sélection') : null));
}
// réglage général des faisceaux : intensité (s'applique tout de suite) et taille (angle réduit)
function beamSliders() {
  const mk = (label, key, min, title) => {
    const out = h('em', {}, T[key] + ' %');
    const r = h('input', { type: 'range', min, max: 100, step: 1, value: T[key], class: 'rng', title });
    r.addEventListener('input', () => { T[key] = +r.value; out.textContent = T[key] + ' %'; if (key === 'beamLevel') view.applyBeamLevel(); else view.refreshBeams(); });
    r.addEventListener('change', () => st.savePrefs());
    r.addEventListener('keydown', e => e.stopPropagation());
    return h('label', { class: 'fld wide beamsl' }, h('span', {}, label), h('div', { class: 'slrow' }, r, out));
  };
  return h('div', { class: 'beamsliders' },
    mk('Intensité des faisceaux (tous)', 'beamLevel', 0, 'Baisse la lumière de tous les faisceaux (moins éblouissant)'),
    mk('Taille des faisceaux (tous)', 'beamSize', 20, 'Réduit l\'ouverture de tous les faisceaux'));
}
function beamSection() {
  const ids = BEAM_DEFS.map(d => d.id);
  const sec = section('Faisceaux des projecteurs',
    beamSliders(),
    h('p', { class: 'hint' }, "Cochez les types de projecteurs dont le faisceau s'affiche. Un projecteur sélectionné montre toujours son faisceau."),
    h('div', { class: 'btnrow wrap' },
      h('button', { class: 'chip' + (T.beams ? ' on' : ''), title: 'Afficher / masquer les faisceaux (B)', onclick: () => toggleOpt('beams') }, T.beams ? 'Faisceaux affichés' : 'Faisceaux masqués'),
      h('button', { class: 'chip', onclick: () => st.setAllBeamTypes(ids, true) }, 'Tous'),
      h('button', { class: 'chip', onclick: () => st.setAllBeamTypes(ids, false) }, 'Aucun')),
    BEAM_DEFS.map(d => {
      const n = st.S.objects.filter(o => o.type === d.id).length;
      const c = h('input', { type: 'checkbox', checked: st.beamTypeOn(d.id) });
      c.addEventListener('change', () => st.setBeamType(d.id, c.checked));
      return h('label', { class: 'chk beamt' + (n ? '' : ' none') }, c, h('span', { class: 'dot', style: `background:${d.color}` }), h('span', { class: 'bn' }, d.name), h('em', {}, n));
    }));
  sec.id = 'beamSec';
  return sec;
}
function panelLayers() {
  const root = h('div', { class: 'pn' });
  root.append(
    section('Calques (groupes)',
      h('p', { class: 'hint' }, "Chaque objet appartient à un calque. L'œil affiche ou masque tout le groupe en un clic ; ◎ isole un calque ; 🔒 le rend non sélectionnable."),
      h('div', { class: 'btnrow wrap' },
        h('button', { class: 'chip' + (st.backlineHidden() ? ' on' : ''), title: 'Retire (ou remet) les calques Musiciens et Backline', onclick: () => keepTab(() => st.toggleBackline()) }, 'Sans musiciens ni backline'),
        h('button', { class: 'chip', disabled: !T.hiddenG.length, onclick: () => keepTab(() => st.showAllGroups()) }, '👁 Tout afficher')),
      h('div', { class: 'lays' }, st.groupList().map(g => layerRow(g, false)), PSEUDO_GROUPS.map(g => layerRow(g, true))),
      newLayerBox(),
      chk('Liste de matériel et fiche : seulement les calques visibles', () => T.listVisibleOnly, v => { T.listVisibleOnly = v; st.savePrefs(); st.emit('change'); })),
    beamSection());
  return root;
}

function panelList() {
  const b = st.bom(), root = h('div', { class: 'pn' });
  const byCat = new Map();
  b.list.forEach(r => { (byCat.get(r.cat) || byCat.set(r.cat, []).get(r.cat)).push(r); });
  const total = b.list.reduce((a, r) => a + r.qty, 0);
  root.append(h('div', { class: 'stats' },
    h('div', {}, h('b', {}, total), h('small', {}, 'objets')),
    h('div', {}, h('b', {}, b.nPrat), h('small', {}, 'praticables')),
    h('div', {}, h('b', {}, st.fn(b.surface, 1)), h('small', {}, 'm² de scène')),
    h('div', {}, h('b', {}, Math.round(b.cableTotal)), h('small', {}, 'm de câble'))));
  if (b.filtered) root.append(h('div', { class: 'card' },
    h('p', { class: 'hint' }, tr('Liste limitée aux calques visibles : {n} objet(s) masqué(s) ({names}).', { n: b.filtered, names: st.hiddenGroupNames().join(', ') })),
    h('button', { class: 'small', onclick: () => { T.listVisibleOnly = false; st.savePrefs(); st.emit('change'); } }, 'Inclure les calques masqués')));
  if (!total) root.append(h('p', { class: 'muted pad' }, 'La liste se remplit automatiquement quand vous placez des objets.'));
  for (const cat of CATS) {
    const rows = byCat.get(cat.id);
    if (!rows) continue;
    root.append(section(`${cat.icon} ${tr(cat.name)}`, h('table', { class: 'tbl' }, rows.map(r => h('tr', {}, h('td', { class: 'q' }, r.qty + '×'), h('td', {}, r.name, h('small', {}, r.dims)))))));
  }
  if (b.cables.length) root.append(section('〰 Câbles à prévoir', h('table', { class: 'tbl' }, b.cables.map(r =>
    h('tr', {}, h('td', { class: 'q' }, r.qty + '×'), h('td', {}, h('span', { class: 'dot', style: `background:${CABLE_KINDS[r.kind].color}` }), `${tr(CABLE_KINDS[r.kind].name)} `, h('b', {}, r.std + ' m')))))));
  if (st.S.measures.length) root.append(section('📏 Mesures', h('table', { class: 'tbl' }, st.S.measures.map(m =>
    h('tr', { class: 'click', onclick: () => pickMeasure(m.id) }, h('td', { class: 'q' }, 'M' + m.id), h('td', {}, st.fm(Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]))))))));
  root.append(h('div', { class: 'btnrow wrap' }, h('button', { onclick: () => { st.downloadBlob(new Blob([bomCsv()], { type: 'text/csv;charset=utf-8' }), st.safeName() + '_liste.csv'); } }, '⬇ Exporter en CSV')));
  return root;
}

/* ---------- onglet Calculs ---------- */
const calc = { listener: null, ref: null, haas: 10, dist: 10, ms: 30, d1: 10, d2: 20 };
function panelCalc() {
  const root = h('div', { class: 'pn' });
  const c = st.soundSpeed();
  root.append(
    section('Conditions',
      num('Température', () => st.S.meta.temp, v => { edit(() => { st.S.meta.temp = v; }, false); renderPanel(); }, { unit: '°C', step: 1, dec: 0, min: -30, max: 60 }),
      h('p', { class: 'hint' }, tr('Vitesse du son : {v} m/s', { v: st.fn(c, 1) }))));
  // mini-calculateurs
  const r1 = h('output'), r2 = h('output'), r3 = h('output');
  const upd = () => {
    r1.textContent = `${st.fn((calc.dist / st.soundSpeed()) * 1000, 2)} ms`;
    r2.textContent = `${st.fn((calc.ms / 1000) * st.soundSpeed(), 2)} m`;
    r3.textContent = calc.d1 > 0 && calc.d2 > 0 ? `${st.fn(20 * Math.log10(calc.d1 / calc.d2), 1)} dB` : '—';
  };
  const mini = (label, get, set, unit, out) => {
    const f = num(label, get, v => { set(v); upd(); }, { unit, step: 0.5, dec: 1, min: 0 });
    f.querySelector('input').addEventListener('input', e => { const v = parseFloat(e.target.value); if (isFinite(v)) { set(v); upd(); } });
    return h('div', { class: 'miniline' }, f, h('span', { class: 'eq' }, '='), out);
  };
  root.append(section('Mini-calculateurs',
    mini('Distance', () => calc.dist, v => { calc.dist = v; }, 'm', r1),
    mini('Délai', () => calc.ms, v => { calc.ms = v; }, 'ms', r2),
    h('div', { class: 'miniline' },
      num('d1', () => calc.d1, v => { calc.d1 = v; upd(); }, { unit: 'm', step: 1, dec: 1, min: 0.1 }),
      num('d2', () => calc.d2, v => { calc.d2 = v; upd(); }, { unit: 'm', step: 1, dec: 1, min: 0.1 }),
      h('span', { class: 'eq' }, '='), r3),
    h('p', { class: 'hint' }, 'Dernière ligne : variation de niveau en champ libre entre deux distances (−6 dB par doublement).')));
  upd();
  // alignement depuis un point d'écoute
  const L = st.listeners(), sp = st.speakers();
  if (!calc.listener || !st.getObj(calc.listener)) calc.listener = L[0]?.id ?? null;
  const t1 = section('Arrivée du son au point d\'écoute');
  if (!L.length) t1.append(h('p', { class: 'muted' }, 'Placez un « Point d\'écoute » 👂 (bibliothèque › Annotations) à la régie ou dans le public, puis ajoutez des enceintes.'));
  else if (!sp.length) t1.append(h('p', { class: 'muted' }, 'Ajoutez des enceintes pour calculer les temps d\'arrivée.'));
  else {
    t1.append(h('label', { class: 'fld wide' }, h('span', {}, 'Point d\'écoute'),
      h('select', { onchange: e => { calc.listener = +e.target.value; renderPanel(); } }, L.map(l => h('option', { value: l.id, selected: l.id === calc.listener }, l.label || tr('Écoute n°{id}', { id: l.id }))))));
    const rows = st.arrivalTable(calc.listener);
    t1.append(h('table', { class: 'tbl calc' },
      h('tr', { class: 'th' }, h('td', {}, 'Enceinte'), h('td', {}, 'Dist.'), h('td', {}, 'Arrivée'), h('td', {}, 'Retard')),
      rows.map(r => h('tr', { class: 'click', onclick: () => pick(r.obj.id) }, h('td', {}, r.obj.label || def(r.obj.type).name), h('td', {}, st.fn(r.dist, 1) + ' m'), h('td', {}, st.fn(r.ms, 1) + ' ms'), h('td', { class: 'hl' }, st.fn(r.align, 1) + ' ms')))));
    t1.append(h('p', { class: 'hint' }, '« Retard » : délai à appliquer pour que toutes les enceintes arrivent en même temps que la plus lointaine.'));
  }
  root.append(t1);
  // tours de delay
  const mains = sp.filter(s => !def(s.type).speaker.delay);
  const delays = sp.filter(s => def(s.type).speaker.delay);
  const t2 = section('Tours de delay');
  if (!delays.length) t2.append(h('p', { class: 'muted' }, 'Ajoutez une « Tour de delay » 📡 dans le public pour calculer son retard.'));
  else if (!mains.length) t2.append(h('p', { class: 'muted' }, 'Il faut au moins une enceinte de façade comme référence.'));
  else {
    if (!calc.ref || !st.getObj(calc.ref) || def(st.getObj(calc.ref).type).speaker.delay) calc.ref = mains[0].id;
    t2.append(
      h('label', { class: 'fld wide' }, h('span', {}, 'Référence (façade)'),
        h('select', { onchange: e => { calc.ref = +e.target.value; renderPanel(); } }, mains.map(m => h('option', { value: m.id, selected: m.id === calc.ref }, m.label || tr(def(m.type).name) + ' n°' + m.id)))),
      num('Haas (avance façade)', () => calc.haas, v => { calc.haas = v; renderPanel(); }, { unit: 'ms', step: 1, dec: 0, min: 0, max: 40 }),
      h('table', { class: 'tbl calc' },
        h('tr', { class: 'th' }, h('td', {}, 'Delay'), h('td', {}, 'Dist.'), h('td', {}, 'Temps'), h('td', {}, 'À régler')),
        st.delayTable(calc.ref, calc.haas).map(r => h('tr', { class: 'click', onclick: () => pick(r.obj.id) }, h('td', {}, r.obj.label || tr('Delay n°{id}', { id: r.obj.id })), h('td', {}, st.fn(r.dist, 1) + ' m'), h('td', {}, st.fn(r.ms, 1) + ' ms'), h('td', { class: 'hl' }, st.fn(r.value, 1) + ' ms')))),
      h('p', { class: 'hint' }, 'Retard = distance façade → delay ÷ vitesse du son + effet Haas (la façade reste perçue en premier).'));
  }
  root.append(t2);
  return root;
}

/* ---------- onglet Patch ---------- */
function panelPatch() {
  const root = h('div', { class: 'pn' });
  root.append(patchSwitch(T.patchMode, k => { T.patchMode = k; renderPanel(); }));
  root.append(T.patchMode === 'lum' ? lightPatchView(false, renderPanel) : soundPatchView(false, renderPanel));
  return root;
}
const patchSwitch = (cur, set) => h('div', { class: 'seg' },
  h('button', { class: 'segb' + (cur === 'son' ? ' on' : ''), onclick: () => set('son') }, 'Patch son'),
  h('button', { class: 'segb' + (cur === 'lum' ? ' on' : ''), onclick: () => set('lum') }, 'Patch lumière'));
function patchCsv() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + [[tr('Voie'), tr('Source'), tr('Micro / DI'), tr('Pied'), '48V', tr('Notes')].join(';'), ...st.S.patch.map(r => [r.ch, q(r.source), q(r.mic), q(r.stand), r.phantom ? tr('oui') : '', q(r.notes)].join(';'))].join('\r\n');
}
function lightCsv() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = [tr('N°'), tr('Repère'), tr('Type'), tr('Fixation'), tr('Univers'), tr('Adresse'), tr('Fin'), tr('Mode'), tr('Canaux'), tr('Notes')];
  return '\uFEFF' + [head.join(';'), ...st.dmxRows().map((o, i) => { const sp = st.dmxSpan(o), m = st.dmxMode(o); return [i + 1, q(fixName(o)), q(tr(def(o.type).name)), q(mountText(o)), sp ? sp.u : '', sp ? sp.a : '', sp ? sp.b : '', q(tr(m.key, m.params)), m.n, q(o.note)].join(';'); })].join('\r\n');
}
// patch son : une liste simple, une ligne par voie (N°, source, micro / DI, pied, 48 V) ; notes dans l'éditeur plein écran
function soundPatchView(wide, refresh) {
  const P = st.S.patch;
  const root = h('div', { class: 'patchv' + (wide ? ' wide' : '') });
  const renum = () => P.forEach((r, i) => { r.ch = i + 1; });
  const redo = () => { renum(); st.commit(); refresh(); };
  const focusLast = () => setTimeout(() => { const rs = document.querySelectorAll('.patchv .prow .src'); if (rs.length) rs[rs.length - 1].focus(); }, 40);
  root.append(h('div', { class: 'btnrow wrap' },
    h('button', { class: 'small', onclick: () => { P.push({ ch: P.length + 1, source: '', mic: '', stand: '', phantom: false, notes: '' }); redo(); focusLast(); } }, '+ Voie'),
    h('button', { class: 'small', onclick: () => { rockPatch().forEach(r => { r.ch = P.length + 1; P.push(r); }); redo(); } }, '+ Modèle groupe'),
    h('button', { class: 'small', onclick: () => st.downloadBlob(new Blob([patchCsv()], { type: 'text/csv;charset=utf-8' }), st.safeName() + '_patch.csv') }, '⬇ CSV'),
    wide ? null : h('button', { class: 'small', onclick: () => openPatchEditor('son') }, '⤢ Éditeur plein écran'),
    P.length ? h('button', { class: 'small danger', onclick: async () => { if (await ask('Vider le patch ?', 'Toutes les voies seront supprimées.', 'Vider')) { P.length = 0; st.commit(); } refresh(); } }, 'Vider') : null));
  if (!P.length) { root.append(h('p', { class: 'muted pad' }, "Le patch (liste d'entrées) apparaît aussi dans la fiche imprimable.")); return root; }
  root.append(h('p', { class: 'hint' }, tr('{n} voies · {k} en 48 V', { n: P.length, k: P.filter(r => r.phantom).length })));
  const list = h('div', { class: 'plist' });
  list.append(h('div', { class: 'prow hd' }, (wide ? ['N°', 'Source', 'Micro / DI', 'Pied', 'Notes', '48 V', ''] : ['N°', 'Source', 'Micro / DI', 'Pied', '48 V', '']).map(t => h('span', {}, t))));
  P.forEach((r, i) => {
    const rowEl = h('div', { class: 'prow' });
    const inp = (key, cls, ph) => {
      const x = h('input', { type: 'text', class: cls, value: r[key] ?? '', placeholder: ph, title: r[key] || ph });
      x.addEventListener('change', () => edit(() => { r[key] = x.value; }, false));
      x.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { x.blur(); const rows = [...root.querySelectorAll('.prow:not(.hd)')], nx = rows[rows.indexOf(rowEl) + 1]; if (nx) nx.querySelector('.' + cls).focus(); }
      });
      return x;
    };
    const ch = h('span', { class: 'ch', title: "Glisser pour changer l'ordre" }, r.ch);
    ch.draggable = true;
    ch.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; });
    rowEl.addEventListener('dragover', e => { e.preventDefault(); rowEl.classList.add('over'); });
    rowEl.addEventListener('dragleave', () => rowEl.classList.remove('over'));
    rowEl.addEventListener('drop', e => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); if (Number.isInteger(from) && from !== i) { const [m] = P.splice(from, 1); P.splice(i, 0, m); redo(); } });
    const cb = h('input', { type: 'checkbox', checked: !!r.phantom, title: 'Alimentation fantôme 48 V' });
    cb.addEventListener('change', () => edit(() => { r.phantom = cb.checked; }, false));
    const acts = h('span', { class: 'acts' },
      wide ? h('button', { class: 'x', title: 'Monter', disabled: i === 0, onclick: () => { [P[i - 1], P[i]] = [P[i], P[i - 1]]; redo(); } }, '▲') : null,
      wide ? h('button', { class: 'x', title: 'Descendre', disabled: i === P.length - 1, onclick: () => { [P[i + 1], P[i]] = [P[i], P[i + 1]]; redo(); } }, '▼') : null,
      wide ? h('button', { class: 'x', title: 'Dupliquer la voie', onclick: () => { P.splice(i + 1, 0, { ...r }); redo(); } }, '⧉') : null,
      h('button', { class: 'x del', title: 'Supprimer la voie', onclick: () => { P.splice(i, 1); redo(); } }, '×'));
    rowEl.append(...[ch, inp('source', 'src', 'Source'), inp('mic', 'mic', 'Micro / DI'), inp('stand', 'stand', 'Pied'), wide ? inp('notes', 'notes', 'Notes') : null, h('label', { class: 'p48' }, cb), acts].filter(Boolean));
    list.append(rowEl);
  });
  root.append(list);
  return root;
}
// patch lumière : adresses DMX des projecteurs du plan (univers, adresse de départ, mode), adressage automatique, conflits
let dmxOpt = { order: 'x', u: 1, a: 1 };
function lightPatchView(wide, refresh) {
  const root = h('div', { class: 'patchv lpatch' + (wide ? ' wide' : '') });
  const rows = st.dmxRows(), bad = st.dmxConflicts(), usage = st.dmxUsage();
  const redo = () => { st.commit(); refresh(); };
  if (!rows.length) { root.append(h('p', { class: 'muted pad' }, 'Aucun projecteur sur le plan. Placez des projecteurs (PAR, PC, découpes, lyres, barres LED…) : ils apparaissent ici pour être adressés.')); return root; }
  const nu = (key, label, min, max) => {
    const i = h('input', { type: 'number', min, max, value: dmxOpt[key] });
    i.addEventListener('change', () => { dmxOpt[key] = clamp(Math.round(+i.value) || min, min, max); i.value = dmxOpt[key]; });
    i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') i.blur(); });
    return h('label', { class: 'fld' }, h('span', {}, label), i);
  };
  const orderSel = h('select', { onchange: e => { dmxOpt.order = e.target.value; } }, [['x', 'Jardin → cour'], ['z', 'Fond → face'], ['type', 'Par type de projecteur']].map(([v, t]) => h('option', { value: v, selected: dmxOpt.order === v }, t)));
  root.append(beamSliders());
  root.append(
    h('div', { class: 'sec tight' }, h('h4', {}, 'Adressage automatique'),
      h('label', { class: 'fld wide' }, h('span', {}, 'Ordre'), orderSel),
      h('div', { class: 'two' }, nu('u', 'Univers de départ', 1, 64), nu('a', 'Adresse de départ', 1, 512)),
      h('div', { class: 'btnrow wrap' },
        h('button', { class: 'small primary', onclick: async () => {
          if (rows.some(st.dmxAddressed) && !(await ask('Adresser tous les projecteurs ?', 'Les adresses déjà saisies seront remplacées.', 'Adresser'))) { refresh(); return; }
          st.autoAddress({ order: dmxOpt.order, startU: dmxOpt.u, startA: dmxOpt.a }); redo();
        } }, '⚡ Adresser tout'),
        h('button', { class: 'small', onclick: () => { st.autoAddress({ order: dmxOpt.order, startU: dmxOpt.u, startA: dmxOpt.a, onlyNew: true }); redo(); } }, 'Adresser les non adressés'),
        h('button', { class: 'small', onclick: () => { st.clearAddresses(); redo(); } }, 'Effacer les adresses'),
        h('button', { class: 'small', onclick: () => st.downloadBlob(new Blob([lightCsv()], { type: 'text/csv;charset=utf-8' }), st.safeName() + '_patch_lumiere.csv') }, '⬇ CSV'),
        wide ? null : h('button', { class: 'small', onclick: () => openPatchEditor('lum') }, '⤢ Éditeur plein écran'))));
  if (usage.length) root.append(h('div', { class: 'usage' }, usage.map(([u, n]) => h('div', { class: 'ubar' }, h('span', {}, tr('Univers {u}', { u })), h('i', {}, h('b', { style: `width:${Math.min(100, (n / 512) * 100)}%` })), h('em', {}, `${n} / 512`)))));
  if (bad.size) root.append(h('p', { class: 'warn' }, tr("⚠ {n} projecteur(s) en conflit d'adresse (plages qui se chevauchent ou dépassent 512).", { n: bad.size })));
  const todo = rows.filter(o => !st.dmxAddressed(o)).length;
  if (todo) root.append(h('p', { class: 'hint' }, tr('{n} projecteur(s) sans adresse.', { n: todo })));
  const list = h('div', { class: 'plist' });
  if (wide) list.append(h('div', { class: 'lrow hd' }, ['N°', 'Repère', 'Type', 'Fixation', 'Univers', 'Adresse', 'Mode', 'Canaux', 'Plage', 'Int. %', 'Notes'].map(t => h('span', {}, t))));
  rows.forEach((o, i) => {
    const d = def(o.type), m = st.dmxMode(o), sp = st.dmxSpan(o);
    const nin = (key, cls, min, max, ph) => {
      const x = h('input', { type: 'number', class: cls, min, max, placeholder: ph, value: o[key] || '' });
      x.addEventListener('change', () => { const v = Math.round(+x.value); edit(() => { if (v >= min) o[key] = Math.min(max, v); else delete o[key]; }, false); refresh(); });
      x.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') x.blur(); });
      return x;
    };
    const ms = h('select', { class: 'm', onchange: e => { edit(() => { o.dmxM = +e.target.value; }, false); refresh(); } }, m.modes.map((md, k) => h('option', { value: k, selected: k === m.idx }, tr(md[0], md[2]))));
    const nt = wide ? (() => { const x = h('input', { type: 'text', class: 'notes', value: o.note || '', placeholder: 'Notes' }); x.addEventListener('change', () => edit(() => { o.note = x.value; }, false)); x.addEventListener('keydown', e => e.stopPropagation()); return x; })() : null;
    const lv = h('input', { type: 'number', class: 'lvl', min: 0, max: 100, placeholder: '100', title: "Intensité du faisceau (%)", value: o.level ?? '' });
    lv.addEventListener('change', () => { const v = Math.round(+lv.value); edit(() => { if (lv.value === '' || v >= 100) delete o.level; else o.level = Math.max(0, v); }, false); refresh(); });
    lv.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') lv.blur(); });
    list.append(h('div', { class: 'lrow' + (bad.has(o.id) ? ' bad' : '') + (sp ? '' : ' todo') },
      h('span', { class: 'ln' }, i + 1),
      wide ? h('span', { class: 'lname' }, fixName(o)) : h('button', { class: 'lname', title: 'Voir sur le plan', onclick: () => pick(o.id) }, fixName(o)),
      h('span', { class: 'lty' }, d.name), h('span', { class: 'lpos' }, mountText(o)),
      nin('dmxU', 'u', 1, 64, '1'), nin('dmxA', 'a', 1, 512, '—'), ms,
      h('span', { class: 'lch' }, m.n), h('span', { class: 'lend' }, addrText(o)), lv, nt));
  });
  root.append(list);
  return root;
}
function openPatchEditor(kind) {
  const old = $('#modal .mbox'), sc = old ? old.scrollTop : 0;
  const refresh = () => openPatchEditor(kind);
  modal(h('div', { class: 'peditor' },
    h('h3', {}, kind === 'son' ? "Patch son : liste d'entrées" : 'Patch lumière : adresses DMX'), patchSwitch(kind, k => { T.patchMode = k; openPatchEditor(k); }),
    kind === 'son' ? soundPatchView(true, refresh) : lightPatchView(true, refresh),
    h('div', { class: 'row end' }, h('button', { class: 'primary', onclick: closeModal }, 'Fermer'))), 'xl');
  const nb = $('#modal .mbox');
  if (nb) nb.scrollTop = sc;
}

/* ---------- fixation d'un projecteur, patch DMX et plateaux dans le panneau Objet ---------- */
function mountSection(o) {
  const m = o.mount | 0;
  return section('Fixation',
    h('div', { class: 'chips' }, [[0, 'Accroché (truss)'], [2, 'Sur pied'], [1, 'Au sol']].map(([v, t]) =>
      h('button', { class: 'chip' + (m === v ? ' on' : ''), onclick: () => { edit(() => st.setMount(o, v), false); renderPanel(); } }, t))),
    m === 2 ? h('div', {}, h('p', { class: 'hint' }, 'Hauteur totale (pied + projecteur) :'),
      h('div', { class: 'chips' }, [1.2, 1.6, 2, 2.5, 3, 3.5].map(v => h('button', { class: 'chip' + (Math.abs(o.h - v) < 0.06 ? ' on' : ''), onclick: () => { edit(() => { o.h = v; st.autoLift(o); }, false); renderPanel(); } }, `${st.fn(v, 1)} m`)))) : null,
    h('p', { class: 'hint' }, m === 0 ? "Accroché : se place automatiquement sous un truss proche." : m === 2 ? 'Posé sur un pied télescopique : la hauteur se règle ici ou dans les dimensions.' : 'Posé au sol ou sur un praticable : inclinez-le vers le haut ou vers l\'avant.'));
}
function dmxSection(o) {
  const m = st.dmxMode(o), sp = st.dmxSpan(o), bad = st.dmxConflicts().has(o.id);
  return section('Patch DMX',
    h('div', { class: 'two' },
      num('Univers', () => o.dmxU || 1, v => { edit(() => { o.dmxU = clamp(Math.round(v), 1, 64); }, false); renderPanel(); }, { unit: '', step: 1, dec: 0, min: 1, max: 64 }),
      num('Adresse', () => o.dmxA || 0, v => { edit(() => { if (v >= 1) o.dmxA = clamp(Math.round(v), 1, 512); else delete o.dmxA; }, false); renderPanel(); }, { unit: '', step: 1, dec: 0, min: 0, max: 512 })),
    h('label', { class: 'fld wide' }, h('span', {}, 'Mode'),
      h('select', { onchange: e => { edit(() => { o.dmxM = +e.target.value; }, false); renderPanel(); } }, m.modes.map((md, k) => h('option', { value: k, selected: k === m.idx }, tr(md[0], md[2]))))),
    h('p', { class: bad ? 'warn' : 'hint' }, sp ? (bad ? tr('⚠ Conflit : ') : '') + tr("Occupe les canaux {a} à {b} de l'univers {u}.", { a: sp.a, b: sp.b, u: sp.u }) : "Adresse 0 = non adressé. Le patch complet est dans l'onglet Patch."));
}
function plateauSection(o) {
  const P = st.S.plateaux;
  if (!P.length) return null;
  const cs = st.changeStatus(o);
  const say = { stay: 'Reste en place pendant le changement.', out: 'À SORTIR pendant le changement.', in: 'À RENTRER pendant le changement.', none: "Absent des deux plateaux du changement." };
  return section('Plateaux',
    h('div', { class: 'chips' }, P.map(p => h('button', { class: 'chip' + (st.inPlateau(o, p.id) ? ' on' : ''), title: 'Présence de cet objet sur ce plateau',
      onclick: () => { edit(() => st.setObjectPlateau(o, p.id, !st.inPlateau(o, p.id)), false); st.refreshLayers(); renderPanel(); } }, p.name))),
    h('p', { class: 'hint' }, cs ? say[cs] : 'Plateaux où cet objet est présent (tous = il reste en place pendant un changement).'));
}

/* ---------- onglet Plateaux : changement de plateau ---------- */
function toggleChangeover() {
  keepTab(() => {
    const was = T.co.on;
    if (!was) { T.tab = 'plat'; renderTabs(); }
    st.toggleChangeover();
    if (!was && T.co.on) toast(tr('Changement de plateau : « {a} » → « {b} »', { a: st.plateauName(T.co.from), b: st.plateauName(T.co.to) }));
  });
}
// bandeau en bas de la vue quand le mode est actif
function renderCoBar() {
  const el = $('#cobar');
  if (!el) return;
  if (!T.co.on) { el.style.display = 'none'; return; }
  const L = st.changeLists();
  el.style.display = 'flex';
  el.replaceChildren(h('b', {}, '⇄ Changement de plateau'), h('span', {}, `${st.plateauName(T.co.from)} → ${st.plateauName(T.co.to)}`),
    h('span', { class: 'out' }, tr('{n} à sortir', { n: L.out.length })), h('span', { class: 'in' }, tr('{n} à rentrer', { n: L.in.length })),
    h('button', { class: 'small', onclick: () => keepTab(() => st.setChangeover(false)) }, 'Quitter'));
}
function changeCsv() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`, L = st.changeLists();
  const lines = [[tr('Action'), tr('Quantité'), tr('Désignation'), tr('Repère'), tr('Notes')].join(';')];
  [['out', 'À sortir'], ['in', 'À rentrer'], ['stay', 'Reste en place']].forEach(([k, t]) => st.changeRows(L[k]).forEach(r => lines.push([q(tr(t)), r.qty, q(tr(r.name)), q(r.label), q(r.notes.join(' · '))].join(';'))));
  return '\uFEFF' + lines.join('\r\n');
}
function panelPlateaux() {
  const root = h('div', { class: 'pn' });
  const P = st.S.plateaux, on = T.co.on;
  const choose = (label, key) => h('label', { class: 'fld wide' }, h('span', {}, label),
    h('select', { onchange: e => keepTab(() => st.setChangeoverPlateaux(key === 'from' ? e.target.value : null, key === 'to' ? e.target.value : null)) },
      P.map(p => h('option', { value: p.id, selected: T.co[key] === p.id }, p.name))));
  root.append(section('Changement de plateau',
    h('p', { class: 'hint' }, 'Pour enchaîner deux groupes : ce qui reste reste en place, ce qui part est grisé avec une note « À SORTIR », ce qui arrive est marqué « À RENTRER ».'),
    h('div', { class: 'btnrow wrap' }, h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => toggleChangeover() }, on ? 'Mode actif : cliquer pour quitter' : 'Activer le mode changement')),
    on ? h('div', {}, choose('Plateau actuel (sur scène)', 'from'), choose('Plateau suivant', 'to'),
      h('button', { class: 'small', onclick: () => keepTab(() => st.swapChangeover()) }, '⇅ Inverser')) : null));
  // liste des plateaux
  const nameBox = p => {
    const i = h('input', { type: 'text', value: p.name });
    i.addEventListener('change', () => keepTab(() => { edit(() => st.renamePlateau(p.id, i.value), false); renderPanel(); }));
    i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') i.blur(); });
    return i;
  };
  root.append(section('Plateaux',
    P.length ? h('div', { class: 'lays' }, P.map(p => h('div', { class: 'lay' },
      nameBox(p), h('em', { title: 'Objets propres à ce plateau' }, st.S.objects.filter(o => Array.isArray(o.pl) && o.pl.includes(p.id)).length),
      h('button', { class: 'lb', title: 'Supprimer ce plateau', onclick: async () => {
        if (await ask('Supprimer ce plateau ?', tr("« {name} » disparaît ; ses objets restent sur le plan.", { name: p.name }), 'Supprimer')) keepTab(() => { edit(() => st.deletePlateau(p.id), false); st.refreshLayers(); });
        renderPanel();
      } }, '🗑')))) : h('p', { class: 'hint' }, 'Aucun plateau : activez le mode changement pour en créer deux.'),
    h('div', { class: 'btnrow wrap' }, h('button', { class: 'small', onclick: () => keepTab(() => { edit(() => st.addPlateau(), false); renderPanel(); }) }, '＋ Ajouter un plateau')),
    h('p', { class: 'hint' }, "Un objet présent sur tous les plateaux (sono, régie, truss…) reste en place. Le compteur indique les objets propres à un plateau.")));
  if (!on) return root;
  // marquer la sélection
  const ns = st.selObjs().length;
  const mk = (kind, label) => h('button', { class: 'mark ' + kind, disabled: !ns, onclick: () => keepTab(() => { edit(() => st.markObjects(st.selObjs(), kind), false); st.refreshLayers(); renderPanel(); }) }, label);
  root.append(section('Marquer la sélection',
    h('p', { class: 'hint' }, ns ? tr('{n} objet(s) sélectionné(s) :', { n: ns }) : 'Sélectionnez des objets sur le plan (Maj ou cadre pour plusieurs), puis choisissez :'),
    h('div', { class: 'markbtns' }, mk('stay', 'Reste en place'), mk('out', 'Part (à sortir)'), mk('in', 'Arrive (à rentrer)'))));
  // listes
  const L = st.changeLists();
  const listSec = (kind, title, list) => {
    const rows = st.changeRows(list);
    return h('div', { class: 'chgsec ' + kind }, section(tr(title) + ` (${list.length})`, rows.length
      ? h('table', { class: 'tbl' }, rows.map(r => h('tr', { class: 'click', title: 'Sélectionner sur le plan', onclick: () => keepTab(() => st.selectIds(r.ids)) },
        h('td', { class: 'q' }, r.qty + '×'), h('td', {}, tr(r.name), r.label ? h('b', {}, ' ' + r.label) : null, r.notes.length ? h('small', {}, r.notes.join(' · ')) : null))))
      : h('p', { class: 'hint' }, 'Rien.')));
  };
  root.append(listSec('out', 'À sortir', L.out), listSec('in', 'À rentrer', L.in), listSec('stay', 'Reste en place', L.stay),
    h('div', { class: 'btnrow wrap' }, h('button', { onclick: () => st.downloadBlob(new Blob([changeCsv()], { type: 'text/csv;charset=utf-8' }), st.safeName() + '_changement.csv') }, '⬇ CSV du changement')),
    h('p', { class: 'hint' }, 'La fiche PDF contient le plan du changement (objets grisés) et ces listes à sortir / à rentrer.'));
  return root;
}

/* ---------- onglet Événement ---------- */
function panelEvent() {
  const root = h('div', { class: 'pn' });
  const m = st.S.meta, r = st.S.room, s = st.S.settings;
  root.append(
    section('Événement',
      txt('Nom', () => m.name, v => { edit(() => { m.name = v; }, false); $('#evName').value = v; }),
      txt('Date', () => m.date, v => edit(() => { m.date = v; }, false), { ph: 'ex. 12/10/2026' }),
      txt('Lieu', () => m.lieu, v => edit(() => { m.lieu = v; }, false), { ph: 'salle, ville' }),
      txt('Établi par', () => m.auteur, v => edit(() => { m.auteur = v; }, false), { ph: 'technicien / société' }),
      txt('Notes générales', () => m.notes, v => edit(() => { m.notes = v; }, false), { area: true, ph: 'accès, horaires, contraintes…' })),
    section('Salle (m)',
      h('div', { class: 'three' },
        num('Largeur', () => r.w, v => edit(() => { r.w = v; }, false), { unit: '', step: 1, min: 4, max: 200 }),
        num('Profondeur', () => r.d, v => edit(() => { r.d = v; }, false), { unit: '', step: 1, min: 4, max: 200 }),
        num('Mur du fond', () => r.back, v => edit(() => { r.back = v; }, false), { unit: '', step: 0.5, min: 0, max: 100 })),
      h('p', { class: 'hint' }, '« Mur du fond » : distance entre le centre de la scène (0,0) et le mur du fond.')),
    section('Câbles',
      h('div', { class: 'two' },
        num('Marge', () => s.margin, v => edit(() => { s.margin = v; }, false), { unit: '%', step: 5, dec: 0, min: 0, max: 100 }),
        num('Rab / extrémité', () => s.rab, v => edit(() => { s.rab = v; }, false), { unit: 'm', step: 0.5, dec: 1, min: 0, max: 10 })),
      h('p', { class: 'hint' }, 'Longueur à prévoir = tracé × (1 + marge) + 2 × rab, arrondie à la longueur standard supérieure.')),
    section('Fichier',
      h('div', { class: 'btnrow wrap' },
        h('button', { onclick: () => st.exportJSON() }, '⬇ Enregistrer (.json)'),
        h('button', { onclick: () => $('#fileIn').click() }, '📂 Ouvrir'),
        h('button', { onclick: () => openTemplates() }, '▦ Modèles')),
      h('p', { class: 'hint' }, 'Le plan est aussi sauvegardé automatiquement dans ce navigateur.')));
  return root;
}

/* ================= modales ================= */
function openTemplates() {
  modal(h('div', {}, h('h3', {}, 'Modèles de scène'), h('p', { class: 'muted' }, 'Choisissez un point de départ. Le plan actuel sera remplacé (pensez à l\'enregistrer).'),
    h('div', { class: 'tpls' }, TEMPLATES.map(t => h('button', { class: 'tpl', onclick: async () => {
      if (st.S.objects.length && !(await ask('Remplacer le plan actuel ?', tr('Le plan en cours sera remplacé par « {name} ». Vous pouvez annuler avec Ctrl+Z.', { name: tr(t.name) }), 'Remplacer'))) return;
      closeModal(); st.setState(st.S); applyTemplate(t.id); view.frame(); toast(tr('Modèle « {name} » chargé', { name: tr(t.name) }));
    } }, h('b', {}, t.name), h('span', {}, t.desc)))),
    h('div', { class: 'row end' }, h('button', { onclick: closeModal }, 'Fermer'))), true);
}
// dimensions de la salle : champs, formats prédéfinis, ajustement automatique au contenu
const ROOM_PRESETS = [['Petite salle', 10, 12, 3], ['Club', 16, 20, 4], ['Salle 400 places', 24, 30, 6], ['Grande salle', 40, 50, 8], ['Festival', 70, 80, 10]];
function openRoom() {
  const r = st.S.room;
  const apply = (w, d, back) => { r.w = w; r.d = d; r.back = back; st.commit(); view.frame(); openRoom(); };
  const field = (label, key, min, max, step) => {
    const i = h('input', { type: 'number', step, min, max });
    i.value = r[key];
    i.addEventListener('change', () => {
      const v = parseFloat(String(i.value).replace(',', '.'));
      if (!isFinite(v)) { i.value = r[key]; return; }
      r[key] = clamp(v, min, max); i.value = r[key];
      st.commit();
      info.textContent = summary();
    });
    i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') i.blur(); });
    return h('label', { class: 'fld' }, h('span', { style: 'width:130px' }, label), i, h('em', {}, 'm'));
  };
  const summary = () => tr('Surface : {s} m² · scène (0,0) à {b} m du mur du fond', { s: st.fn(r.w * r.d, 0), b: st.fn(r.back, 1) });
  const info = h('p', { class: 'hint' }, summary());
  const fit = () => {
    const b = view.contentBounds();
    const w = Math.max(6, Math.ceil((Math.max(Math.abs(b.minX), Math.abs(b.maxX)) * 2 + 4) / 2) * 2);
    const back = Math.max(1, Math.ceil(-b.minZ + 2));
    const d = Math.max(6, Math.ceil(back + b.maxZ + 3));
    apply(w, d, back);
  };
  modal(h('div', {},
    h('h3', {}, 'Salle et sol'),
    field('Largeur', 'w', 4, 200, 1), field('Profondeur', 'd', 4, 200, 1), field('Mur du fond', 'back', 0, 100, 0.5),
    info,
    h('div', { class: 'sec' }, h('h4', {}, 'Formats prédéfinis'),
      h('div', { class: 'chips' }, ROOM_PRESETS.map(([n, w, d, b]) => h('button', { class: 'chip', title: `${w} × ${d} m`, onclick: () => apply(w, d, b) }, `${tr(n)} · ${w}×${d}`)))),
    h('div', { class: 'sec' }, h('h4', {}, 'Type de sol'),
      h('div', { class: 'floors' }, FLOORS.map(f => h('button', { class: 'floor' + ((r.floor || 'std') === f.id ? ' on' : ''), title: f.name, onclick: () => { r.floor = f.id; st.commit(); openRoom(); } },
        floorSwatch(f.id), h('span', {}, f.name))))),
    h('div', { class: 'row end' },
      h('button', { onclick: fit, title: 'Calcule une salle qui contient tout votre plan' }, '⤢ Adapter à mon plan'),
      h('button', { class: 'primary', onclick: closeModal }, 'OK'))), true);
}
function openHelp() {
  modal(h('div', {}, h('h3', {}, 'Stage3D — mode d\'emploi'),
    h('div', { class: 'help' },
      h('p', {}, h('b', {}, '1. Poser : '), 'cliquez un objet dans la bibliothèque puis cliquez sur le plan (clic droit ou Échap pour arrêter). Tout est à l\'échelle réelle, en mètres.'),
      h('p', {}, h('b', {}, '2. Ajuster : '), 'sélectionnez un objet pour régler position, rotation, dimensions, hauteur. L\'aimant colle les bords des praticables entre eux ; la grille arrondit les positions.'),
      h('p', {}, h('b', {}, '3. Mesurer & câbler : '), 'outil Mesure (M) pour les distances, outil Câble (C) pour tracer un chemin : la longueur à prévoir (marge incluse) est calculée.'),
      h('p', {}, h('b', {}, '4. Calculer : '), 'placez un point d\'écoute 👂 et des enceintes : l\'onglet Calculs donne distances, temps d\'arrivée et retards, ainsi que les délais des tours de delay.'),
      h('p', {}, h('b', {}, '5. Livrer : '), '« Fiche PDF » génère le dossier technique (plan à l\'échelle, vue 3D, liste matériel, câbles, patch). « PNG » exporte le plan seul.'),
      h('p', {}, h('b', {}, '6. Calques : '), "onglet « Calques » : chaque objet appartient à un groupe que l'on affiche, masque, isole ou verrouille en un clic ; « Sans backline » retire les musiciens et le backline ; le filtre des faisceaux choisit les types de projecteurs à afficher."),
      h('p', {}, h('b', {}, 'Se déplacer en 3D : '), ...(lang() === 'fr' ? ['Z', 'Q', 'S', 'D'] : ['W', 'A', 'S', 'D']).map(c => h('kbd', {}, c)), ' avancer / gauche / reculer / droite (WASD sur un clavier QWERTY), ', h('kbd', {}, 'E'), ' monter, ', h('kbd', {}, lang() === 'fr' ? 'A' : 'Q'), ' descendre, ', h('kbd', {}, 'Maj'), ' = rapide, ', h('kbd', {}, 'Alt'), ' = lent. Clic droit + souris : regarder autour de soi. Molette : zoom vers le curseur (Ctrl ou Alt + molette : zoom fin). Double-clic : aller à cet endroit. Glisser dans le vide : tourner autour de la scène. Boutons 👁 🎧 🎤 : hauteur d\'yeux, vue depuis la régie, vue depuis la scène.'),
      h('p', { class: 'muted' }, 'Vues : 1 = 3D, 2 = Plan, 3 = Face, 4 = Côté. Perdu dans la scène : touche 0 (ou bouton ⟲) pour réinitialiser la vue. Pivoter un objet : R / Maj+R (15°) et T / Maj+T (90°). Les données restent dans votre navigateur.')),
    h('div', { class: 'sec credits' }, h('h4', {}, 'Crédits'),
      h('p', { class: 'muted' }, 'Stage3D créé par ', h('b', {}, 'PaulMX'), ' · ', h('a', { href: 'https://paulmx.itch.io', target: '_blank', rel: 'noopener' }, 'paulmx.itch.io'), '.', h('br'), "Code et modèles 3D réalisés avec l'aide de l'intelligence artificielle (IA).",
        h('br'), 'Moteur 3D : three.js © 2010-2024 les auteurs de three.js, licence MIT.')),
    h('div', { class: 'row end' }, h('button', { class: 'primary', onclick: closeModal }, 'Compris'))), true);
}

/* ================= clavier ================= */
function onKey(e) {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  const k = e.key, ctrl = e.ctrlKey || e.metaKey;
  if (!$('#modal').hidden) { if (k === 'Escape') closeModal(); return; }
  if (!$('#sheet').hidden) return;
  if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); st.exportJSON(); return; }
  if (ctrl && k.toLowerCase() === 'o') { e.preventDefault(); $('#fileIn').click(); return; }
  if (ctrl && k.toLowerCase() === 'p') { e.preventDefault(); openSheet(); return; }
  if (typing) { if (k === 'Escape') e.target.blur(); return; }
  if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); return; }
  if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); st.redo(); return; }
  if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); dup(); return; }
  if (ctrl && k.toLowerCase() === 'c') { st.copySel() && toast('Copié'); return; }
  if (ctrl && k.toLowerCase() === 'v') { st.pasteClip(); return; }
  if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); st.selectIds(st.S.objects.filter(st.isPickable).map(o => o.id)); return; }
  if (ctrl) return;
  // navigation : touches physiques (WASD en QWERTY = ZQSD en AZERTY), indépendantes de la disposition du clavier
  if (MODS.includes(e.code)) view.navKey(e.code, true);
  if (NAV.includes(e.code)) { e.preventDefault(); view.navKey(e.code, true); padLight(e.code, true); return; }
  const lower = k.toLowerCase();
  if (k === 'Escape') {
    if (view.cancelTool()) return;
    if (T.tool !== 'select') setTool('select'); else st.clearSel();
    return;
  }
  if (k === 'Enter' && T.tool === 'cable') { view.finishCable(); return; }
  if (k === 'Backspace' && T.tool === 'cable') { view.cableBackspace(); e.preventDefault(); return; }
  if (k === 'Delete' || k === 'Backspace') { st.deleteSelection(); e.preventDefault(); return; }
  if (e.code === 'Digit0' || e.code === 'Numpad0' || k === 'Home') { view.resetView(); return; }
  if (['1', '2', '3', '4'].includes(k)) { view.setView(['3d', 'plan', 'front', 'side'][+k - 1]); syncBars(); return; }
  if (lower === 'v') return setTool('select');
  if (lower === 'm') return setTool('measure');
  if (lower === 'c') return setTool('cable');
  if (lower === 'f') return view.frame(true);
  if (lower === 'g') return toggleOpt('grid');
  if (lower === 'l') return toggleOpt('labels');
  if (lower === 'h') return toggleOpt('coverage');
  if (lower === 'b') return toggleOpt('beams');
  if (k === '+' || k === '=' || e.code === 'NumpadAdd') { view.zoomBy(1 / 1.3, e.shiftKey || e.altKey); return; }
  if (k === '-' || e.code === 'NumpadSubtract') { view.zoomBy(1.3, e.shiftKey || e.altKey); return; }
  if (lower === 'r' || lower === 't') {
    const deg = lower === 'r' ? (e.shiftKey ? -15 : 15) : (e.shiftKey ? -90 : 90);
    if (T.tool === 'place') view.rotateGhost(deg); else st.rotateSel(deg);
    return;
  }
  if (k.startsWith('Arrow')) {
    e.preventDefault();
    // sans sélection, les flèches déplacent la vue comme ZQSD ; avec une sélection, elles décalent les objets
    if (!sel.ids.size && !sel.cable && !sel.measure) {
      const c = ARROWS[k];
      view.navKey(c, true); padLight(c, true);
      return;
    }
    const S = st.S.settings, step = e.shiftKey ? S.grid : (e.altKey ? 1 : 0.05);
    const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, dz = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
    st.nudgeSel(dx, dz);
  }
}
const NAV = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'];
const MODS = ['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight'];
const ARROWS = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' };
function padLight(code, on) {
  const b = document.querySelector(`#nav .k[data-code="${code}"]`);
  if (b) b.classList.toggle('down', on);
}
function onKeyUp(e) {
  if (NAV.includes(e.code) || MODS.includes(e.code)) { view.navKey(e.code, false); padLight(e.code, false); }
  else if (ARROWS[e.key]) { view.navKey(ARROWS[e.key], false); padLight(ARROWS[e.key], false); }
}
// poignées : redimensionner la bibliothèque et le panneau de droite (taille mémorisée, double-clic = taille d'origine)
function initSplitters() {
  const LKEY = 'stage3d.layout';
  const lim = { lib: [180, 480], side: [240, 600] };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LKEY) || '{}') || {}; } catch (e) { /* ignore */ }
  const el = { lib: $('#lib'), side: $('#side') };
  const apply = (k, w) => {
    const other = k === 'lib' ? 'side' : 'lib';
    const room = window.innerWidth - 20 - 20 - (el[other].offsetWidth || 0) - 360; // le plateau garde au moins 360 px
    el[k].style.width = clamp(w, lim[k][0], Math.max(lim[k][0], Math.min(lim[k][1], room))) + 'px';
  };
  for (const k of ['lib', 'side']) if (saved[k]) apply(k, saved[k]);
  const save = () => { try { localStorage.setItem(LKEY, JSON.stringify(saved)); } catch (e) { /* ignore */ } };
  document.querySelectorAll('.split').forEach(sp => {
    const k = sp.dataset.side;
    let x0 = 0, w0 = 0, moved = 0, lastClick = 0;
    sp.addEventListener('pointerdown', e => {
      e.preventDefault();
      x0 = e.clientX; w0 = el[k].offsetWidth; moved = 0;
      try { sp.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      sp.classList.add('drag'); document.body.classList.add('resizing');
    });
    sp.addEventListener('pointermove', e => {
      if (!sp.classList.contains('drag')) return;
      moved = Math.max(moved, Math.abs(e.clientX - x0));
      apply(k, w0 + (k === 'lib' ? e.clientX - x0 : x0 - e.clientX));
    });
    const end = () => {
      if (!sp.classList.contains('drag')) return;
      sp.classList.remove('drag'); document.body.classList.remove('resizing');
      const now = performance.now();
      if (moved < 3 && now - lastClick < 450) { el[k].style.width = ''; delete saved[k]; save(); lastClick = 0; return; } // double-clic : taille d'origine
      lastClick = moved < 3 ? now : 0;
      saved[k] = el[k].offsetWidth; save();
    };
    sp.addEventListener('pointerup', end);
    sp.addEventListener('pointercancel', end);
  });
  window.addEventListener('resize', () => { for (const k of ['lib', 'side']) if (el[k].style.width) apply(k, parseFloat(el[k].style.width)); });
}
function initNav() {
  const pad = $('#nav');
  pad.querySelectorAll('.k').forEach(b => {
    const code = b.dataset.code;
    b.dataset.sub = code === 'KeyQ' ? '↓' : code === 'KeyE' ? '↑' : '';
    const on = e => { e.preventDefault(); view.navKey(code, true); b.classList.add('down'); try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
    const off = () => { view.navKey(code, false); b.classList.remove('down'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
  });
  pad.querySelectorAll('.pre button').forEach(b => {
    b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'eye') view.eyeLevel();
      else if (a === 'listener') { if (!view.viewFromListener()) toast('Placez un point d\'écoute 👂 ou une régie pour utiliser cette vue'); }
      else if (a === 'stage') view.viewFromStage();
      else if (a === 'reset') view.resetView();
      else view.frame(true);
    };
  });
  // les lettres affichées suivent la disposition réelle du clavier (AZERTY / QWERTY)
  try {
    navigator.keyboard && navigator.keyboard.getLayoutMap().then(m => {
      pad.querySelectorAll('.k').forEach(b => { const l = (m.get(b.dataset.code) || '').toUpperCase(); if (l) b.textContent = l; });
    }).catch(() => {});
  } catch (err) { /* ignore */ }
  window.addEventListener('blur', () => { view.navClear(); pad.querySelectorAll('.k.down').forEach(b => b.classList.remove('down')); });
  try {
    if (!localStorage.getItem('stage3d.navhint')) {
      localStorage.setItem('stage3d.navhint', '1');
      setTimeout(() => toast('Astuce : ZQSD pour se déplacer · A / E pour descendre / monter · clic droit + souris pour regarder · Maj = rapide', 7000), 1800);
    }
  } catch (err) { /* ignore */ }
}

// plan créé par une version plus récente : ouvert au mieux, rien n'est supprimé
function warnNewer(r) {
  if (r && r.newer) setTimeout(() => toast("Ce plan vient d'une version plus récente de Stage3D : il est ouvert au mieux, rien n'est supprimé.", 7000), 2800);
}

/* ================= initialisation ================= */
export function init() {
  $('#stage').append(h('div', { id: 'cobar' }));
  renderLib();
  renderBars();
  renderTabs();
  renderPanel();
  $('#libSearch').addEventListener('input', renderLib);
  const ls = $('#langSel');
  ls.replaceChildren(...LANGS.map(([id, n]) => h('option', { value: id, selected: id === lang() }, n)));
  ls.onchange = () => { setLang(ls.value); relang(); };
  applyStatic();
  const nameIn = $('#evName');
  nameIn.value = st.S.meta.name;
  nameIn.addEventListener('change', () => { st.S.meta.name = nameIn.value; st.commit(); });
  nameIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') nameIn.blur(); });
  $('#bUndo').onclick = () => st.undo();
  $('#bRedo').onclick = () => st.redo();
  $('#bTpl').onclick = openTemplates;
  $('#bOpen').onclick = () => $('#fileIn').click();
  $('#bSave').onclick = () => st.exportJSON();
  $('#bPng').onclick = () => exportPng();
  $('#bSheet').onclick = () => openSheet();
  $('#bHelp').onclick = openHelp;
  const themeBtn = $('#bTheme');
  syncThemeBtn();
  themeBtn.onclick = () => { view.setTheme(T.theme === 'dark' ? 'aero' : 'dark'); T.themeSet = true; st.savePrefs(); syncThemeBtn(); };
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  $('#fileIn').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { const r = st.importJSONText(await f.text()); view.frame(); toast(tr('« {name} » ouvert', { name: f.name })); warnNewer(r); }
    catch (err) { toast(tr('Fichier illisible : {e}', { e: err.message })); }
    e.target.value = '';
  });
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);
  initNav();
  initSplitters();
  // glisser-déposer d'un fichier de plan
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', async e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && /json$/i.test(f.name)) { try { const r = st.importJSONText(await f.text()); view.frame(); toast(tr('« {name} » ouvert', { name: f.name })); warnNewer(r); } catch (err) { toast('Fichier illisible'); } }
  });

  view.V.onHint = t => { $('#hint').textContent = t; $('#hint').style.display = t ? 'block' : 'none'; };
  view.V.onCursor = (x, z) => { $('#stCur').textContent = `X ${st.fn(x, 2)} m   Z ${st.fn(z, 2)} m`; };

  st.on('change', () => {
    nameIn.value = st.S.meta.name;
    if (document.activeElement !== nameIn) nameIn.value = st.S.meta.name;
    syncBars(); renderStatus();
    if (selfEdit) { updateLive(); return; }
    renderPanel();
  });
  st.on('selection', () => {
    // les onglets de travail (Calques, Plateaux) restent ouverts quand on sélectionne sur le plan : on marque ou on déplace la sélection depuis ces onglets
    if (!holdTab && !['obj', 'lay', 'plat'].includes(T.tab) && (sel.ids.size || sel.cable || sel.measure)) { T.tab = 'obj'; renderTabs(); }
    renderPanel(); renderStatus();
  });
  st.on('moving', () => { updateLive(); });
  st.on('tool', () => { syncBars(); renderLib(); });
  st.on('view', () => { syncBars(); syncZoom(); });
  st.on('zoom', syncZoom);
  renderStatus();
  syncZoom();
}
function syncThemeBtn() {
  const b = $('#bTheme');
  if (b) b.textContent = T.theme === 'dark' ? '☀ Aero' : '🌙 ' + tr('Dark mode');
}
// changement de langue : tout ce que l'interface dessine est reconstruit
function relang() {
  closeModal();
  renderLib(); renderBars(); renderTabs(); renderPanel(); renderCoBar();
  applyStatic(); syncThemeBtn(); syncZoom(); renderStatus();
  view.refreshDisplay();
  const ls = $('#langSel');
  if (ls) ls.value = lang();
}
export { relang };
function syncZoom() {
  const r = $('#zoomRange'), v = $('#zoomVal');
  if (!r || !v) return;
  const z = view.zoomInfo();
  if (document.activeElement !== r) r.value = Math.round(z.frac * 1000);
  v.textContent = z.label;
}
function renderStatus() {
  const n = sel.ids.size;
  const no = st.S.objects.length, nc = st.S.cables.length;
  const hid = st.hiddenObjectCount();
  $('#stSel').textContent = n ? tr(n > 1 ? '{n} sélectionnés' : '{n} sélectionné', { n }) : tr(no > 1 ? '{n} objets' : '{n} objet', { n: no }) + (hid ? ' (' + tr(hid > 1 ? '{n} masqués' : '{n} masqué', { n: hid }) + ')' : '') + ' · ' + tr(nc > 1 ? '{n} câbles' : '{n} câble', { n: nc });
}
