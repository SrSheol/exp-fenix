# Pruebas de la nube (QR, huella, registro y Drive)

Nada de esto toca cuentas reales: el registro va al **emulador** de Firebase (proyecto `demo-fenix`), Google Drive y el inicio de sesión de Drive están **simulados**, y el arnés **corta** todo el tráfico al Firestore real (la app escribe `expFenix/globals` al guardar).

## Requisitos
- Node 20+ y Python 3 con `pip install pymupdf zxing-cpp opencv-python-headless`.
- Google Chrome instalado (Playwright lo usa con `channel: 'chrome'`).
- Java 11+ para el emulador (sirve el de Android Studio: `C:\Program Files\Android\Android Studio\jbr`).
- `npm install` en esta carpeta.

## Correr
1. En una terminal: `npm run emuladores` (Firestore 8080, Auth 9099).
2. `npm run reglas` → reglas de Firestore (70 casos: los 39 originales + 21 de la revisión que solo sube con huella nueva y de la fecha del dictamen Cat III + 10 de `driveCarpetaId`). Las pruebas cargan `../firestore.rules` en el emulador por su cuenta (`firebase.json` ya no lo nombra: las versiones nuevas de firebase-tools no aceptan archivos fuera de esta carpeta).
3. Para la regresión (pruebas A y C) copia la versión publicada (b87831f) como `_tmp/index.orig.html` (o define `FX_TMP` con otra carpeta que la tenga).
4. `npm run a` → huella con 1, 14 y 50 equipos, QR estable a 150/300 dpi (zxing, jsQR, OpenCV), regresión de hojas y ZIP.
5. `npm run b` → registro, revisiones (solo suben con huella nueva; «Generar sin descargar» no cuenta), línea de la huella en la portada, Drive simulado (con un 503, un token vencido, archivos de otra cuenta, subcarpetas por expediente, archivos sueltos de antes y el selector de Google que concede o se cancela), verificar.html (incluye «En trámite», logo y enlaces mal formados), historial, fecha del dictamen Cat III, cancelar/eliminar, cuenta no autorizada, sin conexión. Carga en el emulador las reglas actuales de `../firestore.rules`. Guarda las capturas en `../capturas/`.
6. `npm run c` → regresión con categoría II + carpeta DATOS, y la app con `nube-config.js` sin configurar.

Resultados de la última corrida: `rules.result.txt`, `test_a.txt`, `test_b.txt`, `test_c.txt`.
