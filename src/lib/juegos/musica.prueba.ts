import { describe, expect, it } from 'vitest'
import {
  acierta,
  arrancaElReloj,
  clasificacion,
  nadieLaSaco,
  nuevaPartida,
  otraPartida,
  restanteDe,
  sacaPistaDe,
  siguiente,
  tomaElMando,
  trastosDe,
  type Partida,
  type Pista,
} from './musica'

const PISTAS: Pista[] = [
  { id: 1, titulo: 'Piratas del Caribe', alias: [], anyo: 2003, pie: "«He's a Pirate», de Klaus Badelt", preview: 'uno.m4a' },
  { id: 2, titulo: 'La guerra de las galaxias', alias: ['Star Wars'], anyo: 1977, pie: '«Main Title», de John Williams', preview: 'dos.m4a' },
  { id: 3, titulo: 'Hijo de la luna', alias: [], anyo: 1986, pie: 'Mecano', preview: 'tres.m4a' },
]

const saca = (usadas: number[], azar: () => number) => sacaPistaDe(PISTAS, usadas, azar)
const azarFijo = (valores: number[]) => {
  let i = 0
  return () => valores[i++ % valores.length]
}

const JAVI = { perfil: 'cuenta-javi', nombre: 'Javi' }

const empieza = (extra: Partial<Parameters<typeof nuevaPartida>[0]> = {}) =>
  nuevaPartida(
    { nombres: ['Javi', 'Vero', 'Leo'], rondas: 3, segundos: 60, moderador: JAVI, ...extra },
    saca,
    azarFijo([0, 0.5, 0.9]),
    1_000_000,
  ) as Partida

describe('el repertorio', () => {
  it('no repite mientras queden sin usar', () => {
    expect(sacaPistaDe(PISTAS, [1, 2], () => 0)?.id).toBe(3)
  })

  it('cuando se acaban, vuelve a empezar antes que dejar la ronda muda', () => {
    expect(sacaPistaDe(PISTAS, [1, 2, 3], () => 0)?.id).toBe(1)
  })

  it('sin repertorio no hay nada que sacar', () => {
    expect(sacaPistaDe([], [], () => 0)).toBeNull()
    expect(nuevaPartida({ nombres: ['Javi'], rondas: 3, segundos: 60, moderador: null }, () => null)).toBeNull()
  })
})

