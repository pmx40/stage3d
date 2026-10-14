// Catalogue d'objets à l'échelle réelle (mètres). Les modèles 3D sont dans models_*.js.
// Repère local : origine au centre de la base, +Z = face avant (vers le public par défaut), +Y = haut.
import { THREE, mergeGroup, flatTextMesh } from './gfx.js';
import * as A from './models_audio.js';
import * as D from './models_desk.js';
import * as S from './models_stage.js';
import * as L from './models_light.js';
import * as B from './models_backline.js';
import * as P from './models_people.js';
import * as G from './models_gear.js';
import * as M from './models_piano.js';

export const flatText = flatTextMesh;
export const mountGeom = L.mountGeom; // géométrie d'un projecteur posé sur pied ou au sol

export const CATS = [
  { id: 'scene', name: 'Scène & structure', icon: '🟦' },
  { id: 'sono', name: 'Sonorisation', icon: '🔊' },
  { id: 'conso', name: 'Consoles & régie', icon: '🎛️' },
  { id: 'cases', name: 'Racks, cases & câbles', icon: '🧰' },
  { id: 'backline', name: 'Backline & musiciens', icon: '🎸' },
  { id: 'lumiere', name: 'Lumière & vidéo', icon: '💡' },
  { id: 'mobilier', name: 'Public & mobilier', icon: '🪑' },
  { id: 'annot', name: 'Annotations & mesure', icon: '📍' },
];

const def0 = (id, cat, name, icon, w, d, h, color, build, extra = {}) => ({ id, cat, name, icon, w, d, h, color, build, short: '', ...extra });
const SPK = '#24262b';

// petite inclinaison vers le haut pour les front fills (couvrent les premiers rangs)
const tilted = (fn, tilt = 0.17) => (g, o) => {
  const k = new THREE.Group();
  fn(k, o);
  k.rotation.x = -tilt;
  k.position.y = (o.d / 2) * tilt;
  g.add(k);
};
const consoleOn = (builder, cw, cd, ch, withLaptop) => (g, o) => {
  D.clothTable(g, o.w, o.d, 0.75);
  const c = new THREE.Group();
  builder(c, { ...o, w: cw, d: cd, h: ch });
  c.position.set(withLaptop ? -o.w * 0.12 : 0, 0.75, 0);
  g.add(c);
  if (withLaptop) {
    const l = new THREE.Group();
    D.bLaptop(l, { w: 0.33, d: 0.23, h: 0.24 });
    l.position.set(o.w * 0.34, 0.75, 0.02);
    l.rotation.y = -0.2;
    g.add(l);
  }
};

