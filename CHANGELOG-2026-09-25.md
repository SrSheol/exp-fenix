# CHANGELOG — exp-fenix · parche 2026-09-25

Base: repo `SrSheol/exp-fenix`, commit `522d8d8`. El paquete adjunto llegó vacío (0 bytes), así que todas las medidas se tomaron de la plantilla embebida en `index.html`.

## Archivos
- `index.html`: app completa lista para GitHub Pages, un solo archivo. La plantilla es la versión limpia, sin firmas del ejemplo. Incluye ExcelJS 4.4.0 embebido para que funcione sin conexión.
- `kit/engine.js`: el motor parchado, igual al que va embebido en `index.html`.

## Plantilla base sin firmas de ejemplo (§5)
Se vaciaron 14 imágenes de tinta vieja, que quedan como imágenes transparentes de 1×1:
- Hoja 23: objeto 1507.
- Hoja 62: objetos 1512 y 1513.
- Hoja 102: objetos 1580 y 1347 (1347 se repite 5 veces).
- Hoja 106: objetos 1581–1589.

Se conservó a propósito el objeto 1579 de la hoja 96: es la firma fija del instructor EDWIN ELIU MARTINEZ HERRERA en la DC-3. Para quitarla, se agrega a la lista `GHOST` del script de limpieza y se vuelve a generar la plantilla.

Comprobado: sin firmas cargadas, todos los recuadros salen vacíos; con firmas, no aparece doble tinta.

## Cambios por hoja
| Hoja | Cambio |
|---|---|
| 6 | "EN TRAMITE" en Dictamen y en Control (se corrigió la errata "EN TRAMITRE"). Se reescribieron 4 encabezados sin cortar palabras: Clasificación, Temperatura, Dictamen y Control; solo se permite cortar después de un guion ("NOM-020-" / "STPS-2011"). Nombre, tipo de dispositivo y ubicación se ajustan con margen; N/S y TAG ya no tocan el borde. |
| 9 | La placa va dentro del recuadro, centrada y sin deformarse. El número de control dice "EN TRAMITE". Nombre, N/S y TAG con margen. |
| 10 | Compresor de aire → `VÁLVULA DE SEGURIDAD TIPO ARGOLLA, Ø 6mm`. Otros equipos → su tipo y dimensiones capturados. |
| 14–18 | Nombre, serie/TAG y ubicación centrados con margen; se reducen si son largos. Fechas centradas en su columna ("septiembre-26" ya no se sale). Firmas más grandes y pegadas al nombre. |
| 23 | Una sola hoja compartida por todos los equipos. Compresor = `NOMBRE`, `MANOMETRO 1 - NOMBRE`, `VALVULA DE SEGURIDAD 1 - NOMBRE`; otros equipos = solo el nombre. Son 7 renglones por hoja y se duplica al llenarse, sin partir un equipo entre dos hojas. Nombres de Elaboró/Revisó/Aprobó dentro de su celda. Firmas un poco más grandes. |
| 44 | Firmas un poco más grandes, dentro de su columna. Nombres dentro de su celda. |
| 46 | "Fecha: mes/año" centrado en su celda. Firma pegada al nombre. |
| 48 | Firma un poco más grande, pegada al nombre. |
| 62 | Firmas un poco más grandes, sin cruzar a la celda vecina. |
| 64 | Fecha centrada en su celda. La firma no se tocó. |
| 66 | Solo Cat III (regla existente). `CERTIFICADO No.` con formato XXX-XXXXX y `NUMERO DE SERIE` con formato XXXXXX, en dígitos como la referencia, al azar y sin repetirse en la misma generación. |
| 68 | `{Testigo 1} Y Personal Contratista.` con un solo espacio. Firmas un poco más grandes. |
| 72 | 4 fotos (Muestra 1–4) por equipo, centradas en su marco sin deformarse. Sin foto se conserva "SIN DATO". |
| 94 | 5 campos nuevos: Protección Civil, Policía, Bomberos, Cruz Roja y Línea Única. Si un campo queda vacío se imprime el número de la plantilla, y la app muestra un aviso cuando no se capturó ninguno. |
| 96 | Firmas un poco más grandes (Testigo 2 y representante legal). |
| 98 | Fecha fija 2026 · 01 · 01 en los dos bloques ("De" y "a"). |
| 102 | Firmas un poco más grandes. |
| 106 | Nombres largos del Testigo 2 y del firmante dentro de su celda (pueden ocupar 2 líneas). Firmas un poco más grandes. |
| 108 | El texto de resultados se reacomoda dentro de la celda sin cortar palabras y conserva el corrimiento según el día de la PND (probado con lunes y jueves). La firma del firmante ahora cabe en la celda FIRMA (antes se salía de la tabla). |
| 109 | Se incluye una sola vez si hay al menos un equipo Cat III; se omite si no hay ninguno. Nota: con equipos solo Cat I también se omite. |

