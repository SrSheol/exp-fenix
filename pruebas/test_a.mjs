// A · huella (1, 14, 50 equipos), QR estable entre reexportaciones y regresión contra la versión publicada (b87831f).
import fs from 'fs';
import { execFileSync } from 'child_process';
import JSZip from 'jszip';
import { servidor, navegador, abrirApp, borrador, importarBorrador, generar, PROY, S, OUT } from './h.mjs';

let ok = 0, mal = 0; const R = [];
const t = (c, m) => { (c ? ok++ : mal++); R.push((c ? '✓ ' : '✗ ') + m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const py = (...a) => JSON.parse(execFileSync('python', ['-P', ...a], { encoding: 'utf8' }).trim().split('\n').pop());
const decodificar = (pdf, dpi, nombre) => { const png = `${OUT}/${nombre}_${dpi}.png`; const z = py('decode_py.py', pdf, '1', String(dpi), png, '240', '545', '372', '677'); const j = JSON.parse(execFileSync('node', ['decode_js.cjs', png], { encoding: 'utf8' })); return { zxing: z.zxing[0] || null, opencv: z.opencv || null, jsqr: j.jsqr }; };

// servidor con las dos versiones: la nueva (/) y la publicada (/orig/index.html)
const srv = await servidor(5511, PROY, { '/orig/index.html': fs.readFileSync(S + '/index.orig.html') });
const { br, ctx } = await navegador({ config: 'window.FX_NUBE={firebase:null};' });
const logs = [];
const p = await abrirApp(ctx, 'http://127.0.0.1:5511/index.html#generar', logs);
const huella = () => p.evaluate(() => window.FXNube.huellaActual());

for (const n of [1, 14, 50]) {
  console.log(`\n== ${n} equipo(s)`);
  const b = borrador(n);
  await importarBorrador(p, b, `b${n}.json`);
  const h1 = await huella(), h1b = await huella();
  t(/^[0-9a-f]{64}$/.test(h1) && h1 === h1b, `${n}: huella estable al recalcular (${h1.slice(0, 12)}…)`);
  await importarBorrador(p, b, `b${n}.json`);
  t((await huella()) === h1, `${n}: misma huella al volver a importar el mismo borrador`);
  // mismo contenido con las llaves en otro orden → misma huella (JSON canónico)
  const inv = JSON.parse(JSON.stringify(b)); inv.draft = Object.fromEntries(Object.entries(inv.draft).reverse()); inv.draft.equipos = inv.draft.equipos.map(e => Object.fromEntries(Object.entries(e).reverse()));
  await importarBorrador(p, inv, `b${n}_inv.json`);
  t((await huella()) === h1, `${n}: llaves en otro orden → misma huella`);
  // un dato de UN equipo (el último) cambia la huella; regresarlo la restaura
  const k = n - 1;
  const h2 = await p.evaluate(async k => { const { D } = window.FXNube.datos(); D.equipos[k].espEnv[3] = '4.41'; return window.FXNube.huellaActual(); }, k);
  t(h2 !== h1, `${n}: cambiar un espesor del equipo ${n} cambia la huella`);
  const h3 = await p.evaluate(async k => { const { D } = window.FXNube.datos(); D.equipos[k].espEnv[3] = '4.40'; return window.FXNube.huellaActual(); }, k);
  t(h3 === h1, `${n}: regresar el dato restaura la huella`);
  const h4 = await p.evaluate(async k => { const { D } = window.FXNube.datos(); const v = D.equipos[k].numeroSerie; D.equipos[k].numeroSerie = v + 'X'; const h = await window.FXNube.huellaActual(); D.equipos[k].numeroSerie = v; return h; }, k);
  t(h4 !== h1, `${n}: cambiar el número de serie del equipo ${n} cambia la huella`);
  const h5 = await p.evaluate(async () => { const { IMG } = window.FXNube.datos(); IMG['d:testigo1Firma'] = new Uint8Array([0x89, 0x50, 1, 2, 3]); const h = await window.FXNube.huellaActual(); delete IMG['d:testigo1Firma']; return h; });
  t(h5 !== h1, `${n}: agregar una firma (imagen) cambia la huella`);
  t((await huella()) === h1, `${n}: sin la firma vuelve a la huella original`);
}

// QR idéntico entre reexportaciones (1 y 14 equipos), revisando el PDF real a 150 y 300 dpi con 3 lectores
const regresion = {};
for (const n of [1, 14]) {
  console.log(`\n== QR · ${n} equipo(s)`);
  await importarBorrador(p, borrador(n), `q${n}.json`);
  const t0 = Date.now(); const g1 = await generar(p, true); const s1 = (Date.now() - t0) / 1000;
  const id1 = await p.evaluate(() => window.FXNube.estado().fxId);
  const g2 = await generar(p, true);
  const id2 = await p.evaluate(() => window.FXNube.estado().fxId);
  const f1 = `${OUT}/qr_${n}_a.pdf`, f2 = `${OUT}/qr_${n}_b.pdf`; fs.writeFileSync(f1, g1.pdfs[0].bytes); fs.writeFileSync(f2, g2.pdfs[0].bytes);
  const url = `https://srsheol.github.io/exp-fenix/verificar.html#${id1.folio}.${id1.clave}`;
  t(id1.folio === id2.folio && id1.clave === id2.clave, `${n}: mismo folio y clave en la reexportación (${id1.folio})`);
  for (const dpi of [150, 300]) for (const [f, q] of [[f1, 'a'], [f2, 'b']]) {
    const d = decodificar(f, dpi, `qr_${n}_${q}`);
    t(d.zxing === url && d.jsqr === url, `${n}: QR de la portada (${q}) a ${dpi} dpi → zxing ✓ jsQR ✓ OpenCV ${d.opencv === url ? '✓' : '—'}`);
  }
  const pg = py('-c', `import pymupdf,json;d=pymupdf.open(r'${f1}');print(json.dumps(d.page_count))`);
  regresion[n] = { nuevo: g1, paginas: pg, seg: s1 };
  console.log(`   ${pg} hojas · ${s1.toFixed(1)} s`);
}

// 50 equipos: una exportación completa (ZIP) con portada y QR
{
  console.log('\n== 50 equipos · ZIP');
  await importarBorrador(p, borrador(50), 'q50.json');
  const t0 = Date.now(); const g = await generar(p, true, 1200000); const s = (Date.now() - t0) / 1000;
  const id = await p.evaluate(() => window.FXNube.estado().fxId); const f = `${OUT}/qr_50.pdf`; fs.writeFileSync(f, g.pdfs[0].bytes);
  const d = decodificar(f, 150, 'qr_50'); const url = `https://srsheol.github.io/exp-fenix/verificar.html#${id.folio}.${id.clave}`;
  t(d.zxing === url && d.jsqr === url, `50: QR de la portada a 150 dpi (zxing + jsQR)`);
  const pg = py('-c', `import pymupdf,json;d=pymupdf.open(r'${f}');print(json.dumps(d.page_count))`);
  console.log(`   ${pg} hojas · ${(g.pdfs[0].bytes.length / 1048576).toFixed(1)} MB · ${s.toFixed(1)} s`);
  regresion[50] = { nuevo: g, paginas: pg, seg: s };
}
await p.close();

// Regresión: la versión publicada con los mismos borradores
console.log('\n== Regresión contra la versión publicada (b87831f)');
const po = await abrirApp(ctx, 'http://127.0.0.1:5511/orig/index.html#generar', []);
for (const n of [1, 14, 50]) {
  await importarBorrador(po, borrador(n), `o${n}.json`);
  const go = await generar(po, true, 1200000);
  const fo = `${OUT}/orig_${n}.pdf`, fn = `${OUT}/nuevo_${n}.pdf`; fs.writeFileSync(fo, go.pdfs[0].bytes); fs.writeFileSync(fn, regresion[n].nuevo.pdfs[0].bytes);
  const cmp = py('cmp_pdf.py', fo, fn);
  t(cmp.n_orig === cmp.n_nuevo, `${n}: mismas hojas que la versión publicada (${cmp.n_orig} = ${cmp.n_nuevo})`);
  t(cmp.tamanos_iguales, `${n}: mismo tamaño de cada hoja`);
  t(cmp.texto_distinto.length === 1 && cmp.texto_distinto[0] === 1, `${n}: el texto solo cambia en la hoja 1 (portada); otras con diferencias: ${JSON.stringify(cmp.texto_distinto.filter(x => x !== 1).slice(0, 8))}`);
  const lz = async b => Object.keys((await JSZip.loadAsync(b)).files).sort();
  const zo = await lz(go.zip), zn = await lz(regresion[n].nuevo.zip);
  t(JSON.stringify(zo) === JSON.stringify(zn), `${n}: misma estructura del ZIP (${zo.length} entradas: ${zo.join(' | ').slice(0, 120)})`);
  t(go.pdfs.length === regresion[n].nuevo.pdfs.length, `${n}: mismos PDF generados (${go.pdfs.map(x => x.nombre).join(', ').slice(0, 100)})`);
}
await br.close(); srv.close();
fs.writeFileSync(OUT + '/test_a.txt', R.join('\n') + `\n\n${ok} correctas, ${mal} fallidas\n` + logs.filter(l => !/firestore|ERR_FAILED|Firestore/.test(l)).join('\n'));
console.log(`\n${ok} correctas, ${mal} fallidas`);
console.log(logs.filter(l => !/firestore|ERR_FAILED|Firestore/i.test(l)).slice(0, 20).join('\n'));
process.exit(mal ? 1 : 0);
