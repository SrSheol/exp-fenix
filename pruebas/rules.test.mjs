// Pruebas de firestore.rules en el emulador (proyecto demo-fenix). node rules.test.mjs
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, writeBatch, serverTimestamp, limit } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const sha = s => createHash('sha256').update(s).digest('hex');
const env = await initializeTestEnvironment({ projectId: 'demo-fenix', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'config/acceso'), { emails: ['juan@fenixmex.com', 'apoyomecv@gmail.com'] }); });

const anon = env.unauthenticatedContext().firestore();
const juan = env.authenticatedContext('u-juan', { email: 'Juan@FenixMex.com', email_verified: true }).firestore();
const otro = env.authenticatedContext('u-otro', { email: 'intruso@gmail.com', email_verified: true }).firestore();
const sinVer = env.authenticatedContext('u-nv', { email: 'apoyomecv@gmail.com', email_verified: false }).firestore();

const F = 'FX-2026-7K3M9Q', K = 'aB3dE5fG7hJ9', ID = sha(F + '.' + K), H1 = sha('datos 1'), H2 = sha('datos 2');
const yoJ = { email: 'juan@fenixmex.com', nombre: 'Juan' };
const priv = (db, rev, h, extra) => Object.assign({ folio: F, clave: K, claveHash: ID, razonSocial: 'PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.', fechaEmisionDictamen: '2026-07-17', huella: h, revision: rev, estado: 'vigente', emitidoPor: 'FenixMex', numEquipos: 14, hojas: 830, createdBy: yoJ, createdAt: serverTimestamp(), updatedBy: yoJ, updatedAt: serverTimestamp() }, extra || {});
const pub = (rev, h, extra) => Object.assign({ folio: F, razonSocial: 'PEÑA Y ASOCIADOS INDUSTRIALES, S. DE R.L. DE C.V.', fechaEmisionDictamen: '2026-07-17', huella: h, revision: rev, estado: 'vigente', emitidoPor: 'FenixMex', actualizado: serverTimestamp() }, extra || {});
const registrar = (db, rev, h, o) => { o = o || {}; const b = writeBatch(db);
  b.set(doc(db, 'expedientes', F), o.priv || priv(db, rev, h)); b.set(doc(db, 'verificaciones', o.id || ID), o.pub || pub(rev, h));
  b.set(doc(db, `expedientes/${F}/revisiones/${rev}`), { revision: rev, huella: h, hojas: 830, numEquipos: 14, por: yoJ, fecha: serverTimestamp() }); return b.commit(); };

let ok = 0, mal = 0;
async function t(nombre, fn) { try { await fn(); ok++; console.log('  ✓', nombre); } catch (e) { mal++; console.log('  ✗', nombre, '→', e.message.split('\n')[0]); } }

console.log('Escrituras');
await t('anónimo NO puede escribir expedientes', () => assertFails(registrar(anon, 1, H1)));
await t('cuenta no autorizada NO puede escribir', () => assertFails(registrar(otro, 1, H1)));
await t('cuenta autorizada con correo sin verificar NO puede escribir', () => assertFails(registrar(sinVer, 1, H1)));
await t('autorizada: claveHash que no corresponde → rechazado', () => assertFails(registrar(juan, 1, H1, { priv: priv(juan, 1, H1, { claveHash: sha('otra') }) })));
await t('autorizada: público con id distinto al hash → rechazado', () => assertFails(registrar(juan, 1, H1, { id: sha('x') })));
await t('autorizada: primera revisión ≠ 1 → rechazado', () => assertFails(registrar(juan, 2, H1)));
await t('autorizada: campo extra en lo público → rechazado', () => assertFails(registrar(juan, 1, H1, { pub: pub(1, H1, { clave: K }) })));
await t('autorizada: público solo (sin registro privado) → rechazado', () => assertFails(setDoc(doc(juan, 'verificaciones', ID), pub(1, H1))));
await t('autorizada (correo en MAYÚSCULAS) registra revisión 1', () => assertSucceeds(registrar(juan, 1, H1)));
const actual = async () => (await getDoc(doc(juan, 'expedientes', F))).data();
await t('autorizada: reexportar con createdAt nuevo (autoría alterada) → rechazado', () => assertFails(registrar(juan, 2, H2)));
// createdAt / createdBy se conservan (se leen y se reescriben, como hace la app en su transacción)
await t('autorizada: revisión 2 (+1) con huella nueva', async () => { const s = await actual(); await assertSucceeds(registrar(juan, 2, H2, { priv: priv(juan, 2, H2, { createdAt: s.createdAt, createdBy: s.createdBy }) })); });
await t('otra cuenta autorizada puede corregir (revisión 3) conservando la autoría', async () => {
  const ana = env.authenticatedContext('u-apoyo', { email: 'apoyomecv@gmail.com', email_verified: true }).firestore(), s = await actual(), yoA = { email: 'apoyomecv@gmail.com', nombre: 'Apoyo' };
  const b = writeBatch(ana); b.set(doc(ana, 'expedientes', F), priv(ana, 3, H1, { createdAt: s.createdAt, createdBy: s.createdBy, updatedBy: yoA })); b.set(doc(ana, 'verificaciones', ID), pub(3, H1));
  b.set(doc(ana, `expedientes/${F}/revisiones/3`), { revision: 3, huella: H1, hojas: 830, numEquipos: 14, por: yoA, fecha: serverTimestamp() }); await assertSucceeds(b.commit()); });
