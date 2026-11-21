import { beforeEach, describe, expect, it } from 'vitest'
import {
  acierta,
  baraja,
  clasificacion,
  guardaJuego,
  leeJuego,
  muestra,
  nuevoJuego,
  pasa,
  restanteDe,
  seAcabaElTiempo,
  termina,
  type Juego,
} from './quiensoy'
import { BARAJA, CATEGORIAS, cartasDe } from './famosos'

const azarFijo = (valores: number[]) => {
  let i = 0
  return () => valores[i++ % valores.length]
}

const empieza = (extra: Partial<Parameters<typeof nuevoJuego>[0]> = {}) =>
  nuevoJuego(
    { nombres: ['Javi', 'Vero', 'Leo'], categoria: 'mezclado', segundos: 60, vueltas: 2, ...extra },
    azarFijo([0.3, 0.7, 0.1, 0.9]),
  )

describe('la baraja de famosos', () => {
  it('tiene de sobra y ninguno repetido', () => {
    expect(BARAJA.length).toBeGreaterThanOrEqual(60)
    expect(new Set(BARAJA.map((c) => c.nombre)).size).toBe(BARAJA.length)
  })

  it('todas las categorías tienen cartas suficientes', () => {
    for (const c of CATEGORIAS) expect(cartasDe(c).length).toBeGreaterThanOrEqual(15)
    expect(cartasDe('mezclado')).toHaveLength(BARAJA.length)
  })

  it('todas llevan pista, y la pista no es la respuesta', () => {
    for (const c of BARAJA) {
      expect(c.pista.length).toBeGreaterThan(4)
      expect(c.pista.toLowerCase()).not.toContain(c.nombre.toLowerCase())
    }
  })

  it('barajar no pierde ni duplica cartas', () => {
    const mezclada = baraja(BARAJA, azarFijo([0.2, 0.8, 0.5]))
    expect(mezclada).toHaveLength(BARAJA.length)
    expect(new Set(mezclada.map((c) => c.nombre)).size).toBe(BARAJA.length)
  })
})

describe('empezar', () => {
  it('todos a cero, el primero en pasar el móvil', () => {
    const j = empieza()
    expect(j.jugadores.map((p) => p.puntos)).toEqual([0, 0, 0])
    expect(j.fase).toBe('pasa')
    expect(j.turno).toBe(0)
    expect(j.carta).toBeNull()
  })

  it('con una categoría, solo salen de esa', () => {
    const j = empieza({ categoria: 'deporte' })
    expect(j.mazo.every((c) => c.categoria === 'deporte')).toBe(true)
  })
})

describe('mostrar la carta', () => {
  it('saca una del mazo y arranca el reloj', () => {
    const j = muestra(empieza(), 1_000_000)
    expect(j.fase).toBe('jugando')
    expect(j.carta).not.toBeNull()
    expect(j.fin).toBe(1_060_000)
  })

  it('sin reloj, no hay cuenta atrás', () => {
    const j = muestra(empieza({ segundos: 0 }), 1_000_000)
    expect(j.fin).toBeNull()
    expect(restanteDe(j, 1_000_000)).toBe(0)
  })

  it('la carta sale del mazo y no puede volver a salir', () => {
    const inicial = empieza()
    const j = muestra(inicial, 1_000_000)
    expect(j.mazo).toHaveLength(inicial.mazo.length - 1)
    expect(j.mazo.map((c) => c.nombre)).not.toContain(j.carta?.nombre)
  })
})

