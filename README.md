# exp-fenix

Generador de expedientes NOM-020-STPS-2011 (FenixMex) — UI en español, PDFs Letter + Cat. II A4.

## Stack previsto

- GitHub Pages (este repo)
- Firebase proyecto **`quiniela-3c8fa`** (compartido con otras apps de Juan)
- **Aislamiento obligatorio:** solo rutas propias de esta app:
  - Firestore: colección raíz `expFenix` (y subdocs debajo)
  - Storage: prefijo `exp-fenix/`
  - **Nunca** leer/escribir colecciones de quiniela, forge-console, sangaku/`pendientes`, u otras

## Firmas y datos entre PCs

Globales (Firma 1/2 PND, firmante izquierdo) y expedientes se guardan en Firebase para que funcionen en cualquier computadora.

## Desarrollo

La app la construye Claude Opus a partir del prompt Fenix. Cuando exista el build:

```bash
npm i && npm run build
# deploy: push a main → GitHub Pages (Actions o branch gh-pages)
```

## Estado

Repo vacío listo para el código de la página. Prompt y assets de especificación viven en el chat Expediente Fenix / `/workspace/fenix-exp/`.
