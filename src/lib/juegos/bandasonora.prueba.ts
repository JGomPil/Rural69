import { describe, expect, it } from 'vitest'
import {
  arrancaElRelojB,
  clasificacionB,
  dejaElSitioB,
  esLaPeli,
  guardaPartidaB,
  intentaB,
  leePartidaB,
  miSitioB,
  nuevaPartidaB,
  otraPartidaB,
  ponAltavoz,
  restanteDeB,
  rindeteB,
  seAcabaElTiempoB,
  siguienteB,
  tomaSitioB,
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

const empieza = (extra: Partial<Parameters<typeof nuevaPartidaB>[0]> = {}) =>
  nuevaPartidaB(
    { nombres: ['Javi', 'Vero', 'Leo'], rondas: 3, segundos: 60, altavoz: null, ...extra },
    saca,
    azarFijo([0, 0.5, 0.9]),
    1_000_000,
  ) as PartidaB

const sentados = (p: PartidaB) => tomaSitioB(tomaSitioB(p, 0, 'cuenta-javi'), 1, 'cuenta-vero')

describe('reconocer el título', () => {
  const piratas = PELIS[0]
  const guerra = PELIS[1]

  it('vale el título entero, con y sin acentos o mayúsculas', () => {
    expect(esLaPeli('Piratas del Caribe', piratas)).toBe(true)
    expect(esLaPeli('piratas del caribe', piratas)).toBe(true)
    expect(esLaPeli('  PIRATAS DEL CARIBÉ!  ', piratas)).toBe(true)
  })

  it('vale un trozo largo, y vale decirlo con rodeos', () => {
    expect(esLaPeli('piratas', piratas)).toBe(true)
    expect(esLaPeli('la de piratas del caribe', piratas)).toBe(true)
  })

  it('valen los alias y el artículo sobra', () => {
    expect(esLaPeli('Star Wars', guerra)).toBe(true)
    expect(esLaPeli('guerra de las galaxias', guerra)).toBe(true)
  })

  it('no vale cualquier cosa', () => {
    expect(esLaPeli('tiburón', piratas)).toBe(false)
    expect(esLaPeli('el padrino', guerra)).toBe(false)
    expect(esLaPeli('', piratas)).toBe(false)
    expect(esLaPeli('p', piratas)).toBe(false)
  })

  it('los títulos cortos solo valen clavados', () => {
    expect(esLaPeli('up', PELIS[2])).toBe(true)
    expect(esLaPeli('u', PELIS[2])).toBe(false)
  })
})

describe('una partida', () => {
  it('empieza sonando, con el reloj parado y sin repetir la primera', () => {
    const p = empieza()
    expect(p.fase).toBe('sonando')
    expect(p.numero).toBe(1)
    expect(p.usadas).toEqual([p.ronda.banda.id])
    expect(p.fin).toBeNull()
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

  it('el que acierta se lleva el punto y la ronda se resuelve', () => {
    const p = sentados(empieza())
    const tras = intentaB(p, 1, p.ronda.banda.peli, 2_000_000)
    expect(tras.fase).toBe('resuelta')
    expect(tras.ronda.acertante).toBe('Vero')
    expect(tras.jugadores.find((j) => j.nombre === 'Vero')?.puntos).toBe(1)
    expect(tras.jugadores.find((j) => j.nombre === 'Javi')?.puntos).toBe(0)
    expect(tras.fin).toBeNull()
  })

  it('el que falla sigue sonando, se le apunta y puede repetir', () => {
    const p = sentados(empieza())
    const tras = intentaB(p, 0, 'Mary Poppins', 2_000_000)
    expect(tras.fase).toBe('sonando')
    expect(tras.ronda.fallos[0]).toEqual({ nombre: 'Javi', dicho: 'Mary Poppins' })
    expect(tras.jugadores.every((j) => j.puntos === 0)).toBe(true)
    const luego = intentaB(tras, 0, tras.ronda.banda.peli, 2_100_000)
    expect(luego.ronda.acertante).toBe('Javi')
  })

  it('con la ronda resuelta ya no se admite nada', () => {
    const p = sentados(empieza())
    const resuelta = intentaB(p, 1, p.ronda.banda.peli, 2_000_000)
    expect(intentaB(resuelta, 0, resuelta.ronda.banda.peli, 2_100_000)).toBe(resuelta)
  })

  it('si se acaba el tiempo no la gana nadie', () => {
    const p = sentados(empieza())
    const tras = seAcabaElTiempoB(p, 2_000_000)
    expect(tras.fase).toBe('resuelta')
    expect(tras.ronda.acertante).toBeNull()
    expect(tras.jugadores.every((j) => j.puntos === 0)).toBe(true)
    expect(rindeteB(p, 2_000_000).fase).toBe('resuelta')
  })

  it('la siguiente ronda trae otra peli y reinicia el reloj', () => {
    const p = sentados(empieza())
    const resuelta = intentaB(p, 1, p.ronda.banda.peli, 2_000_000)
    const dos = siguienteB(resuelta, saca, azarFijo([0.9, 0.1]), 3_000_000)
    expect(dos.numero).toBe(2)
    expect(dos.fase).toBe('sonando')
    expect(dos.ronda.banda.id).not.toBe(p.ronda.banda.id)
    expect(dos.usadas).toHaveLength(2)
    expect(dos.fin).toBeNull()
    expect(dos.ronda.fallos).toEqual([])
  })

  it('después de la última ronda se acaba', () => {
    let p = sentados(empieza({ rondas: 2 }))
    p = siguienteB(intentaB(p, 1, p.ronda.banda.peli, 2_000_000), saca, azarFijo([0.5]), 2_100_000)
    p = intentaB(p, 0, p.ronda.banda.peli, 2_200_000)
    expect(p.numero).toBe(2)
    const fin = siguienteB(p, saca, azarFijo([0.5]), 2_300_000)
    expect(fin.fase).toBe('fin')
  })

  it('solo se pasa de ronda desde una ronda resuelta', () => {
    const p = sentados(empieza())
    expect(siguienteB(p, saca, azarFijo([0.5]), 2_000_000)).toBe(p)
  })

  it('otra partida mantiene la gente y los sitios, y pone el marcador a cero', () => {
    const p = intentaB(sentados(empieza()), 1, '', 2_000_000)
    const conPunto = intentaB(sentados(empieza()), 1, p.ronda.banda.peli, 2_000_000)
    const otra = otraPartidaB(conPunto, saca, azarFijo([0.5]), 3_000_000) as PartidaB
    expect(otra.numero).toBe(1)
    expect(otra.fase).toBe('sonando')
    expect(otra.jugadores.every((j) => j.puntos === 0)).toBe(true)
    expect(miSitioB(otra, 'cuenta-vero')).toBe(1)
  })

  it('la clasificación va de más a menos', () => {
    const p = intentaB(sentados(empieza()), 1, empieza().ronda.banda.peli, 2_000_000)
    expect(clasificacionB(p)[0].nombre).toBe('Vero')
  })
})

describe('las sillas y el altavoz', () => {
  it('el primero que se sienta se queda con la música', () => {
    const p = tomaSitioB(empieza(), 0, 'cuenta-javi')
    expect(miSitioB(p, 'cuenta-javi')).toBe(0)
    expect(p.altavoz).toBe('cuenta-javi')
  })

  it('una cuenta ocupa una silla y solo una', () => {
    const p = tomaSitioB(tomaSitioB(empieza(), 0, 'cuenta-javi'), 2, 'cuenta-javi')
    expect(miSitioB(p, 'cuenta-javi')).toBe(2)
    expect(p.jugadores.filter((j) => j.perfil === 'cuenta-javi')).toHaveLength(1)
  })

  it('levantarse suelta también la música', () => {
    const p = dejaElSitioB(tomaSitioB(empieza(), 0, 'cuenta-javi'), 'cuenta-javi')
    expect(miSitioB(p, 'cuenta-javi')).toBe(-1)
    expect(p.altavoz).toBeNull()
  })

  it('otro móvil puede quedarse con la música', () => {
    const p = ponAltavoz(sentados(empieza()), 'cuenta-vero')
    expect(p.altavoz).toBe('cuenta-vero')
    expect(p.historia[0]).toContain('Vero')
  })

  it('sentarse en una silla que no existe no hace nada', () => {
    const p = empieza()
    expect(tomaSitioB(p, 9, 'cuenta-javi')).toBe(p)
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
