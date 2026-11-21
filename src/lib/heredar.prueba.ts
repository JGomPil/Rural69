import { describe, expect, it } from 'vitest'
import { desplazamiento, mueveDia, resumeHeredado } from './heredar'

describe('desplazar los días de una escapada a la siguiente', () => {
  it('cuenta los días enteros entre las dos', () => {
    // De la escapada de primavera de 2027 a la de otoño: 182 días.
    expect(desplazamiento('2027-04-16', '2027-10-15')).toBe(182)
    expect(desplazamiento('2027-04-16', '2027-04-16')).toBe(0)
  })

  it('sin fechas en alguna de las dos, no hay desplazamiento posible', () => {
    expect(desplazamiento(null, '2027-10-15')).toBeNull()
    expect(desplazamiento('2027-04-16', null)).toBeNull()
  })

  it('la cena del viernes cae en el viernes nuevo', () => {
    const dias = desplazamiento('2027-04-16', '2027-10-15') // viernes → viernes
    expect(mueveDia('2027-04-16', dias)).toBe('2027-10-15') // viernes
    expect(mueveDia('2027-04-17', dias)).toBe('2027-10-16') // sábado
    expect(mueveDia('2027-04-18', dias)).toBe('2027-10-17') // domingo
  })

  it('un tiempo sin día se queda sin día', () => {
    expect(mueveDia(null, 10)).toBeNull()
  })

  it('si la escapada nueva no tiene fechas, los tiempos se quedan sin día', () => {
    // Mejor sin día que en el día equivocado: ya se colocan al votar el finde.
    expect(mueveDia('2027-04-17', null)).toBeNull()
  })

  it('cruza el cambio de hora sin perder un día', () => {
    const dias = desplazamiento('2027-03-20', '2027-04-03')
    expect(dias).toBe(14)
    expect(mueveDia('2027-03-20', dias)).toBe('2027-04-03')
  })
})

describe('resumeHeredado', () => {
  it('lo dice en castellano y en singular cuando toca', () => {
    expect(resumeHeredado({ tiempos: 1, platos: 0, equipaje: 0, compra: 0 })).toBe('Traído: 1 tiempo.')
    expect(resumeHeredado({ tiempos: 8, platos: 12, equipaje: 9, compra: 0 })).toBe(
      'Traído: 8 tiempos, 12 platos y 9 cosas de equipaje.',
    )
  })

  it('cuando no había nada, lo dice sin disimular', () => {
    expect(resumeHeredado({ tiempos: 0, platos: 0, equipaje: 0, compra: 0 })).toBe('No había nada que traer.')
  })
})
