// Types de sol de la salle : textures procédurales (parquets, béton, carrelage, moquette, plancher noir, herbe, bitume, pavés).
// Chaque texture est répétable ; `tile` = côté du motif en mètres (pour fixer l'échelle réelle).
import { canvasTex } from './gfx.js';

const rngOf = seed => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const hsl = (h, s, l) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

/* ---------- parquet à lames : rangées de lames de 14 cm à joints décalés ---------- */
function parquet(hue, sat, light) {
  return (c, W, H) => {
    const rnd = rngOf(hue * 7 + 3), rows = 8, rh = H / rows;
    for (let r = 0; r < rows; r++) {
      let x = 0;
      const y = r * rh;
      let first = true;
      while (x < W) {
        const len = first ? W * (0.18 + rnd() * 0.5) : W * (0.42 + rnd() * 0.5);
        first = false;
        const x2 = Math.min(W, x + len), l = light + (rnd() - 0.5) * 11, hh = hue + (rnd() - 0.5) * 7;
        c.fillStyle = hsl(hh, sat + (rnd() - 0.5) * 8, l);
        c.fillRect(x, y, x2 - x, rh);
        const g = c.createLinearGradient(0, y, 0, y + rh);
        g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.1)');
        c.fillStyle = g; c.fillRect(x, y, x2 - x, rh);
        // veinage
        c.strokeStyle = `rgba(60,35,10,${0.1 + rnd() * 0.08})`; c.lineWidth = 1;
        for (let k = 0; k < 9; k++) {
          const yy = y + rh * (0.08 + 0.84 * rnd());
          c.beginPath(); c.moveTo(x, yy);
          c.bezierCurveTo(x + (x2 - x) * 0.3, yy + (rnd() - 0.5) * 5, x + (x2 - x) * 0.65, yy + (rnd() - 0.5) * 5, x2, yy + (rnd() - 0.5) * 3);
          c.stroke();
        }
        c.fillStyle = 'rgba(30,16,4,.6)'; c.fillRect(x, y, 2, rh); // joint d'about
        x = x2;
      }
      c.fillStyle = 'rgba(30,16,4,.6)'; c.fillRect(0, y, W, 2); // joint entre rangées
    }
  };
}

/* ---------- parquet à chevrons (point de Hongrie) ---------- */
function chevron(hue, sat, light) {
  return (c, W, H) => {
    const rnd = rngOf(hue * 5 + 11), Cw = 256, half = Cw / 2, s = 64;
    for (let k = 0; k < W / Cw; k++) {
      const x0 = k * Cw, xc = x0 + half;
      for (let y = -2 * s; y < H + s; y += s) {
        [-1, 1].forEach(side => {
          const xe = side < 0 ? x0 : x0 + Cw;
          c.fillStyle = hsl(hue + (rnd() - 0.5) * 6, sat + (rnd() - 0.5) * 8, light + (rnd() - 0.5) * 12);
          c.beginPath(); c.moveTo(xe, y + half); c.lineTo(xc, y); c.lineTo(xc, y + s); c.lineTo(xe, y + half + s); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(30,16,4,.55)'; c.lineWidth = 2; c.stroke();
          // veinage dans le sens de la lame
          c.strokeStyle = 'rgba(60,35,10,.12)'; c.lineWidth = 1;
          for (let q = 1; q < 4; q++) {
            const t = q / 4;
            c.beginPath(); c.moveTo(xe, y + half + s * t); c.lineTo(xc, y + s * t); c.stroke();
          }
        });
      }
    }
  };
}

/* ---------- béton ciré avec joints de dilatation ---------- */
function beton(c, W, H) {
  const rnd = rngOf(21);
  c.fillStyle = '#8c9197'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 90, g = c.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.04 + rnd() * 0.05;
    g.addColorStop(0, rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(128,128,128,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 9000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.14)'; c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
  c.strokeStyle = 'rgba(40,44,50,.55)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 1.5); c.lineTo(W, 1.5); c.moveTo(1.5, 0); c.lineTo(1.5, H); c.stroke();
  c.strokeStyle = 'rgba(40,44,50,.28)'; c.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    let x = rnd() * W, y = rnd() * H;
    c.beginPath(); c.moveTo(x, y);
    for (let j = 0; j < 12; j++) { x += (rnd() - 0.4) * 22; y += (rnd() - 0.5) * 18; c.lineTo(x, y); }
    c.stroke();
  }
}