describe('con reloj, el turno es una ráfaga', () => {
  it('acertar suma un punto y saca otra carta para el mismo', () => {
    const j = acierta(muestra(empieza(), 1_000_000), 1_010_000)
    expect(j.jugadores[0].puntos).toBe(1)
    expect(j.turno).toBe(0)
    expect(j.fase).toBe('jugando')
    expect(j.carta).not.toBeNull()
  })

  it('pasar no suma, pero también saca otra', () => {
    const j = pasa(muestra(empieza(), 1_000_000), 1_010_000)
    expect(j.jugadores[0].puntos).toBe(0)
    expect(j.turno).toBe(0)
    expect(j.carta).not.toBeNull()
  })

  it('no repite cartas dentro del mismo turno', () => {
    let j = muestra(empieza(), 1_000_000)
    const salidas = [j.carta?.nombre]
    for (let i = 0; i < 10; i++) {
      j = acierta(j, 1_000_000 + i * 1000)
      salidas.push(j.carta?.nombre)
    }
    expect(new Set(salidas).size).toBe(salidas.length)
  })

  it('al acabarse el tiempo, el móvil cambia de manos sin punto', () => {
    const j = seAcabaElTiempo(muestra(empieza(), 1_000_000))
    expect(j.turno).toBe(1)
    expect(j.fase).toBe('pasa')
    expect(j.carta).toBeNull()
    expect(j.jugadores[0].puntos).toBe(0)
    expect(j.historia[0]).toContain('a Javi se le acabó el tiempo'.replace('a J', 'A J'))
  })

  it('acertar con el tiempo ya cumplido cierra el turno', () => {
    const j = acierta(muestra(empieza(), 1_000_000), 1_099_000)
    expect(j.jugadores[0].puntos).toBe(1)
    expect(j.turno).toBe(1)
    expect(j.fase).toBe('pasa')
  })
})

describe('sin reloj, el turno es una carta', () => {
  it('acertar suma y pasa el móvil', () => {
    const j = acierta(muestra(empieza({ segundos: 0 }), 1_000_000), 1_000_100)
    expect(j.jugadores[0].puntos).toBe(1)
    expect(j.turno).toBe(1)
    expect(j.fase).toBe('pasa')
  })

  it('pasar no suma y pasa el móvil', () => {
    const j = pasa(muestra(empieza({ segundos: 0 }), 1_000_000), 1_000_100)
    expect(j.jugadores[0].puntos).toBe(0)
    expect(j.turno).toBe(1)
  })
})

describe('las vueltas', () => {
  it('se acaba cuando todos han jugado sus vueltas', () => {
    let j = empieza({ segundos: 0, vueltas: 2 })
    for (let i = 0; i < 6; i++) j = acierta(muestra(j, 1_000_000), 1_000_100)
    expect(j.fase).toBe('fin')
    expect(j.jugadores.every((p) => p.puntos === 2)).toBe(true)
  })

  it('la vuelta sube al volver al primero', () => {
    let j = empieza({ segundos: 0, vueltas: 3 })
    expect(j.vuelta).toBe(1)
    for (let i = 0; i < 3; i++) j = acierta(muestra(j, 1_000_000), 1_000_100)
    expect(j.vuelta).toBe(2)
    expect(j.turno).toBe(0)
  })

  it('también se acaba si se agota el mazo', () => {
    let j = empieza({ categoria: 'deporte', segundos: 0, vueltas: 99 })
    const cartas = j.mazo.length
    for (let i = 0; i < cartas; i++) j = acierta(muestra(j, 1_000_000), 1_000_100)
    expect(j.fase).toBe('fin')
    expect(j.mazo).toHaveLength(0)
  })

  it('se puede terminar antes', () => {
    const j = termina(muestra(empieza(), 1_000_000))
    expect(j.fase).toBe('fin')
    expect(j.carta).toBeNull()
  })
})

describe('la clasificación', () => {
  it('ordena de más a menos puntos', () => {
    let j = empieza({ segundos: 0, vueltas: 2 })
    j = acierta(muestra(j, 1), 2) // Javi 1
    j = pasa(muestra(j, 1), 2) // Vero 0
    j = acierta(muestra(j, 1), 2) // Leo 1
    j = acierta(muestra(j, 1), 2) // Javi 2
    expect(clasificacion(j).map((p) => `${p.nombre}:${p.puntos}`)).toEqual(['Javi:2', 'Leo:1', 'Vero:0'])
  })
})

describe('el juego guardado en el aparato', () => {
  beforeEach(() => localStorage.clear())

  it('sobrevive al bloqueo del móvil', () => {
    const j = muestra(empieza(), 1_000_000)
    guardaJuego(j)
    expect(leeJuego()).toEqual(j)
  })

  it('una basura cualquiera no rompe nada', () => {
    localStorage.setItem('rural69-quiensoy', '{{{')
    expect(leeJuego()).toBeNull()
  })

  it('un juego de otra versión no se recupera', () => {
    const viejo = { ...(empieza() as Juego), version: 0 }
    localStorage.setItem('rural69-quiensoy', JSON.stringify(viejo))
    expect(leeJuego()).toBeNull()
  })
})
