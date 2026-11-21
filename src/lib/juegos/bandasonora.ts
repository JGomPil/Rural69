// =====================================================================
// Rural69 · ¿Qué peli suena? · Las reglas
// ---------------------------------------------------------------------
// Suenan treinta segundos de una banda sonora y hay que decir de qué
// película es. Escribiéndolo, como en el «¿Quién soy?»: decirlo a
// voces y luego discutir quién lo dijo antes no lo arregla nadie, y
// escrito lo arregla el reloj del servidor.
//
// Tres decisiones que no son obvias:
//
//   · Suena en UN móvil, no en diez. Diez teléfonos medio segundo
//     desincronizados no es música, es ruido. Uno hace de altavoz —el
//     que esté más cerca del bafle— y los demás solo ven y escriben.
//     Quien hace de altavoz juega igual: la música no le dice nada que
//     no oigan los demás.
//   · Un punto por acierto, sin bonus por rapidez. Probé a dar doble
//     al que corre y lo quité: hay que explicarlo, y un juego de salón
//     que necesita explicar el marcador ya ha perdido.
//   · El que falla, falla en público. Su intento sale en todas las
//     pantallas y puede volver a probar. Sin penalización: la gracia
//     está en el «¡¿Tiburón?!», no en castigar.
//
// Funciones puras con el azar y la hora inyectados, como los demás.
// =====================================================================

import { levanta, sienta, sitioDe } from './sillas'
import type { Banda } from './bandas'

export interface JugadorB {
  nombre: string
  /** Qué cuenta se ha sentado aquí. `null`, nadie todavía. */
  perfil: string | null
  puntos: number
}

export type FaseB = 'sonando' | 'resuelta' | 'fin'

export interface RondaB {
  banda: Banda
  /** Quién la sacó, por nombre. `null` si se acabó el tiempo. */
  acertante: string | null
  /** Lo que ha dicho la gente y no era. Se ve en todas las pantallas. */
  fallos: { nombre: string; dicho: string }[]
}

export interface PartidaB {
  version: 1
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
  /** Qué cuenta hace de altavoz. Es la única que reproduce. */
  altavoz: string | null
  historia: string[]
}

export interface OpcionesB {
  nombres: string[]
  rondas: number
  segundos: number
  altavoz: string | null
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
    version: 1,
    emitido: ahora,
    jugadores: o.nombres.map((nombre) => ({ nombre, perfil: null, puntos: 0 })),
    usadas: [banda.id],
    ronda: { banda, acertante: null, fallos: [] },
    numero: 1,
    rondas: o.rondas,
    segundos: o.segundos,
    // Arranca cuando suena la música, no al repartir: entre que uno
    // coge el móvil y le da al botón se iban diez segundos de ronda.
    fin: null,
    fase: 'sonando',
    altavoz: o.altavoz,
    historia: [],
  }
}

/** Quita acentos, signos y mayúsculas: se compara lo que suena. */
function pelado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** «el», «la», «los»… delante no cuentan: nadie escribe el artículo. */
function sinArticulo(texto: string): string {
  return texto.replace(/^(el|la|los|las|un|una|unos|unas|the|a) /, '')
}

/**
 * ¿Lo que ha escrito es la película?
 *
 * Vale el título, valen los alias que lleva cada ficha —«Star Wars» por
 * «La guerra de las galaxias»— y vale un trozo largo con el que no se
 * confunda: «piratas» por «Piratas del Caribe». Y vale al revés, porque
 * medio mundo escribe «la de los piratas del caribe».
 */
export function esLaPeli(texto: string, banda: Banda): boolean {
  const dicho = sinArticulo(pelado(texto))
  if (dicho.length < 2) return false
  const nombres = [banda.peli, ...banda.alias].map((n) => sinArticulo(pelado(n)))
  for (const real of nombres) {
    if (dicho === real) return true
    if (dicho.length >= 5 && real.includes(dicho)) return true
    if (real.length >= 4 && dicho.includes(real)) return true
  }
  return false
}

const nombreDe = (p: PartidaB, perfil: string | null): string =>
  p.jugadores.find((j) => j.perfil === perfil)?.nombre ?? 'Alguien'

/**
 * Alguien se moja. Si acierta, punto y a la siguiente; si no, su
 * intento se queda escrito para que lo vea la mesa y puede repetir.
 *
 * Va por SILLA y no por cuenta a propósito: sin línea con el servidor
 * se juega con un solo móvil que va pasando, y ahí el punto hay que
 * poder dárselo a quien lo ha dicho en voz alta.
 */
export function intentaB(p: PartidaB, indice: number, texto: string, ahora = Date.now()): PartidaB {
  if (p.fase !== 'sonando') return p
  const dicho = texto.trim()
  if (!dicho) return p
  const quien = p.jugadores[indice]?.nombre ?? 'Alguien'
  if (!esLaPeli(dicho, p.ronda.banda)) {
    return {
      ...p,
      emitido: ahora,
      ronda: { ...p.ronda, fallos: [{ nombre: quien, dicho }, ...p.ronda.fallos].slice(0, 12) },
    }
  }
  return {
    ...p,
    emitido: ahora,
    jugadores: p.jugadores.map((j, i) => (i === indice ? { ...j, puntos: j.puntos + 1 } : j)),
    ronda: { ...p.ronda, acertante: quien },
    fin: null,
    fase: 'resuelta',
    historia: [`${quien} acertó «${p.ronda.banda.peli}».`, ...p.historia],
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
    ronda: { banda, acertante: null, fallos: [] },
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
    ronda: { banda, acertante: null, fallos: [] },
    numero: 1,
    fin: null,
    fase: 'sonando',
    historia: [],
  }
}

// --- Sillas y altavoz ------------------------------------------------

export const miSitioB = (p: PartidaB, perfil: string | null): number => sitioDe(p.jugadores, perfil)

export function tomaSitioB(p: PartidaB, indice: number, perfil: string, ahora = Date.now()): PartidaB {
  if (indice < 0 || indice >= p.jugadores.length) return p
  return {
    ...p,
    emitido: ahora,
    jugadores: sienta(p.jugadores, indice, perfil),
    // El primero que se sienta se queda de altavoz si no había ninguno.
    altavoz: p.altavoz ?? perfil,
  }
}

export function dejaElSitioB(p: PartidaB, perfil: string, ahora = Date.now()): PartidaB {
  if (!p.jugadores.some((j) => j.perfil === perfil)) return p
  return {
    ...p,
    emitido: ahora,
    jugadores: levanta(p.jugadores, perfil),
    altavoz: p.altavoz === perfil ? null : p.altavoz,
  }
}

/** «Que suene aquí»: este móvil se pone al lado del altavoz. */
export function ponAltavoz(p: PartidaB, perfil: string, ahora = Date.now()): PartidaB {
  if (p.altavoz === perfil) return p
  return {
    ...p,
    emitido: ahora,
    altavoz: perfil,
    historia: [`${nombreDe(p, perfil)} pone la música.`, ...p.historia],
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
    return p.version === 1 ? p : null
  } catch {
    return null
  }
}
