import { afterEach, describe, expect, it, vi } from 'vitest'
import { queFalta, type EstadoOrganizacion } from './pendientes'
import type { Trip } from './types'

afterEach(() => {
  vi.useRealTimers()
})

const escapada = (campos: Partial<Trip> = {}): Trip => ({
  id: 'e1',
  title: 'Primavera 2027',
  start_date: null,
  end_date: null,
  town: null,
  province: null,
  notes: null,
  status: 'planificacion',
  voting_open: false,
  chosen_house_id: null,
  dates_voting_open: false,
  chosen_date_option_id: null,
  shopping_cost: null,
  created_by: null,
  created_at: '2026-11-01T00:00:00Z',
  ...campos,
})

const estado = (campos: Partial<EstadoOrganizacion> = {}): EstadoOrganizacion => ({
  escapada: escapada(),
  esAdmin: false,
  conCuenta: 11,
  opcionesDeFecha: 0,
  hanVotadoFechas: 0,
  heVotadoFechas: false,
  casas: 0,
  hanVotadoCasa: 0,
  heVotadoCasa: false,
  meFaltaContestar: false,
  sinContestarOtros: 0,
  compraTotal: 0,
  compraPorComprar: 0,
  equipajeSinDuenyo: 0,
  ...campos,
})

const ids = (e: EstadoOrganizacion) => queFalta(e).map((p) => p.id)

describe('queFalta', () => {
  it('una escapada terminada no tiene nada pendiente', () => {
    expect(queFalta(estado({ escapada: escapada({ status: 'realizada' }) }))).toEqual([])
    expect(queFalta(estado({ escapada: escapada({ status: 'archivada' }) }))).toEqual([])
  })

  it('lo primero es proponer fechas', () => {
    expect(ids(estado())).toEqual(['fechas-vacias'])
  })

  it('no manda buscar casa antes de tener fechas', () => {
    // Buscar casa sin finde decidido es trabajo doble: la mitad estarán ocupadas.
    const sinFechas = ids(estado({ opcionesDeFecha: 3, escapada: escapada({ dates_voting_open: true }), heVotadoFechas: true, hanVotadoFechas: 11 }))
    expect(sinFechas).not.toContain('casas-vacias')
  })

  it('lo mío va antes que lo del grupo', () => {
    const lista = queFalta(
      estado({
        escapada: escapada({ dates_voting_open: true }),
        opcionesDeFecha: 4,
        heVotadoFechas: false,
        hanVotadoFechas: 2,
      }),
    )
    expect(lista[0].id).toBe('votar-fechas')
    expect(lista[0].dequien).toBe('tuyo')
    expect(lista[1].id).toBe('faltan-fechas')
    expect(lista[1].dequien).toBe('grupo')
  })

  it('si ya he votado, solo queda lo del grupo', () => {
    const lista = ids(
      estado({
        escapada: escapada({ dates_voting_open: true }),
        opcionesDeFecha: 4,
        heVotadoFechas: true,
        hanVotadoFechas: 7,
      }),
    )
    expect(lista).toEqual(['faltan-fechas'])
  })

  it('cuando ha votado todo el mundo, le toca a quien administra', () => {
    const comun = {
      escapada: escapada({ dates_voting_open: true }),
      opcionesDeFecha: 4,
      heVotadoFechas: true,
      hanVotadoFechas: 11,
    }
    expect(ids(estado({ ...comun, esAdmin: false }))).toEqual([])
    expect(ids(estado({ ...comun, esAdmin: true }))).toEqual(['fijar-fechas'])
  })

  it('con fechas puestas y sin casas, toca proponerlas', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 15))
    const lista = ids(estado({ escapada: escapada({ start_date: '2027-04-16', end_date: '2027-04-18' }) }))
    expect(lista).toContain('casas-vacias')
  })

  it('no habla de la compra hasta que hay casa o la fecha está cerca', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 15)) // tres meses antes
    const lejos = escapada({ start_date: '2027-04-16', end_date: '2027-04-18', chosen_house_id: null })
    expect(ids(estado({ escapada: lejos }))).not.toContain('compra-vacia')

    const conCasa = escapada({ start_date: '2027-04-16', end_date: '2027-04-18', chosen_house_id: 'c1' })
    expect(ids(estado({ escapada: conCasa }))).toContain('compra-vacia')

    vi.setSystemTime(new Date(2027, 3, 1)) // quince días antes
    expect(ids(estado({ escapada: lejos }))).toContain('compra-vacia')
  })

  it('la última semana sí cuenta lo que falta por comprar', () => {
    vi.useFakeTimers()
    const esta = escapada({ start_date: '2027-04-16', end_date: '2027-04-18', chosen_house_id: 'c1' })

    vi.setSystemTime(new Date(2027, 3, 1))
    expect(ids(estado({ escapada: esta, compraTotal: 50, compraPorComprar: 12 }))).not.toContain('compra-pendiente')

    vi.setSystemTime(new Date(2027, 3, 14))
    expect(ids(estado({ escapada: esta, compraTotal: 50, compraPorComprar: 12 }))).toContain('compra-pendiente')
  })

  it('no pregunta «¿vienes?» sin saber qué finde es', () => {
    expect(ids(estado({ meFaltaContestar: true, sinContestarOtros: 4 }))).not.toContain('contestar')
    const conFechas = escapada({ start_date: '2027-04-16', end_date: '2027-04-18' })
    const lista = ids(estado({ escapada: conFechas, meFaltaContestar: true, sinContestarOtros: 4 }))
    expect(lista).toContain('contestar')
    expect(lista).toContain('sin-contestar')
  })
})
