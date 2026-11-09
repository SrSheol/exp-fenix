// B · registro (emulador), revisiones, Drive simulado, verificar.html, historial, cancelar / eliminar, cuenta no autorizada, sin conexión y capturas.
import fs from 'fs';
import { execFileSync } from 'child_process';
import JSZip from 'jszip';
import { servidor, navegador, abrirApp, borrador, importarBorrador, generar, driveSimulado, CONFIG_EMU, PROY, OUT } from './h.mjs';

const CAP = PROY + '/capturas'; fs.mkdirSync(CAP, { recursive: true });
let ok = 0, mal = 0; const R = [];
const t = (c, m) => { (c ? ok++ : mal++); R.push((c ? '✓ ' : '✗ ') + m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const EMU = 'http://127.0.0.1:8080/v1/projects/demo-fenix/databases/(default)/documents';
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const leer = async ruta => { const r = await fetch(`${EMU}/${ruta}`, { headers: owner }); if (r.status === 404) return null; const j = await r.json(); const o = {}; for (const [k, v] of Object.entries(j.fields || {})) o[k] = v.stringValue ?? (v.integerValue != null ? +v.integerValue : v.booleanValue ?? v.timestampValue ?? v.mapValue ?? (v.arrayValue ? (v.arrayValue.values || []).map(z => z.mapValue ? Object.fromEntries(Object.entries(z.mapValue.fields || {}).map(([a, b]) => [a, b.stringValue ?? (b.integerValue != null ? +b.integerValue : b)])) : z) : v)); return o; };
const hoyMx = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });
const ymdMx = (dias) => new Date(Date.now() + (dias || 0) * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const sha = s => execFileSync('node', ['-e', `process.stdout.write(require('crypto').createHash('sha256').update(${JSON.stringify(s)}).digest('hex'))`], { encoding: 'utf8' });
const py = (...a) => JSON.parse(execFileSync('python', ['-P', ...a], { encoding: 'utf8' }).trim().split('\n').pop());

// reglas actuales (../firestore.rules) en el emulador + emulador limpio + lista de acceso
{ const r = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-fenix:securityRules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: fs.readFileSync(PROY + '/firestore.rules', 'utf8') }] } }) }); if (!r.ok) throw new Error('no se cargaron las reglas: ' + r.status); }
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-fenix/databases/(default)/documents', { method: 'DELETE' });
await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-fenix/accounts', { method: 'DELETE' });
await fetch(`${EMU}/config/acceso`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: { emails: { arrayValue: { values: [{ stringValue: 'juan@fenixmex.com' }, { stringValue: 'apoyomecv@gmail.com' }] } } } }) });

const srv = await servidor(5512, PROY);
const drive = driveSimulado({ fallar503: 1, expirar401: 1 });
const cfg = CONFIG_EMU();
const { br, ctx } = await navegador({ config: cfg, drive });
const logs = [];
const BASE = 'http://127.0.0.1:5512';
const entrar = (p, email, name) => p.evaluate(async ({ email, name }) => { const c = firebase.auth.GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name })); await window.FXNube.nb.auth.signInWithCredential(c); }, { email, name });
const esperar = (p, fn, arg, ms) => p.waitForFunction(fn, arg, { timeout: ms || 120000 });
const est = p => p.evaluate(() => window.FXNube.estado());

console.log('== Sin sesión: generar funciona y queda «Pendiente de registrar»');
const p = await abrirApp(ctx, `${BASE}/index.html#generar`, logs);
await importarBorrador(p, borrador(14), 'nube14.json');
await p.evaluate(() => { window.FXNube.nube.colaAvisoMB = 5; });
const g1 = await generar(p, true);
let e = await est(p);
t(await p.waitForFunction(() => /pesa \d+ MB\. Queda guardado en este navegador/.test(document.querySelector('#toast').textContent), null, { timeout: 15000 }).then(() => true, () => false), 'cola: aviso al dejar en cola un ZIP más grande que el límite (prueba con 5 MB; el normal es 100 MB)');
await p.click('#btnNube'); await p.waitForTimeout(300);
t(await p.evaluate(() => /ZIP de \d+ MB guardado en este navegador/.test(document.querySelector('#histPend').innerText)), 'cola: Mis expedientes marca el ZIP grande guardado en el navegador');
await p.click('#mNube [data-cerrar]'); await p.evaluate(() => { delete window.FXNube.nube.colaAvisoMB; });
t(e.pend.length === 1 && !e.pend[0].reg, `ZIP generado y descargado sin sesión; queda pendiente ${e.pend[0] && e.pend[0].folio}`);
const F = e.fxId.folio, K = e.fxId.clave, ID = sha(F + '.' + K);
t(await p.evaluate(() => !document.querySelector('#btnNubePend').hidden && document.querySelector('#btnNubePend').textContent === '1'), 'la barra muestra 1 pendiente (aviso no bloqueante)');
t(await p.evaluate(() => /Pendiente de registrar/.test(document.querySelector('#fxIdBox').innerText) && /inicia sesión/.test(document.querySelector('#fxIdBox').innerText)), 'Generar › Código de verificación dice «Pendiente de registrar · inicia sesión con Google»');
await p.locator('#t-fxid').screenshot({ path: CAP + '/generar-codigo-pendiente.png' });
t((await leer(`expedientes/${F}`)) === null, 'nada escrito en el registro sin sesión');

console.log('== Inicia sesión (cuenta autorizada) → se registra solo y sube a Drive (con un 503 y un token vencido a medio camino)');
await entrar(p, 'juan@fenixmex.com', 'Juan Pérez');
await esperar(p, () => window.FXNube.estado().aut === true);
await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 180000);
let x = await leer(`expedientes/${F}`);
t(x && x.revision === 1 && x.estado === 'vigente' && x.clave === K && x.claveHash === ID, `registro privado expedientes/${F}: revisión 1, vigente, clave y claveHash`);
t(x && x.numEquipos === 14 && x.hojas > 0 && x.razonSocial.startsWith('PEÑA'), `registro: 14 equipos, ${x && x.hojas} hojas, razón social`);
let v = await leer(`verificaciones/${ID}`);
t(v && v.revision === 1 && v.folio === F && Object.keys(v).sort().join() === 'actualizado,emitidoPor,estado,fechaEmisionDictamen,folio,huella,razonSocial,revision', 'registro público verificaciones/sha256(folio.clave): solo los campos de la verificación (sin clave)');
const zipD = drive.files.get(x.driveZipId), borD = drive.files.get(x.driveBorradorId);
t(zipD && zipD.datos.equals(g1.zip) && zipD.parents[0] === x.driveCarpetaId, `ZIP en Drive (${(g1.zip.length / 1048576).toFixed(1)} MB, subida reanudable en trozos de 8 MB) idéntico al descargado, en la subcarpeta del expediente`);
const carpeta1 = x.driveCarpetaId;
{ const c = drive.carpetas.get(carpeta1);
  t(c && c.name === `${F} · PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.` && c.parents[0] === 'CARPETA1' && c.mimeType === 'application/vnd.google-apps.folder' && drive.carpetas.size === 1, `subcarpeta: la primera subida crea «${c && c.name}» dentro de «Fenix · Expedientes» y guarda driveCarpetaId`);
  t(borD && borD.parents[0] === carpeta1, 'subcarpeta: el borrador también va dentro'); }
