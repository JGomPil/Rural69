// =====================================================================
// Rural69 · ¿Quién soy? · Las reglas
// ---------------------------------------------------------------------
// Cada uno es un famoso y no sabe cuál. Al empezar se reparte una carta
// por cabeza y cada cual ve EN SU PROPIO MÓVIL las cartas de todos los
// demás, con la suya tapada. En su turno hace UNA pregunta a la mesa
// —«¿estoy vivo?», «¿canto?»— y se la contestan sí o no.
//
// Una pregunta por turno. El juego se acaba en cuanto alguien adivina
// quién es, pero se puede seguir hasta que acierten todos: eso se
// pregunta en el momento, no antes.
//
// Dos cosas que decidí a conciencia:
//
//   · Para acertar hay que ESCRIBIR el nombre. Decirlo en voz alta y
//     pulsar «ya lo sé» deja la puerta abierta al «si yo ya lo sabía»;
//     escrito, no hay discusión. Si falla, se le cuenta la pregunta y
//     pasa el turno, que para eso se la jugó.
//   · Cada móvil ocupa una silla y la silla se guarda en la partida, no
//     en el aparato: así el que entra desde otro teléfono sigue siendo
//     quien era, y el que todavía no ha dicho quién es no ve NINGUNA
//     carta, no vaya a verse la suya.
//
// Que el aparato enseñe las cartas de los demás es justo lo que lo hace
// jugable sin papelitos ni cintas en la frente: la información que cada
// cual no puede tener es la suya, y de eso se encarga la pantalla.
//
// Funciones puras, con el azar y la hora inyectados, para poder probar
// las reglas sin cronómetro ni navegador.
// =====================================================================

import { cartasDe, type Carta, type Categoria } from './famosos'
import { levanta, sienta, sitioDe } from './sillas'

export interface Jugador {
  nombre: string
  carta: Carta
  /** Puesto en el que acertó: 1 el primero. Cero, todavía no. */
  puesto: number
  /** Preguntas hechas. Es el mérito: acertar con menos. */
  preguntas: number
  /** Qué cuenta se ha sentado en esta silla. `null`, nadie todavía. */
  perfil: string | null
}

export type Fase = 'pasa' | 'mirando' | 'alguien-acerto' | 'fin'

export interface Juego {
  /** Marca del formato: si cambia, el juego guardado se tira. */
  version: 3
  /** Hora del envío. La mesa compartida la necesita para el desfase. */
  emitido: number
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
  /**
   * El último que se la jugó y falló, para contarlo en TODAS las
   * pantallas. Si solo lo viera quien falló, los demás verían pasar el
   * turno sin saber por qué, y la gracia es justo esa.
   */
  ultimoFallo: { nombre: string; dicho: string } | null
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

export function nuevoJuego(o: Opciones, azar: () => number = Math.random, ahora = Date.now()): Juego {
  const mazo = baraja(cartasDe(o.categoria), azar)
  return {
    version: 3,
    emitido: ahora,
    jugadores: o.nombres.map((nombre, i) => ({
      nombre,
      carta: mazo[i % mazo.length],
      puesto: 0,
      preguntas: 0,
      perfil: null,
    })),
    ultimoFallo: null,
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

/** En qué silla se ha sentado esta cuenta. `-1` si en ninguna. */
export function miSitio(j: Juego, perfil: string | null): number {
  return sitioDe(j.jugadores, perfil)
}

/**
 * Este móvil dice quién es. Una cuenta ocupa una silla y solo una: si
 * ya estaba sentada en otra, se levanta de aquella.
 */
export function tomaSitio(j: Juego, indice: number, perfil: string): Juego {
  if (indice < 0 || indice >= j.jugadores.length) return j
  return {
    ...j,
    jugadores: sienta(j.jugadores, indice, perfil),
    historia: [`${j.jugadores[indice].nombre} ya tiene su móvil.`, ...j.historia],
  }
}

/** Me he sentado donde no era: suelto la silla y vuelvo a elegir. */
export function dejaElSitio(j: Juego, perfil: string): Juego {
  if (!j.jugadores.some((p) => p.perfil === perfil)) return j
  return { ...j, jugadores: levanta(j.jugadores, perfil) }
}

/** Quita acentos, signos y mayúsculas: se compara lo que suena. */
function pelado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * ¿Lo que ha escrito es su famoso?
 *
 * Vale el nombre entero y vale una parte con la que no se confunda con
 * nadie: «nadal», «penelope cruz». Nada de aceptar dos letras, y nada
 * de exigir la tilde de Peñíscola: en un juego a voces, pedir el nombre
 * clavado con acentos es perder el tiempo discutiendo con el teclado.
 */
export function esLaCarta(texto: string, nombre: string): boolean {
  const dicho = pelado(texto)
  const real = pelado(nombre)
  if (dicho.length < 3) return false
  if (dicho === real) return true
  // Una palabra suya que no sea de relleno: «de», «la», «el»…
  const trozos = real.split(' ').filter((p) => p.length >= 4)
  if (trozos.includes(dicho)) return true
  // O un trozo largo del nombre, para los que escriben a medias.
  return dicho.length >= 5 && real.includes(dicho)
}

/**
 * Se la juega y lo escribe. Si acierta, a la clasificación; si no, se le
 * cuenta la pregunta y pasa el turno, que es el precio de arriesgar.
 */
export function intenta(j: Juego, texto: string): Juego {
  if (j.fase !== 'mirando') return j
  const quien = j.jugadores[j.turno]
  if (esLaCarta(texto, quien.carta.nombre)) return acierta(j)
  const jugadores = j.jugadores.map((p, i) => (i === j.turno ? { ...p, preguntas: p.preguntas + 1 } : p))
  return pasaElMovil(
    { ...j, jugadores, ultimoFallo: { nombre: quien.nombre, dicho: texto.trim() } },
    `${quien.nombre} dijo «${texto.trim()}» y no era.`,
  )
}

/** Coge el móvil y mira: empieza su turno y, si lo hay, su reloj. */
export function mira(j: Juego, ahora = Date.now()): Juego {
  if (j.fase !== 'pasa') return j
  // Al empezar un turno nuevo se borra el fallo del anterior: ya se contó.
  return {
    ...j,
    fase: 'mirando',
    ultimoFallo: null,
    fin: j.segundos > 0 ? ahora + j.segundos * 1000 : null,
  }
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
 * si se sigue hasta que acierten todos. Se llega aquí desde `intenta`,
 * que es quien comprueba lo que ha escrito.
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

/** Otra partida: cartas nuevas, pero cada uno se queda en su silla. */
export function otraVez(j: Juego, azar: () => number = Math.random, ahora = Date.now()): Juego {
  const nuevo = nuevoJuego(
    {
      nombres: j.jugadores.map((p) => p.nombre),
      categoria: j.categoria,
      segundos: j.segundos,
      vueltas: j.vueltas,
    },
    azar,
    ahora,
  )
  return {
    ...nuevo,
    jugadores: nuevo.jugadores.map((p, i) => ({ ...p, perfil: j.jugadores[i]?.perfil ?? null })),
  }
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
    if (j?.version !== 3 || !Array.isArray(j.jugadores) || j.jugadores.length < 2) return null
    return j
  } catch {
    return null
  }
}