## Interfaz
- **Botón "Lista de documentos"** junto a Oscuro/Claro. Pregunta ¿Es equipo nuevo? Con Sí incluye los puntos 1–18; con No, los puntos 1–13.
  - Descarga `FenixMex_Documentacion_Requerida_<Nuevo|Existente>_<AAAAMMDD>.xlsx`.
  - Lleva el logo cargado o, si no hay, el de la plantilla. Encabezado vino/oro y campo de razón social en blanco para el cliente.
  - Columnas: #, Documento requerido, Estado (lista Pendiente/Entregado/N/A con colores), Ruta o vínculo del archivo y Observaciones.
  - Encabezado de tabla fijo al desplazar y repetido al imprimir. Contador de entregados, líneas de firma Entregó/Recibió y pie con fecha y "FenixMex".
  - Se probó en LibreOffice.
- **Anexo fotográfico PND — hoja 72:** 4 cargadores por equipo. Se guardan solo en este navegador, como la foto de la placa.
- **Directorio de emergencias — hoja 94:** 5 campos en Datos generales, guardados en el borrador local.
- **Firmas:** al generar, se recorta automáticamente el margen vacío (transparente o blanco) de cada firma para que quede pegada al nombre. La imagen guardada no se modifica.
- Sin cambios: Firebase (solo los globales van a la nube), IndexedDB, modo oscuro, reglas de Cat II previo/dictamen y el ZIP.

## Tipos de campo nuevos en el mapa (para futuros ajustes)
- `t:'fit'` con `box:[x0,y0,x1,y1]`: margen (`pad`, `padY`), máximo de líneas `ml`, alineación `a`. Corta solo entre palabras (o tras un guion), reduce el tamaño hasta que quepa y centra en vertical. Un salto de línea (`\n`) en el texto separa párrafos.
- Casillas de firma con `va:'b'`: la firma se ancla a la base, pegada al nombre. `clip:[xMin,xMax]` impide cruzar los bordes de la celda.
- En campos simples, el tamaño mínimo al reducir por `mw` bajó de 55 % a 35 %, para que los nombres largos no se desborden.