t(borD && JSON.parse(borD.datos.toString()).draft.fxId.folio === F, 'borrador (.json) en Drive con el folio y la clave');
t(drive.log.some(l => l.startsWith('PUT /upload/sesion')) && drive.log.filter(l => /^PUT/.test(l)).length >= 3, `reintentos: un 503 y un 401 (token vencido) se superaron (${drive.log.filter(l => /^PUT/.test(l)).length} PUT)`);
const huella1 = x.huella;
t(huella1 === (await p.evaluate(() => window.FXNube.huellaActual())), 'la huella registrada es la de los datos del expediente');
{ // portada: «Folio … · Huella xxxxxxxx» bajo «Escanee para verificar autenticidad»
  const zz = await JSZip.loadAsync(g1.zip), pdf = await zz.file(/^EXP .*\.pdf$/)[0].async('nodebuffer'), f = `${OUT}/b_portada.pdf`; fs.writeFileSync(f, pdf);
  const txt = py('-c', `import pymupdf,json;d=pymupdf.open(r'${f}');print(json.dumps(d[0].get_text()))`);
  const lineas = txt.split('\n').map(z => z.trim()), k = lineas.indexOf('Escanee para verificar autenticidad');
  t(k >= 0 && lineas[k + 1] === `Folio ${F} · Huella ${huella1.slice(0, 8)}`, `portada: «${lineas[k + 1]}» bajo la leyenda del QR (8 primeros de la huella registrada)`);
  t(!/Vista previa/i.test(txt), 'portada del ZIP exportado: sin la marca «Vista previa»');
  execFileSync('python', ['-P', '-c', `import pymupdf;d=pymupdf.open(r'${f}');p=d[0];p.get_pixmap(dpi=150).save(r'${CAP}/portada-pdf-150dpi.png');p.get_pixmap(dpi=300,clip=pymupdf.Rect(196,540,416,712)).save(r'${CAP}/portada-qr-huella-300dpi.png')`]);
  t(x.dictamenExterno === true && x.fechaEmisionDictamen === '' && v.fechaEmisionDictamen === '', 'Cat III: se registra sin fecha de dictamen (en trámite) y marcado como dictamen externo');
}

console.log('== Reexportar sin cambios → sigue en la revisión 1, misma huella, mismo QR, mismos archivos de Drive (se actualizan)');
const g2 = await generar(p, true);
await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 180000);
x = await leer(`expedientes/${F}`); v = await leer(`verificaciones/${ID}`);
t(x.revision === 1 && v.revision === 1 && x.huella === huella1, 'reexportar los mismos datos: sigue en la revisión 1 · misma huella (no sube)');
t(drive.files.get(x.driveZipId).versiones === 2 && drive.files.size === 2, 'Drive: el mismo ZIP y el mismo borrador se actualizan (sin duplicados)');
t(x.driveCarpetaId === carpeta1 && drive.carpetas.size === 1 && drive.files.get(x.driveZipId).parents[0] === carpeta1 && drive.files.get(x.driveBorradorId).parents[0] === carpeta1, 'subcarpeta: reexportar usa la misma carpeta y reemplaza los mismos archivos dentro');
{ // nombre de la subcarpeta: «FX-… · Razón social», sin caracteres problemáticos, ≤ 120
  const nc = (f, rs) => p.evaluate(([f, rs]) => window.FXNube.nombreCarpeta(f, rs), [f, rs]);
  t((await nc('FX-2026-ABCDEF', 'PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.')) === 'FX-2026-ABCDEF · PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.', 'nombre de carpeta: «folio · razón social» (conserva acentos y el punto final)');
  const raro = await nc('FX-2026-ABCDEF', 'ACME / "ÑANDÚ" <S.A.>:\tC*V?|\\x\n');
  t(raro === 'FX-2026-ABCDEF · ACME ÑANDÚ S.A. C V x', `nombre de carpeta: sin \\ / : * ? " < > |, tabuladores ni saltos; espacios simples («${raro}»)`);
  const largo = await nc('FX-2026-ABCDEF', 'CORPORATIVO INDUSTRIAL, '.repeat(12));
  t([...largo].length <= 120 && largo.startsWith('FX-2026-ABCDEF · CORPORATIVO INDUSTRIAL') && !/[\s·,;-]$/.test(largo), `nombre de carpeta: recortado a ${[...largo].length} caracteres, sin separador colgando`);
  t((await nc('FX-2026-ABCDEF', '   ')) === 'FX-2026-ABCDEF' && (await nc('FX-2026-ABCDEF', 'PEÑA')) === 'FX-2026-ABCDEF · PEÑA', 'nombre de carpeta: sin razón social queda solo el folio; acentos combinados se normalizan');
}
const qr = (b, n) => { const f = `${OUT}/${n}.pdf`; fs.writeFileSync(f, b); return py('decode_py.py', f, '1', '150', `${OUT}/${n}.png`, '240', '545', '372', '677').zxing[0]; };
const u1 = qr((await JSZip.loadAsync(g1.zip)).file(/\.pdf$/)[0] ? await (await JSZip.loadAsync(g1.zip)).file(/^EXP .*\.pdf$/)[0].async('nodebuffer') : g1.pdfs[0].bytes, 'b_rev1'), u2 = qr(g2.pdfs[0].bytes, 'b_rev2');
t(u1 === u2 && u1 === `https://srsheol.github.io/exp-fenix/verificar.html#${F}.${K}`, 'el QR de la portada es idéntico en las revisiones 1 y 2 (leído del PDF dentro del ZIP)');

