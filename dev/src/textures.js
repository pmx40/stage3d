// Textures dessinées en code : faces avant / surfaces de commande des appareils.
// Toutes les coordonnées de dessin sont en millimètres réels (échelle s px/mm) pour rester fidèles aux dimensions.
import { canvasTex, rr, T, shade } from './gfx.js';

const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const PAL = ['#d84a3a', '#e8a62a', '#2fa3d8', '#43b86a', '#9a5ed8', '#e86aa8', '#d7dbe2'];

/* ---------- éléments communs ---------- */
function knob(c, cx, cy, r, ring, ang = -0.6) {
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(cx + r * 0.12, cy + r * 0.18, r * 1.05, 0, 7); c.fill();
  const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#9a9fa8'); g.addColorStop(0.55, '#3d4047'); g.addColorStop(1, '#1b1d21');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  c.fillStyle = '#1a1b1f'; c.beginPath(); c.arc(cx, cy, r * 0.6, 0, 7); c.fill();
  if (ring) { c.strokeStyle = ring; c.lineWidth = Math.max(1.2, r * 0.2); c.beginPath(); c.arc(cx, cy, r * 1.22, 0, 7); c.stroke(); }
  c.strokeStyle = '#eef1f5'; c.lineWidth = Math.max(1.2, r * 0.15); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + Math.cos(ang) * r * 0.15, cy + Math.sin(ang) * r * 0.15); c.lineTo(cx + Math.cos(ang) * r * 0.9, cy + Math.sin(ang) * r * 0.9); c.stroke();
}
function btn(c, x, y, w, h, col, lit) {
  rr(c, x, y, w, h, Math.min(w, h) * 0.28);
  const g = c.createLinearGradient(0, y, 0, y + h);
  if (lit) { g.addColorStop(0, shade(col, 1.3)); g.addColorStop(1, col); } else { g.addColorStop(0, '#50545d'); g.addColorStop(1, '#2c2f36'); }
  c.fillStyle = g;
  if (lit) { c.shadowColor = col; c.shadowBlur = 7; }
  c.fill(); c.shadowBlur = 0;
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.stroke();
}
function fader(c, x, y, len, pos, s, capCol = '#dfe2e8', capW = 9, capH = 17) {
  // rainure
  rr(c, x - 1.6 * s, y - s, 3.2 * s, len + 2 * s, 1.5 * s); c.fillStyle = '#08090b'; c.fill();
  c.fillStyle = '#3a3e47'; c.fillRect(x - 0.35 * s, y, 0.7 * s, len);
  // graduations
  c.fillStyle = 'rgba(255,255,255,.4)';
  for (let i = 0; i <= 10; i++) c.fillRect(x - 5.2 * s, y + (len * i) / 10, (i % 5 ? 1.6 : 2.6) * s, Math.max(1, 0.4 * s));
  // capuchon
  const cy = y + (1 - pos) * len - (capH * s) / 2, cw = capW * s, ch = capH * s;
  c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, x - cw / 2 + 1.5, cy + 3, cw, ch, 2.5 * s); c.fill();
  const g = c.createLinearGradient(0, cy, 0, cy + ch);
  g.addColorStop(0, shade(capCol, 1.08)); g.addColorStop(0.5, capCol); g.addColorStop(1, shade(capCol, 0.7));
  c.fillStyle = g; rr(c, x - cw / 2, cy, cw, ch, 2.5 * s); c.fill();
  c.fillStyle = 'rgba(20,22,26,.85)'; c.fillRect(x - cw / 2 + 1, cy + ch / 2 - 0.5 * s, cw - 2, Math.max(1.5, 0.9 * s));
}
function meter(c, x, y, h, s, lit, seg = 12) {
  const sh = h / seg;
  for (let i = 0; i < seg; i++) {
    const on = i >= seg - lit, col = i < 2 ? '#ff4b3a' : i < 4 ? '#ffd23a' : '#46e06a';
    c.fillStyle = on ? col : '#1a1c20';
    c.fillRect(x, y + i * sh, 2.4 * s, sh * 0.75);
  }
}
function panel(c, x, y, w, h, label, s) {
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1.5; rr(c, x * s, y * s, w * s, h * s, 4 * s); c.stroke();
  if (label) T(c, label, (x + 3) * s, (y + 4.5) * s, 7.5 * s, 'rgba(255,255,255,.62)', 'left', '700');
}
function logoPlate(c, text, x, y, size, col = '#e9ecf1', sub = '') {
  T(c, text, x, y, size, col, 'right', '800');
  if (sub) T(c, sub, x, y + size * 0.85, size * 0.34, 'rgba(255,255,255,.55)', 'right', '600');
}
function screen(c, x, y, w, h, s, kind = 'mix') {
  // cadre
  c.fillStyle = '#07080a'; rr(c, x * s, y * s, w * s, h * s, 4 * s); c.fill();
  const sx = (x + 5) * s, sy = (y + 5) * s, sw = (w - 10) * s, shh = (h - 10) * s;
  const g = c.createLinearGradient(0, sy, 0, sy + shh);
  g.addColorStop(0, '#16355c'); g.addColorStop(1, '#0a1a2e');
  c.fillStyle = g; c.fillRect(sx, sy, sw, shh);
  // barre de titre
  c.fillStyle = '#245a96'; c.fillRect(sx, sy, sw, shh * 0.09);
  T(c, kind === 'q' ? 'QuickQ  ·  Playbacks' : 'OVERVIEW', sx + 8, sy + shh * 0.045, Math.max(9, shh * 0.065), '#dff1ff', 'left', '700');
  const R = rng(11);
  if (kind === 'q') {
    // grille de cases de projecteurs
    const cols = 6, rows = 3, cw = (sw - 16) / cols, ch = (shh * 0.7) / rows;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const col = PAL[(r * cols + q) % PAL.length];
      const px = sx + 8 + q * cw, py = sy + shh * 0.13 + r * ch;
      c.fillStyle = shade(col, 0.55); rr(c, px, py, cw - 5, ch - 5, 5); c.fill();
      c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
      T(c, ['Wash', 'Spot', 'PAR', 'Beam', 'Strobe', 'LED'][q] + ' ' + (r + 1), px + 6, py + 12, Math.max(8, ch * 0.16), '#fff', 'left', '700');
    }
    c.fillStyle = '#0d2543'; c.fillRect(sx, sy + shh * 0.9, sw, shh * 0.1);
  } else {
    // bandes de voies + courbe
    const n = 24, bw = (sw - 14) / n;
    for (let i = 0; i < n; i++) {
      const col = PAL[Math.floor(R() * PAL.length)], lh = shh * (0.25 + R() * 0.45);
      c.fillStyle = shade(col, 0.5); c.fillRect(sx + 7 + i * bw + 1, sy + shh * 0.14, bw - 2, shh * 0.07);
      c.fillStyle = '#2b8bd9'; c.fillRect(sx + 7 + i * bw + 2, sy + shh * 0.93 - lh, bw - 4, lh);
      c.fillStyle = '#9fe08a'; c.fillRect(sx + 7 + i * bw + 2, sy + shh * 0.93 - lh * 0.55, bw - 4, lh * 0.55);
    }
    c.strokeStyle = '#ffd23a'; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i <= 40; i++) { const px = sx + 7 + (i / 40) * (sw - 14), py = sy + shh * 0.42 + Math.sin(i * 0.4) * shh * 0.1 - Math.exp(-((i - 24) ** 2) / 30) * shh * 0.12; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.stroke();
  }
  // reflet de verre
  const gl = c.createLinearGradient(sx, sy, sx + sw, sy + shh);
  gl.addColorStop(0, 'rgba(255,255,255,.16)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(sx, sy, sw, shh);
}

