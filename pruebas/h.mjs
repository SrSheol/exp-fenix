// Utilidades del arnés: servidor estático, navegador con red controlada (sin Firestore real), Drive simulado, borradores de prueba.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

// carpeta del proyecto (la de arriba) · FX_TMP: carpeta con index.orig.html (versión publicada b87831f, para la regresión) y las salidas
export const PROY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
export const S = (process.env.FX_TMP || path.join(path.dirname(fileURLToPath(import.meta.url)), '_tmp')).replace(/\\/g, '/');
export const OUT = S + '/out';
fs.mkdirSync(OUT, { recursive: true });

export function servidor(port, raiz, extra) {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p === '/') p = '/index.html';
    if (extra && extra[p]) { r.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return r.end(extra[p]); }
    const f = path.join(raiz, p.replace(/^\/(exp-fenix\/)?/, ''));
    if (!f.startsWith(path.normalize(raiz)) || !fs.existsSync(f)) { r.writeHead(404); return r.end('no'); }
    r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r);
  });
  return new Promise(res => srv.listen(port, '127.0.0.1', () => res(srv)));
}

export const CONFIG_EMU = (extra) => 'window.FX_NUBE=' + JSON.stringify(Object.assign({
  firebase: { apiKey: 'demo-key', authDomain: 'demo-fenix.firebaseapp.com', projectId: 'demo-fenix', appId: '1:1:web:1' },
  googleClientId: 'cliente-prueba.apps.googleusercontent.com', googleApiKey: 'clave-picker', googleAppId: '123', driveFolderId: 'CARPETA1', driveFolderName: 'Fenix · Expedientes',
  verificarUrl: 'https://srsheol.github.io/exp-fenix/verificar.html', emulador: { host: '127.0.0.1', firestorePort: 8080, authPort: 9099 }
}, extra || {})) + ';';