console.log('== «Generar sin descargar» nunca sube la revisión (ni con datos nuevos)');
await p.evaluate(() => { const { D } = window.FXNube.datos(); D.equipos[9].numeroSerie = '9999'; });
const gPrev = await generar(p, false); await p.waitForTimeout(1500);
{ // la portada de la vista previa lleva «Vista previa · sin registrar» bajo la línea del folio
  const f = `${OUT}/b_vista_previa.pdf`; fs.writeFileSync(f, gPrev.pdfs[0].bytes);
  const lin = py('-c', `import pymupdf,json;d=pymupdf.open(r'${f}');print(json.dumps(d[0].get_text()))`).split('\n').map(z => z.trim()), k = lin.indexOf('Escanee para verificar autenticidad');
  t(k >= 0 && /^Folio FX-\d{4}-\w{6} · Huella [0-9a-f]{8}$/.test(lin[k + 1]) && lin[k + 2] === 'Vista previa · sin registrar', `vista previa: la portada dice «${lin[k + 2]}» bajo el folio y la huella`);
  const sp = py('-c', `import pymupdf,json;d=pymupdf.open(r'${f}');print(json.dumps([[s['text'],s['size'],s['color']] for b in d[0].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] if 'Vista previa' in s['text']]))`);
  t(sp.length === 1 && Math.abs(sp[0][1] - 7) < 0.15 && sp[0][2] === 0x4A0205, `vista previa: la marca va en vino (#${sp[0] ? sp[0][2].toString(16).padStart(6, '0') : '—'}) a ${sp[0] ? sp[0][1].toFixed(1) : '—'} pt`);
  execFileSync('python', ['-P', '-c', `import pymupdf;d=pymupdf.open(r'${f}');p=d[0];p.get_pixmap(dpi=150).save(r'${CAP}/portada-vista-previa-150dpi.png');p.get_pixmap(dpi=300,clip=pymupdf.Rect(196,540,416,712)).save(r'${CAP}/portada-vista-previa-qr-300dpi.png')`]);
}
e = await est(p); x = await leer(`expedientes/${F}`);
t(e.pend.length === 0 && x.revision === 1 && x.huella === huella1, 'generar sin descargar con un dato cambiado: no queda pendiente y el registro sigue en la revisión 1');
t(await p.evaluate(() => /Vista previa: no cambia el registro del QR/.test(document.querySelector('#notaVistaPrevia') ? document.querySelector('#notaVistaPrevia').textContent : '')), 'generar sin descargar avisa que es una vista previa');
console.log('== Cambiar un equipo y exportar el ZIP → revisión 2 con huella nueva');
await generar(p, true);
await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 180000);
x = await leer(`expedientes/${F}`);
t(x.revision === 2 && x.huella !== huella1, 'revisión 2 · huella distinta');
const revs = await (await fetch(`${EMU}/expedientes/${F}/revisiones`, { headers: owner })).json();
t((revs.documents || []).length === 2, 'bitácora privada con 2 revisiones (no es pública; la reexportación idéntica no agregó ninguna)');

