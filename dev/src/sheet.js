// Fiche technique imprimable (PDF via l'impression du navigateur), export PNG et CSV.
import { h, $, toast } from './dom.js';
import { CATS, def, CABLE_KINDS } from './catalog.js';
import * as st from './store.js';
import * as view from './view.js';
import { tr } from './i18n.js';
import { fixName, mountText, addrText, modeText } from './patchutil.js';

const NICE = [20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1500, 2000];
const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function bomCsv() {
  const b = st.bom();
  const lines = [[tr('Catégorie'), tr('Désignation'), tr('Dimensions (m)'), tr('Quantité')].join(';')];
  for (const cat of CATS) b.list.filter(r => r.cat === cat.id).forEach(r => lines.push([q(tr(cat.name)), q(r.name), q(r.dims), r.qty].join(';')));
  b.cables.forEach(r => lines.push([q(tr('Câbles')), q(tr(CABLE_KINDS[r.kind].name)), q(r.std + ' m'), r.qty].join(';')));
  return '﻿' + lines.join('\r\n');
}

function metaLine() {
  const m = st.S.meta;
  return [m.date, m.lieu, m.auteur && tr('par {a}', { a: m.auteur })].filter(Boolean).join('  ·  ');
}

export function exportPng() {
  toast(tr('Génération du plan…'));
  setTimeout(() => {
    const W = 2400, H = 1500, HEAD = 110;
    const { canvas } = view.capture('plan', W, H);
    const out = document.createElement('canvas');
    out.width = W; out.height = H + HEAD;
    const c = out.getContext('2d');
    c.fillStyle = '#12151b'; c.fillRect(0, 0, out.width, out.height);
    c.fillStyle = '#ffffff'; c.font = 'bold 44px "Segoe UI", Arial, sans-serif'; c.textBaseline = 'middle';
    c.fillText(st.S.meta.name || tr('Plan de scène'), 40, 46);
    c.fillStyle = '#9aa7c2'; c.font = '28px "Segoe UI", Arial, sans-serif';
    c.fillText(metaLine() || tr('Plan de scène à l\'échelle'), 40, 86);
    c.textAlign = 'right'; c.fillStyle = '#ffb02e'; c.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    c.fillText('STAGE3D', W - 40, 46);
    c.fillStyle = '#9aa7c2'; c.font = '22px "Segoe UI", Arial, sans-serif';
    c.fillText(tr("made by PaulMX · réalisé avec l'IA"), W - 40, 80);
    c.drawImage(canvas, 0, HEAD);
    out.toBlob(b => { st.downloadBlob(b, st.safeName() + '_plan.png'); toast(tr('Plan PNG exporté')); }, 'image/png');
  }, 40);
}

export function closeSheet() { $('#sheet').hidden = true; document.body.classList.remove('printing'); }

export function openSheet() {
  const sheet = $('#sheet');
  sheet.hidden = false;
  sheet.replaceChildren(h('div', { class: 'sheet-loading' }, 'Génération de la fiche…'));
  setTimeout(() => {
    try { build(sheet); } catch (e) { sheet.replaceChildren(h('div', { class: 'sheet-loading' }, tr('Erreur : {e}', { e: e.message }), h('br'), h('button', { onclick: closeSheet }, 'Fermer'))); }
  }, 60);
}

// cadrage de la fiche : la scène seule (praticables + ce qui l'entoure de près), sans la régie ni le public
const OUT_OF_STAGE = new Set(['foh', 'table_regie', 'table_regie_s']);
function stageObjects() {
  const vis = st.S.objects.filter(o => st.isVisible(o) && !OUT_OF_STAGE.has(o.type) && !def(o.type).listener);
  const prat = vis.filter(o => def(o.type).praticable);
  if (!prat.length) return vis.length ? vis : null;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  prat.forEach(o => { const e = st.extents(o); x0 = Math.min(x0, o.x - e.hx); x1 = Math.max(x1, o.x + e.hx); z0 = Math.min(z0, o.z - e.hz); z1 = Math.max(z1, o.z + e.hz); });
  const near = vis.filter(o => o.x > x0 - 1.2 && o.x < x1 + 1.2 && o.z > z0 - 1.2 && o.z < z1 + 1.2);
  return near.length ? near : prat;
}

