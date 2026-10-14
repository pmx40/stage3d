// Modèles de scène prêts à l'emploi.
import * as st from './store.js';
import { tr } from './i18n.js';

const P = (type, x, z, extra) => st.addObject(type, x, z, extra && extra.label ? { ...extra, label: tr(extra.label) } : extra);

function stageDeck(cols, rows, x0, z0) {
  // praticables 2×1 : cols colonnes (2 m) × rows lignes (1 m), coin haut-gauche (x0, z0)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) P('prat_2x1', x0 + 1 + c * 2, z0 + 0.5 + r);
}
const ROCK_PATCH = [
  ['Kick In', 'Beta 91', 'Mini pied', false], ['Kick Out', 'D6 / Beta 52', 'Perche', false], ['Snare Top', 'SM57', 'Mini perche', false],
  ['Snare Bottom', 'SM57', 'Mini perche', false], ['Hi-hat', 'SM81', 'Perche', true], ['Tom 1', 'e604', 'Clip', false],
  ['Tom 2', 'e604', 'Clip', false], ['Floor Tom', 'e604', 'Clip', false], ['OH L', 'SM81', 'Perche', true], ['OH R', 'SM81', 'Perche', true],
  ['Basse DI', 'DI active', '', false], ['Basse Ampli', 'D112 / SM57', 'Perche', false], ['Guitare 1', 'SM57', 'Perche', false],
  ['Guitare 2', 'SM57', 'Perche', false], ['Claviers L', 'DI stéréo', '', false], ['Claviers R', 'DI stéréo', '', false],
  ['Voix lead', 'SM58 / Beta 58', 'Perche', false], ['Chœur 1', 'SM58', 'Perche', false], ['Chœur 2', 'SM58', 'Perche', false],
];
export function rockPatch() {
  return ROCK_PATCH.map((r, i) => ({ ch: i + 1, source: tr(r[0]), mic: tr(r[1]), stand: tr(r[2]), phantom: r[3], notes: '' }));
}

