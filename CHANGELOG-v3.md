# CHANGELOG — exp-fenix · parche v3 (2026-09-25)

Base: `02-index-actual.html` del paquete v3. Se entrega un solo `index.html` listo para GitHub Pages; `kit/engine.js` es copia exacta del motor embebido.

La plantilla PDF base (7.5 MB) **no se modificó**. Los arreglos de las hojas 4, 9 y 72 se aplican al generar y, si el patrón no aparece, no se toca nada.

## PDF

| Hoja | Cambio |
|---|---|
| 4 | "TEXO DE REFENCIA" → **TEXTO DE REFERENCIA**. Se reescribe con la misma fuente embebida (Arial Rounded) y se recentra en x 248.41. |
| 9 y clones | El número de control STPS queda **vacío**. Se quitó el campo del mapa y también un "EN TRAMITE" blanco invisible que la plantilla traía en el texto. La hoja 6 sigue con EN TRAMITE en Dictamen y Control. |
| 10 | Todos los equipos: `VÁLVULA DE SEGURIDAD TIPO {SILBATO\|CAMPANA\|ARGOLLA}, Ø {n}mm`, tomado de la captura. |
| 66 (Cat III) | Se tapan y reescriben 6 valores del escaneo: Ø de "MACHO ASA B 2.2-1960 DE", temperatura máxima (temperatura de diseño, 1 decimal), presión máxima de operación (trabajo máx. permitida) y presión de disparo. Las dos presiones van también en kPa (× 98.07, 2 decimales, con separador de miles como la referencia: 1,829.01). Certificado y número de serie siguen siendo aleatorios y únicos. |
| 72 | Se quitó "RMC Servicios de Ingeniería, S. de R.L. de C.V.". Era una **imagen de 553 × 29 px** debajo del logo, que se asomaba con logos de otra proporción. Se reemplaza por un objeto vacío. |
| 73 | Sin cambio: imprime el espesor mínimo capturado. |
| 74 | Si una columna tiene los 16 valores iguales (viene de Rellenar), cada punto imprime B + 0.00…0.03 al azar en cada generación. Al menos un punto queda en B, para que el mínimo de las hojas 73 y 74 coincida. Si los 16 se capturaron a mano, se imprimen tal cual. |
| 96 | RFC de máximo 12 caracteres en la hoja y en el campo. |
| 107 | Una sola vez por expediente (antes, una por equipo). |

### Nombres de archivo
- `EXP {RAZÓN SOCIAL}.pdf` y `EXP {RAZÓN SOCIAL}.zip`
- `PREVIO {TAG} {RAZÓN SOCIAL}.pdf` y `DICTAMEN {TAG} {RAZÓN SOCIAL}.pdf`

Se quitan puntos, comas, acentos y los caracteres prohibidos (`/\:*?"<>|`). Los espacios dobles se juntan. Ejemplo: "FOCAS INDUSTRIALES, S.A. DE C.V." → `EXP FOCAS INDUSTRIALES SA DE CV.pdf`. Los guiones propios del TAG se conservan (`COM-01`).

## Interfaz

### Orden del expediente
La captura sigue el orden del expediente. Cada paso muestra las hojas que alimenta:

1. **Centro de trabajo** (hojas 1–7): lista de documentos para el cliente, empresa y logo.
2. **Equipos** (hojas 3, 6 y 8–20).
3. **Responsables** (hojas 14–68 y 102–108): testigos y firmante izquierdo.
4. **Pruebas no destructivas** (hojas 70–75): por equipo, **espesores → anexo fotográfico**; enseguida, las firmas PND.
5. **Emergencias y DC-3** (hojas 91–98): tríptico, teléfonos de la hoja 94, y RFC, CURP y representante legal de la DC-3.
6. **Generar**.

### Captura de cada equipo
- **Presiones**, en este orden:
  1. Diseño
  2. Calibración
  3. **Arranque** (nuevo)
  4. Operación
  5. Trabajo máxima permitida
  6. **Prueba hidrostática**: automática, diseño × 1.1, bloqueada
  7. Capacidad volumétrica (ejemplo 0.500)
  
  Todos los campos tienen ejemplos (12.00, 10.50…). Las temperaturas van enseguida.
- **Válvula**: tipo (lista SILBATO/CAMPANA/ARGOLLA, SILBATO por omisión), Ø en mm y presión de disparo manométrica. Una vista previa en vivo muestra lo que imprimirán las hojas 10 y 66, con kPa.
- **Memoria de cálculo**: `RSP-020-` + **XXX** + `-2026`. Solo se editan los 3 caracteres; "7" se completa a "007". Sigue siendo también el No. de reporte de prueba.

### Diseño
- Tema oscuro por defecto, con modo claro. La preferencia se sigue guardando en `fenixmex-theme`.
- Tipografía Archivo. Si no carga, la app usa la fuente del sistema.
- Cada equipo tiene un **manómetro** que marca la presión de calibración sobre las zonas Cat I / II / III.
- La barra lateral muestra los pasos con sus hojas, los pendientes o avisos de cada paso y el total de hojas. En el celular se vuelve una barra horizontal fija.
- **Validación que lleva al campo**: al tocar un pendiente se abre el equipo o la pestaña PND correcta, se enfoca el campo y se resalta. Cada equipo muestra "N pendientes" o "Completo ✓".
- **Imágenes**: se pueden arrastrar y soltar. Las firmas también se pueden **dibujar** con el dedo, lápiz o mouse; se guardan como PNG transparente ya recortado.
- **Espesores**: Rellenar ya no usa una ventana emergente, sino un campo por columna. Se muestra el mínimo y el rango que tomará la hoja 74.
- **Generación**: el progreso cuenta "hoja n de N", al terminar aparece un sello de expediente generado y hay una lista de archivos para abrir o descargar.

