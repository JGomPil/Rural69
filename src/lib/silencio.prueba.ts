import { describe, expect, it } from 'vitest'
import { enSilencio, horaBonita, horaEnEspanya } from './silencio'

describe('enSilencio', () => {
  it('la ventana normal cruza la medianoche', () => {
    // De 23:00 a 8:00: la madrugada entera callada.
    expect(enSilencio(23, 23, 8)).toBe(true)
    expect(enSilencio(0, 23, 8)).toBe(true)
    expect(enSilencio(3, 23, 8)).toBe(true)
    expect(enSilencio(7, 23, 8)).toBe(true)
  })

  it('a la hora de levantarse ya suena', () => {
    // Y esto importa: el recordatorio diario sale a las 8:00 de España.
    expect(enSilencio(8, 23, 8)).toBe(false)
    expect(enSilencio(13, 23, 8)).toBe(false)
    expect(enSilencio(22, 23, 8)).toBe(false)
  })

  it('una ventana del mismo día también vale', () => {
    // La siesta, por ejemplo.
    expect(enSilencio(15, 14, 17)).toBe(true)
    expect(enSilencio(17, 14, 17)).toBe(false)
    expect(enSilencio(2, 14, 17)).toBe(false)
  })

  it('con las dos horas iguales no se calla nunca', () => {
    for (let h = 0; h < 24; h++) expect(enSilencio(h, 0, 0)).toBe(false)
  })
})

describe('horaEnEspanya', () => {
  it('no da la hora del servidor, da la de España', () => {
    // 1 de julio, 23:30 UTC: en España ya es la 1:30 de la madrugada, y por
    // tanto hay que callarse. Si se mirara la hora UTC, sonaría.
    const verano = new Date('2027-07-01T23:30:00Z')
    expect(horaEnEspanya(verano)).toBe(1)
    expect(enSilencio(horaEnEspanya(verano), 23, 8)).toBe(true)

    // En invierno es una hora menos.
    const invierno = new Date('2027-01-15T23:30:00Z')
    expect(horaEnEspanya(invierno)).toBe(0)
  })

  it('la medianoche es 0 y no 24', () => {
    expect(horaEnEspanya(new Date('2027-01-15T23:00:00Z'))).toBe(0)
  })
})

describe('horaBonita', () => {
  it('con dos cifras, como un reloj', () => {
    expect(horaBonita(8)).toBe('08:00')
    expect(horaBonita(23)).toBe('23:00')
    expect(horaBonita(0)).toBe('00:00')
  })
})
