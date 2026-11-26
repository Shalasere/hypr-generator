/* Form controls bound to a path inside a state object.
   Every control calls onChange() after writing, and the caller re-renders. */
(function () {
  'use strict';
  const HC = window.HC;
  const { el } = HC;

  const getAt = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const setAt = (obj, path, v) => {
    const keys = path.split('.'); const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj); target[last] = v;
  };
  HC.getAt = getAt; HC.setAt = setAt;

  let n = 0;
  const fid = (p) => `f-${p.replace(/[^a-z0-9]+/gi, '-')}-${++n}`;

  function row(label, input, hint) {
    return el('div', { class: 'field' },
      el('label', { for: input.id || undefined }, label),
      input,
      hint ? el('p', { class: 'hint' }, hint) : null);
  }

  HC.ui = {
    number(obj, path, label, { min, max, step = 1, hint, onChange } = {}) {
      const id = fid(path);
      const input = el('input', { id, type: 'number', min, max, step, value: getAt(obj, path) });
      input.addEventListener('input', () => { const v = parseFloat(input.value); if (!Number.isNaN(v)) { setAt(obj, path, v); onChange && onChange(); } });
      return row(label, input, hint);
    },
    range(obj, path, label, { min = 0, max = 1, step = 0.01, hint, onChange, fmt = (v) => v } = {}) {
      const id = fid(path);
      const out = el('output', { for: id, class: 'range-val' }, fmt(getAt(obj, path)));
      const input = el('input', { id, type: 'range', min, max, step, value: getAt(obj, path) });
      input.addEventListener('input', () => { const v = parseFloat(input.value); setAt(obj, path, v); out.textContent = fmt(v); onChange && onChange(); });
      return row(label, el('div', { class: 'range-wrap' }, input, out), hint);
    },
    text(obj, path, label, { hint, onChange, placeholder, multiline, mono = true } = {}) {
      const id = fid(path);
      const input = multiline
        ? el('textarea', { id, rows: multiline, placeholder, class: mono ? 'mono' : '', spellcheck: 'false' })
        : el('input', { id, type: 'text', placeholder, class: mono ? 'mono' : '', spellcheck: 'false' });
      input.value = getAt(obj, path) ?? '';
      input.addEventListener('input', () => { setAt(obj, path, input.value); onChange && onChange(); });
      return row(label, input, hint);
    },
    select(obj, path, label, options, { hint, onChange } = {}) {
      const id = fid(path);
      const input = el('select', { id }, options.map(([v, t]) => el('option', { value: v }, t)));
      input.value = String(getAt(obj, path));
      input.addEventListener('change', () => {
        const raw = input.value; const opt = options.find(([v]) => String(v) === raw);
        setAt(obj, path, opt ? opt[0] : raw); onChange && onChange();
      });
      return row(label, input, hint);
    },
    check(obj, path, label, { hint, onChange } = {}) {
      const id = fid(path);
      const input = el('input', { id, type: 'checkbox' }); input.checked = !!getAt(obj, path);
      input.addEventListener('change', () => { setAt(obj, path, input.checked); onChange && onChange(); });
      return el('div', { class: 'field check' }, input, el('label', { for: id }, label), hint ? el('p', { class: 'hint' }, hint) : null);
    },
    /* color = { hex, a } */
    color(obj, path, label, { hint, onChange, alpha = true } = {}) {
      const id = fid(path); const c = getAt(obj, path);
      const pick = el('input', { id, type: 'color', value: c.hex });
      const a = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: c.a, 'aria-label': `${label} opacity`, class: 'alpha' });
      const txt = el('input', { type: 'text', class: 'mono hyprcolor', value: HC.toHypr(c), spellcheck: 'false', 'aria-label': `${label} as Hyprland color` });
      const sync = () => { const cur = getAt(obj, path); pick.value = cur.hex; a.value = cur.a; txt.value = HC.toHypr(cur); onChange && onChange(); };
      pick.addEventListener('input', () => { setAt(obj, path, HC.color(pick.value, parseFloat(a.value))); sync(); });
      a.addEventListener('input', () => { setAt(obj, path, HC.color(pick.value, parseFloat(a.value))); sync(); });
      txt.addEventListener('change', () => { const p = HC.parseHypr(txt.value); if (p) { setAt(obj, path, p); sync(); } else txt.value = HC.toHypr(getAt(obj, path)); });
      return row(label, el('div', { class: 'color-wrap' }, pick, alpha ? a : null, txt), hint);
    },
    section(title, ...children) {
      return el('section', { class: 'panel-section' }, el('h3', {}, title), ...children);
    },
    grid(...children) { return el('div', { class: 'field-grid' }, ...children); },
  };
})();
