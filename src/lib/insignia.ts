// =====================================================================
// Rural69 · El número en el icono
// ---------------------------------------------------------------------
// La campana de dentro solo se ve si ya has abierto la aplicación, que es
// justo cuando ya no hace falta. Esto es lo de fuera: el circulito con el
// número sobre el icono de la pantalla de inicio, el mismo que llevan el
// correo y WhatsApp.
//
// Funciona en una aplicación instalada (en el iPhone, añadida a la
// pantalla de inicio; en Android y en el escritorio, instalada desde el
// navegador). En una pestaña normal no hace nada, y por eso todo esto
// falla en silencio: no es un error, es que ahí no existe.
//
// Lo ponen dos sitios, cada uno cuando le toca:
//
//   · La aplicación, cada vez que cambia la cuenta de avisos sin leer:
//     así se apaga en el momento en que abres el buzón.
//   · El service worker, al llegar un empujón con la aplicación cerrada,
//     con la cuenta que manda el servidor dentro del aviso.
// =====================================================================

interface ConInsignia {
  setAppBadge?: (cuenta?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

function navegador(): ConInsignia | null {
  if (typeof navigator === 'undefined') return null
  return navigator as unknown as ConInsignia
}

/** ¿Sabe este navegador poner un número en el icono? */
export function sabePonerInsignia(): boolean {
  const n = navegador()
  return Boolean(n && typeof n.setAppBadge === 'function')
}

/**
 * Pone el número en el icono, o lo quita si no hay nada sin leer.
 *
 * Nunca lanza: un navegador que no sabe hacerlo, una pestaña que no es
 * una aplicación instalada o un permiso que falta no son motivo para
 * romper nada. Si no se puede, no se pone y ya está.
 */
export async function ponInsignia(cuenta: number): Promise<void> {
  const n = navegador()
  if (!n) return
  try {
    if (cuenta > 0) await n.setAppBadge?.(cuenta)
    else await n.clearAppBadge?.()
  } catch {
    // Sin insignia. La campana de dentro sigue diciendo lo mismo.
  }
}
