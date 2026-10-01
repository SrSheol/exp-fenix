# CHANGELOG — exp-fenix · Levantamiento v1 (2026-10-01)

Base: `index.html` v6 (`6578fee`). Sigue siendo un solo `index.html` para GitHub Pages. El motor PDF (`FXEngine`) y `FX_ASSETS` **no se tocaron**, por eso no va `kit/`.

## Rutas / interfaz

| Dónde | Qué |
|---|---|
| Barra superior | Selector **Expediente / Levantamiento** (en pantallas angostas solo íconos). |
| `#levantamiento` | Abre la subpágina en la misma SPA. La vista también se recuerda en `localStorage['fenixmex-vista']`. |
| Enlaces `#s-*` e `irA()` | Siempre regresan a la vista Expediente. |
| Levantamiento | Barra fija: Nuevo levantamiento · Abrir (.json) · Guardar borrador · Exportar JSON · Exportar PDF. |
| Croquis | Plantilla **H / V** distinta; Ø interior en **cm**, longitud total (extremo a extremo) en **mm**. Tapas dibujadas semielípticas 2:1, solo referencia visual. |
| Boquillas | Agregar / quitar / subir / bajar; letra automática A, B, C… por orden (se re-letra). Tipos cerrados: ENTRADA DE AIRE, VALVULA DE SEGURIDAD, MANOMETRO, SALIDA DE AIRE, PURGA, TERMOSTATO. Ø en **pulgadas** (acepta `3/4`, `1 1/2`). Cara: frente (círculo sólido), atrás (punteado), lado/arriba/abajo (tapita sobre el contorno). Arrastre con mouse/dedo y flechas del teclado; se reescalan con el tanque; las etiquetas se acomodan solas con líneas guía para no encimarse. |
| Datos | Cliente, planta, tanque, TAG, modelo, serie, marca, fechas, presiones en **kg/cm²**, capacidad en **m³** (con `L` o `gal` se convierte). |
| Espesores | 3 columnas × puntos 1–15; encabezados cambian con la orientación (izq/der ↔ sup/inf). |
| Expediente | **Nuevo expediente** sin cambios. Nuevo botón **Importar levantamiento (.json)** en la barra del borrador y en Equipos (acepta varios archivos a la vez). |

Borrador del levantamiento: solo IndexedDB (`fenixmex-nom020`, llave `lev`), sin Firebase. "Nuevo levantamiento" conserva cliente, planta y fecha de inspección.

PDF del levantamiento: carta, pdf-lib vectorial con Liberation Sans de `FX_ASSETS`, logo, croquis, tabla de boquillas (LETRA / TIPO / Ø pulg / CARA; si no cabe pasa a hoja 2), datos de placa y espesores. Archivos: `LEV <TAG o tanque> <CLIENTE>.pdf` / `.json`.

## Esquema JSON `fenix-levantamiento` · `version: 1`

```
schema, version, exportedAt (ISO con zona), orientacion "H"|"V",
dimensiones { diametroInteriorCm, longitudMm },
metadata { cliente, planta, tanque, tag, modelo, serie, marca, fechaFabricacion,
           fechaInspeccion (yyyy-mm-dd), presionCalibracion, presionArranque,
           presionParo, presionDiseno, capacidad },
boquillas [ { letra, tipo, diametroPulgadas, cara, pos { u, v } } ],
espesores { tapaIzqOSup[15], cuerpo[15], tapaDerOInf[15] }  (texto, mm),
croquis { plantilla, note }
```

`pos`: `u` 0→1 = izquierda→derecha, `v` 0→1 = abajo→arriba, relativo al contorno del tanque en la plantilla indicada. Tapita se ajusta al contorno; frente/atrás quedan dentro. Al importar se valida orientación, tipos, caras y 15 espesores; un borrador de expediente se rechaza con aviso (y viceversa).

## Mapeo al importar en el expediente

| Levantamiento | Equipo / expediente |
|---|---|
| `cliente` | `razonSocialPropietario` y `razonSocialUsuario` **solo si están vacías**; si ya hay otra, se conserva y se avisa. |
| `planta` | `ubicacion` |
| `tanque` | `nombre` |
| `modelo`, `marca`, `tag` | iguales |
| `serie` | `numeroSerie` |
| `fechaFabricacion` | `anioFabricacion` (solo el año) |
| `fechaInspeccion` | `fechaPnd` (ISO) |
| `presionCalibracion`, `presionArranque`, `presionDiseno` | iguales |
| `presionParo` | `presionOperacion` |
| `capacidad` | `capacidadVolumetrica` (m³, 3 decimales) |
| `tapaIzqOSup` / `cuerpo` / `tapaDerOInf` punto *n* | `espSup` / `espEnv` / `espInf` punto *n* (índice *n*−1) |
| dimensiones, boquillas, copia del JSON | `equipo.levantamiento` (+ `diametroInteriorCm`, `longitudMm`); no se imprimen en hojas NOM-020 |

- **Desviación consciente del spec** (`[0..14] → [1..15]`): el punto *n* del papel cae en el punto *n* de la PND, igual que la pantalla PND y la hoja 74 (que imprime el índice 0 como punto 1). El **punto 16 queda vacío** y el aviso existente pide capturarlo.
- Solo los valores no vacíos sobrescriben; todo va en mayúsculas como el resto del expediente.
- Cada importación **agrega un equipo** (nombre/TAG por defecto `COMPRESOR DE AIRE NO.n` / `COM-0n` si el levantamiento no trae). Excepción: si el expediente solo tiene el equipo en blanco de "Nuevo expediente" (sin cambios ni fotos), se reutiliza ese en vez de dejar uno vacío.
- Después: `migrar()` normal; prueba hidrostática = diseño × 1.1; materiales `SA-414-G`. Fluido, temperaturas, válvula, presión máx. permitida, Ø de válvula y código de memoria quedan para capturar (los marca la validación).

## Cambios en `index.html` (quirúrgicos)

CSS añadido al final del `<style>`; selector de vista en `.top`; `id="vistaExp"` en `.shell`; sección `#vistaLev`; dos botones de importar; módulo puro `window.FXLev` (script propio antes de la app); controlador dentro del IIFE antes del arranque; `toast(m, ms)` con duración opcional; `irA()` cambia a Expediente; `importar()` reconoce un levantamiento y avisa; arranque llama `initVistas()` / `initLev()`.

## Sin cambios

Motor PDF y hojas 6/23/66/94/96/106, `FX_ASSETS`, `migrar()`, Firebase (solo globales), formato del borrador y su Exportar/Importar, tema `fenixmex-theme`, nombres de archivo del expediente, máscara de memoria, RFC.

## Pruebas

- Chromium (Playwright): llenado, arrastre, H/V, exportar JSON y PDF, recarga (persisten vista y datos), abrir JSON en Levantamiento → reexportar idéntico, Nuevo expediente + importar (reutiliza equipo en blanco) + segunda importación (agrega equipo 2), espesores en PND, rechazo cruzado borrador ↔ levantamiento, borrador con levantamiento exportado/importado, 1280 px y 390 px. Sin errores de página.
- Regresión: "Cargar ejemplo" + ZIP con aleatorios fijados → v6 y este parche dan el **mismo PDF** (109 hojas, texto y raster idénticos página por página). Con un levantamiento importado: 137 hojas sin errores.