## Constantes de coordenadas (pt, origen PDF abajo-izquierda) — `FX_ASSETS.map.exp`
### Firmas (`imgs`)
| Hoja | Rol | Casilla (x, y, ancho × alto) | Notas |
|---|---|---|---|
| 14 | t2 | 232.2, 129.5, 150 × 47 | anclada a la base |
| 15 | t2 | 234.0, 129.2, 150 × 48 | anclada a la base |
| 16 | t2 | 233.8, 118.3, 150 × 50 | anclada a la base |
| 17 | t2 | 230.8, 126.1, 150 × 30 | anclada a la base; la tabla termina en y 147.6 |
| 18 | t2 | 231.0, 106.4, 150 × 42 | anclada a la base |
| 23 | t2 / t1 / t1 | 84 × 56 centradas en (310.5, 172.7), (614.1, 168.9), (903.0, 171.3) | límites: 61–336 / 340–642.75 / 646.75–929.25 |
| 44 | t2 / t1 | 90 × 42 en (454.6, 321.4); 100 × 42 en (456.4, 282.9) | límites 381.5–524.75 |
| 46 | t2 | 268.5, 154.8, 80 × 25 | anclada a la base |
| 48 | t2 | 271.9, 334.5, 90 × 28 | anclada a la base |
| 62 | t2 / t1 / t1 | 105 × 42 centradas en (149.6, 195.0), (302.9, 198.2), (462.1, 196.6) | límites por celda |
| 64 | t1 | sin cambio (266.8, 463.15, 72.14 × 46.17) | — |
| 68 | t2 / t1 | 90 × 40 en (448.9, 191.8); 100 × 42 en (455.6, 151.3) | límites 381.5–524.75 |
| 96 | t2 / rep | 90 × 48 en (468.8, 249.9); 110 × 32 en (295.8, 244.5) | — |
| 102 | t2 (14 casillas) | 55 × 50 con el mismo centro que antes | límites 858.25–1054.88 |
| 106 | t2 en la tabla 1 | 55 × 50 | límites 858.25–1054.88 |
| 106 | t2 en la tabla 2 y fi | 50 × 48 | límites 1004.62–1054.88 |
| 108 | fi | 1004.6, 951.5, 50.3 × 62.5 | con corrimiento por día |

### Otros
| Hoja | Elemento | Valor |
|---|---|---|
| 6 | Encabezados rehechos (`spec.p6hdr`) | y 619.3–679.68; celdas 304.52–362.96, 626.75–685.21, 1033.48–1105.96, 1105.96–1178.46 |
| 6 | Filas de datos | y 584.32–619.36, alto 35.04 |
| 9 | Placa | 83.0, 149.6, 445.1 × 252.2 (recuadro 80.5–530.62 / 147.12–404.25) |
| 9 | Número de control | 300.25–530.62 / 518.5–547.0 |
| 23 | Columna ÍTEM (`spec.p23`) | x 59.25–185.25; renglones en y 764.0 / 707.0 / 639.5 / 568.5 / 483.38 / 398.75 / 314.25 / 229.5 |
| 66 | Certificado (`spec.p66`) | Courier-Bold 11 en (353.77, 499.09); se tapa la zona 352.0, 491.4, 63.5 × 19.2 |
| 66 | Serie | Times 6.6 en (316.67, 281.06); se tapa la zona 315.4, 278.6, 23.4 × 9.6 |
| 72 | Marcos | M1 64.5–288 / 382.5–586 · M2 323.25–546.75 / 382.5–586 · M3 64.5–288 / 124.75–328.25 · M4 323.25–546.75 / 124.75–328.25 (margen interior 2.2) |
| 94 | Teléfonos (`spec.p94`) | Times Italic 26.5 en x 52.5; base de cada renglón en y 518.3 / 439.1 / 333.5 / 227.9 / 148.7 (+5.7) |
| 98 | Casillas de fecha (`spec.p98`) | "De": 245.0 → 386.88; "a": 407.25 → 563.12; y 351.6–364.4, base 353.6 |
| 108 | Celda de resultados | 698.75–856.25 / 949.88–1015.62, con corrimiento por día |

## Pruebas realizadas
- **Un equipo Cat III:** 109 páginas.
- **Un equipo Cat II:** 107 páginas (sin hojas 66 ni 109) más su previo y dictamen.
- **Cuatro equipos mixtos:** 196 páginas.
  - Dos copias de la hoja 23.
  - Tres certificados en la hoja 66 con números distintos.
  - Nombre del testigo y nombres de equipo largos.
  - Placa vertical.
- **En el navegador:** con Firebase bloqueado para no tocar la nube real se probaron el ZIP con y sin firmas y los dos Excel, sin errores de JavaScript.
