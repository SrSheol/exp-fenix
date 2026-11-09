# Configurar la nube de Fenix (registro de QR, historial y Google Drive)

Guía paso a paso para Juan. Todo se hace una sola vez, con la **cuenta de trabajo `apoyomecv@gmail.com`**. Tiempo aproximado: 40 minutos.

Mientras no termines, la app funciona exactamente igual que hoy: genera los PDF y el ZIP, la portada ya lleva su QR, y cada expediente queda **«Pendiente de registrar»**. En cuanto la nube esté lista y alguien autorizado inicie sesión, los pendientes de ese navegador se registran solos.

> **Lo único que se edita es `nube-config.js`.** `index.html` y `verificar.html` leen de ahí.

---

## 0. ¿Proyecto nuevo o el actual (`quiniela-3c8fa`)?

**Recomendación: proyecto nuevo y dedicado («fenix-expedientes»).** Motivos:

1. **Los QR impresos dependen de él para siempre.** El proyecto debe pertenecer a la cuenta de trabajo de FenixMex y no a uno personal llamado «quiniela» que algún día se podría borrar o reorganizar.
2. **Reglas separadas.** Las reglas de `firestore.rules` son estrictas (nadie lista nada, solo cuentas autorizadas escriben). En el proyecto de la quiniela habría que mezclarlas con las de otras apps y un error en cualquiera expondría el registro.
3. **Cuotas y costos separados** (el plan gratuito Spark sobra: cada consulta de un QR es 1 lectura).

Lo que ya existe **no se mueve**: los datos compartidos (`expFenix/globals`, firmas y logo de FenixMex) se siguen leyendo y guardando en `quiniela-3c8fa`, como siempre. Lo nuevo (registro, historial, inicio de sesión) va solo al proyecto nuevo.

---

## 1. Crear el proyecto de Firebase

1. Entra a <https://console.firebase.google.com> con `apoyomecv@gmail.com`.
2. **Agregar proyecto** → nombre: `fenix-expedientes` (o el que prefieras).
3. **Google Analytics: desactivado** (la verificación no lleva rastreo).
4. Al terminar, en la rueda ⚙ › **Configuración del proyecto** › *Tus apps* › ícono **Web `</>`** → apodo `FenixMex web` → **Registrar app** (sin Hosting).
5. Copia el bloque `firebaseConfig` que aparece. Abre `nube-config.js` y pégalo en `firebase:`. Debe quedar así (con tus valores):

```js
firebase: {
  apiKey: 'AIza…',
  authDomain: 'fenix-expedientes.firebaseapp.com',
  projectId: 'fenix-expedientes',
  storageBucket: 'fenix-expedientes.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123'
},
```

6. En la misma pantalla, anota el **Número del proyecto** (*Project number*) y escríbelo en `googleAppId: '1234567890'`.

## 2. Crear la base de datos (Firestore)

1. Menú **Compilación › Firestore Database** › **Crear base de datos**.
2. Ubicación: `northamerica-south1 (México)` o `nam5 (Estados Unidos)`. **No se puede cambiar después.**
3. Modo: **producción**. Las reglas se ponen en el paso 5.

## 3. Activar el inicio de sesión con Google

1. **Compilación › Authentication** › **Comenzar**.
2. Pestaña **Método de acceso** › **Google** › **Habilitar**. Correo de asistencia: `apoyomecv@gmail.com` › **Guardar**.
3. Pestaña **Configuración › Dominios autorizados** › **Agregar dominio** › `srsheol.github.io`.

## 4. Lista de cuentas autorizadas

Solo estas cuentas pueden registrar, ver el historial, abrir, cancelar o eliminar expedientes.

1. **Firestore Database › Datos** › **Iniciar colección** → ID de colección: `config`.
2. ID del documento: `acceso`.
3. Campo: `emails`, tipo **array**. Agrega un elemento por persona, **en minúsculas**:
   - `apoyomecv@gmail.com`
   - `tu.correo@gmail.com`
   - `companero1@gmail.com` …
4. **Guardar.**

Para dar o quitar acceso después, edita ese mismo arreglo; aplica en segundos. Solo se puede editar desde la consola: la app no puede cambiarlo.

## 5. Publicar las reglas de seguridad