export const DEFS = [
  /* ===== Scène & structure ===== */
  def0('prat_1x1', 'scene', 'Praticable 1×1', '⬜', 1, 1, 0.4, '#5a6376', S.bPrat, { support: true, praticable: true, hchips: [0.2, 0.4, 0.6, 0.8, 1.0] }),
  def0('prat_2x1', 'scene', 'Praticable 2×1', '▭', 2, 1, 0.4, '#5a6376', S.bPrat, { support: true, praticable: true, hchips: [0.2, 0.4, 0.6, 0.8, 1.0] }),
  def0('prat_2x2', 'scene', 'Praticable 2×2', '⬛', 2, 2, 0.4, '#5a6376', S.bPrat, { support: true, praticable: true, hchips: [0.2, 0.4, 0.6, 0.8, 1.0] }),
  def0('riser_2x2', 'scene', 'Riser batterie 2×2', '🟧', 2, 2, 0.2, '#7a6a48', S.bPrat, { support: true, lifts: true, praticable: true, short: 'RISER', hchips: [0.2, 0.3, 0.4] }),
  def0('stairs', 'scene', 'Escalier de scène', '🪜', 1.2, 0.9, 0.4, '#68707f', S.bStairs, { fixed: true, y0: 0, opts: ['Avec rampes', 'Sans rampe'], hchips: [0.2, 0.4, 0.6, 0.8, 1.0] }),
  def0('garde_corps', 'scene', 'Garde-corps de scène', '🛡️', 2, 0.06, 1.0, '#b4bac4', S.bHandrail),
  def0('barriere', 'scene', 'Barrière Vauban', '🚧', 2.5, 0.45, 1.1, '#c2c8d2', S.bBarrier),
  def0('backdrop', 'scene', 'Rideau de fond plissé', '🎞️', 6, 0.1, 3, '#0d0f13', S.bBackdrop, { short: 'BACKDROP' }),
  def0('pendrillon', 'scene', 'Pendrillon noir sur pieds', '🖤', 1.5, 0.45, 3.0, '#0b0c0e', L.bPendrillon, { short: 'PEND', hchips: [2.5, 3, 3.5, 4] }),
  def0('pendrillon_susp', 'scene', 'Pendrillon noir suspendu', '⬛', 1.5, 0.15, 3.9, '#0b0c0e', L.bPendrillon, { fixed: true, y0: 0.05, short: 'PEND', hchips: [3, 3.5, 3.9, 4.5] }),
  def0('truss3', 'scene', 'Truss 3 m', '📏', 3, 0.3, 0.3, '#aeb4be', S.bTruss, { fixed: true, y0: 4.0 }),
  def0('truss2', 'scene', 'Truss 2 m', '📏', 2, 0.3, 0.3, '#aeb4be', S.bTruss, { fixed: true, y0: 4.0 }),
  def0('truss1', 'scene', 'Truss 1 m', '📏', 1, 0.3, 0.3, '#aeb4be', S.bTruss, { fixed: true, y0: 4.0 }),
  def0('tapis_danse', 'scene', 'Tapis de danse (rouleau 1,6 m)', '🩰', 4, 1.6, 0.006, '#17181b', S.bDanceMat, { support: true, lifts: true, covering: true, short: 'TAPIS', opts: ['Noir', 'Gris', 'Blanc', 'Bleu', 'Rouge', 'Vert'] }),
  def0('tapis_danse_zone', 'scene', 'Tapis de danse 6 × 4 m (zone)', '🩰', 6, 4, 0.006, '#17181b', S.bDanceMat, { support: true, lifts: true, covering: true, short: 'TAPIS', opts: ['Noir', 'Gris', 'Blanc', 'Bleu', 'Rouge', 'Vert'] }),
  def0('tower', 'scene', 'Tour truss 3 m', '🗼', 0.8, 0.8, 3.0, '#aeb4be', S.bTower, { hchips: [2, 3, 4, 5] }),

  /* ===== Sonorisation ===== */
  def0('la_flown', 'sono', 'Line array accroché', '🔊', 0.45, 0.55, 2.0, SPK, A.bLineArray, { fixed: true, y0: 3.2, short: 'LA', speaker: { angle: 90, range: 35 }, tilt: { at: 1 } }),
  def0('la_ground', 'sono', 'Line array au sol', '🔊', 0.45, 0.55, 1.8, SPK, A.bLineArray, { short: 'LA', speaker: { angle: 90, range: 35 } }),
  def0('colonne', 'sono', 'Colonne PA + sub', '📶', 0.38, 0.45, 1.9, SPK, A.bColumn, { short: 'COL', speaker: { angle: 110, range: 20 } }),
  def0('act_8', 'sono', 'Enceinte active 8"', '📻', 0.26, 0.25, 0.42, SPK, A.bActiveBox, { short: 'ACT 8', speaker: { angle: 100, range: 10 }, tilt: { at: 0.5 } }),
  def0('act_10', 'sono', 'Enceinte active 10"', '📻', 0.31, 0.29, 0.5, SPK, A.bActiveBox, { short: 'ACT 10', speaker: { angle: 100, range: 14 }, tilt: { at: 0.5 } }),
  def0('act_12', 'sono', 'Enceinte active 12"', '📻', 0.37, 0.33, 0.6, SPK, A.bActiveBox, { short: 'ACT 12', speaker: { angle: 90, range: 20 }, tilt: { at: 0.5 } }),
  def0('act_15', 'sono', 'Enceinte active 15"', '📻', 0.44, 0.4, 0.7, SPK, A.bActiveBox, { short: 'ACT 15', speaker: { angle: 90, range: 25 }, tilt: { at: 0.5 } }),
  def0('pass_12', 'sono', 'Enceinte passive 12"', '🔈', 0.37, 0.33, 0.6, SPK, A.bActiveBox, { short: 'PASS 12', props: { active: false }, speaker: { angle: 90, range: 20 }, tilt: { at: 0.5 } }),
  def0('pass_15', 'sono', 'Enceinte passive 15"', '🔈', 0.44, 0.4, 0.7, SPK, A.bActiveBox, { short: 'PASS 15', props: { active: false }, speaker: { angle: 90, range: 25 }, tilt: { at: 0.5 } }),
  def0('pied_spk', 'sono', "Pied d'enceinte tripode", '🎚️', 0.9, 0.9, 1.5, '#1b1c1f', A.bSpeakerStand, { support: true, supportScale: 0.4, hchips: [1.2, 1.5, 1.8, 2.0] }),
  def0('fac_top', 'sono', 'Façade passive sur pied', '📢', 0.45, 0.45, 2.2, SPK, A.bTopStand, { short: 'FAC', props: { active: false }, speaker: { angle: 90, range: 20 } }),
  def0('fac_act', 'sono', 'Façade active sur pied', '📢', 0.4, 0.36, 2.15, SPK, A.bTopStand, { short: 'FAC', props: { active: true }, speaker: { angle: 90, range: 22 } }),
  def0('sub', 'sono', 'Sub 18" passif', '🔈', 0.6, 0.75, 0.55, SPK, A.bSub, { short: 'SUB', speaker: { angle: 140, range: 18 } }),
  def0('sub_act', 'sono', 'Sub 18" actif', '🔈', 0.55, 0.7, 0.6, SPK, A.bSub, { short: 'SUB', props: { active: true }, speaker: { angle: 140, range: 20 } }),
  def0('sub2', 'sono', 'Sub double 18"', '🔈', 1.2, 0.75, 0.55, SPK, A.bSub, { short: 'SUB', speaker: { angle: 140, range: 18 } }),
  def0('sub_21', 'sono', 'Sub 21" actif', '🔈', 0.7, 0.9, 0.65, SPK, A.bSub, { short: 'SUB 21', props: { active: true }, speaker: { angle: 140, range: 24 } }),
  def0('front_fill', 'sono', 'Front fill compact', '📍', 0.3, 0.22, 0.22, SPK, tilted(A.bActiveBox), { short: 'FF', props: { active: false }, speaker: { angle: 110, range: 8 } }),
  def0('front_fill_act', 'sono', 'Front fill actif', '📍', 0.34, 0.25, 0.25, SPK, tilted(A.bActiveBox), { short: 'FF', props: { active: true }, speaker: { angle: 110, range: 10 } }),
  def0('wedge', 'sono', 'Retour de scène (wedge)', '🔉', 0.6, 0.4, 0.35, SPK, A.bWedge, { monitor: true, short: 'RET', rot0: 180, speaker: { angle: 55, range: 6 } }),
  def0('wedge_act', 'sono', 'Retour actif 12"', '🔉', 0.62, 0.42, 0.38, SPK, A.bWedge, { monitor: true, short: 'RET', rot0: 180, props: { active: true }, speaker: { angle: 55, range: 7 } }),
  def0('wedge_coax', 'sono', 'Retour coaxial 15"', '🔉', 0.66, 0.46, 0.4, SPK, A.bWedge, { monitor: true, short: 'RET', rot0: 180, props: { active: true, grille: 'sub' }, speaker: { angle: 60, range: 8 } }),
  def0('sidefill', 'sono', 'Side-fill sur pied', '🔉', 0.5, 0.5, 1.6, SPK, A.bTopStand, { monitor: true, short: 'SIDE', props: { active: false }, speaker: { angle: 80, range: 8 } }),
  def0('delay', 'sono', 'Tour de delay', '📡', 0.5, 0.5, 3.0, SPK, A.bTopStand, { short: 'DELAY', props: { active: false }, speaker: { angle: 90, range: 25, delay: true } }),

  /* ===== Consoles & régie ===== */
  def0('console_cl3', 'conso', 'Yamaha CL3', '🎛️', 0.839, 0.667, 0.299, '#202226', D.bCL3, { short: 'CL3' }),
  def0('console_x32', 'conso', 'Behringer X32', '🎚️', 0.9, 0.528, 0.2, '#25272c', D.bX32, { short: 'X32' }),
  def0('console_q20', 'conso', 'ChamSys QuickQ 20 (lumière)', '🕹️', 0.565, 0.35, 0.106, '#17181b', D.bQ20, { short: 'Q20' }),
  def0('stagebox', 'conso', 'Stagebox Yamaha Rio3224-D2', '🔌', 0.48, 0.368, 0.22, '#2a2d33', D.bRio, { short: 'RIO' }),
  def0('audio_if', 'conso', 'Carte son USB 2 entrées', '🔈', 0.19, 0.15, 0.07, '#a8242b', B.bAudioIf, { short: 'CARTE SON' }),
  def0('audio_if8', 'conso', 'Carte son rack 8 entrées (1U)', '🔈', 0.483, 0.2, 0.0445, '#2a2c31', B.bAudioIf, { short: 'CARTE SON' }),
  def0('foh', 'conso', 'Régie façade (table + CL3 + PC)', '🎛️', 1.8, 0.8, 1.05, '#202226', consoleOn(D.bCL3, 0.839, 0.667, 0.299, true), { short: 'FOH' }),
  def0('mon', 'conso', 'Régie retours (table + X32)', '🎚️', 1.8, 0.8, 0.95, '#25272c', consoleOn(D.bX32, 0.9, 0.528, 0.2, true), { short: 'MON' }),
  def0('reg_lum', 'conso', 'Régie lumière (table + Q20 + PC)', '🕹️', 1.8, 0.8, 0.86, '#17181b', consoleOn(D.bQ20, 0.565, 0.35, 0.106, true), { short: 'LUM' }),
  def0('table_regie', 'conso', 'Table de régie jupée 1,8 m', '🟫', 1.8, 0.8, 0.75, '#16171a', D.bTableRegie, { support: true, lifts: true }),
  def0('table_regie_s', 'conso', 'Table de régie jupée 1,2 m', '🟫', 1.2, 0.6, 0.75, '#16171a', D.bTableRegie, { support: true, lifts: true }),
  def0('laptop', 'conso', 'Ordinateur portable', '💻', 0.33, 0.23, 0.24, '#8b929e', D.bLaptop),
  def0('tabouret', 'conso', 'Tabouret haut de régie', '🪑', 0.38, 0.38, 0.75, '#c9ced6', D.bStool),
  def0('tabouret_bas', 'conso', 'Tabouret bas', '🪑', 0.36, 0.36, 0.46, '#c9ced6', D.bStool),
  def0('tente_3x3', 'conso', 'Tente de régie 3×3', '⛺', 3, 3, 3.4, '#14161a', D.bTent, { passive: true, opts: ['Ouverte', '3 parois', 'Fermée'], short: 'TENTE' }),
  def0('tente_3x6', 'conso', 'Tente de régie 3×6', '⛺', 3, 6, 3.4, '#14161a', D.bTent, { passive: true, opts: ['Ouverte', '3 parois', 'Fermée'], short: 'TENTE' }),
  def0('tente_6x6', 'conso', 'Tente de régie 6×6', '⛺', 6, 6, 3.6, '#14161a', D.bTent, { passive: true, opts: ['Ouverte', '3 parois', 'Fermée'], short: 'TENTE' }),
  def0('console', 'conso', 'Console numérique (générique)', '🎛️', 0.9, 0.528, 0.2, '#25272c', D.bX32, { hidden: true, short: 'CONSOLE' }),

  /* ===== Racks, cases & câbles ===== */
  def0('rack', 'cases', 'Rack amplis 16U sur roulettes', '🗄️', 0.6, 0.9, 1.05, '#1d1e22', D.bRackCase, { stencil: true, support: true, lifts: true, short: 'RACK' }),
  def0('rack_hf', 'cases', 'Rack HF micros sans fil', '📡', 0.56, 0.75, 0.75, '#1d1e22', D.bRackCase, { stencil: true, support: true, lifts: true, short: 'HF' }),
  def0('rack_fx', 'cases', 'Rack FX / outboard', '🗄️', 0.56, 0.75, 0.75, '#1d1e22', D.bRackCase, { stencil: true, support: true, lifts: true, short: 'FX' }),
  def0('case_road', 'cases', 'Flight-case malle 1,2 m', '🧳', 1.2, 0.6, 0.6, '#1d1e22', D.bFlight, { stencil: true, support: true, lifts: true, props: { wheels: true }, short: 'CASE' }),
  def0('case_road_s', 'cases', 'Flight-case malle 0,8 m', '🧳', 0.8, 0.5, 0.5, '#1d1e22', D.bFlight, { stencil: true, support: true, lifts: true, short: 'CASE' }),
  def0('case_light', 'cases', 'Flight-case projecteurs', '🧳', 0.9, 0.6, 0.7, '#1d1e22', D.bFlight, { stencil: true, support: true, lifts: true, props: { wheels: true }, short: 'LUM' }),
  def0('distri', 'cases', 'Distribution électrique 63A', '⚡', 0.5, 0.26, 0.62, '#4a4e57', D.bDistri, { short: 'DISTRI' }),
  def0('enrouleur', 'cases', 'Enrouleur de câble', '🌀', 0.45, 0.3, 0.45, '#26282c', D.bReel),
  def0('snake_reel', 'cases', 'Enrouleur multipaire', '🌀', 0.6, 0.4, 0.62, '#26282c', D.bSnakeReel, { short: 'SNAKE' }),
  def0('di_box', 'cases', 'DI passive', '🟥', 0.13, 0.1, 0.05, '#c5303a', B.bDI, { short: 'DI' }),
  def0('di_active', 'cases', 'DI active', '⬛', 0.1, 0.12, 0.05, '#2a2c31', B.bDI, { short: 'DI' }),
  def0('di_stereo', 'cases', 'DI stéréo 2 voies', '🟦', 0.2, 0.12, 0.055, '#2f6fb0', B.bDI, { short: 'DI ST' }),
  def0('multiprise', 'cases', 'Multiprise 6 prises', '🔌', 0.55, 0.065, 0.04, '#1e2025', B.bPowerStrip, { props: { sockets: 6 }, short: 'MP' }),
  def0('multiprise_4', 'cases', 'Multiprise 4 prises', '🔌', 0.42, 0.065, 0.04, '#1e2025', B.bPowerStrip, { props: { sockets: 4 }, short: 'MP' }),
  def0('ramp5', 'cases', 'Passage de câbles 5 canaux', '🟨', 0.914, 0.502, 0.047, '#f2c200', D.bRamp),
  def0('ramp2', 'cases', 'Passage de câbles 2 canaux', '🟨', 0.9, 0.27, 0.04, '#f2c200', D.bRamp),

  /* ===== Backline & musiciens ===== */
  def0('drums', 'backline', 'Batterie', '🥁', 1.6, 1.4, 1.2, '#9b1b24', G.bDrums, { scaled: true, short: 'BATTERIE' }),
  def0('trone', 'backline', 'Trône de batteur', '🪑', 0.36, 0.36, 0.52, '#c9ced6', D.bThroneDrum),
  def0('amp_gtr', 'backline', 'Ampli guitare (combo)', '🎸', 0.65, 0.3, 0.55, '#17181b', G.bAmpGtr, { short: 'GTR' }),
  def0('stack_gtr', 'backline', 'Stack guitare (tête + 4×12)', '🎸', 0.75, 0.4, 1.1, '#17181b', G.bStackGtr, { short: 'GTR' }),
  def0('amp_bass', 'backline', 'Ampli basse (tête + baffle)', '🎸', 0.6, 0.5, 1.1, '#202226', G.bAmpBass, { short: 'BASSE' }),
  def0('guitar_el', 'backline', 'Guitare électrique sur pied', '🎸', 0.56, 0.56, 1.15, '#c4361d', B.bGuitarStand, { short: 'GTR', props: { inst: 0 }, selects: [{ key: 'inst', label: 'Instrument', values: ['Électrique (type Strat)', 'Électrique (type LP)', 'Basse électrique', 'Guitare acoustique', 'Pied seul'] }] }),
  def0('guitar_lp', 'backline', 'Guitare type LP sur pied', '🎸', 0.56, 0.56, 1.13, '#d98a2b', B.bGuitarStand, { short: 'GTR', props: { inst: 1 }, selects: [{ key: 'inst', label: 'Instrument', values: ['Électrique (type Strat)', 'Électrique (type LP)', 'Basse électrique', 'Guitare acoustique', 'Pied seul'] }] }),
  def0('guitar_bass', 'backline', 'Basse électrique sur pied', '🎸', 0.56, 0.56, 1.4, '#2a5fa8', B.bGuitarStand, { short: 'BASSE', props: { inst: 2 }, selects: [{ key: 'inst', label: 'Instrument', values: ['Électrique (type Strat)', 'Électrique (type LP)', 'Basse électrique', 'Guitare acoustique', 'Pied seul'] }] }),
  def0('guitar_ac', 'backline', 'Guitare acoustique sur pied', '🎸', 0.56, 0.56, 1.25, '#d9b46e', B.bGuitarStand, { short: 'ACOU', props: { inst: 3 }, selects: [{ key: 'inst', label: 'Instrument', values: ['Électrique (type Strat)', 'Électrique (type LP)', 'Basse électrique', 'Guitare acoustique', 'Pied seul'] }] }),
  def0('guitar_stand', 'backline', 'Pied de guitare (seul)', '🎸', 0.56, 0.56, 0.75, '#1b1c1f', B.bGuitarStand, { props: { inst: 4 }, selects: [{ key: 'inst', label: 'Instrument', values: ['Électrique (type Strat)', 'Électrique (type LP)', 'Basse électrique', 'Guitare acoustique', 'Pied seul'] }] }),
  def0('pedalboard', 'backline', 'Pédalboard guitare', '🎛️', 0.62, 0.34, 0.14, '#1f2126', B.bPedalboard, { short: 'PEDALS' }),
  def0('midi25', 'backline', 'Clavier MIDI 25 touches', '🎹', 0.52, 0.19, 0.06, '#1b1d22', B.bMidiKb, { short: 'MIDI', props: { keys: 25 } }),
  def0('midi49', 'backline', 'Clavier MIDI 49 touches', '🎹', 0.84, 0.27, 0.07, '#1b1d22', B.bMidiKb, { short: 'MIDI', props: { keys: 49 } }),
  def0('keys', 'backline', 'Clavier 88 touches sur stand', '🎹', 1.3, 0.45, 0.95, '#1b1d22', G.bKeys, { scaled: true, short: 'KEYS' }),
  def0('piano_queue', 'backline', 'Piano à queue (demi-queue 2 m)', '🎹', 1.52, 2.0, 1.0, '#0d0e11', M.bGrandPiano, { short: 'PIANO', props: { lid: 0 }, selects: [{ key: 'lid', label: 'Couvercle', values: ['Ouvert (grande ouverture)', 'Ouvert (petit bâton)', 'Fermé'] }] }),
  def0('piano_quart', 'backline', 'Piano quart de queue (1,65 m)', '🎹', 1.48, 1.65, 1.0, '#0d0e11', M.bGrandPiano, { short: 'PIANO', props: { lid: 0 }, selects: [{ key: 'lid', label: 'Couvercle', values: ['Ouvert (grande ouverture)', 'Ouvert (petit bâton)', 'Fermé'] }] }),
  def0('piano_concert', 'backline', 'Piano de concert (queue 2,75 m)', '🎹', 1.6, 2.75, 1.0, '#0d0e11', M.bGrandPiano, { short: 'PIANO', props: { lid: 0 }, selects: [{ key: 'lid', label: 'Couvercle', values: ['Ouvert (grande ouverture)', 'Ouvert (petit bâton)', 'Fermé'] }] }),
  def0('piano_banquette', 'backline', 'Banquette de piano', '🪑', 0.55, 0.33, 0.5, '#17181b', M.bPianoBench, { short: 'BANQ.', opts: ['Pieds droits (rembourrée)', 'Réglable à vis'], hchips: [0.45, 0.5, 0.55] }),
  def0('dj_setup', 'backline', 'Set DJ (2 platines + table)', '💿', 1.1, 0.46, 0.1, '#25272c', S.bDJ, { short: 'DJ' }),
  def0('mic_boom', 'backline', 'Pied micro perche', '🎤', 0.6, 0.6, 1.7, '#2b2e35', B.bMicBoom, { short: 'MIC', props: { mic: 0, base: 0 }, selects: [{ key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }] }),
  def0('mic_straight', 'backline', 'Pied micro droit', '🎤', 0.5, 0.5, 1.6, '#2b2e35', B.bMicStraight, { short: 'MIC', props: { mic: 0, base: 0 }, selects: [{ key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }] }),
  def0('mic_cond_boom', 'backline', 'Micro statique sur pied perche', '🎙️', 0.6, 0.6, 1.7, '#2b2e35', B.bMicBoom, { short: 'MIC', props: { mic: 2, base: 0 }, selects: [{ key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }] }),
  def0('mic_cond_straight', 'backline', 'Micro statique sur pied droit', '🎙️', 0.5, 0.5, 1.6, '#2b2e35', B.bMicStraight, { short: 'MIC', props: { mic: 2, base: 0 }, selects: [{ key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }] }),
  def0('mic_oh', 'backline', 'Overhead statique sur grand pied perche', '🎙️', 0.7, 0.9, 2.4, '#2b2e35', B.bMicBoom, { short: 'OH', props: { mic: 3, base: 0 }, selects: [{ key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }], hchips: [1.8, 2.1, 2.4, 2.7, 3] }),
  def0('mic_pair', 'backline', 'Paire de micros statiques sur barre stéréo', '🎙️', 0.7, 0.45, 1.8, '#2b2e35', B.bMicPair, { short: 'PAIRE', props: { mic: 3, base: 0, layout: 0 }, selects: [{ key: 'layout', label: 'Couple stéréo', values: ['AB (espacés)', 'XY (croisés)', 'ORTF (110°)'] }, { key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }], hchips: [1.5, 1.8, 2.2, 2.6, 3] }),
  def0('mic_short', 'backline', 'Petit pied perchette + micro (ampli)', '🎙️', 0.4, 0.55, 0.32, '#2b2e35', B.bMicShort, { short: 'MIC', rot0: 180, props: { mic: 1, base: 0 }, selects: [{ key: 'mic', label: 'Micro', values: B.MIC_NAMES }, { key: 'base', label: 'Embase', values: ['Tripode', 'Embase ronde (fonte)'] }], hchips: [0.2, 0.32, 0.45, 0.6, 0.8] }),
  def0('person', 'backline', 'Musicien / personne', '🧍', 0.5, 0.3, 1.75, '#5b7fa8', P.bPerson, { props: { pose: 0, hair: 0, skin: 0 }, selects: [{ key: 'pose', label: 'Pose', values: P.POSE_NAMES }, { key: 'hair', label: 'Cheveux', values: P.HAIR_NAMES }, { key: 'skin', label: 'Peau', values: P.SKIN_NAMES }] }),
  def0('singer', 'backline', 'Chanteur / chanteuse', '🎤', 0.6, 0.4, 1.72, '#b0463c', P.bPerson, { short: 'CHANT', props: { pose: 1, hair: 1, skin: 0 }, selects: [{ key: 'pose', label: 'Pose', values: P.POSE_NAMES }, { key: 'hair', label: 'Cheveux', values: P.HAIR_NAMES }, { key: 'skin', label: 'Peau', values: P.SKIN_NAMES }] }),
  def0('guitarist', 'backline', 'Guitariste', '🎸', 0.9, 0.45, 1.78, '#3d6b4f', P.bPerson, { short: 'GTR', props: { pose: 2, hair: 2, skin: 0 }, selects: [{ key: 'pose', label: 'Pose', values: P.POSE_NAMES }, { key: 'hair', label: 'Cheveux', values: P.HAIR_NAMES }, { key: 'skin', label: 'Peau', values: P.SKIN_NAMES }] }),
  def0('bassist', 'backline', 'Bassiste', '🎸', 1, 0.45, 1.8, '#7a5ca8', P.bPerson, { short: 'BASSE', props: { pose: 3, hair: 3, skin: 0 }, selects: [{ key: 'pose', label: 'Pose', values: P.POSE_NAMES }, { key: 'hair', label: 'Cheveux', values: P.HAIR_NAMES }, { key: 'skin', label: 'Peau', values: P.SKIN_NAMES }] }),
  def0('drummer', 'backline', 'Batteur (assis)', '🥁', 0.6, 0.85, 1.35, '#c28a2e', P.bPerson, { short: 'BATT', props: { pose: 4, hair: 0, skin: 0 }, selects: [{ key: 'pose', label: 'Pose', values: P.POSE_NAMES }, { key: 'hair', label: 'Cheveux', values: P.HAIR_NAMES }, { key: 'skin', label: 'Peau', values: P.SKIN_NAMES }] }),
  def0('keyboardist', 'backline', 'Claviériste', '🎹', 0.6, 0.6, 1.75, '#2f7f8f', P.bPerson, { short: 'KEYS', props: { pose: 5, hair: 1, skin: 0 }, selects: [{ key: 'pose', label: 'Pose', values: P.POSE_NAMES }, { key: 'hair', label: 'Cheveux', values: P.HAIR_NAMES }, { key: 'skin', label: 'Peau', values: P.SKIN_NAMES }] }),

  /* ===== Lumière & vidéo ===== */
  def0('light', 'lumiere', 'Projecteur PAR LED', '💡', 0.22, 0.3, 0.36, '#ffd9a0', L.bPar, { mount: true, dmx: { modes: [['RGBW 6 canaux', 6], ['RGB 3 canaux', 3], ['RGBW 10 canaux', 10]] }, fixed: true, hang: true, y0: 3.69, props: { tilt: 30 }, tilt: { at: 0.45, own: true }, beam: { angle: 40, front: 0.15, soft: 0.4 } }),
  def0('pc750', 'lumiere', 'PC 750 W (traditionnel)', '🔆', 0.27, 0.46, 0.44, '#fff2d0', L.bPc750, { mount: true, dmx: { modes: [['Gradateur 1 canal', 1]] }, fixed: true, hang: true, y0: 3.61, short: 'PC', props: { tilt: 30 }, opts: ['Avec volets 4 faces', 'Sans volets'], tilt: { at: 0.45, own: true }, beam: { angle: 35, front: 0.15, soft: 0.55 } }),
  def0('par64', 'lumiere', 'PAR 64 CP62 (traditionnel)', '🔆', 0.3, 0.36, 0.42, '#ffe6b0', L.bPar64, { mount: true, dmx: { modes: [['Gradateur 1 canal', 1]] }, fixed: true, hang: true, y0: 3.63, short: 'PAR64', props: { tilt: 30 }, tilt: { at: 0.45, own: true }, beam: { angle: 18, front: 0.08, soft: 0.35 } }),
  def0('decoupe', 'lumiere', 'Découpe 1 kW (traditionnel)', '🔆', 0.26, 0.66, 0.44, '#fff2d0', L.bProfile, { mount: true, dmx: { modes: [['Gradateur 1 canal', 1]] }, fixed: true, hang: true, y0: 3.61, short: 'DEC', props: { tilt: 30 }, tilt: { at: 0.45, own: true }, beam: { angle: 28, front: 0.31, soft: 0.1 } }),
  def0('pc_led', 'lumiere', 'PC LED (Fresnel LED)', '🔆', 0.26, 0.42, 0.44, '#fff2d0', L.bPcLed, { mount: true, dmx: { modes: [['Blanc variable 3 canaux', 3], ['RGBW 6 canaux', 6]] }, fixed: true, hang: true, y0: 3.61, short: 'PC LED', props: { tilt: 30 }, opts: ['Avec volets 4 faces', 'Sans volets'], tilt: { at: 0.45, own: true }, beam: { angle: 45, front: 0.14, soft: 0.5 } }),
  def0('moving', 'lumiere', 'Lyre asservie', '💫', 0.33, 0.3, 0.5, '#9fe0ff', L.bMovingHead, { mount: true, dmx: { modes: [['Standard 16 canaux', 16], ['Étendu 24 canaux', 24], ['Basique 8 canaux', 8]] }, fixed: true, hang: true, y0: 3.49, props: { tilt: 30 }, tilt: { at: 0.42, own: true }, beam: { angle: 12, front: 0.16, soft: 0.15 } }),
  def0('led_bar', 'lumiere', 'Barre LED 1 m', '▬', 1.0, 0.1, 0.1, '#7fe0ff', L.bLedBar, { dmx: { modes: [['RGB 3 canaux', 3], ['RGBW 4 canaux', 4], ['Pixels 24 canaux', 24]] }, opts: ['Horizontale', 'Verticale'], swapWH: true, tilt: { at: 0.5, own: true }, beam: { angle: 60, front: 0.05, soft: 0.5 } }),
  def0('garland', 'lumiere', 'Guirlande lumineuse (guinguette)', '🎉', 5, 0.12, 0.45, '#ffcf7a', L.bGarland, { fixed: true, y0: 3.2, short: 'GUIRL.', opts: ['Blanc chaud', 'Multicolore', 'Couleur au choix', 'Blanc froid'] }),
  def0('pied_lum', 'lumiere', 'Pied de lumière (trépied télescopique)', '🔦', 0.9, 0.9, 3.0, '#9aa0aa', L.bLightStand, { props: { cfg: 0, tilt: 20 }, tilt: { at: 0.9, own: true }, hchips: [1.5, 2, 2.5, 3, 3.5, 4], selects: [{ key: 'cfg', label: 'Équipement', values: ['Pied seul (tourillon 28 mm)', 'Avec barre T-bar (sans projecteur)', 'Avec T-bar + 2 PAR LED', 'Avec T-bar + 4 PAR LED'] }] }),
  def0('dmx_split8', 'lumiere', 'Splitter DMX 1→8 (rack 1U)', '🔀', 0.483, 0.2, 0.0445, '#2a2c31', L.bDmxSplit, { short: 'DMX', props: { outs: 8 } }),
  def0('dmx_split4', 'lumiere', 'Splitter DMX 1→4 (boîtier)', '🔀', 0.27, 0.13, 0.05, '#2a2c31', L.bDmxSplit, { short: 'DMX', props: { outs: 4 } }),
  def0('fog', 'lumiere', 'Machine à fumée', '🌫️', 0.45, 0.22, 0.25, '#1d1f24', S.bFog),
  def0('totem', 'lumiere', 'Pied lumière T-bar + 2 PAR', '🔦', 0.6, 0.6, 3.0, '#9aa0aa', L.bTotem, { dmx: { modes: [['2 × PAR LED RGBW (12 canaux)', 12], ['2 × PAR LED RGB (6 canaux)', 6]] }, props: { tilt: 20 }, tilt: { at: 0.94, own: true } }),
  def0('led', 'lumiere', 'Écran LED 3×2', '📺', 3, 0.15, 2, '#0e1014', S.bLED, { short: 'LED', tilt: { at: 1 } }),

  /* ===== Public & mobilier ===== */
  def0('table', 'mobilier', 'Table pliante 1,8 m', '🟫', 1.8, 0.75, 0.75, '#17181b', S.bTable, { support: true, lifts: true }),
  def0('table_round', 'mobilier', 'Table ronde Ø1,8', '⭕', 1.8, 1.8, 0.75, '#17181b', S.bTableRound, { support: true, lifts: true, round: true }),
  def0('chair', 'mobilier', 'Chaise', '🪑', 0.45, 0.45, 0.9, '#3f4450', S.bChair),

  /* ===== Annotations ===== */
  def0('zone', 'annot', 'Zone au sol', '▧', 4, 3, 0.02, '#e0a030', S.bZone, { fixed: true, y0: 0, passive: true }),
  def0('text', 'annot', 'Texte au sol', '🔤', 2, 0.5, 0.02, '#0b3a5c', S.bText, { fixed: true, y0: 0 }),
  def0('listener', 'annot', "Point d'écoute", '👂', 0.5, 0.5, 1.7, '#6fe7ff', S.bListener, { short: 'ÉCOUTE', listener: true }),
];