export const TEMPLATES = [
  {
    id: 'empty', name: 'Salle vide', desc: 'Repartir de zéro (salle 20 × 28 m).',
    build() { st.setState(st.blankState()); },
  },
  {
    id: 'deck', name: 'Scène 6 × 4 m (praticables)', desc: '12 praticables 2×1 de 40 cm, fond de scène et barrières.',
    build() {
      const S = st.blankState(); S.meta.name = tr('Scène 6 × 4'); st.setState(S);
      stageDeck(3, 4, -3, -2);
      P('backdrop', 0, -2.25);
      for (let i = -2; i <= 2; i++) P('barriere', i * 2.5, 4.4);
    },
  },
  {
    id: 'rock', name: 'Concert : groupe 5 musiciens', desc: 'Scène 6×4, batterie sur riser, backline, retours amplifiés, side-fills, front fills, façade + subs, 2 tentes de régie (Yamaha CL3 et QuickQ 20), Rio3224, flight-cases, passage de câbles et patch type.',
    build() {
      const S = st.blankState(); S.meta.name = tr('Concert groupe'); S.room = { w: 26, d: 32, back: 6 }; st.setState(S);
      stageDeck(3, 4, -3, -2);
      P('riser_2x2', 0, -1);
      P('backdrop', 0, -2.35);
      P('drums', 0, -1, { label: 'BATTERIE' });
      P('amp_gtr', -2.2, -1.55, { label: 'GTR 1' });
      P('stack_gtr', -1.35, -1.65, { label: 'GTR 2' });
      P('amp_bass', 2.2, -1.5, { label: 'BASSE' });
      P('keys', 1.7, -0.2, { label: 'KEYS' });
      // musiciens (pose, cheveux, peau) ; les pieds à perche se placent à côté du musicien, la perche vise la bouche
      P('drummer', 0, -1.6, { hair: 0 });
      P('guitarist', -2.0, 0.5, { hair: 0 }); P('singer', 0, 0.9, { hair: 1, skin: 1 }); P('bassist', 2.65, 0.5, { hair: 3 }); P('keyboardist', 1.7, -0.55, { hair: 2, skin: 2 });
      P('mic_boom', -1.73, 0.62, { rot: 85, label: 'MIC GTR' });
      P('mic_boom', 0.27, 1.02, { rot: 85, label: 'VOIX' });
      P('mic_boom', 2.92, 0.62, { rot: 85, label: 'MIC BASSE' });
      P('pedalboard', -2.45, 0.85); P('pedalboard', 2.15, 0.9);
      P('mic_short', -2.2, -1.125); P('mic_short', -1.35, -1.175, { h: 0.45 }); // micros d'ampli devant les amplis guitare
      P('guitar_lp', -2.8, -0.35); P('guitar_bass', 2.85, -0.45);
      P('pendrillon', -3.55, -1.2, { rot: 90 }); P('pendrillon', 3.55, -1.2, { rot: 90 });
      P('multiprise', -3.05, -1.95, { rot: 90 }); P('di_stereo', 2.5, -0.85);
      [-2, 0, 2].forEach((x, i) => P('wedge_act', x, 1.75, { label: 'RET ' + (i + 1) }));
      P('wedge_coax', 1.4, -0.9, { rot: 90, label: 'RET BATT' });
      P('pied_spk', -4.3, 0.4); P('act_12', -4.3, 0.4, { rot: 270, label: 'SIDE L' });
      P('pied_spk', 4.3, 0.4); P('act_12', 4.3, 0.4, { rot: 90, label: 'SIDE R' });
      P('la_flown', -5.4, 0.8, { label: 'LA L' }); P('la_flown', 5.4, 0.8, { label: 'LA R' });
      P('sub_act', -3.9, 3.2, { label: 'SUB L' }); P('sub_act', 3.9, 3.2, { label: 'SUB R' });
      [-2.4, -0.8, 0.8, 2.4].forEach(x => P('front_fill_act', x, 2.6));
      P('delay', -6.5, 10, { label: 'DELAY L' }); P('delay', 6.5, 10, { label: 'DELAY R' });
      P('stagebox', 2.8, -1.9, { label: 'RIO' });
      P('distri', -4.4, -1.8);
      P('rack', 4.7, -1.0, { label: 'AMPLIS' }); P('rack_hf', 5.8, -1.0, { label: 'HF' });
      P('case_road', -5.8, -1.0, { label: 'BACKLINE' }); P('case_light', -5.8, -2.4, { label: 'LUM' });
      P('truss3', -1.5, -1.9, { y: 4.2 }); P('truss3', 1.5, -1.9, { y: 4.2 });
      // projecteurs traditionnels et lyres sous la truss, orientés vers la scène
      ['pc750', 'moving', 'par64', 'light', 'moving', 'pc750'].forEach((type, i) => {
        const x = -2.5 + i, y = { moving: 3.69, pc750: 3.81, par64: 3.83, light: 3.88 }[type];
        st.aimAt(P(type, x, -1.9, { y }), x * 0.4, 1.4, 0.3);
      });
      for (let i = -2; i <= 2; i++) P('barriere', i * 2.5, 4.6);
      // régies sous tentes (ouvertes côté scène)
      P('tente_3x3', -1.6, 14.4, { rot: 180, opt: 1 }); P('tente_3x3', 1.6, 14.4, { rot: 180, opt: 1 });
      P('table_regie', -1.6, 13.8); P('console_cl3', -1.85, 13.8, { label: 'CL3' }); P('audio_if', -1.38, 14.05, { rot: 10 }); P('laptop', -0.95, 13.8, { rot: -12 }); P('tabouret', -1.6, 14.85);
      P('table_regie_s', 1.6, 13.8); P('console_q20', 1.4, 13.8, { label: 'Q20' }); P('laptop', 1.95, 13.8); P('tabouret_bas', 1.6, 14.7);
      P('listener', -2.55, 14.3, { label: 'ÉCOUTE FOH' });
      P('zone', 0, 8.6, { w: 16, d: 7, color: '#3b82c4', label: 'Zone public' });
      P('ramp5', 0.2, 6.2, { rot: 90 });
      const cur = st.S;
      cur.cables.push({ id: cur.nextId++, kind: 'multi', pts: [[2.8, -1.9], [2.8, 3.4], [0.2, 3.4], [0.2, 12.2], [-1.2, 12.2], [-1.2, 13.5]], label: 'Multipaire' });
      cur.cables.push({ id: cur.nextId++, kind: 'pwr', pts: [[-4.4, -1.8], [-4.4, 3.8], [-3.9, 3.8]], label: '' });
      cur.patch = rockPatch();
      cur.measures.push({ id: cur.nextId++, a: [0, 2.0], b: [-1.6, 12.9] });
    },
  },
  {
    id: 'conf', name: 'Conférence / table ronde', desc: 'Estrade, 4 intervenants, écran LED, façades actives, front fills, retour actif et régie.',
    build() {
      const S = st.blankState(); S.meta.name = tr('Conférence'); S.room = { w: 20, d: 24, back: 5 }; st.setState(S);
      stageDeck(3, 3, -3, -1.5);
      P('led', 0, -1.6, { y: 0.4, label: 'ÉCRAN' });
      P('table', 0, 0, { w: 4, d: 0.8, label: 'TABLE' });
      [-1.5, -0.5, 0.5, 1.5].forEach(x => { P('chair', x, 0.9, { rot: 180 }); P('mic_straight', x, 0.15, { h: 0.45, label: '' }); });
      P('laptop', -1, 0.05); P('laptop', 1, 0.05, { rot: 10 });
      P('stairs', 3.8, 0, { rot: 270 });
      P('pied_spk', -4.2, 1.2); P('act_15', -4.2, 1.2, { label: 'FAC L' }); P('pied_spk', 4.2, 1.2); P('act_15', 4.2, 1.2, { label: 'FAC R' });
      [-1.6, 1.6].forEach(x => P('front_fill', x, 2.0));
      P('wedge_act', 0, 1.6, { label: 'RET' });
      P('foh', 0, 10, { label: 'FOH' });
      for (let r = 0; r < 4; r++) for (let c = -3; c <= 3; c++) P('chair', c * 0.8, 4.5 + r * 0.9, { rot: 180 });
    },
  },
  {
    id: 'dj', name: 'DJ set / club', desc: 'Cabine DJ (2 platines + table), façades sur pieds, subs 21″, retours actifs, écran LED et lumière.',
    build() {
      const S = st.blankState(); S.meta.name = tr('DJ set'); S.room = { w: 16, d: 20, back: 4 }; st.setState(S);
      stageDeck(2, 2, -2, -1);
      P('table_regie', 0, -0.2, { w: 2.4, d: 0.8, label: '' }); P('dj_setup', 0, -0.2, { label: 'DJ' });
      P('led', 0, -1.2, { y: 0.4, w: 4, h: 2.4, label: 'LED' });
      P('wedge_act', -1.3, 0.8, { label: 'RET' }); P('wedge_act', 1.3, 0.8, { label: 'RET' });
      P('pied_spk', -4, 0.8); P('act_15', -4, 0.8, { label: 'FAC L' }); P('pied_spk', 4, 0.8); P('act_15', 4, 0.8, { label: 'FAC R' });
      P('sub_21', -3, 1.8, { label: 'SUB L' }); P('sub_21', 3, 1.8, { label: 'SUB R' });
      P('truss3', 0, -1.0, { y: 3.8 });
      [-1, 0, 1].forEach((x, i) => P(i === 1 ? 'moving' : 'light', x, -1.0, { y: i === 1 ? 3.43 : 3.63 }));
      P('totem', -3.2, -1.4); P('totem', 3.2, -1.4);
      P('fog', 2.5, -0.6);
      P('barriere', -1.25, 3.4); P('barriere', 1.25, 3.4);
    },
  },
];

export function applyTemplate(id) {
  const t = TEMPLATES.find(x => x.id === id);
  if (!t) return;
  t.build();
  st.relift();
  st.resetHistory();
  st.saveLocal();
  st.clearSel();
  st.emit('change');
}
