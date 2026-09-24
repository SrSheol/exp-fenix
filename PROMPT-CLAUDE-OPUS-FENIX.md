# PROMPT — FenixMex Expediente NOM-020-STPS-2011 Web App
# Paste this entire document into Claude Opus 5.5 (high effort). Attach every file listed in §3.

---

## 1. Role & mission

You are a senior full-stack engineer and PDF layout specialist. Build a **single production-quality web application** that replaces FenixMex’s multi-Excel workflow for NOM-020-STPS-2011 expedientes.

**Mission:** Capture expediente data in a beautiful, bug-free UI → generate:

1. **Main expediente PDF** — US Letter, visually **identical** to the attached full example (~109 pages for 1 Cat III equipo). Filename: `EXP_<razonsocial>.pdf` (sanitize).
2. **If any equipo is Categoría II:** for **each** Cat II equipo, also generate:
   - `previo_<TAG>_<razonsocial>.pdf` (A4, 1 page) — visual twin of `previo-ejemplo.pdf`
   - `dictamen_<TAG>_<razonsocial>.pdf` (A4, 1 page) — visual twin of `dictamen-ejemplo.pdf`

**Language split (non-negotiable):**

- This prompt is in English.
- **All UI labels, helper text, buttons, validation messages, and ALL PDF printable text** must be in **Mexican Spanish**, matching the wording, capitalization, accents, and fixed boilerplate of the example PDFs/Excels. Do **not** invent English labels on the PDFs.
- Code comments may be English.

**Freedom:** Choose any modern stack (React/Next/Vite/vanilla, IndexedDB/localStorage, pdf-lib / @react-pdf/renderer / Puppeteer print / pdfmake / etc.) as long as output PDFs are **vector/text preferred**, sharp, correctly paginated, and **pixel-aligned** to the examples. No blurry screenshot-only PDFs unless you prove bit-for-bit visual parity at high DPI.

---

## 2. Non-negotiable fidelity rules

1. The attached **example expediente PDF** is the **single source of truth for layout**. The mutation map below says **WHAT data changes**. **Never invent new layouts, new tables, new sections, or new page types.**
2. **Zero format drift:** fonts (or closest embedded equivalents), table borders, column widths, row heights, margins, logo placement, gray/blue month “franjas”, signature boxes, line weights, header/footer blocks — match the example.
3. **Perfect resolution:** crisp vector text; logos and signatures never stretched; preserve aspect ratio; no compression blur.
4. **Page size:**
   - Expediente: **Letter** (612 × 792 pt). Note: the example MediaBox is slightly offset (`-8.39 8.39 603.61 800.39`); match the **visual** Letter page content and margins measured from the PDF, not invent a different trim.
   - Cat II previo/dictamen: **A4** (≈595.32 × 841.92 pt).
5. Everything that is **fixed boilerplate** in the example stays **byte-identical in wording** (Spanish). Only the fields listed as mutable change.
6. `Número de control asignado por la Secretaría` / Control STPS on **ficha técnica and related fields = ALWAYS EMPTY** (blank). Do **not** print `EN TRAMITE` / `EN TRAMITRE` for that field. For Cat II previo/dictamen Control STPS use `S/D` or empty/`N/A` exactly as in the Cat II examples.
7. Only **Fecha PND** is captured for dates (no recepción / informe / memoria dates in the UI). Derive all date displays from Fecha PND (and year for programas).
8. `No. reporte de prueba` = same value as `Código memoria de cálculo` (user enters one; both fields get it).

---

## 3. Inputs Juan will attach (use them)

Attach and study **all** of these before coding:

| Role | Filename / path tip |
|------|---------------------|
| Full Cat III expediente example (Letter, 109 pp) | `8ab3f4cb6932ef8b798116f0b3a64b82f72c6557c0eadeb0df37998cd2f999b9.pdf` (also text dump `full.txt` if provided) |
| Excel 1 — capture (DATOS GENERALES + LISTA GENERAL) | `29441b48511d0896aad794b24f832dae98b7523027f028b5c47e2b79eca84983.xlsx` |
| Excel 2 — informe / sheet templates | `42688bc015650e538ffadda5565160dbf37ebd18e541f4730f85b9f41ccde302.xlsx` |
| Excel 2 sample PDF (2 pp) | `72d3a8474428489da00a482091339a212304b190ae44cd383e23b491b34bfe94.pdf` |
| Excel 3 — ficha técnica H1/H2/H3 | `fd134a6e4ed130cc86a804921005126812c8d881baa1a6c57b732bece56b763b.xlsx` |
| Excel 4 — PND block | `2ef4a557b306a058c7a255b89e4d9ff40b91c1f7aa90fde6cc8ade79d9cebf9c.xlsx` + PNG screenshots in same attachments folder |
| Logo FenixMex | `logo-fenixmex.jpg` |
| Cat II previo example | `previo-ejemplo.pdf` (+ `.txt` if provided) |
| Cat II dictamen example | `dictamen-ejemplo.pdf` (+ `.txt` if provided) |

