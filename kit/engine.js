/* FenixMex NOM-020 — motor de generación (plantilla + capa de datos).
   Requires globals: PDFLib, fontkit. Exposes FXEngine. */
(function (root) {
  'use strict';
  const L = () => root.PDFLib;
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const pad = n => String(n).padStart(2, '0');
  const num = v => (v === '' || v == null || isNaN(parseFloat(String(v).replace(',', '.')))) ? null : parseFloat(String(v).replace(',', '.'));
  const fx = (v, d) => { const n = num(v); return n == null ? '' : n.toFixed(d); };
  const titleCase = s => (s || '').toLowerCase().replace(/(^|[\s\-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());

  function categoria(pcal) {
    const p = num(pcal);
    if (p == null) return '';
    if (p < 5) return 'I';
    if (p <= 8) return 'II';
    return 'III';
  }

  function parseFecha(f) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f || '');
    if (!m) return null;
    return { Y: +m[1], M: +m[2], D: +m[3] };
  }

  function dates(f) {
    const p = parseFecha(f) || { Y: new Date().getFullYear(), M: 1, D: 1 };
    const { Y, M, D } = p;
    const mes = MESES[M - 1], ys = String(Y), yy = ys.slice(-2);
    const wd = (new Date(Y, M - 1, D).getDay() + 6) % 7; // 0 = LUNES
    return {
      Y, M, D, month: M, wd,
      dmy: `${pad(D)}/${pad(M)}/${Y}`,
      mesYY: `${mes}-${yy}`,
      mesY: `${mes}/${Y}`,
      MESANIO: `${mes.toUpperCase()}-${Y}`,
      anio: ys, yy, yLast: ys.slice(-1),
      y0: ys[0], y1: ys[1], y2: ys[2], y3: ys[3],
      larga: `${D} DE ${mes.toUpperCase()} DE ${Y}`,
      larga2: `${pad(D)} de ${cap(mes)} de ${Y}`,
      cdmx: `Ciudad de México ${pad(D)} de ${cap(mes)} de ${Y}`
    };
  }

  // ---- reglas de negocio (parche 2026-09) ----
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const RX_COMPRESOR = /\bCOMPRESOR(?:A|ES)?\s+(?:DE\s+)?AIRE\b/;
  function esCompresor(nombre) { return RX_COMPRESOR.test(norm(nombre)); }
  // Hoja 10 / 66 (parche v3): tipo y diámetro de la válvula de seguridad vienen de la captura, para todos los equipos.
  const TIPOS_VALVULA = ['SILBATO', 'CAMPANA', 'ARGOLLA'];
  const KPA = 98.07; // kPa por kg/cm² (hoja 66)
  const fmtMiles = (n, d) => { const [a, b] = n.toFixed(d).split('.'); return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); };
  const kpa = v => { const n = num(v); return n == null ? '' : fmtMiles(n * KPA, 2); };
  function valvula(e) {
    const comp = esCompresor(e.nombre);
    let tipo = norm(e.tipoValvula);
    if (!TIPOS_VALVULA.includes(tipo)) tipo = e.tipoValvula == null && comp ? 'ARGOLLA' : 'SILBATO'; // borradores previos a v3: el compresor conserva ARGOLLA Ø 6
    let d = e.diametroValvulaMm == null ? (comp ? '6' : '') : String(e.diametroValvulaMm);
    d = d.replace(',', '.').replace(/\s*mm$/i, '').trim();
    return { tipo, diam: d, ficha: 'VÁLVULA DE SEGURIDAD TIPO ' + tipo + (d ? ', Ø ' + d + 'mm' : '') };
  }
  // Hoja 23 (v4): compresor = exactamente 2 renglones, manómetro y válvula (el "1" es fijo); otro equipo = solo su nombre.
  function items23(e) {
    const n = String(e.nombre || '').trim();
    if (!n) return [];
    return esCompresor(n) ? ['MANOMETRO 1 - ' + n, 'VALVULA DE SEGURIDAD 1 - ' + n] : [n];
  }
  // Hoja 96 (v4): periodo de ejecución. Una sola fecha para "De" y "a", del mismo año de la PND.
  // PND en marzo o después: se salta el mes anterior y se elige al azar un mes de 1…M-2 y un día válido.
  // PND en enero o febrero: fecha al azar desde el 1 de enero hasta 7–14 días antes de la PND.
  function periodo96(g) {
    const Y = g.Y, M = g.M, D = g.D;
    if (M >= 3) { const m = 1 + rnd(M - 2), dim = new Date(Y, m, 0).getDate(); return { Y, M: m, D: 1 + rnd(dim) }; }
    const ini = Date.UTC(Y, 0, 1), lim = Date.UTC(Y, M - 1, D - (7 + rnd(8)));
    if (lim < ini) return { Y, M: 1, D: 1 };
    const t = new Date(ini + rnd(Math.round((lim - ini) / 864e5) + 1) * 864e5);
    return { Y, M: t.getUTCMonth() + 1, D: t.getUTCDate() };
  }
  // Hoja 109: se incluye (una sola vez) si hay al menos un equipo Cat III.
  function incluye109(cats) { return cats.some(c => c === 'III'); }

  function minOf(arr) {
    const v = (arr || []).map(num).filter(x => x != null);
    return v.length ? Math.min(...v) : null;
  }

  function equipoCtx(e, i) {
    const pcal = num(e.presionCalibracion);
    const cat = e.clasificacion || categoria(e.presionCalibracion);
    const vv = valvula(e);
    const o = {
      nombre: (e.nombre || '').trim(), ns: (e.numeroSerie || '').trim(), tag: (e.tag || '').trim(),
      cat, fluido: e.fluido || '',
      cv: fx(e.capacidadVolumetrica, 3), cv4: fx(e.capacidadVolumetrica, 4),
      pop: fx(e.presionOperacion, 2), pop1: fx(e.presionOperacion, 1), pcal: fx(e.presionCalibracion, 2),
      pdis: fx(e.presionDiseno, 2), pmax: fx(e.presionTrabajoMaxPermitida, 2), phid: fx(e.presionPruebaHidrostatica, 2),
      tdis: fx(e.tempDiseno, 2), top: fx(e.tempOperacion, 2),
      relevo: e.tipoDispositivoRelevo || '',
      relevoFicha: vv.ficha, valvTipo: vv.tipo, valvDiam: vv.diam,
      tmax1: fx(e.tempDiseno, 1), pmaxKpa: kpa(e.presionTrabajoMaxPermitida),
      parr: fx(e.presionArranque, 2), parrKpa: kpa(e.presionArranque), popKpa: kpa(e.presionOperacion), // hoja 66 (v4): disparo = arranque, cierre = operación
      comp: esCompresor(e.nombre),
      ndisp: String(e.numDispositivosRelevo ?? ''), ubic: e.ubicacion || '',
      anio: (e.anioFabricacion || '').trim() || 'S/D', anioSD: (e.anioFabricacion || '').trim() || 'S/D',
      marca: e.marca || '', modelo: e.modelo || '',
      pndS: e.pndSuperficial || '', pndV: e.pndVolumetrica || '',
      cod: e.codigoMemoriaCalculo || '', folio: e.folio || '',
      kpaCal: pcal == null ? '' : String(Math.floor(pcal * 98.0665)),
      i
    };
    const cols = { env: e.espEnv, sup: e.espSup, inf: e.espInf };
    for (const k of Object.keys(cols)) {
      const a = cols[k] || [];
      for (let j = 0; j < 16; j++) o[k + (j + 1)] = fx(a[j], 2);
    }
    const mE = minOf(e.espEnv), mS = minOf(e.espSup), mI = minOf(e.espInf);
    o.minEnv = mE == null ? '' : mE.toFixed(2);
    o.minSup = mS == null ? '' : mS.toFixed(2);
    o.minInf = mI == null ? '' : mI.toFixed(2);
    return o;
  }

  // v4: un solo nombre legal de la empresa; usuario y propietario imprimen lo mismo.
  function razonSocial(st) { return String(st.razonSocialPropietario || st.razonSocialUsuario || '').trim(); }

  function baseCtx(st) {
    const eqs = st.equipos || [];
    const maxF = eqs.map(e => e.fechaPnd).filter(parseFecha).sort().pop() || '';
    return {
      rs: razonSocial(st), rsp: razonSocial(st), rfc: String(st.rfcEmpresa || '').replace(/\s+/g, '').slice(0, 12),
      dom: st.domicilio || '', rep: st.representanteLegalNombre || '',
      t1: st.testigo1Nombre || '', t1curp: st.testigo1Curp || '', t2: st.testigo2Nombre || '',
      fi: st.firmanteIzquierdoNombre || '', fiCed: st.firmanteIzquierdoCedula || '', fiT: titleCase(st.firmanteIzquierdoNombre || ''),
      pnd1n: st.pnd1Nombre || '', pnd2n: st.pnd2Nombre || '',
      g: dates(maxF)
    };
  }

  function interp(tpl, ctx) {
    return tpl.replace(/\{([\w.]+)\}/g, (m, path) => {
      let v = ctx;
      for (const k of path.split('.')) { v = v == null ? undefined : v[k]; }
      return v == null ? '' : String(v);
    });
  }

  // ---------- plan ----------
  function chunk(a, n) { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r.length ? r : [[]]; }

  function planExp(st, map) {
    const eqs = (st.equipos || []).map((e, i) => ({ e, i: i + 1 }));
    const seq = [];
    const add = (tp, x) => seq.push(Object.assign({ tp }, x || {}));
    const each = (tp) => eqs.forEach(q => add(tp, q));
    add(1); add(2);
    chunk(eqs, map.spec.p3.maxRows).forEach((c, k) => add(3, { rows: c, rowStart: k * map.spec.p3.maxRows }));
    add(4); add(5);
    chunk(eqs, map.spec.p6.maxRows).forEach((c, k) => add(6, { rows: c, rowStart: k * map.spec.p6.maxRows }));
    add(7);
    eqs.forEach(q => { for (let t = 8; t <= 18; t++) add(t, q); });
    add(19); each(20); add(21); add(22);
    { // Hoja 23 compartida: se llena por ítems y se duplica cuando se acaban los renglones (no se parte un equipo).
      const cap = (map.spec.p23 && map.spec.p23.y.length - 1) || 7, pgs = []; let cur = [];
      for (const q of eqs) { const its = items23(q.e); if (cur.length && cur.length + its.length > cap) { pgs.push(cur); cur = []; } cur = cur.concat(its); }
      pgs.push(cur);
      pgs.forEach(its => add(23, { items23: its }));
    }
    for (let t = 24; t <= 43; t++) add(t);
    each(44); add(45); each(46); add(47); each(48);
    for (let t = 49; t <= 61; t++) add(t);
    each(62); add(63); each(64); add(65);
    eqs.filter(q => equipoCtx(q.e, q.i).cat === 'III').forEach(q => add(66, q));
    add(67); each(68); add(69);
    eqs.forEach(q => { for (let t = 70; t <= 75; t++) add(t, q); });
    for (let t = 76; t <= 101; t++) add(t);
    each(102); add(103); add(104); add(105); each(106); add(107); each(108); // hoja 107: una sola vez por expediente
    if (incluye109(eqs.map(q => equipoCtx(q.e, q.i).cat))) add(109);
    return seq;
  }

  // ---------- pdf helpers ----------
  const FONT_KEYS = ['R','B','I','N','NB','S','SB','SI','SBI','DJ','DJB','RND'];
  function safeText(t) { return String(t).replace(/[\u0000-\u001f]/g, ' ').replace(/[^\u0020-\u00ff\u2018\u2019\u201c\u201d\u2013\u2014\u2022\u2026\u20ac\u03a9\u2212]/g, '?'); }

  function clonePage(doc, page) {
    const { PDFName, PDFArray, PDFPageLeaf, PDFPage } = L();
    const ctx = doc.context, node = page.node;
    const map = new Map(node.entries());
    const leaf = PDFPageLeaf.fromMapWithContext(map, ctx, false);
    const c = node.get(PDFName.of('Contents'));
    const arr = PDFArray.withContext(ctx);
    if (c instanceof PDFArray) c.asArray().forEach(x => arr.push(x)); else if (c) arr.push(c);
    leaf.set(PDFName.of('Contents'), arr);
    const res = node.get(PDFName.of('Resources'));
    if (res) { const r = ctx.lookup(res); leaf.set(PDFName.of('Resources'), r.clone(ctx)); }
    leaf.delete(PDFName.of('Annots'));
    const ref = ctx.register(leaf);
    return PDFPage.of(leaf, ref, doc);
  }

  function prependFills(doc, page, rects) {
    if (!rects.length) return;
    const { pushGraphicsState, popGraphicsState, setFillingRgbColor, rectangle, fill, PDFName, PDFArray } = L();
    const ops = [pushGraphicsState()];
    for (const [x, y, w, h, c] of rects) ops.push(setFillingRgbColor(c[0], c[1], c[2]), rectangle(x, y, w, h), fill());
    ops.push(popGraphicsState());
    const ref = doc.context.register(doc.context.contentStream(ops));
    const node = page.node;
    let c = node.get(PDFName.of('Contents'));
    if (!(c instanceof PDFArray)) { const a = PDFArray.withContext(doc.context); if (c) a.push(c); node.set(PDFName.of('Contents'), a); c = a; }
    c.insert(0, ref);
  }

  async function makeKit(doc, fontBytes) {
    doc.registerFontkit(root.fontkit);
    const cache = {};
    return {
      async font(k) {
        if (!cache[k]) cache[k] = await doc.embedFont(fontBytes[k] || fontBytes.R, { subset: false });
        return cache[k];
      }
    };
  }

  function sniff(bytes) {
    if (!bytes || bytes.length < 4) return null;
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
    return null;
  }

  async function imageCache(doc) {
    const c = new Map();
    return async (key, bytes) => {
      if (!bytes) return null;
      if (c.has(key)) return c.get(key);
      const t = sniff(bytes);
      const img = t === 'png' ? await doc.embedPng(bytes) : t === 'jpg' ? await doc.embedJpg(bytes) : null;
      c.set(key, img); return img;
    };
  }

  function drawFit(page, img, slot, dy, opts) {
    const { rgb, degrees } = L();
    const W = slot.w, H = slot.h, y0 = slot.y + (dy || 0);
    if (opts && opts.white) page.drawRectangle({ x: slot.x + 0.6, y: y0 + 0.6, width: W - 1.2, height: H - 1.2, color: rgb(1, 1, 1) });
    const ar = img.width / img.height;
    if (slot.r === -90) { // visual box: width=H, height=W
      let iw = H, ih = H / ar; if (ih > W) { ih = W; iw = W * ar; }
      page.drawImage(img, { x: slot.x + (W - ih) / 2, y: y0 + H - (H - iw) / 2, width: iw, height: ih, rotate: degrees(-90) });
      return;
    }
    let iw = W, ih = W / ar; if (ih > H) { ih = H; iw = H * ar; }
    let x = slot.x + (W - iw) / 2, y = y0 + (H - ih) / 2;
    if (slot.va === 'b') y = y0;               // firma pegada al nombre (base de la casilla)
    else if (slot.va === 't') y = y0 + H - ih;
    if (slot.clip) x = Math.max(slot.clip[0], Math.min(x, slot.clip[1] - iw)); // nunca cruzar los bordes de la celda
    page.drawImage(img, { x, y, width: iw, height: ih });
  }

  function color(c) { const { rgb } = L(); return c ? rgb(c[0], c[1], c[2]) : rgb(0, 0, 0); }

  async function drawField(page, kit, fd, ctx, dy) {
    const { degrees, rgb } = L();
    dy = dy || 0;
    const font = await kit.font(fd.f);
    if (fd.wipe) page.drawRectangle({ x: fd.wipe[0], y: fd.wipe[1] + dy, width: fd.wipe[2], height: fd.wipe[3], color: rgb(1, 1, 1) });
    const text = safeText(interp(fd.k, ctx)).replace(/\s+$/, '');
    if (fd.t === 'fit') return drawFitText(page, font, fd, interp(fd.k, ctx).split('\n').map(x => safeText(x).trim()).join('\n'), dy);
    if (fd.t === 'blk') return drawBlock(page, font, fd, text, dy);
    if (fd.t === 'flow') return drawFlow(page, font, fd, text, dy);
    if (!text.trim()) return;
    let size = fd.s;
    let w = font.widthOfTextAtSize(text, size);
    if (fd.mw && w > fd.mw) { size = Math.max(size * 0.35, size * fd.mw / w); w = font.widthOfTextAtSize(text, size); }
    const ang = (fd.r || 0) * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang);
    let x = fd.x, y = fd.y + dy;
    if (fd.a === 'c') { x = (fd.x + fd.ex) / 2 - ux * w / 2; y = (fd.y + fd.ey) / 2 + dy - uy * w / 2; }
    else if (fd.a === 'r') { x = fd.ex - ux * w; y = fd.ey + dy - uy * w; }
    page.drawText(text, { x, y, size, font, color: color(fd.c), rotate: degrees(fd.r || 0), ySkew: degrees(fd.sk || 0) });
  }

  // ---- texto ajustado a celda: margen, corte solo entre palabras, reduce tamaño hasta caber, centrado vertical ----
  function fitLayout(font, text, fd) {
    const [x0, y0, x1, y1] = fd.box, px = fd.pad == null ? 3 : fd.pad, py = fd.padY == null ? 1.2 : fd.padY;
    const W = x1 - x0 - 2 * px, H = y1 - y0 - 2 * py, lhf = fd.lh || 1.12, maxL = fd.ml || 99;
    const slant = fd.sk ? Math.tan(fd.sk * Math.PI / 180) * 0.7 : 0;
    const wAt = (t, s) => font.widthOfTextAtSize(t, s) + slant * s;
    const paras = String(text).split('\n').map(x => x.trim()).filter(Boolean);
    const lay = s => {
      const out = [];
      for (const p of paras) {
        let cur = '';
        for (const w of p.split(/\s+/)) {
          if (wAt(w, s) > W) {
            // nunca partir una palabra; solo se permite cortar después de un guion (NOM-020-/STPS-2011)
            const parts = w.match(/[^-]+-?|-/g) || [w]; if (parts.length < 2) return null;
            if (cur) { out.push(cur); cur = ''; }
            for (const pc of parts) { if (wAt(pc, s) > W) return null; const t = cur + pc; if (!cur || wAt(t, s) <= W) cur = t; else { out.push(cur); cur = pc; } }
            continue;
          }
          const t = cur ? cur + ' ' + w : w;
          if (!cur || wAt(t, s) <= W) cur = t; else { out.push(cur); cur = w; }
        }
        if (cur) out.push(cur);
      }
      return out;
    };
    let s = fd.s;
    for (;;) {
      const L = lay(s);
      if (L && L.length <= maxL && (L.length - 1) * s * lhf + 0.95 * s <= H) return { s, lines: L, px, lhf };
      if (s <= 3) return { s, lines: L || paras, px, lhf };
      s = Math.max(3, s * 0.96);
    }
  }

  function drawFitText(page, font, fd, text, dy) {
    if (!text.trim()) return;
    const { pushGraphicsState, popGraphicsState, setTextRenderingMode, TextRenderingMode, setLineWidth, degrees } = L();
    const { s, lines, px, lhf } = fitLayout(font, text, fd);
    const [x0, y0, x1, y1] = fd.box, lh = s * lhf, tan = fd.sk ? Math.tan(fd.sk * Math.PI / 180) : 0;
    let base = (y0 + y1) / 2 + dy + (lines.length - 1) * lh / 2 - 0.34 * s;
    if (fd.bold) page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.FillAndOutline), setLineWidth(fd.bold));
    lines.forEach((ln, k) => {
      const w = font.widthOfTextAtSize(ln, s), a = fd.a || 'c';
      const x = a === 'l' ? x0 + px : a === 'r' ? x1 - px - w - tan * 0.7 * s : (x0 + x1) / 2 - w / 2 - tan * 0.35 * s;
      page.drawText(ln, { x, y: base - k * lh, size: s, font, color: color(fd.c), ySkew: degrees(fd.sk || 0) });
    });
    if (fd.bold) page.pushOperators(popGraphicsState());
  }

  function wrap(font, text, size, maxW) {
    const words = text.split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (!cur || font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawBlock(page, font, fd, text, dy) {
    if (!text.trim()) return;
    let size = fd.s, lh = fd.lh, lines = wrap(font, text, size, fd.mw);
    const maxLines = Math.max(fd.n0 + 1, 3);
    while ((lines.length > maxLines || lines.some(l => font.widthOfTextAtSize(l, size) > fd.mw * 1.001)) && size > fd.s * 0.55) {
      size *= 0.93; lh = fd.lh * size / fd.s; lines = wrap(font, text, size, fd.mw);
    }
    const y0 = fd.y + dy - (fd.n0 - 1) * fd.lh / 2 + (lines.length - 1) * lh / 2;
    lines.forEach((ln, k) => {
      const w = font.widthOfTextAtSize(ln, size);
      const x = fd.a === 'c' ? fd.x - w / 2 : fd.x;
      page.drawText(ln, { x, y: y0 - k * lh, size, font, color: color(fd.c), ySkew: L().degrees(fd.sk || 0) });
    });
  }

  function drawFlow(page, font, fd, text, dy) {
    if (!text.trim()) return;
    let size = fd.s;
    for (let attempt = 0; attempt < 8; attempt++) {
      const words = text.split(/\s+/).filter(Boolean); const out = []; let si = 0, cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (!cur || font.widthOfTextAtSize(t, size) <= fd.slots[si][2]) cur = t;
        else { out.push(cur); cur = w; si++; if (si >= fd.slots.length) break; }
      }
      if (si < fd.slots.length) { if (cur) out.push(cur);
        out.forEach((ln, k) => page.drawText(ln, { x: fd.slots[k][0], y: fd.slots[k][1] + dy, size, font, color: color(fd.c), ySkew: L().degrees(fd.sk || 0) }));
        return; }
      size *= 0.92;
    }
  }

  // ---------- specials ----------
  async function specialP3(page, kit, map, base, item) {
    const s = map.spec.p3, f = await kit.font(s.f), size = s.size, sk = L().degrees(s.sk || 0);
    for (let k = 0; k < item.rows.length; k++) {
      const q = item.rows[k], e = equipoCtx(q.e, q.i), dy = -k * s.pitch;
      const n = String(q.i);
      page.drawText(n, { x: s.num[0] - f.widthOfTextAtSize(n, size), y: s.num[1] + dy, size, font: f, ySkew: sk });
      page.drawText('.-', { x: s.dash[0], y: s.dash[1] + dy, size, font: f, ySkew: sk });
      let nm = safeText(e.nombre), sz = size; const nw = f.widthOfTextAtSize(nm, sz); if (nw > s.nameW) sz = size * s.nameW / nw;
      page.drawText(nm, { x: s.name[0], y: s.name[1] + dy, size: sz, font: f, ySkew: sk });
      const ns = safeText('N/S: ' + e.ns);
      page.drawText(ns, { x: s.ns[0] - f.widthOfTextAtSize(ns, size), y: s.ns[1] + dy, size, font: f, ySkew: sk });
      page.drawText('/', { x: s.sl[0], y: s.sl[1] + dy, size, font: f, ySkew: sk });
      page.drawText(safeText('TAG: ' + e.tag), { x: s.tag[0], y: s.tag[1] + dy, size, font: f, ySkew: sk });
    }
  }

  async function specialP6(doc, page, kit, map, base, item, rowFields) {
    const s = map.spec.p6, { rgb } = L();
    for (let k = 0; k < item.rows.length; k++) {
      const q = item.rows[k], dy = -k * s.pitch;
      if (k > 0) {
        const top = s.top + dy, bot = top - s.pitch;
        page.drawRectangle({ x: s.numFill[0], y: bot + 0.3, width: s.numFill[1] - s.numFill[0], height: s.pitch - 0.6, color: rgb(...s.numFill[2]) });
        page.drawRectangle({ x: s.x0, y: bot - s.lw / 2, width: s.x1 - s.x0, height: s.lw, color: rgb(0, 0, 0) });
        for (const vx of s.vx) page.drawRectangle({ x: vx - s.lw / 2, y: bot - s.lw / 2, width: s.lw, height: s.pitch + s.lw / 2, color: rgb(0, 0, 0) });
      }
      const ctx = Object.assign({}, base, { e: equipoCtx(q.e, q.i), d: dates(q.e.fechaPnd), i: q.i });
      for (const fd of rowFields) await drawField(page, kit, fd, ctx, dy);
    }
  }

  async function specialP44(doc, page, kit, map, ctx) {
    const s = map.spec.p44, m = ctx.d.month, f = await kit.font(s.f);
    const rects = [];
    for (let r = 0; r < s.rows.length; r++) {
      const [ya, yb, bi] = s.rows[r]; const y = Math.min(ya, yb), h = Math.abs(ya - yb);
      const months = [];
      for (let k = 0; k < m; k++) if (!bi || k % 2 === 0) months.push(k);
      if (!bi) { if (m > 0) rects.push([s.L[0], y, s.R[m - 1] - s.L[0], h, s.color]); }
      else months.forEach(k => rects.push([s.L[k], y, s.R[k] - s.L[k], h, s.color]));
      for (const k of months) {
        page.drawText('6:00 A.M.', { x: s.L[k] + s.tdx, y: s.t1[r], size: s.size, font: f });
        page.drawText('2:00 P.M.', { x: s.L[k] + s.tdx, y: s.t2[r], size: s.size, font: f });
      }
    }
    prependFills(doc, page, rects);
  }

  function specialP68(doc, page, map, ctx) {
    const s = map.spec.p68, m = ctx.d.month, rects = [];
    for (const [ya, yb, bi, c] of s.rows) {
      const y = Math.min(ya, yb), h = Math.abs(ya - yb);
      if (!bi) { if (m > 0) rects.push([s.L[0], y, s.R[m - 1] - s.L[0], h, c]); }
      else for (let k = 0; k < m; k += 2) rects.push([s.L[k], y, s.R[k] - s.L[k], h, c]);
    }
    prependFills(doc, page, rects);
  }

  // Hoja 6: reescribe encabezados que se cortaban a media palabra / tocaban bordes
  async function specialP6Header(page, kit, map) {
    const h = map.spec.p6hdr; if (!h) return;
    const { rgb } = L(), f = await kit.font(h.f);
    for (const c of h.cells) {
      page.drawRectangle({ x: c.x0 + h.inset, y: h.y0 + h.inset, width: c.x1 - c.x0 - 2 * h.inset, height: h.y1 - h.y0 - 2 * h.inset, color: rgb(...h.fill) });
      drawFitText(page, f, { box: [c.x0, h.y0, c.x1, h.y1], s: c.s || h.s, pad: h.pad, padY: h.padY, sk: h.sk, bold: h.bold, lh: 1.08 }, c.t, 0);
    }
  }

  // Hoja 23: columna ÍTEM (7 renglones por hoja). v4: cada ítem lleva su par gris (P) / negro (R) en Enero, semana 1,
  // igual que el que trae la plantilla en el primer renglón.
  async function specialP23(doc, page, kit, map, it) {
    const s = map.spec.p23, f = await kit.font(s.f), mk = s.mk, { rgb } = L();
    // La plantilla trae rellenos blancos sobre los renglones 2 y 4–7, así que las marcas se dibujan encima,
    // dentro de la celda (sin tocar las líneas de la cuadrícula).
    const box = (y0, y1, c) => page.drawRectangle({ x: mk.x, y: y0, width: mk.w, height: y1 - y0, color: rgb(c[0], c[1], c[2]) });
    (it.items23 || []).forEach((txt, k) => {
      if (k >= s.y.length - 1) return;
      drawFitText(page, f, { box: [s.x0, s.y[k + 1], s.x1, s.y[k]], s: s.size, pad: s.pad, padY: 2, ml: 4, sk: 0 }, safeText(txt), 0);
      if (mk && mk.rows[k]) {
        const [top, mid, bot] = mk.rows[k];
        box(mid + mk.lb, top - mk.lt, mk.p);
        box(bot + mk.lb, mid - mk.lt, mk.r);
      }
    });
  }

  // Hoja 66 (Cat III): CERTIFICADO No. XXX-XXXXX y NUMERO DE SERIE XXXXXX, aleatorios y sin repetir en la corrida
  function makeUnique() {
    const used = new Set();
    const dig = n => { let s = ''; const a = new Uint32Array(n); (root.crypto && root.crypto.getRandomValues) ? root.crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 4294967295)); for (let i = 0; i < n; i++) s += String(a[i] % 10); return s; };
    return (fmt) => { for (let t = 0; t < 1000; t++) { const v = fmt.replace(/X/g, () => dig(1)); if (!used.has(v)) { used.add(v); return v; } } throw new Error('sin combinaciones'); };
  }
  // Hoja 66 (v5): el valor del renglón NOMBRE es texto de la plantilla (fuente C0_6, glyphs del escaneo).
  // Se borra y se vuelve a escribir con los mismos glyphs; solo cambia la palabra del tipo (SILBATO | CAMPANA | ARGOLLA).
  // Si la hoja no trae esa fuente, se escribe en Times con el mismo tamaño, gris y posición.
  function fuenteTpl(page, nm) {
    const { PDFName, PDFDict } = L();
    try {
      const res = page.node.Resources(); const fd = res && res.lookup(PDFName.of('Font'), PDFDict);
      const f = fd && fd.lookup(PDFName.of(nm.font), PDFDict); if (!f) return false;
      const bf = f.get(PDFName.of('BaseFont')); return !!bf && decodeURIComponent(String(bf).replace(/#/g, '%')).includes(nm.base);
    } catch (err) { return false; }
  }
  async function nombreP66(doc, page, nm, tipo, fnt) {
    if (!nm) return;
    const P = L(), { rgb } = P;
    page.drawRectangle({ x: nm.wipe[0], y: nm.wipe[1], width: nm.wipe[2], height: nm.wipe[3], color: rgb(1, 1, 1) });
    if (!TIPOS_VALVULA.includes(tipo)) tipo = 'SILBATO';
    if (nm.tipos && nm.tipos[tipo] && fuenteTpl(page, nm)) {
      const ops = [P.pushGraphicsState(), P.beginText(), P.setFillingGrayscaleColor(nm.g), P.setFontAndSize(nm.font, nm.size)];
      for (const [x, tc, hex] of nm.words.concat([[nm.tx, nm.tc, nm.tipos[tipo]]])) ops.push(P.setCharacterSpacing(tc), P.setTextMatrix(1, 0, 0, 1, x, nm.y), P.showText(P.PDFHexString.of(hex)));
      ops.push(P.endText(), P.popGraphicsState());
      page.pushOperators(...ops);
      return;
    }
    const fb = nm.fb, f = await fnt(fb.font), txt = safeText(fb.k.replace('{TIPO}', tipo));
    let size = fb.size; const w = f.widthOfTextAtSize(txt, size); if (fb.mw && w > fb.mw) size *= fb.mw / w;
    page.drawText(txt, { x: fb.x, y: nm.y, size, font: f, color: rgb(fb.c, fb.c, fb.c) });
  }
  async function specialP66(doc, page, kit, map, ids, ctx) {
    const s = map.spec.p66, { rgb, StandardFonts } = L();
    kit.std = kit.std || {};
    const fnt = async k => kit.std[k] || (kit.std[k] = await doc.embedFont(StandardFonts[k]));
    for (const key of ['cert', 'serie']) {
      const c = s[key], txt = ids[key], f = await fnt(c.font);
      page.drawRectangle({ x: c.wipe[0], y: c.wipe[1], width: c.wipe[2], height: c.wipe[3], color: rgb(1, 1, 1) });
      page.drawText(txt, { x: c.x, y: c.y, size: c.size, font: f, color: rgb(c.c, c.c, c.c) });
    }
    // v5: renglón "NOMBRE : VÁLVULA SEGURIDAD TIPO …" con el tipo elegido en la captura
    await nombreP66(doc, page, s.nombre, (ctx.e && ctx.e.valvTipo) || 'SILBATO', fnt);
    // v3: Ø de conexión, temperatura máx., presión máx. de operación y presión de disparo (+ kPa ×98.07) desde la captura
    for (const c of s.vals || []) {
      const txt = safeText(interp(c.k, ctx)).trim(), f = await fnt(c.font);
      page.drawRectangle({ x: c.wipe[0], y: c.wipe[1], width: c.wipe[2], height: c.wipe[3], color: rgb(1, 1, 1) });
      if (!txt) continue;
      let size = c.size, w = f.widthOfTextAtSize(txt, size);
      if (c.mw && w > c.mw) { size *= c.mw / w; w = f.widthOfTextAtSize(txt, size); }
      const x = c.a === 'r' ? c.x - w : c.a === 'c' ? c.x - w / 2 : c.x;
      page.drawText(txt, { x, y: c.y, size, font: f, color: rgb(c.c, c.c, c.c) });
    }
  }

  // Hoja 94 (v4): directorio en tabla. Campo vacío = número de la plantilla; la Línea Única siempre es 911.
  function tel94(st, r) {
    if (r.fijo) return r.fijo;
    return String(st[r.key] || '').trim() || r.def;
  }
  async function specialP94(page, kit, map, st) {
    const s = map.spec.p94t, { rgb } = L();
    const fL = await kit.font(s.fL), fN = await kit.font(s.fN), fH = await kit.font(s.fH), fNota = await kit.font(s.fNota);
    const c = a => rgb(a[0], a[1], a[2]);
    page.drawRectangle({ x: s.wipe[0], y: s.wipe[1], width: s.wipe[2], height: s.wipe[3], color: rgb(1, 1, 1) });
    const [x0, x1] = [s.x0, s.x1], xm = s.xm;
    if (s.sub) drawFitText(page, fNota, { box: [x0, s.top + 6, x1, s.top + 26], s: s.subSize, pad: 0, a: 'l', c: s.cSub, ml: 1 }, s.sub, 0);
    let y = s.top - s.hHdr;
    page.drawRectangle({ x: x0, y, width: x1 - x0, height: s.hHdr, color: c(s.cHdr) });
    drawFitText(page, fH, { box: [x0, y, xm, y + s.hHdr], s: s.hdrSize, pad: s.pad, a: 'l', c: [1, 1, 1], ml: 1 }, s.hdr[0], 0);
    drawFitText(page, fH, { box: [xm, y, x1, y + s.hHdr], s: s.hdrSize, pad: s.pad, a: 'l', c: [1, 1, 1], ml: 1 }, s.hdr[1], 0);
    s.rows.forEach((r, k) => {
      const h = s.hRow, yb = y - h, dest = !!r.fijo;
      page.drawRectangle({ x: x0, y: yb, width: x1 - x0, height: h, color: c(dest ? s.cDest : (k % 2 ? s.cAlt : [1, 1, 1])) });
      if (dest) page.drawRectangle({ x: x0, y: yb, width: s.barra, height: h, color: c(s.cAcento) });
      drawFitText(page, fL, { box: [x0 + (dest ? s.barra : 0), yb, xm, y], s: s.lblSize, pad: s.pad, a: 'l', c: s.cTinta, ml: 2, lh: 1.1 }, r.lbl, 0);
      const num = safeText(tel94(st, r)).split(/\s+\/\s+|\s+y\s+|\s*,\s*|\s*;\s*/).filter(Boolean).join('\n');
      drawFitText(page, dest ? fH : fN, { box: [xm, yb, x1, y], s: dest ? s.destSize : s.numSize, pad: s.pad, a: 'l', c: dest ? s.cAcento : s.cTinta, ml: 4, lh: 1.12 }, num, 0);
      if (k) page.drawRectangle({ x: x0, y: y - s.lwIn / 2, width: x1 - x0, height: s.lwIn, color: c(s.cLin) });
      y = yb;
    });
    page.drawRectangle({ x: xm - s.lwIn / 2, y, width: s.lwIn, height: s.top - s.hHdr - y, color: c(s.cLin) });
    page.drawRectangle({ x: x0, y, width: x1 - x0, height: s.top - y, borderColor: c(s.cBorde), borderWidth: s.lwOut });
    if (s.nota) drawFitText(page, fNota, { box: [x0, y - 30, x1, y - 6], s: s.notaSize, pad: 0, a: 'c', c: s.cSub, ml: 1 }, s.nota, 0);
  }

  // Hoja 106 (v4): registro de operación semanal. Limpieza en L, X, V y D (1°, 07:20–07:29 hrs);
  // el renglón del experto PND cae en el día de la semana de la PND (2°, 11:13 hrs) y sustituye la limpieza de ese día.
  async function specialP106(page, kit, map, ctx, sig) {
    const s = map.spec.p106; if (!s) return;
    const { rgb } = L(), f = await kit.font(s.f), C = s.cols;
    const wipe = (a, b, top, bot) => page.drawRectangle({ x: a + s.ins, y: bot + s.ins, width: b - a - 2 * s.ins, height: top - bot - 2 * s.ins, color: rgb(1, 1, 1) });
    // v6: también se borra la columna FIRMA (nada de firmas fijas ni fantasmas de plantilla)
    const wk = ['hora', 'elem', 'res', 'nom'].concat(C.firma ? ['firma'] : []);
    for (const [t, m, b] of s.days) for (const [top, bot] of [[t, m], [m, b]]) for (const k of wk) wipe(C[k][0], C[k][1], top, bot);
    // v5: los borrados se comen parte de las reglas de la tabla; se redibuja la cuadrícula completa al grosor de la hoja (0.86 pt)
    const gr = s.grid;
    if (gr) {
      for (const [x0, y] of gr.h) page.drawRectangle({ x: x0, y, width: gr.x1 - x0, height: gr.lw, color: rgb(0, 0, 0) });
      for (const [x, y0, y1] of gr.v) page.drawRectangle({ x, y: y0, width: gr.lw, height: y1 - y0, color: rgb(0, 0, 0) });
    }
    const txt = (t, x, y, size) => page.drawText(safeText(t), { x, y, size, font: f, color: rgb(0, 0, 0) });
    const nombre = async (k, top, bot) => { const v = String(ctx[k] || '').trim(); if (v) drawFitText(page, f, { box: [C.nom[0], bot, C.nom[1], top], s: s.nomSize, pad: 3, padY: 0.8, ml: 2, a: 'c' }, safeText(v), 0); };
    // v6: la firma va en el MISMO renglón que el nombre (t2 = limpieza, fi = experto); centrada en la banda del turno
    const firma = async (role, top, bot) => {
      const F = s.firma, im = F && sig ? await sig(role) : null; if (!im) return;
      drawFit(page, im, { x: F.x, y: bot + F.pad, w: F.w, h: top - bot - 2 * F.pad, clip: [F.x, F.x + F.w] }, 0);
    };
    const wd = ctx.d && ctx.d.wd != null ? ctx.d.wd : -1;
    for (const di of s.limpieza) {
      if (di === wd) continue;
      const [top, bot] = [s.days[di][0], s.days[di][1]], cy = (top + bot) / 2;
      txt('07:2' + rnd(10) + ' hrs', s.hx, cy + s.hdy, s.hs);
      txt(s.txtLimpieza, s.tx, cy + s.tdy, s.ts);
      txt(s.res, s.rx, bot + s.rdy, s.ts);
      await nombre('t2', top, bot);
      await firma('t2', top, bot);
    }
    if (wd >= 0 && s.days[wd]) {
      const [top, bot] = [s.days[wd][1], s.days[wd][2]], cy = (top + bot) / 2;
      txt(s.horaExp, s.hx, cy + s.edy, s.hs);
      drawFlow(page, f, { s: s.ts, slots: [[s.tx, cy + s.e1, s.ew], [s.tx, cy + s.e2, s.ew]] }, safeText(interp(s.txtExp, ctx)).trim(), 0);
      txt(s.res, s.rx, bot + s.rdy, s.ts);
      await nombre('fi', top, bot);
      await firma('fi', top, bot);
    }
  }

  // Hoja 98: fecha fija 2026-01-01 en los dos bloques (De … a …)
  async function specialP98(page, kit, map) {
    const s = map.spec.p98, { rgb } = L(), f = await kit.font(s.f);
    for (const cells of s.groups) {
      s.digits.split('').forEach((d, i) => {
        const x0 = cells[i], x1 = cells[i + 1];
        page.drawRectangle({ x: x0 + s.inset, y: s.y0, width: x1 - x0 - 2 * s.inset, height: s.y1 - s.y0, color: rgb(1, 1, 1) });
        const w = f.widthOfTextAtSize(d, s.size);
        page.drawText(d, { x: (x0 + x1) / 2 - w / 2, y: s.base, size: s.size, font: f, color: rgb(s.c, s.c, s.c) });
      });
    }
  }

  async function specialP96(page, kit, map, ctx) {
    const s = map.spec.p96, f = await kit.font(s.f);
    const put = (str, cells) => {
      const chars = String(str || '').toUpperCase().replace(/\s+/g, '').split('').slice(0, cells.length);
      chars.forEach((ch, i) => { const t = safeText(ch); const w = f.widthOfTextAtSize(t, s.size); page.drawText(t, { x: cells[i][0] - w / 2, y: cells[i][1], size: s.size, font: f }); });
    };
    put(ctx.t1curp, s.curp); put(String(ctx.rfc || '').slice(0, 12), s.rfc.slice(0, 12)); // RFC: máximo 12 caracteres
    // v4: periodo de ejecución, "De" y "a" con los mismos 8 dígitos AAAAMMDD
    const per = s.per; if (!per) return;
    const { rgb } = L(), fp = await kit.font(per.f), p = periodo96(ctx.g);
    const dig = String(p.Y).padStart(4, '0') + pad(p.M) + pad(p.D);
    for (const cells of per.groups) dig.split('').forEach((d, i) => {
      const a = cells[i], b = cells[i + 1];
      page.drawRectangle({ x: a + per.lw + 0.2, y: per.y0, width: b - a - per.lw - 0.45, height: per.y1 - per.y0, color: rgb(1, 1, 1) });
      const w = fp.widthOfTextAtSize(d, per.size);
      page.drawText(d, { x: (a + per.lw / 2 + b) / 2 - w / 2, y: per.base, size: per.size, font: fp, color: rgb(0, 0, 0) });
    });
  }

  // ---------- parches de plantilla en tiempo de ejecución (v3) ----------
  const toLatin1 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; };
  const fromLatin1 = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff; return u; };
  // Reescribe operadores de texto dentro del flujo de contenido de una hoja (lo comparten sus clones). Si no encuentra el patrón, no toca nada.
  function patchContent(doc, page, reps) {
    const { PDFName, PDFArray, PDFRawStream, decodePDFRawStream } = L();
    const ctx = doc.context, c = page.node.get(PDFName.of('Contents'));
    const refs = c instanceof PDFArray ? c.asArray() : c ? [c] : [];
    let hits = 0;
    for (const ref of refs) {
      const obj = ctx.lookup(ref);
      if (!(obj instanceof PDFRawStream)) continue;
      let src; try { src = toLatin1(decodePDFRawStream(obj).decode()); } catch (e) { continue; }
      let out = src; for (const [rx, to] of reps) out = out.replace(rx, to);
      if (out !== src) { ctx.assign(ref, ctx.flateStream(fromLatin1(out))); hits++; }
    }
    return hits;
  }
  // Sustituye imágenes de la plantilla (por tamaño en píxeles) por un XObject vacío.
  function blankImages(doc, dimsList) {
    const { PDFName, PDFRawStream } = L(), ctx = doc.context, hit = [];
    for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue;
      const d = obj.dict; if (d.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
      const W = d.get(PDFName.of('Width')), H = d.get(PDFName.of('Height'));
      if (W && H && dimsList.some(([w, h]) => W.asNumber() === w && H.asNumber() === h)) hit.push(ref);
    }
    for (const ref of hit) ctx.assign(ref, ctx.stream('', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 1, 1] }));
    return hit.length;
  }
  function templateFixes(doc, orig, map) {
    const t = map.spec.tplfix || {};
    // Hoja 4: "TEXO DE REFENCIA" → "TEXTO DE REFERENCIA" (misma fuente embebida, recentrado)
    if (orig[3]) patchContent(doc, orig[3], [[/257\.88\s+674\.52\s+Tm\s*\[\(T\)[^\]]*?\(A\)\]\s*TJ/, (t.p4x || '248.41') + ' 674.52 Tm [(TEXTO DE REFERENCIA)]TJ']]);
    // Hoja 9 (y sus clones): el número de control STPS queda en blanco, sin texto oculto
    if (orig[8]) patchContent(doc, orig[8], [[/\[\(EN\)[^\]]*?\(MITE\)\]\s*TJ/g, '[]TJ']]);
    // Hoja 66 (v5): se vacían en la plantilla los textos fijos que el motor borra y reescribe (NOMBRE de la válvula, disparo, cierre,
    // certificado y serie), para que no quede texto oculto duplicado debajo de los borrados. Cada uno es un bloque BT…ET aislado.
    const strip66 = (map.spec.p66 && map.spec.p66.strip) || [];
    if (orig[65] && strip66.length) patchContent(doc, orig[65], strip66.map(xy => [new RegExp('(' + xy.trim().replace(/\./g, '\\.').replace(/\s+/g, '\\s+') + '\\s+TD)[^E]*?(?=ET)'), '$1 ']));
    // Hoja 72: imagen "RMC Servicios de Ingeniería, S. de R.L. de C.V." bajo el logo
    blankImages(doc, t.blankImgs || [[553, 29]]);
  }

  // Hoja 74: si una columna viene de "Rellenar" (16 valores iguales = B), cada celda imprime B + {0.00…0.03} al azar; al menos una queda en B.
  function rnd(n) { const a = new Uint32Array(1); if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(a); else a[0] = Math.floor(Math.random() * 4294967295); return a[0] % n; }
  function jitterCol(arr) {
    const v = (arr || []).map(num);
    if (v.length < 16 || v.slice(0, 16).some(x => x == null) || v.slice(0, 16).some(x => Math.abs(x - v[0]) > 1e-9)) return null;
    const baseC = Math.ceil(v[0] * 100 - 1e-6), keep = rnd(16);
    return Array.from({ length: 16 }, (_, j) => ((baseC + (j === keep ? 0 : rnd(4))) / 100).toFixed(2));
  }
  function esp74(e) {
    const o = {};
    for (const [k, src] of [['env', e.espEnv], ['sup', e.espSup], ['inf', e.espInf]]) {
      const j = jitterCol(src); if (j) j.forEach((x, i) => { o[k + (i + 1)] = x; });
    }
    return o;
  }

  // ---------- logo ----------
  async function replaceLogo(doc, logoBytes, dims) {
    if (!logoBytes) return;
    const { PDFName, PDFRawStream, PDFDict } = L();
    const t = sniff(logoBytes); if (!t) return;
    const img = t === 'png' ? await doc.embedPng(logoBytes) : await doc.embedJpg(logoBytes);
    const ctx = doc.context;
    const targets = [];
    for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue;
      const d = obj.dict;
      if (d.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
      const W = d.get(PDFName.of('Width')), H = d.get(PDFName.of('Height'));
      if (W && H && W.asNumber() === dims[0] && H.asNumber() === dims[1]) targets.push(ref);
    }
    const oldAr = dims[0] / dims[1], newAr = img.width / img.height;
    let w = 1, h = 1; if (newAr > oldAr) h = oldAr / newAr; else w = newAr / oldAr;
    const content = `q ${w.toFixed(5)} 0 0 ${h.toFixed(5)} ${((1 - w) / 2).toFixed(5)} ${((1 - h) / 2).toFixed(5)} cm /Im0 Do Q`;
    for (const ref of targets) {
      const form = ctx.stream(content, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 1, 1], Resources: { XObject: { Im0: img.ref } } });
      ctx.assign(ref, form);
    }
  }

  // ---------- main builders ----------
  async function buildExpediente(st, A, onProgress) {
    const { PDFDocument } = L();
    const map = A.map.exp;
    const doc = await PDFDocument.load(A.tplExp, { updateMetadata: false });
    const kit = await makeKit(doc, A.fonts);
    const img = await imageCache(doc);
    const byPage = {}; map.fields.forEach(f => (byPage[f.p] = byPage[f.p] || []).push(f));
    const imgByPage = {}; map.imgs.forEach(f => (imgByPage[f.p] = imgByPage[f.p] || []).push(f));
    const base = baseCtx(st);
    const seq = planExp(st, map);
    const orig = doc.getPages();
    templateFixes(doc, orig, map);
    for (let i = orig.length - 1; i >= 0; i--) doc.removePage(i);
    const used = new Set();
    const pages = seq.map(it => { if (!used.has(it.tp)) { used.add(it.tp); return orig[it.tp - 1]; } return clonePage(doc, orig[it.tp - 1]); });
    pages.forEach(p => doc.addPage(p));
    const roleBytes = { t1: st.testigo1Firma, t2: st.testigo2Firma, rep: st.representanteLegalFirma, fi: A.globals.firmanteIzquierdoFirma, pnd1: A.globals.firmaPnd1, pnd2: A.globals.firmaPnd2, fachada: st.fotoFachada };
    const uniq = makeUnique(), ids66 = new Map(), jit74 = new Map();
    for (let n = 0; n < seq.length; n++) {
      const it = seq[n], page = pages[n], tp = it.tp;
      const ctx = Object.assign({}, base, { e: it.e ? equipoCtx(it.e, it.i) : {}, d: it.e ? dates(it.e.fechaPnd) : base.g, i: it.i || '' });
      const fields = byPage[tp] || [];
      if (tp === 74 && it.e) { const k = it.e.id || it.i; if (!jit74.has(k)) jit74.set(k, esp74(it.e)); Object.assign(ctx.e, jit74.get(k)); }
      if (tp === 3) await specialP3(page, kit, map, base, it);
      if (tp === 6) { await specialP6Header(page, kit, map); await specialP6(doc, page, kit, map, base, it, fields.filter(f => f.row)); }
      if (tp === 23) await specialP23(doc, page, kit, map, it);
      if (tp === 66 && it.e) {
        const k = it.e.id || it.i;
        if (!ids66.has(k)) ids66.set(k, { cert: uniq(map.spec.p66.cert.fmt), serie: uniq(map.spec.p66.serie.fmt) });
        await specialP66(doc, page, kit, map, ids66.get(k), ctx);
      }
      if (tp === 94) await specialP94(page, kit, map, st);
      if (tp === 98) await specialP98(page, kit, map);
      if (tp === 44) await specialP44(doc, page, kit, map, ctx);
      if (tp === 68) specialP68(doc, page, map, ctx);
      if (tp === 96) await specialP96(page, kit, map, ctx);
      if (tp === 106) await specialP106(page, kit, map, ctx, role => img(role, roleBytes[role]));
      const dy = tp === 108 ? map.spec.p108.dy[ctx.d.wd] : 0;
      for (const fd of fields) {
        if (fd.row) continue;
        await drawField(page, kit, fd, ctx, fd.shift ? dy : 0);
      }
      for (const sl of imgByPage[tp] || []) {
        let bytes, key;
        if (sl.role === 'placa') { bytes = it.e && it.e.fotoPlaca; key = 'placa:' + (it.e && it.e.id); }
        else if (/^muestra[1-4]$/.test(sl.role)) { const n = +sl.role.slice(7); bytes = it.e && it.e.muestras && it.e.muestras[n - 1]; key = sl.role + ':' + (it.e && it.e.id); }
        else { bytes = roleBytes[sl.role]; key = sl.role; }
        const im = await img(key, bytes);
        if (im) drawFit(page, im, sl, sl.shift ? dy : 0, { white: sl.role === 'placa' || sl.role === 'fachada' || sl.role.startsWith('muestra') });
      }
      if (onProgress && n % 8 === 0) { onProgress(n / seq.length); await new Promise(r => setTimeout(r, 0)); }
    }
    await replaceLogo(doc, A.globals.logoFenix, [581, 97]);
    doc.setTitle('EXPEDIENTE NOM-020-STPS-2011 ' + base.rs); doc.setProducer('FenixMex'); doc.setCreator('FenixMex Expedientes NOM-020');
    return { bytes: await doc.save({ useObjectStreams: true }), pages: seq.length };
  }

  async function buildCat2(kind, st, e, idx, A) {
    const { PDFDocument } = L();
    const map = A.map.cat2[kind];
    const doc = await PDFDocument.load(kind === 'previo' ? A.tplPrevio : A.tplDict, { updateMetadata: false });
    const kit = await makeKit(doc, A.fonts), img = await imageCache(doc);
    const page = doc.getPages()[0];
    const ctx = Object.assign({}, baseCtx(st), { e: equipoCtx(e, idx), d: dates(e.fechaPnd) });
    for (const fd of map.fields) await drawField(page, kit, fd, ctx, 0);
    const roleBytes = { rep: st.representanteLegalFirma, fi: A.globals.firmanteIzquierdoFirma };
    for (const sl of map.imgs) { const im = await img(sl.role, roleBytes[sl.role]); if (im) drawFit(page, im, sl, 0); }
    if (kind === 'dictamen') await replaceLogo(doc, A.globals.logoFenix, [581, 97]);
    doc.setTitle((kind === 'previo' ? 'PRE DICTAMEN ' : 'DICTAMEN TÉCNICO CATEGORIA II ') + ctx.e.tag); doc.setProducer('FenixMex');
    return await doc.save({ useObjectStreams: true });
  }

  function sanitizeName(s) {
    s = String(s || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return s || 'SIN_NOMBRE';
  }

  // v3: nombres de archivo con espacios ("EXP FOCAS INDUSTRIALES SA DE CV"), sin guiones bajos
  function fileName(s) {
    s = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[\/\\?%*:|"<>\u0000-\u001f]/g, ' ').replace(/[.,]+/g, '').replace(/[;_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }
  function nombresArchivo(rs, tag) {
    const R = fileName(rs) || 'SIN NOMBRE', T = fileName(tag);
    const j = (...a) => a.filter(Boolean).join(' ');
    return { exp: j('EXP', R) + '.pdf', zip: j('EXP', R) + '.zip', previo: j('PREVIO', T, R) + '.pdf', dictamen: j('DICTAMEN', T, R) + '.pdf' };
  }

  function estimatePages(st, map) { return planExp(st, map.exp).length; }

  root.FXEngine = { buildExpediente, buildCat2, categoria, dates, equipoCtx, sanitizeName, fileName, nombresArchivo, estimatePages, planExp, titleCase, esCompresor, items23, incluye109, valvula, jitterCol, KPA, TIPOS_VALVULA, periodo96, razonSocial };
})(typeof window !== 'undefined' ? window : globalThis);
