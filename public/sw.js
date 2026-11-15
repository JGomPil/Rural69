// Service worker mínimo de Rural69.
//
// Solo existe para que el móvil ofrezca «Añadir a la pantalla de inicio» y la
// app se abra a pantalla completa con su icono. A propósito no guarda nada en
// caché: con GitHub Pages, una caché mal invalidada deja a la gente con una
// versión vieja y sin manera fácil de arreglarlo.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
