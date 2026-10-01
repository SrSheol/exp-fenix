# CHANGELOG — exp-fenix · parche v7 (2026-10-01)

Base: `index.html` levantamiento v1 (`7a229eb`). Sigue siendo un solo `index.html` para GitHub Pages. El motor cambió **solo en la hoja 23**, por eso va `kit/engine.js` (copia exacta del motor embebido). Sin deploy.

## Levantamiento (FXLev v2)

| Dónde | Qué |
|---|---|
| Barra superior | Orden **Levantamiento \| Expediente**. `fenixmex-vista`, `#levantamiento`, `#s-*` e `irA()` igual que antes. |
| Croquis | **Longitud soldadura–soldadura** (solo cuerpo, mm) + campo nuevo **Profundidad de tapa** (mm, igual en ambos extremos). Dibujo: total = cuerpo + 2 × tapa; sin tapa capturada se dibuja 2:1 (Ø/4) como referencia. |
| Cotas | Estilo CAD: cadena tapa \| cuerpo \| tapa con extensiones punteadas; la profundidad va sobre cada tapa (o por fuera si no cabe). **Ø INT.** al centro del cuerpo; se recorre a la posición libre más cercana si hay una boquilla frente/atrás encima. |
| Boquillas | Tipos nuevos **TAPÓN** y **DESFOGUE** (8 en total). Se pueden repetir tipos; letras A, B, C… por orden. Al importar se acepta `TAPON` sin acento. |
| Datos | Presiones en orden diseño → calibración → arranque → paro → capacidad, con ejemplos (`12.00`, `10.50`, `7.00`, `9.00`, `0.500 m³ · 500 L`). La capacidad muestra en vivo cómo se guardará. |
| Espesores | Puntos **1–16**. Por columna: **Base + Rellenar** (base + 0.00…0.03 mm al azar, al menos uno exacto en la base) y **✕** (vaciar). Rellenar solo toca celdas vacías o que ya había llenado Rellenar; lo escrito a mano se respeta (se ve en cursiva lo automático). Sin base usa el mínimo capturado a mano. |
| Formatos | Menú **Formatos ▾** → `FORMATO LEVANTAMIENTO H.pdf` / `FORMATO LEVANTAMIENTO V.pdf`: croquis en blanco, tabla de boquillas vacía, datos y espesores 1–16 vacíos, orientación marcada. Sin Firebase. |
| PDF | Título 16 pt; logo en caja fija 150 × 30 a la derecha (sin logo no pasa nada). Orden: encabezado → orientación y dimensiones (Ø, longitud soldadura–soldadura, profundidad de tapa) → croquis recortado a lo dibujado → boquillas (con catálogo de tipos) → **Datos del tanque** → **Espesores** en 3 columnas × (1–8 \| 9–16). Capacidad impresa en m³. |

### Capacidad (regla Juan)
Sin unidad y con decimales (`0.500`, `1.250`) → m³ tal cual. Sin unidad, entero ≥ 20 (`500`) → litros → `0.500`. `L/lt/litros` ÷ 1000; `gal` × 0.003785411784; `m3/m³` explícito → m³. Siempre 3 decimales. Se aplica al exportar el JSON y al importar en el expediente. El umbral 20 es decisión mía: un entero menor (p. ej. `2`) se toma como m³.

### Esquema `fenix-levantamiento` · `version: 2`
- `dimensiones { diametroInteriorCm, longitudMm (ahora soldadura–soldadura), profundidadTapaMm }`
- `espesores.*` con 16 valores; `metadata.capacidad` ya normalizada en m³.
- Se aceptan archivos **v1** (15 puntos → el 16 queda vacío). Al abrir un v1 se avisa que su longitud era total (extremo a extremo); no se convierte sola.
- Borradores locales v1 se reparan solos (punto 16 vacío). `espAuto` (qué llenó Rellenar) solo vive en el borrador local.

## Expediente

