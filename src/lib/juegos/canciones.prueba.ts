// Los montones del «¿Qué canción suena?». El repertorio no se carga aquí
// —son medio millar de fichas en un .json— pero las reglas de cada
// montón sí se pueden probar con cuatro pistas de mentira.
import { describe, expect, it } from 'vitest'
import { CATEGORIAS } from './canciones'
import type { Pista } from './musica'

const pista = (id: number, extra: Partial<Pista>): Pista => ({
  id,
  titulo: `Canción ${id}`,
  alias: [],
  anyo: 1985,
  pie: 'Alguien',
  preview: 'x',
  ...extra,
})

const MONTON: Pista[] = [
  pista(1, { estilo: 'heavy', anyo: 1980 }),
  pista(2, { estilo: 'rock', esp: true, anyo: 1985 }),
  pista(3, { estilo: 'pop', anyo: 2014 }),
  pista(4, { estilo: 'urbano', esp: true, anyo: 2022 }),
]

const dela = (id: string) => {
  const c = CATEGORIAS.find((x) => x.id === id)
  if (!c) throw new Error(`no hay montón «${id}»`)
  return MONTON.filter(c.tiene).map((p) => p.id)
}

describe('los montones', () => {
  it('«de todo» no quita nada', () => {
    expect(dela('todo')).toEqual([1, 2, 3, 4])
  })

  it('cada estilo se queda con lo suyo', () => {
    expect(dela('heavy')).toEqual([1])
    expect(dela('rock')).toEqual([2])
    expect(dela('pop')).toEqual([3])
    expect(dela('urbano')).toEqual([4])
  })

  it('el español va por idioma, no por estilo', () => {
    expect(dela('esp')).toEqual([2, 4])
  })

  it('las españolas de toda la vida cruzan idioma y época', () => {
    expect(dela('verbena')).toEqual([2])
  })

  it('y las épocas, por el año de la grabación', () => {
    expect(dela('viejas')).toEqual([1, 2])
    expect(dela('nuevas')).toEqual([3, 4])
  })

  it('no hay dos montones con el mismo nombre ni con la misma llave', () => {
    expect(new Set(CATEGORIAS.map((c) => c.id)).size).toBe(CATEGORIAS.length)
    expect(new Set(CATEGORIAS.map((c) => c.nombre)).size).toBe(CATEGORIAS.length)
  })
})
