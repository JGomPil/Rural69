// =====================================================================
// Rural69 · No molestar de noche
// ---------------------------------------------------------------------
// Los avisos nacen cuando alguien hace algo, y alguien hace cosas a las
// dos de la mañana. Un móvil vibrando en la mesilla porque un amigo ha
// propuesto una casa es la forma más rápida de que medio grupo apague
// los avisos para siempre, y entonces los recordatorios —que sí
// importan— tampoco llegan.
//
// Lo que se silencia es el empujón al móvil, no el aviso: la fila de
// `notifications` se crea igual y por la mañana está en la campana.
//
// OJO, esto está escrito dos veces: aquí, para poder decir en el perfil
// «ahora mismo estarías en silencio», y en la función `avisar`, que es
// la que decide de verdad porque es la que firma los envíos. Si cambia
// la regla, hay que cambiarla en los dos sitios.
// =====================================================================

/** La hora que es en España (0–23), que es la que entiende el grupo. */
export function horaEnEspanya(cuando: Date = new Date()): number {
  const texto = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(cuando)
  const h = Number.parseInt(texto, 10)
  return Number.isNaN(h) ? cuando.getHours() : h
}

/**
 * ¿Toca callarse a esta hora?
 *
 * La ventana normal cruza la medianoche (de 23 a 8), así que hay dos
 * formas de leerla y las dos hacen falta: si `desde` es menor que
 * `hasta` es un tramo del mismo día; si no, va de la noche a la mañana.
 * Con las dos horas iguales no hay silencio ninguno.
 */
export function enSilencio(hora: number, desde: number, hasta: number): boolean {
  if (desde === hasta) return false
  return desde < hasta ? hora >= desde && hora < hasta : hora >= desde || hora < hasta
}

/** `23` → `23:00`. Para los desplegables del perfil. */
export function horaBonita(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`
}
