// =====================================================================
// Rural69 · ¿Quién soy? · Las reglas
// ---------------------------------------------------------------------
// El de la carta en la frente. El móvil va pasando de mano en mano: el
// que lo tiene se lo pone en la frente sin mirar, los demás ven el
// nombre y contestan sí o no a sus preguntas.
//
// Dos decisiones que cambian cómo se juega:
//
//   · Con reloj, el turno es una ráfaga: cada acierto saca carta nueva
//     para el mismo jugador hasta que se acaba el tiempo. Sin reloj, el
//     turno es una carta y ya: aciertas o pasas, y el móvil cambia de
//     manos. Son los dos juegos que la gente espera, y la diferencia
//     sale sola de si hay cronómetro o no.
//   · Una carta que sale no vuelve. Nada mata más rápido una partida
//     que repetir a Nadal tres veces en media hora.
//
// Esto se juega en un solo aparato, así que aquí no hay servidor ni
// moderador: lo que hay es un mazo, un marcador y un turno. Las
// funciones son puras y reciben el azar y la hora, para poder probarlas.
// =====================================================================

import { cartasDe, type Carta, type Categoria } from './famosos'

export interface Jugador {
  nombre: string
  puntos: number
}

export type Fase = 'pasa' | 'jugando' | 'fin'

export interface Juego {
  /** Marca del formato: si cambia, el juego guardado se tira. */
  version: 1
  jugadores: Jugador[]
  categoria: Categoria | 'mezclado'
  /** Lo que queda del mazo, ya barajado. Una carta que sale no vuelve. */
  mazo: Carta[]
  carta: Carta | null
  /** A quién le toca, por posición en la lista. */
  turno: number
  /** Segundos por turno. Cero es sin reloj. */
  segundos: number
  /** Instante en que se acaba la cuenta atrás. `null` es reloj parado. */
  fin: number | null
  vuelta: number
  vueltas: number
  fase: Fase
  /** Lo que ha ido pasando, lo último arriba. */
  historia: string[]
}

export interface Opciones {
  nombres: string[]
  categoria: Categoria | 'mezclado'
  segundos: number
  vueltas: number
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

export function nuevoJuego(o: Opciones, azar: () => number = Math.random): Juego {
  return {
    version: 1,
    jugadores: o.nombres.map((nombre) => ({ nombre, puntos: 0 })),
    categoria: o.categoria,
    mazo: baraja(cartasDe(o.categoria), azar),
    carta: null,
    turno: 0,
    segundos: o.segundos,
    fin: null,
    vuelta: 1,
    vueltas: o.vueltas,
    fase: 'pasa',
    historia: [],
  }
}

/** El que tiene el móvil se lo pone en la frente y le da a mostrar. */
export function muestra(j: Juego, ahora = Date.now()): Juego {
  if (j.fase === 'fin' || j.mazo.length === 0) return j
  const [carta, ...resto] = j.mazo
  return {
    ...j,
    carta,
    mazo: resto,
    fase: 'jugando',
    fin: j.segundos > 0 ? ahora + j.segundos * 1000 : null,
  }
}

/** Siguiente carta para el mismo jugador: solo con reloj y con tiempo. */
function sigueElMismo(j: Juego, ahora: number): boolean {
  return j.segundos > 0 && j.fin !== null && j.fin > ahora && j.mazo.length > 0
}

function cambiaDeManos(j: Juego, apunte: string): Juego {
  const turno = (j.turno + 1) % j.jugadores.length
  const vuelta = turno === 0 ? j.vuelta + 1 : j.vuelta
  const seAcaba = vuelta > j.vueltas || j.mazo.length === 0
  return {
    ...j,
    carta: null,
    fin: null,
    turno,
    vuelta,
    fase: seAcaba ? 'fin' : 'pasa',
    historia: [apunte, ...j.historia],
  }
}

/** Lo ha adivinado: un punto. */
export function acierta(j: Juego, ahora = Date.now()): Juego {
  if (j.fase !== 'jugando' || !j.carta) return j
  const jugadores = j.jugadores.map((p, i) => (i === j.turno ? { ...p, puntos: p.puntos + 1 } : p))
  const apunte = `${j.jugadores[j.turno].nombre} adivinó «${j.carta.nombre}».`
  const conPunto = { ...j, jugadores }
  if (sigueElMismo(j, ahora)) {
    const [carta, ...resto] = j.mazo
    return { ...conPunto, carta, mazo: resto, historia: [apunte, ...j.historia] }
  }
  return cambiaDeManos(conPunto, apunte)
}

/** No cae: se deja pasar, sin punto. */
export function pasa(j: Juego, ahora = Date.now()): Juego {
  if (j.fase !== 'jugando' || !j.carta) return j
  const apunte = `${j.jugadores[j.turno].nombre} dejó pasar «${j.carta.nombre}».`
  if (sigueElMismo(j, ahora)) {
    const [carta, ...resto] = j.mazo
    return { ...j, carta, mazo: resto, historia: [apunte, ...j.historia] }
  }
  return cambiaDeManos(j, apunte)
}

/** Se acabó el tiempo del turno. */
export function seAcabaElTiempo(j: Juego): Juego {
  if (j.fase !== 'jugando') return j
  return cambiaDeManos(j, `A ${j.jugadores[j.turno].nombre} se le acabó el tiempo.`)
}

/** El que lleva el móvil decide terminar antes. */
export function termina(j: Juego): Juego {
  return { ...j, fase: 'fin', fin: null, carta: null }
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

/** De más a menos puntos. Los empatados quedan como estaban. */
export function clasificacion(j: Juego): Jugador[] {
  return [...j.jugadores].sort((a, b) => b.puntos - a.puntos)
}

/** Lo que queda de cuenta atrás, en segundos. */
export function restanteDe(j: Juego, ahora = Date.now()): number {
  if (j.fin === null) return j.segundos
  return Math.max(0, (j.fin - ahora) / 1000)
}

// ---------------------------------------------------------------------
// Guardar en el aparato
// ---------------------------------------------------------------------
// Mismo motivo que en el Furor: el móvil se bloquea solo y una partida a
// medias perdida es una partida que no se repite.

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
    if (j?.version !== 1 || !Array.isArray(j.jugadores) || j.jugadores.length < 2) return null
    return j
  } catch {
    return null
  }
}
