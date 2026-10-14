// Test de compatibilité des plans (.stage3d.json et sauvegarde automatique) : « rien de perdu » à chaque version.
// Usage : cd dev/tests && npm i puppeteer-core (une fois) && node compat.mjs   (ou : node compat.mjs <racine du site> <plan.json> ...)
// Chaque fois que le format évolue : incrémenter STATE_VERSION (src/store.js), ajouter une étape dans MIGRATIONS et enregistrer ici un plan de la version précédente.
// Compatibilité : les anciens plans (.stage3d.json et sauvegarde automatique) doivent s'ouvrir sans rien perdre.
import puppeteer from 'puppeteer-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] || path.resolve(HERE, '..', '..');
const FIX = path.join(HERE, 'fixtures');
const FILES = process.argv.length > 3 ? process.argv.slice(3) : fs.readdirSync(FIX).filter(f => f.endsWith('.json')).map(f => path.join(FIX, f));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); res.end(d); } }); }).listen(0);
const port = srv.address().port;
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'], defaultViewport: { width: 1300, height: 800 } });
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  OK  ' : '  ÉCHEC ') + name + (info ? ' — ' + info : '')); if (!ok) fails++; };

// comparaison : tout ce que contenait l'ancien plan doit se retrouver à l'identique dans le plan ouvert
const compareSrc = `(orig, now) => {
  const diffs = [];
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (now.objects.length !== orig.objects.length) diffs.push('objets ' + orig.objects.length + ' -> ' + now.objects.length);
  orig.objects.forEach((o, i) => { const n = now.objects[i]; if (!n) return; for (const k of Object.keys(o)) if (!eq(o[k], n[k])) diffs.push('objet ' + o.id + '.' + k + ' ' + JSON.stringify(o[k]) + ' -> ' + JSON.stringify(n[k])); });
  for (const k of ['cables', 'measures', 'patch', 'settings', 'nextId', 'groups', 'plateaux']) if (orig[k] !== undefined && !eq(orig[k], now[k])) diffs.push(k);
  for (const k of ['cables', 'measures', 'patch', 'settings', 'nextId']) if (!eq(orig[k], now[k])) diffs.push(k);
  for (const k of Object.keys(orig.meta)) if (!eq(orig.meta[k], now.meta[k])) diffs.push('meta.' + k);
  for (const k of Object.keys(orig.room)) if (!eq(orig.room[k], now.room[k])) diffs.push('room.' + k);
  return diffs;
}`;

for (const file of FILES) {
  const text = fs.readFileSync(file, 'utf8');
  const orig = JSON.parse(text);
  console.log('\n=== ' + path.basename(file) + ' (v' + orig.v + ', ' + orig.objects.length + ' objets) ===');

  /* A. ouverture par « Ouvrir » / glisser-déposer (importJSONText) + aller-retour */
  {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' }); await wait(1500);
    const r = await page.evaluate(async (text, cmpSrc) => {
      const { st, view } = window.__stage3d;
      const cmp = (0, eval)(cmpSrc);
      const orig = JSON.parse(text);
      const res = st.importJSONText(text);
      await new Promise(r => setTimeout(r, 400));
      const first = JSON.parse(JSON.stringify(st.S));
      const diffs = cmp(orig, first);
      const stats = view.stats();
      // aller-retour : enregistrer puis rouvrir
      const saved = JSON.stringify(st.S);
      st.importJSONText(saved);
      const second = JSON.parse(JSON.stringify(st.S));
      // un nouvel objet reçoit un identifiant unique, l'annulation fonctionne
      const ids = new Set(first.objects.map(o => o.id));
      const o = st.addObject('piano_queue', 0, 0); st.commit();
      const unique = !ids.has(o.id);
      st.undo();
      return { diffs, newer: res.newer, v: first.v, ver: st.STATE_VERSION, plat: first.plateaux, ogroups: (orig.groups || []).length, oplat: (orig.plateaux || []).length, ofloor: orig.room.floor || 'std', groups: first.groups, floor: first.room.floor, stats, roundtrip: JSON.stringify(first) === JSON.stringify(second), unique, afterUndo: st.S.objects.length, n: first.objects.length };
    }, text, compareSrc);
    check('import : rien de perdu', r.diffs.length === 0, r.diffs.slice(0, 4).join(' ; '));
    check('import : version à jour, calques, sol et plateaux conservés', r.v === r.ver && Array.isArray(r.groups) && r.groups.length === r.ogroups && r.floor === r.ofloor && Array.isArray(r.plat) && r.plat.length === r.oplat);
    check('import : tous les objets affichés', r.stats.shown === r.n, JSON.stringify(r.stats));
    check('import : enregistrer puis rouvrir donne le même plan', r.roundtrip);
    check('import : nouvel objet à identifiant unique, annulation OK', r.unique && r.afterUndo === r.n);
    check('import : pas d\'erreur JavaScript', errs.length === 0, errs.join('|'));
    await page.close();
  }

  /* B. sauvegarde automatique d'un ancien utilisateur : le navigateur contient déjà l'ancien plan (et d'anciennes préférences) */
  {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.evaluateOnNewDocument(t => { localStorage.setItem('stage3d.v1', t); localStorage.setItem('stage3d.prefs', JSON.stringify({ labels: true, labelsSet: true, floorDark: true, coverage: false, beams: true, grid: true, cableKind: 'spk', theme: 'dark', themeSet: true })); localStorage.setItem('stage3d.lang', 'fr'); }, text);
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' }); await wait(1800);
    const r = await page.evaluate(async (cmpSrc, text) => {
      const { st, view } = window.__stage3d;
      const cmp = (0, eval)(cmpSrc);
      const now = JSON.parse(JSON.stringify(st.S));
      return { diffs: cmp(JSON.parse(text), now), v: now.v, ver: st.STATE_VERSION, stats: view.stats(), n: now.objects.length, prefs: { h: st.T.hiddenG, b: st.T.beamOff, beams: st.T.beams, cableKind: st.T.cableKind, co: st.T.co }, tabs: [...document.querySelectorAll('#tabs .tab')].map(b => b.textContent) };
    }, compareSrc, text);
    check('démarrage avec ancien plan mémorisé : rien de perdu', r.diffs.length === 0 && r.n === orig.objects.length, r.diffs.slice(0, 3).join(' ; '));
    check('démarrage : plan affiché, version à jour', r.v === r.ver && r.stats.shown === r.n, JSON.stringify(r.stats));
    check('anciennes préférences reprises sans casser les nouvelles', Array.isArray(r.prefs.h) && r.prefs.h.length === 0 && Array.isArray(r.prefs.b) && r.prefs.beams === true && r.prefs.cableKind === 'spk' && r.prefs.co && r.prefs.co.on === false, JSON.stringify(r.prefs));
    check('démarrage : pas d\'erreur JavaScript', errs.length === 0, errs.join('|'));
    await page.close();
  }

  /* C. bouton Ouvrir réel (champ fichier) */
  {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' }); await wait(1500);
    const inp = await page.$('#fileIn');
    await inp.uploadFile(file);
    await wait(900);
    const r = await page.evaluate(() => ({ n: window.__stage3d.st.S.objects.length, name: window.__stage3d.st.S.meta.name, toast: document.querySelector('#toast').textContent }));
    check('bouton « Ouvrir » : plan chargé', r.n === orig.objects.length, r.name + ' / ' + r.toast);
    check('bouton « Ouvrir » : pas d\'erreur', errs.length === 0, errs.join('|'));
    await page.close();
  }
}

