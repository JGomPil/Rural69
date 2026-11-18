// =====================================================================
// Rural69 · Lo último que se vio, guardado en el aparato
// ---------------------------------------------------------------------
// En una casa rural no hay línea, y la lista de la compra y el equipaje
// son justo lo que se mira allí. Hasta ahora la aplicación abría —el
// service worker guarda el armazón— pero no traía ni un dato: todas las
// pantallas decían «sin conexión con el servidor».
//
// Esto guarda la respuesta de cada consulta según se lee, para poder
// pintarla cuando no hay red. Dos reglas, a propósito:
//
//  · Es una copia, no una verdad. En cuanto hay red se pide lo de verdad
//    y lo guardado se tira. Nada se decide a partir de esto.
//  · Se guarda en `localStorage`, no en IndexedDB. Lo que hay que
//    guardar son unas pocas listas de filas —la compra de una escapada
//    son 50 líneas, unos 15 KB—, y a cambio esto se lee de golpe al
//    pintar, sin promesas ni esperas.
//
// Si el navegador no deja guardar (navegación privada, almacenamiento
// lleno, cuota agotada) no pasa nada: la aplicación funciona como antes,
// solo que sin copia.
// =====================================================================

const PREFIJO = 'rural69-copia:'

/** Más de esto no se guarda: un chat largo llenaría la cuota él solo. */
const MAXIMO_BYTES = 300_000

interface Guardado<T> {
  datos: T
  cuando: number
}

export function guarda(clave: string, datos: unknown): void {
  try {
    const texto = JSON.stringify({ datos, cuando: Date.now() })
    if (texto.length > MAXIMO_BYTES) return
    localStorage.setItem(PREFIJO + clave, texto)
  } catch {
    // Cuota llena: se tira toda la copia y se intenta una vez más. Perder
    // copias viejas para poder guardar la de ahora es justo lo que se
    // quiere; si tampoco cabe, se sigue sin copia y ya está.
    try {
      limpia()
      localStorage.setItem(PREFIJO + clave, JSON.stringify({ datos, cuando: Date.now() }))
    } catch {
      /* sin almacenamiento: la aplicación funciona igual, sin copia */
    }
  }
}

export function lee<T>(clave: string): Guardado<T> | null {
  try {
    const texto = localStorage.getItem(PREFIJO + clave)
    if (!texto) return null
    const valor = JSON.parse(texto) as Guardado<T>
    return valor && 'datos' in valor ? valor : null
  } catch {
    return null
  }
}

export function olvida(clave: string): void {
  try {
    localStorage.removeItem(PREFIJO + clave)
  } catch {
    /* da igual */
  }
}

/** Borra todas las copias. Al salir de la sesión, y si se llena la cuota. */
export function limpia(): void {
  try {
    const claves: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIJO)) claves.push(k)
    }
    for (const k of claves) localStorage.removeItem(k)
  } catch {
    /* da igual */
  }
}
