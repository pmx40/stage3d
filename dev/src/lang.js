// Dictionnaire : texte français -> [anglais, espagnol, allemand, italien]
import { CATALOG } from './lang_catalog.js';
import { UI } from './lang_ui.js';
export const RAW = { ...CATALOG, ...UI };
