// =====================================================================
// Rural69 · Furor · Las reglas
// ---------------------------------------------------------------------
// Esto es la prueba «Tienes la palabra» del programa de Antena 3: sale
// una palabra, los dos equipos cantan por turnos canciones que la
// contengan, y el que se queda en blanco —o repite una canción ya
// cantada— le regala un MINIPUNTO al contrario. A los tres minipuntos,
// punto y palabra nueva.
//
// No hay meta ni ganador automático: manda el moderador. Puede subir y
// bajar el marcador cuando le parezca, y la partida se acaba cuando él
// diga, que es como acaban estas cosas de verdad.
//
// Aquí dentro no hay pantalla: son funciones que reciben una partida y
// devuelven otra, con el azar y la hora inyectados. Así las reglas se
// prueban sin cronómetro y sin navegador.
//
// La hora de fin de la cuenta atrás vive DENTRO de la partida, no en la
// pantalla. Parece un detalle y es lo que permite que la cuenta atrás
// sea la misma en todos los móviles: se comparte un instante, no unos
// segundos que cada aparato contaría a su manera.
// =====================================================================

import { PALABRAS, eligePalabra } from './palabras'

export type Lado = 'a' | 'b'

export const otroLado = (lado: Lado): Lado => (lado === 'a' ? 'b' : 'a')

export interface Equipo {
  nombre: string
  /** Ids de los integrantes del grupo. Se puede jugar sin repartir a nadie. */
  gente: string[]
  puntos: number
  /** Minipuntos de la prueba en curso. Se borran al ganar el punto. */
  minipuntos: number
}

export interface Partida {
  /** Marca del formato: si cambia, la partida guardada se tira. */
  version: 2
  equipos: Record<Lado, Equipo>
  /** A quién le toca cantar ahora mismo. */
  turno: Lado
  /** Quién abrió la palabra actual. Alterna con cada palabra nueva. */
  abre: Lado
  palabra: string
  /** Palabras que ya han salido, para no repetirlas. */
  usadas: string[]
  /** Canciones encadenadas con esta palabra. Solo sirve para fardar. */
  cantadas: number
  /** Lo que tiene cada equipo para arrancar a cantar. */
  segundos: number
  /** Minipuntos que valen un punto. En el programa, tres. */
  minipuntosPorPunto: number
  /**
   * Cuándo se acaba la cuenta atrás, en hora del moderador. `null` es
   * reloj parado: entre palabra y palabra no corre el tiempo.
   */
  fin: number | null
  /** Hora del moderador al publicar, para corregir el desfase de relojes. */
  emitido: number
  /** Lo que ha ido pasando, lo último arriba. */
  historia: string[]
}

export interface Opciones {
  nombreA: string
  nombreB: string
  genteA: string[]
  genteB: string[]
  segundos: number
  minipuntosPorPunto?: number
}

/** Quién empieza se echa a suertes, y eso marca toda la partida. */
export function nuevaPartida(o: Opciones, azar: () => number = Math.random, ahora = Date.now()): Partida {
  const abre: Lado = azar() < 0.5 ? 'a' : 'b'
  const palabra = eligePalabra([], azar)
  return {
    version: 2,
    equipos: {
      a: { nombre: o.nombreA, gente: o.genteA, puntos: 0, minipuntos: 0 },
      b: { nombre: o.nombreB, gente: o.genteB, puntos: 0, minipuntos: 0 },
    },
    turno: abre,
    abre,
    palabra,
    usadas: [palabra],
    cantadas: 0,
    segundos: o.segundos,
    minipuntosPorPunto: o.minipuntosPorPunto ?? 3,
    fin: null,
    emitido: ahora,
    historia: [`Empieza ${abre === 'a' ? o.nombreA : o.nombreB}, por sorteo. A ${o.segundos} segundos por canción.`],
  }
}

/** Se pone el reloj en marcha. */
export function arranca(p: Partida, ahora = Date.now()): Partida {
  return { ...p, fin: ahora + p.segundos * 1000 }
}

/** Se para el reloj sin castigo: una pausa, una discusión, lo que sea. */
export function para(p: Partida): Partida {
  return { ...p, fin: null }
}

/** Han cantado a tiempo: la pelota pasa al otro equipo con el reloj a cero. */
export function cantada(p: Partida, ahora = Date.now()): Partida {
  return { ...p, turno: otroLado(p.turno), cantadas: p.cantadas + 1, fin: ahora + p.segundos * 1000 }
}

export type Motivo = 'tiempo' | 'blanco' | 'repetida'

const COMO: Record<Motivo, string> = {
  tiempo: 'se les acabó el tiempo',
  blanco: 'se quedaron en blanco',
  repetida: 'repitieron canción',
}

/**
 * No les ha salido. Minipunto para el contrario y palabra nueva; y si con
 * ese minipunto llega a tres, se lleva el punto.
 */
export function falla(p: Partida, motivo: Motivo = 'tiempo', azar: () => number = Math.random): Partida {
  const pierde = p.turno
  const gana = otroLado(pierde)
  const equipos: Record<Lado, Equipo> = { a: { ...p.equipos.a }, b: { ...p.equipos.b } }
  equipos[gana].minipuntos += 1

  const apuntes: string[] = [
    `«${p.palabra.toUpperCase()}»: ${equipos[pierde].nombre} ${COMO[motivo]} tras ${p.cantadas} ${
      p.cantadas === 1 ? 'canción' : 'canciones'
    }. Minipunto para ${equipos[gana].nombre}.`,
  ]

  if (equipos[gana].minipuntos >= p.minipuntosPorPunto) {
    equipos[gana].puntos += 1
    equipos.a.minipuntos = 0
    equipos.b.minipuntos = 0
    apuntes.unshift(`¡Punto para ${equipos[gana].nombre}! Van ${equipos.a.puntos}-${equipos.b.puntos}.`)
  }

  // La palabra siguiente la abre el otro equipo, pase lo que pase: así
  // nadie arranca dos veces seguidas, que es la ventaja de la casa.
  const abre = otroLado(p.abre)
  const palabra = eligePalabra(p.usadas, azar)

  return {
    ...p,
    equipos,
    turno: abre,
    abre,
    palabra,
    // Cuando se acaban todas, vuelta a empezar la bolsa.
    usadas: p.usadas.length + 1 >= PALABRAS.length ? [palabra] : [...p.usadas, palabra],
    cantadas: 0,
    // El reloj se para: entre palabra y palabra se habla.
    fin: null,
    historia: [...apuntes, ...p.historia],
  }
}

