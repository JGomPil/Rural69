import { beforeEach, describe, expect, it } from 'vitest'
import { guarda, lee, limpia, olvida } from './almacen'
import { EVENTO_COLA, encola, pendientes, vaciaCola } from './cola'

beforeEach(() => {
  localStorage.clear()
})

describe('la copia local', () => {
  it('guarda y devuelve lo guardado, con la hora', () => {
    guarda('compra:e1', [{ id: '1', name: 'Vino tinto' }])
    const leido = lee<{ id: string; name: string }[]>('compra:e1')
    expect(leido?.datos[0].name).toBe('Vino tinto')
    expect(typeof leido?.cuando).toBe('number')
  })

  it('lo que no se ha guardado no existe (y no revienta)', () => {
    expect(lee('nada')).toBeNull()
  })

  it('no guarda una copia desmesurada', () => {
    // Un chat muy largo llenaría la cuota él solo, y entonces no caben las
    // copias que de verdad hacen falta allí: la compra y el menú.
    guarda('chat:e1', 'x'.repeat(400_000))
    expect(lee('chat:e1')).toBeNull()
  })

  it('un JSON corrupto se trata como que no hay copia', () => {
    localStorage.setItem('rural69-copia:roto', '{esto no es json')
    expect(lee('roto')).toBeNull()
  })

  it('olvida borra solo la suya', () => {
    guarda('a', 1)
    guarda('b', 2)
    olvida('a')
    expect(lee('a')).toBeNull()
    expect(lee<number>('b')?.datos).toBe(2)
  })

  it('limpia se lleva las copias pero no la cola de cambios', () => {
    // Al cerrar sesión se tiran las copias. Si se llevara por delante la
    // cola, se perderían cambios hechos sin cobertura y nadie se enteraría.
    guarda('compra:e1', [1, 2, 3])
    encola('shopping_items', 'i1', { purchased: true })
    limpia()
    expect(lee('compra:e1')).toBeNull()
    expect(pendientes()).toHaveLength(1)
  })
})

describe('la cola de cambios sin cobertura', () => {
  it('funde los encargos de la misma fila en vez de apilarlos', () => {
    // Marcar y desmarcar cinco veces tiene que mandar una sola cosa.
    encola('shopping_items', 'i1', { purchased: true })
    encola('shopping_items', 'i1', { purchased: false })
    encola('shopping_items', 'i1', { buy_qty: 3 })
    const lista = pendientes()
    expect(lista).toHaveLength(1)
    expect(lista[0].campos).toEqual({ purchased: false, buy_qty: 3 })
  })

  it('cada fila lleva su encargo, y cada tabla el suyo', () => {
    encola('shopping_items', 'i1', { purchased: true })
    encola('shopping_items', 'i2', { purchased: true })
    encola('trip_packing', 'i1', { done: true })
    expect(pendientes()).toHaveLength(3)
  })

  it('respeta el orden en que se hicieron las cosas', () => {
    encola('shopping_items', 'i1', { purchased: true })
    encola('shopping_items', 'i2', { purchased: true })
    expect(pendientes().map((e) => e.filaId)).toEqual(['i1', 'i2'])
  })

  it('avisa cada vez que cambia, para poder pintar «1 cambio por mandar»', () => {
    let avisos = 0
    window.addEventListener(EVENTO_COLA, () => avisos++)
    encola('shopping_items', 'i1', { purchased: true })
    vaciaCola()
    expect(avisos).toBe(2)
  })

  it('vaciar la cola la deja vacía de verdad', () => {
    encola('shopping_items', 'i1', { purchased: true })
    vaciaCola()
    expect(pendientes()).toEqual([])
    expect(localStorage.getItem('rural69-cola')).toBeNull()
  })

  it('una cola corrupta no deja la aplicación tirada', () => {
    localStorage.setItem('rural69-cola', 'ni esto es json')
    expect(pendientes()).toEqual([])
  })
})
