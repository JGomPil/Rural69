import { describe, expect, it } from 'vitest'
import { diaDeLaEstancia, estadoDe, momentoDe, reparteTiempos, sumaDias, yaPaso } from './estancia'
import type { Trip, TripMeal } from './types'

const escapada = (campos: Partial<Trip>): Pick<Trip, 'start_date' | 'end_date' | 'status'> => ({
  start_date: '2027-04-16',
  end_date: '2027-04-18',
  status: 'confirmada',
  ...campos,
})

describe('momentoDe', () => {
  it('antes de la víspera dice que no hemos salido', () => {
    expect(momentoDe(escapada({}), '2027-04-15')).toBe('antes')
  })

  it('el primer día, el de en medio y el último son «durante»', () => {
    expect(momentoDe(escapada({}), '2027-04-16')).toBe('durante')
    expect(momentoDe(escapada({}), '2027-04-17')).toBe('durante')
    expect(momentoDe(escapada({}), '2027-04-18')).toBe('durante')
  })

  it('el día después ya es «despues»', () => {
    expect(momentoDe(escapada({}), '2027-04-19')).toBe('despues')
  })

  it('una escapada de un solo día también se vive', () => {
    expect(momentoDe(escapada({ end_date: null }), '2027-04-16')).toBe('durante')
    expect(momentoDe(escapada({ end_date: null }), '2027-04-17')).toBe('despues')
  })

  it('sin fechas todavía no hay nada que vivir', () => {
    expect(momentoDe(escapada({ start_date: null, end_date: null }), '2027-04-17')).toBe('antes')
  })

  it('el estado manda sobre el calendario', () => {
    // Marcada como realizada aunque hoy caiga dentro: ya pasó.
    expect(momentoDe(escapada({ status: 'realizada' }), '2027-04-17')).toBe('despues')
    expect(momentoDe(escapada({ status: 'archivada' }), '2027-04-17')).toBe('despues')
  })
})

describe('estadoDe y yaPaso', () => {
  it('con las fechas atrás está hecha, aunque siga apuntada en planificación', () => {
    const vieja = escapada({ start_date: '2024-10-11', end_date: '2024-10-13', status: 'planificacion' })
    expect(estadoDe(vieja, '2026-11-22')).toBe('realizada')
    expect(yaPaso(vieja, '2026-11-22')).toBe(true)
  })

  it('la que todavía no ha llegado se queda con su estado', () => {
    expect(estadoDe(escapada({}), '2027-04-15')).toBe('confirmada')
    expect(yaPaso(escapada({}), '2027-04-15')).toBe(false)
  })

  it('durante el finde tampoco ha pasado', () => {
    expect(estadoDe(escapada({}), '2027-04-17')).toBe('confirmada')
    expect(yaPaso(escapada({}), '2027-04-17')).toBe(false)
  })

  it('sin fechas no se adivina nada: sigue en planificación', () => {
    const sinFechas = escapada({ start_date: null, end_date: null, status: 'planificacion' })
    expect(estadoDe(sinFechas, '2026-11-22')).toBe('planificacion')
    expect(yaPaso(sinFechas, '2026-11-22')).toBe(false)
  })

  it('archivada se respeta tal cual, caiga donde caiga', () => {
    expect(estadoDe(escapada({ status: 'archivada' }), '2027-04-15')).toBe('archivada')
    expect(yaPaso(escapada({ status: 'archivada' }), '2027-04-15')).toBe(true)
  })
})

describe('diaDeLaEstancia', () => {
  it('cuenta desde uno', () => {
    expect(diaDeLaEstancia('2027-04-16', '2027-04-18', '2027-04-16')).toEqual({ dia: 1, total: 3 })
    expect(diaDeLaEstancia('2027-04-16', '2027-04-18', '2027-04-18')).toEqual({ dia: 3, total: 3 })
  })

  it('fuera de la escapada no devuelve nada', () => {
    expect(diaDeLaEstancia('2027-04-16', '2027-04-18', '2027-04-15')).toBeNull()
    expect(diaDeLaEstancia('2027-04-16', '2027-04-18', '2027-04-19')).toBeNull()
    expect(diaDeLaEstancia(null, null, '2027-04-17')).toBeNull()
  })
})

describe('sumaDias', () => {
  it('cruza meses y años sin despeinarse', () => {
    expect(sumaDias('2027-04-30', 1)).toBe('2027-05-01')
    expect(sumaDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumaDias('2028-02-28', 1)).toBe('2028-02-29') // bisiesto
    expect(sumaDias('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('sobrevive al cambio de hora de España', () => {
    // La madrugada del 28 de marzo de 2027 son 23 horas, no 24: si esto se
    // calculara en hora local, el día siguiente saldría el mismo día.
    expect(sumaDias('2027-03-27', 1)).toBe('2027-03-28')
    expect(sumaDias('2027-03-28', 1)).toBe('2027-03-29')
  })
})

describe('reparteTiempos', () => {
  const tiempo = (campos: Partial<TripMeal>): TripMeal => ({
    id: Math.random().toString(36).slice(2),
    trip_id: 't',
    name: 'Comida',
    day: null,
    kind: 'comida',
    assigned_to: null,
    notes: null,
    sort_order: 0,
    created_at: '2027-01-01T00:00:00Z',
    ...campos,
  })

  it('separa hoy, mañana y los que no tienen día', () => {
    const lista = [
      tiempo({ name: 'Cena del sábado', day: '2027-04-17', sort_order: 2 }),
      tiempo({ name: 'Comida del sábado', day: '2027-04-17', sort_order: 1 }),
      tiempo({ name: 'Comida del domingo', day: '2027-04-18' }),
      tiempo({ name: 'Bebida', day: null }),
      tiempo({ name: 'Cena del viernes', day: '2027-04-16' }),
    ]
    const r = reparteTiempos(lista, '2027-04-17')
    expect(r.hoy.map((t) => t.name)).toEqual(['Comida del sábado', 'Cena del sábado'])
    expect(r.manyana.map((t) => t.name)).toEqual(['Comida del domingo'])
    expect(r.sinDia.map((t) => t.name)).toEqual(['Bebida'])
  })

  it('respeta el orden puesto a mano y desempata por nombre', () => {
    const lista = [
      tiempo({ name: 'Vermú', day: '2027-04-17', sort_order: 5 }),
      tiempo({ name: 'Almuerzo', day: '2027-04-17', sort_order: 5 }),
    ]
    expect(reparteTiempos(lista, '2027-04-17').hoy.map((t) => t.name)).toEqual(['Almuerzo', 'Vermú'])
  })
})
