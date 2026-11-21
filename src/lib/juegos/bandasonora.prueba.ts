import { describe, expect, it } from 'vitest'
import {
  aciertaB,
  arrancaElRelojB,
  clasificacionB,
  guardaPartidaB,
  leePartidaB,
  nuevaPartidaB,
  otraPartidaB,
  restanteDeB,
  rindeteB,
  seAcabaElTiempoB,
  siguienteB,
  tomaElMandoB,
  type PartidaB,
} from './bandasonora'
import { sacaBandaDe, type Banda } from './bandas'

const PELIS: Banda[] = [
  { id: 1, peli: 'Piratas del Caribe', alias: [], anyo: 2003, tema: "He's a Pirate", autor: 'Klaus Badelt', preview: 'uno.m4a' },
  { id: 2, peli: 'La guerra de las galaxias', alias: ['Star Wars'], anyo: 1977, tema: 'Main Title', autor: 'John Williams', preview: 'dos.m4a' },
  { id: 3, peli: 'Up', alias: [], anyo: 2009, tema: 'Married Life', autor: 'Michael Giacchino', preview: 'tres.m4a' },
]

const saca = (usadas: number[], azar: () => number) => sacaBandaDe(PELIS, usadas, azar)
const azarFijo = (valores: number[]) => {
  let i = 0
  return () => valores[i++ % valores.length]
}

const JAVI = { perfil: 'cuenta-javi', nombre: 'Javi' }

const empieza = (extra: Partial<Parameters<typeof nuevaPartidaB>[0]> = {}) =>
  nuevaPartidaB(
    { nombres: ['Javi', 'Vero', 'Leo'], rondas: 3, segundos: 60, moderador: JAVI, ...extra },
    saca,
    azarFijo([0, 0.5, 0.9]),
    1_000_000,
  ) as PartidaB

