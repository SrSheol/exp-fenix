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

  function minOf(arr) {
    const v = (arr || []).map(num).filter(x => x != null);
    return v.length ? Math.min(...v) : null;
  }

  function equipoCtx(e, i) {
    const pcal = num(e.presionCalibracion);
    const cat = e.clasificacion || categoria(e.presionCalibracion);
    const o = {
      nombre: (e.nombre || '').trim(), ns: (e.numeroSerie || '').trim(), tag: (e.tag || '').trim(),
      cat, fluido: e.fluido || '',
      cv: fx(e.capacidadVolumetrica, 3), cv4: fx(e.capacidadVolumetrica, 4),
      pop: fx(e.presionOperacion, 2), pop1: fx(e.presionOperacion, 1), pcal: fx(e.presionCalibracion, 2),
      pdis: fx(e.presionDiseno, 2), pmax: fx(e.presionTrabajoMaxPermitida, 2), phid: fx(e.presionPruebaHidrostatica, 2),
      tdis: fx(e.tempDiseno, 2), top: fx(e.tempOperacion, 2),
      relevo: e.tipoDispositivoRelevo || '',
      relevoFicha: [e.tipoDispositivoRelevo, e.dimensionesRelevo].filter(x => x && String(x).trim()).join(', '),
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

  function baseCtx(st) {
    const eqs = st.equipos || [];
    const maxF = eqs.map(e => e.fechaPnd).filter(parseFecha).sort().pop() || '';
    return {
      rs: st.razonSocialUsuario || '', rsp: st.razonSocialPropietario || '', rfc: st.rfcEmpresa || '',
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
    add(19); each(20); add(21); add(22); each(23);
    for (let t = 24; t <= 43; t++) add(t);
    each(44); add(45); each(46); add(47); each(48);
    for (let t = 49; t <= 61; t++) add(t);
    each(62); add(63); each(64); add(65);
    eqs.filter(q => equipoCtx(q.e, q.i).cat === 'III').forEach(q => add(66, q));
    add(67); each(68); add(69);
    eqs.forEach(q => { for (let t = 70; t <= 75; t++) add(t, q); });
    for (let t = 76; t <= 101; t++) add(t);
    each(102); add(103); add(104); add(105); each(106); each(107); each(108); add(109);
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
    page.drawImage(img, { x: slot.x + (W - iw) / 2, y: y0 + (H - ih) / 2, width: iw, height: ih });
  }

  function color(c) { const { rgb } = L(); return c ? rgb(c[0], c[1], c[2]) : rgb(0, 0, 0); }

  async function drawField(page, kit, fd, ctx, dy) {
    const { degrees, rgb } = L();
    dy = dy || 0;
    const font = await kit.font(fd.f);
    if (fd.wipe) page.drawRectangle({ x: fd.wipe[0], y: fd.wipe[1] + dy, width: fd.wipe[2], height: fd.wipe[3], color: rgb(1, 1, 1) });
    const text = safeText(interp(fd.k, ctx)).replace(/\s+$/, '');
    if (fd.t === 'blk') return drawBlock(page, font, fd, text, dy);
    if (fd.t === 'flow') return drawFlow(page, font, fd, text, dy);
    if (!text.trim()) return;
    let size = fd.s;
    let w = font.widthOfTextAtSize(text, size);
    if (fd.mw && w > fd.mw) { size = Math.max(size * 0.55, size * fd.mw / w); w = font.widthOfTextAtSize(text, size); }
    const ang = (fd.r || 0) * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang);
    let x = fd.x, y = fd.y + dy;
    if (fd.a === 'c') { x = (fd.x + fd.ex) / 2 - ux * w / 2; y = (fd.y + fd.ey) / 2 + dy - uy * w / 2; }
    else if (fd.a === 'r') { x = fd.ex - ux * w; y = fd.ey + dy - uy * w; }
    page.drawText(text, { x, y, size, font, color: color(fd.c), rotate: degrees(fd.r || 0), ySkew: degrees(fd.sk || 0) });
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

  async function specialP96(page, kit, map, ctx) {
    const s = map.spec.p96, f = await kit.font(s.f);
    const put = (str, cells) => {
      const chars = String(str || '').toUpperCase().replace(/\s+/g, '').split('').slice(0, cells.length);
      chars.forEach((ch, i) => { const t = safeText(ch); const w = f.widthOfTextAtSize(t, s.size); page.drawText(t, { x: cells[i][0] - w / 2, y: cells[i][1], size: s.size, font: f }); });
    };
    put(ctx.t1curp, s.curp); put(ctx.rfc, s.rfc);
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
    for (let i = orig.length - 1; i >= 0; i--) doc.removePage(i);
    const used = new Set();
    const pages = seq.map(it => { if (!used.has(it.tp)) { used.add(it.tp); return orig[it.tp - 1]; } return clonePage(doc, orig[it.tp - 1]); });
    pages.forEach(p => doc.addPage(p));
    const roleBytes = { t1: st.testigo1Firma, t2: st.testigo2Firma, rep: st.representanteLegalFirma, fi: A.globals.firmanteIzquierdoFirma, pnd1: A.globals.firmaPnd1, pnd2: A.globals.firmaPnd2, fachada: st.fotoFachada };
    for (let n = 0; n < seq.length; n++) {
      const it = seq[n], page = pages[n], tp = it.tp;
      const ctx = Object.assign({}, base, { e: it.e ? equipoCtx(it.e, it.i) : {}, d: it.e ? dates(it.e.fechaPnd) : base.g, i: it.i || '' });
      const fields = byPage[tp] || [];
      if (tp === 3) await specialP3(page, kit, map, base, it);
      if (tp === 6) await specialP6(doc, page, kit, map, base, it, fields.filter(f => f.row));
      if (tp === 44) await specialP44(doc, page, kit, map, ctx);
      if (tp === 68) specialP68(doc, page, map, ctx);
      if (tp === 96) await specialP96(page, kit, map, ctx);
      const dy = tp === 108 ? map.spec.p108.dy[ctx.d.wd] : 0;
      for (const fd of fields) {
        if (fd.row) continue;
        await drawField(page, kit, fd, ctx, fd.shift ? dy : 0);
      }
      for (const sl of imgByPage[tp] || []) {
        let bytes, key;
        if (sl.role === 'placa') { bytes = it.e && it.e.fotoPlaca; key = 'placa:' + (it.e && it.e.id); }
        else { bytes = roleBytes[sl.role]; key = sl.role; }
        const im = await img(key, bytes);
        if (im) drawFit(page, im, sl, sl.shift ? dy : 0, { white: sl.role === 'placa' || sl.role === 'fachada' });
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

  function estimatePages(st, map) { return planExp(st, map.exp).length; }

  root.FXEngine = { buildExpediente, buildCat2, categoria, dates, equipoCtx, sanitizeName, estimatePages, planExp, titleCase };
})(typeof window !== 'undefined' ? window : globalThis);
