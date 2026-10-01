# CHANGELOG — exp-fenix · parche v6 (2026-10-01)

Base: `index.html` v5 (`3c192d0`). Un solo `index.html` listo para GitHub Pages. `kit/engine.js` es copia exacta del motor embebido.

Solo se tocó la **hoja 106, tabla inferior, columna FIRMA**. Interfaz, `migrar()`, Firebase, tema, nombres de archivo y plantilla base sin cambios.

## PDF

| Hoja | Cambio |
|---|---|
| 106 | Las firmas de la tabla semanal ya no son fijas. Se dibujan dentro de `specialP106`, en el **mismo renglón** que el nombre: limpieza (1° turno, L/X/V/D) → firma `t2` (testigo 2); experto (día de la PND, 2° turno, 11:13) → firma `fi` (firmante izquierdo). |
| 106 | Si el día de la PND es L/X/V/D, ese día no lleva limpieza: el experto ocupa el renglón con su nombre y su firma `fi`. |
| 106 | La columna FIRMA se borra en todos los turnos 1° y 2° antes de escribir (igual que hora/elemento/resultado/nombre). La cuadrícula v5 (`p106.grid`, 0.86 pt) se redibuja después, sin cambios. |

Textos, horarios, `limpieza`, `txtExp`, `horaExp`, tamaños de fuente y el bloque superior de la hoja (nombres `{t2}` y firmas con y ≥ 844) **no cambian**.

## `FX_ASSETS.map.exp.imgs` — eliminados (4)

| role | x | y | w × h | clip | Caía en |
|---|---|---|---|---|---|
| t2 | 1000.89 | 721.34 | 50 × 48 | [1004.62, 1054.88] | Lunes 1° |
| t2 | 1007.01 | 532.83 | 50 × 48 | [1004.62, 1054.88] | Jueves 1° (huérfana) |
| t2 | 997.4 | 337.34 | 50 × 48 | [1004.62, 1054.88] | Domingo 1° |
| fi | 1004.28 | 635.59 | 50 × 48 | [1004.62, 1054.88] | Martes 2° (huérfana) |

Las 7 firmas `t2` del bloque superior (x ≈ 908–926, y 844–1244) se quedan. Hoja 106 pasa de 11 a 7 slots fijos.

## `FX_ASSETS.map.exp.spec.p106` — agregado

- `cols.firma`: `[1002.32, 1056.54]` → borrado real x 1002.72 – 1056.14 (con `ins` 0.4).
- `firma`: `{ "x": 1004.62, "w": 50.26, "pad": 0.8 }` → caja x 1004.62 – 1054.88 (mismo `clip` que los slots viejos).
  - Alto = banda del turno − 2 × `pad`; la firma se ajusta proporcional y se centra en la banda.
  - Un `pad` negativo deja que la firma sobresalga del renglón (por si Juan la quiere más grande).

Cajas resultantes (pt, origen abajo-izquierda):

| Día | 1° turno (limpieza) | 2° turno (experto) |
|---|---|---|
| LUNES | 735.79 – 757.14 (21.35) | 714.36 – 734.19 (19.83) |
| MARTES | 671.50 – 692.83 (21.33) | 648.57 – 669.90 (21.33) |
| MIÉRCOLES | 605.72 – 625.55 (19.83) | 584.26 – 604.12 (19.86) |
| JUEVES | 539.91 – 561.24 (21.33) | 516.98 – 538.31 (21.33) |
| VIERNES | 474.12 – 495.45 (21.33) | 452.67 – 472.52 (19.85) |
| SÁBADO | 408.31 – 429.64 (21.33) | 386.88 – 406.71 (19.83) |
| DOMINGO | 345.53 – 363.85 (18.32) | 324.10 – 343.93 (19.83) |

## Motor

- `specialP106(page, kit, map, ctx, sig)`: nuevo parámetro `sig = role => img(role, roleBytes[role])`. Usa el mismo caché de imágenes y los mismos bytes que antes (`st.testigo2Firma`, `A.globals.firmanteIzquierdoFirma`, ya recortados). No hay otra fuente de PNG.
- Sin firma cargada, el renglón queda sin firma y no hay error.

## Mediciones (columna FIRMA, hoja 106)

- Reglas verticales: 1002.21 – 1003.07 y 1056.43 – 1057.29. Espacio libre: 53.36 pt. La caja deja ~1.5 pt a cada lado.
- Bandas de turno: 19.9 – 22.9 pt. El alto sugerido de 48 pt no cabe en un turno (cruzaba al renglón vecino), por eso el alto sigue a la banda.
- Una firma recortada de 3:1 queda de ~50 × 17 pt, igual que en v5. Una casi cuadrada queda de ~28 × 21 pt.
- En la plantilla la columna FIRMA viene vacía; el borrado es solo preventivo.

## Pruebas

- **Motor en Node**, PND en cada día de la semana (28 sep – 4 oct 2026, `wd` 0–6). Tinta por celda a 150 dpi:
  - Experto: nombre + `fi` en el 2° turno del día de la PND, y en ningún otro lado.
  - Limpieza: nombre + `t2` en el 1° turno de L/X/V/D, salvo el día de la PND.
  - Cero firmas huérfanas.
- **Caso de la captura** (mié 30 sep): Mié 2° experto con firma; Lun/Vie/Dom 1° limpieza con firma; Martes y Jueves vacíos. Con v5 el mismo detector reproduce el error (Mar 1°–3° `fi`, Jue 1° y Sáb 3° `t2`, Mié 2° y Vie 1° sin firma).
- **Regresión** con 3 equipos (2 compresores + 1 tanque, PND jue/mié/mar) y azar fijo: 164 hojas.
  - v5 vs v6 renderizado página por página: solo cambian las 3 hojas 106, y solo en la columna FIRMA de la tabla inferior.
  - Hojas 6, 23, 66, 94, 96, 107, 109 y bloque superior de la 106 idénticos.
- Sin firmas cargadas: genera sin error.
- **Chromium** (`index.html` completo, Firebase bloqueado): carga sin errores de JavaScript.
