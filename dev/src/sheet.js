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

function build(sheet) {
  const S = st.S;
  const planCap = view.capture('plan', 2400, 1440);
  const d3 = view.capture('3d', 1500, 940).canvas;
  const denom = planCap.scale.imageWidthM / 0.277;
  const nice = NICE.find(n => n >= denom) || Math.ceil(denom / 500) * 500;
  const widthMm = Math.min(277, (planCap.scale.imageWidthM / nice) * 1000);
  const b = st.bom();
  const head = (title, n) => h('header', { class: 'ph' },
    h('div', {}, h('h1', {}, S.meta.name || tr('Plan de scène')), h('p', {}, metaLine() || title)),
    h('div', { class: 'phr' }, h('b', {}, 'STAGE3D'), h('span', {}, "made by PaulMX · réalisé avec l'IA"), h('span', { class: 'pgn' }, tr(title))));

  /* --- page 1 : plan --- */
  const planImg = h('img', { class: 'planimg', src: planCap.canvas.toDataURL('image/png'), style: `width:${widthMm}mm` });
  const used = [...new Set(S.cables.map(c => c.kind))];
  const page1 = h('section', { class: 'page' }, head('Plan de scène', 1),
    h('div', { class: 'planwrap' }, planImg),
    h('footer', { class: 'pf' },
      h('span', {}, tr('Échelle 1:{n}  (A4 paysage, impression à 100 %)', { n: nice })),
      h('span', {}, 'Haut du plan = fond de scène · Bas = public · cotes en mètres'),
      st.T.co.on ? h('span', { class: 'chgnote' }, tr('Changement de plateau : « {a} » → « {b} » (grisé = à sortir, vert = à rentrer)', { a: st.plateauName(st.T.co.from), b: st.plateauName(st.T.co.to) })) : null,
      st.hiddenGroupNames().length ? h('span', {}, tr('Calques masqués : {names}', { names: st.hiddenGroupNames().join(', ') })) : null,
      ...used.map(k => h('span', { class: 'lg' }, h('i', { style: `background:${CABLE_KINDS[k].color}` }), tr(CABLE_KINDS[k].name)))));

  /* --- page 2 : 3D + matériel --- */
  const byCat = new Map();
  b.list.forEach(r => { (byCat.get(r.cat) || byCat.set(r.cat, []).get(r.cat)).push(r); });
  const mat = [];
  for (const cat of CATS) {
    const rows = byCat.get(cat.id);
    if (!rows) continue;
    mat.push(h('h3', {}, `${cat.icon} ${tr(cat.name)}`));
    mat.push(h('table', { class: 'lt' }, rows.map(r => h('tr', {}, h('td', { class: 'q' }, r.qty + '×'), h('td', {}, r.name), h('td', { class: 'd' }, r.dims)))));
  }
  const cabs = b.cables.length
    ? [h('h3', {}, '〰 Câbles à prévoir (marge et rab inclus)'), h('table', { class: 'lt' }, b.cables.map(r => h('tr', {}, h('td', { class: 'q' }, r.qty + '×'), h('td', {}, tr(CABLE_KINDS[r.kind].name)), h('td', { class: 'd' }, r.std + ' m'))))]
    : [];
  const page2 = h('section', { class: 'page' }, head('Vue 3D & matériel', 2),
    h('div', { class: 'cols' },
      h('div', {}, h('img', { class: 'img3d', src: d3.toDataURL('image/jpeg', 0.9) }),
        h('div', { class: 'kpis' },
          h('div', {}, h('b', {}, b.list.reduce((a, r) => a + r.qty, 0)), h('small', {}, 'objets')),
          h('div', {}, h('b', {}, b.nPrat), h('small', {}, 'praticables')),
          h('div', {}, h('b', {}, st.fn(b.surface, 1)), h('small', {}, 'm² de scène')),
          h('div', {}, h('b', {}, Math.round(b.cableTotal)), h('small', {}, 'm de câble')))),
      h('div', { class: 'matcol' }, mat.length ? mat : [h('p', {}, 'Aucun matériel placé.')], cabs)));

  /* --- page 3 : calculs, patch, notes --- */
  const blocks = [];
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
  const mons = st.monitors().filter(o => String(o.num ?? '').trim());
  if (mons.length) {
    blocks.push(h('h3', {}, 'Retours de scène numérotés'));
    blocks.push(h('table', { class: 'lt wide' }, h('tr', { class: 'th' }, h('td', {}, 'N°'), h('td', {}, 'Retour'), h('td', {}, 'X (m)'), h('td', {}, 'Z (m)')),
      mons.sort((x, y) => String(x.num).localeCompare(String(y.num), undefined, { numeric: true })).map(o => h('tr', {}, h('td', { class: 'q' }, o.num), h('td', {}, o.label || tr(def(o.type).name)), h('td', {}, st.fn(o.x, 2)), h('td', {}, st.fn(o.z, 2))))));
  }
  const notes = (st.T.listVisibleOnly ? S.objects.filter(st.isVisible) : S.objects).filter(o => o.note).map(o => h('li', {}, h('b', {}, (o.label || tr(def(o.type).name)) + ' : '), o.note));
  if (S.meta.notes || notes.length) {
    blocks.push(h('h3', {}, 'Notes'));
    if (S.meta.notes) blocks.push(h('p', { class: 'notes' }, S.meta.notes));
    if (notes.length) blocks.push(h('ul', { class: 'notes' }, notes));
  }
  const page3 = blocks.length ? h('section', { class: 'page' }, head('Calculs & notes', 3), h('div', { class: 'p3' }, blocks)) : null;

  /* --- page changement de plateau : plan grisé (page 1) + listes à sortir / à rentrer --- */
  let pageChg = null;
  if (st.T.co.on) {
    const L = st.changeLists();
    const tbl = (kind, title, list) => {
      const rows = st.changeRows(list);
      return h('div', {}, h('h3', { class: kind }, `${tr(title)} (${list.length})`),
        rows.length ? h('table', { class: 'lt' }, rows.map(r => h('tr', {}, h('td', { class: 'q' }, r.qty + '×'), h('td', {}, tr(r.name) + (r.label ? ' : ' + r.label : '')), h('td', { class: 'd' }, r.notes.join(' · '))))) : h('p', { class: 'notes' }, '—'));
    };
    pageChg = h('section', { class: 'page' }, head('Changement de plateau', 0),
      h('p', { class: 'notes' }, h('b', {}, `${st.plateauName(st.T.co.from)} → ${st.plateauName(st.T.co.to)}`)),
      h('div', { class: 'chg2' }, tbl('out', 'À sortir', L.out), tbl('in', 'À rentrer', L.in)),
      h('h3', {}, `${tr('Reste en place')} (${L.stay.length})`),
      h('p', { class: 'notes' }, st.changeRows(L.stay).map(r => `${r.qty}× ${tr(r.name)}${r.label ? ' (' + r.label + ')' : ''}`).join(' · ') || '—'));
  }

  /* --- page patch : patch son par famille, patch lumière par univers --- */
  const blocksP = [];
  if (S.patch.length) {
    const rows = S.patch.map(r => h('tr', {}, h('td', { class: 'r' }, r.ch), h('td', {}, h('b', {}, r.source)), h('td', {}, r.mic), h('td', {}, r.stand), h('td', { class: 'p' }, r.phantom ? '48 V' : ''), h('td', { class: 'n' }, r.notes)));
    blocksP.push(h('h3', {}, "Patch son : liste d'entrées"), h('table', { class: 'pt' }, h('tr', {}, ['Voie', 'Source', 'Micro / DI', 'Pied', '48 V', 'Notes'].map(t => h('th', {}, tr(t)))), rows));
  }
  const lrows = st.dmxRows().filter(o => !st.T.listVisibleOnly || st.isVisible(o));
  if (lrows.length) {
    const bad = st.dmxConflicts();
    blocksP.push(h('h3', {}, 'Patch lumière : adresses DMX'),
      h('table', { class: 'pt' }, h('tr', {}, ['N°', 'Repère', 'Type', 'Fixation', 'Univers', 'Adresse', 'Plage', 'Mode', 'Canaux', 'Notes'].map(t => h('th', {}, tr(t)))),
        lrows.map((o, i) => { const m = st.dmxMode(o), sp = st.dmxSpan(o); return h('tr', { class: bad.has(o.id) ? 'bad' : '' }, h('td', { class: 'r' }, i + 1), h('td', {}, h('b', {}, fixName(o))), h('td', {}, tr(def(o.type).name)), h('td', {}, mountText(o)), h('td', { class: 'r' }, sp ? sp.u : '—'), h('td', { class: 'r' }, sp ? sp.a : '—'), h('td', { class: 'r' }, addrText(o)), h('td', {}, modeText(o)), h('td', { class: 'r' }, m.n), h('td', { class: 'n' }, o.note || '')); })),
      h('p', { class: 'notes' }, st.dmxUsage().map(([u, n]) => tr('Univers {u} : {n} / 512 canaux', { u, n })).join('  ·  ')));
  }
  const pageP = blocksP.length ? h('section', { class: 'page' }, head('Patch', 0), h('div', { class: 'p3' }, blocksP)) : null;
  const pages = [page1, pageChg, page2, page3, pageP].filter(Boolean);
  pages.forEach((p, i) => { const g = p.querySelector('.pgn'); if (g) g.textContent += ` · ${tr('page')} ${i + 1}`; });

  sheet.replaceChildren(
    h('div', { class: 'sheet-bar noprint' },
      h('b', {}, 'Fiche technique'),
      h('span', { class: 'grow' }),
      h('span', { class: 'muted' }, 'Dans la fenêtre d\'impression, choisissez « Enregistrer au format PDF » · A4 paysage · échelle 100 %'),
      h('button', { class: 'primary', onclick: () => window.print() }, '🖨 Imprimer / PDF'),
      h('button', { onclick: closeSheet }, 'Fermer')),
    h('div', { class: 'sheet-body' }, pages));
}
