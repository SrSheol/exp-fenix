# FenixMex · Expedientes NOM-020-STPS-2011

App de una sola página (`index.html`) para generar expedientes NOM-020 (PDF Letter + Cat. II A4) con UI en español.

**GitHub Pages:** https://srsheol.github.io/exp-fenix/

## Uso

1. Abre la URL de Pages (o abre `index.html` en un navegador moderno).
2. Completa **Activos globales**, datos del establecimiento y equipos.
3. Genera el expediente o el ZIP. La generación de PDF no requiere Firebase.
4. El estado del formulario se guarda solo: primero en **IndexedDB** del navegador y, si hay red, se sincroniza con Firebase.

Estados en la barra superior:

- **Sincronizado con la nube** — lectura/escritura Firebase OK
- **Solo local (sin conexión)** — IndexedDB como respaldo offline
- **Solo local · error nube: …** — reglas/red/permisos; los datos locales siguen OK

## Firebase (aislamiento obligatorio)

Proyecto compartido: **`quiniela-3c8fa`**.

Esta app **solo** usa:

| Servicio   | Ruta permitida                                      |
|------------|-----------------------------------------------------|
| Firestore  | colección `expFenix` (`globals`, `draft`, `imgs`)   |
| Storage    | prefijo `exp-fenix/` (p. ej. `exp-fenix/imgs/…`)    |

**Nunca** lee ni escribe quiniela, forge, pendientes u otras colecciones/rutas.

### Mapeo de claves (IndexedDB ↔ nube)

| Clave local (IndexedDB `fenixmex-nom020` / `kv`) | Nube |
|--------------------------------------------------|------|
| `globals` | Firestore `expFenix/globals` |
| `draft` | Firestore `expFenix/draft` |
| `img:<key>` (binario PNG/JPG) | Storage `exp-fenix/imgs/<key_sanitizado>` + metadatos en `expFenix/imgs` |

Claves de imagen típicas: `g:logoFenix`, `g:firmaPnd1`, `g:firmaPnd2`, `g:firmanteIzquierdoFirma`, `d:representanteLegalFirma`, `d:testigo1Firma`, `d:testigo2Firma`, `d:fotoFachada`, `e:<id>:fotoPlaca`.

Las imágenes grandes no van embebidas en Firestore (límite ~1 MB); se suben a Storage y el doc `imgs` guarda `path` / `url` / `size`.

### Reglas temporales (abrir solo estas rutas)

Si las reglas actuales bloquean escritura, en la consola Firebase añade (y **ajusta después con auth**):

```
match /expFenix/{document=**} {
  allow read, write: if true; // temporal — solo expFenix
}
match /b/{bucket}/o {
  match /exp-fenix/{allPaths=**} {
    allow read, write: if true; // temporal — solo prefijo exp-fenix/
  }
}
```

**Advertencia para Juan:** estas reglas abiertas son temporales y **solo** para `expFenix` / `exp-fenix/`. No las apliques a todo el proyecto.

## Contenido del repo

- `index.html` — app lista para Pages (plantillas PDF embebidas)
- `kit/` — fuentes (`app.html`, `engine.js`) + zip de construcción
- `samples/` — un PDF de ejemplo (Cat. II); no se suben los expedientes grandes

## Offline

Sin red, la app sigue funcionando con IndexedDB (`fenixmex-nom020`). Al recuperar conexión, el siguiente guardado intenta subir a la nube.
