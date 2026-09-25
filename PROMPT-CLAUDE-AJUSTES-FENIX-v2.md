# PROMPT — FenixMex Expediente: Post-QA Fixes + Docs Checklist Excel
# Paste this entire document into Claude Opus (high effort).
# Attach: (1) the current live app source (`index.html` / repo `SrSheol/exp-fenix`), (2) the NEW reference expediente PDF with EMPTY signature areas, (3) the screenshots Juan provided for pages 6, 9 (bad vs good plate photo), and 72 (ANEXO FOTOGRAFICO 2×2).

---

## 0. Role & hard constraints

You are a senior PDF layout + frontend engineer. You are **patching an existing working app**, not rebuilding from scratch.

**Language split:**
- This prompt is in English.
- UI labels and all PDF printable text stay in **Mexican Spanish**.
- Do not invent new page layouts. Match the reference PDFs.

**Non-negotiable:**
1. Prefer **surgical edits** to the current overlay/template pipeline (pdf-lib or whatever the app already uses). Do not rewrite the whole generator unless a change forces it.
2. The user will attach a **new full expediente PDF whose signature areas are empty**. Use that PDF (or extract blank signature regions from it) so generated expedientes **never** show leftover example signatures colliding with newly uploaded signatures.
3. Keep Firebase / IndexedDB multi-user model as already implemented:
   - Globals (logo, PND firmas, firmante izquierdo, etc.) → cloud if present
   - Expediente draft → IndexedDB local only
4. Dark theme toggle stays. New UI controls go **next to** the theme button when specified.
5. After changes, the app must still generate `EXP_<razonsocial>.pdf` (+ Cat II previo/dictamen when applicable).

**Deliverable:** updated single-file or project source ready to drop into `exp-fenix` / GitHub Pages, plus a short CHANGELOG in Spanish listing each page touched.

---

## 1. Attachments Juan will provide

| # | What | Why |
|---|------|-----|
| A | Current app (`index.html` or zip of repo) | Codebase to patch |
| B | Reference expediente PDF with **empty** firmas | Replace/clean signature base so old example ink does not appear |
| C | Screenshot page 6 table (nombre pegado, títulos cortados, EN TRAMITE) | Visual target for listado |
| D | Screenshot page 9 **bad** (placa desfasada) | What is wrong now |
| E | Screenshot page 9 **good** (placa inside box, table padding) | What it must look like |
| F | Screenshot page 72 ANEXO FOTOGRAFICO (4 boxes MUESTRA 1–4) | Where 4 PND photos go |

Measure coordinates from B/C/D/E/F. Do not guess.

---

## 2. PDF page fixes (expediente principal)

Page numbers = **visual** expediente page numbers as in the reference (1-based as Juan uses them).

### 2.1 Page 6 — LISTADO DE EQUIPOS
1. **Nombre del equipo** cell: auto-fit / shrink font and/or wrap with **padding** so text never touches left/right cell borders (names vary in length).
2. Columns **“Número de Dictamen ó Dictamen con Reporte de Servicio”** AND **“Número de Control Asignado por la Secretaría”** must both print **`EN TRAMITE`** (Juan confirmed both).
3. Column headers: **never cut words** mid-word (e.g. “correspondient” / lone “e”). Rewrap headers cleanly; prefer smaller header font or multi-line wrap on word boundaries.

### 2.2 Page 9 — ficha / placa
1. Nameplate photo (**fotografía o calca de la placa de datos**) must sit **fully inside** its black-bordered box, centered, correct aspect ratio — match screenshot E, fix D.
2. Table value cells (esp. nombre genérico): padding so text is not glued to borders.
3. **Número de control Asignado por la Secretaría** on this sheet: print **`EN TRAMITE`** (not blank).

### 2.3 Page 10 — tipo de dispositivo de relevo
- If the equipo name indicates **compresor de aire** (case-insensitive match on “COMPRESOR DE AIRE” / similar):  
  **`VÁLVULA DE SEGURIDAD TIPO ARGOLLA, Ø 6mm`**
