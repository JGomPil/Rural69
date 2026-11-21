// =====================================================================
// Rural69 · ¿Qué peli suena? · Las reglas
// ---------------------------------------------------------------------
// Suenan treinta segundos de una banda sonora y la gente grita de qué
// película es. Como en el salón de toda la vida: a voces. El que pone
// la música hace de moderador y apunta quién la ha sacado.
//
// Tres decisiones que no son obvias:
//
//   · Suena en UN móvil, no en diez. Diez teléfonos medio segundo
//     desincronizados no es música, es ruido. Uno hace de altavoz —el
//     que esté más cerca del bafle— y ese mismo lleva el mando.
//   · No se escribe nada. Lo probé escrito y mata el juego: la gracia
//     está en el grito, y mientras uno teclea «la guerra de las
//     galaxias» la mesa ya lo ha dicho tres veces. Quien modera toca el
//     nombre del que la ha sacado y a la siguiente.
//   · Un punto por acierto, sin bonus por rapidez. Probé a dar doble
//     al que corre y lo quité: hay que explicarlo, y un juego de salón
//     que necesita explicar el marcador ya ha perdido.
//
// Los jugadores son nombres, no cuentas: aquí no juega el móvil de
// nadie, juega la gente que está en el sofá. Por eso no hay sillas que
// repartir como en el «¿Quién soy?», solo un móvil con el mando.
//
// Funciones puras con el azar y la hora inyectados, como los demás.
// =====================================================================

import type { Banda } from './bandas'

export interface JugadorB {
  nombre: string
  puntos: number
}

export type FaseB = 'sonando' | 'resuelta' | 'fin'

/**
 * Quién lleva la partida: la cuenta, para que solo ese móvil reproduzca
 * y apunte, y el nombre, para poder decirlo en las demás pantallas sin
 * salir a buscar a nadie.
 */
export interface Mando {
  perfil: string
  nombre: string
}

export interface RondaB {
  banda: Banda
  /** Quién la sacó, por nombre. `null` si se acabó el tiempo. */
  acertante: string | null
}

export interface PartidaB {
  version: 2
  /** Hora del envío. La mesa compartida la necesita para el desfase. */
  emitido: number
  jugadores: JugadorB[]
  /** Identificadores ya usados, para no repetir peli en la misma partida. */
  usadas: number[]
  ronda: RondaB
  /** La que se está jugando, de 1 a `rondas`. */
  numero: number
  rondas: number
  /** Segundos por ronda. Cero es sin reloj. */
  segundos: number
  /** Instante en que se acaba la cuenta atrás. `null` es reloj parado. */
  fin: number | null
  fase: FaseB
  /** Quién lleva la partida: pone la música y apunta los aciertos. */
  moderador: Mando | null
  historia: string[]
}

export interface OpcionesB {
  nombres: string[]
  rondas: number
  segundos: number
  moderador: Mando | null
}

/** De dónde salen las películas. Inyectado para poder probar sin JSON. */
export type SacaBanda = (usadas: number[], azar: () => number) => Banda | null

export function nuevaPartidaB(
  o: OpcionesB,
  saca: SacaBanda,
  azar: () => number = Math.random,
  ahora = Date.now(),
): PartidaB | null {
  const banda = saca([], azar)
  if (!banda) return null
  return {
    version: 2,
    emitido: ahora,
    jugadores: o.nombres.map((nombre) => ({ nombre, puntos: 0 })),
    usadas: [banda.id],
    ronda: { banda, acertante: null },
    numero: 1,
    rondas: o.rondas,
    segundos: o.segundos,
    // Arranca cuando suena la música, no al repartir: entre que uno
    // coge el móvil y le da al botón se iban diez segundos de ronda.
    fin: null,
    fase: 'sonando',
    moderador: o.moderador,
    historia: [],
  }
}

/**
 * La ha sacado alguien: punto y a destapar la película. Quien lo dice
 * es el móvil que lleva el mando, tocando el nombre del que ha gritado.
 *
 * Va por sitio en la lista y no por cuenta a propósito: el que grita
 * puede no tener móvil en la mano, o puede no tener cuenta siquiera.
 */
