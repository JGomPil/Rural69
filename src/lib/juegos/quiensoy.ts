// =====================================================================
// Rural69 · ¿Quién soy? · Las reglas
// ---------------------------------------------------------------------
// Cada uno es un famoso y no sabe cuál. Al empezar se reparte una carta
// por cabeza, y el móvil va pasando de mano en mano: el que lo tiene ve
// las cartas de TODOS LOS DEMÁS menos la suya, hace UNA pregunta a la
// mesa —«¿estoy vivo?», «¿canto?»— y se la contestan sí o no.
//
// Una pregunta por turno, y el móvil cambia de manos. El juego se acaba
// en cuanto alguien adivina quién es, pero se puede seguir hasta que
// acierten todos: eso se pregunta en el momento, no antes.
//
// Que el aparato enseñe las cartas de los demás es justo lo que lo hace
// jugable sin papelitos ni cintas en la frente: la información que cada
// cual no puede tener es la suya, y de eso se encarga la pantalla.
//
// Funciones puras, con el azar y la hora inyectados, para poder probar
// las reglas sin cronómetro ni navegador.
// =====================================================================

import { cartasDe, type Carta, type Categoria } from './famosos'

export interface Jugador {
  nombre: string
  carta: Carta
  /** Puesto en el que acertó: 1 el primero. Cero, todavía no. */
  puesto: number
  /** Preguntas hechas. Es el mérito: acertar con menos. */
  preguntas: number
}

export type Fase = 'pasa' | 'mirando' | 'alguien-acerto' | 'fin'

export interface Juego {
  /** Marca del formato: si cambia, el juego guardado se tira. */
  version: 2
  jugadores: Jugador[]
  categoria: Categoria | 'mezclado'
  /** A quién le toca, por posición en la lista. */
  turno: number
  vuelta: number
  /** Vueltas que se juegan. `null` es sin límite. */
  vueltas: number | null
  /** Segundos por turno. Cero es sin reloj. */
  segundos: number
  /** Instante en que se acaba la cuenta atrás. `null` es reloj parado. */
  fin: number | null
  fase: Fase
  /** Si ya se decidió seguir después del primer acierto. */
  seguir: boolean
  /** Lo que ha ido pasando, lo último arriba. */
  historia: string[]
}

export interface Opciones {
  nombres: string[]
  categoria: Categoria | 'mezclado'
  segundos: number
  vueltas: number | null
}

