// Modèles 3D du backline : batterie, amplis guitare / basse, clavier de scène.
import { THREE, mat, shade, box, rbox, cyl, sph, tor, disc, strut, tube, texPlane, canvasTex, scaleUV } from './gfx.js';

const ALU = { metal: 0.85, rough: 0.28 };
const BLK = '#0c0d0f';

/* ---------- textures ---------- */
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tolexTex = () => canvasTex('tolex', 256, 256, (c, W, H) => {
  seed = 11;
  c.fillStyle = '#9a9ba0'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 7000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.35)'; c.fillRect(rnd() * W, rnd() * H, 2, 2); }
}, { repeat: true });
const clothTex = () => canvasTex('ampcloth2', 128, 128, (c, W, H) => {
  c.fillStyle = '#b79d6b'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(70,50,20,.38)'; c.lineWidth = 2;
  for (let i = 0; i < W; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 0; y < H; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 4) c.fillRect(x, y, 2, 2);
}, { repeat: true });
const darkClothTex = () => canvasTex('cabcloth', 128, 128, (c, W, H) => {
  c.fillStyle = '#16171a'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1.5;
  for (let i = 0; i < W; i += 3) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
}, { repeat: true });
// face avant d'un baffle : toile + contours des haut-parleurs (n colonnes × m lignes)
const spkRingsTex = (cols, rows, bass) => canvasTex(`rings|${cols}|${rows}|${bass ? 1 : 0}`, 256 * cols, 256 * rows, (c, W, H) => {
  if (bass) {
    c.fillStyle = '#0f1012'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2a2c31';
    for (let y = 5; y < H; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < W; x += 10) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
  } else {
    c.fillStyle = '#16171a'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1.5;
    for (let i = 0; i < W; i += 3) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); }
    for (let i = 0; i < H; i += 3) { c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
  }
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const cx = (q + 0.5) * (W / cols), cy = (r + 0.5) * (H / rows), R = Math.min(W / cols, H / rows) * 0.43;
    c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R * 0.82, 0, 7); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.arc(cx, cy, R * 0.22, 0, 7); c.fill();
  }
});

/* ---------- éléments d'ampli ---------- */
const tolexBody = (g, w, h, d, color, y = 0, z = 0) => g.add(rbox(w, h, d, 0.009, shade(color, 2.4), 0, y, z, { rough: 0.8, map: tolexTex() }));
function corner(g, x, y, z) { g.add(box(0.034, 0.034, 0.034, '#b9bec7', x, y, z, ALU)); }
function knob(g, x, y, z, big = false) {
  const r = big ? 0.0155 : 0.0125;
  const k = cyl(r, r * 1.08, 0.018, '#0d0e10', 0, 0, 0, { rough: 0.5 }, 14); k.rotation.x = Math.PI / 2; k.position.set(x, y, z + 0.009); g.add(k);
  const sk = cyl(r * 1.25, r * 1.25, 0.004, '#c9ced6', 0, 0, 0, ALU, 14); sk.rotation.x = Math.PI / 2; sk.position.set(x, y, z + 0.002); g.add(sk);
  g.add(box(0.002, r * 0.9, 0.002, '#f2f2ee', x, y + 0.002, z + 0.019));
}
function handle(g, w, y, z) {
  g.add(rbox(Math.min(0.2, w * 0.4), 0.016, 0.034, 0.006, '#0b0b0d', 0, y, z, { rough: 0.7 }));
  [-1, 1].forEach(s => g.add(box(0.012, 0.018, 0.04, '#b9bec7', s * Math.min(0.105, w * 0.2), y - 0.004, z, ALU)));
}
function feet(g, w, d, inset = 0.04) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.018, 0.02, 0.014, '#0b0b0d', sx * (w / 2 - inset), -0.005, sz * (d / 2 - inset), { rough: 0.9 }, 10)));
}
// z = plan de la face avant du coffre : la façade du panneau dépasse de 4 mm (jamais coplanaire avec le coffre, sinon flicker)
function panel(g, w, y, z, h, n, color = '#c9ced6') {
  g.add(box(w * 0.94, h, 0.008, color, 0, y, z, { metal: 0.7, rough: 0.35 }));
  const zf = z + 0.004;
  for (let i = 0; i < n; i++) knob(g, -w * 0.4 + (w * 0.8 * i) / Math.max(1, n - 1), y + h * 0.5, zf, false);
  g.add(sph(0.0075, '#e5241d', w * 0.42, y + h * 0.5, zf + 0.004, { emissive: '#e5241d', ei: 1.6 }, 8)); // voyant
  g.add(box(0.016, 0.01, 0.01, '#101113', w * 0.4, y + h * 0.5 - 0.02, zf + 0.004)); // inverseur
}

