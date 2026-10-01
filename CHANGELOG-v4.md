# CHANGELOG — exp-fenix · parche v4 (2026-09-30)

Base: `index.html` v3. Se entrega un solo `index.html` listo para GitHub Pages. `kit/engine.js` es copia exacta del motor embebido.

La plantilla PDF base (7.5 MB) **no se modificó**. Todo se dibuja al generar.

## PDF

| Hoja | Cambio |
|---|---|
| 23 | Un compresor de aire imprime **solo 2 ítems**: `MANOMETRO 1 - {NOMBRE}` y `VALVULA DE SEGURIDAD 1 - {NOMBRE}`. Ya no lleva un renglón con el nombre solo. Cada ítem ocupado lleva su par de marcas en Enero, semana 1: gris en P y negra en R, igual que el primer renglón de la plantilla. Los demás equipos siguen con un solo renglón con su nombre. La hoja compartida se sigue duplicando cuando se llena. |
| 66 | **Disparo** = presión de arranque. **Cierre** = presión de operación; antes no se imprimía. Las dos van en kg/cm² y en kPa (× 98.07, 2 decimales, con separador de miles). Ø, temperatura y presión máxima no cambian. |
| 94 | El directorio ahora es una **tabla**: encabezado oscuro, renglones alternados y Bomberos y Cruz Roja con un número por línea. La **Línea Única de Emergencias siempre imprime 911**, resaltada. Abajo lleva una nota: llamada gratuita, 24 horas. Un campo vacío usa el número de CDMX de la plantilla. |
| 96 | **Periodo de ejecución**: "De" y "a" llevan la misma fecha AAAAMMDD, del año de la PND. Se salta el mes anterior a la PND y se elige al azar un mes de enero a M−2 y un día válido. Si la PND es en **enero o febrero**, la fecha cae al azar entre el 1 de enero y 7 a 14 días antes de la PND. Se borra el "01 16" fijo de la plantilla. |
| 106 | Tabla semanal inferior. **Limpieza** ("limpieza de la zona, escurrimiento de aceite") en lunes, miércoles, viernes y domingo, turno 1°, a las 07:20–07:29 hrs al azar. El **renglón del experto PND** va en el día de la semana de la PND, turno 2°, 11:13 hrs; si ese día tenía limpieza, la sustituye. Cada renglón ocupado lleva "completo" y su responsable: testigo 2 en limpieza y firmante izquierdo en el experto. |

Sin cambios (probado): hoja 6 con EN TRAMITE, hoja 9 sin control STPS, hoja 4, hoja 10, hoja 72, hoja 74 con jitter, hojas 107 y 109 una sola vez, firma de Edwin y nombres de archivo con espacios.

## Interfaz

### Captura
- **Empresa**: un solo campo, **Nombre legal de la empresa (Razón Social)**. Se quitó "Razón social del usuario". Ese nombre se imprime en todo el expediente y da nombre a los archivos.
- **Identificación**: se quitó **Diámetro interior**, que no se imprimía en ninguna hoja.
- **Válvula**: se quitó **Presión de disparo manométrica**.
  - La presión de arranque es ahora obligatoria en categoría III y muestra su equivalencia en kPa como disparo de la hoja 66.
  - La presión de operación muestra su equivalencia como cierre.
  - La vista previa de la hoja 66 muestra disparo (arranque) y cierre (operación).
- **Construcción**: material del cuerpo y de las tapas en **SA-414-G** por omisión, para equipos nuevos.
- **Espesores**: **Rellenar** ya llena los 16 puntos con la variación visible: mínimo + 0.00 a 0.03, con al menos uno en el mínimo. Se puede corregir cualquier punto.
  - La hoja 74 imprime lo que se ve.
  - Si los 16 quedan iguales, al generar se vuelve a aplicar la variación.
  - Debajo se indica el rango.
- **Directorio de emergencias**: Línea Única **911 fija** (bloqueada).
- **DC-3**: la etiqueta es **Nombre del Representante Legal**.
- Se reescribieron textos de secciones, notas y ayudas para que se entiendan sin saber la norma.

### Barra superior
- **Marca nueva**: un manómetro con las zonas Cat I, II y III en lugar de la flama, igual en la pestaña del navegador. El logo FenixMex de las hojas PDF no cambia.
- **Placa del expediente**: nombre de la empresa (al tocarlo lleva al campo), número de equipos, número de hojas y estado.
  - El estado dice "N datos pendientes", que lleva a la lista, o "Listo para generar".
- El estado de guardado es un indicador compacto; el detalle aparece al pasar el cursor.
- En celular (390 px) se ven la marca, el nombre y los pendientes, sin desbordes.

## Borrador