// Drive simulado (API v3 + subida reanudable + GIS). Registra cada llamada en drive.log.
export function driveSimulado(opt) {
  opt = opt || {};
  // ajenos: ids de archivos o carpetas que creó OTRA cuenta (con drive.file esta app no puede modificarlos, moverlos ni borrarlos → 403;
  //   una carpeta ajena dice canAddChildren:false). concedidos: los que esta cuenta eligió en el selector de Google (ya puede usarlos).
  // carpetas: subcarpetas creadas por la app. sinRenombrar: carpetas cuyo nombre no se deja cambiar (403).
  const d = { files: new Map(), carpetas: new Map(), sesiones: new Map(), log: [], n: 0, fallar503: opt.fallar503 || 0, expirar401: opt.expirar401 || 0, tokens: 0,
    ajenos: new Set(), concedidos: new Set(), sinRenombrar: new Set(), selector: [] };
  const sinAcceso = id => d.ajenos.has(id) && !d.concedidos.has(id);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'Location, Range' };
  d.gis = `window.google=window.google||{};google.accounts={oauth2:{initTokenClient:function(c){return{requestAccessToken:function(){window.__tokens=(window.__tokens||0)+1;setTimeout(function(){c.callback({access_token:'tok-'+window.__tokens,expires_in:3600,scope:c.scope});},30);}};},revoke:function(t,cb){cb&&cb();}}};`;
  // selector de Google simulado: window.__picker = 'elegir' (concede el id pedido) | 'cancelar' (por omisión)
  d.picker = `window.gapi={load:function(n,cb){setTimeout(cb,0);}};window.google=window.google||{};google.picker={ViewId:{FOLDERS:'folders',DOCS:'docs'},Action:{PICKED:'picked',CANCEL:'cancel'},
    DocsView:function(v){var o={ids:[]};o.setIncludeFolders=function(){return o;};o.setSelectFolderEnabled=function(){return o;};o.setFileIds=function(x){o.ids=String(x).split(',');return o;};return o;},
    PickerBuilder:function(){var b={},cb=null,vista=null,titulo='';['setOAuthToken','setDeveloperKey','setAppId','setLocale'].forEach(function(k){b[k]=function(){return b;};});
      b.addView=function(v){vista=v;return b;};b.setTitle=function(t){titulo=t;return b;};b.setCallback=function(f){cb=f;return b;};
      b.build=function(){return{setVisible:function(){window.__pickerVeces=(window.__pickerVeces||0)+1;window.__pickerTitulo=titulo;var r=window.__picker||'cancelar';
        setTimeout(function(){if(r==='elegir')fetch('https://www.googleapis.com/drive/v3/__conceder/'+encodeURIComponent(vista.ids.join(','))).then(function(){cb({action:'picked',docs:vista.ids.map(function(i){return{id:i};})});});
          else cb({action:'cancel'});},40);}};};return b;}};`;
  d.handler = async (route) => {
    const q = route.request(), u = new URL(q.url()), m = q.method(), auth = q.headers()['authorization'] || '';
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    d.log.push(m + ' ' + u.pathname + u.search.slice(0, 60));
    const j = (st, body, h) => route.fulfill({ status: st, headers: Object.assign({ 'Content-Type': 'application/json' }, cors, h || {}), body: body == null ? '' : JSON.stringify(body) });
    const cc = /^\/drive\/v3\/__conceder\/(.+)$/.exec(u.pathname);
    if (cc) { decodeURIComponent(cc[1]).split(',').forEach(i => { d.concedidos.add(i); d.selector.push(i); }); return j(200, {}); }
    if (!/^Bearer tok-/.test(auth)) return j(401, { error: { code: 401 } });
    if (d.expirar401 > 0 && u.pathname.startsWith('/upload/')) { d.expirar401--; return j(401, { error: { code: 401, message: 'expired' } }); }
    if (u.pathname === '/drive/v3/files/CARPETA1') return j(200, { id: 'CARPETA1', name: 'Fenix · Expedientes', capabilities: { canAddChildren: true } });
    // crear una subcarpeta (metadatos, sin contenido)
    if (u.pathname === '/drive/v3/files' && m === 'POST') {
      const meta = JSON.parse(q.postData() || '{}'); if (meta.mimeType !== 'application/vnd.google-apps.folder') return j(400, { error: 'solo carpetas' });
      const id = 'D' + (++d.n); d.carpetas.set(id, { id, name: meta.name, parents: meta.parents || [], mimeType: meta.mimeType, descripcion: meta.description || '', trashed: false });
      return j(200, { id, name: meta.name });
    }
    // listar hijos visibles: q="'X' in parents and trashed=false"
    if (u.pathname === '/drive/v3/files' && m === 'GET') {
      const pq = /'([^']+)' in parents/.exec(u.searchParams.get('q') || ''); if (!pq) return j(400, {});
      const hijos = [...d.files.values(), ...d.carpetas.values()].filter(f => (f.parents || []).includes(pq[1]) && !f.trashed).map(f => ({ id: f.id }));
      return j(200, { files: hijos });
    }
    const md = /^\/drive\/v3\/files\/([^/]+)$/.exec(u.pathname);
    if (md && u.searchParams.get('alt') !== 'media' && (m === 'GET' || m === 'PATCH')) {
      const id = decodeURIComponent(md[1]), c = d.carpetas.get(id), f = d.files.get(id), x = c || f;
      if (!x) return j(404, { error: { code: 404 } });
      if (m === 'GET') return j(200, c ? { id, name: c.name, trashed: c.trashed, parents: c.parents, capabilities: { canAddChildren: !sinAcceso(id), canRename: !sinAcceso(id) && !d.sinRenombrar.has(id) } }
        : { id, name: f.name, parents: f.parents, trashed: !!f.trashed });
      // PATCH de metadatos: mover (addParents/removeParents), renombrar o mandar a la papelera
      if (sinAcceso(id)) return j(403, { error: { code: 403 } });
      const body = JSON.parse(q.postData() || '{}'), add = u.searchParams.get('addParents'), del = u.searchParams.get('removeParents');
      if (add || del) x.parents = (x.parents || []).filter(p => !(del || '').split(',').includes(p)).concat(add ? add.split(',') : []);
      if (body.name != null) { if (d.sinRenombrar.has(id)) return j(403, { error: { code: 403 } }); x.name = body.name; }
      if (body.trashed === true) x.trashed = true;
      return j(200, { id, name: x.name, parents: x.parents, trashed: !!x.trashed });
    }
    if (u.pathname.startsWith('/upload/drive/v3/files') && (m === 'POST' || m === 'PATCH')) {
      const id = m === 'PATCH' ? u.pathname.split('/').pop() : 'F' + (++d.n);
      if (m === 'PATCH' && sinAcceso(id)) return j(403, { error: { code: 403, message: 'The user does not have sufficient permissions for this file.' } });
      if (m === 'PATCH' && !d.files.has(id)) return j(404, { error: { code: 404 } });
      const meta = JSON.parse(q.postData() || '{}'), tot = +q.headers()['x-upload-content-length'], sid = 'S' + (++d.n);
      d.sesiones.set(sid, { id, meta, tot, buf: [], pos: 0 });
      return j(200, {}, { Location: `https://www.googleapis.com/upload/sesion/${sid}` });
    }
    if (u.pathname.startsWith('/upload/sesion/') && m === 'PUT') {
      const s = d.sesiones.get(u.pathname.split('/').pop()); if (!s) return j(404, {});
      const cr = q.headers()['content-range'] || '';
      if (/^bytes \*\//.test(cr)) { return s.pos >= s.tot && s.fin ? j(200, s.fin) : j(308, null, s.pos ? { Range: `bytes=0-${s.pos - 1}` } : {}); }
      if (d.fallar503 > 0 && s.pos > 0) { d.fallar503--; return j(503, { error: { code: 503 } }); }
      const b = q.postDataBuffer() || Buffer.alloc(0), mm = /bytes (\d+)-(\d+)\/(\d+)/.exec(cr);
      if (!mm || +mm[1] !== s.pos) return j(308, null, s.pos ? { Range: `bytes=0-${s.pos - 1}` } : {});
      s.buf.push(b); s.pos += b.length;
      if (s.pos < s.tot) return j(308, null, { Range: `bytes=0-${s.pos - 1}` });
      const datos = Buffer.concat(s.buf), prev = d.files.get(s.id) || {};
      d.files.set(s.id, { id: s.id, name: s.meta.name || prev.name, parents: s.meta.parents || prev.parents, datos, versiones: (prev.versiones || 0) + 1 });
      s.fin = { id: s.id, name: s.meta.name || prev.name, size: String(datos.length) };
      return j(200, s.fin);
    }
    const fm = /^\/drive\/v3\/files\/([^/]+)$/.exec(u.pathname);
    if (fm && m === 'GET' && u.searchParams.get('alt') === 'media') { const f = d.files.get(fm[1]); return f ? route.fulfill({ status: 200, headers: Object.assign({ 'Content-Type': 'application/octet-stream' }, cors), body: f.datos }) : j(404, {}); }
    if (fm && m === 'DELETE') { if (sinAcceso(fm[1])) return j(403, { error: { code: 403 } }); const ok = d.files.delete(fm[1]); return j(ok ? 204 : 404, null); }
    return j(404, { error: 'ruta simulada desconocida' });
  };
  return d;
}