/* ---------- ampli guitare combo ---------- */
export function bAmpGtr(g, o) {
  tolexBody(g, o.w, o.h, o.d, o.color);
  const gh = o.h * 0.64, gy = o.h * 0.09;
  g.add(texPlane(o.w * 0.88, gh, clothTex(), 0, gy + gh / 2, o.d / 2 + 0.0016, { rough: 1 }, [4, 3]));
  // passepoil crème autour de la toile
  const pw = o.w * 0.88 + 0.01;
  [[0, gy - 0.003, pw, 0.006], [0, gy + gh + 0.003 - 0.006, pw, 0.006]].forEach(([x, y, w, h]) => g.add(box(w, h, 0.004, '#e8dfc0', x, y, o.d / 2 + 0.001, { rough: 0.7 })));
  [-1, 1].forEach(s => g.add(box(0.006, gh, 0.004, '#e8dfc0', s * (pw / 2 - 0.003), gy, o.d / 2 + 0.001, { rough: 0.7 })));
  panel(g, o.w, o.h * 0.79, o.d / 2, o.h * 0.15, 7);
  g.add(rbox(0.07, 0.016, 0.004, 0.002, '#c9a24a', -o.w * 0.3, gy - 0.002, o.d / 2 + 0.0035, { metal: 0.8, rough: 0.35 })); // plaque logo
  handle(g, o.w, o.h - 0.002, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => corner(g, sx * (o.w / 2 - 0.012), o.h - 0.03, sz * (o.d / 2 - 0.012)));
  feet(g, o.w, o.d);
}

/* ---------- stack guitare : tête + baffle 4×12 ---------- */
export function bStackGtr(g, o) {
  const cabH = o.h * 0.68, hh = o.h - cabH;
  tolexBody(g, o.w, cabH, o.d, o.color);
  g.add(texPlane(o.w * 0.92, cabH * 0.92, spkRingsTex(2, 2, false), 0, cabH / 2, o.d / 2 + 0.0016, { rough: 1 }));
  const pw = o.w * 0.92 + 0.01;
  g.add(box(pw, 0.006, 0.004, '#e8dfc0', 0, cabH * 0.04 - 0.003, o.d / 2 + 0.001));
  g.add(box(pw, 0.006, 0.004, '#e8dfc0', 0, cabH * 0.96 - 0.003, o.d / 2 + 0.001));
  [-1, 1].forEach(s => { g.add(rbox(0.012, 0.075, 0.18, 0.004, BLK, s * (o.w / 2 + 0.001), cabH * 0.5 - 0.02, 0)); }); // poignées latérales
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { corner(g, sx * (o.w / 2 - 0.012), cabH - 0.03, sz * (o.d / 2 - 0.012)); corner(g, sx * (o.w / 2 - 0.012), 0.0, sz * (o.d / 2 - 0.012)); });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.022, 0.022, 0.03, '#17181b', sx * (o.w / 2 - 0.05), -0.022, sz * (o.d / 2 - 0.05), { rough: 0.7 }, 12))); // roulettes
  // tête
  const hd = o.d * 0.74;
  g.add(rbox(o.w * 0.94, hh, hd, 0.008, shade(o.color, 2.4), 0, cabH, -o.d * 0.08, { rough: 0.8, map: tolexTex() }));
  panel(g, o.w * 0.94, cabH + hh * 0.34, hd / 2 - o.d * 0.08, hh * 0.5, 8, '#17181b');
  g.add(box(o.w * 0.9, 0.003, 0.004, '#c9ced6', 0, cabH + hh * 0.9, hd / 2 - o.d * 0.08, ALU)); // liseré
  handle(g, o.w, cabH + hh - 0.002, -o.d * 0.08);
  for (let i = 0; i < 8; i++) g.add(box(0.006, 0.002, hd * 0.5, '#0b0b0d', -o.w * 0.2 + i * 0.04, cabH + hh, -o.d * 0.2)); // ouïes de ventilation
}

