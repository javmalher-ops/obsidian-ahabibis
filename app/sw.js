/**
 * Service worker: deja la app usable dentro de una unidad sin señal.
 *
 * Estrategia por tipo de recurso:
 *  - Archivos propios (HTML, CSS, JS): caché primero. La app abre al instante
 *    y funciona completa sin datos.
 *  - Mosaicos de mapa y geocodificación: red, sin caché. Son datos vivos y
 *    llenarían el disco del teléfono.
 */

const CACHE = 'ruta-ultima-milla-v1';
const BASICOS = [
  './',
  './index.html',
  './css/estilos.css',
  './js/app.js',
  './js/almacen.js',
  './js/csv.js',
  './js/escaneo.js',
  './js/geo.js',
  './js/optimizador.js',
  './manifest.webmanifest',
  './datos/ejemplo-manifiesto.csv',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET') return;

  // Nada de terceros se cachea: mapas y geocodificación van siempre a la red.
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(ev.request).then((enCache) => {
      const desdeRed = fetch(ev.request)
        .then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(ev.request, copia));
          }
          return r;
        })
        .catch(() => enCache);
      // Caché primero para que abra al instante; la red actualiza por detrás.
      return enCache || desdeRed;
    }),
  );
});
