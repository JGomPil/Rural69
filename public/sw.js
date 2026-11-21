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
//
// Y una tercera cosa: es quien muestra los avisos del sistema (los que
// suenan) y quien sabe a dónde llevar cuando se pulsa uno. Llegan por dos
// caminos: la propia aplicación mientras está abierta, y el servidor cuando
// está cerrada. Los dos acaban aquí y usan la misma etiqueta, así que si
// llegan los dos, uno sustituye al otro en vez de sonar dos veces.
// =====================================================================

const VERSION = 'rural69-v5'
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

// =====================================================================
// Avisos del sistema
// ---------------------------------------------------------------------
// Al pulsar el aviso, mejor reutilizar la pestaña que ya está abierta que
// abrir otra. La ruta viaja en `data.url` (p. ej. `/escapadas/<id>/casas`) y
// se monta como hash, que es lo que entiende el router.
// =====================================================================

// =====================================================================
// El empujón del servidor: lo que hace que suene con la app cerrada.
// =====================================================================

self.addEventListener('push', (e) => {
  // Sin datos no se puede decir nada útil, pero callarse del todo tampoco
  // vale: el navegador obliga a mostrar algo cuando llega un push.
  let aviso = { title: 'Rural69', body: 'Hay novedades en el grupo.', url: '', kind: 'aviso', sin_leer: null }
  if (e.data) {
    try {
      aviso = Object.assign(aviso, e.data.json())
    } catch (err) {
      aviso.body = e.data.text() || aviso.body
    }
  }

  // El número en el icono de la pantalla de inicio. La cuenta la manda el
  // servidor dentro del aviso, porque aquí no se puede preguntar a la base
  // de datos. Si el navegador no sabe hacerlo, no pasa nada.
  const insignia = async () => {
    try {
      if (typeof aviso.sin_leer !== 'number' || !self.navigator) return
      if (aviso.sin_leer > 0) await self.navigator.setAppBadge?.(aviso.sin_leer)
      else await self.navigator.clearAppBadge?.()
    } catch {
      /* sin insignia: el aviso ya se ve igual */
    }
  }

  e.waitUntil(
    Promise.all([
      self.registration.showNotification(aviso.title, {
        body: aviso.body || undefined,
        icon: './icon-192.png',
        badge: './icon-192.png',
        // La misma etiqueta que usa la aplicación cuando está abierta: si una
        // votación se abre y estás mirando, no suena dos veces.
        tag: aviso.kind || 'aviso',
        data: { url: aviso.url || '' },
      }),
      insignia(),
    ]),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  const ruta = e.notification.data && e.notification.data.url
  const destino = new URL(self.registration.scope)
  if (ruta) destino.hash = '#' + ruta

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.startsWith(self.registration.scope))
      if (abierta) {
        // `navigate` no está en todos los navegadores; si falla, al menos la
        // aplicación pasa al frente.
        if (ruta && typeof abierta.navigate === 'function') {
          return abierta
            .navigate(destino.href)
            .then((v) => (v || abierta).focus())
            .catch(() => abierta.focus())
        }
        return abierta.focus()
      }
      return self.clients.openWindow(destino.href)
    }),
  )
})