## Sin cambios (probado)
- Hoja 6 con EN TRAMITE en Dictamen y Control.
- Hoja 23 compartida que se duplica al llenarse.
- Hoja 109 una sola vez con Cat III.
- Firma fija de Edwin en la hoja 96.
- Excel de lista de documentos: el nombre del archivo no cambia, porque no estaba en la regla de nombres.
- Muestras de la hoja 72 y teléfonos con respaldo de la plantilla.
- Firebase solo para los activos globales; el borrador vive en IndexedDB.
- Exportar e importar borrador.

## Claves nuevas en el borrador (`draft.equipos[]`)
| Clave | Tipo | Uso |
|---|---|---|
| `presionArranque` | texto numérico | Solo captura; **ninguna hoja la imprime**. Las hojas 26–28 mencionan "arranque" como texto de procedimiento, sin casilla. |
| `tipoValvula` | `SILBATO` \| `CAMPANA` \| `ARGOLLA` | Hojas 10 y 66 |
| `diametroValvulaMm` | texto numérico | Hojas 10 y 66 |
| `presionDisparo` | texto numérico (kg/cm²) | Hoja 66; obligatoria en Cat III |

- `presionPruebaHidrostatica` ahora es calculada: se recalcula al cargar y cada vez que cambia la presión de diseño.
- `dimensionesRelevo` queda en desuso; se conserva en el JSON.

### Migración automática de borradores v2
- Tipo y Ø se leen de `dimensionesRelevo` ("TIPO CAMPANA 12.7 MM" → CAMPANA, 12.7). Si no hay datos, un compresor conserva **ARGOLLA Ø 6** (lo que imprimía antes) y cualquier otro equipo queda en SILBATO.
- El código de memoria se normaliza (`RSP-020-12-2026` → `RSP-020-012-2026`).
- El RFC se recorta a 12 caracteres.
- La prueba hidrostática se recalcula, así que un valor capturado a mano distinto de diseño × 1.1 se reemplaza.

## Coordenadas nuevas (pt, origen abajo-izquierda) — `FX_ASSETS.map.exp.spec`
### `p66.vals` (Times 6.6, gris 0.2)
| id | Zona que se tapa (x, y, ancho × alto) | Texto | Alineación |
|---|---|---|---|
| diam | 348.5, 256.9, 20 × 10.3 | x 358.5, base 259.56 | centro |
| temp | 170.0, 142.5, 24.5 × 10.3 | x 182.4, base 145.08 | centro |
| pmax | 324.0, 151.6, 43.5 × 9.9 | x 363.5, base 154.0 | derecha |
| pmaxKpa | 324.0, 141.2, 43.5 × 10.2 | x 363.5, base 143.76 | derecha |
| disp | 590.0, 424.8, 40 × 10.0 | x 608.5, base 427.26 | centro |
| dispKpa | 648.0, 424.5, 44 × 10.2 | x 671.3, base 426.95 | centro |

### `tplfix`
- `p4x: 248.41`: x inicial del título de la hoja 4.
- `blankImgs: [[553, 29]]`: tamaño en píxeles de la imagen RMC de la hoja 72.

### Otros cambios en el mapa
- Se eliminó el campo `{p:9, k:"EN TRAMITE"}`.

## Pruebas realizadas
- **Motor en Node**, 3 equipos (2 Cat III y 1 Cat II; SILBATO, CAMPANA y ARGOLLA; Ø 6, 8 y 12.7): 164 hojas.
  - Hoja 107: 1 copia. Hoja 109: 1 copia.
  - Hoja 6: 6 × EN TRAMITE. Hojas 9 y clones: 0.
  - Hoja 66 revisada en imagen, con los kPa verificados (18.65 → 1,829.01; 21.10 → 2,069.28; 8.00 → 784.56).
  - Hoja 74: valores de 4.10 a 4.13 con mínimo 4.10.
  - Hoja 72 con logo cuadrado: la versión anterior mostraba el texto RMC; esta ya no.
- **En Chromium**, con Firebase bloqueado para no tocar la nube real:
  - Ejemplo + un equipo Cat II: se descargó el ZIP `EXP SERVICIO LOMAS ESTRELLA SA DE CV.zip` con el expediente (136 hojas), PREVIO y DICTAMEN.
  - Se probaron la validación con salto al campo, la firma dibujada, el Excel, la importación de un borrador v2, el modo claro y el celular a 390 px sin desbordes.
  - Sin errores de JavaScript.

## Pendiente de decidir (Juan)
- **Hoja 66:** la línea "NOMBRE: VÁLVULA SEGURIDAD TIPO SILBATO" del certificado escaneado no cambia con el tipo elegido. Con CAMPANA o ARGOLLA el certificado queda incongruente. Se puede ligar en otro parche.
- **Hojas 70 y 73:** traen el código "PR-RMC-END-UT-04 REV.0" en el texto. No se tocó porque no venía en la lista de cambios.
