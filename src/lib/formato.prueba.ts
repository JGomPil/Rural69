import { afterEach, describe, expect, it, vi } from 'vitest'
import { cantidad, cuentaAtras, diasHasta, euros, findeCorto, hoyISO, noches, numero, proximosFindes, rangoFechas } from './formato'

afterEach(() => {
  vi.useRealTimers()
})

/** Pone el reloj a una hora y día concretos, en hora local. */
function reloj(cuando: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(cuando))
}

describe('proximosFindes', () => {
  it('empieza en el próximo viernes y va de viernes a domingo', () => {
    // Miércoles 18 de noviembre de 2026.
    const findes = proximosFindes(3, new Date(2026, 10, 18, 10, 0))
    expect(findes).toEqual([
      { inicio: '2026-11-20', fin: '2026-11-22' },
      { inicio: '2026-11-27', fin: '2026-11-29' },
      { inicio: '2026-12-04', fin: '2026-12-06' },
    ])
  })

  it('si hoy es viernes, hoy cuenta', () => {
    const findes = proximosFindes(1, new Date(2026, 10, 20, 23, 0))
    expect(findes[0]).toEqual({ inicio: '2026-11-20', fin: '2026-11-22' })
  })

  it('si hoy es sábado, el de esta tarde ya no se ofrece', () => {
    // Nadie organiza una escapada para el finde que ya ha empezado.
    const findes = proximosFindes(1, new Date(2026, 10, 21, 10, 0))
    expect(findes[0]).toEqual({ inicio: '2026-11-27', fin: '2026-11-29' })
  })

  it('cruza el fin de año', () => {
    const findes = proximosFindes(2, new Date(2026, 11, 29, 10, 0))
    expect(findes).toEqual([
      { inicio: '2027-01-01', fin: '2027-01-03' },
      { inicio: '2027-01-08', fin: '2027-01-10' },
    ])
  })

  it('devuelve tantos como se le piden', () => {
    expect(proximosFindes(10, new Date(2026, 10, 18)).length).toBe(10)
  })
})

describe('diasHasta y cuentaAtras', () => {
  it('cuenta los días que faltan sin contar las horas', () => {
    reloj('2026-11-21T23:30:00')
    expect(diasHasta('2026-11-22')).toBe(1)
    expect(diasHasta('2026-11-21')).toBe(0)
    expect(diasHasta('2026-11-20')).toBe(-1)
  })

  it('dice lo que toca y se calla cuando ya pasó', () => {
    reloj('2026-11-21T09:00:00')
    expect(cuentaAtras('2026-11-30')).toBe('En 9 días')
    expect(cuentaAtras('2026-11-22')).toBe('¡Mañana!')
    expect(cuentaAtras('2026-11-21')).toBe('¡Hoy es el día!')
    expect(cuentaAtras('2026-11-20')).toBeNull()
    expect(cuentaAtras(null)).toBeNull()
  })

  it('hoyISO da el día de hoy en hora local, no en UTC', () => {
    // A las 00:30 en España es el día siguiente que en UTC: si esto saliera
    // de toISOString(), la escapada empezaría un día antes.
    reloj('2026-07-15T00:30:00')
    expect(hoyISO()).toBe('2026-07-15')
  })
})

describe('rangos de fechas', () => {
  it('compacta el mes cuando es el mismo', () => {
    expect(rangoFechas('2027-04-16', '2027-04-18')).toBe('16 – 18 abr 2027')
  })

  it('aguanta meses y años distintos', () => {
    expect(rangoFechas('2026-12-31', '2027-01-02')).toContain('–')
    expect(rangoFechas(null, null)).toBe('Fechas por decidir')
  })

  it('findeCorto quita lo que se repite', () => {
    expect(findeCorto('2026-11-20', '2026-11-22')).toBe('20–22 nov')
  })

  it('noches cuenta noches, no días', () => {
    expect(noches('2027-04-16', '2027-04-18')).toBe(2)
    expect(noches('2027-04-16', '2027-04-16')).toBeNull()
    expect(noches(null, '2027-04-18')).toBeNull()
  })
})

describe('números', () => {
  it('no arrastra decimales que no hacen falta', () => {
    expect(numero(2)).toBe('2')
    expect(numero(2.5)).toBe('2,5')
    expect(numero(null)).toBe('—')
  })

  it('euros con y sin céntimos', () => {
    expect(euros(240).replace(/ /g, ' ')).toBe('240 €')
    expect(euros(null)).toBe('—')
  })

  it('cantidad pega la unidad', () => {
    expect(cantidad(1.5, 'l')).toBe('1,5 l')
    expect(cantidad(3)).toBe('3')
    expect(cantidad(null, 'kg')).toBe('—')
  })
})