1. **Firestore Database › Reglas**.
2. Borra lo que haya y pega **todo** el contenido de `firestore.rules`.
3. **Publicar.**
4. Prueba opcional, en el mismo lugar, con **Área de pruebas de reglas** (*Rules Playground*):
   - tipo `get`, ruta `verificaciones/cualquiera`, **sin autenticar** → debe salir **Permitido** (el documento no existe, pero leer por id exacto está permitido);
   - tipo `list` (consulta), ruta `verificaciones` → **Denegado**;
   - tipo `get`, ruta `expedientes/FX-2026-AAAAAA`, sin autenticar → **Denegado**.

> No se usa Cloud Storage: los ZIP van a Google Drive, así que no hay reglas de Storage que configurar.

## 6. Google Drive: permisos (Google Cloud)

Se hace en **Google Cloud Console** con el **mismo proyecto** (Firebase y Google Cloud son el mismo proyecto): <https://console.cloud.google.com>. Arriba, elige `fenix-expedientes`.

### 6.1 Habilitar las API
**APIs y servicios › Biblioteca** → busca y **Habilita**:
- **Google Drive API**
- **Google Picker API**

### 6.2 Pantalla de consentimiento
**APIs y servicios › Pantalla de consentimiento de OAuth** (o *Google Auth Platform › Branding*):
1. Tipo de usuario: **Externo**.
2. Nombre de la app: `FenixMex Expedientes`. Correo de asistencia y de contacto: `apoyomecv@gmail.com`.
3. Dominio de la página de inicio: `https://srsheol.github.io/exp-fenix/`.
4. **Permisos (scopes)**: agrega solo `.../auth/drive.file` («Ver, editar, crear y borrar solo los archivos de Drive que usas con esta app»). Es un permiso **no sensible**: Google no exige una revisión de seguridad.
5. **Estado de publicación: En producción** (en «Prueba» solo podrían entrar los usuarios de prueba que agregues).

### 6.3 ID de cliente OAuth
**APIs y servicios › Credenciales**:
1. Firebase ya creó uno: **«Web client (auto created by Google Service)»**. Ábrelo (o crea uno nuevo: **Crear credenciales › ID de cliente de OAuth › Aplicación web**).
2. **Orígenes autorizados de JavaScript** → **Agregar URI** → `https://srsheol.github.io` (sin barra al final y sin `/exp-fenix`).
3. **Guardar.** Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`) en `googleClientId`.

### 6.4 Clave de API (para el selector de Google)
En **Credenciales** está la clave **«Browser key (auto created by Firebase)»**: es la misma `apiKey` del paso 1.
1. Ábrela › **Restricciones de aplicaciones: Sitios web** → agrega `https://srsheol.github.io/*`.
2. **Restricciones de API**: déjala sin restringir **o** marca al menos *Cloud Firestore API, Identity Toolkit API, Token Service API* y *Google Picker API*.
3. **Guardar.** Escribe esa misma clave en `googleApiKey`.

## 7. La carpeta compartida de Drive

1. En <https://drive.google.com> con `apoyomecv@gmail.com`: **Nuevo › Carpeta** → `Fenix · Expedientes`.
2. Clic derecho › **Compartir** → agrega a cada compañero como **Editor**.
3. Abre la carpeta. Su id es lo que sigue a `/folders/` en la dirección:
   `https://drive.google.com/drive/folders/`**`1AbCdEfGhIjKlMnOpQrStUv`** → cópialo en `driveFolderId`.

**Una vez por persona y por navegador**: en la app, **Mis expedientes › Conectar Google Drive** y elegir la carpeta `Fenix · Expedientes` en el selector de Google. Con el permiso mínimo `drive.file`, la app solo puede tocar lo que ella misma creó o lo que la persona eligió en ese selector, y **nunca** ve el resto del Drive.

**Cómo queda ordenada la carpeta**: dentro de `Fenix · Expedientes` cada expediente tiene **su propia subcarpeta**, `FX-2026-XXXXXX · Razón social` (sin `\ / : * ? " < > |` y hasta 120 caracteres). Ahí van su ZIP y su `borrador.json`; al reexportar se reemplazan esos mismos archivos y, si cambia la razón social, la subcarpeta se renombra. Los expedientes de antes, con archivos sueltos en la carpeta principal, pasan solos a su subcarpeta la siguiente vez que se exportan. Si un compañero no tiene acceso a la subcarpeta que creó otra persona, la app le muestra el selector de Google para concederlo; si lo cancela, crea otra subcarpeta suya y en Mis expedientes aparece «Carpeta anterior pendiente de limpiar». Al **Eliminar** un expediente se borran sus archivos y su subcarpeta va a la papelera de Drive (solo si quedó vacía).

## 8. Publicar