/* ===== Groupes (calques) : chaque objet appartient à un groupe, celui de son type par défaut ; l'utilisateur peut en créer d'autres ===== */
export const GROUPS = [
  { id: 'scene', name: 'Scène & structure', icon: '🟦' },
  { id: 'sono', name: 'Sonorisation', icon: '🔊' },
  { id: 'conso', name: 'Consoles & régie', icon: '🎛️' },
  { id: 'cases', name: 'Racks, cases & câbles', icon: '🧰' },
  { id: 'backline', name: 'Backline', icon: '🎸' },
  { id: 'micros', name: 'Micros et pieds', icon: '🎤' },
  { id: 'musiciens', name: 'Musiciens', icon: '🧍' },
  { id: 'lumiere', name: 'Lumière & vidéo', icon: '💡' },
  { id: 'mobilier', name: 'Public & mobilier', icon: '🪑' },
  { id: 'annot', name: 'Annotations & mesure', icon: '📍' },
];
// calques sans objet : on peut aussi masquer les câbles et les mesures
export const PSEUDO_GROUPS = [
  { id: 'cables', name: 'Câbles', icon: '〰' },
  { id: 'mesures', name: 'Mesures et cotes', icon: '📏' },
];
const PEOPLE = new Set(['person', 'singer', 'guitarist', 'bassist', 'drummer', 'keyboardist']);
const MICS = new Set(['mic_boom', 'mic_straight', 'mic_short', 'mic_cond_boom', 'mic_cond_straight', 'mic_oh', 'mic_pair']);
DEFS.forEach(d => { d.group = PEOPLE.has(d.id) ? 'musiciens' : MICS.has(d.id) ? 'micros' : d.cat; });
// projecteurs dont on peut afficher le faisceau (filtre par type de lumière)
export const BEAM_DEFS = DEFS.filter(d => d.beam && !d.hidden);

