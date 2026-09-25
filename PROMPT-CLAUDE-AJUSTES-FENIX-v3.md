# PROMPT — FenixMex Expediente: Polish Pass v3
# Paste into Claude Opus (high effort). Attach current `index.html` from repo `SrSheol/exp-fenix` (commit on `main` after 2026-09-25 patch / `be8f83e` or newer). Optional: CHANGELOG-2026-09-25.md for context of prior patch.

---

## 0. Role

You are patching the **existing** single-file FenixMex NOM-020 app (`index.html`). Surgical edits only. Do not rebuild from scratch.

**Language:** This prompt is English. UI + PDF text stay Mexican Spanish.

**Deliverable:** patched `index.html` (Pages-ready, self-contained), optional `kit/engine.js` mirror, short Spanish CHANGELOG, coordinate notes for anything you moved. **Also:** a dramatically upgraded capture UI (§2.5) that still respects §2.4 section order.

**Keep working (do not regress):**
- Ghost-signature cleanup (except Edwin fixed firma on hoja 96 DC-3)
- Page 6: EN TRAMITE in **both** Dictamen and Control columns
- Multi-equipo hoja 23 shared list + duplicate when full
- Hoja 109 once if any Cat III; omit if none
- Lista de documentos Excel button, PND muestras UI, phones UI with empty→template CDMX fallback
- Firebase globals / IndexedDB draft model
- Dark mode

---

## 1. PDF fixes

### 1.1 Hoja 107 — never duplicate
- Today hoja 107 is emitted **once per equipo**.
- **Change:** emit hoja 107 **exactly once** per expediente, regardless of equipo count (1 or many). Same rule spirit as hoja 109 (once), but 107 is **always** included once (unless the prior product rule already omitted it entirely for some Cat cases — if so, preserve omit rules but **never** multiply by equipo count).

### 1.2 Hoja 4 — typo
- Under the logo, text currently reads **`TEXO DE REFERENCIA`**.
- Fix to **`TEXTO DE REFERENCIA`**.

### 1.3 Hoja 9 (+ per-equipo clones) — Control STPS blank
- Next to **“Número de control Asignado por la Secretaría:”** do **NOT** print `EN TRAMITE`.
- Leave that cell **empty**.
- Applies to hoja 9 and **every similar per-equipo ficha** generated for each equipo (same control field).
- **Do not change** hoja 6: Dictamen + Control still both `EN TRAMITE`.

### 1.4 Hoja 10 — válvula tipo + diámetro (all equipos)
Replace the hard-coded compressor-only string with values from **per-equipo UI fields** (see §2.1).

Printed line format (exact pattern):
`VÁLVULA DE SEGURIDAD TIPO {TIPO}, Ø {DIAMETRO}mm`

Examples:
- `VÁLVULA DE SEGURIDAD TIPO SILBATO, Ø 6mm`
- `VÁLVULA DE SEGURIDAD TIPO CAMPANA, Ø 8mm`
- `VÁLVULA DE SEGURIDAD TIPO ARGOLLA, Ø 6mm`

Applies to **all equipos** (not only compressors).

### 1.5 Hoja 66 — bind diameter, temps, pressures + kPa
Only for Cat III (existing gate). Sync from equipo data:

| On hoja 66 | Source |
|------------|--------|
| `MACHO ASA B 2.2-1960 DE: {n} mm` — the number before `mm` | Same **diámetro de válvula (Ø)** from UI (§2.1) |
| `TEMPERATURA MAXIMA DE OPERACION` | Same **temperatura de diseño** captured for the equipo |
| `PRESIÓN MÁXIMA DE OPERACIÓN` (kg/cm² side) | **Presión de trabajo máxima permitida** from UI |
| Same pressure shown in **kPa** (already on sheet) | Convert: `kPa = kg/cm² × 98.07`, **2 decimal places** |
| `PRESION DE DISPARO MANOMETRICA` (kg/cm²) | New UI field **presión de disparo manométrica** (§2.1) |
| Same disparo in **kPa** | `× 98.07`, 2 decimals |

Keep random unique `CERTIFICADO No. XXX-XXXXX` and `NUMERO DE SERIE XXXXXX` behavior from prior patch.

### 1.6 Hoja 72 — remove RMC text
- Behind/under the logo, remove visible text **`RMC Servicios de Ingeniería, S. de R.L. de C.V.`** (and any similar leftover company name).
- Leave **only** the FenixMex logo (user upload / global).