/* ---------- Yamaha CL3 : 839 × 696 mm (surface inclinée), 2 px/mm ---------- */
export function cl3Tex() {
  return canvasTex('cl3', 1678, 1392, (c, W, H) => {
    const s = 2, R = rng(5);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#383c44'); bg.addColorStop(0.36, '#2e3138'); bg.addColorStop(1, '#24272d');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.025)'; for (let i = 0; i < 700; i++) c.fillRect(R() * W, R() * H, 2, 1);
    // --- zone arrière : Selected Channel, touches utilisateur, écran, section maître
    panel(c, 12, 10, 240, 244, 'SELECTED CHANNEL', s);
    const rowCol = ['#f2c14e', '#5ab0ef', '#e86a5a', '#6fd08a', '#b58cf0', '#f09a4e'];
    for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) knob(c, (30 + q * 36) * s, (36 + r * 36) * s, 7.2 * s, r === 0 ? '#f2c14e' : r > 0 && q % 2 === 0 ? rowCol[r] : null, -2 + R() * 3.4);
    panel(c, 258, 10, 238, 244, 'USER DEFINED KEYS / SCENE', s);
    for (let r = 0; r < 6; r++) for (let q = 0; q < 8; q++) btn(c, (264 + q * 28.5) * s, (24 + r * 20) * s, 23 * s, 13 * s, q < 4 ? '#7fd3ff' : '#ffd36a', R() < 0.28);
    for (let q = 0; q < 4; q++) btn(c, (264 + q * 55) * s, (160 + 0) * s, 48 * s, 18 * s, '#ff8a4e', q === 1);
    for (let q = 0; q < 4; q++) knob(c, (290 + q * 55) * s, (205) * s, 9 * s, '#ffffff', -1 + q);
    screen(c, 502, 8, 236, 152, s, 'mix');
    for (let q = 0; q < 4; q++) knob(c, (524 + q * 52) * s, 196 * s, 9 * s, q === 0 ? '#5ab0ef' : null, -0.5 + q * 0.7);
    panel(c, 741, 10, 88, 244, 'MONITOR', s);
    knob(c, 785 * s, 70 * s, 20 * s, '#e9ecf1', -0.9);
    knob(c, 785 * s, 130 * s, 12 * s, '#ffd36a', -1.2);
    for (let r = 0; r < 4; r++) btn(c, 755 * s, (160 + r * 20) * s, 60 * s, 13 * s, r === 0 ? '#ff5d4a' : '#7fd3ff', r < 2);
    // --- strips
    const strip = (x, w, bandCol, i, big) => {
      const cx = x + w / 2;
      c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, (x + 0.5) * s, 262 * s, (w - 1) * s, 424 * s, 3 * s); c.fill();
      c.fillStyle = bandCol; c.fillRect((x + 1.5) * s, 264 * s, (w - 3) * s, 2.4 * s);
      // écran couleur du nom de voie
      const col = PAL[Math.floor(R() * PAL.length)];
      c.fillStyle = shade(col, 0.55); rr(c, (x + 2.5) * s, 270 * s, (w - 5) * s, 13 * s, 2 * s); c.fill();
      c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
      T(c, big ? ['ST', 'MONO'][i] : String(i + 1), cx * s, 276.5 * s, 7.2 * s, '#fff', 'center', '800');
      knob(c, cx * s, 298 * s, 6.5 * s, null, -2 + R() * 3.4);
      meter(c, (x + 3) * s, 312 * s, 70 * s, s, Math.floor(2 + R() * 8));
      btn(c, (x + w - 21) * s, 314 * s, 18 * s, 10 * s, '#e9ecf1', R() < 0.3);
      btn(c, (x + w - 21) * s, 330 * s, 18 * s, 10 * s, '#ff9a3a', R() < 0.15);
      btn(c, (x + w - 21) * s, 346 * s, 18 * s, 10 * s, '#58e06b', R() < 0.8);
      T(c, 'SEL', (x + w - 12) * s, 319 * s, 4.5 * s, 'rgba(255,255,255,.55)', 'center', '700');
      T(c, 'CUE', (x + w - 12) * s, 335 * s, 4.5 * s, 'rgba(255,255,255,.55)', 'center', '700');
      T(c, 'ON', (x + w - 12) * s, 351 * s, 4.5 * s, 'rgba(255,255,255,.55)', 'center', '700');
      fader(c, cx * s, 396 * s, 100 * s * (big ? 1.0 : 1.0) + 80 * s, 0.35 + R() * 0.45, s, big ? '#ff5d4a' : '#dfe2e8', big ? 12 : 9, 17);
    };
    for (let b = 0; b < 2; b++) for (let i = 0; i < 8; i++) strip(14 + b * 242 + i * 29.5, 29.5, '#4a90d9', b * 8 + i, false);
    for (let i = 0; i < 8; i++) strip(500 + i * 29.5, 29.5, '#e8a62a', 16 + i, false);
    for (let i = 0; i < 2; i++) strip(739 + i * 45, 45, '#ff5d4a', i, true);
    T(c, 'INPUT', 130 * s, 258 * s, 6.5 * s, 'rgba(255,255,255,.4)', 'center', '700');
    T(c, 'CENTRALOGIC', 618 * s, 258 * s, 6.5 * s, 'rgba(255,255,255,.4)', 'center', '700');
    T(c, 'MASTER', 784 * s, 258 * s, 6.5 * s, 'rgba(255,255,255,.4)', 'center', '700');
    logoPlate(c, 'CL3', 826 * s, 682 * s, 22 * s, '#f2f4f8', '');
    T(c, 'DIGITAL MIXING CONSOLE', 20 * s, 684 * s, 6 * s, 'rgba(255,255,255,.45)', 'left', '700');
  });
}

