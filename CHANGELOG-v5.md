# CHANGELOG — exp-fenix · parche v5 (2026-09-30)

Base: `index.html` v4 + `dbe6bc9`. Se entrega un solo `index.html` listo para GitHub Pages. `kit/engine.js` es copia exacta del motor embebido.

Solo se tocó el motor PDF y su mapa (`FX_ASSETS.map.exp.spec`). La interfaz, la migración de borradores, Firebase, el tema y los nombres de archivo no cambian. La plantilla base (7.5 MB) **no se modificó**: todo se corrige al generar.

## PDF

| Hoja | Cambio |
|---|---|
| 66 | El renglón **NOMBRE : VÁLVULA SEGURIDAD TIPO …** ahora imprime el tipo elegido en la captura: SILBATO, CAMPANA o ARGOLLA. Se borra el valor fijo de la plantilla y se vuelve a escribir con los **mismos glyphs del escaneo**, misma fuente, tamaño, gris y posición, así que no se nota el cambio. "NOMBRE :" se queda como está. |
| 66 | Se quitó el **texto oculto duplicado** debajo de los borrados: NOMBRE, disparo, cierre (kg/cm² y kPa), certificado y serie. Al copiar o buscar en el PDF ya solo aparece el valor nuevo. |
| 66 | Presiones: **sin cambios**. Disparo = presión de arranque, cierre = presión de operación, kPa × 98.07 con 2 decimales y separador de miles. Ø en su celda, como en v4. |
| 106 | Tabla inferior: los borrados de celdas se comían parte de las reglas, que quedaban en ~0.5 pt y casi no se veían. Ahora, después de borrar, se **redibuja la cuadrícula completa** al grosor original de la hoja (**0.86 pt**, negro). Queda igual que la tabla de arriba. Los textos de limpieza y del experto no cambian. |
| 94 | Líneas de la tabla más visibles: divisiones internas de 0.6 a **0.9 pt**, gris de 0.72 a **0.50**; borde exterior de 1 a **1.3 pt**. El contenido no cambia. |

### Grosores revisados que no cambian
- **Hoja 6** (`p6.lw = 0.6`): las líneas originales de la tabla también son de 0.6 pt negro. Los renglones que agrega el motor ya son iguales a la plantilla. Subirlas los haría más gruesos que el primer renglón.
- **Hoja 96** (`p96.per.lw = 0.72`): este valor no dibuja líneas. Es el margen del borrado de cada dígito. Las casillas son de la plantilla (0.72 pt) y el borrado no las toca; se comprobó a 400 dpi.

## Coordenadas nuevas (pt, origen abajo-izquierda) — `FX_ASSETS.map.exp.spec`

### `p66.nombre` (nuevo)
- Borrado `wipe`: `[161.6, 320.9, 120.0, 9.4]`, es decir x 161.6–281.6 y y 320.9–330.3.
  - Tinta del original: x 163.1–277.0, y 321.7–329.4.
  - Halo blanco de la imagen: hasta x 161.2–281.2.
  - No toca "NOMBRE :" (termina en 143.3) ni "MODELO:" (empieza en 292.9).
- Fuente de la plantilla: `C0_6` (*Cambria-Bold-17344*, CFF embebida), 7 pt, gris 0.294, base y = 322.95.
- Palabras, en el formato x / Tc:
  - VÁLVULA: 163.44 / −0.006
  - SEGURIDAD: 196.15 / 0.034
  - TIPO: 234.009 / 0.012
  - tipo: 250.191 / 0.034
- CIDs del tipo:

  | Tipo | CIDs | Ancho | Termina en x |
  |---|---|---|---|
  | SILBATO | `0008 00bb 001e 000f 0001 000e 0003` (los originales) | 26.9 pt | 277.1 |
  | CAMPANA | `0007 0001 000b 000d 0001 000a 0001` | 32.1 pt | 282.3 |
  | ARGOLLA | `0001 00f0 00b5 0003 001e 001e 0001` | 30.4 pt | 280.6 |