- For any other equipo type: keep the value already coming from the equipo data field (do not force the argolla string).

### 2.4 Pages 14–16 — fecha column
- Date column must stay **centered** inside the column.
- Long Spanish month names (e.g. septiembre) must **not** overflow; shrink font and/or wrap as needed while staying readable.

### 2.5 Pages 14–18 — bloque datos del equipo
- Fields: nombre del equipo, serie / identificación o TAG, ubicación (and the same style of cells on these pages).
- Values **centered**, with padding; **must not** overflow the table cells. Auto-shrink / wrap on long strings.

### 2.6 Page 23 — columna ÍTEM (critical logic)
Treat “compresor de aire” detection like §2.3.

**If equipo IS a compresor de aire** (example for equipo número N, e.g. `COMPRESOR DE AIRE NO. 1`):
Fill the ÍTEM column with **three rows** for that equipo:
1. `COMPRESOR DE AIRE NO. N`
2. `MANOMETRO 1 - COMPRESOR DE AIRE NO. N`
3. `VALVULA DE SEGURIDAD 1 - COMPRESOR DE AIRE NO. N`

Rules:
- The **`1` after MANOMETRO and VALVULA is ALWAYS `1`**, even when N > 1. Only the `NO. N` part tracks the equipo number.
- After those three lines, the same column still has **4 free blank slots** on the sheet (as in the current layout capacity).
- If there is **more than one equipo**, continue listing beneath; when slots run out, **duplicate page 23** and continue on the next copy until all equipos’ ítems fit.
- Do **not** invent extra descriptive lines beyond the three above per compressor.

**If equipo is NOT a compresor de aire:**
- Put the equipo display name **once** only (same name as used elsewhere on the ficha / listado). No manómetro/válvula lines.

### 2.7 Page 46 — fecha
- Center date in its cell; long months must not overflow (same approach as 14–16).

### 2.8 Page 64 — fecha
- Center date; long months must not overflow.

### 2.9 Page 66 — certificados (Cat III only)
- Page/block applies **only for Categoría III** equipos (existing rule; keep it).
- **CERTIFICADO No.** format: `XXX-XXXXX` (3 chars, hyphen, 5 chars). Generate **random** values; **never repeat** within the same generated expediente (and preferably across equipos on the same run).
- **NUMERO DE SERIE** format: `XXXXXX` (6 chars). Random; **never equal** to another serie generated in the same run.
- Clarify charset: use **digits 0–9** for each `X` unless the reference PDF clearly uses alphanumerics — then match the reference.

### 2.10 Page 68 — “Nombre de quien realizó las actividades”
- Text must be: `{Nombre Testigo 1}<single space>Y Personal Contratista.`
- Example: `JUAN PEREZ Y Personal Contratista.`
- **Remove** the large gap currently between the name and `Y Personal Contratista.`

### 2.11 Page 72 — ANEXO FOTOGRÁFICO (4 PND photos)
**UI:** Add an upload section for **exactly 4 photos** (PND muestras), labeled MUESTRA 1–4, stored in the local expediente draft (IndexedDB), not as globals unless already patterned that way for per-equipo images.

**PDF:** Place each photo **centered inside** its blue-bordered frame on page 72 (see screenshot F). Preserve aspect ratio; letterbox inside the frame if needed; never spill outside the box. Empty slot may keep `SIN DATO` as in the template when no photo uploaded.

### 2.12 Page 94 — teléfonos
- Do **not** auto-scrape or invent phone numbers.
- Add **editable UI field(s)** on the page (expediente form) so Juan types the phone number(s) required on hoja 94; persist in local draft; print those values on page 94.
- Label clearly in Spanish (e.g. teléfonos / contactos de la hoja 94 — match whatever labels the PDF expects; if multiple numbers, one field per PDF slot).