/* ---------- ampli basse : tête + baffle 2×10 + tweeter ---------- */
export function bAmpBass(g, o) {
  const cabH = o.h * 0.72, hh = o.h - cabH;
  tolexBody(g, o.w, cabH, o.d, o.color);
  g.add(texPlane(o.w * 0.92, cabH * 0.92, spkRingsTex(1, 2, true), 0, cabH / 2, o.d / 2 + 0.0016, { rough: 0.8, metal: 0.3 }));
  g.add(rbox(0.12, 0.05, 0.02, 0.01, '#050506', o.w * 0.28, cabH * 0.1, o.d / 2 + 0.002, { rough: 0.6 }));
  [-1, 1].forEach(s => g.add(rbox(0.012, 0.07, 0.16, 0.004, BLK, s * (o.w / 2 + 0.001), cabH * 0.5 - 0.02, 0)));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { corner(g, sx * (o.w / 2 - 0.012), cabH - 0.03, sz * (o.d / 2 - 0.012)); corner(g, sx * (o.w / 2 - 0.012), 0, sz * (o.d / 2 - 0.012)); });
  feet(g, o.w, o.d);
  // tête de basse : façade rack noire avec afficheur et rangée de potards
  const hd = o.d * 0.7;
  g.add(rbox(o.w * 0.92, hh, hd, 0.006, '#1c1d21', 0, cabH, 0, { rough: 0.6 }));
  g.add(box(o.w * 0.9, hh * 0.86, 0.006, '#26282d', 0, cabH + hh * 0.07, hd / 2, { metal: 0.5, rough: 0.4 }));
  for (let i = 0; i < 7; i++) knob(g, -o.w * 0.34 + (o.w * 0.6 * i) / 6, cabH + hh * 0.5, hd / 2, i === 6);
  g.add(box(0.07, 0.024, 0.003, '#050607', o.w * 0.34, cabH + hh * 0.5 - 0.012, hd / 2 + 0.004));
  g.add(box(0.058, 0.012, 0.001, '#58e0ff', o.w * 0.34, cabH + hh * 0.5 - 0.006, hd / 2 + 0.0055, { emissive: '#58e0ff', ei: 1 }));
  [-1, 1].forEach(s => g.add(box(0.018, hh * 0.86, 0.012, '#b9bec7', s * (o.w * 0.46 - 0.009), cabH + hh * 0.07, hd / 2 + 0.002, ALU))); // oreilles rack
}

