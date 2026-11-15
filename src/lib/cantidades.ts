// =====================================================================
// Rural69 · Cálculo de cantidades
//
// Las cantidades SIEMPRE son una propuesta: el sistema calcula un valor
// de partida y la persona puede cambiarlo a mano. Nada se aplica solo.
// =====================================================================

import type { Member, PantryItem } from './types'

/** Unidades en las que no tiene sentido una cantidad decimal. */
const UNIDADES_ENTERAS = new Set([
  'ud',
  'paquete',
  'bolsa',
  'botella',
  'lata',
  'bote',
  'barra',
  'docena',
  'rollo',
  'tableta',
  'bandeja',
])

/** Redondea de forma razonable según la unidad (2 → 2 latas, 1.47 → 1,5 kg). */
export function redondea(valor: number, unidad: string): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0
  if (UNIDADES_ENTERAS.has(unidad)) return Math.max(1, Math.round(valor))
  if (unidad === 'g' || unidad === 'ml') return Math.round(valor / 10) * 10
  return Math.round(valor * 10) / 10
}

/**
 * «Personas equivalentes» de una escapada: cada integrante suma su factor
 * de consumo (1 para un adulto, 0,5 para un niño por defecto).
 */
export function personasEquivalentes(miembros: Member[]): number {
  const total = miembros.reduce((suma, m) => suma + (Number(m.consumption_factor) || 0), 0)
  return Math.round(total * 100) / 100
}

export function cuentaAdultosNinos(miembros: Member[]): { adultos: number; ninos: number } {
  return {
    adultos: miembros.filter((m) => !m.is_child).length,
    ninos: miembros.filter((m) => m.is_child).length,
  }
}

/**
 * Escala una cantidad pensada para `basePersonas` al grupo real.
 * Devuelve la cantidad propuesta, ya redondeada según la unidad.
 */
export function escalaCantidad(
  qty: number | null | undefined,
  basePersonas: number,
  personas: number,
  unidad: string,
): number {
  const base = Number(qty) || 0
  if (!base) return 0
  if (!basePersonas || basePersonas <= 0 || !personas || personas <= 0) return redondea(base, unidad)
  return redondea((base * personas) / basePersonas, unidad)
}

/** Cantidad pendiente de comprar = necesaria − disponible (nunca negativa). */
export function pendienteDeComprar(necesaria: number, disponible: number, unidad: string): number {
  return redondea(Math.max(0, (Number(necesaria) || 0) - (Number(disponible) || 0)), unidad)
}

/** Normaliza un nombre para emparejar productos de la despensa con la lista. */
export function clave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Busca en la despensa el producto que corresponde a un artículo de la lista.
 * Empareja por `master_item_id` y, si no, por nombre normalizado + unidad.
 */
export function buscaEnDespensa(
  item: { name: string; unit: string; master_item_id: string | null },
  despensa: PantryItem[],
): PantryItem | undefined {
  if (item.master_item_id) {
    const porId = despensa.find((p) => p.master_item_id === item.master_item_id && p.qty > 0)
    if (porId) return porId
  }
  const k = clave(item.name)
  return despensa.find((p) => clave(p.name) === k && p.qty > 0 && p.unit === item.unit)
}