export function aciertaB(p: PartidaB, indice: number, ahora = Date.now()): PartidaB {
  if (p.fase !== 'sonando') return p
  const quien = p.jugadores[indice]
  if (!quien) return p
  return {
    ...p,
    emitido: ahora,
    jugadores: p.jugadores.map((j, i) => (i === indice ? { ...j, puntos: j.puntos + 1 } : j)),
    ronda: { ...p.ronda, acertante: quien.nombre },
    fin: null,
    fase: 'resuelta',
    historia: [`${quien.nombre} sacó «${p.ronda.banda.peli}».`, ...p.historia],
  }
}

/**
 * Ha empezado a sonar: ahora sí corre el reloj. Lo manda el móvil que
 * pone la música, que es el único que sabe cuándo ha empezado de
 * verdad. Si ya estaba corriendo, no lo toca.
 */
export function arrancaElRelojB(p: PartidaB, ahora = Date.now()): PartidaB {
  if (p.fase !== 'sonando' || p.segundos <= 0 || p.fin !== null) return p
  return { ...p, emitido: ahora, fin: ahora + p.segundos * 1000 }
}

/** Se acabó el tiempo sin que nadie la sacara. */
export function seAcabaElTiempoB(p: PartidaB, ahora = Date.now()): PartidaB {
  if (p.fase !== 'sonando') return p
  return {
    ...p,
    emitido: ahora,
    fin: null,
    fase: 'resuelta',
    historia: [`Nadie sacó «${p.ronda.banda.peli}».`, ...p.historia],
  }
}

/** Nos rendimos: que se vea cuál era. */
export const rindeteB = seAcabaElTiempoB

/** A la siguiente, o al marcador final si ya no quedan. */
export function siguienteB(p: PartidaB, saca: SacaBanda, azar: () => number = Math.random, ahora = Date.now()): PartidaB {
  if (p.fase !== 'resuelta') return p
  if (p.numero >= p.rondas) return { ...p, emitido: ahora, fase: 'fin' }
  const banda = saca(p.usadas, azar)
  if (!banda) return { ...p, emitido: ahora, fase: 'fin' }
  return {
    ...p,
    emitido: ahora,
    usadas: [...p.usadas, banda.id],
    ronda: { banda, acertante: null },
    numero: p.numero + 1,
    fin: null,
    fase: 'sonando',
  }
}

/** Otra partida con la misma gente, los mismos sitios y el marcador a cero. */
export function otraPartidaB(p: PartidaB, saca: SacaBanda, azar: () => number = Math.random, ahora = Date.now()): PartidaB | null {
  const banda = saca(p.usadas, azar)
  if (!banda) return null
  return {
    ...p,
    emitido: ahora,
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: 0 })),
    usadas: [...p.usadas, banda.id],
    ronda: { banda, acertante: null },
    numero: 1,
    fin: null,
    fase: 'sonando',
    historia: [],
  }
}

// --- El mando ---------------------------------------------------------

/**
 * «Que suene aquí»: este móvil se lleva la música y, con ella, el
 * mando. Si el que moderaba se ha ido a por hielo con el teléfono en el
 * bolsillo, cualquiera puede recogerlo sin montar una partida nueva.
 */
export function tomaElMandoB(p: PartidaB, perfil: string, nombre: string, ahora = Date.now()): PartidaB {
  if (p.moderador?.perfil === perfil) return p
  return {
    ...p,
    emitido: ahora,
    moderador: { perfil, nombre },
    historia: [`${nombre} pone la música.`, ...p.historia],
  }
}

// --- Cuentas de pantalla ---------------------------------------------

/** Segundos que quedan, con el desfase del reloj de este móvil. */
export function restanteDeB(p: PartidaB, desfase = 0, ahora = Date.now()): number {
  if (p.fin === null) return 0
  return Math.max(0, Math.ceil((p.fin - (ahora + desfase)) / 1000))
}

export function clasificacionB(p: PartidaB): JugadorB[] {
  return [...p.jugadores].sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre))
}

// --- Guardado en el propio móvil -------------------------------------

const LLAVE = 'rural69-quepeli'

export function guardaPartidaB(p: PartidaB | null): void {
  try {
    if (p) localStorage.setItem(LLAVE, JSON.stringify(p))
    else localStorage.removeItem(LLAVE)
  } catch {
    // Sin sitio o en privado: se juega igual, solo que sin red de seguridad.
  }
}

export function leePartidaB(): PartidaB | null {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (!crudo) return null
    const p = JSON.parse(crudo) as PartidaB
    return p.version === 2 ? p : null
  } catch {
    return null
  }
}