/* ---------- carrelage 60 × 60 cm ---------- */
function carrelage(c, W, H) {
  const rnd = rngOf(33), n = 2, ts = W / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    c.fillStyle = hsl(40 + (rnd() - 0.5) * 6, 18, 76 + (rnd() - 0.5) * 6);
    c.fillRect(i * ts, j * ts, ts, ts);
    const g = c.createLinearGradient(i * ts, j * ts, (i + 1) * ts, (j + 1) * ts);
    g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.08)');
    c.fillStyle = g; c.fillRect(i * ts, j * ts, ts, ts);
    for (let k = 0; k < 500; k++) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(90,80,60,.12)'; c.fillRect(i * ts + rnd() * ts, j * ts + rnd() * ts, 1.5, 1.5); }
  }
  c.strokeStyle = '#8f8878'; c.lineWidth = 5;
  for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * ts, 0); c.lineTo(i * ts, H); c.moveTo(0, i * ts); c.lineTo(W, i * ts); c.stroke(); }
}

/* ---------- moquette bleu-gris ---------- */
function moquette(c, W, H) {
  const rnd = rngOf(44);
  c.fillStyle = '#3d4658'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) {
    const l = rnd();
    c.fillStyle = l < 0.4 ? 'rgba(255,255,255,.1)' : l < 0.8 ? 'rgba(0,0,0,.18)' : 'rgba(120,140,190,.13)';
    c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

/* ---------- plancher de scène noir (lames peintes) ---------- */
function plancherNoir(c, W, H) {
  const rnd = rngOf(55), rows = 8, rh = H / rows;
  for (let r = 0; r < rows; r++) {
    c.fillStyle = hsl(220, 12, 8.5 + rnd() * 3.5);
    c.fillRect(0, r * rh, W, rh);
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
    for (let k = 0; k < 14; k++) { const y = r * rh + rnd() * rh; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + (rnd() - 0.5) * 3); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(0, r * rh, W, 2.5);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, r * rh + 2.5, W, 1.5);
    const jx = rnd() * W;
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(jx, r * rh, 2.5, rh);
    c.fillStyle = 'rgba(190,190,200,.35)';
    [jx - 14, jx + 16].forEach(x => { c.beginPath(); c.arc((x + W) % W, r * rh + rh / 2, 2, 0, 7); c.fill(); });
  }
}

/* ---------- herbe ---------- */
function herbe(c, W, H) {
  const rnd = rngOf(66);
  c.fillStyle = '#4b8a37'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = rnd() * H, r = 40 + rnd() * 80, g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() < 0.5 ? 'rgba(20,70,20,.22)' : 'rgba(150,200,80,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const cols = ['#3a7a2a', '#5aa043', '#2f6322', '#6bb04d', '#437f31'];
  c.lineWidth = 1.4;
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * W, y = rnd() * H, a = -Math.PI / 2 + (rnd() - 0.5) * 1.1, l = 5 + rnd() * 9;
    c.strokeStyle = cols[(rnd() * cols.length) | 0];
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
}

/* ---------- bitume ---------- */
function bitume(c, W, H) {
  const rnd = rngOf(77);
  c.fillStyle = '#3b3d42'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 16000; i++) {
    const l = rnd();
    c.fillStyle = l < 0.35 ? 'rgba(120,124,130,.45)' : l < 0.7 ? 'rgba(10,10,12,.5)' : l < 0.95 ? 'rgba(80,84,90,.35)' : 'rgba(170,170,175,.5)';
    c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.2, 1 + rnd() * 2.2);
  }
  c.strokeStyle = 'rgba(10,10,12,.45)'; c.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) {
    let x = rnd() * W, y = rnd() * H;
    c.beginPath(); c.moveTo(x, y);
    for (let j = 0; j < 14; j++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.3) * 20; c.lineTo(x, y); }
    c.stroke();
  }
}