/* ---------- clavier de scène 88 touches (touches blanches et noires en relief) ---------- */
export const whiteKeysTex = () => canvasTex('whitekeys', 1560, 220, (c, W, H) => {
  c.fillStyle = '#f4f4f1'; c.fillRect(0, 0, W, H);
  const nW = 52, kw = W / nW;
  c.strokeStyle = '#8c8c86'; c.lineWidth = 2;
  for (let i = 0; i <= nW; i++) { c.beginPath(); c.moveTo(i * kw, 0); c.lineTo(i * kw, H); c.stroke(); }
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(0.1, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.08)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
});
export function bKeys(g, o) {
  const y = o.h * 0.8, nW = 52;
  // stand en X double
  [-1, 1].forEach(s => {
    [-0.34, 0.34].forEach(a => {
      const l = cyl(0.014, 0.014, y * 1.1, '#2a2c32', s * o.w * 0.33, 0, 0, { metal: 0.8, rough: 0.35 }, 8);
      l.position.y = y * 0.55; l.rotation.z = a; g.add(l);
    });
    g.add(cyl(0.02, 0.02, 0.05, '#0d0e10', s * o.w * 0.33, y * 0.5, 0, { rough: 0.8 }, 10));
    g.add(box(0.04, 0.012, o.d * 0.7, '#17181b', s * o.w * 0.33, 0, 0));
    g.add(box(0.03, 0.03, o.d * 0.5, '#17181b', s * o.w * 0.33, y - 0.03, 0));
  });
  // boîtier avec joues en bois
  g.add(rbox(o.w, 0.09, o.d * 0.85, 0.01, '#1b1d22', 0, y, -o.d * 0.07, { rough: 0.5 }));
  [-1, 1].forEach(s => g.add(rbox(0.039, 0.1, o.d * 0.88, 0.008, '#6a3f22', s * (o.w / 2 - 0.0175 + 0.002), y - 0.005, -o.d * 0.07, { rough: 0.45, cc: 0.3 })));
  // touches
  const kx = o.w * 0.9, kw = kx / nW, kd = o.d * 0.3, kz = o.d * 0.22;
  g.add(box(kx, 0.025, kd, '#f2f2ee', 0, y + 0.07, kz, { rough: 0.35 }));
  const kt = texPlane(kx, kd, whiteKeysTex(), 0, 0, 0, { rough: 0.35 });
  kt.rotation.x = -Math.PI / 2; kt.position.set(0, y + 0.0955, kz);
  g.add(kt);
  for (let i = 0; i < nW - 1; i++) {
    const m = (i + 5) % 7;
    if (m === 2 || m === 6) continue;
    g.add(box(kw * 0.6, 0.016, kd * 0.62, '#0d0e10', -kx / 2 + (i + 1) * kw, y + 0.092, kz - kd * 0.19, { rough: 0.35 }));
  }
  // panneau de commande
  g.add(rbox(o.w * 0.97, 0.04, o.d * 0.28, 0.006, '#17181b', 0, y + 0.09, -o.d * 0.18, { rough: 0.5 }));
  g.add(box(0.14, 0.003, 0.05, '#050607', -o.w * 0.12, y + 0.13, -o.d * 0.18, { rough: 0.2 }));
  g.add(box(0.12, 0.001, 0.036, '#58e0ff', -o.w * 0.12, y + 0.1335, -o.d * 0.18, { emissive: '#58e0ff', ei: 0.9 }));
  for (let i = 0; i < 9; i++) g.add(cyl(0.011, 0.011, 0.014, '#c9ced6', o.w * 0.04 + i * 0.045, y + 0.13, -o.d * 0.18, ALU, 10));
  for (let i = 0; i < 4; i++) g.add(rbox(0.026, 0.006, 0.014, 0.002, '#e9ecf1', o.w * 0.35 + i * 0.034, y + 0.13, -o.d * 0.28, { rough: 0.4 }));
  [-1, 1].forEach(s => g.add(cyl(0.016, 0.016, 0.026, '#101113', s * (o.w / 2 - 0.095), y + 0.1, -o.d * 0.0, { rough: 0.7 }, 10))); // molettes
  // pédale de sustain posée devant le stand
  g.add(rbox(0.09, 0.02, 0.16, 0.006, '#17181b', o.w * 0.5 - 0.1, 0, o.d * 0.8, { rough: 0.6 }));
  g.add(tube([[o.w * 0.5 - 0.1, 0.02, o.d * 0.72], [o.w * 0.5 - 0.1, 0.01, o.d * 0.4], [o.w * 0.33, 0.01, o.d * 0.1], [o.w * 0.33, y * 0.5, -0.03]], 0.004, '#0b0b0d', { rough: 0.85 }, 14, 5));
}