| Clave | Cambio |
|---|---|
| `razonSocialPropietario` | Único campo capturado. `razonSocialUsuario` se guarda igual para compatibilidad. |
| `tel94Emergencias` | Siempre `911`. |
| `presionDisparo` | Se elimina al abrir; ya no se usa. |
| `diametroInteriorMm` | Se elimina al abrir. |
| `usuarioEditado` | Se elimina al abrir. |

### Migración automática de borradores v3
- **Nombre**: si el usuario se había editado a mano, gana ese nombre, porque era el que se imprimía. Si no, se usa el del propietario o el que exista.
- **Materiales**: los capturados se respetan; solo los equipos nuevos traen SA-414-G.

## Coordenadas nuevas (pt, origen abajo-izquierda) — `FX_ASSETS.map.exp.spec`
- `p23.mk`: x 256.574, ancho 19.476.
  - Renglones `[arriba, división P/R, abajo]` en y = 764.11 / 707.26 / 639.76 / 568.72 / 483.54 / 398.93 / 314.31 / 229.72.
  - Divisiones P/R: 740.31 / 674.19 / 603.17 / 533.7 / 444.17 / 359.58 / 274.97.
  - Las marcas se dibujan encima, dentro de la celda, porque la plantilla trae rellenos blancos en los renglones 2 y 4–7.
- `p66.vals`:
  - `disp` → `{e.parr}` y `dispKpa` → `{e.parrKpa}`.
  - `cierre` nuevo: tapa 590, 402.9, 40 × 10; x 608.1, base 405.5.
  - `cierreKpa` nuevo: tapa 648, 402.6, 44 × 10.2; x 670.7, base 404.95.
- `p96.per`:
  - Celdas "De": 252.05 / 268.01 / 283.85 / 299.81 / 315.77 / 337.01 / 358.39 / 379.63 / 400.87.
  - Celdas "a": 422.23 / 441.67 / 461.23 / 480.7 / 500.26 / 521.5 / 542.74 / 563.98 / 585.46.
  - y 379.4–392.7, base 382.01, Arial 8.14.
  - Se quitaron los 8 campos `{g.y0…y3}`.
- `p106`:
  - Días `[arriba, 1°/2°, 2°/3°]`, de lunes a domingo, en 757.94, 693.63, 626.35, 562.04, 496.25, 430.44 y 364.65.
  - Columnas: hora 174.58–235.87, elemento 235.87–698.39, resultado 698.39–855.92, responsable 855.92–1002.32.
  - Se quitaron del mapa el texto del experto y los 4 responsables fijos de la tabla inferior.
- `p94t`: tabla de x 56 a 556, división en 250, encabezado de 30 pt desde y 572 y 5 renglones de 62 pt. Reemplaza a `p94`.

## Pruebas realizadas
- **Motor en Node**: 3 equipos (2 compresores Cat III y 1 tanque Cat II), 164 hojas.
  - Hoja 23: 5 ítems, todos con sus marcas.
  - Hoja 66: 7.00 → 686.49 y 9.00 → 882.63 kPa.
  - Hoja 96: PND 22 de junio → fecha entre enero y abril; De = a.
  - Hoja 106: PND en lunes, el experto sustituye la limpieza del lunes.
- **Periodo hoja 96**, 3,000 sorteos por caso, sin fechas inválidas:

  | PND | Fechas posibles |
  |---|---|
  | 22 jun | 1 ene – 30 abr |
  | 5 mar | enero |
  | 22 ene | 1–15 ene |
  | 10 feb | 1 ene – 3 feb |
  | 3 ene | 1 ene |
  | 31 dic | 1 ene – 31 oct |

- **Chromium** (Firebase bloqueado):
  - Se importó un borrador v3 con dos razones sociales distintas, disparo y diámetro interior. Quedó con un solo nombre, 911, sin campos viejos y la memoria normalizada a 007.
  - Se descargó `EXP FOCAS INDUSTRIALES SA DE CV.zip`, de 109 hojas. Hoja 96: 2026-01-10 en ambos lados. Hoja 106: experto el jueves 22 de enero, más 4 días de limpieza.
  - Rellenar mostró 4.40 a 4.43 en la pantalla.
  - Se probaron modo claro, modo oscuro y 390 px. Sin errores de JavaScript.

## Para revisar (Juan)
- **Hoja 106, nombre del experto**: el texto usa el nombre del firmante izquierdo, hoy JOSE MARTINEZ ARGUETA, en formato título. Si se quiere fijo, se cambia `txtExp` en `p106`.
- **Hoja 23, gris en Noviembre**: el renglón 2 de la plantilla trae un gris en Noviembre, semana 1. No se tocó.
- **Hoja 96 con PND en febrero**: no hay meses anteriores a enero que saltar, así que se aplica la regla de enero y la fecha puede caer en enero.
- **Hoja 66**: el renglón "NOMBRE: VÁLVULA SEGURIDAD TIPO SILBATO" del escaneo sigue sin cambiar con el tipo elegido.