/* ---------- pavés 20 × 10 cm en appareil décalé ---------- */
function paves(c, W, H) {
  const rnd = rngOf(88), rows = 8, rh = H / rows, pw = W / 4;
  c.fillStyle = '#6c6962'; c.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    for (let q = -1; q < 5; q++) {
      const x = q * pw + (r % 2 ? pw / 2 : 0), y = r * rh, l = 42 + rnd() * 20, hu = 25 + rnd() * 25;
      c.fillStyle = hsl(hu, 6 + rnd() * 8, l);
      c.beginPath(); c.roundRect(x + 3, y + 3, pw - 6, rh - 6, 7); c.fill();
      const g = c.createLinearGradient(x, y, x + pw, y + rh);
      g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
      c.fillStyle = g; c.beginPath(); c.roundRect(x + 3, y + 3, pw - 6, rh - 6, 7); c.fill();
      for (let k = 0; k < 40; k++) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)'; c.fillRect(x + 6 + rnd() * (pw - 12), y + 6 + rnd() * (rh - 12), 1.5, 1.5); }
    }
  }
}

/* ---------- catalogue : `mul` = teinte appliquée sur la texture dans la scène sombre (pour rester sobre et lisible) ---------- */
export const FLOORS = [
  { id: 'std', name: 'Standard (neutre)', tile: 0 },
  { id: 'parquet', name: 'Parquet chêne clair', tile: 1.12, draw: parquet(33, 52, 58), mul: '#6a645c' },
  { id: 'parquet_fonce', name: 'Parquet foncé (noyer)', tile: 1.12, draw: parquet(22, 42, 27), mul: '#8e8984' },
  { id: 'chevron', name: 'Parquet à chevrons', tile: 0.8, draw: chevron(30, 48, 50), mul: '#70675d' },
  { id: 'plancher_noir', name: 'Plancher de scène noir', tile: 1.28, draw: plancherNoir, mul: '#cfcfd7' },
  { id: 'beton', name: 'Béton ciré', tile: 2, draw: beton, mul: '#7a7e85' },
  { id: 'carrelage', name: 'Carrelage', tile: 1.2, draw: carrelage, mul: '#73706b' },
  { id: 'moquette', name: 'Moquette bleu-gris', tile: 0.6, draw: moquette, mul: '#9aa0ad' },
  { id: 'herbe', name: 'Herbe (plein air)', tile: 2, draw: herbe, mul: '#79866f' },
  { id: 'bitume', name: 'Bitume', tile: 1.5, draw: bitume, mul: '#c5c7cc' },
  { id: 'paves', name: 'Pavés', tile: 0.8, draw: paves, mul: '#86847f' },
];
const byId = new Map(FLOORS.map(f => [f.id, f]));
export const floorDef = id => byId.get(id) || FLOORS[0];

// texture répétable ; `pastel` éclaircit le motif pour les exports imprimés
export function floorTexture(id, pastel) {
  const f = floorDef(id);
  if (!f.draw) return null;
  return canvasTex(`floor|${f.id}|${pastel ? 1 : 0}`, 512, 512, (c, W, H) => {
    f.draw(c, W, H);
    if (pastel) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, 0, W, H); }
  }, { repeat: true });
}
// vignette de présentation (canvas 2D) pour le sélecteur
export function floorSwatch(id, w = 72, h = 48) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), f = floorDef(id);
  if (!f.draw) { ctx.fillStyle = '#232a36'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#374258'; ctx.lineWidth = 1; for (let x = 0; x < w; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = 0; y < h; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } return cv; }
  const tmp = document.createElement('canvas');
  tmp.width = 512; tmp.height = 512;
  f.draw(tmp.getContext('2d'), 512, 512);
  ctx.drawImage(tmp, 0, 0, 512, 512 * (h / w), 0, 0, w, h);
  return cv;
}
