// Bibliothèque graphique commune : matériaux, primitives, textures procédurales, fusion de géométries, environnement.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { THREE };

/* ---------- matériaux ---------- */
const matCache = new Map();
export function mat(color, o) {
  o = o || {};
  const key = [color, o.rough, o.metal, o.emissive, o.ei, o.opacity, o.map && o.map.uuid, o.emap && o.emap.uuid, o.side, o.cc, o.po].join('|');
  let m = matCache.get(key);
  if (m) return m;
  const p = { color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.05 };
  if (o.map) p.map = o.map;
  if (o.side) p.side = o.side;
  // surface « collée » sur une autre (texture, plaque) : le décalage de profondeur matériel évite le z-fighting (flicker) à toute distance
  if (o.po) { p.polygonOffset = true; p.polygonOffsetFactor = 0; p.polygonOffsetUnits = -8; }
  m = o.cc
    ? new THREE.MeshPhysicalMaterial({ ...p, clearcoat: o.cc, clearcoatRoughness: 0.18 })
    : new THREE.MeshStandardMaterial(p);
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 1; if (o.emap) m.emissiveMap = o.emap; }
  if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  matCache.set(key, m);
  return m;
}
export function shade(c, f) {
  const col = new THREE.Color(c);
  col.multiplyScalar(f);
  return '#' + col.getHexString();
}
// matériaux des plans plaqués (décalques) : on ajoute le décalage de profondeur, sauf pour un matériau déjà construit
const decalCache = new WeakMap();
const offsetMat = m => {
  if (m.polygonOffset) return m;
  let c = decalCache.get(m);
  if (!c) { c = m.clone(); c.polygonOffset = true; c.polygonOffsetFactor = 0; c.polygonOffsetUnits = -8; decalCache.set(m, c); }
  return c;
};
const decal = o => (o && o.isMaterial ? o : { ...(o || {}), po: true });
const asMat = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
const asDecal = (c, o) => (typeof c === 'string' ? mat(c, decal(o)) : offsetMat(c));
function sh(m, cast = true) { m.castShadow = cast && !(m.material && m.material.transparent); m.receiveShadow = true; return m; }

/* ---------- primitives (y = bas de la pièce, sauf indication contraire) ---------- */
export function box(w, h, d, color, x = 0, y = 0, z = 0, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), asMat(color, o));
  m.position.set(x, y + h / 2, z);
  return sh(m);
}
export function rbox(w, h, d, r, color, x = 0, y = 0, z = 0, o) {
  const rr = Math.max(0.0004, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, rr), asMat(color, o));
  m.position.set(x, y + h / 2, z);
  return sh(m);
}
export function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, o, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asMat(color, o));
  m.position.set(x, y + h / 2, z);
  return sh(m);
}
export function sph(r, color, x, y, z, o, seg = 18) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.75)), asMat(color, o));
  m.position.set(x, y, z);
  return sh(m);
}
// tore à plat (axe vertical) ou debout selon rotation passée
export function tor(R, r, color, x, y, z, o, flat = true) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 28), asMat(color, o));
  if (flat) m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return sh(m);
}
export function capsule(r, len, color, x, yc, z, o) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 12), asMat(color, o));
  m.position.set(x, yc, z);
  return sh(m);
}
// plan vertical orienté +Z ; yc = centre en hauteur
export function plane(w, h, color, x, yc, z, o) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), asDecal(color, o));
  m.position.set(x, yc, z);
  m.receiveShadow = true;
  return m;
}
export function disc(r, color, x, yc, z, o, seg = 28) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), asDecal(color, o));
  m.position.set(x, yc, z);
  return m;
}
export function edges(w, h, d, x, y, z, color = '#0b0d12', opacity = 1) {
  const l = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
  l.position.set(x, y + h / 2, z);
  l.raycast = () => {};
  return l;
}
// tube entre deux points (cylindre orienté)
export function strut(a, b, r, color, o, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), asMat(color, o));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return sh(m);
}
// prisme à partir d'un polygone en plan (x, z) extrudé en hauteur h, chanfreiné. pts = [[x,z],...] sens quelconque
export function prism(pts, h, bevel, color, o) {
  const shp = new THREE.Shape();
  // le plan XY de l'extrusion devient XZ après rotation : y_shape = -z
  pts.forEach(([x, z], i) => (i ? shp.lineTo(x, -z) : shp.moveTo(x, -z)));
  const bt = Math.min(bevel, h / 2 - 1e-4);
  const geo = new THREE.ExtrudeGeometry(shp, { depth: Math.max(1e-3, h - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, bt);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return sh(new THREE.Mesh(geo, asMat(color, o)));
}
// polygone « profil » (z, y) extrudé sur la largeur w (axe X) : cales, rampes, coins
export function profile(pts, w, color, o) {
  const shp = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? shp.lineTo(z, y) : shp.moveTo(z, y)));
  const geo = new THREE.ExtrudeGeometry(shp, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(-Math.PI / 2);
  return sh(new THREE.Mesh(geo, asMat(color, o)));
}

// plan incliné défini par deux points (z, y) du profil latéral, largeur w sur l'axe X.
// p0 → p1 donne l'axe « haut » de la texture ; la normale est orientée vers le haut / l'extérieur.
export function slopePlane(w, p0, p1, color, o, off = 0.0012) {
  const [a, b] = [p0, p1];
  const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy);
  const Y = new THREE.Vector3(0, dy / L, dz / L);
  const N = new THREE.Vector3(0, -dz / L, dy / L);
  if (N.y < 0) { N.negate(); Y.negate(); } // face toujours tournée vers le haut
  const X = new THREE.Vector3().crossVectors(Y, N);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), asDecal(color, o));
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, N));
  m.position.set(0, (a[1] + b[1]) / 2 + N.y * off, (a[0] + b[0]) / 2 + N.z * off);
  m.receiveShadow = true;
  return m;
}

