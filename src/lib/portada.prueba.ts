import { describe, expect, it } from 'vitest'
import { ordenaConPortada, portadaDe } from './portada'

const A = 'https://ejemplo.es/a.jpg'
const B = 'https://ejemplo.es/b.jpg'
const C = 'https://ejemplo.es/c.jpg'

describe('la portada de una casa', () => {
  it('es la que está elegida, aunque se subiera la última', () => {
    expect(portadaDe(C, [A, B, C])).toBe(C)
    expect(ordenaConPortada(C, [A, B, C])).toEqual([C, A, B])
  })

  it('pasa a la siguiente cuando se borra la que era portada', () => {
    expect(portadaDe(C, [A, B])).toBe(A)
    expect(ordenaConPortada(C, [A, B])).toEqual([A, B])
  })

  it('no resucita la foto borrada en la galería', () => {
    expect(ordenaConPortada(C, [A, B])).not.toContain(C)
  })

  it('sin portada apuntada manda la primera foto', () => {
    expect(portadaDe(null, [A, B])).toBe(A)
    expect(portadaDe('   ', [A, B])).toBe(A)
  })

  it('una casa sin fotos no tiene portada', () => {
    expect(portadaDe(null, [])).toBeNull()
    expect(ordenaConPortada(null, [])).toEqual([])
  })

  it('conserva la portada de las casas que solo tenían esa', () => {
    expect(portadaDe(A, [])).toBe(A)
    expect(ordenaConPortada(A, [])).toEqual([A])
  })

  it('no toca la lista que recibe', () => {
    const fotos = [A, B]
    ordenaConPortada(B, fotos)
    expect(fotos).toEqual([A, B])
  })
})
