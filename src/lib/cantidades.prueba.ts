import { describe, expect, it } from 'vitest'
import {
  buscaEnDespensa,
  clave,
  cuentaAdultosNinos,
  escalaCantidad,
  pendienteDeComprar,
  personasEquivalentes,
  redondea,
} from './cantidades'
import type { Member, PantryItem } from './types'

const miembro = (campos: Partial<Member>): Member => ({
  id: Math.random().toString(36).slice(2),
  name: 'Alguien',
  household_id: null,
  is_child: false,
  consumption_factor: 1,
  active: true,
  avatar_url: null,
  created_at: '2026-01-01T00:00:00Z',
  ...campos,
})

describe('personasEquivalentes', () => {
  it('un niño no come como un adulto', () => {
    const gente = [
      miembro({}),
      miembro({}),
      miembro({ is_child: true, consumption_factor: 0.5 }),
      miembro({ is_child: true, consumption_factor: 0.5 }),
    ]
    expect(personasEquivalentes(gente)).toBe(3)
  })

  it('redondea a dos decimales y aguanta factores raros', () => {
    expect(personasEquivalentes([miembro({ consumption_factor: 0.333 })])).toBe(0.33)
    expect(personasEquivalentes([])).toBe(0)
  })

  it('cuenta adultos y niños por separado', () => {
    const gente = [miembro({}), miembro({ is_child: true }), miembro({ is_child: true })]
    expect(cuentaAdultosNinos(gente)).toEqual({ adultos: 1, ninos: 2 })
  })
})

describe('redondea', () => {
  it('las cosas que se cuentan quedan enteras y nunca en cero', () => {
    expect(redondea(2.4, 'ud')).toBe(2)
    expect(redondea(2.6, 'lata')).toBe(3)
    // Media barra de pan es una barra: en la tienda no venden medias.
    expect(redondea(0.2, 'barra')).toBe(1)
  })

  it('los gramos y los mililitros, a la decena', () => {
    expect(redondea(147, 'g')).toBe(150)
    expect(redondea(1234, 'ml')).toBe(1230)
  })

  it('el peso y el volumen, a un decimal', () => {
    expect(redondea(1.47, 'kg')).toBe(1.5)
    expect(redondea(0.04, 'l')).toBe(0)
  })

  it('lo que no es un número no rompe nada', () => {
    expect(redondea(Number.NaN, 'kg')).toBe(0)
    expect(redondea(-3, 'ud')).toBe(0)
  })
})

describe('escalaCantidad', () => {
  it('escala una receta de 15 al grupo que viene', () => {
    // 3 kg de arroz para 15 personas → 2,2 para 11.
    expect(escalaCantidad(3, 15, 11, 'kg')).toBe(2.2)
  })

  it('con una base imposible devuelve la cantidad tal cual', () => {
    expect(escalaCantidad(3, 0, 11, 'kg')).toBe(3)
    expect(escalaCantidad(3, 15, 0, 'kg')).toBe(3)
  })

  it('sin cantidad no hay nada que escalar', () => {
    expect(escalaCantidad(null, 15, 11, 'kg')).toBe(0)
  })
})

describe('pendienteDeComprar', () => {
  it('resta lo que ya hay en la despensa', () => {
    expect(pendienteDeComprar(3, 1, 'kg')).toBe(2)
  })

  it('nunca pide cantidades negativas', () => {
    expect(pendienteDeComprar(1, 3, 'kg')).toBe(0)
  })
})

describe('emparejar con la despensa', () => {
  const enDespensa = (campos: Partial<PantryItem>): PantryItem =>
    ({
      id: Math.random().toString(36).slice(2),
      master_item_id: null,
      name: 'Arroz',
      category: 'Otros',
      unit: 'kg',
      qty: 2,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      ...campos,
    }) as PantryItem

  it('normaliza tildes, mayúsculas y signos', () => {
    expect(clave('Aceite de Oliva  Virgen-Extra')).toBe('aceite de oliva virgen extra')
    expect(clave('Jamón')).toBe(clave('jamon'))
  })

  it('empareja primero por identificador de la lista maestra', () => {
    const despensa = [enDespensa({ master_item_id: 'm1', name: 'Otra cosa' }), enDespensa({ name: 'Arroz' })]
    const encontrado = buscaEnDespensa({ name: 'Arroz', unit: 'kg', master_item_id: 'm1' }, despensa)
    expect(encontrado?.name).toBe('Otra cosa')
  })

  it('y si no, por nombre normalizado y la misma unidad', () => {
    const despensa = [enDespensa({ name: 'arroz', unit: 'g' }), enDespensa({ name: 'Arróz', unit: 'kg' })]
    const encontrado = buscaEnDespensa({ name: 'Arroz', unit: 'kg', master_item_id: null }, despensa)
    expect(encontrado?.unit).toBe('kg')
  })

  it('lo que está a cero no cuenta como disponible', () => {
    const despensa = [enDespensa({ name: 'Arroz', qty: 0 })]
    expect(buscaEnDespensa({ name: 'Arroz', unit: 'kg', master_item_id: null }, despensa)).toBeUndefined()
  })
})
