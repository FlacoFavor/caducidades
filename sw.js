const CACHE_NAME = 'caducidad-app-v1.1'; // Incrementa este número (v2, v3) para forzar actualizaciones
const ASSETS = [
  'index.html',
  'app.js',
  'manifest.json'
];

// Instalación y almacenamiento en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting()) // Activa el nuevo sw inmediatamente
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
    }).then(() => self.clients.claim()) // Toma el control de las pestañas abiertas
  );
});

// Estrategia: Red primero, cae en caché si está offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Detectar cuando el usuario hace clic en la notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Cierra la notificación

    // Abre la aplicación o la enfoca si ya está abierta
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});