**Fonts observed in the example expediente (embed closest licensed/available equivalents):** Arial Rounded MT Bold, Arial Nova / Arial Nova Italic, Arial / Arial Bold, Times New Roman Italic, Minion Pro Italic, Symbol. Prefer embedding; measure sizes from the PDF.

**Creator lineage:** PDFs were produced via Acrobat PDFMaker from Excel — recreate the **printed look**, not Excel interactivity.

---

## 4. Data model

### 4.1 Global assets (upload once; persist in `localStorage` and/or IndexedDB)

| Key | Type | Usage |
|-----|------|--------|
| `logoFenix` | image (JPG/PNG) | Headers/carátulas where logo appears |
| `firmaPnd1` | PNG | PND carátula sheets (block sheets 1 and 4) — left/“ELABORÓ” style signature (Firma 1 PND) |
| `firmaPnd2` | PNG | Same carátulas — “REVISÓ Y APROBÓ” (Firma 2 PND) |
| `firmanteIzquierdoNombre` | string | e.g. `JOSE MARTINEZ ARGUETA` |
| `firmanteIzquierdoFirma` | PNG | Dictamen Cat II **left** signature; also bitácora hoja **108** firma. On **PREVIO**, left **name shows `XXX`** (not the real name); leave signature blank or as in previo ejemplo |

### 4.2 Per expediente

| Field | Notes |
|-------|--------|
| `razonSocialPropietario` | |
| `razonSocialUsuario` | Typing into propietario **auto-copies** to usuario on first fill; both remain independently editable afterward |
| `rfcEmpresa` | Used on hoja 96 (DC-3) |
| `domicilio` | **Shown only when any equipo is Cat II** — “Ubicado en” for previo/dictamen |
| `representanteLegalNombre` | |
| `representanteLegalFirma` | PNG |
| `testigo1Nombre` | = “POSADAS…” role in example (Revisó/Aprobó / CURP bearer) |
| `testigo1Firma` | PNG |
| `testigo1Curp` | Hoja 96 |
| `testigo2Nombre` | = “ROBERTO GARCIA GARCIA” role (Elaboró / ejecutor / representante trabajadores) |
| `testigo2Firma` | PNG |
| `foliosCatII` | Map `equipoId → folio string` — **only for Cat II**; goes into that equipo’s **dictamen**. Previo always prints `FOLIO xxx` |

### 4.3 Equipo (LISTA GENERAL — add/remove many)

Editable fields with **defaults** (from Excel 1 style; all editable):

| Field | Default / rule |
|-------|----------------|
| `nombre` | `COMPRESOR DE AIRE NO.1` |
| `numeroSerie` | (user) |
| `tag` | `COM-01` |
| `clasificacion` | Auto from **presión de calibración** (kg/cm²): **I** if `< 5`; **II** if `5–8` inclusive; **III** if `> 8`. Display as Roman numerals. User may override only if you still recompute suggestion on pressure change |
| `fluido` | e.g. `AIRE` |
| `capacidadVolumetrica` | Numeric; display as `0.XXX` style (e.g. `0.500`, `0.024`) + `m³` where template shows units |
| `presionOperacion` | kg/cm² |
| `presionCalibracion` | kg/cm² — drives categoría |
| `presionDiseno` | kg/cm² |
| `presionTrabajoMaxPermitida` | kg/cm² (MAWP) |
| `presionPruebaHidrostatica` | kg/cm² |
| `tempDiseno` | default `55` |
| `tempOperacion` | default `28` |
| `tipoDispositivoRelevo` | default Excel style e.g. `VALVULA DE SEGURIDAD` (+ subtype/dims if template needs, e.g. `ARGOLLA`, Ø) — keep Excel defaults editable |
| `numDispositivosRelevo` | default `1` |
| `ubicacion` | default `CUARTO DE MÁQUINAS` |
| `diametroInteriorMm` | |
| `marca` | |
| `modelo` | default often `S/D` |
| `anioFabricacion` | |
| `materialCuerpo` | default Excel e.g. `SAE-J403-1008` editable |
| `materialTapa` | same family default editable |
| `tipoTapas` | default `SEMIELIPSOIDAL` editable |
| `pndSuperficial` | default `PARTÍCULAS MAGNÉTICAS (MT)` editable |
| `pndVolumetrica` | default `ULTRASONIDO INDUSTRIAL (UT)` editable |
| `fechaPnd` | **only** date field for the equipo (drive all derived dates) |
| `codigoMemoriaCalculo` | e.g. `RSP-020-034-2026` |
| `noReportePrueba` | **always equal** to `codigoMemoriaCalculo` |
| Fixed template constants (not in UI or locked): | `codigoNormaFabricacion` = `ASME SECCIÓN VIII, DIVISIÓN 1`; `certificadoFabricacion` = `SIN DATO`; `nationalBoard` = `SIN DATO`; `capacidadTermica` = `N/A`; dictamen servicio text as in templates where not overridden by empty control STPS rule |

**Espesores PND (per equipo):** three columns × points **1–16** (manual entry on the page → PDF):

- `envolvente[1..16]`
- `tapaSuperiorIzquierda[1..16]`
- `tapaInferiorDerecha[1..16]`

