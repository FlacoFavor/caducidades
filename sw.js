const CACHE_NAME = 'caducidad-app-v1.17'; 
const ASSETS = [
  '/',                  // 👈 CRÍTICO: Permite cargar la app desde la URL raíz offline
  'index.html',
  'estilos.css',        // 👈 CORREGIDO: Asegura que el diseño cargue sin internet
  'app.js',
  'manifest.json',
  'icono.svg',
  'icono.png'
];

// Instalación y almacenamiento en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos una carga tolerante: si un recurso falla, no rompe la instalación completa
      return Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      );
    }).then(() => self.skipWaiting()) 
  );
});

// Limpieza de cachés antiguas en la activación
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

// Estrategia: Red primero, cae en caché si está offline
self.addEventListener('fetch', (e) => {
  // Evitar interceptar peticiones externas como Chrome Extensions o APIs de terceros
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Detectar cuando el usuario hace clic en la notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); 

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('./'); // 👈 CORREGIDO: Abre la raíz relativa segura
        })
    );
});