// membre conique entre deux points (bras, jambes) : r1 côté a, r2 côté b
export function limb(a, b, r1, r2, color, o, seg = 10) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = Math.max(1e-4, A.distanceTo(B));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, seg), asMat(color, o));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return sh(m);
}
// tube souple passant par des points [x,y,z] (câbles, cordons)
export function tube(pts, r, color, o, seg = 24, rad = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, rad, false), asMat(color, o));
  return sh(m);
}
// silhouette [x,y] extrudée en épaisseur t le long de Z (centrée sur z = 0), biseautée (corps de guitare, têtes…)
export function slab(pts, t, bevel, color, o) {
  const shp = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? shp.lineTo(x, y) : shp.moveTo(x, y)));
  const bt = Math.min(bevel, t / 2 - 1e-4);
  const depth = Math.max(1e-3, t - 2 * Math.max(0, bt));
  const geo = new THREE.ExtrudeGeometry(shp, { depth, bevelEnabled: bt > 0, bevelThickness: Math.max(0, bt), bevelSize: Math.max(0, bt), bevelSegments: 2, curveSegments: 1 });
  geo.translate(0, 0, -depth / 2);
  return sh(new THREE.Mesh(geo, asMat(color, o)));
}
// courbe fermée lisse passant par des points de contrôle 2D
export function smooth2(ctrl, n = 90) {
  const c = new THREE.CatmullRomCurve3(ctrl.map(p => new THREE.Vector3(p[0], p[1], 0)), true, 'centripetal');
  return c.getPoints(n).slice(0, -1).map(v => [v.x, v.y]);
}
// UV planaires (x, y) -> (0..1) : plaque texturée sur une extrusion
export function planarUV(m, x0, y0, sx, sy) {
  const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / sx, (p.getY(i) - y0) / sy);
  uv.needsUpdate = true;
  return m;
}