await t('no se puede firmar como otra persona (updatedBy ajeno) → rechazado', async () => { await assertFails(updateDoc(doc(juan, 'expedientes', F), { updatedBy: { email: 'apoyomecv@gmail.com', nombre: '' }, updatedAt: serverTimestamp() })); });
await t('autorizada: saltar de revisión (+2) → rechazado', async () => { const s = await actual(); await assertFails(registrar(juan, s.revision + 2, H1, { priv: priv(juan, s.revision + 2, H1, { createdAt: s.createdAt, createdBy: s.createdBy }), pub: pub(s.revision + 2, H1) })); });
await t('autorizada: cambiar la clave → rechazado', async () => { const s = await actual(); await assertFails(updateDoc(doc(juan, 'expedientes', F), { clave: 'ZZZZZZZZZZZZ', updatedAt: serverTimestamp() })); });
await t('autorizada: cambiar createdBy → rechazado', async () => assertFails(updateDoc(doc(juan, 'expedientes', F), { createdBy: { email: 'juan@fenixmex.com', nombre: 'X' }, updatedBy: yoJ, updatedAt: serverTimestamp() })));
await t('autorizada: público que no coincide con el privado (huella) → rechazado', () => assertFails(updateDoc(doc(juan, 'verificaciones', ID), { huella: sha('ajena'), actualizado: serverTimestamp() })));
await t('autorizada: ids de Drive en el registro', () => assertSucceeds(updateDoc(doc(juan, 'expedientes', F), { driveZipId: '1AbC', driveZipNombre: 'EXP PEÑA.zip', driveZipBytes: 52428800, driveBorradorId: '1XyZ', driveActualizado: serverTimestamp(), updatedBy: yoJ, updatedAt: serverTimestamp() })));
await t('autorizada: cancelar (privado + público en un lote)', () => { const b = writeBatch(juan); b.update(doc(juan, 'expedientes', F), { estado: 'cancelado', updatedBy: yoJ, updatedAt: serverTimestamp() }); b.update(doc(juan, 'verificaciones', ID), { estado: 'cancelado', actualizado: serverTimestamp() }); return assertSucceeds(b.commit()); });
await t('autorizada: cancelar solo lo público → rechazado (debe coincidir)', () => assertFails(updateDoc(doc(juan, 'verificaciones', ID), { estado: 'vigente', actualizado: serverTimestamp() })));
await t('cuenta no autorizada NO puede cancelar', () => { const b = writeBatch(otro); b.update(doc(otro, 'expedientes', F), { estado: 'vigente', updatedBy: { email: 'intruso@gmail.com', nombre: '' }, updatedAt: serverTimestamp() }); b.update(doc(otro, 'verificaciones', ID), { estado: 'vigente', actualizado: serverTimestamp() }); return assertFails(b.commit()); });
await t('cuenta no autorizada NO puede borrar', () => assertFails(deleteDoc(doc(otro, 'verificaciones', ID))));
await t('anónimo NO puede borrar', () => assertFails(deleteDoc(doc(anon, 'expedientes', F))));