console.log('== verificar.html');
const vctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
await vctx.route(/\/nube-config\.js$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: cfg }));
const dctx = await br.newContext({ viewport: { width: 1280, height: 860 }, locale: 'es-MX' });
await dctx.route(/\/nube-config\.js$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: cfg }));
const ver = async (c, hash, nombre) => { const q = await c.newPage(); await q.goto(`${BASE}/verificar.html#${hash}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando', null, { timeout: 30000 }); const r = await q.evaluate(() => ({ e: document.querySelector('#t').dataset.e, t: document.querySelector('#tit').textContent, d: document.querySelector('#datos').innerText })); if (nombre) await q.screenshot({ path: `${CAP}/${nombre}.png`, fullPage: true, animations: 'disabled' }); return { q, r }; };
let r = await ver(vctx, `${F}.${K}`, 'verificar-tramite-movil'); await ver(dctx, `${F}.${K}`, 'verificar-tramite-escritorio');
t(r.r.e === 'valido' && /Expediente válido/.test(r.r.t) && r.r.d.includes(F) && r.r.d.includes('PEÑA Y ASOCIADOS') && /FenixMex/.test(r.r.d), 'válido: folio, razón social y emitido por FenixMex');
{ const todo = await r.q.evaluate(() => document.body.innerText), sinFila = await r.q.evaluate(() => !document.querySelector('#vRev'));
  t(!/Revisión/i.test(todo) && sinFila, 'la página pública ya no muestra la revisión (sigue en el registro y en Mis expedientes)');
  t(!/Este código certifica/.test(todo) && !/Verifique que la dirección/.test(todo), 'sin las notas «Este código certifica…» y «Verifique que la dirección…»');
  t(!/expertos/.test(todo) && (await r.q.evaluate(() => document.querySelector('#vFecha').innerText.trim())) === 'En trámite', '«En trámite» va solo, sin texto de ayuda debajo'); }
t(await r.q.evaluate(() => { const c = document.querySelector('#vFecha .chip'); return !!c && c.textContent === 'En trámite' && getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)'; }) && /Fecha de emisión del dictamen\s*En trámite/i.test(r.r.d), 'Cat III sin fecha: «Fecha de emisión del dictamen: En trámite» (chip oro) y el estado sigue «Expediente válido»');
const hv = await r.q.evaluate(() => { document.querySelector('#hDet').open = true; return document.querySelector('#vH').textContent.replace(/\s/g, ''); });
t(hv === x.huella, 'la huella completa (desplegable) es la registrada');
t(await r.q.evaluate(() => { const i = document.querySelector('.cab .marca img'); return !!i && /^data:image\/jpeg;base64,/.test(i.src) && i.complete && i.naturalWidth >= 90; }), 'encabezado: logo del fénix de FenixMex incrustado en la página (sin descargas)');
{ // la página no pide nada fuera de sí misma, nube-config.js y el registro
  const q = await vctx.newPage(), urls = []; q.on('request', rq => urls.push(rq.url()));
  await q.goto(`${BASE}/verificar.html#${F}.${K}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando');
  // (se ignora lo que inyecta el antivirus de esta máquina en páginas http://, p. ej. kaspersky-labs.com: no lo pide la página)
  const fuera = urls.filter(u => !/^https?:\/\/[^/]*kaspersky-labs\.com\//.test(u)).filter(u => !u.startsWith(BASE + '/verificar.html') && !u.startsWith(BASE + '/nube-config.js') && !u.startsWith('http://127.0.0.1:8080/') && !u.startsWith('data:'));
  t(fuera.length === 0, `verificar.html sigue autosuficiente: ${urls.length} peticiones, ninguna externa${fuera.length ? ' (' + fuera.join(', ') + ')' : ''}`);
  await q.close();
}
r = await ver(vctx, `${F}.ZZZZZZZZZZZZ`); t(r.r.e === 'invalido', 'clave equivocada → «No válido / no encontrado»');
r = await ver(vctx, `FX-2026-ABCDEF.${K}`, 'verificar-noencontrado-movil'); await ver(dctx, `FX-2026-ABCDEF.${K}`, 'verificar-noencontrado-escritorio');
t(r.r.e === 'invalido' && /No válido/.test(r.r.t), 'folio inexistente → «No válido / no encontrado»');
r = await ver(vctx, 'basura'); t(r.r.e === 'invalido', 'enlace sin código válido → «No válido»');
{ // fragmentos mal formados: directo a «No válido», nunca se quedan en «Verificando…»
  const casos = [['%', '«#%» (escape roto)'], ['', 'fragmento vacío'], ['FX-2026-ABCDEF', 'sin clave'], ['FX-2026-ABCDEF.', 'clave vacía'], [`${F}.${K}%E0%A4%A`, 'escape incompleto al final'], ['%%%FX', 'varios %'], [`${F}.${K}.extra`, 'segmento de más'], ['x'.repeat(5000), 'fragmento enorme']];
  for (const [h, nom] of casos) { const z = await ver(vctx, h); t(z.r.e === 'invalido' && /No válido/.test(z.r.t), `mal formado (${nom}) → «No válido»`); await z.q.close(); }
  const q = await vctx.newPage(); await q.goto(`${BASE}/verificar.html`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando', null, { timeout: 10000 }).catch(() => {});
  t((await q.evaluate(() => document.querySelector('#t').dataset.e)) === 'invalido', 'sin «#» en la dirección → «No válido»'); await q.close();
  const m1 = await ver(vctx, '%', 'verificar-malformado-movil'); await ver(dctx, '%', 'verificar-malformado-escritorio'); await m1.q.close();
}
{ // sin conexión: la página cargó, el teléfono pierde la red y toca «Intentar de nuevo»
  for (const [c, n] of [[vctx, 'verificar-sinconexion-movil'], [dctx, 'verificar-sinconexion-escritorio']]) {
    const q = await c.newPage(); await q.goto(`${BASE}/verificar.html#${F}.${K}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e === 'valido');
    await c.setOffline(true); await q.evaluate(() => document.querySelector('#reint').click()); await q.waitForFunction(() => document.querySelector('#t').dataset.e === 'offline');
    const tt = await q.textContent('#tit'); await q.screenshot({ path: `${CAP}/${n}.png`, fullPage: true, animations: 'disabled' }); await c.setOffline(false);
    if (c === vctx) t(/Sin conexión, intente de nuevo/.test(tt), 'sin red → «Sin conexión, intente de nuevo» con botón para reintentar');
  }
  // servidor caído / bloqueado (red presente pero sin respuesta)
  const q = await vctx.newPage(); await q.route(/127\.0\.0\.1:8080/, rr => rr.abort()); await q.goto(`${BASE}/verificar.html#${F}.${K}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando');
  t((await q.evaluate(() => document.querySelector('#t').dataset.e)) === 'offline', 'registro inalcanzable → estado sin conexión (no «válido» ni «no válido»)');
}
{ // SHA-256 de respaldo (navegadores sin crypto.subtle) = crypto.subtle
  const q = await vctx.newPage(); await q.addInitScript(() => { try { Object.defineProperty(window.crypto, 'subtle', { value: undefined }); } catch (e) {} });
  await q.goto(`${BASE}/verificar.html#${F}.${K}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando');
  t((await q.evaluate(() => document.querySelector('#t').dataset.e)) === 'valido', 'SHA-256 de respaldo (sin crypto.subtle) da el mismo id → válido');
}
{ // dirección distinta → advertencia
  const q = await vctx.newPage();
  await q.route(/^http:\/\/copia-falsa\.prueba\//, rr => { const u = new URL(rr.request().url()); rr.fulfill({ status: 200, contentType: u.pathname.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8', body: u.pathname.endsWith('.js') ? cfg : fs.readFileSync(PROY + '/verificar.html') }); });
  await q.goto(`http://copia-falsa.prueba/verificar.html#${F}.${K}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando');
  t(await q.evaluate(() => { const d = document.querySelector('#dom'); return !d.classList.contains('oculto') && /copia-falsa\.prueba/.test(d.innerText) && /No confíe/.test(d.innerText); }), 'en otra dirección aparece la advertencia roja «No confíe en este resultado» (solo ahí)');
  await q.screenshot({ path: `${CAP}/verificar-otra-direccion-movil.png`, fullPage: true, animations: 'disabled' }); await q.close();
  // «Servicio no disponible» (nube sin configurar o registro caído): celular y escritorio
  for (const [vp, n] of [[{ width: 390, height: 844 }, 'movil'], [{ width: 1280, height: 860 }, 'escritorio']]) {
    const c = await br.newContext({ viewport: vp, deviceScaleFactor: vp.width < 600 ? 2 : 1, isMobile: vp.width < 600, hasTouch: vp.width < 600, locale: 'es-MX' });
    await c.route(/\/nube-config\.js$/, rr => rr.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.FX_NUBE={firebase:null};' }));
    const z = await c.newPage(); await z.goto(`${BASE}/verificar.html#${F}.${K}`); await z.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando');
    if (n === 'movil') t((await z.evaluate(() => document.querySelector('#t').dataset.e)) === 'error' && /Servicio no disponible/.test(await z.textContent('#tit')), 'error: «Servicio no disponible» con «Intentar de nuevo»');
    await z.screenshot({ path: `${CAP}/verificar-error-${n}.png`, fullPage: true, animations: 'disabled' }); await c.close();
  }
}

console.log('== Historial: más expedientes, otra persona, abrir para corregir, cancelar, eliminar');
// segundo y tercer expediente (folios nuevos); el tercero lo hace otra cuenta autorizada
{ const b2 = borrador(1, 'COMPRESORES DEL BAJÍO, S.A. DE C.V.'); b2.draft.equipos[0].presionCalibracion = '6.00'; b2.draft.equipos[0].folio = '123';
  await importarBorrador(p, b2, 'b2.json'); }
await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000);
const F2 = (await est(p)).fxId.folio;
{ // Cat II: fecha = día de la primera generación, estable en las correcciones
  let x2 = await leer(`expedientes/${F2}`);
  t(x2.dictamenExterno === false && x2.fechaEmisionDictamen === ymdMx(0), `Cat II: fecha de emisión = día en que se generó (${x2.fechaEmisionDictamen})`);
  await p.evaluate(() => { const { D } = window.FXNube.datos(); D.equipos[0].marca = 'ALANSA B'; D.fxId.fechaEmision = '2026-01-15'; });
  await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000);
  x2 = await leer(`expedientes/${F2}`); const K2b = x2.clave, v2 = await leer(`verificaciones/${sha(F2 + '.' + K2b)}`);
  t(x2.revision === 2 && x2.fechaEmisionDictamen === ymdMx(0) && v2.fechaEmisionDictamen === ymdMx(0), 'Cat II: corregir y reexportar (revisión 2) conserva la fecha registrada');
  const z = await ver(vctx, `${F2}.${K2b}`); t(z.r.e === 'valido' && z.r.d.includes(hoyMx) && !(await z.q.$('#vFecha .chip')), `Cat II en verificar.html: «${hoyMx}» (sin «En trámite»)`); await z.q.close();
  // subcarpeta: cambiar la razón social la renombra (misma carpeta)
  const c2 = x2.driveCarpetaId, rsCambio = async rs => { await p.evaluate(rs => { const { D } = window.FXNube.datos(); D.razonSocialPropietario = D.razonSocialUsuario = rs; }, rs); await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000); return leer(`expedientes/${F2}`); };
  t(c2 && drive.carpetas.get(c2).name === `${F2} · COMPRESORES DEL BAJÍO, S.A. DE C.V.`, 'subcarpeta de F2 con su razón social');
  x2 = await rsCambio('COMPRESORES DEL BAJÍO NORTE, S.A. DE C.V.');
  t(x2.driveCarpetaId === c2 && drive.carpetas.get(c2).name === `${F2} · COMPRESORES DEL BAJÍO NORTE, S.A. DE C.V.` && x2.razonSocial === 'COMPRESORES DEL BAJÍO NORTE, S.A. DE C.V.', 'cambiar la razón social renombra la misma subcarpeta');
  drive.sinRenombrar.add(c2);
  x2 = await rsCambio('COMPRESORES DEL BAJÍO, S.A. DE C.V.');
  t(x2.razonSocial === 'COMPRESORES DEL BAJÍO, S.A. DE C.V.' && x2.driveCarpetaId === c2 && drive.carpetas.get(c2).name.endsWith('NORTE, S.A. DE C.V.') && drive.files.get(x2.driveZipId).parents[0] === c2, 'si Drive no deja renombrar la carpeta, el guardado y la subida siguen bien (el nombre queda como estaba)');
  drive.sinRenombrar.delete(c2);
}
await p.evaluate(() => window.FXNube.nb.auth.signOut()); await entrar(p, 'apoyomecv@gmail.com', 'Apoyo MECV'); await esperar(p, () => window.FXNube.estado().aut === true);
await importarBorrador(p, borrador(3, 'LAVANDERÍA INDUSTRIAL LA ESTRELLA, S.A. DE C.V.'), 'b3.json');
await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000);
const F3 = (await est(p)).fxId.folio;
console.log('== Drive: expediente con archivos sueltos (de antes de las subcarpetas) → subcarpeta en la siguiente exportación');
{
  const sueltos = async () => {   // como un expediente anterior: sin driveCarpetaId, ZIP y borrador sueltos en «Fenix · Expedientes», sin subcarpeta
    const y = await leer(`expedientes/${F3}`);
    for (const id of [y.driveZipId, y.driveBorradorId]) drive.files.get(id).parents = ['CARPETA1'];
    drive.carpetas.delete(y.driveCarpetaId);
    await fetch(`${EMU}/expedientes/${F3}?updateMask.fieldPaths=driveCarpetaId`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: {} }) });
    return y; };
  let y0 = await sueltos();
  t((await leer(`expedientes/${F3}`)).driveCarpetaId === undefined && drive.files.get(y0.driveZipId).parents[0] === 'CARPETA1', 'expediente anterior: archivos sueltos y sin driveCarpetaId');
  await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000);
  let y = await leer(`expedientes/${F3}`); const c3 = drive.carpetas.get(y.driveCarpetaId);
  t(c3 && c3.name === `${F3} · LAVANDERÍA INDUSTRIAL LA ESTRELLA, S.A. DE C.V.` && c3.parents[0] === 'CARPETA1', 'archivos sueltos: la siguiente exportación crea la subcarpeta');
  t(y.driveZipId === y0.driveZipId && y.driveBorradorId === y0.driveBorradorId && drive.files.get(y.driveZipId).parents.join() === y.driveCarpetaId && drive.files.get(y.driveBorradorId).parents.join() === y.driveCarpetaId, 'archivos sueltos: el ZIP y el borrador se MUEVEN a la subcarpeta (mismos archivos, sin copias)');
  t(![...drive.files.values()].some(f => (f.parents || []).includes('CARPETA1')), '«Fenix · Expedientes» ya no tiene archivos sueltos');
  // sin acceso al ZIP suelto (lo subió otra cuenta): se sube uno nuevo dentro y el anterior queda anotado
  y0 = await sueltos(); drive.ajenos.add(y0.driveZipId);
  await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000);
  y = await leer(`expedientes/${F3}`); const pc = Array.isArray(y.pendingCleanup) ? y.pendingCleanup : [];
  t(drive.carpetas.has(y.driveCarpetaId) && y.driveZipId !== y0.driveZipId && drive.files.get(y.driveZipId).parents[0] === y.driveCarpetaId && y.driveBorradorId === y0.driveBorradorId && drive.files.get(y.driveBorradorId).parents[0] === y.driveCarpetaId, 'sin acceso al ZIP suelto: se sube uno nuevo en la subcarpeta (el borrador sí se movió)');
  t(pc.some(h => h.fileId === y0.driveZipId && h.tipo === 'ZIP' && h.status === 403) && drive.files.get(y0.driveZipId).parents[0] === 'CARPETA1', 'sin acceso: el ZIP suelto anterior queda en pendingCleanup y donde estaba');
}
t(F2 !== F && F3 !== F2 && /^FX-2026-/.test(F3), `folios distintos por expediente (${F}, ${F2}, ${F3})`);
// abrir el primero (lo hizo Juan) para corregirlo
await p.click('#btnNube'); await esperar(p, () => document.querySelectorAll('#histLista .hist-it').length === 3);
t(await p.evaluate(F => { const li = [...document.querySelectorAll('#histLista .hist-it')]; const a = li.find(x => x.innerText.includes(F)); return a && /Rev\. 2/.test(a.innerText) && /Hizo: Juan Pérez/.test(a.innerText) && /Vigente/i.test(a.innerText); }, F), 'historial: folio, razón social, fecha, revisión, estado, quién lo hizo y última modificación');
await p.fill('#histQ', 'bajio'); t(await p.evaluate(() => document.querySelectorAll('#histLista .hist-it').length === 1), 'búsqueda sin acentos («bajio» encuentra BAJÍO)');
await p.fill('#histQ', ''); await p.waitForTimeout(700); await p.screenshot({ path: CAP + '/historial-escritorio.png' });
await p.click(`[data-hist="abrir"][data-f="${F}"]`);
await esperar(p, F => window.FXNube.estado().fxId && window.FXNube.estado().fxId.folio === F, F, 60000);
await p.waitForTimeout(800);
e = await est(p);
t(e.fxId.folio === F && e.fxId.clave === K && (await p.evaluate(() => window.FXNube.datos().D.equipos.length)) === 14, 'abrir para corregir: carga los 14 equipos desde Drive y conserva folio y clave');
t((await p.evaluate(() => window.FXNube.datos().D.equipos[9].numeroSerie)) === '9999', 'abrir para corregir: trae la última versión de los datos');
const cF = (await leer(`expedientes/${F}`)).driveCarpetaId;
drive.ajenos.add(cF);   // la subcarpeta de F la creó Juan: con drive.file, apoyomecv no puede escribir en ella hasta elegirla en el selector
await p.evaluate(() => { window.__picker = 'elegir'; window.__pickerVeces = 0; });
await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 180000);
x = await leer(`expedientes/${F}`);
t(x.revision === 2, 'abrir desde Drive y reexportar sin cambios: sigue en la revisión 2');
t(x.driveCarpetaId === cF && (await p.evaluate(() => window.__pickerVeces)) === 1 && drive.selector.includes(cF) && (await p.evaluate(() => window.__pickerTitulo)).includes(F) && drive.files.get(x.driveZipId).parents[0] === cF,
  'otra cuenta sin acceso a la subcarpeta: el selector de Google la pide (vista de carpetas), se concede y se sigue usando la misma');