- Equipo → Válvula de seguridad: campo **Programa de calibración (válvula)** (`fechaProgramaCalibracion`, aaaa-mm-dd). Vacío = sin programa. Debajo dice en qué mes y semana caerá la marca y avisa si el año no es el de la PND (se usa solo mes y día). Se guarda en el borrador, Exportar/Importar y `migrar()` (default `''`).
- Importar levantamiento: primera importación llena el equipo en blanco de «Nuevo expediente», las siguientes agregan; razón social solo si está vacía; espesores 1–16 → índice 0–15; capacidad con la regla de arriba; `profundidadTapaMm` se guarda en el equipo y en `equipo.levantamiento` (no se imprime en hojas NOM-020).

## Hoja 23 (motor)

`planExp` manda con cada renglón su equipo (`ref23`). `specialP23`:
1. Blanquea las 48 celdas P y R de los 7 renglones (solo el interior, sin tocar líneas). Se van las marcas fijas de la plantilla: Enero‑1 del renglón 1 y **Noviembre‑1 del renglón 2**.
2. Compresor · MANÓMETRO: gris en **noviembre, semana 1**. Sin negro. El programa no lo mueve.
3. Compresor · VÁLVULA: gris + negro en **enero, semana 1** sin programa; con programa, en el mes de la fecha y semana: días 1–7 → 1, 8–14 → 2, 15–21 → 3, 22–fin → 4.
4. Otro equipo: gris + negro en enero, semana 1 (como en v4).
5. Varios compresores en la misma hoja: cada válvula usa la fecha de su equipo.

Textos de ítem, encabezado de fecha y demás hojas sin cambios.

### Coordenadas medidas (pt, origen abajo-izquierda)
`FX_ASSETS.map.exp.spec.p23.mk` gana `lw: 0.984` y `lx`: bordes izquierdos de las 49 líneas verticales de la rejilla (del flujo de contenido de la plantilla). El motor trae la misma tabla como respaldo si el mapa no la tiene.

```
255.59 276.05 296.51 316.97 | 337.43 357.89 378.34 398.83 | 419.29 439.75 460.2 480.66 | 501.12 521.58 542.04 562.52
582.98 603.44 623.9 644.36 | 664.82 685.28 705.74 726.22 | 746.68 767.14 787.6 808.06 | 828.52 848.98 869.43 889.92
910.38 930.84 951.3 971.75 | 992.21 1012.67 1033.13 1053.61 | 1074.07 1094.53 1114.99 1135.45 | 1155.91 1176.37 1196.83 1217.31 | 1237.77
```
Celda (mes m, semana w): `i = (m−1)·4 + (w−1)`; `x = lx[i] + 0.984`, `ancho = lx[i+1] − x`. Enero‑1 = 256.574 / 19.476 (igual que el `mk` anterior). Alturas: `mk.rows` con los insets `lt`/`lb` de siempre.

## Sin cambios
Hojas 6, 66, 94, 96, 106, 107, 109; firmas 106; glyphs 66; materiales SA-414-G; hidrostática = diseño × 1.1; máscara de memoria; RFC 12; nombres de archivo; Firebase solo globales; borrador en IndexedDB; tema `fenixmex-theme`; plantilla base (solo se dibuja encima).

## Pruebas
- **Motor en Node**, azar fijo, v1-lev vs v7: 1 compresor sin programa, 1 con 18‑mar, y 3 compresores (18‑mar, 30‑jun, sin) + 1 tanque. Raster página por página: **solo cambia la hoja 23** (109/109 y 193/193 hojas restantes idénticas). Marcas verificadas: Nov‑1 gris en manómetros, Mar‑3 y Jun‑4 en válvulas con programa, Ene‑1 en la válvula sin programa y en el tanque; sin huérfanas.
- **FXLev en Node**: capacidad (`500→0.500`, `0.500`, `1.250`, `500 L`, `1,250`, `10 gal`), JSON v2, v1 → 16 puntos, TAPÓN sin acento, PDF lleno H/V y formatos H/V.
- **Chromium** (Firebase bloqueado), sin errores de página: orden de pestañas, dims y ayudas, boquillas repetidas, Rellenar respetando un valor a mano, exportar JSON/PDF, formatos H y V, Nuevo expediente + importar (reutiliza) + segunda importación (agrega), razón social conservada, capacidad 0.500, programa de calibración con aviso y persistencia tras recargar.