describe('una partida', () => {
  it('empieza sonando, con el reloj parado y sin repetir la primera', () => {
    const p = empieza()
    expect(p.fase).toBe('sonando')
    expect(p.numero).toBe(1)
    expect(p.usadas).toEqual([p.ronda.pista.id])
    expect(p.fin).toBeNull()
    expect(p.moderador).toEqual(JAVI)
  })

  it('los jugadores son nombres, no móviles', () => {
    expect(empieza().jugadores).toEqual([
      { nombre: 'Javi', puntos: 0 },
      { nombre: 'Vero', puntos: 0 },
      { nombre: 'Leo', puntos: 0 },
    ])
  })

  it('el reloj arranca cuando suena la música, y una sola vez', () => {
    const p = arrancaElReloj(empieza(), 1_500_000)
    expect(p.fin).toBe(1_500_000 + 60_000)
    expect(restanteDe(p, 0, 1_500_000 + 20_000)).toBe(40)
    // Volver a darle al play no regala tiempo.
    expect(arrancaElReloj(p, 1_600_000)).toBe(p)
  })

  it('sin reloj, darle al play no pone ninguno', () => {
    expect(arrancaElReloj(empieza({ segundos: 0 }), 1_500_000).fin).toBeNull()
  })

  it('sin reloj no hay cuenta atrás', () => {
    const p = empieza({ segundos: 0 })
    expect(p.fin).toBeNull()
    expect(restanteDe(p, 0, 1_000_000)).toBe(0)
  })

  it('al que la saca se le apunta el punto y se destapa', () => {
    const p = empieza()
    const tras = acierta(p, 1, 2_000_000)
    expect(tras.fase).toBe('resuelta')
    expect(tras.ronda.acertante).toBe('Vero')
    expect(tras.jugadores.find((j) => j.nombre === 'Vero')?.puntos).toBe(1)
    expect(tras.jugadores.find((j) => j.nombre === 'Javi')?.puntos).toBe(0)
    expect(tras.fin).toBeNull()
    expect(tras.historia[0]).toContain('Vero')
  })

  it('con la ronda destapada ya no se apunta nada más', () => {
    const resuelta = acierta(empieza(), 1, 2_000_000)
    expect(acierta(resuelta, 0, 2_100_000)).toBe(resuelta)
  })

  it('apuntar a alguien que no está en la lista no hace nada', () => {
    const p = empieza()
    expect(acierta(p, 9, 2_000_000)).toBe(p)
  })

  it('cuando el moderador dice que no la sacó nadie, se destapa sin puntos', () => {
    const tras = nadieLaSaco(empieza(), 2_000_000)
    expect(tras.fase).toBe('resuelta')
    expect(tras.ronda.acertante).toBeNull()
    expect(tras.jugadores.every((j) => j.puntos === 0)).toBe(true)
    expect(tras.historia[0]).toContain('Nadie')
  })

  it('pasado el tiempo la ronda sigue abierta, y el punto se puede dar', () => {
    // El reloj se acabó hace medio minuto y nadie ha cerrado nada.
    const p = arrancaElReloj(empieza(), 1_500_000)
    expect(restanteDe(p, 0, 1_600_000)).toBe(0)
    expect(p.fase).toBe('sonando')
    const tras = acierta(p, 2, 1_600_000)
    expect(tras.ronda.acertante).toBe('Leo')
    expect(tras.jugadores.find((j) => j.nombre === 'Leo')?.puntos).toBe(1)
  })

  it('y una vez destapada, ya no se admite nada', () => {
    const cerrada = nadieLaSaco(empieza(), 2_000_000)
    expect(acierta(cerrada, 0, 2_100_000)).toBe(cerrada)
    expect(nadieLaSaco(cerrada, 2_200_000)).toBe(cerrada)
  })

  it('la siguiente ronda trae otra y deja el reloj parado', () => {
    const p = empieza()
    const dos = siguiente(acierta(p, 1, 2_000_000), saca, azarFijo([0.9, 0.1]), 3_000_000)
    expect(dos.numero).toBe(2)
    expect(dos.fase).toBe('sonando')
    expect(dos.ronda.pista.id).not.toBe(p.ronda.pista.id)
    expect(dos.usadas).toHaveLength(2)
    expect(dos.fin).toBeNull()
    expect(dos.ronda.acertante).toBeNull()
  })

  it('después de la última ronda se acaba', () => {
    let p = empieza({ rondas: 2 })
    p = siguiente(acierta(p, 1, 2_000_000), saca, azarFijo([0.5]), 2_100_000)
    p = acierta(p, 0, 2_200_000)
    expect(p.numero).toBe(2)
    expect(siguiente(p, saca, azarFijo([0.5]), 2_300_000).fase).toBe('fin')
  })

  it('solo se pasa de ronda desde una ronda resuelta', () => {
    const p = empieza()
    expect(siguiente(p, saca, azarFijo([0.5]), 2_000_000)).toBe(p)
  })

  it('otra partida mantiene la gente y el mando, y pone el marcador a cero', () => {
    const conPunto = acierta(empieza(), 1, 2_000_000)
    const otra = otraPartida(conPunto, saca, azarFijo([0.5]), 3_000_000) as Partida
    expect(otra.numero).toBe(1)
    expect(otra.fase).toBe('sonando')
    expect(otra.jugadores.map((j) => j.nombre)).toEqual(['Javi', 'Vero', 'Leo'])
    expect(otra.jugadores.every((j) => j.puntos === 0)).toBe(true)
    expect(otra.moderador).toEqual(JAVI)
    expect(otra.historia).toEqual([])
  })

  it('la clasificación va de más a menos', () => {
    expect(clasificacion(acierta(empieza(), 1, 2_000_000))[0].nombre).toBe('Vero')
  })
})

describe('el mando', () => {
  it('otro móvil puede quedarse con la música, y se cuenta', () => {
    const p = tomaElMando(empieza(), 'cuenta-vero', 'Vero', 2_000_000)
    expect(p.moderador).toEqual({ perfil: 'cuenta-vero', nombre: 'Vero' })
    expect(p.historia[0]).toContain('Vero')
  })

  it('el que ya lo lleva no se lo quita a sí mismo', () => {
    const p = empieza()
    expect(tomaElMando(p, 'cuenta-javi', 'Javi', 2_000_000)).toBe(p)
  })

  it('una partida puede empezar sin nadie al mando, y recogerlo luego', () => {
    const p = empieza({ moderador: null })
    expect(p.moderador).toBeNull()
    expect(tomaElMando(p, 'cuenta-leo', 'Leo', 2_000_000).moderador?.nombre).toBe('Leo')
  })
})

describe('guardar y recuperar en el propio móvil', () => {
  it('va y vuelve', () => {
    const { guarda, lee } = trastosDe('rural69-prueba')
    const p = empieza()
    guarda(p)
    expect(lee()?.ronda.pista.titulo).toBe(p.ronda.pista.titulo)
    guarda(null)
    expect(lee()).toBeNull()
  })

  it('cada juego guarda en su llave, sin pisarse', () => {
    const pelis = trastosDe('rural69-quepeli')
    const canciones = trastosDe('rural69-quecancion')
    pelis.guarda(empieza())
    expect(canciones.lee()).toBeNull()
    expect(pelis.lee()).not.toBeNull()
  })

  it('una partida de otra versión se tira', () => {
    localStorage.setItem('rural69-prueba', JSON.stringify({ version: 99 }))
    expect(trastosDe('rural69-prueba').lee()).toBeNull()
  })
})