/* ---------- Behringer X32 : 900 × 545 mm, 2 px/mm ---------- */
export function x32Tex() {
  return canvasTex('x32', 1800, 1090, (c, W, H) => {
    const s = 2, R = rng(9);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#3a3d44'); bg.addColorStop(1, '#2a2d33');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    panel(c, 12, 10, 450, 120, 'CHANNEL', s);
    for (let r = 0; r < 2; r++) for (let q = 0; q < 16; q++) knob(c, (28 + q * 27.5) * s, (44 + r * 40) * s, 7 * s, r === 0 ? '#5ab0ef' : '#f2c14e', -2 + R() * 3.4);
    panel(c, 470, 10, 158, 120, 'SCREEN', s);
    screen(c, 476, 20, 146, 90, s, 'mix');
    panel(c, 636, 10, 252, 120, 'BUS / MAIN', s);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 8; q++) knob(c, (652 + q * 29) * s, (40 + r * 30) * s, 6.4 * s, r === 0 ? '#e86a5a' : null, -2 + R() * 3.4);
    const strip = (x, w, i, band) => {
      const cx = x + w / 2;
      c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, (x + 0.5) * s, 142 * s, (w - 1) * s, 392 * s, 3 * s); c.fill();
      c.fillStyle = band; c.fillRect((x + 1.5) * s, 144 * s, (w - 3) * s, 2 * s);
      const col = PAL[Math.floor(R() * PAL.length)];
      c.fillStyle = shade(col, 0.55); rr(c, (x + 2) * s, 150 * s, (w - 4) * s, 11 * s, 2 * s); c.fill();
      T(c, String(i + 1), cx * s, 155.5 * s, 6.5 * s, '#fff', 'center', '800');
      btn(c, (x + 4) * s, 172 * s, (w - 8) * s, 9 * s, '#ff9a3a', R() < 0.15);
      btn(c, (x + 4) * s, 186 * s, (w - 8) * s, 9 * s, '#e9ecf1', R() < 0.3);
      btn(c, (x + 4) * s, 200 * s, (w - 8) * s, 9 * s, '#58e06b', R() < 0.8);
      meter(c, (x + 3) * s, 218 * s, 60 * s, s, Math.floor(2 + R() * 8));
      fader(c, (cx + 3) * s, 300 * s, 100 * s + 70 * s, 0.35 + R() * 0.45, s, '#dfe2e8', 8, 16);
    };
    for (let b = 0; b < 2; b++) for (let i = 0; i < 8; i++) strip(14 + b * 232 + i * 28, 28, b * 8 + i, '#4a90d9');
    for (let i = 0; i < 8; i++) strip(636 + i * 31, 31, i, '#e8a62a');
    logoPlate(c, 'X32', 884 * s, 528 * s, 20 * s, '#f2f4f8', '');
    T(c, 'DIGITAL MIXING CONSOLE', 18 * s, 528 * s, 6 * s, 'rgba(255,255,255,.45)', 'left', '700');
  });
}

