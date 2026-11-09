// C · regresión con Cat II + carpeta DATOS, y la app con el nube-config.js real (nube sin configurar)
import fs from 'fs';
import { execFileSync } from 'child_process';
import JSZip from 'jszip';
import { servidor, navegador, abrirApp, borrador, importarBorrador, generar, PROY, S, OUT } from './h.mjs';
let ok = 0, mal = 0; const R = [];
const t = (c, m) => { (c ? ok++ : mal++); R.push((c ? '✓ ' : '✗ ') + m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const py = (...a) => JSON.parse(execFileSync('python', ['-P', ...a], { encoding: 'utf8' }).trim().split('\n').pop());
const srv = await servidor(5514, PROY, { '/orig/index.html': fs.readFileSync(S + '/index.orig.html') });
const b = borrador(3); b.draft.equipos[1].presionCalibracion = '6.00'; b.draft.equipos[1].folio = '123'; b.draft.empresaTelefono = '55 1234 5678'; b.draft.empresaCorreo = 'contacto@pena.com.mx';
const res = {};
for (const [v, url] of [['orig', '/orig/index.html'], ['nuevo', '/index.html']]) {
  const logs = []; const { br, ctx } = await navegador({ config: 'window.FX_NUBE={firebase:null};' });   // nube sin configurar (simulada: el nube-config.js real ya tiene el proyecto de producción)
  const p = await abrirApp(ctx, `http://127.0.0.1:5514${url}#generar`, logs);
  await importarBorrador(p, b, `c_${v}.json`);
  const g = await generar(p, true);
  const z = await JSZip.loadAsync(g.zip), ent = Object.keys(z.files).sort(), hojas = {};
  for (const n of ent.filter(n => n.endsWith('.pdf'))) { const f = `${OUT}/c_${v}_${n.replace(/[\\/]/g, '_')}`; fs.writeFileSync(f, await z.file(n).async('nodebuffer')); hojas[n] = f; }
  res[v] = { ent, hojas, logs: logs.filter(l => !/firestore\.googleapis|ERR_FAILED|Could not reach Cloud Firestore|\[code=unavailable\]/i.test(l)) };
  if (v === 'nuevo') {
    const e = await p.evaluate(() => window.FXNube.estado());
    t(e.pend.length === 1 && /no está configurada/.test(await p.evaluate(() => document.querySelector('#fxIdBox').innerText)), 'nube sin configurar: genera y queda «Pendiente de registrar · la nube aún no está configurada»');
    await p.click('#btnNube'); await p.waitForTimeout(600);
    t(/aún no está configurada/.test(await p.evaluate(() => document.querySelector('#nubeCuenta').innerText)), 'el panel Mis expedientes lo explica (CONFIGURAR-NUBE.md)');
    const q = await ctx.newPage(); await q.goto('http://127.0.0.1:5514/verificar.html#FX-2026-ABCDEF.aB3dE5fG7hJ9'); await q.waitForTimeout(800);
    t((await q.evaluate(() => document.querySelector('#t').dataset.e)) === 'error', 'verificar.html sin configurar → «Servicio no disponible» (nunca «válido»)');
  }
  await br.close();
}
t(JSON.stringify(res.orig.ent) === JSON.stringify(res.nuevo.ent), `misma estructura del ZIP: ${res.nuevo.ent.join(' | ')}`);
for (const n of Object.keys(res.orig.hojas)) {
  const c = py('cmp_pdf.py', res.orig.hojas[n], res.nuevo.hojas[n]);
  const esExp = /^EXP /.test(n);
  t(c.n_orig === c.n_nuevo && c.tamanos_iguales && (esExp ? JSON.stringify(c.texto_distinto) === '[1]' : c.texto_distinto.length === 0), `${n}: ${c.n_nuevo} hojas iguales; texto distinto solo en ${esExp ? 'la portada' : 'ninguna'} (${JSON.stringify(c.texto_distinto)})`);
}
t(res.nuevo.logs.length === 0, 'sin errores de la página en la versión nueva' + (res.nuevo.logs.length ? ': ' + res.nuevo.logs.join(' / ') : ''));
console.log('errores de la versión publicada (referencia):', res.orig.logs.length);
srv.close();
fs.writeFileSync(OUT + '/test_c.txt', R.join('\n') + `\n\n${ok} correctas, ${mal} fallidas\n`);
console.log(`\n${ok} correctas, ${mal} fallidas`); process.exit(mal ? 1 : 0);