### 1.7 Hojas 73–74 — espesores with +0.00…+0.03 random jitter
**Hoja 73:** keep current behavior: print the **user-entered minimum thickness** (the base number from “Rellenar”).

**Hoja 74:** There are **16** thickness slots filled by the “Rellenar” control.
- Let `B` = the number the user typed (minimum).
- Each of the 16 cells gets a value `B + d` where `d` is chosen **at random** in `[0.00, 0.03]` (inclusive), independently per cell (or reshuffled), so values look like `4.10`, `4.11`, `4.12`, `4.13` when `B = 4.1`.
- **Never** go below `B`. Max above `B` is **0.03**.
- Apply the same jitter rule across **all 3 columns** of those 16 spaces.
- Formatting: preserve a sensible decimal display consistent with the sheet (if user enters `4.1`, showing one or two decimals that match the example is fine; do not invent huge precision).
- Re-roll on each PDF generate (or each Rellenar), but always respect min=`B` and max=`B+0.03`.

### 1.8 Hoja 96 — RFC max length 12
- The **RFC de la empresa** field (UI + what prints on hoja 96 / wherever RFC is used): **maximum 12 characters** (numbers or letters).
- Enforce in the input (`maxlength=12`, uppercase normalize if the app already does), and truncate/block overflow in PDF if needed.

---

## 2. UI changes

### 2.1 Per-equipo: válvula + disparo
On each equipo card / lista general pressures area, add:
1. **Tipo de válvula** — `<select>` options: `SILBATO`, `CAMPANA`, `ARGOLLA`. **Default: `SILBATO`**.
2. **Diámetro Ø (mm)** — numeric text input next to tipo. Placeholder example e.g. `6`.
3. **Presión de disparo manométrica** (kg/cm²) — numeric input for hoja 66.

Persist in local expediente draft with the equipo.

### 2.2 Presiones / temperaturas — reorder + examples + hidrostatic auto
In the equipo pressures/temperatures block, **reorder fields exactly** as:

1. Presión de diseño  
2. Presión de calibración  
3. Presión de arranque ← **NEW** manual field per equipo  
4. Presión de operación  
5. Presión de trabajo máxima permitida  
6. Presión de prueba hidrostática ← **AUTO**: `diseño × 1.1` (read-only or locked; recalculate whenever diseño changes). Always.  
7. Capacidad volumétrica — show example placeholder like `0.500`

Also add **small placeholder examples** on the other pressure fields (e.g. `5.00`, `12.00`) so users see the expected notation.

Temperatures: keep existing temp fields; only pressures list order above is mandatory unless temps were interleaved — then keep temps in a sensible adjacent group without breaking PDF bindings.

Wire PDF consumers to the renamed/new fields (esp. trabajo máxima → hoja 66; diseño → hidrostatic and any existing diseño prints).

### 2.3 Código memoria de cálculo — default mask
- Default value format: **`RSP-020-XXX-2026`**
- User only edits the **`XXX`** segment (3 characters). Prefix `RSP-020-` and suffix `-2026` stay fixed (or present the full string with XXX as the editable part — UX your choice, but generated/stored value must match `RSP-020-{XXX}-2026`).
- Keep rule: No. reporte de prueba = same as código memoria (if still in force).

### 2.4 Reorder UI sections to follow expediente narrative
Restructure the page sections so capture order matches how the PDF expediente is built. Example Juan gave: when working PND part of the expediente, UI should present **espesores (rellenar)** and then **fotos PND (hoja 72 muestras)** next, because that is the next block in the PDF.

Practical target:
- Group “Datos generales / equipos / fichas” earlier.
- Group “PND: espesores → fotos muestras → firmas PND” as a contiguous block.
- Put emergencias/teléfonos, DC-3/RFC, documents Excel, etc. near where those pages live in the flow.
- Do not remove features; only reorder sections/cards for concordance with the PDF assembly order.

---


### 2.5 Visual UI overhaul — “WOW” bar (absolute creative freedom)

Juan wants the **web app interface** to feel world-class. This is **not** a minor polish: raise the UI quality **dramatically / exponentially**.

**Goal reaction from real users:** “WOW — this looks incredible, super functional, beautifully made, obvious how to use.”