/* ---------- ChamSys QuickQ 20 : 565 × 360 mm, 3 px/mm ---------- */
export function q20Tex() {
  return canvasTex('q20', 1695, 1080, (c, W, H) => {
    const s = 3, R = rng(13);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#26292f'); bg.addColorStop(1, '#1a1c21');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // blocs de faders de projecteurs (2 × 10)
    const block = (x0, label) => {
      panel(c, x0 - 4, 8, 158, 342, label, s);
      for (let i = 0; i < 10; i++) {
        const x = x0 + 6 + i * 14.4;
        btn(c, (x - 5) * s, 26 * s, 10 * s, 7 * s, PAL[i % PAL.length], R() < 0.5);
        btn(c, (x - 5) * s, 36 * s, 10 * s, 7 * s, '#e9ecf1', R() < 0.2);
        fader(c, x * s, 112 * s, 150 * s, 0.1 + R() * 0.8, s * 0.82, '#e9ecf1', 7.5, 14);
      }
    };
    block(12, 'FIXTURES 1-10');
    block(404, 'FIXTURES 11-20');
    // écran 9,7" au centre
    screen(c, 176, 10, 214, 160, s, 'q');
    // encodeurs sous l'écran
    for (let q = 0; q < 4; q++) knob(c, (200 + q * 50) * s, 184 * s, 8 * s, q === 1 ? '#7fd3ff' : null, -1 + q * 0.8);
    knob(c, 372 * s, 184 * s, 8 * s, '#ffd36a', 0.2);
    // playbacks 1-10
    panel(c, 172, 198, 222, 152, 'PLAYBACKS', s);
    for (let i = 0; i < 10; i++) {
      const x = 184 + i * 20.2;
      btn(c, (x - 6) * s, 214 * s, 12 * s, 8 * s, PAL[(i + 2) % PAL.length], R() < 0.45);
      fader(c, x * s, 232 * s, 100 * s, 0.1 + R() * 0.85, s * 0.8, '#e9ecf1', 8, 14);
    }
    // zone couleur / master
    knob(c, 60 * s, 335 * s, 5 * s, '#ff8a4e', 0.4);
    btn(c, 120 * s, 330 * s, 24 * s, 10 * s, '#58e06b', true);
    btn(c, 150 * s, 330 * s, 24 * s, 10 * s, '#ff5d4a', false);
    T(c, 'GO', 132 * s, 335 * s, 6 * s, '#10240f', 'center', '800');
    T(c, 'QuickQ 20', 549 * s, 348 * s, 16 * s, '#f2f4f8', 'right', '800');
    T(c, 'LIGHTING CONSOLE', 392 * s, 358 * s, 5 * s, 'rgba(255,255,255,.5)', 'right', '700');
    // grand master
    fader(c, 528 * s, 30 * s, 70 * s, 0.9, s * 0.8, '#ff5d4a', 8, 14);
  });
}