function build(sheet) {
  const S = st.S;
  const objs = stageObjects();
  const bounds = view.contentBounds(objs || undefined);
  const PW = 2000;
  const bw = bounds.maxX - bounds.minX + 0.7, bd = bounds.maxZ - bounds.minZ + 0.7;
  const PH = Math.round(Math.min(Math.max(PW * bd / bw, PW * 0.45), PW * 1.4));
  const planCap = view.capture('plan', PW, PH, { labels: false, bounds, margin: 0.7 });
  const d3 = view.capture('3d', 1500, 1800, { labels: false, bounds, zoom: 1.2 }).canvas;
  const WMAX = 190;
  const denom = planCap.scale.imageWidthM / (WMAX / 1000);
  const nice = Math.ceil(denom);
  const widthMm = Math.min(WMAX, (planCap.scale.imageWidthM / nice) * 1000);
  const head = (title) => h('header', { class: 'ph' },
    h('div', {}, h('h1', {}, S.meta.name || tr('Plan de scène')), h('p', {}, metaLine() || title)),
    h('div', { class: 'phr' }, h('b', {}, 'STAGE3D'), h('span', {}, 'made by PaulMX'), h('span', { class: 'pgn' }, tr(title))));

  /* --- page 1 : plan de scène vu du dessus, sans noms --- */
  const planImg = h('img', { class: 'planimg', src: planCap.canvas.toDataURL('image/png'), style: `width:${widthMm}mm` });
  const used = [...new Set(S.cables.map(c => c.kind))];
  const page1 = h('section', { class: 'page' }, head('Plan de scène'),
    h('div', { class: 'planwrap' }, planImg),
    h('footer', { class: 'pf' },
      h('span', {}, tr('Échelle 1:{n}  (A4 portrait, impression à 100 %)', { n: nice })),
      h('span', {}, 'Haut du plan = fond de scène · Bas = public · cotes en mètres'),
      st.T.co.on ? h('span', { class: 'chgnote' }, tr('Changement de plateau : « {a} » → « {b} » (grisé = à sortir, vert = à rentrer)', { a: st.plateauName(st.T.co.from), b: st.plateauName(st.T.co.to) })) : null,
      st.hiddenGroupNames().length ? h('span', {}, tr('Calques masqués : {names}', { names: st.hiddenGroupNames().join(', ') })) : null,
      ...used.map(k => h('span', { class: 'lg' }, h('i', { style: `background:${CABLE_KINDS[k].color}` }), tr(CABLE_KINDS[k].name)))));

  /* --- page 2 : image 3D de la scène, zoomée, sans noms --- */
  const page2 = h('section', { class: 'page' }, head('Vue 3D'),
    h('img', { class: 'img3d', src: d3.toDataURL('image/jpeg', 0.92) }));

  /* --- page 3 : patch son, entrées et sorties sur une seule page --- */
  const blocksS = [];
  if (S.patch.length) {
    const rows = S.patch.map(r => h('tr', {}, h('td', { class: 'r' }, r.ch), h('td', {}, h('b', {}, r.source)), h('td', {}, r.mic), h('td', {}, r.stand), h('td', { class: 'p' }, r.phantom ? '48 V' : ''), h('td', { class: 'n' }, r.notes)));
    blocksS.push(h('h3', {}, 'Patch son : entrées (IN)'), h('table', { class: 'pt dense' }, h('tr', {}, ['Voie', 'Source', 'Micro / DI', 'Pied', '48 V', 'Notes'].map(t => h('th', {}, tr(t)))), rows));
  }
  const mons = st.monitors().sort((x, y) => String(x.num ?? '').localeCompare(String(y.num ?? ''), undefined, { numeric: true }) || x.x - y.x);
  const spk = st.speakers().filter(s => !def(s.type).monitor).sort((x, y) => x.x - y.x);
  const outs = [...mons, ...spk];
  if (outs.length) {
    const side = o => o.x < -0.05 ? tr('Jardin') : o.x > 0.05 ? tr('Cour') : tr('Centre');
    const rows = outs.map((o, i) => h('tr', {}, h('td', { class: 'r' }, i + 1), h('td', {}, h('b', {}, o.label || tr(def(o.type).name))), h('td', {}, tr(def(o.type).name)), h('td', {}, def(o.type).monitor ? tr('Retour de scène') : tr('Façade / diffusion')), h('td', {}, side(o)), h('td', { class: 'n' }, o.note || '')));
    blocksS.push(h('h3', {}, 'Patch son : sorties (OUT)'), h('table', { class: 'pt dense' }, h('tr', {}, ['Sortie', 'Destination', 'Type', 'Usage', 'Côté', 'Notes'].map(t => h('th', {}, tr(t)))), rows));
  }
  const pageSon = blocksS.length ? h('section', { class: 'page' }, head('Patch son'), h('div', { class: 'p3' }, blocksS)) : null;

  /* --- page 4 : patch lumière --- */
  const lrows = st.dmxRows().filter(o => !st.T.listVisibleOnly || st.isVisible(o));
  let pageLum = null;
  if (lrows.length) {
    const bad = st.dmxConflicts();
    pageLum = h('section', { class: 'page' }, head('Patch lumière'), h('div', { class: 'p3' },
      h('h3', {}, 'Patch lumière : adresses DMX'),
      h('table', { class: 'pt dense' }, h('tr', {}, ['N°', 'Repère', 'Type', 'Fixation', 'Univers', 'Adresse', 'Plage', 'Mode', 'Canaux', 'Notes'].map(t => h('th', {}, tr(t)))),
        lrows.map((o, i) => { const m = st.dmxMode(o), sp = st.dmxSpan(o); return h('tr', { class: bad.has(o.id) ? 'bad' : '' }, h('td', { class: 'r' }, i + 1), h('td', {}, h('b', {}, fixName(o))), h('td', {}, tr(def(o.type).name)), h('td', {}, mountText(o)), h('td', { class: 'r' }, sp ? sp.u : '—'), h('td', { class: 'r' }, sp ? sp.a : '—'), h('td', { class: 'r' }, addrText(o)), h('td', {}, modeText(o)), h('td', { class: 'r' }, m.n), h('td', { class: 'n' }, o.note || '')); })),
      h('p', { class: 'notes' }, st.dmxUsage().map(([u, n]) => tr('Univers {u} : {n} / 512 canaux', { u, n })).join('  ·  '))));
  }

  /* --- page 5 : notes (+ calculs de son s'il y en a) --- */
  const blocks = [];
  const notes = (st.T.listVisibleOnly ? S.objects.filter(st.isVisible) : S.objects).filter(o => o.note).map(o => h('li', {}, h('b', {}, (o.label || tr(def(o.type).name)) + ' : '), o.note));
  blocks.push(h('h3', {}, 'Notes'));
  if (S.meta.notes) blocks.push(h('p', { class: 'notes' }, S.meta.notes));
  if (notes.length) blocks.push(h('ul', { class: 'notes' }, notes));
  if (!S.meta.notes && !notes.length) blocks.push(h('div', { class: 'blank' }));
  const L = st.listeners();
  if (L.length && st.speakers().length) {
    L.slice(0, 2).forEach(l => {
      blocks.push(h('h3', {}, tr('Arrivée du son — {n} ({v} m/s à {t} °C)', { n: l.label || tr('point d\'écoute n°{id}', { id: l.id }), v: st.fn(st.soundSpeed(), 1), t: S.meta.temp })));
      blocks.push(h('table', { class: 'lt wide' }, h('tr', { class: 'th' }, h('td', {}, 'Enceinte'), h('td', {}, 'Distance'), h('td', {}, 'Arrivée'), h('td', {}, 'Retard pour aligner')),
        st.arrivalTable(l.id).map(r => h('tr', {}, h('td', {}, r.obj.label || tr(def(r.obj.type).name)), h('td', {}, st.fn(r.dist, 1) + ' m'), h('td', {}, st.fn(r.ms, 1) + ' ms'), h('td', { class: 'hl' }, st.fn(r.align, 1) + ' ms')))));
    });
  }
  const mains = st.speakers().filter(s => !def(s.type).speaker.delay);
  const dels = st.speakers().filter(s => def(s.type).speaker.delay);
  if (mains.length && dels.length) {
    blocks.push(h('h3', {}, tr('Tours de delay — référence : {n} (Haas 10 ms)', { n: mains[0].label || tr(def(mains[0].type).name) })));
    blocks.push(h('table', { class: 'lt wide' }, h('tr', { class: 'th' }, h('td', {}, 'Delay'), h('td', {}, 'Distance'), h('td', {}, 'Temps'), h('td', {}, 'Retard à régler')),
      st.delayTable(mains[0].id, 10).map(r => h('tr', {}, h('td', {}, r.obj.label || tr('Delay n°{id}', { id: r.obj.id })), h('td', {}, st.fn(r.dist, 1) + ' m'), h('td', {}, st.fn(r.ms, 1) + ' ms'), h('td', { class: 'hl' }, st.fn(r.value, 1) + ' ms')))));
  }
  const page5 = h('section', { class: 'page' }, head('Notes'), h('div', { class: 'p3' }, blocks));

  /* --- page changement de plateau (seulement en mode changement) --- */
  let pageChg = null;
  if (st.T.co.on) {
    const CL = st.changeLists();
    const tbl = (kind, title, list) => {
      const rows = st.changeRows(list);
      return h('div', {}, h('h3', { class: kind }, `${tr(title)} (${list.length})`),
        rows.length ? h('table', { class: 'lt' }, rows.map(r => h('tr', {}, h('td', { class: 'q' }, r.qty + '×'), h('td', {}, tr(r.name) + (r.label ? ' : ' + r.label : '')), h('td', { class: 'd' }, r.notes.join(' · '))))) : h('p', { class: 'notes' }, '—'));
    };
    pageChg = h('section', { class: 'page' }, head('Changement de plateau'),
      h('p', { class: 'notes' }, h('b', {}, `${st.plateauName(st.T.co.from)} → ${st.plateauName(st.T.co.to)}`)),
      h('div', { class: 'chg2' }, tbl('out', 'À sortir', CL.out), tbl('in', 'À rentrer', CL.in)),
      h('h3', {}, `${tr('Reste en place')} (${CL.stay.length})`),
      h('p', { class: 'notes' }, st.changeRows(CL.stay).map(r => `${r.qty}× ${tr(r.name)}${r.label ? ' (' + r.label + ')' : ''}`).join(' · ') || '—'));
  }

  const pages = [page1, page2, pageSon, pageLum, page5, pageChg].filter(Boolean);
  pages.forEach((p, i) => { const g = p.querySelector('.pgn'); if (g) g.textContent += ` · ${tr('page')} ${i + 1}`; });

  sheet.replaceChildren(
    h('div', { class: 'sheet-bar noprint' },
      h('b', {}, 'Fiche technique'),
      h('span', { class: 'grow' }),
      h('span', { class: 'muted' }, 'Dans la fenêtre d\'impression, choisissez « Enregistrer au format PDF » · A4 portrait · échelle 100 %'),
      h('button', { class: 'primary', onclick: () => window.print() }, '🖨 Imprimer / PDF'),
      h('button', { onclick: closeSheet }, 'Fermer')),
    h('div', { class: 'sheet-body' }, pages));
}
