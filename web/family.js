// ─────────────────────────────────────────────────────────────────────────────
// JAS.BLACK tool family — shared behaviour. Load after the page markup:
//   <script src="family.js"></script>   (or paste it inline in a single-file build)
// Set the version once: <body data-version="0.1.0">. The tool's own code can call
// JB.toast('Saved') and JB.paintRange(input) after it sets a slider from code.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } } };

  // version: shown only while the title is hovered (.brand-ver right after .brand)
  const ver = document.body.dataset.version;
  for (const el of $$('.brand-ver')) if (ver && !el.textContent) el.textContent = 'v' + ver;

  // light / dark, remembered per tool (key: <tool>-ui). The stage stays dark either way.
  const tool = (document.body.dataset.tool || location.hostname.split('.')[0] || 'tool').toLowerCase();
  const setUI = t => { document.body.dataset.ui = t; store.set(tool + '-ui', t); };
  setUI(store.get(tool + '-ui') === 'light' ? 'light' : (document.body.dataset.ui || 'dark'));
  for (const b of $$('[data-action=theme]')) b.addEventListener('click', () => setUI(document.body.dataset.ui === 'dark' ? 'light' : 'dark'));

  // sliders: green fill up to the value
  const paintRange = el => el.style.setProperty('--pct', ((el.value - el.min) / ((el.max - el.min) || 1) * 100) + '%');
  document.addEventListener('input', e => { if (e.target.type === 'range') paintRange(e.target); });

  // right-click any setting: back to its default (its state once the page has loaded).
  // Family rule — every tool does this, for sliders and for buttons that hold a setting:
  //   sliders, number / colour fields, selects, checkboxes, option groups (a .seg or a row of
  //   chips where one is pressed) and toggle keys (aria-pressed). Action keys (open, align,
  //   export) keep the normal menu. A control that needs its own right-click keeps it by
  //   calling preventDefault() first (e.g. Growth: Shift+right-click = MIDI learn).
  // Option groups are remembered by the pressed button's data-* (their buttons may be redrawn);
  // a group with nothing pressed yet is picked up the next time the page adds controls.
  const defs = new WeakMap();
  const val = el => el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
  const opts = g => $$(':scope > button[aria-pressed]', g);
  const isGroup = g => !!g && (g.matches('.seg') || opts(g).length > 1);
  const idOf = b => JSON.stringify({ ...b.dataset });
  const remember = () => {
    for (const el of $$('input, select')) { if (!defs.has(el)) defs.set(el, val(el)); if (el.type === 'range') paintRange(el); }
    for (const b of $$('button[aria-pressed]')) {
      const g = b.parentElement;
      if (isGroup(g)) { if (!defs.has(g)) { const on = opts(g).find(o => o.getAttribute('aria-pressed') === 'true'); if (on) defs.set(g, idOf(on)); } }
      else if (!defs.has(b)) defs.set(b, b.getAttribute('aria-pressed'));
    }
  };
  if (document.readyState === 'complete') remember(); else addEventListener('load', remember);
  new MutationObserver(remember).observe(document.body, { childList: true, subtree: true }); // controls built later
  const fire = el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const reset = target => {
    const b = target.closest('button[aria-pressed]');
    if (b && isGroup(b.parentElement)) {
      const g = b.parentElement; if (!defs.has(g)) return false;
      const d = opts(g).find(o => idOf(o) === defs.get(g));
      if (d && d.getAttribute('aria-pressed') !== 'true' && !d.disabled) d.click();
      return true;
    }
    if (b && defs.has(b)) { if (b.getAttribute('aria-pressed') !== defs.get(b) && !b.disabled) b.click(); return true; }
    const el = target.closest('input, select');
    if (!el || el.disabled || !defs.has(el) || ['file', 'text', 'search', 'button', 'submit'].includes(el.type)) return false;
    const d = defs.get(el);
    if (val(el) !== d) { if (typeof d === 'boolean') el.checked = d; else el.value = d; fire(el); }
    return true;
  };
  document.addEventListener('contextmenu', e => { if (!e.defaultPrevented && e.target instanceof Element && reset(e.target)) e.preventDefault(); });

  // segmented switches: one pressed at a time
  for (const seg of $$('.seg')) seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    for (const o of $$('button', seg)) o.setAttribute('aria-pressed', String(o === b));
  });

  // full screen key
  for (const b of $$('[data-action=fullscreen]')) b.addEventListener('click', () => {
    const t = $(b.dataset.target || '.monitor') || document.documentElement;
    document.fullscreenElement ? document.exitFullscreen?.() : t.requestFullscreen?.();
  });

  // toast, bottom right
  let toastTimer = 0;
  const toast = msg => {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
  };

  window.JB = { toast, paintRange, setUI, remember };
})();