/* ---------- Yamaha Rio3224-D2 : face 480 × 220 mm (5U), 3 px/mm ---------- */
export function rioTex() {
  return canvasTex('rio', 1440, 660, (c, W, H) => {
    const s = 3;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4a4e57'); g.addColorStop(1, '#33363d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // oreilles de rack
    c.fillStyle = '#c3c8d0'; c.fillRect(0, 0, 14 * s, H); c.fillRect(W - 14 * s, 0, 14 * s, H);
    for (let y = 22; y < 220; y += 44) { c.fillStyle = '#2a2c31'; rr(c, 4 * s, y * s, 6 * s, 9 * s, 3 * s); c.fill(); rr(c, W - 10 * s, y * s, 6 * s, 9 * s, 3 * s); c.fill(); }
    const xlr = (x, y, out) => {
      c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(x, y, 7.3 * s / 2 * 1.25, 0, 7); c.fill();
      c.strokeStyle = '#8b9099'; c.lineWidth = 1.8; c.beginPath(); c.arc(x, y, 7.3 * s / 2 * 1.25, 0, 7); c.stroke();
      c.fillStyle = '#d7b84a';
      [[-2, 0], [2, 0], [0, 2.3]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx * s * 0.6, y + dy * s * 0.6, 1.8, 0, 7); c.fill(); });
      if (out) { c.fillStyle = '#ff9a3a'; c.fillRect(x - 5, y - 15, 10, 3); }
    };
    for (let r = 0; r < 2; r++) for (let q = 0; q < 16; q++) {
      const x = (24 + q * 27.4) * s, y = (24 + r * 26) * s;
      xlr(x, y, false);
      T(c, String(r * 16 + q + 1), x, y - 15, 11, 'rgba(255,255,255,.7)', 'center', '700');
    }
    for (let r = 0; r < 2; r++) for (let q = 0; q < 8; q++) {
      const x = (24 + q * 27.4) * s, y = (98 + r * 26) * s;
      xlr(x, y, true);
      T(c, 'OUT ' + (r * 8 + q + 1), x, y - 15, 9, 'rgba(255,255,255,.7)', 'center', '700');
    }
    // zone état : LEDs + écran
    c.fillStyle = '#0c0d10'; rr(c, 262 * s, 84 * s, 200 * s, 70 * s, 3 * s); c.fill();
    const lc = ['#46e06a', '#46e06a', '#ffd23a', '#46e06a', '#5ab0ef', '#46e06a'];
    lc.forEach((col, i) => { c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8; c.beginPath(); c.arc((276 + i * 14) * s, 100 * s, 4, 0, 7); c.fill(); c.shadowBlur = 0; });
    T(c, 'Rio3224-D2', 458 * s, 196 * s, 16 * s, '#f2f4f8', 'right', '800');
    T(c, 'I/O RACK · DANTE', 458 * s, 210 * s, 6.4 * s, 'rgba(255,255,255,.55)', 'right', '700');
    T(c, 'INPUT 1–32', 24 * s, 80 * s, 6.5 * s, 'rgba(255,255,255,.5)', 'left', '700');
  });
}

