// =====================================================================
// Rural69 · Juegos de oído · Las reglas
// ---------------------------------------------------------------------
// Suenan treinta segundos de algo y la mesa grita qué es. Con bandas
// sonoras sale el «¿Qué peli suena?»; con canciones de pop y rock, el
// «¿Qué canción suena?». El juego es el mismo y las reglas son estas,
// una sola vez: lo único que cambia es el repertorio y la palabra que
// se pinta en pantalla.
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

/** Un trozo de música del repertorio, ya resuelto contra la tienda. */
export interface Pista {
  /** El de la tienda. Sirve para no repetir y para pedir otra URL. */
  id: number
  /** Lo que hay que acertar: la película, o la canción. */
  titulo: string
  /** Otros nombres con los que se la conoce. Se dicen al destaparla. */
  alias: string[]
  anyo: number
  /** La letra pequeña del remate: de quién es, o qué tema suena. */
  pie: string
  /** Treinta segundos de música, en la CDN de la tienda. */
  preview: string
}

export interface Jugador {
  nombre: string
  puntos: number
}

export type Fase = 'sonando' | 'resuelta' | 'fin'

/**
 * Quién lleva la partida: la cuenta, para que solo ese móvil reproduzca
 * y apunte, y el nombre, para poder decirlo en las demás pantallas sin
 * salir a buscar a nadie.
 */
export interface Mando {
  perfil: string
  nombre: string
}

export interface Ronda {
  pista: Pista
  /** Quién la sacó, por nombre. `null` si se acabó el tiempo. */
  acertante: string | null
}

export interface Partida {
  /**
   * Sube cuando cambia la forma del estado, y entonces las partidas a
   * medias de la versión anterior se cierran solas en vez de pintarse
   * mal. La 2 era la del «¿Qué peli suena?» con la ficha dentro de
   * `ronda.banda`; ahora la ficha es una `Pista` y vale para los dos.
   */
  version: 3
  /** Hora del envío. La mesa compartida la necesita para el desfase. */
  emitido: number
  jugadores: Jugador[]
  /** Identificadores ya usados, para no repetir en la misma partida. */
  usadas: number[]
  ronda: Ronda
  /** La que se está jugando, de 1 a `rondas`. */
  numero: number
  rondas: number
  /** Segundos por ronda. Cero es sin reloj. */
  segundos: number
  /** Instante en que se acaba la cuenta atrás. `null` es reloj parado. */
  fin: number | null
  fase: Fase
  /** Quién lleva la partida: pone la música y apunta los aciertos. */
  moderador: Mando | null
  historia: string[]
}

export interface Opciones {
  nombres: string[]
  rondas: number
  segundos: number
  moderador: Mando | null
}

/** De dónde salen las pistas. Inyectado para poder probar sin JSON. */
export type SacaPista = (usadas: number[], azar: () => number) => Pista | null