/* ---------- textures procédurales ---------- */
const texCache = new Map();
export function canvasTex(key, w, h, draw, opts = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}
export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function T(ctx, text, x, y, size, color = '#fff', align = 'left', weight = '600') {
  ctx.font = `${weight} ${size}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}
// met à l'échelle les UV d'une géométrie (répétition de texture)
export function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}
export function texPlane(w, h, tex, x, yc, z, o, rep) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat('#ffffff', { rough: 0.5, ...o, map: tex, po: true }));
  if (rep) scaleUV(m.geometry, rep[0], rep[1]);
  m.position.set(x, yc, z);
  m.receiveShadow = true;
  return m;
}

// grille perforée (haut-parleurs)
export function grilleTex() {
  return canvasTex('grille', 128, 128, (c, W, H) => {
    c.fillStyle = '#1b1c20'; c.fillRect(0, 0, W, H);
    for (let r = 0; r < 16; r++) for (let q = 0; q < 16; q++) {
      const x = q * 8 + (r % 2 ? 4 : 0) + 2, y = r * 8 + 2;
      c.fillStyle = '#060607'; c.beginPath(); c.arc(x, y, 2.3, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.10)'; c.beginPath(); c.arc(x - 0.7, y - 0.8, 0.9, 0, 7); c.fill();
    }
  }, { repeat: true });
}
// tôle larmée (praticables)
export function diamondTex() {
  return canvasTex('diamond', 128, 128, (c, W, H) => {
    c.fillStyle = '#7a8497'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3;
    for (let i = -H; i < W + H; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H, H); c.stroke(); }
    c.strokeStyle = 'rgba(0,0,0,.26)';
    for (let i = -H; i < W + H; i += 16) { c.beginPath(); c.moveTo(i + 8, H); c.lineTo(i + 8 + H, 0); c.stroke(); }
  }, { repeat: true });
}
// rampes nervurées
export function ribTex() {
  return canvasTex('rib', 64, 64, (c, W, H) => {
    c.fillStyle = '#16171a'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8) { c.fillStyle = '#2a2c31'; c.fillRect(0, y, W, 4); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, y, W, 1); }
  }, { repeat: true });
}
// pochoir de flight-case
export function stencilTex(text) {
  return canvasTex('stencil|' + text, 512, 128, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.88)'; c.lineWidth = 5; rr(c, 8, 8, W - 16, H - 16, 14); c.stroke();
    T(c, text, W / 2, H / 2 + 3, 62, 'rgba(255,255,255,.92)', 'center', '800');
  });
}

// texte posé à plat (annotations, noms de zones au sol)
const flatCache = new Map();
export function flatTextMesh(text, size, color = '#ffffff') {
  const key = text + '|' + color;
  let r = flatCache.get(key);
  if (!r) {
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    const font = 'bold 64px "Segoe UI", Arial, sans-serif';
    ctx.font = font;
    const w = Math.max(64, Math.ceil(ctx.measureText(text).width) + 40);
    c.width = w; c.height = 100;
    ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, 53);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    r = { tex, aspect: w / 100 };
    flatCache.set(key, r);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * r.aspect, size), new THREE.MeshBasicMaterial({ map: r.tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.raycast = () => {};
  return { mesh: m, width: size * r.aspect };
}

/* ---------- fusion des maillages d'un objet (moins d'appels de rendu) ---------- */
export function mergeGroup(root) {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const lines = [];
  const remove = [];
  root.traverse(o => {
    if (o === root) return;
    if (o.isMesh && o.geometry && !Array.isArray(o.material)) {
      const np = o.raycast !== THREE.Mesh.prototype.raycast;
      const key = [o.material.uuid, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, np ? 1 : 0].join('|');
      let b = buckets.get(key);
      if (!b) { b = { material: o.material, cast: o.castShadow, recv: o.receiveShadow, np, geos: [] }; buckets.set(key, b); }
      let g = o.geometry.clone();
      if (g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      g.clearGroups();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      b.geos.push(g);
      remove.push(o);
    } else if ((o.isLineSegments || o.isLine || o.isLineLoop) && o.geometry) {
      const g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      lines.push({ type: o.constructor, g, material: o.material });
      remove.push(o);
    }
  });
  remove.forEach(o => { o.geometry.dispose(); o.parent && o.parent.remove(o); });
  // retire les groupes vides laissés par la fusion
  [...root.children].forEach(c => { if (c.isGroup && !c.children.length) root.remove(c); });
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach(g => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.material);
    m.castShadow = b.cast; m.receiveShadow = b.recv;
    if (b.np) m.raycast = () => {};
    root.add(m);
  }
  for (const l of lines) {
    const ln = new l.type(l.g, l.material);
    ln.raycast = () => {};
    root.add(ln);
  }
  return root;
}

/* ---------- éclairage d'environnement (reflets réalistes sur le métal, le plastique et le verre) ---------- */
export function applyEnvironment(renderer, scene, intensity = 0.7) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.035);
  scene.environment = env.texture;
  scene.environmentIntensity = intensity;
  pm.dispose();
}
