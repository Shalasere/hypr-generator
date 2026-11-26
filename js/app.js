/* App shell: tabs, monitor, preview scaling, output panel, save/load. */
(function () {
  'use strict';
  const HC = window.HC;
  const { el, $, $$ } = HC;
  const KEY = 'hypr-generator/v1', OLD_KEY = 'hypr-configurator/v1'; // the project's earlier name

  const MONITORS = [
    { id: 'uw', name: 'Ultrawide 5120×1440', w: 5120, h: 1440 },
    { id: 'qhd', name: '2560×1440', w: 2560, h: 1440 },
    { id: 'fhd', name: '1920×1080', w: 1920, h: 1080 },
    { id: 'uw34', name: '3440×1440', w: 3440, h: 1440 },
    { id: '4k', name: '3840×2160 (scale 1)', w: 3840, h: 2160 },
    { id: 'laptop', name: 'Laptop 1366×768', w: 1366, h: 768 },
  ];

  const fresh = () => ({ tab: 'hyprlock', monitor: 'qhd', custom: { w: 2560, h: 1600 }, zoom: 'fit', hyprlock: HC.hyprlockDefaults(), hypridle: HC.hypridleDefaults(), hyprland: HC.hyprlandDefaults() });

  function load() {
    const saved = HC.store.get(KEY, null) || HC.store.get(OLD_KEY, null);
    const base = fresh();
    if (!saved || typeof saved !== 'object') return base;
    // shallow-merge each section so new fields added in later versions get defaults
    for (const k of ['hyprlock', 'hypridle', 'hyprland']) if (saved[k]) base[k] = Object.assign(base[k], saved[k]);
    for (const k of ['tab', 'monitor', 'zoom', 'custom']) if (saved[k]) base[k] = saved[k];
    return base;
  }

  const state = load();
  let current = null;
  let lastOutput = '';

  /* Custom size: any width x height in physical pixels (divide by your Hyprland scale for logical size). */
  const monitor = () => state.monitor === 'custom'
    ? { id: 'custom', name: 'Custom', w: HC.clamp(Math.round(state.custom.w) || 1920, 320, 15360), h: HC.clamp(Math.round(state.custom.h) || 1080, 240, 8640) }
    : MONITORS.find((m) => m.id === state.monitor) || MONITORS[0];
  const save = () => HC.store.set(KEY, state);

  const stageOuter = $('#stage');
  const stageInner = $('#stage-inner');
  const out = $('#output-code');

  /* Scale the full-resolution screen into the stage. "1:1" shows real pixels around the center. */
  function fit(preferCenter) {
    const screen = stageInner.firstElementChild;
    if (!screen) return;
    const m = monitor();
    const isPixel = state.zoom === '1:1' && !screen.classList.contains('idle-stage');
    if (screen.classList.contains('idle-stage')) { stageInner.style.cssText = ''; stageOuter.classList.remove('pixel'); stageOuter.style.aspectRatio = ''; stageOuter.scrollLeft = stageOuter.scrollTop = 0; return; }
    stageOuter.classList.toggle('pixel', isPixel);
    if (isPixel) {
      stageOuter.style.aspectRatio = '';
      stageInner.style.cssText = `width:${m.w}px;height:${m.h}px;transform:none`;
      if (!preferCenter) { stageOuter.scrollLeft = (m.w - stageOuter.clientWidth) / 2; stageOuter.scrollTop = (m.h - stageOuter.clientHeight) / 2; }
      $('#zoom-note').textContent = 'Actual pixels, centered';
    } else {
      stageOuter.style.aspectRatio = `${m.w} / ${m.h}`;
      stageOuter.scrollLeft = stageOuter.scrollTop = 0;
      const s = stageOuter.clientWidth / m.w;
      stageInner.style.cssText = `width:${m.w}px;height:${m.h}px;transform:scale(${s});transform-origin:0 0`;
      $('#zoom-note').textContent = `Scaled to ${Math.round(s * 100)}%`;
    }
  }

  const ctx = {
    state, monitor, save, fit,
    side: $('#side'), toolbar: $('#toolbar'), stage: { outer: stageOuter, inner: stageInner },
    output(text) { lastOutput = text; out.textContent = text; },
  };

  function select(id) {
    const tab = HC.tabs.find((t) => t.id === id) || HC.tabs[0];
    if (current && current.unmount) current.unmount();
    current = tab; state.tab = tab.id;
    $$('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab.id)));
    $('#output-file').textContent = tab.file;
    $('#output-path').textContent = tab.path;
    $('#monitor-wrap').hidden = tab.id === 'hypridle';
    $('#zoom-wrap').hidden = tab.id === 'hypridle';
    $('#custom-res').hidden = tab.id === 'hypridle' || state.monitor !== 'custom';
    tab.mount(ctx);
    save();
  }

  /* tabs */
  const nav = $('#tabs');
  for (const t of HC.tabs) {
    nav.append(el('button', { type: 'button', role: 'tab', class: 'tab', 'data-tab': t.id, 'aria-selected': 'false', onclick: () => select(t.id) },
      el('span', { class: 'tab-name' }, t.title), el('span', { class: 'tab-blurb' }, t.blurb)));
  }

  /* monitor + zoom */
  const monSel = $('#monitor');
  MONITORS.forEach((m) => monSel.append(el('option', { value: m.id }, m.name)));
  monSel.append(el('option', { value: 'custom' }, 'Custom…'));
  monSel.value = state.monitor;
  const cw = $('#custom-w'), ch = $('#custom-h'), customWrap = $('#custom-res');
  const syncCustom = () => { customWrap.hidden = state.monitor !== 'custom'; cw.value = state.custom.w; ch.value = state.custom.h; };
  monSel.addEventListener('change', () => { state.monitor = monSel.value; syncCustom(); select(state.tab); });
  let resTimer;
  for (const [input, key] of [[cw, 'w'], [ch, 'h']]) {
    input.addEventListener('input', () => {
      const v = parseInt(input.value, 10); if (!(v > 0)) return;
      state.custom[key] = v; clearTimeout(resTimer); resTimer = setTimeout(() => select(state.tab), 250);
    });
  }
  syncCustom();
  $$('[data-zoom]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.zoom === state.zoom));
    b.addEventListener('click', () => { state.zoom = b.dataset.zoom; $$('[data-zoom]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); fit(); save(); });
  });
  window.addEventListener('resize', () => fit(true));

  /* output actions */
  $('#copy').addEventListener('click', (e) => HC.copyText(lastOutput, e.currentTarget));
  $('#download').addEventListener('click', () => HC.downloadText(current.file, lastOutput));

  /* project: export / import / reset */
  $('#export').addEventListener('click', () => HC.downloadText('hypr-generator.json', JSON.stringify(state, null, 2)));
  $('#import').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      for (const k of ['hyprlock', 'hypridle', 'hyprland']) if (data[k]) state[k] = Object.assign(fresh()[k], data[k]);
      select(state.tab); flash('Loaded ' + f.name);
    } catch { flash('That file is not a hypr-generator project.'); }
    e.target.value = '';
  });
  const resetBtn = $('#reset');
  resetBtn.addEventListener('click', () => {
    if (resetBtn.dataset.armed !== '1') { resetBtn.dataset.armed = '1'; resetBtn.textContent = 'Click again to reset'; setTimeout(() => { resetBtn.dataset.armed = ''; resetBtn.textContent = 'Reset this tab'; }, 3000); return; }
    resetBtn.dataset.armed = ''; resetBtn.textContent = 'Reset this tab';
    const f = fresh(); state[state.tab] = f[state.tab]; select(state.tab); flash('Tab reset to its starting values');
  });

  function flash(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(flash._t); flash._t = setTimeout(() => (t.hidden = true), 2600); }

  HC.loadUserFonts().then(() => HC.measureFonts()).finally(() => select(state.tab));
})();
