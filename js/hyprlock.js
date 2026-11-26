/* hyprlock designer.
   Widgets are placed with hyprlock's own rules (halign/valign + position, y grows upward,
   units are monitor pixels), so what the preview shows is what the config asks for.
   Presets generate the widget list; editing a widget by hand detaches it from the preset. */
(function () {
  'use strict';
  const HC = window.HC;
  const { el, ui, color: C } = HC;

  const BOX = {
    square: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
  };

  /* ---------- defaults ---------- */
  HC.hyprlockDefaults = function () {
    return {
      preset: 'tuigreet',
      general: { hide_cursor: true, animations: false },
      background: { color: C('#000000'), path: '', blur_passes: 0 },
      // inputShift: hyprlock starts drawing password text this many character cells left
      // of the input field's edge (measured on a real 5120x1440 screen, hyprlock 0.9.7).
      calib: { ptToPx: 1.333, charAdjust: 0, lineAdjust: 0, inputShift: 1 },
      sim: { typed: 0, state: 'idle' },
      tuigreet: {
        user: 'user', host: 'archlinux', cols: 80, box: 'square', fontId: 'inconsolata', size: 14,
        fg: C('#e5e5e5'), dim: C('#8a8a8a'), border: C('#e5e5e5'), accent: C('#93c5fd'), bad: C('#fca5a5'),
        clock: true, clockFmt: '%a, %d %b %Y - %H:%M', greeting: '', boxY: 0,
        hints: true, hintsText: 'ESC Reset  F2 Change command  F3 Choose session  F12 Power  F4 Background  SESS Hyprland',
        failText: 'Login incorrect',
      },
      ly: {
        user: 'user', host: 'archlinux', fontId: 'terminess', size: 14, title: 'hi user :3',
        fg: C('#cdd6f4'), dim: C('#6c7086'), accent: C('#b4befe'), bad: C('#f38ba8'), footer: 'F1 shutdown   F2 reboot',
      },
      widgets: [],
    };
  };

  /* ---------- geometry ---------- */
  function metrics(st, fontId, size) {
    const f = HC.fontById(fontId);
    const px = size * st.calib.ptToPx;
    return { f, px, cw: (f.char + st.calib.charAdjust) * px, lh: (f.line + st.calib.lineAdjust) * px };
  }

  /* hyprlock: posFromHVAlign. Returns the widget's top-left in screen (y-down) pixels. */
  function place(W, H, w, h, x, y, halign, valign) {
    let px = x, py = y; // hyprlock coords, y up
    if (halign === 'center') px = W / 2 - w / 2 + x; else if (halign === 'right') px = W - w + x;
    if (valign === 'center') py = H / 2 - h / 2 + y; else if (valign === 'top') py = H - h + y;
    return { left: px, top: H - py - h };
  }

  /* ---------- presets ---------- */
  function boxLines(cols, style, rows) {
    const b = BOX[style] || BOX.square, inner = cols - 2;
    const pad = (s) => (s.length > inner ? s.slice(0, inner) : s + ' '.repeat(inner - s.length));
    return [b.tl + b.h.repeat(inner) + b.tr, ...rows.map((r) => b.v + pad(r) + b.v), b.bl + b.h.repeat(inner) + b.br];
  }

  const span = (c, t) => `<span foreground='${c.hex}'>${t}</span>`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function buildTuigreet(st) {
    const p = st.tuigreet; const m = metrics(st, p.fontId, p.size);
    const cols = Math.max(30, Math.round(p.cols));
    const rows = ['', ` Username: ${p.user}`, ' Password:', ''];
    const lines = boxLines(cols, p.box, rows);
    const n = lines.length; // 6
    const boxText = lines.map((l, i) => (i === 0 || i === n - 1 ? span(p.border, esc(l)) : span(p.border, esc(l[0])) + esc(l.slice(1, -1)) + span(p.border, esc(l.slice(-1))))).join('<br/>');

    const pwLine = 3; // 0-based: top border, blank, username, PASSWORD, blank, bottom
    const lineCenterY = p.boxY + (n / 2 - pwLine - 0.5) * m.lh;
    const prefix = 12; // "│ Password: "
    const fieldW = Math.round((cols - prefix - 2) * m.cw);
    const fieldH = Math.round(m.px / 0.8); // dots_size tops out at 0.8 of the field height
    const fieldX = Math.round(-cols * m.cw / 2 + (prefix + (st.calib.inputShift ?? 1)) * m.cw + fieldW / 2);
    const base = { font_size: p.size, fontId: p.fontId };

    const w = [];
    if (p.clock) w.push({ ...base, id: 'clock', type: 'label', comment: 'Clock, as tuigreet --time shows it', text: `cmd[update:1000] date +"${p.clockFmt}"`, color: p.fg, halign: 'center', valign: 'top', x: 0, y: -Math.round(m.lh) });
    if (p.greeting) w.push({ ...base, id: 'greeting', type: 'label', comment: 'Greeting above the box (tuigreet --greeting)', text: esc(p.greeting), color: p.dim, halign: 'center', valign: 'center', x: 0, y: Math.round(p.boxY + (n / 2 + 1) * m.lh) });
    w.push({ ...base, id: 'box', type: 'label', comment: `${cols}-column login box`, text: boxText, color: p.fg, halign: 'center', valign: 'center', x: 0, y: Math.round(p.boxY) });
    w.push({
      id: 'password', type: 'input-field', comment: 'Password, typed right after "Password:"', fontId: p.fontId,
      w: fieldW, h: fieldH, halign: 'center', valign: 'center', x: fieldX, y: Math.round(lineCenterY),
      outline_thickness: 0, rounding: 0, inner_color: C('#000000', 0), outer_color: C('#000000', 0), check_color: C('#000000', 0), fail_color: C('#000000', 0), capslock_color: C('#000000', 0),
      font_color: p.fg, dots_text_format: '*', dots_size: 0.8, dots_spacing: 0, dots_center: false, fade_on_empty: false,
      placeholder_text: span(p.accent, '█'), fail_text: span(p.bad, esc(p.failText)),
    });
    if (p.hints) {
      const hint = p.hintsText.replace(/(^|\s{2,})(\S+)(?=\s)/g, (all, sp, key) => `${sp}<b>${esc(key)}</b>`);
      w.push({ ...base, id: 'hints', type: 'label', comment: 'Key hints along the bottom, like tuigreet', text: hint, color: p.dim, halign: 'left', valign: 'bottom', x: Math.round(m.cw), y: Math.round(m.lh * 0.25) });
    }
    return w;
  }

  function buildLy(st) {
    const p = st.ly; const m = metrics(st, p.fontId, p.size);
    const cols = 51, title = ` ${p.title} `;
    const b = BOX.square;
    const top = b.tl + b.h + title + b.h.repeat(Math.max(1, cols - 3 - title.length)) + b.tr;
    const rows = ['', `  login:    ${p.user}`, '  password:', ''];
    const lines = [top, ...boxLines(cols, 'square', rows).slice(1)];
    const n = lines.length;
    const prefix = 13;
    const fieldW = Math.round((cols - prefix - 2) * m.cw), fieldH = Math.round(m.px / 0.8);
    return [
      { id: 'clock', type: 'label', comment: 'Big clock', fontId: p.fontId, font_size: Math.round(p.size * 2.6), text: 'cmd[update:1000] date +"%H:%M"', color: p.accent, halign: 'center', valign: 'center', x: 0, y: Math.round(m.lh * 7) },
      { id: 'date', type: 'label', comment: 'Date', fontId: p.fontId, font_size: Math.round(p.size * 0.8), text: 'cmd[update:60000] date +"%A, %B %d"', color: p.dim, halign: 'center', valign: 'center', x: 0, y: Math.round(m.lh * 4.5) },
      { id: 'box', type: 'label', comment: 'ly-style login box', fontId: p.fontId, font_size: p.size, text: lines.map(esc).join('<br/>'), color: p.fg, halign: 'center', valign: 'center', x: 0, y: 0 },
      {
        id: 'password', type: 'input-field', comment: 'Password field inside the box', fontId: p.fontId, w: fieldW, h: fieldH, halign: 'center', valign: 'center',
        x: Math.round(-cols * m.cw / 2 + (prefix + (st.calib.inputShift ?? 1)) * m.cw + fieldW / 2), y: Math.round((n / 2 - 3 - 0.5) * m.lh),
        outline_thickness: 0, rounding: 0, inner_color: C('#000000', 0), outer_color: C('#000000', 0), check_color: C('#000000', 0), fail_color: C('#000000', 0), capslock_color: C('#000000', 0),
        font_color: p.fg, dots_text_format: '*', dots_size: 0.8, dots_spacing: 0, dots_center: false, fade_on_empty: false, placeholder_text: '', fail_text: span(p.bad, 'login failed'),
      },
      { id: 'footer', type: 'label', comment: 'Footer hints', fontId: p.fontId, font_size: Math.round(p.size * 0.8), text: esc(p.footer), color: p.dim, halign: 'center', valign: 'center', x: 0, y: -Math.round(m.lh * 5) },
    ];
  }

  function buildDefault() {
    return [
      { id: 'time', type: 'label', comment: 'Clock', fontId: 'jetbrains', font_size: 90, text: '$TIME', color: C('#e5e5e5'), halign: 'right', valign: 'top', x: -30, y: 0 },
      { id: 'date', type: 'label', comment: 'Date', fontId: 'jetbrains', font_size: 25, text: 'cmd[update:60000] date +"%A, %d %B %Y"', color: C('#e5e5e5'), halign: 'right', valign: 'top', x: -30, y: -150 },
      {
        id: 'password', type: 'input-field', comment: 'Password field', fontId: 'jetbrains', w: 400, h: 60, halign: 'center', valign: 'center', x: 0, y: -20,
        outline_thickness: 3, rounding: 15, inner_color: C('#000000', 0), outer_color: C('#33ccff', 0.93), check_color: C('#00ff99', 0.93), fail_color: C('#ff6633', 0.93), capslock_color: C('#000000', 0),
        font_color: C('#8f8f8f'), dots_text_format: '', dots_size: 0.33, dots_spacing: 0.3, dots_center: true, fade_on_empty: false, placeholder_text: 'Input password...', fail_text: '$FAIL',
      },
    ];
  }

  const PRESETS = {
    tuigreet: { name: 'tuigreet', desc: 'A console login, like greetd\'s tuigreet', build: buildTuigreet },
    ly: { name: 'ly', desc: 'The ly display manager box, like asitos/hyprlock-dotfiles', build: buildLy },
    default: { name: 'hyprlock default', desc: 'The stock example config', build: buildDefault },
    custom: { name: 'custom', desc: 'Your hand-edited widgets', build: null },
  };

  HC.hyprlockRebuild = function (st) {
    const p = PRESETS[st.preset];
    if (p && p.build) st.widgets = p.build(st);
  };

  /* ---------- text of a label as it would render ---------- */
  function labelText(w, env, st) {
    let t = w.text;
    const cmd = t.match(/^cmd\[[^\]]*\]\s*([\s\S]*)$/);
    if (cmd) { const out = HC.fakeShell(cmd[1], env); t = out === null ? `⟨${cmd[1].trim()}⟩` : out; }
    const d = new Date();
    return t.replace(/\$TIME12/g, HC.strftime('%I:%M %p', d)).replace(/\$TIME/g, HC.strftime('%H:%M', d))
      .replace(/\$USER/g, env.user).replace(/\$DESC/g, env.user).replace(/\$LAYOUT(\[[^\]]*\])?/g, 'en')
      .replace(/\$FAIL/g, st.sim.state === 'fail' ? 'Authentication failed' : '').replace(/\$ATTEMPTS(\[[^\]]*\])?/g, st.sim.state === 'fail' ? '1' : '0');
  }

  /* ---------- preview ---------- */
  function renderPreview(stage, st, mon) {
    const W = mon.w, H = mon.h;
    const env = { user: st.tuigreet.user, host: st.tuigreet.host, kernel: '7.3.6-arch1-1' };
    const screen = el('div', { class: 'lock-screen', style: `width:${W}px;height:${H}px;background:${HC.toCss(st.background.color)}` });
    stage.replaceChildren(screen);

    for (const w of st.widgets) {
      const m = metrics(st, w.fontId, w.font_size || st.tuigreet.size);
      if (w.type === 'label') {
        const node = el('div', { class: 'lock-label', 'data-id': w.id });
        node.style.cssText = `font-family:${m.f.css};font-size:${m.px}px;line-height:${m.lh}px;color:${HC.toCss(w.color)}`;
        node.append(...HC.pangoToNodes(labelText(w, env, st)));
        HC.pinBoxGlyphs(node);
        screen.append(node);
        const pos = place(W, H, node.offsetWidth, node.offsetHeight, w.x, w.y, w.halign, w.valign);
        node.style.left = pos.left + 'px'; node.style.top = pos.top + 'px';
      } else if (w.type === 'shape') {
        const pos = place(W, H, w.w, w.h, w.x, w.y, w.halign, w.valign);
        screen.append(el('div', { class: 'lock-shape', style: `left:${pos.left}px;top:${pos.top}px;width:${w.w}px;height:${w.h}px;background:${HC.toCss(w.color)};border-radius:${w.rounding}px;border:${w.border_size}px solid ${HC.toCss(w.border_color)}` }));
      } else if (w.type === 'input-field') {
        const pos = place(W, H, w.w, w.h, w.x, w.y, w.halign, w.valign);
        const fail = st.sim.state === 'fail', caps = st.sim.state === 'caps';
        const outer = fail ? w.fail_color : caps ? w.capslock_color : st.sim.typed ? w.check_color : w.outer_color;
        const box = el('div', { class: 'lock-input', 'data-id': w.id });
        box.style.cssText = `left:${pos.left}px;top:${pos.top}px;width:${w.w}px;height:${w.h}px;background:${HC.toCss(w.inner_color)};` +
          `border:${w.outline_thickness}px solid ${HC.toCss(outer.a ? outer : w.outer_color)};border-radius:${w.rounding < 0 ? w.h / 2 : w.rounding}px;` +
          `justify-content:${w.dots_center ? 'center' : 'flex-start'};color:${HC.toCss(w.font_color)};font-family:${m.f.css}`;
        // Draw the text where hyprlock really puts it: shifted left of the field edge.
        const inner = el('div', { class: 'lock-input-inner', style: `margin-left:${-(st.calib.inputShift ?? 1) * m.cw}px` });
        const glyphPx = w.h * w.dots_size;
        if (fail && w.fail_text) { inner.style.fontSize = `${m.px}px`; inner.append(...HC.pangoToNodes(labelText({ text: w.fail_text }, env, st))); }
        else if (st.sim.typed > 0) {
          for (let i = 0; i < st.sim.typed; i++) {
            const d = w.dots_text_format
              ? el('span', { class: 'dot-text', style: `font-size:${glyphPx}px;margin-right:${w.dots_spacing * glyphPx}px` }, w.dots_text_format)
              : el('span', { class: 'dot', style: `width:${glyphPx}px;height:${glyphPx}px;margin-right:${w.dots_spacing * glyphPx}px;background:${HC.toCss(w.font_color)}` });
            inner.append(d);
          }
        } else if (w.placeholder_text) { inner.style.fontSize = `${m.px}px`; inner.append(...HC.pangoToNodes(labelText({ text: w.placeholder_text }, env, st))); }
        box.append(inner); screen.append(box);
      }
    }
    return screen;
  }

  /* ---------- config output ---------- */
  const q = (s) => String(s).replace(/#/g, '##'); // hyprlang: # starts a comment, ## is a literal #
  function emit(st, mon) {
    const out = [];
    const fontsUsed = [...new Set(st.widgets.map((w) => w.fontId))].map(HC.fontById);
    out.push('# hyprlock.conf, generated by hypr-generator');
    out.push(`# preset: ${PRESETS[st.preset].name}, designed for ${mon.w}x${mon.h}`);
    if (fontsUsed.length) out.push(`# fonts: ${fontsUsed.map((f) => `${f.family} (${f.pkg})`).join(', ')}`);
    out.push('', 'general {', `    hide_cursor = ${st.general.hide_cursor}`, '}', '', 'animations {', `    enabled = ${st.general.animations}`, '}', '');
    out.push('background {', '    monitor =');
    if (st.background.path) out.push(`    path = ${st.background.path}`);
    out.push(`    color = ${HC.toHypr(st.background.color)}`);
    if (st.background.blur_passes) out.push(`    blur_passes = ${st.background.blur_passes}`);
    out.push('}');
    for (const w of st.widgets) {
      const f = HC.fontById(w.fontId);
      out.push('');
      if (w.comment) out.push(`# ${w.comment}`);
      if (w.type === 'label') {
        out.push('label {', '    monitor =', `    text = ${q(w.text)}`, `    color = ${HC.toHypr(w.color)}`, `    font_size = ${w.font_size}`, `    font_family = ${f.family}`,
          `    position = ${w.x}, ${w.y}`, `    halign = ${w.halign}`, `    valign = ${w.valign}`, '}');
      } else if (w.type === 'shape') {
        out.push('shape {', '    monitor =', `    size = ${w.w}, ${w.h}`, `    color = ${HC.toHypr(w.color)}`, `    rounding = ${w.rounding}`, `    border_size = ${w.border_size}`,
          `    border_color = ${HC.toHypr(w.border_color)}`, `    position = ${w.x}, ${w.y}`, `    halign = ${w.halign}`, `    valign = ${w.valign}`, '}');
      } else if (w.type === 'input-field') {
        out.push('input-field {', '    monitor =', `    size = ${w.w}, ${w.h}`, `    position = ${w.x}, ${w.y}`, `    halign = ${w.halign}`, `    valign = ${w.valign}`,
          `    outline_thickness = ${w.outline_thickness}`, `    rounding = ${w.rounding}`,
          `    inner_color = ${HC.toHypr(w.inner_color)}`, `    outer_color = ${HC.toHypr(w.outer_color)}`, `    check_color = ${HC.toHypr(w.check_color)}`,
          `    fail_color = ${HC.toHypr(w.fail_color)}`, `    capslock_color = ${HC.toHypr(w.capslock_color)}`, `    font_color = ${HC.toHypr(w.font_color)}`,
          `    font_family = ${f.family}`, `    fade_on_empty = ${w.fade_on_empty}`);
        if (w.dots_text_format) out.push(`    dots_text_format = ${q(w.dots_text_format)}`);
        out.push(`    dots_size = ${w.dots_size}`, `    dots_spacing = ${w.dots_spacing}`, `    dots_center = ${w.dots_center}`,
          `    placeholder_text = ${q(w.placeholder_text)}`, `    fail_text = ${q(w.fail_text)}`, '}');
      }
    }
    return out.join('\n') + '\n';
  }

  /* Exposed so a config can be generated without the UI, e.g. HC.hyprlockEmit(state, { w: 5120, h: 1440 }). */
  HC.hyprlockEmit = emit;

  /* ---------- controls ---------- */
  const ALIGN_H = [['left', 'left'], ['center', 'center'], ['right', 'right']];
  const ALIGN_V = [['top', 'top'], ['center', 'center'], ['bottom', 'bottom']];
  const FONT_OPTS = () => HC.FONTS.map((f) => [f.id, f.name]);

  function presetControls(st, rebuild) {
    const box = el('div', { class: 'stack' });
    if (st.preset === 'tuigreet') {
      const p = st.tuigreet;
      box.append(
        ui.section('Login box',
          ui.grid(ui.text(p, 'user', 'Username', { onChange: rebuild }), ui.text(p, 'host', 'Hostname', { onChange: rebuild })),
          ui.grid(ui.number(p, 'cols', 'Box width (columns)', { min: 30, max: 160, onChange: rebuild, hint: 'tuigreet uses 80' }),
            ui.select(p, 'box', 'Border', Object.keys(BOX).map((k) => [k, k]), { onChange: rebuild })),
          ui.number(p, 'boxY', 'Vertical offset (px, up is positive)', { step: 10, onChange: rebuild }),
          ui.text(p, 'greeting', 'Greeting line (optional)', { onChange: rebuild, placeholder: 'Welcome back' }),
          ui.text(p, 'failText', 'Wrong password message', { onChange: rebuild })),
        ui.section('Type',
          ui.select(p, 'fontId', 'Font', FONT_OPTS(), { onChange: rebuild, hint: HC.fontById(p.fontId).note }),
          ui.range(p, 'size', 'Font size (pt)', { min: 8, max: 40, step: 1, onChange: rebuild })),
        ui.section('Colors',
          ui.grid(ui.color(p, 'fg', 'Text', { onChange: rebuild, alpha: false }), ui.color(p, 'border', 'Box border', { onChange: rebuild, alpha: false })),
          ui.grid(ui.color(p, 'dim', 'Dim text', { onChange: rebuild, alpha: false }), ui.color(p, 'accent', 'Cursor block', { onChange: rebuild, alpha: false })),
          ui.color(p, 'bad', 'Error', { onChange: rebuild, alpha: false }),
          ui.color(st.background, 'color', 'Background', { onChange: rebuild, alpha: false })),
        ui.section('Extras',
          ui.check(p, 'clock', 'Clock at the top', { onChange: rebuild }),
          ui.text(p, 'clockFmt', 'Clock format (strftime)', { onChange: rebuild }),
          ui.check(p, 'hints', 'Key hints along the bottom', { onChange: rebuild }),
          ui.text(p, 'hintsText', 'Hint text (two spaces between items)', { onChange: rebuild })));
    } else if (st.preset === 'ly') {
      const p = st.ly;
      box.append(
        ui.section('Login box',
          ui.text(p, 'title', 'Title', { onChange: rebuild }), ui.text(p, 'user', 'Username', { onChange: rebuild }), ui.text(p, 'footer', 'Footer', { onChange: rebuild })),
        ui.section('Type', ui.select(p, 'fontId', 'Font', FONT_OPTS(), { onChange: rebuild }), ui.range(p, 'size', 'Font size (pt)', { min: 8, max: 40, step: 1, onChange: rebuild })),
        ui.section('Colors',
          ui.grid(ui.color(p, 'fg', 'Text', { onChange: rebuild, alpha: false }), ui.color(p, 'accent', 'Clock', { onChange: rebuild, alpha: false })),
          ui.grid(ui.color(p, 'dim', 'Dim text', { onChange: rebuild, alpha: false }), ui.color(p, 'bad', 'Error', { onChange: rebuild, alpha: false })),
          ui.color(st.background, 'color', 'Background', { onChange: rebuild, alpha: false })));
    } else {
      box.append(ui.section('Background',
        ui.color(st.background, 'color', 'Color', { onChange: rebuild }),
        ui.text(st.background, 'path', 'Image path (or "screenshot")', { onChange: rebuild, hint: 'Not drawn in the preview' }),
        ui.number(st.background, 'blur_passes', 'Blur passes', { min: 0, max: 8, onChange: rebuild })));
    }
    return box;
  }

  function widgetEditor(st, w, changed) {
    const c = () => { st.preset = 'custom'; changed(); };
    const parts = [ui.text(w, 'comment', 'Note', { onChange: c, mono: false })];
    if (w.type === 'label') parts.push(ui.text(w, 'text', 'Text (Pango markup, cmd[update:ms] …)', { multiline: 3, onChange: c }), ui.color(w, 'color', 'Color', { onChange: c }), ui.number(w, 'font_size', 'Font size (pt)', { min: 4, max: 300, onChange: c }));
    if (w.type === 'shape') parts.push(ui.grid(ui.number(w, 'w', 'Width', { onChange: c }), ui.number(w, 'h', 'Height', { onChange: c })), ui.color(w, 'color', 'Fill', { onChange: c }), ui.color(w, 'border_color', 'Border', { onChange: c }), ui.grid(ui.number(w, 'border_size', 'Border px', { min: 0, onChange: c }), ui.number(w, 'rounding', 'Rounding', { min: -1, onChange: c })));
    if (w.type === 'input-field') parts.push(
      ui.grid(ui.number(w, 'w', 'Width', { onChange: c }), ui.number(w, 'h', 'Height', { onChange: c })),
      ui.grid(ui.number(w, 'outline_thickness', 'Outline px', { min: 0, onChange: c }), ui.number(w, 'rounding', 'Rounding (-1 = pill)', { min: -1, onChange: c })),
      ui.color(w, 'inner_color', 'Fill', { onChange: c }), ui.color(w, 'outer_color', 'Outline', { onChange: c }), ui.color(w, 'check_color', 'Outline while checking', { onChange: c }), ui.color(w, 'fail_color', 'Outline on failure', { onChange: c }),
      ui.color(w, 'font_color', 'Text / dots', { onChange: c }),
      ui.grid(ui.text(w, 'dots_text_format', 'Dot character (empty = circles)', { onChange: c }), ui.check(w, 'dots_center', 'Center dots', { onChange: c })),
      ui.grid(ui.range(w, 'dots_size', 'Dot size', { min: 0.2, max: 0.8, step: 0.01, onChange: c }), ui.range(w, 'dots_spacing', 'Dot spacing', { min: -1, max: 1, step: 0.01, onChange: c })),
      ui.text(w, 'placeholder_text', 'Placeholder', { onChange: c }), ui.text(w, 'fail_text', 'Failure text', { onChange: c }));
    parts.push(
      ui.select(w, 'fontId', 'Font', FONT_OPTS(), { onChange: c }),
      ui.grid(ui.select(w, 'halign', 'Horizontal anchor', ALIGN_H, { onChange: c }), ui.select(w, 'valign', 'Vertical anchor', ALIGN_V, { onChange: c })),
      ui.grid(ui.number(w, 'x', 'Offset x', { onChange: c }), ui.number(w, 'y', 'Offset y (up +)', { onChange: c })));
    return el('div', { class: 'widget-body' }, ...parts);
  }

  function widgetList(st, changed) {
    const list = el('div', { class: 'widget-list' });
    st.widgets.forEach((w, i) => {
      const det = el('details', { class: 'widget' });
      det.append(el('summary', {}, el('span', { class: 'wtype' }, w.type), el('span', { class: 'wname' }, w.comment || w.id),
        el('button', { type: 'button', class: 'icon-btn', title: 'Remove widget', 'aria-label': `Remove ${w.comment || w.id}`, onclick: (e) => { e.preventDefault(); st.widgets.splice(i, 1); st.preset = 'custom'; changed(true); } }, '×')));
      det.addEventListener('toggle', () => { if (det.open && !det.querySelector('.widget-body')) det.append(widgetEditor(st, w, changed)); }, { once: false });
      list.append(det);
    });
    const add = (type) => {
      const fontId = st.tuigreet.fontId;
      const base = { id: HC.uid(), fontId, halign: 'center', valign: 'center', x: 0, y: 0 };
      if (type === 'label') st.widgets.push({ ...base, type, comment: 'New label', text: 'Hello', color: C('#e5e5e5'), font_size: 14 });
      if (type === 'shape') st.widgets.push({ ...base, type, comment: 'New shape', w: 300, h: 80, color: C('#1f2937', 0.6), border_color: C('#93c5fd'), border_size: 2, rounding: 0 });
      st.preset = 'custom'; changed(true);
    };
    list.append(el('div', { class: 'row-btns' },
      el('button', { type: 'button', class: 'btn', onclick: () => add('label') }, 'Add label'),
      el('button', { type: 'button', class: 'btn', onclick: () => add('shape') }, 'Add shape')));
    return list;
  }

  /* ---------- fonts panel: upload, link, Nerd Fonts quick picks ---------- */
  function fontsSection(st, after) {
    const status = el('p', { class: 'hint font-status', role: 'status', 'aria-live': 'polite' });
    const say = (msg, bad) => { status.textContent = msg; status.classList.toggle('bad', !!bad); };
    const use = (font) => {
      if (st.preset === 'tuigreet') st.tuigreet.fontId = font.id;
      else if (st.preset === 'ly') st.ly.fontId = font.id;
      else st.widgets.forEach((w) => (w.fontId = font.id));
    };
    const run = async (label, fn) => {
      say(`Loading ${label}…`);
      try { const font = await fn(); use(font); say(`Using ${font.family}: ${font.char} wide, ${font.line} line height.`); after(); }
      catch (e) { say(e.message || String(e), true); }
    };

    const file = el('input', { type: 'file', id: 'font-file', accept: '.ttf,.otf,.woff,.woff2,.zip,font/*', class: 'sr-only' });
    file.addEventListener('change', () => { const f = file.files[0]; if (f) run(f.name, () => HC.addUserFont(f)); file.value = ''; });
    const drop = el('label', { class: 'drop', for: 'font-file' }, el('strong', {}, 'Upload a font'), el('span', {}, '.ttf, .otf, .woff2 or a .zip. On Linux, installed fonts are in /usr/share/fonts.'));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) run(f.name, () => HC.addUserFont(f)); });

    const url = el('input', { type: 'url', id: 'font-url', class: 'mono', placeholder: 'https://…/SomeFont-Regular.ttf or .zip', spellcheck: 'false' });
    const load = el('button', { type: 'button', class: 'btn', onclick: () => url.value.trim() && run('the link', () => HC.addUserFontFromUrl(url.value)) }, 'Load');
    url.addEventListener('keydown', (e) => { if (e.key === 'Enter') load.click(); });

    const picks = el('div', { class: 'preset-row' }, HC.NERD_FONTS.map((n) =>
      el('button', { type: 'button', class: 'preset', title: n.url, onclick: () => run(n.name, () => HC.addUserFontFromUrl(n.url)) }, n.name.replace(' Nerd Font Mono', ''))));

    const mine = HC.FONTS.filter((f) => f.user);
    const list = mine.length ? el('div', { class: 'widget-list' }, mine.map((f) =>
      el('div', { class: 'font-row' },
        el('div', { class: 'font-meta' }, el('span', { class: 'font-name', style: `font-family:${f.css}` }, f.family), el('span', { class: 'hint' }, `${f.fileName} · ${f.char} × ${f.line}`)),
        el('button', { type: 'button', class: 'btn ghost', onclick: () => { use(f); after(); } }, 'Use'),
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${f.family}`, onclick: async () => { await HC.removeUserFont(f.id); after(); } }, '×')))) : null;

    return ui.section('Fonts',
      el('p', { class: 'hint' }, 'Load the exact font file hyprlock uses so the preview draws the same glyphs and spacing. Fonts you add are kept in this browser.'),
      file, drop,
      el('div', { class: 'field' }, el('label', { for: 'font-url' }, 'Or a link to a font file or zip'), el('div', { class: 'url-row' }, url, load)),
      el('div', { class: 'field' }, el('label', {}, 'Nerd Fonts (official files via jsDelivr)'), picks),
      status, list);
  }

  /* ---------- tab ---------- */
  HC.tabs = HC.tabs || [];
  HC.tabs.push({
    id: 'hyprlock', title: 'hyprlock', file: 'hyprlock.conf', path: '~/.config/hypr/hyprlock.conf',
    blurb: 'Lock screen',
    mount(ctx) {
      const st = ctx.state.hyprlock;
      // Regenerate preset widgets so they pick up freshly measured font metrics.
      if (st.preset !== 'custom' || !st.widgets.length) HC.hyprlockRebuild(st);
      const side = ctx.side, stage = ctx.stage, toolbar = ctx.toolbar;

      const drawSide = () => {
        const presetRow = el('div', { class: 'preset-row', role: 'radiogroup', 'aria-label': 'Preset' },
          Object.entries(PRESETS).filter(([k]) => k !== 'custom' || st.preset === 'custom').map(([k, p]) =>
            el('button', { type: 'button', role: 'radio', 'aria-checked': String(st.preset === k), class: 'preset' + (st.preset === k ? ' on' : ''), title: p.desc,
              onclick: () => { if (k === 'custom') return; st.preset = k; HC.hyprlockRebuild(st); drawSide(); redraw(); } }, p.name)));
        const rebuild = () => { if (st.preset !== 'custom') HC.hyprlockRebuild(st); redraw(); };
        side.replaceChildren(
          ui.section('Preset', presetRow, el('p', { class: 'hint' }, PRESETS[st.preset].desc)),
          presetControls(st, rebuild),
          fontsSection(st, () => { if (st.preset !== 'custom') HC.hyprlockRebuild(st); drawSide(); redraw(); }),
          ui.section('Widgets', el('p', { class: 'hint' }, st.preset === 'custom' ? 'Hand-edited. Pick a preset to start over.' : 'Generated by the preset. Editing one switches to custom.'), widgetList(st, (structural) => { if (structural) drawSide(); redraw(); })),
          ui.section('Calibration',
            el('p', { class: 'hint' }, 'hyprlock sizes text in points. If the password lands left or right of "Password:" on the real screen, nudge the character width; if it sits high or low, nudge the line height.'),
            ui.range(st.calib, 'ptToPx', 'Points to pixels', { min: 1, max: 1.6, step: 0.001, onChange: rebuild, fmt: (v) => v.toFixed(3) }),
            ui.range(st.calib, 'charAdjust', 'Character width adjust', { min: -0.1, max: 0.1, step: 0.002, onChange: rebuild, fmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(3) }),
            ui.range(st.calib, 'lineAdjust', 'Line height adjust', { min: -0.3, max: 0.3, step: 0.005, onChange: rebuild, fmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(3) }),
            ui.range(st.calib, 'inputShift', 'Password text starts this many columns left of its field', { min: -3, max: 3, step: 0.25, onChange: rebuild, fmt: (v) => (v >= 0 ? '+' : '') + v, hint: 'Measured as 1 on hyprlock 0.9.7. The generated field moves right by this much so the * land after "Password:".' })),
          ui.section('General', ui.check(st.general, 'hide_cursor', 'Hide the mouse cursor', { onChange: redraw }), ui.check(st.general, 'animations', 'Fade animations', { onChange: redraw })));
      };

      const simBar = el('div', { class: 'sim', role: 'group', 'aria-label': 'Simulate the lock screen' },
        el('span', { class: 'sim-label' }, 'Simulate'),
        ...[['idle', 'Idle'], ['typing', 'Typing'], ['fail', 'Wrong password'], ['caps', 'Caps Lock']].map(([k, t]) =>
          el('button', { type: 'button', class: 'chip', 'data-sim': k, 'aria-pressed': String(st.sim.state === k), onclick: () => { st.sim.state = k; st.sim.typed = k === 'typing' ? 9 : k === 'caps' ? 4 : 0; syncSim(); redraw(); } }, t)));
      const syncSim = () => HC.$$('[data-sim]', simBar).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sim === st.sim.state)));
      toolbar.replaceChildren(simBar);

      const redraw = () => {
        // Swap in the real font files for any fonts in use; when one arrives, metrics change,
        // so regenerate the preset and draw again.
        const ids = [...new Set(st.widgets.map((w) => w.fontId))];
        Promise.all(ids.map(HC.ensureRealFont)).then((got) => {
          if (got.some(Boolean) && !this._realDone?.has(ids.join())) {
            (this._realDone ??= new Set()).add(ids.join());
            if (st.preset !== 'custom') HC.hyprlockRebuild(st);
            redraw();
          }
        });
        renderPreview(stage.inner, st, ctx.monitor());
        ctx.fit();
        ctx.output(emit(st, ctx.monitor()));
        ctx.save();
      };
      drawSide(); redraw();
      this._redraw = redraw;
      // Labels are positioned from their measured size, so measure again once any
      // web font (including ones first used by this preset) has finished loading.
      this._fontsDone = () => { renderPreview(stage.inner, st, ctx.monitor()); ctx.fit(true); };
      document.fonts.addEventListener('loadingdone', this._fontsDone);
      document.fonts.ready.then(this._fontsDone);
      this._tick = setInterval(() => { if (document.visibilityState === 'visible') renderPreview(stage.inner, st, ctx.monitor()), ctx.fit(); }, 30000);
    },
    unmount() { clearInterval(this._tick); if (this._fontsDone) document.fonts.removeEventListener('loadingdone', this._fontsDone); },
    refresh() { this._redraw && this._redraw(); },
  });
})();
