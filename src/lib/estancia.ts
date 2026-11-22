// =====================================================================
// Rural69 · ¿Estamos antes, dentro o después de la escapada?
// ---------------------------------------------------------------------
// Durante los tres días que de verdad importan, la aplicación seguía
// diciendo «te falta votar las fechas» y «hay que proponer casas». Eso
// ya está resuelto: lo que hace falta estando allí es otra cosa, y cabe
// en tres preguntas.
//
//   · ¿Qué se come hoy?
//   · ¿Qué falta por comprar?
//   · ¿Cuál era la clave del portón?
//
// Aquí solo se decide EN QUÉ MOMENTO estamos, que es lo que enciende esa
// otra cara del panel. Es aritmética de fechas sin React ni Supabase, a
// propósito: así se puede probar.
// =====================================================================

import { hoyISO } from './formato'
import type { EstadoEscapada, Trip, TripMeal } from './types'

export type Momento = 'antes' | 'durante' | 'despues'

/** Un día ISO (`2027-04-17`) como número de días, para poder restar. */
function aDias(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return Number.isNaN(t) ? NaN : Math.round(t / 86_400_000)
}

/** `2027-04-17` + 1 día = `2027-04-18`. */
export function sumaDias(iso: string, dias: number): string {
  const d = aDias(iso)
  if (Number.isNaN(d)) return iso
  return new Date((d + dias) * 86_400_000).toISOString().slice(0, 10)
}

/**
 * En qué momento de la escapada estamos.
 *
 * El estado manda sobre el calendario: si alguien la ha marcado como
 * realizada o archivada, es que ya pasó, diga lo que diga la fecha.
 * Y sin fecha de inicio no hay nada que estar viviendo todavía.
 */
export function momentoDe(
  escapada: Pick<Trip, 'start_date' | 'end_date' | 'status'>,
  hoy: string = hoyISO(),
): Momento {
  if (escapada.status === 'realizada' || escapada.status === 'archivada') return 'despues'
  const inicio = escapada.start_date
  if (!inicio) return 'antes'
  const fin = escapada.end_date || inicio
  if (hoy < inicio) return 'antes'
  if (hoy > fin) return 'despues'
  return 'durante'
}

/**
 * El estado que hay que enseñar, que no siempre es el apuntado.
 *
 * Lo guardado manda mientras no contradiga al calendario: una escapada cuyas
 * fechas ya pasaron está hecha, aunque nadie se acordara de marcarla. Eso es
 * lo que hace falta para apuntar las de antes de la aplicación —se ponen sus
 * fechas y aparece donde toca, en el historial y no «en planificación»— y de
 * paso arregla las que se quedan colgadas porque el finde pasó y nadie tocó
 * el desplegable.
 */
export function estadoDe(
  escapada: Pick<Trip, 'start_date' | 'end_date' | 'status'>,
  hoy: string = hoyISO(),
): EstadoEscapada {
  if (escapada.status === 'realizada' || escapada.status === 'archivada') return escapada.status
  return momentoDe(escapada, hoy) === 'despues' ? 'realizada' : escapada.status
}

/** ¿Es de las que ya pasaron? Es el reparto entre «próximas» y «pasadas». */
export function yaPaso(
  escapada: Pick<Trip, 'start_date' | 'end_date' | 'status'>,
  hoy: string = hoyISO(),
): boolean {
  const estado = estadoDe(escapada, hoy)
  return estado === 'realizada' || estado === 'archivada'
}

/** «Día 2 de 3». `null` si hoy cae fuera de la escapada. */
export function diaDeLaEstancia(
  inicio: string | null,
  fin: string | null,
  hoy: string = hoyISO(),
): { dia: number; total: number } | null {
  if (!inicio) return null
  const ultimo = fin || inicio
  if (hoy < inicio || hoy > ultimo) return null
  const dia = aDias(hoy) - aDias(inicio) + 1
  const total = aDias(ultimo) - aDias(inicio) + 1
  if (Number.isNaN(dia) || Number.isNaN(total)) return null
  return { dia, total }
}

export interface TiemposRepartidos {
  /** Lo de hoy, que es lo único que se mira con el delantal puesto. */
  hoy: TripMeal[]
  /** Lo de mañana, en pequeño: sirve para saber si hay que sacar algo del congelador. */
  manyana: TripMeal[]
  /** Los que nadie puso en un día concreto: desayunos, bebida, picoteo. */
  sinDia: TripMeal[]
}

/** Reparte los tiempos de la escapada en hoy, mañana y sin día. */
export function reparteTiempos(tiempos: TripMeal[], hoy: string = hoyISO()): TiemposRepartidos {
  const manyana = sumaDias(hoy, 1)
  const orden = (a: TripMeal, b: TripMeal) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es')
  return {
    hoy: tiempos.filter((t) => t.day === hoy).sort(orden),
    manyana: tiempos.filter((t) => t.day === manyana).sort(orden),
    sinDia: tiempos.filter((t) => !t.day).sort(orden),
  }
}
