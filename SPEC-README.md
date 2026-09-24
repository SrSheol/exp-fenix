# Prompt Claude Opus — FenixMex Expedientes

## Qué es

- **`PROMPT-CLAUDE-OPUS-FENIX.md`**: prompt completo en **inglés** para pegar en Claude Opus 5.5 (high effort).
- La app y **todo el texto de los PDF** deben salir en **español mexicano** (el prompt lo exige).

## Cómo usarlo

1. Abre Claude Opus 5.5 (high effort).
2. Pega el contenido íntegro de `PROMPT-CLAUDE-OPUS-FENIX.md`.
3. **Adjunta todos** los archivos de la lista siguiente en el mismo mensaje (o chat).
4. Pide que construya la app y genere PDFs de prueba comparados página a página con el ejemplo.

## Archivos que Juan debe adjuntar

Ruta base de adjuntos del agente (si trabajas desde la máquina del agente):  
`/home/box/agent-data/agents/ebfc8181-d8c6-4ed6-b0b6-ffbb2538ebf6/attachments/`

| # | Archivo | Para qué |
|---|---------|----------|
| 1 | `8ab3f4cb6932ef8b798116f0b3a64b82f72c6557c0eadeb0df37998cd2f999b9.pdf` | Expediente ejemplo Cat III Letter ~109 págs (fuente de verdad visual) |
| 2 | `/workspace/fenix-exp/full.txt` *(opcional pero útil)* | Dump de texto del expediente |
| 3 | `29441b48511d0896aad794b24f832dae98b7523027f028b5c47e2b79eca84983.xlsx` | Excel 1 captura (DATOS GENERALES + LISTA GENERAL) |
| 4 | `42688bc015650e538ffadda5565160dbf37ebd18e541f4730f85b9f41ccde302.xlsx` | Excel 2 informe / plantillas de hojas |
| 5 | `72d3a8474428489da00a482091339a212304b190ae44cd383e23b491b34bfe94.pdf` | PDF muestra Excel 2 |
| 6 | `fd134a6e4ed130cc86a804921005126812c8d881baa1a6c57b732bece56b763b.xlsx` | Excel 3 ficha técnica H1/H2/H3 |
| 7 | `2ef4a557b306a058c7a255b89e4d9ff40b91c1f7aa90fde6cc8ade79d9cebf9c.xlsx` | Excel 4 bloque PND |
| 8 | PNGs en la misma carpeta `attachments/` (screenshots PND / UI) | Referencia visual PND |
| 9 | `/workspace/fenix-exp/assets/logo-fenixmex.jpg` | Logo FenixMex |
| 10 | `/workspace/fenix-exp/cat2/previo-ejemplo.pdf` | Previo Cat II A4 |
| 11 | `/workspace/fenix-exp/cat2/dictamen-ejemplo.pdf` | Dictamen Cat II A4 |
| 12 | `/workspace/fenix-exp/cat2/previo-ejemplo.txt` / `dictamen-ejemplo.txt` *(opcionales)* | Texto extraído Cat II |

**Mínimo indispensable:** PDF expediente 109 págs + logo + previo + dictamen + los 4 Excel. Sin el PDF de 109 págs no hay fidelidad visual.

## Salidas esperadas de la app

- `EXP_<razonsocial>.pdf` (Letter)
- Si hay Cat II: `previo_<TAG>_<razonsocial>.pdf` y `dictamen_<TAG>_<razonsocial>.pdf` (A4) por cada equipo II