/** Fisher-Yates, con el azar inyectado para poder probarlo. */
export function baraja<T>(cartas: T[], azar: () => number = Math.random): T[] {
  const copia = [...cartas]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1)) % (i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Cuánta gente admite una categoría: una carta por cabeza. */
export function cuantosCaben(categoria: Categoria | 'mezclado'): number {
  return cartasDe(categoria).length
}

export function nuevoJuego(o: Opciones, azar: () => number = Math.random): Juego {
  const mazo = baraja(cartasDe(o.categoria), azar)
  return {
    version: 2,
    jugadores: o.nombres.map((nombre, i) => ({
      nombre,
      carta: mazo[i % mazo.length],
      puesto: 0,
      preguntas: 0,
    })),
    categoria: o.categoria,
    turno: 0,
    vuelta: 1,
    vueltas: o.vueltas,
    segundos: o.segundos,
    fin: null,
    fase: 'pasa',
    seguir: false,
    historia: [],
  }
}

/** Las cartas que este jugador puede ver: las de los demás. */
export function loQueVe(j: Juego): Jugador[] {
  return j.jugadores.filter((_, i) => i !== j.turno)
}

export const quedanPorAcertar = (j: Juego): Jugador[] => j.jugadores.filter((p) => p.puesto === 0)

/** Coge el móvil y mira: empieza su turno y, si lo hay, su reloj. */
export function mira(j: Juego, ahora = Date.now()): Juego {
  if (j.fase !== 'pasa') return j
  return { ...j, fase: 'mirando', fin: j.segundos > 0 ? ahora + j.segundos * 1000 : null }
}

/** El siguiente que todavía no sepa quién es. */
function pasaElMovil(j: Juego, apunte: string): Juego {
  const faltan = quedanPorAcertar(j)
  if (faltan.length === 0) return { ...j, fase: 'fin', fin: null, historia: [apunte, ...j.historia] }

  let turno = j.turno
  let vuelta = j.vuelta
  do {
    turno = (turno + 1) % j.jugadores.length
    if (turno === 0) vuelta += 1
  } while (j.jugadores[turno].puesto !== 0)

  const seAcaba = j.vueltas !== null && vuelta > j.vueltas
  return {
    ...j,
    turno,
    vuelta,
    fin: null,
    fase: seAcaba ? 'fin' : 'pasa',
    historia: [apunte, ...j.historia],
  }
}

/** Ha hecho su pregunta y no lo tiene claro: el móvil cambia de manos. */
export function pasa(j: Juego): Juego {
  if (j.fase !== 'mirando') return j
  const jugadores = j.jugadores.map((p, i) => (i === j.turno ? { ...p, preguntas: p.preguntas + 1 } : p))
  const quien = j.jugadores[j.turno].nombre
  return pasaElMovil({ ...j, jugadores }, `${quien} preguntó y sigue sin saberlo.`)
}

/** Se le acabó el tiempo de preguntar. */
export function seAcabaElTiempo(j: Juego): Juego {
  if (j.fase !== 'mirando') return j
  return pasaElMovil(j, `A ${j.jugadores[j.turno].nombre} se le acabó el tiempo.`)
}

/**
 * ¡Lo ha adivinado! Si es el primero y queda gente, se para a preguntar
 * si se sigue hasta que acierten todos.
 */
export function acierta(j: Juego): Juego {
  if (j.fase !== 'mirando') return j
  const puesto = j.jugadores.filter((p) => p.puesto > 0).length + 1
  const jugadores = j.jugadores.map((p, i) =>
    i === j.turno ? { ...p, puesto, preguntas: p.preguntas + 1 } : p,
  )
  const quien = j.jugadores[j.turno]
  const apunte = `¡${quien.nombre} era ${quien.carta.nombre}! Acertó con ${
    quien.preguntas + 1
  } ${quien.preguntas + 1 === 1 ? 'pregunta' : 'preguntas'}.`
  const conAcierto = { ...j, jugadores }

  if (quedanPorAcertar(conAcierto).length === 0) {
    return { ...conAcierto, fase: 'fin', fin: null, historia: [apunte, ...j.historia] }
  }
  // El primer acierto acaba el juego salvo que decidan seguir. Se
  // pregunta aquí, con el acierto caliente, y no al empezar: antes de
  // jugar nadie sabe si va a querer seguir.
  if (!conAcierto.seguir) {
    return { ...conAcierto, fase: 'alguien-acerto', fin: null, historia: [apunte, ...j.historia] }
  }
  return pasaElMovil(conAcierto, apunte)
}

/** Deciden seguir hasta que acierten todos. */
export function seguirJugando(j: Juego): Juego {
  if (j.fase !== 'alguien-acerto') return j
  return pasaElMovil({ ...j, seguir: true, fase: 'mirando' }, 'Seguís hasta que acierten todos.')
}

/** O lo dejan aquí. */
export function terminaAqui(j: Juego): Juego {
  return { ...j, fase: 'fin', fin: null }
}

export function otraVez(j: Juego, azar: () => number = Math.random): Juego {
  return nuevoJuego(
    {
      nombres: j.jugadores.map((p) => p.nombre),
      categoria: j.categoria,
      segundos: j.segundos,
      vueltas: j.vueltas,
    },
    azar,
  )
}

/** Primero los que acertaron, por orden; detrás los que no. */
export function clasificacion(j: Juego): Jugador[] {
  return [...j.jugadores].sort((a, b) => {
    if (a.puesto === b.puesto) return a.preguntas - b.preguntas
    if (a.puesto === 0) return 1
    if (b.puesto === 0) return -1
    return a.puesto - b.puesto
  })
}

/** Lo que queda de cuenta atrás, en segundos. */
export function restanteDe(j: Juego, ahora = Date.now()): number {
  if (j.fin === null) return j.segundos
  return Math.max(0, (j.fin - ahora) / 1000)
}

// ---------------------------------------------------------------------
// Guardar en el aparato
// ---------------------------------------------------------------------
// Mismo motivo que en el Furor: el móvil se bloquea solo, y una partida
// a medias perdida es una partida que no se repite.

const LLAVE = 'rural69-quiensoy'

export function guardaJuego(j: Juego | null): void {
  try {
    if (j === null) localStorage.removeItem(LLAVE)
    else localStorage.setItem(LLAVE, JSON.stringify(j))
  } catch {
    // Sin sitio o en incógnito: se juega igual.
  }
}

export function leeJuego(): Juego | null {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (!crudo) return null
    const j = JSON.parse(crudo) as Juego
    if (j?.version !== 2 || !Array.isArray(j.jugadores) || j.jugadores.length < 2) return null
    return j
  } catch {
    return null
  }
}