console.log('Lecturas');
await t('anónimo lee lo público con el id exacto (folio + clave)', async () => { const s = await assertSucceeds(getDoc(doc(anon, 'verificaciones', ID))); if (!s.exists() || s.data().folio !== F) throw new Error('sin datos'); });
await t('anónimo con clave equivocada → no existe (sin datos)', async () => { const s = await assertSucceeds(getDoc(doc(anon, 'verificaciones', sha(F + '.WRONGWRONG12')))); if (s.exists()) throw new Error('¡existe!'); });
await t('anónimo NO puede listar verificaciones', () => assertFails(getDocs(collection(anon, 'verificaciones'))));
await t('anónimo NO puede buscar por folio (query)', () => assertFails(getDocs(query(collection(anon, 'verificaciones'), where('folio', '==', F)))));
await t('anónimo NO puede leer el registro privado (clave)', () => assertFails(getDoc(doc(anon, 'expedientes', F))));
await t('anónimo NO puede listar expedientes', () => assertFails(getDocs(collection(anon, 'expedientes'))));
await t('anónimo NO puede leer la lista de acceso', () => assertFails(getDoc(doc(anon, 'config/acceso'))));
await t('cuenta no autorizada NO lee el historial', () => assertFails(getDocs(query(collection(otro, 'expedientes'), limit(5)))));
await t('cuenta no autorizada NO lee la lista de acceso', () => assertFails(getDoc(doc(otro, 'config/acceso'))));
await t('autorizada lee la lista de acceso', () => assertSucceeds(getDoc(doc(juan, 'config/acceso'))));
await t('autorizada lista el historial', () => assertSucceeds(getDocs(collection(juan, 'expedientes'))));
await t('autorizada lee la bitácora de revisiones', () => assertSucceeds(getDocs(collection(juan, `expedientes/${F}/revisiones`))));
await t('anónimo NO lee la bitácora de revisiones', () => assertFails(getDocs(collection(anon, `expedientes/${F}/revisiones`))));
await t('nadie escribe la lista de acceso desde la app', () => assertFails(setDoc(doc(juan, 'config/acceso'), { emails: ['x@y.z'] })));

console.log('v18 · revisión solo con huella nueva');
{
  const FR = 'FX-2026-R3V1S1', KR = 'rEvIsIoN0001', IDR = sha(FR + '.' + KR);
  const pv = (rev, h, extra) => Object.assign({}, priv(juan, rev, h), { folio: FR, clave: KR, claveHash: IDR }, extra || {});
  const pb = (rev, h, extra) => Object.assign({}, pub(rev, h), { folio: FR }, extra || {});
  const lote = (db, rev, h, o) => { o = o || {}; const b = writeBatch(db); b.set(doc(db, 'expedientes', FR), o.priv || pv(rev, h)); b.set(doc(db, 'verificaciones', IDR), o.pub || pb(rev, h)); return b.commit(); };
  await t('registra revisión 1 (otro folio)', () => assertSucceeds(lote(juan, 1, H1)));
  const s = (await getDoc(doc(juan, 'expedientes', FR))).data(), aut = { createdAt: s.createdAt, createdBy: s.createdBy };
  await t('revisión +1 con la MISMA huella → rechazado (reexportar lo mismo no sube la revisión)', () => assertFails(lote(juan, 2, H1, { priv: pv(2, H1, aut), pub: pb(2, H1) })));
  await t('misma revisión con huella DISTINTA → rechazado', () => assertFails(lote(juan, 1, H2, { priv: pv(1, H2, aut), pub: pb(1, H2) })));
  await t('revisión +1 con huella nueva → permitido', () => assertSucceeds(lote(juan, 2, H2, { priv: pv(2, H2, aut), pub: pb(2, H2) })));
  await t('Cat II: cambiar solo la fecha del dictamen (sin revisión) → rechazado (es automática y estable)', () => { const b = writeBatch(juan); b.update(doc(juan, 'expedientes', FR), { fechaEmisionDictamen: '2026-08-01', fechaDictamenPor: yoJ, fechaDictamenEn: serverTimestamp(), updatedBy: yoJ, updatedAt: serverTimestamp() }); b.update(doc(juan, 'verificaciones', IDR), { fechaEmisionDictamen: '2026-08-01', actualizado: serverTimestamp() }); return assertFails(b.commit()); });
  await t('nota de limpieza de Drive (pendingCleanup) sin cambiar la revisión → permitido', () => assertSucceeds(updateDoc(doc(juan, 'expedientes', FR), { pendingCleanup: [{ fileId: '1Viejo', tipo: 'ZIP', status: 403, desde: '2026-11-09T18:00:00Z', por: 'juan@fenixmex.com' }], driveZipId: '1Nuevo', updatedBy: yoJ, updatedAt: serverTimestamp() })));
}

