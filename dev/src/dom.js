// Petits utilitaires DOM partagés. h() traduit automatiquement les textes enfants, title et placeholder.
import { tr } from './i18n.js';
export const $ = s => document.querySelector(s);

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if ((k === 'title' || k === 'placeholder') && typeof v === 'string') { e.setAttribute(k, tr(v)); continue; }
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && k !== 'list' && k !== 'for') { try { e[k] = v; } catch (err) { e.setAttribute(k, v); } }
    else e.setAttribute(k, v);
  }
  kids.flat(3).forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(typeof c === 'string' ? tr(c) : c)); });
  return e;
}

let toastTimer = 0;
export function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = tr(msg);
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
