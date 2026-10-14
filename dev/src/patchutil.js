// Aides communes aux patchs (son et lumière) : familles de voies, textes de fixation, plages d'adresses DMX.
// Utilisé par l'interface (ui.js) et par la fiche imprimable (sheet.js).
import * as st from './store.js';
import { def } from './catalog.js';
import { tr } from './i18n.js';

// familles du patch son (couleur de repérage des voies)
export const PGROUPS = [['Batterie', '#e5484d'], ['Basse', '#3b82f6'], ['Guitares', '#f2b800'], ['Claviers', '#a64be0'], ['Chant', '#2fbf5a'], ['Autres', '#8c97ac']];
export const PCOL = Object.fromEntries(PGROUPS);
export function guessGroup(src) {
  const s = String(src || '').toLowerCase();
  if (/kick|grosse|snare|caisse|\btoms?\b|tom \d|floor|hi-?hat|charley|\boh\b|overhead|cymb/.test(s)) return 'Batterie';
  if (/bass|basse/.test(s)) return 'Basse';
  if (/guit|gtr/.test(s)) return 'Guitares';
  if (/clav|key|piano|synth|orgue/.test(s)) return 'Claviers';
  if (/voix|vox|vocal|chant|lead|ch[œo]e?ur|choir|back/.test(s)) return 'Chant';
  return 'Autres';
}
// famille d'une voie : celle choisie à la main (r.grp), sinon déduite du nom de la source
export const patchGroup = r => (r.grp && PCOL[r.grp] ? r.grp : guessGroup(r.source));

/* ----- patch lumière ----- */
export const fixName = o => o.label || tr(def(o.type).name);
export function mountText(o) {
  const d = def(o.type);
  if (o.type === 'totem') return tr('Pied T-bar');
  if (o.type === 'pied_lum') return tr('Pied de lumière');
  if (d.mount) return [tr('Accroché'), tr('Au sol'), tr('Sur pied')][o.mount | 0];
  return d.hang ? tr('Accroché') : tr('Au sol');
}
export function addrText(o) {
  const sp = st.dmxSpan(o);
  return sp ? `${String(sp.a).padStart(3, '0')}–${String(sp.b).padStart(3, '0')}` : '—';
}
export const modeText = o => { const m = st.dmxMode(o); return m ? tr(m.key, m.params) : ''; };
