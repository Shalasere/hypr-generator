/* Monospace fonts the lock screen can use.
   `family` is what goes into hyprlock.conf (the font as installed on the machine).
   `css` is the closest web font used to draw the preview.
   `char` and `line` are advance width and line height as a fraction of the font's pixel size.
   They place the password field exactly after "Password:", so they are measured from the
   web font when it loads; the defaults are the installed fonts' metrics. */
(function () {
  'use strict';
  const HC = window.HC;

  HC.FONTS = [
    { id: 'inconsolata', name: 'Inconsolata Nerd Font Mono', family: 'Inconsolata Nerd Font Mono', css: "'Inconsolata', monospace", char: 0.5, line: 1.05, pkg: 'ttf-inconsolata-nerd' },
    { id: 'jetbrains', name: 'JetBrainsMono Nerd Font Mono', family: 'JetBrainsMono Nerd Font Mono', css: "'JetBrains Mono', monospace", char: 0.6, line: 1.32, pkg: 'ttf-jetbrains-mono-nerd' },
    { id: 'terminess', name: 'Terminess Nerd Font Mono', family: 'Terminess Nerd Font Mono', css: "'VT323', monospace", char: 0.5, line: 1.0, pkg: 'ttf-terminus-nerd', note: 'Linux console look. Preview uses VT323, which is narrower, so trust the shape more than the width.', measured: false },
    { id: 'plex', name: 'IBM Plex Mono', family: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace", char: 0.6, line: 1.3, pkg: 'ttf-ibm-plex' },
    { id: 'fira', name: 'FiraCode Nerd Font Mono', family: 'FiraCode Nerd Font Mono', css: "'Fira Code', monospace", char: 0.6, line: 1.25, pkg: 'ttf-firacode-nerd' },
    { id: 'spacemono', name: 'Space Mono', family: 'Space Mono', css: "'Space Mono', monospace", char: 0.612, line: 1.48, pkg: 'AUR: ttf-space-mono' },
  ];

  HC.fontById = (id) => HC.FONTS.find((f) => f.id === id) || HC.FONTS[0];

  /* The real font files for the built-in entries (official Nerd Fonts, served by jsDelivr).
     When a font is first used, the preview switches from the look-alike web font to the
     real file and re-measures, so spacing matches what hyprlock draws. */
  const REAL = 'https://cdn.jsdelivr.net/gh/ryanoasis/nerd-fonts@v3.5.1/patched-fonts/';
  const REAL_FILES = {
    inconsolata: 'Inconsolata/InconsolataNerdFontMono-Regular.ttf',
    jetbrains: 'JetBrainsMono/Ligatures/JetBrainsMonoNerdFontMono-Regular.ttf',
    terminess: 'Terminus/TerminessNerdFontMono-Regular.ttf',
    fira: 'FiraCode/FiraCodeNerdFontMono-Regular.ttf',
    plex: 'IBMPlexMono/BlexMonoNerdFontMono-Regular.ttf', // Blex is the Nerd Fonts build of IBM Plex Mono
  };
  const pending = new Map();
  /* Resolves true once the font's real file is in use (false if it could not be fetched). */
  HC.ensureRealFont = function (id) {
    const f = HC.fontById(id);
    if (f.user || f.real !== undefined || !REAL_FILES[f.id]) return Promise.resolve(!!f.real);
    if (pending.has(f.id)) return pending.get(f.id);
    const p = (async () => {
      try {
        const face = new FontFace(`hc-real-${f.id}`, `url(${REAL + REAL_FILES[f.id]})`);
        await face.load(); document.fonts.add(face);
        f.css = `'hc-real-${f.id}', ${f.css}`;
        const m = measureFace(f.css);
        f.char = m.char; f.line = m.line; f.measured = false; f.real = true;
        f.note = (f.note ? f.note + ' ' : '') + 'Preview uses the real Nerd Font file.';
        return true;
      } catch { f.real = false; return false; } // offline: keep the look-alike web font
    })();
    pending.set(f.id, p);
    return p;
  };

  /* Measure the web fonts' real advance width so the preview and the generated
     offsets agree. Fonts flagged measured:false keep their installed-font defaults. */
  HC.measureFonts = async function () {
    const cvs = document.createElement('canvas').getContext('2d');
    await Promise.all(HC.FONTS.map((f) => document.fonts.load(`100px ${f.css}`).catch(() => null)));
    for (const f of HC.FONTS) {
      if (f.measured === false) continue;
      cvs.font = `100px ${f.css}`;
      const w = cvs.measureText('MMMMMMMMMM').width / 1000;
      if (w > 0.3 && w < 0.8) f.char = Math.round(w * 1000) / 1000;
    }
  };

  /* ---------- your own font files ----------
     Loading the exact file hyprlock uses (e.g. from /usr/share/fonts) makes the preview draw
     the same glyphs with the same metrics, instead of a look-alike web font. */

  /* Read the family name hyprlock/fontconfig would use from an sfnt (TTF/OTF) 'name' table.
     Prefers the typographic family (ID 16), then the family (ID 1). Returns null for
     formats it cannot read (WOFF/WOFF2, collections). */
  function sfntFamily(buf) {
    try {
      const v = new DataView(buf);
      const tag = v.getUint32(0);
      if (tag !== 0x00010000 && tag !== 0x4f54544f /* OTTO */ && tag !== 0x74727565 /* true */) return null;
      const numTables = v.getUint16(4);
      let nameOff = -1;
      for (let i = 0; i < numTables; i++) {
        const rec = 12 + i * 16;
        if (v.getUint32(rec) === 0x6e616d65 /* name */) { nameOff = v.getUint32(rec + 8); break; }
      }
      if (nameOff < 0) return null;
      const count = v.getUint16(nameOff + 2), strOff = nameOff + v.getUint16(nameOff + 4);
      const found = {};
      for (let i = 0; i < count; i++) {
        const r = nameOff + 6 + i * 12;
        const platform = v.getUint16(r), lang = v.getUint16(r + 4), nameId = v.getUint16(r + 6);
        const len = v.getUint16(r + 8), off = strOff + v.getUint16(r + 10);
        if (nameId !== 1 && nameId !== 16) continue;
        let s = '';
        if (platform === 3 || platform === 0) { for (let j = 0; j < len; j += 2) s += String.fromCharCode(v.getUint16(off + j)); }
        else if (platform === 1) { for (let j = 0; j < len; j++) s += String.fromCharCode(v.getUint8(off + j)); }
        else continue;
        const english = platform === 3 ? lang === 0x409 : true;
        if (!found[nameId] || english) found[nameId] = s;
      }
      return found[16] || found[1] || null;
    } catch { return null; }
  }

  async function digest(buf) {
    try {
      const h = await crypto.subtle.digest('SHA-1', buf);
      return Array.from(new Uint8Array(h).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch { return Math.random().toString(16).slice(2, 14); }
  }

  /* Advance width of a cell and the line height Pango uses (ascent + descent),
     both as fractions of the pixel size, measured from the loaded file itself. */
  function measureFace(cssFamily) {
    const cvs = document.createElement('canvas').getContext('2d');
    cvs.font = `100px ${cssFamily}`;
    const m = cvs.measureText('MMMMMMMMMM');
    const char = Math.round((m.width / 1000) * 1000) / 1000;
    const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    const line = asc > 0 && desc >= 0 ? Math.round(((asc + desc) / 100) * 1000) / 1000 : 1.2;
    return { char, line };
  }

  async function register(rec) {
    const cssName = `hc-user-${rec.id}`;
    const face = new FontFace(cssName, rec.data);
    await face.load();
    document.fonts.add(face);
    const css = `'${cssName}', monospace`;
    const { char, line } = measureFace(css);
    const font = {
      id: `user-${rec.id}`, name: `${rec.family} (your file)`, family: rec.family, css, char, line,
      pkg: rec.fileName, measured: false, user: true, fileName: rec.fileName,
      note: `Drawn from ${rec.fileName}. Metrics measured from the file: ${char} wide, ${line} tall per pixel of size.`,
    };
    HC.FONTS = HC.FONTS.filter((f) => f.id !== font.id).concat(font);
    return font;
  }

  /* IndexedDB keeps the files between visits; localStorage is too small for fonts. */
  const DB = 'hypr-generator', STORE = 'fonts';
  function db() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, mode); const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(out && out.result); tx.onerror = () => reject(tx.error);
    });
  }

  /* Add a font from a File. Returns the font entry, or throws with a message for the user. */
  HC.addUserFont = async function (file) {
    if (file.size > 30 * 1024 * 1024) throw new Error(`${file.name} is over 30 MB, which is too big for a font.`);
    const data = await file.arrayBuffer();
    const h = new Uint8Array(data, 0, 2);
    if (h[0] === 0x50 && h[1] === 0x4b) { const z = await fontsFromZip(data); const f = await addFromBuffer(z.data, z.fileName); if (z.others) f.note += ` Picked ${z.fileName} from the zip (${z.others} other font files skipped).`; return f; }
    return addFromBuffer(data, file.name);
  };

  /* Nerd Fonts as single files, served by jsDelivr from the official repo (v3.5.1).
     These are the same files the Arch packages install. Paths checked 2026-11-25. */
  const NF = 'https://cdn.jsdelivr.net/gh/ryanoasis/nerd-fonts@v3.5.1/patched-fonts/';
  HC.NERD_FONTS = [
    { name: 'Inconsolata Nerd Font Mono', url: NF + 'Inconsolata/InconsolataNerdFontMono-Regular.ttf' },
    { name: 'Terminess Nerd Font Mono', url: NF + 'Terminus/TerminessNerdFontMono-Regular.ttf' },
    { name: 'JetBrainsMono Nerd Font Mono', url: NF + 'JetBrainsMono/Ligatures/JetBrainsMonoNerdFontMono-Regular.ttf' },
    { name: 'FiraCode Nerd Font Mono', url: NF + 'FiraCode/FiraCodeNerdFontMono-Regular.ttf' },
    { name: 'BlexMono Nerd Font Mono', url: NF + 'IBMPlexMono/BlexMonoNerdFontMono-Regular.ttf' },
    { name: 'Hack Nerd Font Mono', url: NF + 'Hack/HackNerdFontMono-Regular.ttf' },
    { name: 'CaskaydiaCove Nerd Font Mono', url: NF + 'CascadiaCode/CaskaydiaCoveNerdFontMono-Regular.ttf' },
  ];

  /* github.com/o/r/blob/ref/path is an HTML page; jsDelivr serves the file itself with CORS. */
  function normalizeUrl(u) {
    const m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/);
    return m ? `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}` : u;
  }

  /* Minimal ZIP reader: finds font files in the central directory and inflates the chosen one.
     Uses the browser's DecompressionStream, so no library is needed. */
  async function fontsFromZip(buf) {
    const v = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('That zip file is damaged or incomplete.');
    const count = v.getUint16(eocd + 10, true);
    let p = v.getUint32(eocd + 16, true);
    const entries = [];
    for (let i = 0; i < count; i++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
      const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
      const local = v.getUint32(p + 42, true);
      const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
      if (/\.(ttf|otf)$/i.test(name) && !name.startsWith('__MACOSX')) entries.push({ name, method, csize, local });
      p += 46 + nlen + xlen + clen;
    }
    if (!entries.length) throw new Error('That zip has no .ttf or .otf files in it.');
    // Prefer the regular-weight monospace variant, which is what a lock screen needs.
    const score = (n) => (/Mono-Regular|Mono\.|Regular/i.test(n) ? 2 : 0) + (/NerdFontMono|Mono/i.test(n) ? 1 : 0) - (/Propo|Italic|Bold|Light|Thin/i.test(n) ? 3 : 0);
    entries.sort((a, b) => score(b.name) - score(a.name));
    const e = entries[0];
    const start = e.local + 30 + v.getUint16(e.local + 26, true) + v.getUint16(e.local + 28, true);
    const raw = new Uint8Array(buf, start, e.csize);
    let data;
    if (e.method === 0) data = raw.slice().buffer;
    else if (e.method === 8) data = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    else throw new Error('That zip uses a compression method the browser cannot unpack.');
    return { data, fileName: e.name.split('/').pop(), others: entries.length - 1 };
  }

  async function addFromBuffer(data, fileName) {
    const id = await digest(data);
    const family = sfntFamily(data) || fileName.replace(/\.(ttf|otf|woff2?|ttc)$/i, '').replace(/[-_](Regular|Book|Medium)$/i, '').replace(/[-_]+/g, ' ');
    const rec = { id, family, fileName, data };
    let font;
    try { font = await register(rec); }
    catch { throw new Error(`${fileName} could not be read as a font. Use a .ttf, .otf, .woff or .woff2 file, or a .zip that contains one.`); }
    try { await idb('readwrite', (s) => s.put(rec)); } catch { font.note += ' It will not be remembered after you close the page.'; }
    return font;
  }

  /* Add a font from a link to a font file or a .zip of fonts. */
  HC.addUserFontFromUrl = async function (input) {
    const url = normalizeUrl(input.trim());
    if (!/^https?:\/\//i.test(url)) throw new Error('Enter a link that starts with https://');
    let res;
    try { res = await fetch(url, { mode: 'cors' }); }
    catch { throw new Error('That site does not let other pages download its files. Download the font yourself and use Upload, or use a GitHub or jsDelivr link.'); }
    if (!res.ok) throw new Error(`The link returned ${res.status} ${res.statusText || ''}. Check that it points at the font file itself.`.trim());
    const len = +res.headers.get('content-length');
    if (len > 60 * 1024 * 1024) throw new Error('That download is over 60 MB. Pick a single font file or a smaller zip.');
    const buf = await res.arrayBuffer();
    const name = decodeURIComponent(url.split('?')[0].split('/').pop() || 'font');
    const head = new Uint8Array(buf, 0, 4);
    if (head[0] === 0x50 && head[1] === 0x4b) { // "PK": a zip archive
      const z = await fontsFromZip(buf);
      const font = await addFromBuffer(z.data, z.fileName);
      if (z.others) font.note += ` Picked ${z.fileName} from the zip (${z.others} other font files skipped).`;
      return font;
    }
    if (head[0] === 0x3c) throw new Error('That link opens a web page, not a font file. On GitHub, use the file\'s Raw link.');
    return addFromBuffer(buf, name);
  };

  HC.removeUserFont = async function (fontId) {
    HC.FONTS = HC.FONTS.filter((f) => f.id !== fontId);
    try { await idb('readwrite', (s) => s.delete(fontId.replace(/^user-/, ''))); } catch { /* nothing stored */ }
  };

  /* Restore fonts saved in earlier visits. Never fails the page. */
  HC.loadUserFonts = async function () {
    try {
      const recs = await idb('readonly', (s) => s.getAll());
      for (const rec of recs || []) { try { await register(rec); } catch { /* skip a bad record */ } }
    } catch { /* no IndexedDB (private window etc.) */ }
  };
})();