drive.concedidos.delete(cF);   // ahora sin el permiso, y esta vez se cancela el selector
await p.evaluate(() => { window.__picker = 'cancelar'; window.__pickerVeces = 0; window.__toasts = [];
  if (!window.__toastObs) { window.__toastObs = new MutationObserver(() => window.__toasts.push(document.querySelector('#toast').textContent)); window.__toastObs.observe(document.querySelector('#toast'), { childList: true, characterData: true, subtree: true }); } });
await p.evaluate(() => { const { D } = window.FXNube.datos(); D.equipos[3].ubicacion = 'PATIO DE MANIOBRAS'; });
await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 180000);
x = await leer(`expedientes/${F}`);
t(x.revision === 3 && x.updatedBy.fields.email.stringValue === 'apoyomecv@gmail.com' && x.createdBy.fields.email.stringValue === 'juan@fenixmex.com', 'corrección por otra cuenta: revisión 3, la modificó apoyomecv, la hizo Juan');
{ const pc = Array.isArray(x.pendingCleanup) ? x.pendingCleanup : [], cN = drive.carpetas.get(x.driveCarpetaId);
  t(x.driveCarpetaId !== cF && cN && cN.name === `${F} · PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.` && cN.parents[0] === 'CARPETA1' && (await p.evaluate(() => window.__pickerVeces)) === 1, 'selector cancelado: se crea otra subcarpeta (de quien sube) y driveCarpetaId apunta a ella');
  t(pc.some(h => h.fileId === cF && h.tipo === 'carpeta'), 'la subcarpeta anterior queda en pendingCleanup');
  t(drive.files.get(x.driveZipId).parents[0] === x.driveCarpetaId && drive.files.get(x.driveBorradorId).parents[0] === x.driveCarpetaId && (await est(p)).pend.length === 0, 'no se pierde la subida: el ZIP y el borrador quedan en la carpeta nueva');
  t(await p.evaluate(() => window.__toasts.some(z => /se creó otra carpeta para este expediente/.test(z))), 'aviso corto: «Sin acceso a la carpeta … se creó otra carpeta para este expediente»'); }