/* ---------- batterie (dessinée aux dimensions de référence 1,6 × 1,4 × 1,2 puis mise à l'échelle) ---------- */
export function bDrums(g, o) {
  const red = o.color, chrome = '#a8afba', gold = '#c9a24a', chromeM = { metal: 0.85, rough: 0.25 }, goldM = { metal: 0.8, rough: 0.3 };
  g.add(rbox(1.55, 0.012, 1.35, 0.005, '#3a2226', 0, 0, 0, { rough: 1 })); // tapis
  const drum = (r, len, x, y, z, rx, rz, kind) => {
    const gp = new THREE.Group();
    gp.add(cyl(r, r, len, red, 0, -len / 2, 0, { rough: 0.28, cc: 0.8 }, 32));
    [len / 2, -len / 2].forEach(yy => {
      gp.add(tor(r + 0.003, kind === 'kick' ? 0.017 : 0.0085, kind === 'kick' ? red : chrome, 0, yy, 0, kind === 'kick' ? { rough: 0.3, cc: 0.8 } : chromeM, true));
    });
    gp.add(disc(r * 0.985, kind === 'kick' ? '#101113' : '#ecebe4', 0, len / 2 + 0.002, 0, { rough: 0.55 }, 32).rotateX(-Math.PI / 2));
    if (kind !== 'kick') gp.add(disc(r * 0.985, '#ecebe4', 0, -len / 2 - 0.002, 0, { rough: 0.55 }, 32).rotateX(Math.PI / 2));
    const nl = kind === 'kick' ? 8 : r > 0.17 ? 8 : 6;
    for (let i = 0; i < nl; i++) {
      const a = (i / nl) * Math.PI * 2, cx = Math.cos(a) * (r + 0.008), cz = Math.sin(a) * (r + 0.008);
      gp.add(box(0.016, 0.052, 0.014, chrome, cx, -0.026, cz, chromeM)); // pontet
      gp.add(cyl(0.005, 0.005, len * 0.42, chrome, Math.cos(a) * (r + 0.012), len * 0.5 - len * 0.42 - 0.01, Math.sin(a) * (r + 0.012), chromeM, 6)); // tige de tension
    }
    gp.position.set(x, y, z); gp.rotation.x = rx; gp.rotation.z = rz;
    g.add(gp);
    return gp;
  };
  const kick = drum(0.28, 0.45, 0, 0.3, 0.12, Math.PI / 2, 0, 'kick');
  void kick;
  g.add(disc(0.062, '#050506', 0, 0.3, 0.12 + 0.2265, { rough: 0.5 }, 18)); // trou de la grosse caisse
  g.add(tor(0.062, 0.004, chrome, 0, 0.3, 0.12 + 0.2268, chromeM, false));
  [-1, 1].forEach(s => { // béquilles
    g.add(strut([s * 0.25, 0.2, 0.3], [s * 0.34, 0.0, 0.5], 0.008, chrome, chromeM, 6));
    g.add(cyl(0.012, 0.014, 0.012, '#0b0b0d', s * 0.34, 0, 0.5, { rough: 0.9 }, 8));
  });
  // toms sur supports
  [[-0.2, 0.84], [0.2, 0.84]].forEach(([x, y]) => {
    drum(0.15, 0.22, x, y, -0.02, 0.38, 0, 'tom');
    g.add(strut([0, 0.58, 0.05], [x, y - 0.1, -0.02], 0.007, chrome, chromeM, 6));
  });
  g.add(cyl(0.013, 0.013, 0.34, chrome, 0, 0.45, 0.05, chromeM, 8));
  g.add(box(0.05, 0.05, 0.05, '#17181b', 0, 0.56, 0.05));
  drum(0.2, 0.42, 0.58, 0.58, -0.22, 0, 0, 'floor');
  [0, 1, 2].forEach(i => { const a = i * 2.1; g.add(cyl(0.01, 0.01, 0.55, chrome, 0.58 + Math.cos(a) * 0.17, 0.0, -0.22 + Math.sin(a) * 0.17, chromeM, 6)); });
  // caisse claire sur son panier
  drum(0.18, 0.15, -0.38, 0.62, -0.38, 0, 0, 'snare');
  g.add(box(0.04, 0.03, 0.02, chrome, -0.38, 0.62 - 0.1, -0.38 + 0.2, chromeM)); // levier du timbre
  g.add(cyl(0.012, 0.012, 0.5, chrome, -0.38, 0.0, -0.38, chromeM, 8));
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; g.add(strut([-0.38, 0.5, -0.38], [-0.38 + Math.cos(a) * 0.3, 0.01, -0.38 + Math.sin(a) * 0.3], 0.007, chrome, chromeM, 6)); }
  // baguettes
  [[-0.05, 0.3], [0.08, -0.2]].forEach(([dx, dz]) => g.add(strut([-0.38 + dx, 0.71, -0.38 + dz], [-0.38 + dx + 0.17, 0.715, -0.38 + dz + 0.22], 0.006, '#d9b37a', { rough: 0.6 }, 6)));
  const stand = (x, z, hgt, boom = 0) => {
    g.add(cyl(0.009, 0.009, hgt, chrome, x, 0, z, chromeM, 8));
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + x; g.add(strut([x, 0.15, z], [x + Math.cos(a) * 0.3, 0.01, z + Math.sin(a) * 0.3], 0.008, chrome, chromeM, 6)); }
    void boom;
  };
  const cym = (x, y, z, r, tilt) => {
    const gp = new THREE.Group();
    gp.add(cyl(r, r * 1.01, 0.006, gold, 0, 0, 0, goldM, 40));
    gp.add(cyl(r * 0.2, r * 0.26, 0.022, gold, 0, 0.002, 0, goldM, 16));
    gp.add(tor(r * 0.6, 0.0015, shade(gold, 0.8), 0, 0.004, 0, goldM, true));
    gp.add(tor(r * 0.85, 0.0015, shade(gold, 0.8), 0, 0.004, 0, goldM, true));
    gp.position.set(x, y, z); gp.rotation.x = tilt;
    g.add(gp);
  };
  // charleston avec pédale
  stand(-0.72, -0.2, 0.9);
  cym(-0.72, 0.9, -0.2, 0.17, 0.05); cym(-0.72, 0.93, -0.2, 0.17, -0.02);
  g.add(box(0.09, 0.012, 0.2, '#2a2c31', -0.72, 0.01, 0.0, { metal: 0.6, rough: 0.4 }));
  g.add(box(0.05, 0.012, 0.06, chrome, -0.72, 0.012, -0.1, chromeM));
  // crash, ride, 2e crash
  stand(-0.45, -0.62, 1.1); cym(-0.45, 1.1, -0.62, 0.22, 0.2);
  stand(0.6, -0.55, 1.05); cym(0.6, 1.05, -0.55, 0.24, -0.15);
  stand(0.72, 0.15, 0.85); cym(0.72, 0.85, 0.15, 0.2, 0.25);
  // pédale de grosse caisse
  g.add(box(0.1, 0.014, 0.22, '#2a2c31', 0, 0.0, 0.52, { metal: 0.6, rough: 0.4 }));
  g.add(strut([0.03, 0.02, 0.5], [0.03, 0.36, 0.36], 0.007, chrome, chromeM, 6));
  g.add(strut([0.03, 0.36, 0.36], [0.03, 0.31, 0.3], 0.006, chrome, chromeM, 6));
  g.add(sph(0.022, '#e9ecf1', 0.03, 0.3, 0.295, { rough: 0.6 }, 10));
  // trône
  g.add(cyl(0.17, 0.17, 0.05, '#17181c', 0, 0.5, -0.65, { rough: 0.7 }, 24));
  g.add(cyl(0.02, 0.02, 0.5, chrome, 0, 0, -0.65, chromeM, 10));
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; g.add(strut([0, 0.2, -0.65], [Math.cos(a) * 0.26, 0.01, -0.65 + Math.sin(a) * 0.26], 0.01, chrome, chromeM, 6)); }
}