Sube a la rama de GitHub Pages del repositorio `exp-fenix`: `index.html`, `verificar.html` y `nube-config.js` (también `firestore.rules`, `CONFIGURAR-NUBE.md` y `pruebas/`, como respaldo). La carpeta `capturas/` es opcional.

## 9. Probar (5 minutos)

1. Abre `https://srsheol.github.io/exp-fenix/` › **Mis expedientes** › **Iniciar sesión con Google** con una cuenta de la lista. Debe decir «cuenta autorizada».
2. **Conectar Google Drive** › elige la carpeta.
3. Carga el ejemplo y toca **Generar y descargar ZIP**. En unos segundos aparece «Registrado FX-2026-… · revisión 1 · respaldado en Drive».
4. Escanea el QR de la portada con el celular: debe abrir `srsheol.github.io/exp-fenix/verificar.html` con **Expediente válido**.
5. El ejemplo es categoría III: el QR muestra «Fecha de emisión del dictamen: **En trámite**». En **Mis expedientes** › **Capturar fecha de dictamen** elige una fecha y confirma → el QR muestra esa fecha (sin volver a exportar nada).
6. Vuelve a tocar **Generar y descargar ZIP** sin cambiar nada → dice «mismos datos, sigue en la revisión 1».
7. En **Mis expedientes**, **Cancelar expediente** → el QR dice **Expediente cancelado**. **Reactivar** → vuelve a «válido».
8. Elimina ese expediente de prueba (escribiendo su folio) → el QR dice **No válido / no encontrado**.

---

## Cuota de Google Drive cuando suben los compañeros (importante)

En una carpeta normal de Drive (cuenta Gmail, no Google Workspace), **cada archivo cuenta en el espacio de quien lo sube**, no en el del dueño de la carpeta. Si un compañero genera un ZIP de 60 MB, esos 60 MB salen de **sus** 15 GB gratuitos, aunque el archivo aparezca en la carpeta de `apoyomecv@gmail.com` (100 GB).

Opciones para que todo cuente en los 100 GB de la cuenta de trabajo:
1. **Transferir la propiedad** de vez en cuando: en Drive, selecciona los archivos de la carpeta › Compartir › cambiar el propietario a `apoyomecv@gmail.com`. Entre cuentas Gmail, Google pide que el nuevo dueño **acepte** la transferencia.
2. Que en el permiso de Drive (la ventana de Google que aparece al conectar Drive) los compañeros elijan la cuenta `apoyomecv@gmail.com`. La sesión de la app (quién registra) sigue siendo la de cada quien. **No lo recomiendo**: obliga a compartir la contraseña de la cuenta de trabajo.
3. **Google Workspace con unidad compartida**: ahí el espacio es de la organización. Es lo más limpio si en algún momento contratan Workspace.

Otros dos efectos de que el dueño sea quien sube:
- **Eliminar** un expediente que subió otra persona borra el registro, pero el ZIP de Drive solo lo puede borrar su dueño. La app avisa: «lo subió otra persona; bórralo en Drive».
- **Corregir y volver a exportar** un expediente que subió otra persona: la app no puede reemplazar su ZIP, así que sube uno nuevo y en **Mis expedientes** aparece «ZIP anterior pendiente de limpiar» (al pasar el mouse se ve el id del archivo). Su dueño lo borra en Drive cuando quiera; el registro ya apunta al ZIP nuevo.
- **Abrir para corregir** un expediente de otra persona puede mostrar una vez el selector de Google con ese archivo: es el permiso `drive.file` pidiendo acceso a ese archivo. Se elige y listo.

## Si algo no funciona

| Síntoma | Causa probable |
|---|---|
| «La nube aún no está configurada» | `firebase: null` en `nube-config.js`, o el archivo no se subió. |
| «Esta cuenta no está en la lista de FenixMex» | El correo no está en `config/acceso.emails`, o tiene mayúsculas o espacios. |
| La ventana de Google dice *unauthorized domain* | Falta `srsheol.github.io` en Authentication › Dominios autorizados (paso 3). |
| La ventana de Drive dice *origin_mismatch* | Falta `https://srsheol.github.io` en los orígenes del ID de cliente (paso 6.3). |
| «Sin permiso de Google Drive» / no se ve la carpeta | Falta «Conectar Google Drive», o el compañero no es Editor de la carpeta. |
| El QR dice «Servicio no disponible» | Faltan las reglas (paso 5), o la clave de API está restringida a otro sitio. |
| Quedan pendientes en un navegador | Abre **Mis expedientes › Registrar ahora** con sesión iniciada. Los pendientes viven en el navegador donde se generó el expediente. |