Jacket / espejo / hogar columns stay **0.00** as in template. Compute min for carátula ME from the three filled columns (points 1–16).

**Folio Cat II:** per Cat II equipo string for dictamen only.

### 4.4 Derived date formats (Spanish Mexico)

From `fechaPnd = D/M/Y` (example used `17/07/2026`):

| Context | Format example |
|---------|----------------|
| PND headers | `17/07/2026` |
| Cronológicos / anexos | `julio/2026` or `julio-26` as in each sheet |
| Bitácoras | `17 DE JULIO DE 2026` |
| Programas year | `2026`, `Fecha de emisión: ENERO-2026` / `Año 2026` |
| Cat II emisión | `Ciudad de México {día} de {mes} de {año}` (months lowercase in sentence as in examples: `de junio de`, `de Septiembre de` — **match the Cat II example capitalization**) |
| Cat II exámenes date | same long Spanish date as emisión (from PND) |
| Hoja 108 weekday alignment | Shift the 4 text columns + firma (except the `DÍA` column) so content sits on the weekday row of `fechaPnd` |

---

## 5. UI sections (Spanish labels)

Single-page app (or multi-step wizard on one route) with excellent UX:

1. **Activos globales** — upload logo, Firma1 PND, Firma2 PND, firmante izquierdo nombre+firma; persist; clear/replace.
2. **Datos generales** — razón social propietario/usuario (auto-copy), RFC, representante legal nombre+firma, Testigo 1 (nombre, firma, CURP), Testigo 2 (nombre, firma), domicilio (conditional Cat II), folios Cat II per equipo (conditional).
3. **Lista de equipos** — add/remove/reorder cards or table; all fields in §4.3; live categoría badge; espesores 1–16 grid; validation.
4. **Vista previa / generación** — preview page count estimate; **Download all PDFs** (zip or sequential); regenerate; persist current expediente draft.

Show Cat II–only fields when `equipos.some(e => e.clasificacion === 'II')`.

---

## 6. Full page mutation map (1–109) + expansion algorithm

### 6.1 What the 109-page example is

One **Categoría III** equipo (`COMPRESOR DE AIRE NO.1`, TAG `COM-01`, N/S `1628`, razón social `SERVICIO LOMAS ESTRELLA, S.A. DE C.V`, Fecha PND `17/07/2026`, código `RSP-020-034-2026`). Structure = **shared template pages** + **per-equipo repeats**.

Rough labels from text extraction:

| Page | Rough content |
|------|----------------|
| 1–2 | Carátulas NOM-020 + razón social |
| 3 | Relación de equipos (C) |
| 4 | Texto de referencia / norma |
| 5 | Portada listado y clasificación |
| 6 | Listado E — table of equipos |
| 7 | Portada EXPEDIENTE |
| 8 | Portada expediente del equipo |
| 9 | Datos del equipo (+ slot foto placa) |
| 10 | Ficha técnica |
| 11–13 | 9.3 i/j/k operación, riesgos, elementos seguridad |
| 14–18 | Resúmenes cronológicos (revisiones, mtto, pruebas, modificaciones, reparaciones) |
| 19–22 | Plano/memoria/croquis / dictamen evaluación / programa revisión |
| 23 | Programa calibración instrumentos (razón social; Elaboró=T2; Revisó=T1) |
| 24–34 | Procedimientos operación (25 razón social; …) |
| 35 | Portada manual de revisión + razón social |
| 36–43 | Manual content; 42 = nombre Testigo 2 |
| 44 | Verificación de operación (**per equipo**; franjas grises) |
| 45 | Anexo No. 3 portada |
| 46 | Condiciones de seguridad (**per equipo**) |
| 47 | Anexo No. 4 |
| 48 | Comprobación ejecución pruebas (**per equipo**) |
| 49–61 | Manual mantenimiento / anexos |
| 62 | Registro de incidencias (**per equipo**; 3 firmas: 1ª=T2, 2ª=T1, 3ª=T1) |
| 63 | Anexo |
| 64 | Mantenimiento y revisión seguridad (**per equipo**; T1 nombre+firma) |
| 65 | Portada informes calibración |
| 66 | Certificado válvulas (**ONLY Cat III equipos**) |
| 67 | Portada programa específico |
| 68 | Programa específico revisión y mtto (**per equipo**; franjas azules) |
| 69 | Portada PND |
| 70–75 | Six PND sheets (**per equipo**) |
| 76–89 | SATEND / plan emergencias fixed blocks |
| 90–91 | Razón social pages |
| 92–95 | Anexos directorio / capacitación |
| 96 | DC-3 (T1+CURP; empresa+RFC; patrón=rep legal; rep trabajadores=T2) |
| 97–101 | DC-3 reverse / registros portadas |
| 102 | Bitácora operación (**per equipo**; kg/cm²=P operación; firma operador=T2 only first table) |
| 103–105 | Fixed result portadas |
| 106 | Bitácora revisión/mtto (**per equipo**; responsable T2 both tables) |
| 107 | Resultados mantenimiento text (**per equipo** — only equipment name changes) |
| 108 | Bitácora END (**per equipo**; weekday shift; firma=firmante izquierdo global) |
| 109 | Avisos STPS portada |