/* ---------- faces de rack 19" : 483 mm de large, unités de 44,45 mm, 3 px/mm ---------- */
export function rackFrontTex(kind, units) {
  const U = 44.45, s = 3;
  return canvasTex('rack|' + kind + '|' + units, Math.round(483 * s), Math.round(units * U * s), (c, W, H) => {
    const R = rng(units * 7 + kind.length);
    c.fillStyle = '#1a1c20'; c.fillRect(0, 0, W, H);
    // rails perforés
    c.fillStyle = '#b8bec8'; c.fillRect(0, 0, 18 * s, H); c.fillRect(W - 18 * s, 0, 18 * s, H);
    for (let u = 0; u < units; u++) for (let k = 0; k < 3; k++) {
      const y = (u * U + 6 + k * 15.5) * s;
      c.fillStyle = '#1a1c20'; rr(c, 6 * s, y, 6 * s, 3.5 * s, 1.5 * s); c.fill(); rr(c, W - 12 * s, y, 6 * s, 3.5 * s, 1.5 * s); c.fill();
    }
    const unit = (u0, n, draw) => {
      const y = u0 * U * s, h = n * U * s;
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#4a4e57'); g.addColorStop(0.5, '#33363d'); g.addColorStop(1, '#25272c');
      c.fillStyle = g; c.fillRect(18 * s, y + 1, W - 36 * s, h - 2);
      c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.5; c.strokeRect(18 * s, y + 1, W - 36 * s, h - 2);
      draw(18 * s, y, W - 36 * s, h);
    };
    const vents = (x, y, w, h) => { c.fillStyle = '#0b0c0e'; for (let i = 0; i < 18; i++) c.fillRect(x + 8 * s + i * ((w - 90 * s) / 18), y + h * 0.28, 3.4 * s, h * 0.44); };
    const led = (x, y, col, on) => { c.fillStyle = on ? col : '#26282c'; if (on) { c.shadowColor = col; c.shadowBlur = 8; } c.beginPath(); c.arc(x, y, 3.2 * s, 0, 7); c.fill(); c.shadowBlur = 0; };
    let u = 0;
    const plan = {
      amp: [['amp', 2], ['amp', 2], ['amp', 2], ['seq', 1], ['blank', 1]],
      hf: [['hf', 1], ['hf', 1], ['hf', 1], ['hf', 1], ['dist', 1], ['blank', 1]],
      iem: [['iem', 1], ['iem', 1], ['iem', 1], ['dist', 1], ['blank', 2]],
      fx: [['fx', 1], ['fx', 1], ['seq', 1], ['blank', 1], ['amp', 2]],
    }[kind] || [['blank', units]];
    for (const [t, n] of plan) {
      if (u + n > units) break;
      unit(u, n, (x, y, w, h) => {
        if (t === 'amp') {
          vents(x, y, w, h);
          knob(c, x + w - 62 * s, y + h * 0.5, 9 * s, null, -0.4); knob(c, x + w - 34 * s, y + h * 0.5, 9 * s, null, -1.1);
          [0, 1, 2, 3].forEach(i => led(x + 18 * s + i * 11 * s, y + 9 * s, i === 3 ? '#ffd23a' : '#46e06a', R() < 0.85));
          T(c, 'PA AMP', x + w - 90 * s, y + h - 9 * s, 6 * s, 'rgba(255,255,255,.6)', 'right', '700');
        } else if (t === 'seq') {
          for (let i = 0; i < 10; i++) { btn(c, x + (26 + i * 33) * s, y + h * 0.3, 20 * s, h * 0.4, '#ff9a3a', R() < 0.6); }
          T(c, 'POWER SEQ', x + w - 18 * s, y + h * 0.5, 7 * s, 'rgba(255,255,255,.6)', 'right', '700');
        } else if (t === 'hf' || t === 'iem') {
          c.fillStyle = '#0a1a14'; rr(c, x + 30 * s, y + h * 0.2, 70 * s, h * 0.6, 3 * s); c.fill();
          T(c, t === 'hf' ? 'CH 12  584.250' : 'IEM 3  863.100', x + 34 * s, y + h * 0.5, 7.5 * s, '#7dffb0', 'left', '700');
          for (let i = 0; i < 8; i++) led(x + (130 + i * 11) * s, y + h * 0.5, i < 6 ? '#46e06a' : '#ffd23a', R() < 0.8);
          knob(c, x + w - 40 * s, y + h * 0.5, 7 * s, null, -0.8);
          T(c, t === 'hf' ? 'DUAL RECEIVER' : 'IEM TX', x + w - 70 * s, y + h * 0.5, 6.5 * s, 'rgba(255,255,255,.6)', 'right', '700');
        } else if (t === 'dist') {
          for (let i = 0; i < 4; i++) { c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(x + (50 + i * 40) * s, y + h * 0.5, 7 * s, 0, 7); c.fill(); }
          T(c, 'ANTENNA DISTRIBUTION', x + w - 18 * s, y + h * 0.5, 6.5 * s, 'rgba(255,255,255,.6)', 'right', '700');
        } else if (t === 'fx') {
          c.fillStyle = '#0a1a14'; rr(c, x + 24 * s, y + h * 0.22, 90 * s, h * 0.56, 3 * s); c.fill();
          T(c, 'FX  HALL 1.8s', x + 30 * s, y + h * 0.5, 8 * s, '#7dffb0', 'left', '700');
          for (let i = 0; i < 6; i++) knob(c, x + (150 + i * 40) * s, y + h * 0.5, 7 * s, null, -2 + R() * 3.4);
        } else {
          for (const px of [26, w / s - 26]) { c.fillStyle = '#2e3138'; c.beginPath(); c.arc(x + px * s, y + h / 2, 3 * s, 0, 7); c.fill(); }
        }
      });
      u += n;
    }
    if (u < units) unit(u, units - u, (x, y, w, h) => {
      c.fillStyle = '#2a2c31'; c.fillRect(x, y, w, h);
      for (let i = 0; i < Math.floor(units - u); i++) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(x, y + i * U * s, w, 2); }
    });
  });
}

