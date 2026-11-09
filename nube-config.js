/* FenixMex · configuración de la nube (UN SOLO LUGAR para index.html y verificar.html).
   Instrucciones paso a paso: CONFIGURAR-NUBE.md. Mientras «firebase» sea null, la app funciona igual que siempre
   y los expedientes generados quedan «Pendientes de registrar» (se registran solos cuando esto se llene).

   IMPORTANTE: verificarUrl va impresa en el QR de cada expediente. No la cambies después de imprimir expedientes. */
window.FX_NUBE = {
  // 1) Proyecto Firebase DEDICADO de Fenix (Consola de Firebase › Configuración del proyecto › Tus apps › Web › firebaseConfig).
  //    Ejemplo: { apiKey: 'AIza…', authDomain: 'fenix-expedientes.firebaseapp.com', projectId: 'fenix-expedientes', appId: '1:…:web:…' }
  firebase: {
    apiKey: 'AIzaSyC0LgrtZKTYVUfTx3XVG8ipNrouLyfhy4s',
    authDomain: 'fenix-expedientes.firebaseapp.com',
    projectId: 'fenix-expedientes',
    storageBucket: 'fenix-expedientes.firebasestorage.app',
    messagingSenderId: '887741747796',
    appId: '1:887741747796:web:fe4b17a6c3eebc34a213c1'
  },

  // 2) Google Drive (Google Cloud › APIs y servicios › Credenciales, en el MISMO proyecto)
  googleClientId: '887741747796-8vcd6hop5cc3ani9e3qrhv3gsohsab0i.apps.googleusercontent.com',   // ID de cliente OAuth 2.0 «Aplicación web» (…apps.googleusercontent.com), origen https://srsheol.github.io
  googleApiKey: 'AIzaSyC0LgrtZKTYVUfTx3XVG8ipNrouLyfhy4s',     // clave de API para el selector de Google (Picker); puede ser la misma apiKey de Firebase si tiene Picker API habilitada
  googleAppId: '887741747796',      // número del proyecto (Configuración del proyecto › Número del proyecto)
  driveFolderId: '10lc_TtvngiyKiqetcWmlKuvhcypg2dah',    // id de la carpeta «Fenix · Expedientes» (lo que sigue a /folders/ en su dirección)
  driveFolderName: 'Fenix · Expedientes',

  // 3) Página pública de verificación (va dentro del QR)
  verificarUrl: 'https://srsheol.github.io/exp-fenix/verificar.html'
};