/** Palabra imposible, de esas que no tiene ninguna canción. Sin castigo. */
export function cambiaPalabra(p: Partida, azar: () => number = Math.random): Partida {
  const palabra = eligePalabra(p.usadas, azar)
  return {
    ...p,
    palabra,
    usadas: [...p.usadas, palabra],
    cantadas: 0,
    turno: p.abre,
    fin: null,
    historia: [`Palabra cambiada: «${p.palabra.toUpperCase()}» no valía.`, ...p.historia],
  }
}

/**
 * La palabra la pone el moderador, en vez de dejársela al azar. Cuenta
 * como palabra nueva: turno para quien abría y el reloj parado.
 */
export function ponPalabra(p: Partida, texto: string): Partida {
  const palabra = texto.trim().toLowerCase()
  if (!palabra) return p
  return {
    ...p,
    palabra,
    usadas: p.usadas.includes(palabra) ? p.usadas : [...p.usadas, palabra],
    cantadas: 0,
    turno: p.abre,
    fin: null,
    historia: [`Palabra puesta por el moderador: «${palabra.toUpperCase()}».`, ...p.historia],
  }
}

/**
 * El moderador toca el marcador a mano. Es el juez: si decide que esa
 * actuación vale un punto, vale un punto, y no hay más que hablar.
 */
export function ajustaPuntos(p: Partida, lado: Lado, cuantos: number): Partida {
  const equipos: Record<Lado, Equipo> = { a: { ...p.equipos.a }, b: { ...p.equipos.b } }
  const antes = equipos[lado].puntos
  equipos[lado].puntos = Math.max(0, antes + cuantos)
  if (equipos[lado].puntos === antes) return p
  const signo = equipos[lado].puntos > antes ? '+1' : '−1'
  return {
    ...p,
    equipos,
    historia: [
      `${signo} a mano para ${equipos[lado].nombre}. Van ${equipos.a.puntos}-${equipos.b.puntos}.`,
      ...p.historia,
    ],
  }
}

/** Otra partida con los mismos equipos y la misma configuración. */
export function otraVez(p: Partida, azar: () => number = Math.random, ahora = Date.now()): Partida {
  return nuevaPartida(
    {
      nombreA: p.equipos.a.nombre,
      nombreB: p.equipos.b.nombre,
      genteA: p.equipos.a.gente,
      genteB: p.equipos.b.gente,
      segundos: p.segundos,
      minipuntosPorPunto: p.minipuntosPorPunto,
    },
    azar,
    ahora,
  )
}

/** Se marca la hora justo antes de publicar, para que los demás ajusten. */
export function sella(p: Partida, ahora = Date.now()): Partida {
  return { ...p, emitido: ahora }
}

/**
 * Lo que queda de cuenta atrás en ESTE móvil.
 *
 * El `fin` viene con el reloj del moderador, y dos teléfonos no tienen
 * la misma hora exacta. `desfase` es lo que va del uno al otro, medido
 * al recibir la partida, y sin corregirlo la cuenta atrás de los demás
 * podría ir varios segundos adelantada o atrasada.
 */
export function restanteDe(p: Partida, desfase = 0, ahora = Date.now()): number {
  if (p.fin === null) return p.segundos
  return Math.max(0, (p.fin + desfase - ahora) / 1000)
}

// ---------------------------------------------------------------------
// Guardar la partida en el aparato
// ---------------------------------------------------------------------
// Una partida dura un rato largo y el móvil se bloquea solo. Si al
// desbloquear se hubiera perdido el marcador, el juego no se volvería a
// usar. Esto es la red de seguridad del moderador cuando no hay
// cobertura; cuando la hay, la partida de verdad está en la mesa.

const LLAVE = 'rural69-furor'

export function guardaPartida(p: Partida | null): void {
  try {
    if (p === null) localStorage.removeItem(LLAVE)
    else localStorage.setItem(LLAVE, JSON.stringify(p))
  } catch {
    // Sin sitio o en incógnito: se juega igual, solo que sin red de seguridad.
  }
}

export function leePartida(): Partida | null {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (!crudo) return null
    const p = JSON.parse(crudo) as Partida
    // Lo mínimo para no pintar una pantalla rota con una partida de otra época.
    if (p?.version !== 2 || !p.equipos?.a || !p.equipos?.b || typeof p.palabra !== 'string') return null
    return p
  } catch {
    return null
  }
}

/** Reparte a la gente en dos equipos al azar, lo más igualados posible. */
export function reparteAlAzar(gente: string[], azar: () => number = Math.random): [string[], string[]] {
  const barajada = [...gente]
  for (let i = barajada.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1)) % (i + 1)
    ;[barajada[i], barajada[j]] = [barajada[j], barajada[i]]
  }
  const mitad = Math.ceil(barajada.length / 2)
  return [barajada.slice(0, mitad), barajada.slice(mitad)]
}
