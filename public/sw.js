// =====================================================================
// Rural69 · Service worker
// ---------------------------------------------------------------------
// Existe por dos razones: que el móvil ofrezca instalar la app y que, si
// te quedas sin cobertura en mitad del monte, al menos abra.
//
// Dos estrategias distintas, a propósito:
//
//   · Navegación (el HTML): primero la red. Así nunca te quedas con una
//     versión vieja de la aplicación. Solo si no hay red se tira de la
//     copia guardada.
//   · Archivos con huella (/assets/index-AbC123.js): primero la caché.
//     Llevan el hash del contenido en el nombre, así que una vez
//     descargados no cambian nunca; si cambian, cambia el nombre.
//
// Lo que nunca se cachea: las llamadas a Supabase. Los datos del grupo
// tienen que venir siempre frescos.
// =====================================================================

const VERSION = 'rural69-v1'
const CACHE = `${VERSION}-estatico`

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './index.html', './favicon.svg', './manifest.webmanifest']))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const peticion = e.request
  if (peticion.method !== 'GET') return

  const url = new URL(peticion.url)
  // Solo nos ocupamos de lo que sirve GitHub Pages. Supabase, nunca.
  if (url.origin !== self.location.origin) return

  if (peticion.mode === 'navigate') {
    e.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone()
          void caches.open(CACHE).then((c) => c.put('./index.html', copia))
          return respuesta
        })
        .catch(() => caches.match('./index.html').then((r) => r ?? caches.match('./'))),
    )
    return
  }

  e.respondWith(
    caches.match(peticion).then((guardada) => {
      if (guardada) return guardada
      return fetch(peticion).then((respuesta) => {
        if (respuesta.ok && respuesta.type === 'basic') {
          const copia = respuesta.clone()
          void caches.open(CACHE).then((c) => c.put(peticion, copia))
        }
        return respuesta
      })
    }),
  )
})