/* ---------- écran LED vidéo ---------- */
export function ledTex() {
  return canvasTex('led', 1024, 683, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0a4fc9'); g.addColorStop(0.45, '#18c6e8'); g.addColorStop(0.75, '#7a38e6'); g.addColorStop(1, '#ff4fa6');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const rg = c.createRadialGradient(W * 0.5, H * 0.55, 10, W * 0.5, H * 0.55, W * 0.45);
    rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
    T(c, 'LIVE', W / 2, H * 0.5, H * 0.28, 'rgba(255,255,255,.92)', 'center', '800');
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2;
    const cols = 6, rows = 4;
    for (let i = 1; i < cols; i++) { c.beginPath(); c.moveTo((W * i) / cols, 0); c.lineTo((W * i) / cols, H); c.stroke(); }
    for (let i = 1; i < rows; i++) { c.beginPath(); c.moveTo(0, (H * i) / rows); c.lineTo(W, (H * i) / rows); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1.5);
  });
}

/* ---------- clavier : touches blanches et noires (88 notes ≈ 1,23 m) ---------- */
export function keysTex() {
  return canvasTex('keys', 1760, 220, (c, W, H) => {
    c.fillStyle = '#f4f4f1'; c.fillRect(0, 0, W, H);
    const nW = 52, kw = W / nW;
    c.strokeStyle = '#8c8c86'; c.lineWidth = 2;
    for (let i = 0; i <= nW; i++) { c.beginPath(); c.moveTo(i * kw, 0); c.lineTo(i * kw, H); c.stroke(); }
    c.fillStyle = '#0f0f10';
    for (let i = 0; i < nW; i++) { const m = (i + 5) % 7; if (m === 2 || m === 6 || i === nW - 1) continue; c.fillRect(i * kw + kw * 0.66, 0, kw * 0.68, H * 0.62); }
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.12, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
}

/* ---------- DJ : platine (jog) et table de mixage ---------- */
export function cdjTex() {
  return canvasTex('cdj', 658, 912, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#2d3037'); g.addColorStop(0.5, '#383c44'); g.addColorStop(1, '#2d3037');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#05080c'; rr(c, 34, 30, W - 68, 250, 14); c.fill();
    const sg = c.createLinearGradient(0, 40, 0, 270); sg.addColorStop(0, '#2a77d4'); sg.addColorStop(1, '#0c2c58');
    c.fillStyle = sg; rr(c, 44, 40, W - 88, 230, 10); c.fill();
    for (let i = 0; i < 60; i++) { c.fillStyle = i % 3 ? '#9fe0ff' : '#ffffff'; const h = 20 + Math.abs(Math.sin(i * 0.5)) * 70; c.fillRect(54 + i * 8.6, 190 - h / 2 + 30, 5, h); }
    // jog
    const cx = W / 2, cy = 590;
    c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(cx, cy, 250, 0, 7); c.fill();
    const jg = c.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, 235);
    jg.addColorStop(0, '#6b7079'); jg.addColorStop(0.8, '#2a2d33'); jg.addColorStop(1, '#1a1c20');
    c.fillStyle = jg; c.beginPath(); c.arc(cx, cy, 235, 0, 7); c.fill();
    c.strokeStyle = '#4ea1ff'; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, 218, -1.4, 3.6); c.stroke();
    c.fillStyle = '#16171a'; c.beginPath(); c.arc(cx, cy, 80, 0, 7); c.fill();
    T(c, 'CDJ', cx, cy, 44, '#c9ced6', 'center', '800');
    for (let i = 0; i < 5; i++) btn(c, 50 + i * 110, 310, 80, 34, i === 2 ? '#58e06b' : '#d7dbe2', i === 2);
    btn(c, 50, 846, 110, 44, '#58e06b', true); btn(c, 180, 846, 110, 44, '#ff9a3a', false);
  });
}
export function djmTex() {
  return canvasTex('djm', 760, 912, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#26292f'); g.addColorStop(0.5, '#30343b'); g.addColorStop(1, '#26292f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 200;
      for (let k = 0; k < 4; k++) knob(c, x, 70 + k * 80, 24, k === 0 ? '#ffd23a' : k === 1 ? '#5ab0ef' : k === 2 ? '#58e06b' : '#e86a5a', -2 + k * 0.6);
      meter(c, x + 38, 400, 220, 4, 3 + i * 2, 14);
      fader(c, x, 430, 280, 0.6 - i * 0.1, 4, '#e9ecf1', 9, 15);
    }
    c.fillStyle = '#0b0c0e'; rr(c, 220, 800, 320, 60, 10); c.fill();
    fader(c, 380, 800, 1, 0.5, 4, '#ff5d4a', 12, 14);
    c.fillStyle = '#ff5d4a'; c.fillRect(366, 810, 28, 40);
    T(c, 'DJM', W - 40, 880, 36, '#c9ced6', 'right', '800');
  });
}