**Hard constraints (do not break):**
1. Keep the **section order / narrative flow** from §2.4 (expediente concordance: e.g. PND espesores → fotos PND, etc.). You may change *how* sections look (cards, steppers, tabs, sticky subnav, accordions) but **not** the logical order Juan defined.
2. Do **not** break PDF generation, Firebase globals / IndexedDB draft, dark-mode preference, or filename rules in §3.
3. PDF printable pages stay professional NOM-020 documents — the “WOW” mandate is for the **capture UI**, not inventing new PDF layouts.

**Freedom (explicitly allowed):**
- Full liberty to restyle layout, typography, spacing, hierarchy, micro-interactions, empty states, toasts, modals, progress, equipo cards, upload zones, signature pads, Excel/theme toolbar.
- May take **inspiration from excellent product UIs worldwide** (dashboards, design systems, fintech/admin tools, Notion/Linear/Vercel-class craft) — adapt; don’t copy trademarked assets.
- May add **CDN libs / APIs** already fine for a static GitHub Pages app (e.g. icon sets, motion, confetti-light, gradient helpers, canvas/WebGL accents) as long as the app still works offline-first where it already does for core PDF/Excel, or degrades gracefully.
- Decoration welcome: depth, relief, soft shadows, glass/blur (tasteful), volume, color matices, accent lights, subtle ASCII/ornamental headers if they fit the FenixMex brand, dark-mode-first beauty (Juan prefers dark; bright white dazzles him — default dark, excellent light theme optional).
- Prefer **intuitive** IA: clear labels in Mexican Spanish, fewer clicks, visible “what’s next”, validation that helps instead of blocking silently.

**Brand feel:** industrial / inspection / NOM-020 credibility + modern Mexican engineering studio (FenixMex) — premium, not childish; “wow” through craft, not clutter.

**Bar:** if the UI still looks like a generic form dump, you failed this section. Ship something people would screenshot.


## 3. Download filenames (spaces, no hyphens)

Sanitize razón social for filesystem (strip `/\\:*?"<>|` etc.) but **use normal spaces**, **no hyphens/underscores** as separators between tokens.

| Artifact | Filename pattern |
|----------|------------------|
| Main expediente | `EXP {RAZONSOCIAL}.pdf` |
| Cat II previo | `PREVIO {TAG} {RAZONSOCIAL}.pdf` if TAG present; else `PREVIO {RAZONSOCIAL}.pdf` |
| Cat II dictamen | `DICTAMEN {TAG} {RAZONSOCIAL}.pdf` if TAG present; else `DICTAMEN {RAZONSOCIAL}.pdf` |
| ZIP (or whatever archive is downloaded) | **Same base name as the expediente**: `EXP {RAZONSOCIAL}.zip` |

Collapse duplicate spaces. Example: `EXP FOCAS INDUSTRIALES SA DE CV.pdf` and matching zip.

---

## 4. Acceptance checklist

- [ ] Hoja 107 appears once (multi-equipo test)
- [ ] Hoja 4: TEXTO DE REFERENCIA
- [ ] Hoja 9 (+ clones): control empty; hoja 6 still EN TRAMITE ×2
- [ ] Hoja 10: `VÁLVULA DE SEGURIDAD TIPO {SILBATO|CAMPANA|ARGOLLA}, Ø {n}mm` from UI for every equipo; default SILBATO
- [ ] Hoja 66: Ø, temp diseño, P trabajo máx, P disparo + kPa ×98.07 (2 dp)
- [ ] Hoja 72: no RMC text; Fenix logo only
- [ ] Hoja 73: base espesor; hoja 74: 16 values in [B, B+0.03] random; 3 columns
- [ ] RFC maxlength 12
- [ ] UI pressure order + arranque + hidrostatic = diseño×1.1; volumetric example 0.500
- [ ] Memoria default RSP-020-XXX-2026
- [ ] Filenames with spaces as specified; zip = EXP name
- [ ] UI section order follows expediente / PND flow
- [ ] UI looks dramatically upgraded (WOW); dark-first; §2.4 order preserved; PDF engine unbroken
- [ ] No regression on prior v2 behaviors listed in §0

## 5. Output back to Juan

1. Patched `index.html`
2. Spanish CHANGELOG
3. Note any new field keys in the draft JSON

END OF PROMPT.