const byId = new Map(DEFS.map(d => [d.id, d]));
export const def = id => byId.get(id) || DEFS[0];

export const CABLE_KINDS = {
  xlr: { name: 'XLR / ligne', color: '#1f8fe8' },
  spk: { name: 'Speakon (HP)', color: '#ff6a2b' },
  pwr: { name: 'Secteur 230 V', color: '#f2b800' },
  net: { name: 'Réseau (RJ45 / AES50)', color: '#2fbf5a' },
  multi: { name: 'Multipaire', color: '#a64be0' },
};
export const STD_LENGTHS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

// inclinaison d'un objet entier autour d'un axe horizontal à la hauteur d.tilt.at × h (positif = face vers le sol)
function applyTilt(g, d, o) {
  if (!d.tilt || d.tilt.own || !o.tilt) return g;
  const py = d.tilt.at * o.h, p = new THREE.Group();
  [...g.children].forEach(c => { c.position.y -= py; p.add(c); });
  p.position.y = py;
  p.rotation.x = (o.tilt * Math.PI) / 180;
  g.add(p);
  return g;
}
export function buildObjectMesh(o) {
  const d = def(o.type);
  const g = new THREE.Group();
  if (d.scaled) {
    const inner = new THREE.Group();
    d.build(inner, { ...o, w: d.w, d: d.d, h: d.h });
    mergeGroup(inner);
    inner.scale.set(o.w / d.w, o.h / d.h, o.d / d.d);
    g.add(inner);
  } else {
    d.build(g, o);
    mergeGroup(g);
    applyTilt(g, d, o);
  }
  return g;
}

/* ===== canaux DMX d'un projecteur : modes de fonctionnement [libellé, nombre de canaux] ===== */
export function dmxInfo(o) {
  const d = def(o.type);
  if (o.type === 'pied_lum') {
    const n = [0, 0, 2, 4][o.cfg | 0];
    return n ? { modes: [['{n} × PAR LED RGBW', 6 * n, { n }], ['{n} × PAR LED RGB', 3 * n, { n }]] } : null;
  }
  return d.dmx || null;
}
export const DMX_DEFS = DEFS.filter(d => d.dmx && !d.hidden);