console.log('== Drive: reemplazar archivos que subió otra cuenta (403) o que ya no se ven (404) → archivo nuevo + nota «pendiente de limpiar»');
{
  const viejoZip = x.driveZipId, viejoBor = x.driveBorradorId;
  drive.ajenos.add(viejoZip);                 // el ZIP lo subió otra persona: no se puede actualizar ni borrar
  drive.files.delete(viejoBor);               // el borrador ya no se ve (404)
  await p.evaluate(() => { const { D } = window.FXNube.datos(); D.equipos[3].ubicacion = 'PATIO NORTE'; });
  await generar(p, true); await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 180000);
  x = await leer(`expedientes/${F}`);
  const pc = Array.isArray(x.pendingCleanup) ? x.pendingCleanup : [];
  t(x.revision === 4 && x.driveZipId && x.driveZipId !== viejoZip && drive.files.has(x.driveZipId) && x.driveBorradorId !== viejoBor && drive.files.has(x.driveBorradorId), 'se suben un ZIP y un borrador nuevos, se registran y el guardado no falla (revisión 4)');
  t(pc.some(h => h.fileId === viejoZip && h.tipo === 'ZIP' && h.status === 403) && pc.some(h => h.fileId === viejoBor && h.tipo === 'borrador' && h.status === 404), 'registro privado: pendingCleanup con el fileId del ZIP anterior (403) y del borrador anterior (404)');
  const vv = await leer(`verificaciones/${ID}`); t(vv && !('pendingCleanup' in vv), 'la nota de limpieza no llega a lo público');
  await p.click('#btnNube'); await esperar(p, F => [...document.querySelectorAll('#histLista .hist-it')].some(li => li.innerText.includes(F)), F);
  t(await p.evaluate(F => { const li = [...document.querySelectorAll('#histLista .hist-it')].find(z => z.innerText.includes(F)); return !!li && /ZIP anterior pendiente de limpiar/.test(li.innerText); }, F), 'Mis expedientes muestra «ZIP anterior pendiente de limpiar» (discreto)');
  await p.click('#mNube [data-cerrar]');
}
console.log('== Cat III: «Dictamen en trámite», filtro y captura de la fecha (sin reexportar)');
{
  const larga = f => { const [a, m, d] = f.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); };
  // el expediente se «creó» hace 20 días (para probar el rango del selector y la corrección)
  await fetch(`${EMU}/expedientes/${F}?updateMask.fieldPaths=createdAt`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: { createdAt: { timestampValue: new Date(Date.now() - 20 * 86400000).toISOString() } } }) });
  const antes = await leer(`expedientes/${F}`), subidas = () => drive.log.filter(l => /^(POST|PATCH|PUT) \/upload/.test(l)).length, sub0 = subidas();
  await p.click('#btnNube'); await esperar(p, () => document.querySelectorAll('#histLista .hist-it').length === 3);
  const item = (f) => p.evaluate(f => { const li = [...document.querySelectorAll('#histLista .hist-it')].find(z => z.querySelector('.hist-folio').textContent === f); return li ? { txt: li.innerText, badge: !!li.querySelector('.hist-est.t'), cap: !!li.querySelector('[data-hist="fecha"]') && li.querySelector('[data-hist="fecha"]').textContent } : null; }, f);
  let a = await item(F), b = await item(F2);
  t(a && a.badge && /Dictamen en trámite/i.test(a.txt) && a.cap === 'Capturar fecha de dictamen' && /Dictamen: en trámite · Cat III/.test(a.txt), 'Mis expedientes: Cat III sin fecha → badge «Dictamen en trámite» y botón «Capturar fecha de dictamen»');
  t(b && !b.badge && !b.cap, 'Cat II: sin badge ni botón de fecha (su fecha es automática)');
  await p.click('#histFiltro [data-hf="tramite"]'); await p.waitForTimeout(200);
  const fl = await p.evaluate(() => [...document.querySelectorAll('#histLista .hist-it .hist-folio')].map(z => z.textContent).sort());
  t(JSON.stringify(fl) === JSON.stringify([F, F3].sort()) && /\(2\)/.test(await p.textContent('#histFiltro [data-hf="tramite"]')), `filtro «Dictamen en trámite (2)»: solo los Cat III pendientes (${fl.join(', ')})`);
  await p.waitForTimeout(500); await p.screenshot({ path: CAP + '/historial-dictamen-en-tramite.png' });
  await p.click('#histFiltro [data-hf=""]');
  // captura
  await p.click(`[data-hist="fecha"][data-f="${F}"]`); await p.waitForSelector('#mFecha:not(.oculto)');
  const lim = await p.evaluate(() => ({ min: document.querySelector('#mFechaIn').min, max: document.querySelector('#mFechaIn').max, tit: document.querySelector('#mFechaT').textContent }));
  t(lim.tit === 'Capturar fecha de dictamen' && lim.min === ymdMx(-20) && lim.max === ymdMx(0), `selector de fecha: entre la creación (${lim.min}) y hoy (${lim.max})`);
  await p.fill('#mFechaIn', ymdMx(2));
  t((await p.isDisabled('#mFechaOk')) && /futura/.test(await p.textContent('#mFechaInfo')), 'fecha futura: no deja continuar');
  await p.fill('#mFechaIn', ymdMx(-25));
  t((await p.isDisabled('#mFechaOk')) && /anterior a la creación/.test(await p.textContent('#mFechaInfo')), 'fecha anterior a la creación del expediente: no deja continuar');
  await p.fill('#mFechaIn', ymdMx(-10));
  t(!(await p.isDisabled('#mFechaOk')), 'fecha válida: se habilita «Continuar»');
  await p.waitForTimeout(300); await p.screenshot({ path: CAP + '/fecha-dictamen-capturar.png' });
  await p.click('#mFechaOk');
  const conf = await p.textContent('#mFechaConf');
  t(await p.isVisible('#mFechaPaso2') && conf.includes(larga(ymdMx(-10))) && conf.includes(F) && (await p.textContent('#mFechaOk')) === 'Sí, guardar fecha', 'paso de confirmación con la fecha y el folio');
  await p.waitForTimeout(300); await p.screenshot({ path: CAP + '/fecha-dictamen-confirmar.png' });
  await p.click('#mFechaNo'); t(await p.isVisible('#mFechaPaso1') && (await leer(`expedientes/${F}`)).fechaEmisionDictamen === '', '«Volver» regresa al selector sin guardar nada');
  await p.click('#mFechaOk'); await p.click('#mFechaOk'); await p.waitForSelector('#mFecha.oculto', { state: 'attached' });
  let x1 = await leer(`expedientes/${F}`), v1 = await leer(`verificaciones/${ID}`);
  t(x1.fechaEmisionDictamen === ymdMx(-10) && v1.fechaEmisionDictamen === ymdMx(-10), 'guardada en el registro privado y en el público (mismo id, mismo QR, misma clave)');
  t(x1.revision === antes.revision && v1.revision === antes.revision && x1.huella === antes.huella && x1.clave === antes.clave, `sin cambiar la revisión (${x1.revision}) ni la huella`);
  t(x1.fechaDictamenPor && x1.fechaDictamenPor.fields.email.stringValue === 'apoyomecv@gmail.com' && x1.fechaDictamenEn && !('fechaDictamenPor' in v1) && !('fechaDictamenEn' in v1), 'quién y cuándo la capturó: solo en el registro privado');
  t(subidas() === sub0 && (await est(p)).pend.length === 0, 'sin reexportar: no se subió ningún PDF ni ZIP a Drive y no quedó nada pendiente');
  r = await ver(vctx, `${F}.${K}`, 'verificar-valido-movil'); await ver(dctx, `${F}.${K}`, 'verificar-valido-escritorio');
  t(r.r.e === 'valido' && r.r.d.includes(larga(ymdMx(-10))) && !(await r.q.$('#vFecha .chip')), `verificar.html ya muestra «${larga(ymdMx(-10))}» (válido)`);
  await r.q.evaluate(() => { document.querySelector('#hDet').open = true; }); await r.q.screenshot({ path: `${CAP}/verificar-valido-huella-movil.png`, fullPage: true, animations: 'disabled' });
  // corregir
  await esperar(p, F => { const li = [...document.querySelectorAll('#histLista .hist-it')].find(z => z.querySelector('.hist-folio').textContent === F); return li && !li.querySelector('.hist-est.t'); }, F);
  a = await item(F); t(a && !a.badge && a.cap === 'Corregir fecha', 'con fecha: sin badge y botón «Corregir fecha»');
  await p.click(`[data-hist="fecha"][data-f="${F}"]`); await p.waitForSelector('#mFecha:not(.oculto)');
  t((await p.textContent('#mFechaT')) === 'Corregir fecha de dictamen' && (await p.inputValue('#mFechaIn')) === ymdMx(-10), '«Corregir fecha» abre el mismo diálogo con la fecha actual');
  t(await p.isDisabled('#mFechaOk'), 'la misma fecha no cuenta como corrección');
  await p.fill('#mFechaIn', ymdMx(-7)); await p.click('#mFechaOk');
  t(/Reemplaza la fecha actual/.test(await p.textContent('#mFechaConf')), 'la confirmación dice qué fecha reemplaza');
  await p.click('#mFechaOk'); await p.waitForSelector('#mFecha.oculto', { state: 'attached' });
  x1 = await leer(`expedientes/${F}`); v1 = await leer(`verificaciones/${ID}`);
  t(x1.fechaEmisionDictamen === ymdMx(-7) && v1.fechaEmisionDictamen === ymdMx(-7) && x1.revision === antes.revision && x1.huella === antes.huella, 'fecha corregida (misma revisión y huella)');
  await p.click('#mNube [data-cerrar]');
}