console.log('v18 · fecha del dictamen Cat III (en trámite → capturada → corregida)');
{
  const F3 = 'FX-2026-C4T3RR', K3 = 'catTresExt001', ID3 = sha(F3 + '.' + K3);
  const ymd = d => d.toISOString().slice(0, 10), DIA = 86400000, hoy = ymd(new Date()), manana = ymd(new Date(Date.now() + 3 * DIA)), antes = ymd(new Date(Date.now() - 10 * DIA));
  const yoA = { email: 'apoyomecv@gmail.com', nombre: 'Apoyo' }, ana = env.authenticatedContext('u-apoyo', { email: 'apoyomecv@gmail.com', email_verified: true }).firestore();
  const pv = (extra) => Object.assign({}, priv(juan, 1, H1), { folio: F3, clave: K3, claveHash: ID3, fechaEmisionDictamen: '', dictamenExterno: true }, extra || {});
  const pb = (extra) => Object.assign({}, pub(1, H1), { folio: F3, fechaEmisionDictamen: '' }, extra || {});
  const capturar = (db, f, por, extraPriv, extraPub) => { const b = writeBatch(db);
    b.update(doc(db, 'expedientes', F3), Object.assign({ fechaEmisionDictamen: f, fechaDictamenPor: por, fechaDictamenEn: serverTimestamp(), updatedBy: por, updatedAt: serverTimestamp() }, extraPriv || {}));
    b.update(doc(db, 'verificaciones', ID3), Object.assign({ fechaEmisionDictamen: f, actualizado: serverTimestamp() }, extraPub || {})); return b.commit(); };
  await t('Cat III se registra sin fecha (en trámite: fecha vacía en lo público)', () => { const b = writeBatch(juan); b.set(doc(juan, 'expedientes', F3), pv()); b.set(doc(juan, 'verificaciones', ID3), pb()); return assertSucceeds(b.commit()); });
  await t('anónimo lee lo público: fecha vacía (verificar.html muestra «En trámite»)', async () => { const d = (await assertSucceeds(getDoc(doc(anon, 'verificaciones', ID3)))).data(); if (d.fechaEmisionDictamen !== '' || 'fechaDictamenPor' in d) throw new Error(JSON.stringify(d)); });
  await t('fecha futura → rechazado', () => assertFails(capturar(juan, manana, yoJ)));
  await t('fecha anterior a la creación del expediente → rechazado', () => assertFails(capturar(juan, antes, yoJ)));
  await t('fecha mal formada → rechazado', () => assertFails(capturar(juan, '9-11-2026', yoJ)));
  await t('capturar a nombre de otra persona (fechaDictamenPor ajeno) → rechazado', () => assertFails(capturar(juan, hoy, yoA, { updatedBy: yoJ })));
  await t('capturar y a la vez subir la revisión → rechazado', () => assertFails(capturar(juan, hoy, yoJ, { revision: 2 }, { revision: 2 })));
  await t('capturar y a la vez cambiar la huella → rechazado', () => assertFails(capturar(juan, hoy, yoJ, { huella: H2 }, { huella: H2 })));
  await t('capturar y a la vez cambiar otro campo (razón social) → rechazado', () => assertFails(capturar(juan, hoy, yoJ, { razonSocial: 'OTRA' }, { razonSocial: 'OTRA' })));
  await t('cambiar la fecha solo en lo público → rechazado (debe coincidir con lo privado)', () => assertFails(updateDoc(doc(juan, 'verificaciones', ID3), { fechaEmisionDictamen: hoy, actualizado: serverTimestamp() })));
  await t('cuenta no autorizada NO puede capturar la fecha', () => assertFails(capturar(otro, hoy, { email: 'intruso@gmail.com', nombre: '' })));
  await t('autorizada captura la fecha (privado + público, misma revisión y huella)', () => assertSucceeds(capturar(juan, hoy, yoJ)));
  await t('tras capturar: revisión 1 y huella intactas; quién y cuándo solo en lo privado', async () => { const x = (await getDoc(doc(juan, 'expedientes', F3))).data(), v = (await getDoc(doc(anon, 'verificaciones', ID3))).data();
    if (x.revision !== 1 || x.huella !== H1 || x.fechaDictamenPor.email !== 'juan@fenixmex.com' || !x.fechaDictamenEn || v.fechaEmisionDictamen !== hoy || 'fechaDictamenPor' in v || Object.keys(v).length !== 8) throw new Error(JSON.stringify({ x, v })); });
  await t('otra cuenta autorizada corrige la fecha («Corregir fecha»)', async () => { const ayer = ymd(new Date(Date.now() - 86400000)); await assertSucceeds(capturar(ana, ayer, yoA)); });
  await t('Drive / cancelar no pueden cambiar la fecha de paso (misma revisión) → rechazado', () => assertFails(updateDoc(doc(juan, 'expedientes', F3), { fechaEmisionDictamen: hoy, driveZipId: 'x', updatedBy: yoJ, updatedAt: serverTimestamp() })));
}

console.log('Eliminar');
await t('autorizada elimina (privado + público + bitácora)', async () => { const b = writeBatch(juan); const r = await getDocs(collection(juan, `expedientes/${F}/revisiones`)); r.forEach(d => b.delete(d.ref)); b.delete(doc(juan, 'verificaciones', ID)); b.delete(doc(juan, 'expedientes', F)); await assertSucceeds(b.commit()); });
await t('tras eliminar, el QR ya no encuentra nada', async () => { const s = await getDoc(doc(anon, 'verificaciones', ID)); if (s.exists()) throw new Error('sigue existiendo'); });

console.log(`\n${ok} correctas, ${mal} fallidas`);
await env.cleanup();
process.exit(mal ? 1 : 0);
