// =====================================================================
// Rural69 · Que la siguiente escapada parta de la anterior
// ---------------------------------------------------------------------
// La lista de la compra ya se reutiliza sola: para eso está la maestra.
// Lo que había que volver a montar desde cero cada vez era el menú —los
// tiempos del finde y qué se cocina en cada uno— y el equipaje: quién
// lleva la paellera, quién el proyector, quién las sábanas.
//
// Y eso, en un grupo que repite once personas y casi el mismo plan, es
// trabajo tirado: el año que viene habrá otra vez cena del viernes,
// comida del sábado y vermú del domingo.
//
// Dos decisiones:
//
//   · Los días se desplazan, no se copian. Si la escapada anterior
//     empezaba un viernes y la nueva también, «cena del viernes» cae
//     donde tiene que caer. Si alguna de las dos no tiene fechas
//     todavía, los tiempos se quedan sin día y ya se colocan luego.
//   · Nada llega marcado como hecho. El equipaje se copia con su dueño
//     (el proyector sigue siendo del mismo) pero sin tachar, y la compra
//     sin comprar y sin precios.
// =====================================================================

import { supabase } from './supabase'
import type { ShoppingItem, TripMeal, TripPacking } from './types'

export interface QueHeredar {
  menu: boolean
  equipaje: boolean
  compra: boolean
}

export interface Heredado {
  tiempos: number
  platos: number
  equipaje: number
  compra: number
}

/** Días enteros entre dos fechas ISO, o `null` si falta alguna. */
function desplazamiento(deOrigen: string | null, aDestino: string | null): number | null {
  if (!deOrigen || !aDestino) return null
  const a = Date.parse(`${deOrigen}T00:00:00Z`)
  const b = Date.parse(`${aDestino}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

function mueveDia(dia: string | null, dias: number | null): string | null {
  if (!dia || dias === null) return null
  const t = Date.parse(`${dia}T00:00:00Z`)
  if (Number.isNaN(t)) return null
  return new Date(t + dias * 86_400_000).toISOString().slice(0, 10)
}

export interface Encargo {
  origen: { id: string; start_date: string | null }
  destino: { id: string; start_date: string | null }
  que: QueHeredar
  /** Perfil que lo hereda, para `created_by`. */
  perfilId: string | null
}

/**
 * Copia de una escapada a otra lo que se haya pedido. Devuelve cuántas
 * cosas ha traído de cada tipo, que es lo que se le dice luego a quien
 * ha pulsado el botón.
 */
export async function hereda({ origen, destino, que, perfilId }: Encargo): Promise<Heredado> {
  const hecho: Heredado = { tiempos: 0, platos: 0, equipaje: 0, compra: 0 }
  const dias = desplazamiento(origen.start_date, destino.start_date)
  /** Tiempo viejo → tiempo nuevo, para poder recolocar la compra. */
  const nuevoTiempo = new Map<string, string>()

  if (que.menu) {
    const { data, error } = await supabase
      .from('trip_meals')
      .select('*')
      .eq('trip_id', origen.id)
      .order('sort_order')
    if (error) throw error
    const viejos = (data ?? []) as TripMeal[]

    if (viejos.length) {
      // Los identificadores se generan aquí para saber, sin volver a
      // preguntar, qué tiempo nuevo corresponde a cada viejo.
      const filas = viejos.map((t) => {
        const id = crypto.randomUUID()
        nuevoTiempo.set(t.id, id)
        return {
          id,
          trip_id: destino.id,
          name: t.name,
          day: mueveDia(t.day, dias),
          kind: t.kind,
          assigned_to: t.assigned_to,
          notes: t.notes,
          sort_order: t.sort_order,
        }
      })
      const { error: errIns } = await supabase.from('trip_meals').insert(filas)
      if (errIns) throw errIns
      hecho.tiempos = filas.length

      // Y los platos de cada tiempo. Los platos en sí son del recetario
      // del grupo, no de la escapada: se enlazan, no se copian.
      const { data: enTiempos, error: errPlatos } = await supabase.from('trip_meal_dishes').select('*')
      if (errPlatos) throw errPlatos
      const mios = ((enTiempos ?? []) as { meal_id: string; dish_id: string }[]).filter((x) =>
        nuevoTiempo.has(x.meal_id),
      )
      if (mios.length) {
        const { error: errIns2 } = await supabase
          .from('trip_meal_dishes')
          .insert(mios.map((x) => ({ meal_id: nuevoTiempo.get(x.meal_id)!, dish_id: x.dish_id })))
        if (errIns2) throw errIns2
        hecho.platos = mios.length
      }
    }
  }

  if (que.equipaje) {
    const { data, error } = await supabase
      .from('trip_packing')
      .select('*')
      .eq('trip_id', origen.id)
      .order('sort_order')
    if (error) throw error
    const cosas = (data ?? []) as TripPacking[]
    if (cosas.length) {
      const { error: errIns } = await supabase.from('trip_packing').insert(
        cosas.map((c) => ({
          trip_id: destino.id,
          name: c.name,
          notes: c.notes,
          // Quien llevó el proyector lo sigue llevando, pero sin tachar.
          member_id: c.member_id,
          done: false,
          created_by: perfilId,
          sort_order: c.sort_order,
        })),
      )
      if (errIns) throw errIns
      hecho.equipaje = cosas.length
    }
  }

  if (que.compra) {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('trip_id', origen.id)
      .order('sort_order')
    if (error) throw error
    const items = (data ?? []) as (ShoppingItem & { meal_id?: string | null; dish_id?: string | null })[]
    if (items.length) {
      const { error: errIns } = await supabase.from('shopping_items').insert(
        items.map((i) => ({
          trip_id: destino.id,
          master_item_id: i.master_item_id,
          name: i.name,
          category: i.category,
          unit: i.unit,
          needed_qty: i.needed_qty,
          // La despensa de este año es otra, y los precios también.
          available_qty: 0,
          buy_qty: i.needed_qty,
          purchased: false,
          price: null,
          assigned_to: i.assigned_to,
          notes: i.notes,
          sort_order: i.sort_order,
          // Si el menú no se ha copiado no hay tiempo al que colgarlo.
          meal_id: i.meal_id ? nuevoTiempo.get(i.meal_id) ?? null : null,
          dish_id: i.dish_id ?? null,
        })),
      )
      if (errIns) throw errIns
      hecho.compra = items.length
    }
  }

  return hecho
}

/** «8 tiempos, 12 platos y 9 cosas de equipaje». */
export function resumeHeredado(h: Heredado): string {
  const partes = [
    h.tiempos && `${h.tiempos} ${h.tiempos === 1 ? 'tiempo' : 'tiempos'}`,
    h.platos && `${h.platos} ${h.platos === 1 ? 'plato' : 'platos'}`,
    h.equipaje && `${h.equipaje} ${h.equipaje === 1 ? 'cosa de equipaje' : 'cosas de equipaje'}`,
    h.compra && `${h.compra} ${h.compra === 1 ? 'producto' : 'productos'}`,
  ].filter(Boolean) as string[]
  if (partes.length === 0) return 'No había nada que traer.'
  if (partes.length === 1) return `Traído: ${partes[0]}.`
  return `Traído: ${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}.`
}