/* D. plan d'une version future et plans abîmés */
{
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' }); await wait(1500);
  const r = await page.evaluate(async () => {
    const { st } = window.__stage3d;
    const out = { cur: st.STATE_VERSION };
    // plan plus récent : v9 avec champs inconnus
    const fut = JSON.stringify({ v: 9, app: 'Stage3D', futur: { a: 1 }, meta: { name: 'Futur', zzz: 5 }, room: { w: 10, d: 10, back: 2, floor: 'beton', extra: 'x' }, settings: {}, objects: [{ id: 1, type: 'piano_queue', x: 1, z: 2, y: 0, rot: 0, w: 1.5, d: 2, h: 1, color: '#000', futurChamp: 'garde-moi', group: 'g7' }], groups: [{ id: 'g7', name: 'Mon calque' }], cables: [], measures: [], patch: [], nextId: 2 });
    const res = st.importJSONText(fut);
    out.newer = res.newer; out.v = st.S.v; out.kept = st.S.futur && st.S.futur.a === 1 && st.S.objects[0].futurChamp === 'garde-moi' && st.S.meta.zzz === 5 && st.S.room.extra === 'x'; out.group = st.groupOf(st.S.objects[0]); out.floor = st.S.room.floor;
    // plan abîmé : champs manquants, identifiants en double, nombres en texte, type inconnu, groupe inexistant
    const bad = JSON.stringify({ objects: [{ type: 'prat_2x2', x: '3', z: 1 }, { id: 5, type: 'prat_2x2' }, { id: 5, type: 'type_inconnu_xyz', x: 2, z: 2, w: null }, null, { id: 6, type: 'wedge', group: 'inexistant', num: 3 }] });
    const res2 = st.importJSONText(bad);
    const ids = st.S.objects.map(o => o.id);
    out.bad = { n: st.S.objects.length, uniqueIds: new Set(ids).size === ids.length, nums: st.S.objects.every(o => ['w', 'd', 'h', 'x', 'y', 'z', 'rot'].every(k => Number.isFinite(o[k]))), x: st.S.objects[0].x, nextId: st.S.nextId > Math.max(...ids), group: st.groupOf(st.S.objects[3]), v: st.S.v, newer: res2.newer };
    // fichier qui n'est pas un plan
    try { st.importJSONText('{"hello":1}'); out.invalid = 'accepté'; } catch (e) { out.invalid = 'refusé'; }
    try { st.importJSONText('pas du json'); out.invalid2 = 'accepté'; } catch (e) { out.invalid2 = 'refusé'; }
    return out;
  });
  console.log('\n=== plans d\'une version future et plans abîmés ===');
  check('plan v9 : ouvert, signalé comme plus récent, champs inconnus conservés', r.newer === true && r.v === 9 && r.kept, JSON.stringify(r));
  check('plan v9 : calque personnalisé et sol conservés', r.group === 'g7' && r.floor === 'beton');
  check('plan abîmé : ouvert avec des valeurs par défaut sûres', r.bad.n === 4 && r.bad.uniqueIds && r.bad.nums && r.bad.x === 3 && r.bad.nextId && r.bad.v === r.cur, JSON.stringify(r.bad));
  check('groupe inexistant : retombe sur le groupe du type', r.bad.group === 'sono', r.bad.group);
  check('fichiers invalides refusés proprement', r.invalid === 'refusé' && r.invalid2 === 'refusé', r.invalid + '/' + r.invalid2);
  check('pas d\'erreur JavaScript non gérée', errs.length === 0, errs.join('|'));
  await page.close();
}
console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nTOUT EST OK');
await browser.close(); srv.close();
