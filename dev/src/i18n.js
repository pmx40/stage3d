// Traduction : le français est la langue source ; les autres langues sont des tables « texte français -> traduction » (lang.js).
// tr('texte français', { param }) remplace {param} ; un texte sans traduction reste en français.
import { RAW } from './lang.js';

export const LANGS = [['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['it', 'Italiano']];
const IDX = { en: 0, es: 1, de: 2, it: 3 };
const TABLES = { en: {}, es: {}, de: {}, it: {} };
for (const [fr, arr] of Object.entries(RAW)) for (const l of Object.keys(IDX)) if (arr[IDX[l]] != null && arr[IDX[l]] !== '') TABLES[l][fr] = arr[IDX[l]];

const KEY = 'stage3d.lang';
let cur = 'fr';
export const MISS = new Set(); // textes sans traduction rencontrés (pour les tests)
export const lang = () => cur;
export const decimal = () => (cur === 'en' ? '.' : ',');

export function detectLang() {
  try { const s = localStorage.getItem(KEY); if (s && LANGS.some(l => l[0] === s)) return s; } catch (e) { /* ignore */ }
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.some(l => l[0] === nav) ? nav : 'en';
}
export function setLang(l, save = true) {
  cur = LANGS.some(x => x[0] === l) ? l : 'fr';
  document.documentElement.lang = cur;
  if (save) { try { localStorage.setItem(KEY, cur); } catch (e) { /* ignore */ } }
}
export function tr(s, p) {
  if (typeof s !== 'string' || !s) return s;
  let r = s;
  if (cur !== 'fr') {
    const t = TABLES[cur][s];
    if (t != null) r = t;
    else {
      // texte entouré d'espaces : on traduit le cœur et on garde les espaces
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
      if ((m[1] || m[3]) && TABLES[cur][core] != null) r = m[1] + TABLES[cur][core] + m[3];
      else MISS.add(s);
    }
  }
  return p ? r.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : r;
}

/* ---- parties statiques du HTML (hors zones dessinées par l'interface) ---- */
const DYNAMIC = '#libList,#vbar,#tbar,#tabs,#panel,#modal,#sheet,#toast,#overlay,#hint,#stCur,#stSel,#zoomVal,#bTheme,#langSel';
export function applyStatic() {
  const walk = el => {
    if (el.closest && el.closest(DYNAMIC)) return;
    for (const a of ['title', 'placeholder']) {
      if (el.hasAttribute && el.hasAttribute(a)) {
        const k = 'fr_' + a;
        if (el.dataset[k] == null) el.dataset[k] = el.getAttribute(a);
        el.setAttribute(a, tr(el.dataset[k]));
      }
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        if (n.__fr == null) n.__fr = n.nodeValue;
        const t = n.__fr.trim();
        if (t) n.nodeValue = n.__fr.replace(t, tr(t));
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(document.body);
  document.title = tr("Stage3D — Plan de scène à l'échelle pour techniciens son");
  const md = document.querySelector('meta[name="description"]');
  if (md) { if (!md.dataset.fr) md.dataset.fr = md.content; md.content = tr(md.dataset.fr); }
}
