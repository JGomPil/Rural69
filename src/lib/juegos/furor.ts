// =====================================================================
// Rural69 · Furor · Las reglas
// ---------------------------------------------------------------------
// Esto es la prueba «Tienes la palabra» del programa de Antena 3: sale
// una palabra, los dos equipos cantan por turnos canciones que la
// contengan, y el que se queda en blanco —o repite una canción ya
// cantada— le regala un MINIPUNTO al contrario. A los tres minipuntos,
// punto y prueba ganada. Gana la partida quien llegue antes a los
// puntos acordados.
//
// Aquí dentro no hay ni pantalla ni reloj: son funciones que reciben una
// partida y devuelven otra. Así las reglas se pueden probar sin abrir el
// navegador, que es justo lo que no se puede hacer con un cronómetro de
// verdad y once personas gritando.
//
// El reloj lo lleva la pantalla, y cuando llega a cero llama a `falla`
// con motivo 'tiempo'. Para las reglas, quedarse callado y que se acabe
// el tiempo es exactamente lo mismo.
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
  /** Marca del formato: si un día cambia, la partida guardada se tira. */
  version: 1
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
  /** Puntos para llevarse la partida. */
  meta: number
  ganador: Lado | null
  /** Lo que ha ido pasando, lo último arriba. */
  historia: string[]
}

export interface Opciones {
  nombreA: string
  nombreB: string
  genteA: string[]
  genteB: string[]
  segundos: number
  meta: number
  minipuntosPorPunto?: number
}

/** Quién empieza se echa a suertes, y eso marca toda la partida. */
export function nuevaPartida(o: Opciones, azar: () => number = Math.random): Partida {
  const abre: Lado = azar() < 0.5 ? 'a' : 'b'
  const palabra = eligePalabra([], azar)
  return {
    version: 1,
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
    meta: o.meta,
    ganador: null,
    historia: [`Empieza ${abre === 'a' ? o.nombreA : o.nombreB}, por sorteo. A ${o.segundos} segundos por canción.`],
  }
}

/** Han cantado a tiempo: la pelota pasa al otro equipo con la misma palabra. */
export function cantada(p: Partida): Partida {
  if (p.ganador) return p
  return { ...p, turno: otroLado(p.turno), cantadas: p.cantadas + 1 }
}

export type Motivo = 'tiempo' | 'blanco' | 'repetida'

const COMO: Record<Motivo, string> = {
  tiempo: 'se les acabó el tiempo',
  blanco: 'se quedaron en blanco',
  repetida: 'repitieron canción',
}

/**
 * No les ha salido. Minipunto para el contrario y palabra nueva; y si con
 * ese minipunto llega a tres, se lleva el punto y empieza otra prueba.
 */
export function falla(p: Partida, motivo: Motivo = 'tiempo', azar: () => number = Math.random): Partida {
  if (p.ganador) return p

  const pierde = p.turno
  const gana = otroLado(pierde)
  const equipos: Record<Lado, Equipo> = {
    a: { ...p.equipos.a },
    b: { ...p.equipos.b },
  }
  equipos[gana].minipuntos += 1

  const apuntes: string[] = [
    `«${p.palabra.toUpperCase()}»: ${equipos[pierde].nombre} ${COMO[motivo]} tras ${p.cantadas} ${
      p.cantadas === 1 ? 'canción' : 'canciones'
    }. Minipunto para ${equipos[gana].nombre}.`,
  ]

  let ganador: Lado | null = null
  if (equipos[gana].minipuntos >= p.minipuntosPorPunto) {
    equipos[gana].puntos += 1
    equipos.a.minipuntos = 0
    equipos.b.minipuntos = 0
    apuntes.unshift(
      `¡Punto para ${equipos[gana].nombre}! Van ${equipos.a.puntos}-${equipos.b.puntos}.`,
    )
    if (equipos[gana].puntos >= p.meta) {
      ganador = gana
      apuntes.unshift(`🏆 ${equipos[gana].nombre} gana la partida.`)
    }
  }

  // La palabra siguiente la abre el otro equipo, pase lo que pase: así
  // nadie arranca dos veces seguidas, que es la ventaja de la casa.
  const abre = otroLado(p.abre)
  const palabra = eligePalabra(p.usadas, azar)

  return {
    ...p,
    equipos,
    ganador,
    turno: abre,
    abre,
    palabra,
    // Cuando se acaban todas, vuelta a empezar la bolsa.
    usadas: p.usadas.length + 1 >= PALABRAS.length ? [palabra] : [...p.usadas, palabra],
    cantadas: 0,
    historia: [...apuntes, ...p.historia],
  }
}

/** Palabra imposible, de esas que no tiene ninguna canción. Sin castigo. */
export function cambiaPalabra(p: Partida, azar: () => number = Math.random): Partida {
  if (p.ganador) return p
  const palabra = eligePalabra(p.usadas, azar)
  return {
    ...p,
    palabra,
    usadas: [...p.usadas, palabra],
    cantadas: 0,
    turno: p.abre,
    historia: [`Palabra cambiada: «${p.palabra.toUpperCase()}» no valía.`, ...p.historia],
  }
}

/** Otra partida con los mismos equipos y la misma configuración. */
export function otraVez(p: Partida, azar: () => number = Math.random): Partida {
  return nuevaPartida(
    {
      nombreA: p.equipos.a.nombre,
      nombreB: p.equipos.b.nombre,
      genteA: p.equipos.a.gente,
      genteB: p.equipos.b.gente,
      segundos: p.segundos,
      meta: p.meta,
      minipuntosPorPunto: p.minipuntosPorPunto,
    },
    azar,
  )
}

// ---------------------------------------------------------------------
// Guardar la partida en el aparato
// ---------------------------------------------------------------------
// Una partida dura un rato largo y el móvil se bloquea solo. Si al
// desbloquear se hubiera perdido el marcador, el juego no se volvería a
// usar. No va al servidor: esto se juega alrededor de una mesa, con un
// solo aparato, y muchas veces sin cobertura.

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
    if (p?.version !== 1 || !p.equipos?.a || !p.equipos?.b || typeof p.palabra !== 'string') return null
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
