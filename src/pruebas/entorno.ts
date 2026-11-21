// =====================================================================
// Rural69 · El mínimo navegador que las pruebas necesitan
// ---------------------------------------------------------------------
// Dos módulos que sí hay que probar —la copia local y la cola de cambios
// sin cobertura— hablan con `localStorage` y avisan por `window`. Montar
// un navegador entero (jsdom) para eso serían veinte megas de
// dependencia y varios segundos por tanda, así que aquí va lo justo: un
// almacén en memoria y un emisor de eventos.
// =====================================================================

const datos = new Map<string, string>()

const almacenFalso: Storage = {
  get length() {
    return datos.size
  },
  key: (i: number) => [...datos.keys()][i] ?? null,
  getItem: (k: string) => datos.get(k) ?? null,
  setItem: (k: string, v: string) => {
    datos.set(k, String(v))
  },
  removeItem: (k: string) => {
    datos.delete(k)
  },
  clear: () => datos.clear(),
}

Object.defineProperty(globalThis, 'localStorage', { value: almacenFalso, writable: true })

// `window` solo hace falta para `dispatchEvent` y `addEventListener`.
const ventana = new EventTarget()
Object.defineProperty(globalThis, 'window', { value: ventana, writable: true, configurable: true })