export function nuevaPartida(
  o: Opciones,
  saca: SacaPista,
  azar: () => number = Math.random,
  ahora = Date.now(),
): Partida | null {
  const pista = saca([], azar)
  if (!pista) return null
  return {
    version: 3,
    emitido: ahora,
    jugadores: o.nombres.map((nombre) => ({ nombre, puntos: 0 })),
    usadas: [pista.id],
    ronda: { pista, acertante: null },
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
 * La ha sacado alguien: punto y a destapar. Quien lo dice es el móvil
 * que lleva el mando, tocando el nombre del que ha gritado.
 *
 * Va por sitio en la lista y no por cuenta a propósito: el que grita
 * puede no tener móvil en la mano, o puede no tener cuenta siquiera.
 */
export function acierta(p: Partida, indice: number, ahora = Date.now()): Partida {
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
    historia: [`${quien.nombre} sacó «${p.ronda.pista.titulo}».`, ...p.historia],
  }
}

/**
 * Ha empezado a sonar: ahora sí corre el reloj. Lo manda el móvil que
 * pone la música, que es el único que sabe cuándo ha empezado de
 * verdad. Si ya estaba corriendo, no lo toca.
 */
export function arrancaElReloj(p: Partida, ahora = Date.now()): Partida {
  if (p.fase !== 'sonando' || p.segundos <= 0 || p.fin !== null) return p
  return { ...p, emitido: ahora, fin: ahora + p.segundos * 1000 }
}

/** Se acabó el tiempo sin que nadie la sacara. */
export function seAcabaElTiempo(p: Partida, ahora = Date.now()): Partida {
  if (p.fase !== 'sonando') return p
  return {
    ...p,
    emitido: ahora,
    fin: null,
    fase: 'resuelta',
    historia: [`Nadie sacó «${p.ronda.pista.titulo}».`, ...p.historia],
  }
}

/** Nos rendimos: que se vea cuál era. */
export const rindete = seAcabaElTiempo

/** A la siguiente, o al marcador final si ya no quedan. */
export function siguiente(p: Partida, saca: SacaPista, azar: () => number = Math.random, ahora = Date.now()): Partida {
  if (p.fase !== 'resuelta') return p
  if (p.numero >= p.rondas) return { ...p, emitido: ahora, fase: 'fin' }
  const pista = saca(p.usadas, azar)
  if (!pista) return { ...p, emitido: ahora, fase: 'fin' }
  return {
    ...p,
    emitido: ahora,
    usadas: [...p.usadas, pista.id],
    ronda: { pista, acertante: null },
    numero: p.numero + 1,
    fin: null,
    fase: 'sonando',
  }
}

/** Otra partida con la misma gente, el mismo mando y el marcador a cero. */
export function otraPartida(
  p: Partida,
  saca: SacaPista,
  azar: () => number = Math.random,
  ahora = Date.now(),
): Partida | null {
  const pista = saca(p.usadas, azar)
  if (!pista) return null
  return {
    ...p,
    emitido: ahora,
    jugadores: p.jugadores.map((j) => ({ ...j, puntos: 0 })),
    usadas: [...p.usadas, pista.id],
    ronda: { pista, acertante: null },
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
export function tomaElMando(p: Partida, perfil: string, nombre: string, ahora = Date.now()): Partida {
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
export function restanteDe(p: Partida, desfase = 0, ahora = Date.now()): number {
  if (p.fin === null) return 0
  return Math.max(0, Math.ceil((p.fin - (ahora + desfase)) / 1000))
}

export function clasificacion(p: Partida): Jugador[] {
  return [...p.jugadores].sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre))
}

// --- El repertorio ----------------------------------------------------

/**
 * Saca una que no haya salido. Si se han acabado todas —partida larga
 * de verdad—, vuelve a empezar antes que dejar la ronda sin música.
 */
export function sacaPistaDe(todas: Pista[], usadas: number[], azar: () => number = Math.random): Pista | null {
  if (todas.length === 0) return null
  const gastadas = new Set(usadas)
  const quedan = todas.filter((p) => !gastadas.has(p.id))
  const monton = quedan.length > 0 ? quedan : todas
  return monton[Math.floor(azar() * monton.length)]
}

/**
 * La URL ha caducado: pedir otra a la tienda. Devuelve `null` si
 * tampoco hay manera, y entonces en pantalla sale el botón de saltar.
 */
export async function refrescaElSonido(id: number): Promise<string | null> {
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=ES`)
    if (!r.ok) return null
    const datos = JSON.parse(await r.text()) as { results?: { previewUrl?: string }[] }
    return datos.results?.[0]?.previewUrl ?? null
  } catch {
    return null
  }
}

// --- Guardado en el propio móvil -------------------------------------

/**
 * La copia local, una por juego: si la pantalla se bloquea en mitad de
 * una ronda, al volver la partida sigue ahí. Cada juego pasa su llave,
 * que si no el «¿Qué peli suena?» se comería la del de canciones.
 */
export function trastosDe(llave: string) {
  return {
    guarda(p: Partida | null): void {
      try {
        if (p) localStorage.setItem(llave, JSON.stringify(p))
        else localStorage.removeItem(llave)
      } catch {
        // Sin sitio o en privado: se juega igual, solo que sin red de seguridad.
      }
    },
    lee(): Partida | null {
      try {
        const crudo = localStorage.getItem(llave)
        if (!crudo) return null
        const p = JSON.parse(crudo) as Partida
        return p.version === 3 ? p : null
      } catch {
        return null
      }
    },
  }
}
