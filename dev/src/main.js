import * as st from './store.js';
import * as view from './view.js';
import * as ui from './ui.js';
import * as cat from './catalog.js';
import { applyTemplate } from './templates.js';
import { $ } from './dom.js';
import * as i18n from './i18n.js';
const { setLang, detectLang } = i18n;

function boot() {
  setLang(detectLang(), false);
  st.loadPrefs();
  const saved = st.loadLocal();
  let fresh = true;
  if (saved && Array.isArray(saved.objects) && saved.objects.length) { st.setState(saved); st.relift(); fresh = false; }
  st.resetHistory();
  view.init($('#stage'));
  ui.init();
  if (fresh) applyTemplate('rock'); // première ouverture : un exemple complet à explorer
  st.resetHistory();
  st.emit('change');
  view.frame();
  view.setView('3d');
  view.refreshTool();
  // pour les tests automatisés et le débogage
  window.__stage3d = { st, view, cat, i18n, tpl: { applyTemplate } };
}
boot();