### 2.13 Page 98 — fecha fija
- Wherever date parts appear on this sheet (Juan: **two** places), set:
  - Año **`2026`**
  - Mes **`01`**
  - Día **`01`**
- Hardcode these for page 98 (do not derive from Fecha PND for this sheet).

### 2.14 Page 106 — Testigo 2 name
- Long names must stay inside the table cell: center/fit with shrink/wrap; no overflow.

### 2.15 Page 108 — RESULTADOS DE LA PRUEBA…
- Bottom result text currently overflows slightly.
- Re-center / reflow so words are **not cut mid-word**, text stays inside the table.
- **Keep** existing behavior: vertical position shifts up/down depending on **día de las PND** (weekday logic already implemented — preserve it, only fix fit).

### 2.16 Page 109 — inclusion rule (replace prior logic if different)
Include hoja 109 when there is **at least one Categoría III** equipo.

**Remove** hoja 109 **only** when the expediente has **exactly one Categoría II equipo and zero Categoría III**.

Examples:
- 1× Cat III only → **include** 109 (once)
- 1× Cat III + 1× Cat II → **include** 109 (once)
- Many Cat III → **include once** (never duplicate 109 per Cat III)
- 1× Cat II only → **omit** 109
- Several Cat II, no Cat III → **omit** 109

---

## 3. Signature size & proximity (all firmas on listed pages)

General problem: signatures render **too small** and sometimes **too far above** the printed name.

**Apply to ALL signatures on each listed page** (not only one signer).

| Pages | Size | Vertical position vs name |
|-------|------|---------------------------|
| 14–18 | Larger | Signature **snug just above** the name (reduce gap) |
| 23 | Slightly larger (not huge) | Keep current position |
| 44 | Slightly larger | Keep position |
| 46 | Slightly larger | **Snug above** the name |
| 48 | Slightly larger | **Snug above** the name |
| 62 | Slightly larger | Keep position |
| 64 | **No change** | Leave as-is |
| 68 | Slightly larger | Keep position |
| 96 | Slightly larger | Keep position |
| 102 | Slightly larger | Keep position |
| 106 | Slightly larger | Keep position |

Guidance for “slightly larger”: about **+20% to +35%** linear size vs current, unless measurement against the empty-signature reference looks better at another scale — then prefer visual match to a professional stamped look without covering the name or borders.

Also ensure empty base from attachment B so old example ink never shows under/near new PNGs.

---

## 4. UI: Excel “documentación requerida” checklist (NEW)

### 4.1 Entry point
Next to the existing **Oscuro/Claro** (theme) button, add a button (Spanish label, e.g. **“Formato Excel”** / **“Lista de documentos”** — pick clear short wording).

### 4.2 Pre-generate question
Before building the file, ask: **¿Es equipo nuevo?** → **Sí / No**
- **Sí** → checklist items **1–18**
- **No** → checklist items **1–13** only (hide 14–18)

Use a small modal or in-app dialog (Spanish), then download.

### 4.3 Branding / header
- Embed the **currently uploaded FenixMex logo** from the app (same global logo asset; must update when user re-uploads logo).
- Show **FenixMex** name with polished Fenix-branded decoration (colors, header bar, subtle lines — professional “wow” corporate checklist, print-ready).
- Include an **empty labeled field/cell** for the **client** to write their **razón social** (do not force-fill from expediente unless easy; Juan wants a blank space for the client).

### 4.4 Body copy (Spanish, exact structure)

Intro line:
`A continuación, se detalla la documentación requerida para formalizar el proceso:`

Then numbered items:

1. Poder notarial.
2. Constancia de Situación Fiscal de la empresa.
3. Comprobante de domicilio de la ubicación del equipo (emitido por autoridad gubernamental).
4. Identificación oficial (INE) del representante legal.
5. Identificación oficial (INE) del responsable de la visita.
6. Identificación oficial (INE) de 2 testigos y del personal de mantenimiento.
7. Teléfono de contacto corporativo.
8. Correo electrónico institucional.
9. Certificado de la válvula de seguridad.
10. Croquis de ubicación del equipo (layout de planta).
11. Plano de rutas de evacuación.
12. Directorio de cuerpos de emergencia.
13. Nombre del equipo y número de identificación (TAG).
14. Certificado de fabricación (para equipos nuevos).
15. Plano de construcción, operación o diseño (para equipos nuevos).
16. Manual de operación (para equipos nuevos).
17. Reporte de pruebas de presión de fábrica (para equipos nuevos).
18. Documentación soporte que acredite la adquisición del equipo, tales como recibos o facturas (para equipos nuevos).

### 4.5 Per-row “anexar” column
Juan chose: a column for **vínculo / ruta de archivo** (hyperlink or path the user pastes).  
Also include practical companion columns for a complete checklist, e.g.:
- `#`
- `Documento requerido`
- `Estado` (Pendiente / Entregado / N/A) with data validation dropdown
- `Ruta o vínculo del archivo`
- `Observaciones`

Make the sheet **impressive**: freeze header, print titles, consistent column widths, alternating row tint compatible with brand, logo in header, footer with date generated + “FenixMex”, wide row height so it looks like a real intake form. Use SheetJS / ExcelJS / similar already acceptable in-browser; **no server**.

Suggested filename: `FenixMex_Documentacion_Requerida_<Nuevo|Existente>_<YYYYMMDD>.xlsx`

### 4.6 Quality bar
Juan’s bar: professional, complete, detailed, visually striking — not a bare 2-column dump. Still LibreOffice/Excel compatible.

---

## 5. Empty signatures base PDF

1. Replace or rebuild the clean template pages so signature boxes are **blank** (from attachment B).
2. When overlaying user PNGs, draw only the uploaded signatures at the sizes/positions in §3.
3. Regression check: generate with no signatures uploaded → boxes empty; with signatures → no double-ink / ghost of example firmas.

---

## 6. Out of scope / do not break

- Do not change Cat II previo/dictamen rules except where a shared helper (dates, firmas, EN TRAMITE) is shared — then keep Cat II examples coherent.
- Do not upload generated PDF/ZIP to Firebase.
- Do not remove dark mode.
- Do not mix unrelated apps (Quiniela / Forge).

---

## 7. Acceptance checklist (you must verify before delivery)

- [ ] No ghost signatures from old example PDF
- [ ] Page 6: padded names, headers not mid-word cut, EN TRAMITE in **both** Dictamen and Control columns
- [ ] Page 9: plate photo inside box; control = EN TRAMITE
- [ ] Page 10: argolla string only for compresores de aire
- [ ] Pages 14–18: centered equipo fields; 14–16 dates OK with long months
- [ ] Page 23: compressor 3-line ítem rule + page duplication; non-compressor single name
- [ ] Pages 46 & 64: dates centered
- [ ] Page 66: Cat III only; random unique `XXX-XXXXX` and `XXXXXX`
- [ ] Page 68: single space before `Y Personal Contratista.`
- [ ] Page 72: UI for 4 photos; PDF centered in MUESTRA frames
- [ ] Page 94: manual phone fields in UI → PDF
- [ ] Page 98: 2026-01-01 in both places
- [ ] Page 106: long Testigo 2 fits
- [ ] Page 108: results text fits; PND-day vertical shift preserved
- [ ] Page 109: omit only for sole Cat II / no Cat III; never duplicate for many Cat III
- [ ] Signatures: size/proximity table in §3; page 64 untouched
- [ ] Theme button sibling: Excel checklist with Sí/No equipo nuevo; logo from upload; blank razón social; link/path column; items 1–13 or 1–18

---

## 8. Output format back to Juan

1. Patched app files
2. Short Spanish CHANGELOG
3. Note any coordinate constants you changed (page → field → approx pt) so future prompts can tweak firmas without re-discovery

END OF PROMPT.
