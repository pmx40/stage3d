// Assemble src/ en un seul fichier ../app.js (IIFE) et prépare le zip itch.io.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const res = await build({
  entryPoints: [path.join(here, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'none',
  outfile: path.join(here, '../app.js'),
  logLevel: 'info',
});
console.log('build ok', res.errors.length, 'erreurs');