describe('una partida', () => {
  it('empieza sonando, con el reloj parado y sin repetir la primera', () => {
    const p = empieza()
    expect(p.fase).toBe('sonando')
    expect(p.numero).toBe(1)
    expect(p.usadas).toEqual([p.ronda.banda.id])
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
    const p = arrancaElRelojB(empieza(), 1_500_000)
    expect(p.fin).toBe(1_500_000 + 60_000)
    expect(restanteDeB(p, 0, 1_500_000 + 20_000)).toBe(40)
    // Volver a darle al play no regala tiempo.
    expect(arrancaElRelojB(p, 1_600_000)).toBe(p)
  })

  it('sin reloj, darle al play no pone ninguno', () => {
    const p = arrancaElRelojB(empieza({ segundos: 0 }), 1_500_000)
    expect(p.fin).toBeNull()
  })

  it('sin reloj no hay cuenta atrás', () => {
    const p = empieza({ segundos: 0 })
    expect(p.fin).toBeNull()
    expect(restanteDeB(p, 0, 1_000_000)).toBe(0)
  })

  it('al que la saca se le apunta el punto y se destapa la peli', () => {
    const p = empieza()
    const tras = aciertaB(p, 1, 2_000_000)
    expect(tras.fase).toBe('resuelta')
    expect(tras.ronda.acertante).toBe('Vero')
    expect(tras.jugadores.find((j) => j.nombre === 'Vero')?.puntos).toBe(1)
    expect(tras.jugadores.find((j) => j.nombre === 'Javi')?.puntos).toBe(0)
    expect(tras.fin).toBeNull()
    expect(tras.historia[0]).toContain('Vero')
  })

  it('con la ronda destapada ya no se apunta nada más', () => {
    const resuelta = aciertaB(empieza(), 1, 2_000_000)
    expect(aciertaB(resuelta, 0, 2_100_000)).toBe(resuelta)
  })

  it('apuntar a alguien que no está en la lista no hace nada', () => {
    const p = empieza()
    expect(aciertaB(p, 9, 2_000_000)).toBe(p)
  })

  it('si se acaba el tiempo no la gana nadie', () => {
    const p = empieza()
    const tras = seAcabaElTiempoB(p, 2_000_000)
    expect(tras.fase).toBe('resuelta')
    expect(tras.ronda.acertante).toBeNull()
    expect(tras.jugadores.every((j) => j.puntos === 0)).toBe(true)
    expect(rindeteB(p, 2_000_000).fase).toBe('resuelta')
  })

  it('la siguiente ronda trae otra peli y deja el reloj parado', () => {
    const p = empieza()
    const resuelta = aciertaB(p, 1, 2_000_000)
    const dos = siguienteB(resuelta, saca, azarFijo([0.9, 0.1]), 3_000_000)
    expect(dos.numero).toBe(2)
    expect(dos.fase).toBe('sonando')
    expect(dos.ronda.banda.id).not.toBe(p.ronda.banda.id)
    expect(dos.usadas).toHaveLength(2)
    expect(dos.fin).toBeNull()
    expect(dos.ronda.acertante).toBeNull()
  })

  it('después de la última ronda se acaba', () => {
    let p = empieza({ rondas: 2 })
    p = siguienteB(aciertaB(p, 1, 2_000_000), saca, azarFijo([0.5]), 2_100_000)
    p = aciertaB(p, 0, 2_200_000)
    expect(p.numero).toBe(2)
    const fin = siguienteB(p, saca, azarFijo([0.5]), 2_300_000)
    expect(fin.fase).toBe('fin')
  })

  it('solo se pasa de ronda desde una ronda resuelta', () => {
    const p = empieza()
    expect(siguienteB(p, saca, azarFijo([0.5]), 2_000_000)).toBe(p)
  })

  it('otra partida mantiene la gente y el mando, y pone el marcador a cero', () => {
    const conPunto = aciertaB(empieza(), 1, 2_000_000)
    const otra = otraPartidaB(conPunto, saca, azarFijo([0.5]), 3_000_000) as PartidaB
    expect(otra.numero).toBe(1)
    expect(otra.fase).toBe('sonando')
    expect(otra.jugadores.map((j) => j.nombre)).toEqual(['Javi', 'Vero', 'Leo'])
    expect(otra.jugadores.every((j) => j.puntos === 0)).toBe(true)
    expect(otra.moderador).toEqual(JAVI)
    expect(otra.historia).toEqual([])
  })

  it('la clasificación va de más a menos', () => {
    const p = aciertaB(empieza(), 1, 2_000_000)
    expect(clasificacionB(p)[0].nombre).toBe('Vero')
  })
})

describe('el mando', () => {
  it('otro móvil puede quedarse con la música, y se cuenta', () => {
    const p = tomaElMandoB(empieza(), 'cuenta-vero', 'Vero', 2_000_000)
    expect(p.moderador).toEqual({ perfil: 'cuenta-vero', nombre: 'Vero' })
    expect(p.historia[0]).toContain('Vero')
  })

  it('el que ya lo lleva no se lo quita a sí mismo', () => {
    const p = empieza()
    expect(tomaElMandoB(p, 'cuenta-javi', 'Javi', 2_000_000)).toBe(p)
  })

  it('una partida puede empezar sin nadie al mando, y recogerlo luego', () => {
    const p = empieza({ moderador: null })
    expect(p.moderador).toBeNull()
    expect(tomaElMandoB(p, 'cuenta-leo', 'Leo', 2_000_000).moderador?.nombre).toBe('Leo')
  })
})

describe('guardar y recuperar en el propio móvil', () => {
  it('va y vuelve', () => {
    const p = empieza()
    guardaPartidaB(p)
    expect(leePartidaB()?.ronda.banda.peli).toBe(p.ronda.banda.peli)
    guardaPartidaB(null)
    expect(leePartidaB()).toBeNull()
  })

  it('una partida de otra versión se tira', () => {
    localStorage.setItem('rural69-quepeli', JSON.stringify({ version: 99 }))
    expect(leePartidaB()).toBeNull()
  })
})