// cancelar F2
await p.click('#btnNube'); await esperar(p, () => document.querySelectorAll('#histLista .hist-it').length === 3);
await p.click(`[data-hist="cancelar"][data-f="${F2}"]`); await esperar(p, F2 => [...document.querySelectorAll('#histLista .hist-it')].some(li => li.innerText.includes(F2) && /Cancelado/i.test(li.innerText)), F2);
const K2 = (await leer(`expedientes/${F2}`)).clave;
r = await ver(vctx, `${F2}.${K2}`, 'verificar-cancelado-movil'); await ver(dctx, `${F2}.${K2}`, 'verificar-cancelado-escritorio');
t(r.r.e === 'cancelado' && /Expediente cancelado/.test(r.r.t), 'cancelar: el registro se conserva y el QR muestra «Expediente cancelado»');
await p.waitForTimeout(700); await p.screenshot({ path: CAP + '/historial-con-cancelado-escritorio.png' });
{ // 360 px: cada título del veredicto en 1 línea o en líneas equilibradas (sin una palabra sola), sin desbordar
  const medir = () => { const h = document.querySelector('#tit'), L = new Map(), w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) for (let i = 0; i < n.length; i++) { const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const b = rg.getClientRects()[0]; if (!b) continue; const k = Math.round(b.top / 4); L.set(k, (L.get(k) || '') + n.data[i]); }
    const ls = [...L.entries()].sort((a, b) => a[0] - b[0]).map(x => x[1].trim()).filter(Boolean);
    return { e: document.querySelector('#t').dataset.e, txt: h.textContent, ls, over: h.scrollWidth > h.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth, ico: document.querySelector('#selloIco').innerHTML }; };
  const c360 = async (conf) => { const c = await br.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' }); await c.route(/\/nube-config\.js$/, rr => rr.fulfill({ status: 200, contentType: 'text/javascript', body: conf })); return c; };
  const ca = await c360(cfg), cs = await c360('window.FX_NUBE={firebase:null};'), res = {};
  for (const [nom, c, hash, cortar] of [['válido', ca, `${F}.${K}`], ['cancelado', ca, `${F2}.${K2}`], ['no encontrado', ca, `FX-2026-ABCDEF.${K}`], ['mal formado', ca, '%'], ['sin conexión', ca, `${F}.${K}`, true], ['servicio no disponible', cs, `${F}.${K}`]]) {
    const q = await c.newPage(); if (cortar) await q.route(/127\.0\.0\.1:8080/, rr => rr.abort());
    await q.goto(`${BASE}/verificar.html#${hash}`); await q.waitForFunction(() => document.querySelector('#t').dataset.e !== 'cargando', null, { timeout: 30000 });
    const m = await q.evaluate(medir); res[nom] = m;
    const palabras = m.txt.split(/\s+/).length, ok = !m.over && (m.ls.length === 1 || (m.ls.length === 2 && palabras >= 3 && m.ls.every(l => l.split(/\s+/).length >= 2)));
    t(ok, `360 px · «${m.txt}»: ${m.ls.map(l => '[' + l + ']').join(' ')}${m.over ? ' DESBORDA' : ''}`);
    if (nom === 'no encontrado') await q.screenshot({ path: `${CAP}/verificar-noencontrado-360.png`, fullPage: true, animations: 'disabled' });
    if (nom === 'servicio no disponible') await q.screenshot({ path: `${CAP}/verificar-error-360.png`, fullPage: true, animations: 'disabled' });
    await q.close();
  }
  t(res['servicio no disponible'].e === 'error' && res['sin conexión'].e === 'offline' && res['servicio no disponible'].ico && res['servicio no disponible'].ico !== res['sin conexión'].ico, '«Servicio no disponible» tiene su propio ícono (nube con aviso), distinto del de «Sin conexión»');
  await ca.close(); await cs.close();
}
// eliminar F3 (confirmación escribiendo el folio)
await p.click(`[data-hist="borrar"][data-f="${F3}"]`);
await p.fill('#mBorrarTxt', F3.slice(0, -1)); t(await p.isDisabled('#mBorrarOk'), 'eliminar: el botón sigue deshabilitado con el folio incompleto');
await p.fill('#mBorrarTxt', F3.toLowerCase()); t(!(await p.isDisabled('#mBorrarOk')), 'eliminar: se habilita al escribir el folio');
await p.waitForTimeout(700); await p.screenshot({ path: CAP + '/eliminar-confirmacion-escritorio.png' });
const x3 = await leer(`expedientes/${F3}`), K3 = x3.clave;
await p.click('#mBorrarOk'); await esperar(p, () => document.querySelector('#mBorrar').classList.contains('oculto'));
t((await leer(`expedientes/${F3}`)) === null && (await leer(`verificaciones/${sha(F3 + '.' + K3)}`)) === null, 'eliminar: se borran el registro privado y el público');
t(!drive.files.has(x3.driveZipId) && !drive.files.has(x3.driveBorradorId), 'eliminar: se borran el ZIP y el borrador de Drive');
t(drive.carpetas.get(x3.driveCarpetaId) && drive.carpetas.get(x3.driveCarpetaId).trashed === true, 'eliminar: la subcarpeta (ya vacía) se manda a la papelera de Drive');
r = await ver(vctx, `${F3}.${K3}`); t(r.r.e === 'invalido', 'eliminar: el QR muestra «No válido / no encontrado»');
await p.waitForTimeout(700); await p.screenshot({ path: CAP + '/historial-tras-eliminar-escritorio.png' });