export async function navegador(opt) {
  opt = opt || {};
  const br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-dev-shm-usage'] });
  const ctx = await br.newContext(Object.assign({ viewport: { width: 1360, height: 900 }, acceptDownloads: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' }, opt.ctx || {}));
  // NUNCA tocar el Firestore real (la app escribe expFenix/globals al guardar): todo lo de googleapis de Firestore se corta.
  await ctx.route(u => u.hostname === 'firestore.googleapis.com', r => { if (opt.firestoreReal) return r.continue(); r.abort(); });
  await ctx.route(u => /^(firebasestorage|identitytoolkit|securetoken)\.googleapis\.com$/.test(u.hostname), r => r.abort());
  if (opt.drive) {
    await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: opt.drive.gis }));
    await ctx.route(/www\.googleapis\.com\/(upload|drive)\//, opt.drive.handler);
    await ctx.route(/apis\.google\.com\/js\/api\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: opt.drive.picker }));
  } else await ctx.route(/www\.googleapis\.com\/(upload|drive)\/|accounts\.google\.com/, r => r.abort());
  if (opt.config != null) await ctx.route(/\/nube-config\.js$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: opt.config }));
  return { br, ctx };
}

export async function abrirApp(ctx, url, logs) {
  const p = await ctx.newPage();
  p.on('dialog', dlg => { (logs || []).push('dialog: ' + dlg.message().slice(0, 90)); dlg.accept(); });
  p.on('console', m => { if (m.type() === 'error') (logs || []).push('console.error: ' + m.text().slice(0, 200)); });
  p.on('pageerror', e => (logs || []).push('pageerror: ' + e.message));
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => document.querySelector('#estadoGuardado') && !/Cargando/.test(document.querySelector('#estadoGuardado').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(400);
  return p;
}

// borrador de prueba con n equipos (los datos del ejemplo de la app, sin pendientes)
export function borrador(n, rs) {
  const eq = i => ({ id: 'eq' + String(i).padStart(3, '0'), nombre: `COMPRESOR DE AIRE NO. ${i}`, numeroSerie: String(1600 + i), tag: `COM-${String(i).padStart(2, '0')}`, fluido: 'AIRE', capacidadVolumetrica: '0.500', presionDiseno: '12.00', presionCalibracion: '10.50', presionArranque: '7.00', presionOperacion: '9.00', presionTrabajoMaxPermitida: '18.65', presionPruebaHidrostatica: '13.20', tempDiseno: '55', tempOperacion: '28', tipoDispositivoRelevo: 'VALVULA DE SEGURIDAD', tipoValvula: 'ARGOLLA', diametroValvulaMm: '6', numDispositivosRelevo: '1', ubicacion: 'CUARTO ELECTRICO', marca: 'ALANSA', anioFabricacion: '2002', fechaPnd: '2026-07-17', codigoMemoriaCalculo: `RSP-020-${String(30 + i).padStart(3, '0')}-2026`, espEnv: Array(16).fill('4.40'), espSup: Array(16).fill('4.30'), espInf: Array(16).fill('4.30'), diametroInteriorCm: '60', longitudMm: '1500', profundidadTapaMm: '150', plano: { orientacion: 'H', cejaRectaMm: '34' } });
  return { version: 1, draft: { razonSocialPropietario: rs || 'PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.', razonSocialUsuario: rs || 'PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.', rfcEmpresa: 'PAI020225076', domicilio: 'AV. TLAHUAC NO. 4344, LOMAS ESTRELLA, Iztapalapa, 09890, Ciudad de México', representanteLegalNombre: 'HERNANDEZ CASTILLO GEORGINA', testigo1Nombre: 'POSADAS LOPEZ MANUEL EUSEBIO', testigo2Nombre: 'ROBERTO GARCIA GARCIA', testigo2Curp: 'GAGR750312HDFRRB07', tel94ProteccionCivil: '', tel94Policia: '', tel94Bomberos: '', tel94CruzRoja: '', tel94Emergencias: '911', equipos: Array.from({ length: n }, (_, k) => eq(k + 1)) }, imgs: {} };
}

export async function importarBorrador(p, obj, nombre) {
  const f = OUT + '/' + (nombre || 'borrador_prueba.json'); fs.writeFileSync(f, JSON.stringify(obj));
  await p.setInputFiles('#fImport', f);
  await p.waitForFunction(() => /Borrador importado/.test(document.querySelector('#toast').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(600);
}

// «Generar sin descargar» o «Generar y descargar ZIP»; devuelve los PDF (bytes) y, si hay, el ZIP
export async function generar(p, zip, timeout) {
  if (!(await p.isVisible('#btnZip'))) { await p.click('#pasos li[data-paso="generar"] button'); await p.waitForSelector('#btnZip', { state: 'visible' }); }
  await p.evaluate(() => { const b = document.querySelector('#btnZip'); if (b.disabled) throw new Error('Generar deshabilitado: ' + document.querySelector('#validacion').innerText); });
  let dl = null; if (zip) dl = p.waitForEvent('download', { timeout: timeout || 600000 });
  await p.click(zip ? '#btnZip' : '#btnGenerar');
  await p.waitForFunction(() => /EXPEDIENTE/.test(document.querySelector('#sellado').innerText) || /Error al generar/.test(document.querySelector('#toast').textContent), null, { timeout: timeout || 600000 });
  const err = await p.evaluate(() => /Error al generar/.test(document.querySelector('#toast').textContent) ? document.querySelector('#toast').textContent : '');
  if (err) throw new Error(err);
  const pdfs = await p.evaluate(async () => { const out = []; for (const li of document.querySelectorAll('#archivos li')) { const a = li.querySelector('a'), n = li.querySelector('.nom').firstChild.textContent; const b = new Uint8Array(await (await fetch(a.href)).arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); out.push({ n, b64: btoa(s) }); } return out; });
  let zipBuf = null; if (dl) { const d = await dl; const f = OUT + '/' + d.suggestedFilename(); await d.saveAs(f); zipBuf = fs.readFileSync(f); }
  return { pdfs: pdfs.map(x => ({ nombre: x.n, bytes: Buffer.from(x.b64, 'base64') })), zip: zipBuf };
}
