/* Shared helpers. Classic script (no modules) so the page also works from file://. */
(function () {
  'use strict';
  const HC = (window.HC = window.HC || {});

  HC.$ = (sel, root = document) => root.querySelector(sel);
  HC.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  HC.el = function (tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  };

  HC.clone = (o) => JSON.parse(JSON.stringify(o));
  HC.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  HC.uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------- colors ----------
     Internally a color is { hex: '#rrggbb', a: 0..1 }.
     Hyprland/hyprlock accept rgb(rrggbb), rgba(rrggbbaa) and rgba(r, g, b, a). */
  HC.color = (hex, a = 1) => ({ hex: hex.toLowerCase(), a });

  HC.toHypr = function (c) {
    const h = c.hex.replace('#', '');
    if (c.a >= 1) return `rgb(${h})`;
    const aa = Math.round(HC.clamp(c.a, 0, 1) * 255).toString(16).padStart(2, '0');
    return `rgba(${h}${aa})`;
  };

  HC.toCss = function (c) {
    const h = c.hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${c.a})`;
  };

  /* Parse what users paste: rgb(rrggbb), rgba(rrggbbaa), rgba(r,g,b,a), #rrggbb, 0xaarrggbb */
  HC.parseHypr = function (s) {
    s = String(s).trim();
    let m;
    if ((m = s.match(/^#?([0-9a-f]{6})$/i))) return HC.color('#' + m[1]);
    if ((m = s.match(/^rgb\(\s*([0-9a-f]{6})\s*\)$/i))) return HC.color('#' + m[1]);
    if ((m = s.match(/^rgba\(\s*([0-9a-f]{6})([0-9a-f]{2})\s*\)$/i))) return HC.color('#' + m[1], parseInt(m[2], 16) / 255);
    if ((m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i))) {
      const hex = '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
      return HC.color(hex, m[4] === undefined ? 1 : +m[4]);
    }
    if ((m = s.match(/^0x([0-9a-f]{2})([0-9a-f]{6})$/i))) return HC.color('#' + m[2], parseInt(m[1], 16) / 255);
    return null;
  };

  /* 0xAARRGGBB, the integer form Hyprland's Lua config uses for shadow colors */
  HC.toHexInt = function (c) {
    const aa = Math.round(HC.clamp(c.a, 0, 1) * 255).toString(16).padStart(2, '0');
    return `0x${aa}${c.hex.replace('#', '')}`;
  };

  /* ---------- Pango markup -> safe HTML for the preview ----------
     Only the tags Pango understands are kept; everything else becomes text. */
  const PANGO_TAGS = new Set(['span', 'b', 'i', 'u', 's', 'tt', 'sub', 'sup', 'big', 'small', 'br']);
  HC.pangoToNodes = function (markup) {
    const doc = new DOMParser().parseFromString(`<root>${markup.replace(/<br\s*\/?>/gi, '<br/>')}</root>`, 'application/xml');
    if (doc.querySelector('parsererror')) return [document.createTextNode(markup)];
    const walk = (n) => {
      if (n.nodeType === 3) return document.createTextNode(n.nodeValue);
      if (n.nodeType !== 1) return null;
      const tag = n.nodeName.toLowerCase();
      if (!PANGO_TAGS.has(tag)) return document.createTextNode(n.textContent);
      if (tag === 'br') return document.createElement('br');
      const out = document.createElement(tag === 'tt' ? 'code' : tag === 'span' ? 'span' : tag);
      if (tag === 'big') out.style.fontSize = '1.2em';
      if (tag === 'small') out.style.fontSize = '0.83em';
      if (tag === 'span') {
        const fg = n.getAttribute('foreground') || n.getAttribute('color') || n.getAttribute('fgcolor');
        const bg = n.getAttribute('background') || n.getAttribute('bgcolor');
        const w = n.getAttribute('weight') || n.getAttribute('font_weight');
        const st = n.getAttribute('style') || n.getAttribute('font_style');
        const sz = n.getAttribute('size') || n.getAttribute('font_size');
        if (fg && /^#[0-9a-f]{3,8}$/i.test(fg)) out.style.color = fg;
        if (bg && /^#[0-9a-f]{3,8}$/i.test(bg)) out.style.background = bg;
        if (w) out.style.fontWeight = /^\d+$/.test(w) ? w : w === 'bold' ? '700' : w === 'light' ? '300' : '';
        if (st === 'italic') out.style.fontStyle = 'italic';
        if (sz === 'larger') out.style.fontSize = '1.2em';
        else if (sz === 'smaller') out.style.fontSize = '0.83em';
        else if (sz && /^x*-?(small|large)$/.test(sz)) out.style.fontSize = sz;
      }
      for (const c of n.childNodes) { const w2 = walk(c); if (w2) out.append(w2); }
      return out;
    };
    return Array.from(doc.documentElement.childNodes).map(walk).filter(Boolean);
  };

  /* Web fonts often lack box-drawing and block glyphs, so the browser borrows them from
     another font with a different width and box edges stop lining up. The Nerd Fonts
     installed on the real machine have them. In the preview, pin each such glyph to
     exactly one character cell (1ch) so columns match what hyprlock will draw. */
  const BOXCH = /[─-▟]/;
  HC.pinBoxGlyphs = function (root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) if (BOXCH.test(walker.currentNode.nodeValue)) hits.push(walker.currentNode);
    for (const t of hits) {
      const frag = document.createDocumentFragment();
      for (const part of t.nodeValue.split(/([─-▟]+)/)) {
        if (!part) continue;
        if (!BOXCH.test(part)) { frag.append(part); continue; }
        for (const ch of part) frag.append(HC.el('span', { class: 'cell' }, ch));
      }
      t.replaceWith(frag);
    }
  };

  /* ---------- clipboard / file ---------- */
  HC.copyText = async function (text, btn) {
    const done = (msg) => { if (!btn) return; const o = btn.textContent; btn.textContent = msg; setTimeout(() => (btn.textContent = o), 1400); };
    try { await navigator.clipboard.writeText(text); done('Copied'); }
    catch {
      const ta = HC.el('textarea', { class: 'sr-only' }); ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); done('Copied'); } catch { done('Select & copy'); }
      ta.remove();
    }
  };

  HC.downloadText = function (name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = HC.el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ---------- storage (never required) ---------- */
  HC.store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window etc. */ } },
  };

  /* ---------- tiny emulation of label cmd[] output for the preview ----------
     The real lock runs the command; here we only fake the common ones. */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const p2 = (n) => String(n).padStart(2, '0');
  HC.strftime = function (fmt, d = new Date()) {
    return fmt.replace(/%([a-zA-Z%])/g, (_, c) => ({
      a: DAYS[d.getDay()].slice(0, 3), A: DAYS[d.getDay()], b: MONTHS[d.getMonth()].slice(0, 3), B: MONTHS[d.getMonth()],
      d: p2(d.getDate()), e: String(d.getDate()).padStart(2, ' '), m: p2(d.getMonth() + 1), Y: d.getFullYear(), y: p2(d.getFullYear() % 100),
      H: p2(d.getHours()), I: p2(d.getHours() % 12 || 12), M: p2(d.getMinutes()), S: p2(d.getSeconds()), p: d.getHours() < 12 ? 'AM' : 'PM',
      T: `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`, R: `${p2(d.getHours())}:${p2(d.getMinutes())}`,
      F: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, '%': '%',
    }[c] ?? _));
  };

  /* env: { user, host, kernel } */
  HC.fakeShell = function (cmd, env) {
    let out = cmd;
    out = out.replace(/\$\(\s*date\s+(?:\+)?(['"])(.*?)\1\s*\)/g, (_, q, f) => HC.strftime(f.replace(/^\+/, '')));
    out = out.replace(/\$\(\s*date\s+\+(\S+)\s*\)/g, (_, f) => HC.strftime(f));
    out = out.replace(/\$\(\s*uname -r\s*\)/g, env.kernel).replace(/\$\(\s*uname -n\s*\)/g, env.host)
      .replace(/\$\(\s*(?:cat \/etc\/hostname|hostname)\s*\)/g, env.host).replace(/\$\(\s*whoami\s*\)/g, env.user)
      .replace(/\$USER\b/g, env.user).replace(/\$HOSTNAME\b/g, env.host);
    let m;
    if ((m = out.match(/^\s*echo\s+(['"])([\s\S]*)\1\s*$/))) return m[2];
    if ((m = out.match(/^\s*date\s+\+?(['"])(.*?)\1\s*$/))) return HC.strftime(m[2].replace(/^\+/, ''));
    if ((m = out.match(/^\s*date\s+\+(\S+)\s*$/))) return HC.strftime(m[1]);
    if (/^\s*echo\s+/.test(out)) return out.replace(/^\s*echo\s+/, '');
    return null;
  };
})();