console.log('== Móvil: historial y confirmación de borrado');
{
  const mctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
  await mctx.route(/\/nube-config\.js$/, rr => rr.fulfill({ status: 200, contentType: 'text/javascript', body: cfg }));
  await mctx.route(u => u.hostname === 'firestore.googleapis.com', rr => rr.abort());
  await mctx.route(/accounts\.google\.com\/gsi\/client/, rr => rr.fulfill({ status: 200, contentType: 'text/javascript', body: drive.gis }));
  await mctx.route(/www\.googleapis\.com\/(upload|drive)\//, drive.handler);
  const m = await abrirApp(mctx, `${BASE}/index.html#generar`, logs);
  await entrar(m, 'juan@fenixmex.com', 'Juan Pérez'); await esperar(m, () => window.FXNube.estado().aut === true);
  await m.click('#btnNube'); await esperar(m, () => document.querySelectorAll('#histLista .hist-it').length === 2);
  await m.waitForTimeout(700); await m.screenshot({ path: CAP + '/historial-movil.png' });
  await m.click(`[data-hist="borrar"][data-f="${F2}"]`); await m.fill('#mBorrarTxt', F2);
  await m.waitForTimeout(700); await m.screenshot({ path: CAP + '/eliminar-confirmacion-movil.png' });
  await m.click('#mBorrar [data-cerrar]');
  t((await leer(`expedientes/${F2}`)) !== null, 'cerrar la confirmación no borra nada');
  await m.click(`[data-hist="fecha"][data-f="${F}"]`); await m.waitForSelector('#mFecha:not(.oculto)'); await m.waitForTimeout(500);
  await m.screenshot({ path: CAP + '/fecha-dictamen-movil.png' }); await m.click('#mFechaNo');
  await m.evaluate(() => document.querySelector('#mNube [data-cerrar]').click());
  await m.locator('#t-fxid').screenshot({ path: CAP + '/generar-codigo-movil.png' }).catch(() => {});
  await mctx.close();
}
await p.click('#mNube [data-cerrar]').catch(() => {});
await p.locator('#t-fxid').screenshot({ path: CAP + '/generar-codigo-registrado.png' });

console.log('== Cuenta no autorizada');
{
  const c2 = (await navegador({ config: cfg, drive })); const q = await abrirApp(c2.ctx, `${BASE}/index.html#generar`, logs);
  await entrar(q, 'intruso@gmail.com', 'Intruso'); await esperar(q, () => window.FXNube.estado().aut === false);
  await importarBorrador(q, borrador(1, 'EMPRESA AJENA, S.A.'), 'b_int.json'); await generar(q, true);
  await q.waitForTimeout(1500); const e2 = await est(q);
  t(e2.pend.length === 1 && !e2.pend[0].reg && (await leer(`expedientes/${e2.fxId.folio}`)) === null, 'no autorizada: genera normal, NO escribe en el registro y queda pendiente');
  await q.click('#btnNube'); await q.waitForTimeout(400);
  t(await q.evaluate(() => /no está en la lista/.test(document.querySelector('#nubeCuenta').innerText)), 'no autorizada: el panel lo explica y muestra el correo a agregar');
  await q.waitForTimeout(700); await q.screenshot({ path: CAP + '/cuenta-no-autorizada-escritorio.png' });
  await c2.br.close();
}

console.log('== Sin conexión en la app → pendiente; al volver la red se registra solo');
{
  await p.evaluate(() => { const { D } = window.FXNube.datos(); D.equipos[0].marca = 'ALANSA 2'; });
  await ctx.setOffline(true);
  await generar(p, true); await p.waitForTimeout(800);
  e = await est(p); const pend = e.pend[0];
  t(e.pend.length === 1 && !pend.reg, `sin red: genera igual y queda «Pendiente de registrar» (${pend && pend.folio})`);
  await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online')));
  await esperar(p, () => window.FXNube.estado().pend.length === 0, null, 120000);
  x = await leer(`expedientes/${pend.folio}`);
  t(x && x.revision >= 2, `al volver la red se registró solo (revisión ${x && x.revision})`);
}

await br.close(); srv.close();
const L = logs.filter(l => !/firestore\.googleapis|ERR_FAILED|ERR_INTERNET|Could not reach Cloud Firestore|WebChannel|\[code=unavailable\]/i.test(l));
fs.writeFileSync(OUT + '/test_b.txt', R.join('\n') + `\n\n${ok} correctas, ${mal} fallidas\n\n` + L.join('\n'));
console.log(`\n${ok} correctas, ${mal} fallidas`);
console.log(L.slice(0, 30).join('\n'));
process.exit(mal ? 1 : 0);