/* ---------- ordinateur portable ---------- */
export function laptopKeysTex() {
  return canvasTex('laptop', 660, 460, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9aa2ae'); g.addColorStop(1, '#808792');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#17181c'; rr(c, 30, 40, W - 60, 230, 10); c.fill();
    for (let r = 0; r < 5; r++) for (let q = 0; q < 14; q++) { c.fillStyle = '#3a3d44'; rr(c, 38 + q * 38.5, 48 + r * 44, 34, 38, 5); c.fill(); }
    c.fillStyle = '#6f7682'; rr(c, W / 2 - 80, 300, 160, 100, 10); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.stroke();
  });
}
export function laptopScreenTex() {
  return canvasTex('laptopscr', 660, 440, (c, W, H) => {
    c.fillStyle = '#06080c'; c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 24, 0, H - 24); g.addColorStop(0, '#2a7fe0'); g.addColorStop(1, '#0d2f5e');
    c.fillStyle = g; c.fillRect(24, 24, W - 48, H - 48);
    c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 8; i++) { c.fillRect(54 + i * 70, 300 - i * 14 - (i % 3) * 20, 40, 30 + i * 14 + (i % 3) * 20); }
    T(c, 'Smaart', 50, 70, 38, '#ffffff', 'left', '700');
  });
}

/* ---------- faces de haut-parleurs ---------- */
export function spkGrilleTex(kind, w, h) {
  // w, h en mètres ; 1 px ≈ 1,6 mm
  const pw = Math.round(w * 640), ph = Math.round(h * 640);
  return canvasTex(`spk|${kind}|${pw}x${ph}`, pw, ph, (c, W, H) => {
    c.fillStyle = '#17181b'; c.fillRect(0, 0, W, H);
    for (let y = 4; y < H; y += 7) for (let x = ((y / 7) % 2) * 3.5 + 3; x < W; x += 7) {
      c.fillStyle = '#050506'; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 0, W, 3);
    if (kind === 'top') {
      // guide d'onde (cornet)
      c.fillStyle = 'rgba(40,42,48,.95)'; rr(c, W * 0.2, H * 0.1, W * 0.6, H * 0.22, 8); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; rr(c, W * 0.2, H * 0.1, W * 0.6, H * 0.22, 8); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(W / 2, H * 0.66, W * 0.36, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H * 0.66, W * 0.36, 0, 7); c.stroke();
    } else if (kind === 'sub') {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(W / 2, H / 2, Math.min(W, H) * 0.42, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H / 2, Math.min(W, H) * 0.42, 0, 7); c.stroke();
    } else if (kind === 'la') {
      c.fillStyle = 'rgba(40,42,48,.95)'; rr(c, W * 0.06, H * 0.2, W * 0.88, H * 0.28, 6); c.fill();
      c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, W * 0.06, H * 0.56, W * 0.88, H * 0.3, 6); c.fill();
    }
    c.fillStyle = '#58e06b'; c.shadowColor = '#58e06b'; c.shadowBlur = 8; c.beginPath(); c.arc(W - 14, H - 14, 3.5, 0, 7); c.fill(); c.shadowBlur = 0;
    if (kind !== 'la') { rr(c, 14, H - 26, 64, 16, 4); c.fillStyle = 'rgba(210,214,222,.85)'; c.fill(); T(c, kind === 'sub' ? 'SUB 18' : 'ACT 12', 46, H - 18, 11, '#17181b', 'center', '800'); }
  });
}