### 6.2 Mutation rules (data that changes)

Apply these roles consistently:

- **Razón social** → `razonSocialUsuario` (or propietario if template says propietario — match each sheet’s label; example uses the company name prominently as usuario/cliente).
- **Testigo 2** → Elaboró / responsable programa / ejecutor / firma operador / representante trabajadores as mapped below.
- **Testigo 1** → Revisó y aprobó / quien realizó / CURP / second+third firmas on 62 / hoja 64.
- **Firmante izquierdo global** → hoja 108 + dictamen Cat II left.
- **Fecha** → always from that equipo’s `fechaPnd` (for shared pages with one date, use a defined rule: if multiple equipos, use the **latest** Fecha PND for empresa-level pages, unless the page is inside a per-equipo block).

**Specific sheets:**

- **3 Relación:** list `i .- {nombre}` + `N/S: {ns} / TAG: {tag}` for each equipo; grow list with N.
- **6 Listado E:** title includes razón social; one table row per equipo from Excel-2 “E” columns (nombre, N/S+TAG, clasificación, fluido, P op, P cal, P diseño, temp op, tipo relevo, # dispositivos, cap vol, cap térmica N/A, ubicación, dictamen/servicio fixed template text, control STPS **empty**).
- **8–10 Ficha (Excel 3):** H1 portada equipo; H2 datos + **blank slot** for placa photo (`SIN FOTO` / empty); H3 ficha técnica pressures/temps/cap/relevo. Control Secretaría **empty**.
- **14–18:** fecha displays from Fecha PND; equipo identity; **nombre+firma Testigo 2**.
- **23:** razón social; **Elaboró = Testigo 2** name+firma; **Revisó y aprobó = Testigo 1** name+firma; rows for equipos/instruments grow with N (single sheet family, not N full copies unless example overflows).
- **44 Verificación operación:** nombre equipo + razón social; Elaboró=T2+firma; Aprobó=T1+firma; quien realizó=T1; **franjas grises** fill months **up to and including month of Fecha PND**; **first 2 franjas consecutive/seguidas**; **3rd activity bimestral** pattern as in example (match gray cell fill exactly).
- **46:** nombre + fecha PND + nombre/firma T2.
- **48:** nombre + categoría + nombre/firma T2.
- **62:** fecha PND + nombre equipo; **exactly 3 signature slots**: 1st T2, 2nd T1, 3rd T1.
- **64:** nombre + fecha + nombre/firma T1.
- **66:** **emit only for Categoría III** equipos (if mixed categories, skip Cat I/II). Certificate layout fixed from example; wire equipo/razón/calibración where those fields appear.
- **68:** responsable=T2; nombre equipo + razón social; Elaboró=T2; Aprobó=T1; quien realizó=T1; **7 franjas azules**: 1st, 3rd, 4th, 5th, 6th extend to PND month; **2nd is bimestral** to PND month — match example shading.
- **70–75:** see §7.
- **96 DC-3:** T1 name top + CURP below; empresa razón social + RFC; patrón/rep legal = representante legal nombre+firma; rep trabajadores = T2 nombre+firma. Other DC-3 boilerplate fixed (curso, agente, etc.) as in example unless you expose optional overrides — default **keep example fixed text** except the mapped fields.
- **102:** per equipo — nombre, fecha PND, kg/cm² = presión operación, firma operador = **T2 only on first table**.
- **106:** per equipo — nombre + fecha PND; responsable = T2 name+firma on **both** tables.
- **107:** per equipo — only equipment name changes; rest fixed.
- **108:** per equipo — nombre + fecha PND; texts of 4 columns + firma (**except** día column) **shift to align with weekday of Fecha PND**; firma = firmante izquierdo global.

### 6.3 Expansion algorithm (N equipos)

Treat the single-equipo example as template indices `T1…T109`. Build output page list:

```
out = []

# Block A — front matter (once)
append T1, T2
append T3   # grow internal list for N equipos (extra page(s) only if overflow)
append T4, T5
append T6   # grow table for N (overflow pages if needed, cloning header)
append T7

# Block B — ficha + cronológicos PER EQUIPO (template T8…T18)
for each equipo e in order:
  append mutate(T8…T18, e)

# Block C — shared mid section
append T19…T22
append mutate(T23, all equipos)  # one program sheet family
append T24
append mutate(T25, razón social)
append T26…T34
append mutate(T35, razón social)
append T36…T41
append mutate(T42, testigo2 nombre)
append T43

# Block D — anexos verificación PER EQUIPO interleaved with fixed annex covers
for each equipo e:
  append mutate(T44, e)
append T45
for each equipo e:
  append mutate(T46, e)
append T47
for each equipo e:
  append mutate(T48, e)

# Block E — mantenimiento manuals (once)
append T49…T61

# Block F — incidencias / mtto seguridad PER EQUIPO
for each equipo e:
  append mutate(T62, e)
append T63
for each equipo e:
  append mutate(T64, e)
append T65

# Block G — Cat III certificate
for each equipo e where clasificacion == III:
  append mutate(T66, e)
append T67

# Block H — programa específico PER EQUIPO
for each equipo e:
  append mutate(T68, e)
append T69

# Block I — PND 6 sheets PER EQUIPO
for each equipo e:
  append mutate(T70…T75, e)   # see §7 order

# Block J — emergencies / training fixed
append T76…T89
append mutate(T90, razón social)
append mutate(T91, razón social)
append T92…T95
append mutate(T96, expediente fields)
append T97…T101

# Block K — bitácoras
for each equipo e:
  append mutate(T102, e)
append T103…T105
for each equipo e:
  append mutate(T106, e)
for each equipo e:
  append mutate(T107, e)
for each equipo e:
  append mutate(T108, e)
append T109
```

**ASSUMPTION (document in code comments):** Page **68** repeats **per equipo** because it contains `NOMBRE DEL EQUIPO`. Page **66** repeats **once per Cat III equipo**. Page **106** repeats **per equipo** (contains `Equipo:`). Interleaving of 44/46/48 with single annex covers 45/47 matches “duplicate per equipo” while keeping annex dividers once—as in a multi-equipo expansion of this template family. If a future multi-equipo official PDF differs, prefer matching that PDF; until then use this algorithm.

**Page count formula (approx):**

`109 + (N-1)* (11 + 1+1+1 + 1+1 + [1 if III] + 1 + 6 + 1+1+1+1 )` adjusted for Cat III-only 66 and omitting 66 for non-III — i.e. per extra equipo add pages corresponding to repeats of `{8–18, 44, 46, 48, 62, 64, 66?, 68, 70–75, 102, 106, 107, 108}`.

---

## 7. PND block (6 sheets per equipo, order fixed)

Match Excel 4 sheets / example pages 70–75:

| # | Sheet | Behavior |
|---|-------|----------|
| 1 | **CARATULA PM** | Partículas magnéticas carátula. Cliente=razón social; reporte MT=`codigoMemoria`; fecha=Fecha PND; equipo fields; **firmas globales Firma1 + Firma2 PND** (ELABORÓ / REVISÓ Y APROBÓ). Fixed equipment/procedure boilerplate from template (yugo Parker DA-400, etc.) unless Excel shows it as data-bound — keep identical to example. |
| 2 | **RESULTADOS PM** | Empty results area — **no drawing / no indications**. Headers only. |
| 3 | **FOTOGRAFIAS PM** | 4 boxes labeled MUESTRA 1–4 with **SIN DATO** (no photos). |
| 4 | **CARATULA ME (2)** | Ultrasonido carátula; same firmas globales; espesores mínimos = mins of UI columns. |
| 5 | **ESPESORES ME/PM** | Table points **1–16** from UI for Envolvente, Tapa superior/izquierda, Tapa inferior/derecha; other columns 0.00; show Esp. Mínimo. |
| 6 | **CROQUIS PM** | Empty croquis frame — **no croquis drawing**. |

Report numbers / HOJA x DE 3 headers must match example typography.

---

## 8. Cat II previo & dictamen (A4, 1 page each)

Generate **only** for equipos with `clasificacion === 'II'`.

### 8.1 Visual fidelity

Clone `previo-ejemplo.pdf` and `dictamen-ejemplo.pdf` exactly: logo, franjas, field positions, signature boxes, FOLIO top-right, fixed legal paragraphs (vigencia **5 años**, equipo **USADO**, categoría **II**, métodos **PARTICULAS MAGNETICAS** + **ULTRASONIDO INDUSTRIAL**, resultados **SATISFACTORIO**, cumplimiento NOM-020 text).

### 8.2 Previo (`PRE DICTAMEN`)

- Title **PRE DICTAMEN**; **FOLIO: xxx** always (literal `xxx`).
- Left name: **`XXX`** (not firmante real); right: representante legal nombre+firma.
- Fecha emisión: from Fecha PND → `Ciudad de México {día} de {mes} de {año}` **or** placeholder style if ejemplo previo uses `XXX…` for date — **for production app use the real Ciudad de México date** (dictamen style) unless Juan’s previo must show placeholders; **default: real date like dictamen**.
- Fields: razón social, ubicado en (`domicilio`), nombre equipo, TAG, control STPS `S/D` or empty/N/A as example, N/S, fluido, año fab (`S/D` if empty), pressures, temps, cap vol, num dispositivo, tipo relevo, ubicación, PND methods + SATISFACTORIO, fecha exámenes = Fecha PND long form, vigencia block **fixed**.

### 8.3 Dictamen

- **FOLIO** from UI folio for that equipo.
- Left = firmante izquierdo global nombre+firma; right = representante legal.
- Same field mapping as previo; fecha emisión real from PND.

---

## 9. Naming downloads

Sanitize razón social: uppercase optional; replace `/\\?%*:|"<>` and whitespace runs with `_`; strip accents optional but keep readable.

- `EXP_<razonsocial>.pdf`
- `previo_<TAG>_<razonsocial>.pdf`
- `dictamen_<TAG>_<razonsocial>.pdf`

Provide **Download all** (ZIP recommended).

---

## 10. Acceptance criteria / QA checklist

Before delivery, you MUST:

1. Generate against sample data matching the Lomas Estrella example and **diff visually page-by-page** (at least pages 1–3, 6, 8–10, 14, 23, 44, 46, 48, 62, 64, 66, 68, 70–75, 96, 102, 106–109) against the attached PDF.
2. Confirm Letter vs A4 page boxes.
3. Confirm no stretched logo/signatures.
4. Confirm Cat II PDFs overlay-align with ejemplos (print both to PNG at 150–300 DPI and compare).
5. Confirm categoría auto rule and Cat II file generation gating.
6. Confirm control STPS empty on ficha; previo FOLIO xxx; previo left name XXX.
7. Confirm multi-equipo expansion: 2 equipos → expected extra pages present and ordered per §6.3.
8. Confirm persistence of globals after refresh.
9. Confirm filenames sanitized.
10. Zero console errors; mobile-friendly enough for tablets; accessible forms.

---

## 10b. Hosting, GitHub Pages & Firebase (REQUIRED — replaces browser-only storage)

**Repository:** Deploy this app to GitHub repo `https://github.com/SrSheol/exp-fenix` and enable **GitHub Pages** (prefer `vite`/`next` static export → Actions deploy to `gh-pages` or `docs/`, or Pages from `main` `/dist`). Site must work at `https://srsheol.github.io/exp-fenix/` (base path `/exp-fenix/` if project Pages).

**Firebase project (EXISTING — reuse, do not create a new project):** `quiniela-3c8fa`

```js
const firebaseConfig = {
  apiKey: 'AIzaSyAtZpRO-Gy59prAeKjpaAs_p-qqxuM9jMo',
  authDomain: 'quiniela-3c8fa.firebaseapp.com',
  projectId: 'quiniela-3c8fa',
  storageBucket: 'quiniela-3c8fa.firebasestorage.app',
  messagingSenderId: '321094792504',
  appId: '1:321094792504:web:532ba43015d1557a7cfdcd',
};
```

**HARD ISOLATION (non-negotiable):** This app shares the Firebase project with other Juan apps (quiniela, forge-console, sangaku). You MUST:

1. Use **only** Firestore paths under collection **`expFenix`** (e.g. `expFenix/globals`, `expFenix/expedientes/{id}`).
2. Use **only** Storage object paths under prefix **`exp-fenix/`** (e.g. `exp-fenix/globals/firmaPnd1.png`, `exp-fenix/expedientes/{id}/testigo1.png`).
3. **Never** read, write, list, delete, or query any other collection, document, or storage path (no `pendientes`, no quiniela collections, no `forge-console*`, etc.).
4. Document the schema in README. Add a code comment at the Firebase module: “ONLY expFenix / exp-fenix — do not touch other apps.”

**What to persist in Firebase (cross-computer):**

| Scope | Data | Suggested path |
|-------|------|----------------|
| Global | logo (optional), Firma 1/2 PND PNGs, firmante izquierdo nombre+PNG | `expFenix/globals` + Storage `exp-fenix/globals/*` |
| Per expediente | razón social, RFC, domicilio, testigos, representante legal, equipos[], folios Cat II, espesores, etc. | `expFenix/expedientes/{id}` + Storage `exp-fenix/expedientes/{id}/*` |

IndexedDB may be used only as **cache**; source of truth is Firebase so the same globals and expedientes appear on every PC.

**Auth:** Prefer Firebase Auth (email/Google already used on this project if available) so writes are restricted. If Auth UX is heavy for v1, still keep all data under `expFenix` / `exp-fenix/` and document required Security Rules Juan must add (allow only authenticated users on those paths; deny everything else from this app). Never open world-writable rules on the whole database.

**Do not** store PDFs in Firebase by default (generate client-side and download). Optional later.

---

## 11. Implementation guidance

1. **Measure** the example PDF: page size, margins, table column x-positions (use pdf.js / pdfminer / screenshot+ruler). Do not guess.
2. **Extract** embedded fonts if licensing allows; else use metric-compatible Arial / Arial Rounded / Times Italic.
3. Prefer **template approach**: rebuild each page as a declarative layout (react-pdf or canvas/pdf-lib) with absolute coordinates copied from the example.
4. Optional advanced path: use the Excel workbooks as structural references for field binding (Excel 2 sheets `C`, `E`, `H1/H2/H3`, Excel 3 ficha, Excel 4 PND) — but **PDF visual** wins over Excel on-screen chrome.
5. For franjas on 44/68: implement month-indexed cell shading logic; unit-test with PND in January vs July vs December.
6. For hoja 108: map `getDay()` → row LUNES…DOMINGO (locale Monday-first as in the bitácora table).
7. Persist images/signatures in **Firebase Storage** under `exp-fenix/` (see §10b); optional IndexedDB cache only. Cap size; refuse huge uploads with Spanish error.
8. Ship a **README** in the project with how to run, and a **fixture** that reproduces the example.

### ASSUMPTIONS locked for this build (explicit)

1. **68** and **106** are per-equipo.
2. **66** only for Cat III, one sheet per such equipo.
3. Annex covers **45** and **47** appear once; **44/46/48** repeat per equipo around them.
4. Empresa-level dates on non-per-equipo pages use the **maximum** Fecha PND among equipos.
5. Ficha control STPS always blank (override Excel `EN TRAMITE`).
6. Capacidad volumétrica displayed with three decimals when templates show three (`0.500`).
7. Previo fecha de emisión uses real `Ciudad de México…` date (not the `XXX` placeholder from the blank ejemplo), while FOLIO stays `xxx` and left name stays `XXX`.
8. Photo/placa and croquis/results drawings remain empty placeholders (`SIN FOTO` / `SIN DATO` / empty), not user uploads — unless you add optional uploads without breaking layout; default empty.

---

## 12. Deliverable

Working app source + scripts to install/run + sample generated PDFs for 1× Cat III and 1× Cat II proving fidelity. Optimize UX: add/remove equipos, live categoría, preview, download all, globals persisted in Firebase (`expFenix`) so they sync across PCs. **No bugs. No format drift.**


---

## 13. Deep reference notes (from analyzed artifacts)

Use these as binding defaults when the example PDF and Excels agree; when they conflict, **PDF wins for layout**, **locked product rules win for mutable fields**.

### 13.1 Excel 1 — capture workbook sheets

Sheets include: `DATOS GENERALES`, `LISTA GENERAL`, plus many client sample tabs, `LISTA IMPRIMIR`, `PSV PRECIOS`.

**DATOS GENERALES:** `RAZÓN SOCIAL PROPIETARIO` / `RAZÓN SOCIAL USUARIO` (example row both `GRUPO GASOLINERO COMBUQRO, S.A. DE C.V.`).

**LISTA GENERAL header columns (row 9 family):** No, Proyecto, Nombre del equipo, Número de Serie, TAG, National Board, Clasificación NOM-020, Fluido(s), Capacidad Volumétrica m³, Capacidad Térmica, P operación, P calibración, P diseño, P trabajo máx permitida, P prueba hidrostática, Temp diseño, Temp operación, Tipo dispositivo relevo, Dimensiones dispositivo, Número dispositivos, Ubicación, Número Dictamen/Reporte servicio, Número Control Secretaría, Diámetro interior mm, Marca, Modelo, Código/Norma fabricación, Certificado fabricación, Año fabricación, Material tapa, Material cuerpo, Tipo tapas, PND Superficial/Prueba presión, PND Volumétrica, Fecha PND, Fecha recepción, Fecha informe, Fecha memoria, Código memoria, No. reporte prueba.

**Sample defaults seen in Excel row:** nombre `COMPRESOR DE AIRE NO.1`, TAG `COM-01`, NB `SIN DATO`, clase `III`, fluido `AIRE`, marca `CARROLL`, modelo `S/D`, norma `ASME SECCIÓN VIII, DIVISIÓN 1`, certificado `SIN DATO`, materiales `SAE-J403-1008`, tapas `SEMIELIPSOIDAL`, PND MT/UT strings, ubicación `CUARTO DE MAQUINAS`, dictamen `EN TRAMITRE`, control `EN TRAMITE` → **UI/PDF control STPS must be EMPTY per product rule** (ignore Excel EN TRAMITE for control). Código memoria example `RSP-020-014-2025` (= No. reporte).

### 13.2 Excel 2 — informe sheet map (names)

Notable sheets: `C` (relación), `E` / `E (1)` (listado), `H1`/`H2`/`H3` and Cat variants, `DATOS GENERALES`, `LISTA GENERAL`, many lettered procedure sheets `A`…`V`, `X (n)`. Use these to understand which Excel print areas became which PDF pages; still clone **PDF** geometry.

Sample 2-page PDF title: `EXP. SERVICIO LOMAS ESTRELLA, S.A. DE C.V..pdf` (Letter).

### 13.3 Excel 3 — ficha

`LISTA GENERAL` + repeated `H1-CAT III` / `H2-CAT III` / `H3-CAT III` blocks (multiple equipo slots). PDF pages 8–10 correspond to one H1–H3 triplet per equipo.

### 13.4 Excel 4 — PND

Sheets: `DATOS GENERALES`, `LISTA GENERAL`, `DATOS GRALES`, `CARATULA PM`, `RESULTADOS PM`, `FOTOGRAFIAS PM`, `CARATULA ME (2)`, `ESPESORES PM (2)`, `CROQUIS PM`, plus VT sheets not used in the 6-sheet product block.

Fixed strings seen: procedures `PR-RMC-END-MT-03 REV.0`, `PR-RMC-END-UT-04 REV.0`; norms ASME BPVC Sec V Art 7 / Art 5; yugo `PARKER` `DA-400` sn `17644`; medidor `GE INSPECTION TECHNOLOGIES` `DM5 E DL` sn `DM5EG2103925`; block `4 PASOS` sn `20824`; transducer 5 MHz 0.375"; result texts `ACEPTADA` / `SATISFACTORIA`; observation `EL EQUIPO NO PRESENTO INDICACIONES RELEVANTES…`.

Global firmantes in Excel sample names `JOSE MARTINEZ ARGUETA` / `CARLOS AARON CLORIO HERRERA` — in the **app**, PND carátula firmas come from **uploaded global Firma1/Firma2** (not typed Excel names), while **firmante izquierdo** global name is used on dictamen + hoja 108.

### 13.5 Example expediente identity (for golden test)

- Razón social: `SERVICIO LOMAS ESTRELLA, S.A. DE C.V`
- Equipo: `COMPRESOR DE AIRE NO.1` / N/S `1628` / TAG `COM-01` / Cat `III`
- Listado pressures (page 6): P op `9.00`, P cal `10.50`, P diseño `12.00`, temp op `28.00`, cap vol `0.500`, ubicación `CUARTO ELECTRICO` (note spelling variant vs Excel `CUARTO DE MAQUINAS` — **print whatever the user entered**)
- Ficha (page 10): P trabajo máx `18.65`, P hidro `13.20`, temp diseño `55.00`, relevo `VALVULA DE SEGURIDAD, TIPO ARGOLLA, Ø 6 mm`
- PND: `RSP-020-034-2026`, fecha `17/07/2026`, marca `ALANSA`
- Testigo2/responsable: `ROBERTO GARCIA GARCIA`
- Testigo1: `POSADAS LOPEZ MANUEL EUSEBIO` / CURP pattern on DC-3 / RFC empresa `SLE020225076` style boxes
- Rep legal on DC-3 example: `HERNANDEZ CASTILLO GEORGINA`
- Hoja 108 content lands on **VIERNES** for 17/07/2026 (verify weekday logic)

### 13.6 Cat II field checklist (Spanish labels on PDF)

Mirror examples:

- `Razón Social de la Empresa:`
- `Ubicado en:`
- `Nombre Genérico del Equipo:` + `Tag:`
- `No. de Control S.T.P.S.` → `S/D` with `N/A` as in ejemplo
- `No. de Serie:`
- `Fluido Manejado:` / `Año de Fabricación:`
- `Presiones del Equipo:` block — Máxima de trabajo Permitida, Diseño, Presión de Calibración, Operación (positions as in ejemplo — careful: layout is non-linear)
- `Temperatura de Diseño:` / `Temperatura de Operación:`
- `Capacidad Volumétrica:` / `No. de Dispositivo:`
- `Tipo de Dispositivo de Relevo de Presión:`
- `Área de Ubicación del Equipo:`
- Tests: `PARTICULAS MAGNÉTICAS` / `ULTRASONIDO INDUSTRIAL` → `SATISFACTORIO`
- `Fecha de Los Exámenes no Destructivos:`
- Vigencia paragraph with `5` años, `USADO`, `categoría II`
- Signature line labels: `Nombre y Firma` / `Representante Legal Centro de Trabajo`

Previo title bar: `PRE DICTAMEN` + `DICTAMEN TÉCNICO CATEGORIA II` styling per PDF (match exact).

### 13.7 Franjas logic (implement precisely)

**Page 44 (gris):** Three activity groups. Fill month columns from January through month(Fecha PND). Pattern: first two activities have **consecutive** filled month franjas; third activity uses **bimestral** spacing — copy which months are shaded from the July-2026 example and generalize by month index.

**Page 68 (azul):** Seven activity rows with Rev./Mantto sub-rows. Shade months through PND month where: rows 1,3,4,5,6 continuous to PND month; row 2 bimestral to PND month — match July example then parameterize.

### 13.8 Filename sanitization algorithm

```
s = razonSocial.trim()
s = s.normalize('NFD').replace(/\p{M}/gu, '') // optional ASCII
s = s.replace(/[\/\\?%*:|"<>]/g, '_')
s = s.replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
if empty → 'SIN_NOMBRE'
```

TAG sanitization: same forbidden charset.

### 13.9 Quality bar for PDF engine

- Embed subset fonts; paint vector lines for tables; images as Flate/DCT without resampling blur.
- Rasterize QA at 150 and 300 DPI; overlay difference vs example should be near-zero outside mutable field glyphs.
- Do **not** rely on browser `window.print` alone unless `@page` size and print CSS are proven Letter/A4 accurate.

---

## 14. Suggested build order

1. Scaffold app + IndexedDB schema + Spanish UI shell.
2. Implement data model + categoría + espesores form.
3. Build Cat II A4 pages first (1-page, easier golden compare).
4. Build PND 6-pack for one equipo.
5. Build ficha 8–10 + listado 3/6.
6. Implement franjas pages 44/68.
7. Implement bitácoras 102/106/108 weekday shift.
8. Assemble full concatenation + expansion algorithm.
9. Golden visual QA vs attached PDF.
10. ZIP download + polish UX.

---

## 15. Final instruction

Execute autonomously. Ask no clarifying questions unless a contradiction makes progress impossible — in that case prefer the **ASSUMPTIONS** in §11 and the **example PDF**. Ship a complete, beautiful, production-ready FenixMex expediente generator with **zero format drift**.