- Respaldo `fb`: si la hoja no trae `C0_6`, se escribe "VÁLVULA SEGURIDAD TIPO {TIPO}" en Times, 7 pt, gris 0.294, x 163.44, ancho máximo 127.

### `p66.strip` (nuevo)
Son los bloques de texto de la plantilla que se vacían al generar, identificados por su `TD`:
- `163.44 322.95`: nombre
- `603.884 427.26`: disparo
- `666.566 426.95`: disparo en kPa
- `603.6 405.47`: cierre
- `665.968 404.95`: cierre en kPa
- `353.77 499.088`: certificado
- `316.67 281.06`: serie

Si el patrón no aparece, no se toca nada.

### `p106.grid` (nuevo)
- `lw` 0.86. Las horizontales llegan hasta x1 = 1057.28.
- 22 horizontales, dadas por la base de cada regla:
  - Divisiones de día, desde x 75.02: 757.19 / 692.88 / 625.6 / 561.29 / 495.5 / 429.69 / 363.9 / 296.81.
  - Divisiones de turno, desde x 140.38: 734.24 / 712.81 / 669.95 / 647.02 / 604.17 / 582.71 / 538.36 / 515.43 / 472.57 / 451.12 / 406.76 / 385.33 / 343.98 / 322.55.
- 8 verticales, todas desde y 296.81:

  | x | Hasta y |
  |---|---|
  | 74.17 | 801.12 |
  | 139.52 | 785.91 |
  | 174.48 | 785.91 |
  | 235.76 | 785.91 |
  | 698.29 | 785.91 |
  | 855.81 | 785.91 |
  | 1002.21 | 785.91 |
  | 1056.43 | 800.26 |

- Se toman de las reglas originales de la plantilla.

### `p94t`
`lwIn` 0.9 · `lwOut` 1.3 · `cLin` [0.5, 0.5, 0.53].

## Mediciones (notas)
- **Hoja 66**: los 10 borrados de `p66.vals` cubren por completo los glyphs de la plantilla. La imagen de fondo trae cifras fantasma muy tenues (gris 241–251 de 255) y todas caen dentro de los borrados. A 600 dpi no hay dígitos dobles. No hizo falta mover ningún borrado de presión.
- **Hoja 66**: Ø, temperatura y presión máxima siguen con su texto original oculto bajo el borrado, porque en la plantilla van dentro de renglones compartidos. Visualmente están limpios; solo se notan al copiar el texto del PDF.
- **Hoja 106, ancho de las reglas a 300 dpi** (columna "Elemento"): v4 = 2 px en la tabla inferior; v5 = 3–4 px, igual que la tabla superior.
- El borrado de celdas de la hoja 106 (`ins` 0.4) era el único del motor que se encimaba en reglas de la plantilla. Se revisaron todos los borrados de las hojas 46, 66, 68, 91, 94, 96, 98 y 106.

## Pruebas realizadas
- **Motor en Node**, con 3 equipos Cat III (SILBATO, CAMPANA y ARGOLLA): 165 hojas.
  - Hoja 66: cada una muestra su tipo; texto extraído sin duplicados.
  - Disparo 18.65 → 1,829.01 kPa; 1234.50 → 121,067.41; cierre 999.99 → 98,069.02.
  - Respaldo sin `C0_6`: imprime en Times correctamente.
- **Regresión**, con el borrador v4 de prueba (2 compresores y 1 tanque): 164 hojas, igual que v4.
  - Hoja 23 con 2 ítems por compresor y sus marcas.
  - Hoja 94 con 911.
  - Hoja 96 con De = a.
  - Hoja 106: experto el jueves (PND 22 de enero) en 2° turno a las 11:13, y limpieza en L, X, V y D.
  - Hojas 107 y 109 una sola vez.
  - Hoja 10 con la línea de válvula de la captura.
  - Nombres de archivo con espacios.
- **Chromium** (`index.html` completo, Firebase bloqueado): carga sin errores de JavaScript y genera 164 hojas.
- La interfaz y `migrar()` no se tocaron. La importación de borradores viejos (SA-414-G, 911, razón social única, etc.) sigue igual.
