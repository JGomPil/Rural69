// =====================================================================
// Rural69 · La copia de seguridad
// ---------------------------------------------------------------------
// Tres años de recetario, el historial de escapadas, quién llevó qué y
// las fotos del grupo viven en un único proyecto gratuito. No hace falta
// imaginar una catástrofe: basta un borrado con el dedo gordo.
//
// La copia se baja desde Ajustes y es un JSON con todo lo que se puede
// leer. Dos cosas que conviene saber y que por eso se dicen en la
// pantalla:
//
//   · Las fotos no van dentro. En el JSON van sus direcciones, que es
//     lo que hay en la base de datos; los archivos están en Storage.
//   · Lo que se baja es lo que tú puedes leer. Las políticas de la base
//     de datos siguen mandando, así que la copia completa la hace quien
//     administra.
// =====================================================================

import { supabase } from './supabase'

/**
 * Todo lo que se guarda. Si añades una tabla al esquema, añádela aquí:
 * una copia de seguridad que se queda vieja en silencio es peor que no
 * tenerla, porque se confía en ella.
 */
export const TABLAS_COPIA = [
  'profiles',
  'households',
  'members',
  'app_settings',
  'master_items',
  'trips',
  'trip_participants',
  'trip_date_options',
  'date_votes',
  'houses',
  'house_photos',
  'votes',
  'shopping_items',
  'pantry_items',
  'trip_meals',
  'trip_meal_dishes',
  'dishes',
  'dish_items',
  'trip_packing',
  'trip_photos',
  'trip_reminders',
  'messages',
  'message_reactions',
] as const

/**
 * Lo que se deja fuera a propósito:
 *
 *   · `push_subscriptions`: las claves de cada navegador. No sirven de
 *     nada restauradas y mejor no tenerlas dando vueltas en un archivo.
 *   · `notifications` y `message_reads`: avisos ya leídos y quién leyó
 *     qué. Se regeneran solos y solo abultan.
 */
export const FUERA_DE_LA_COPIA = ['push_subscriptions', 'notifications', 'message_reads']

const CLAVE_FECHA = 'rural69-ultima-copia'

export interface Copia {
  json: string
  filas: number
  tablasVacias: string[]
}

/** Lee todas las tablas y arma el JSON. Si una tabla falla, falla la copia. */
export async function generaCopia(): Promise<Copia> {
  const copia: Record<string, unknown> = {
    aplicacion: 'Rural69',
    fecha: new Date().toISOString(),
    // Para que quien abra el archivo en 2030 sepa qué no está mirando.
    sin: FUERA_DE_LA_COPIA,
    aviso: 'Las fotos no van dentro: aquí están sus direcciones, los archivos viven en Supabase Storage.',
  }
  let filas = 0
  const tablasVacias: string[] = []

  for (const tabla of TABLAS_COPIA) {
    const { data, error } = await supabase.from(tabla).select('*')
    // Una tabla que todavía no existe (falta pasar su SQL) no debería tirar
    // la copia de todo lo demás: se apunta y se sigue.
    if (error) {
      if (error.code === 'PGRST205' || /could not find the table/i.test(error.message)) {
        copia[tabla] = []
        tablasVacias.push(tabla)
        continue
      }
      throw error
    }
    copia[tabla] = data ?? []
    filas += (data ?? []).length
  }

  return { json: JSON.stringify(copia, null, 2), filas, tablasVacias }
}

/** Apunta que hoy se ha bajado una copia (solo en este navegador). */
export function apuntaCopia(cuando: Date = new Date()): void {
  try {
    localStorage.setItem(CLAVE_FECHA, cuando.toISOString())
  } catch {
    // Navegación privada o almacenamiento lleno: el recordatorio es lo de
    // menos, la copia ya está en el móvil.
  }
}

/** Cuándo se bajó la última, o `null` si nunca desde este navegador. */
export function ultimaCopia(): Date | null {
  try {
    const guardado = localStorage.getItem(CLAVE_FECHA)
    if (!guardado) return null
    const d = new Date(guardado)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/** Días desde la última copia, o `null` si no hay ninguna apuntada. */
export function diasDesdeLaCopia(ahora: Date = new Date()): number | null {
  const ultima = ultimaCopia()
  if (!ultima) return null
  return Math.floor((ahora.getTime() - ultima.getTime()) / 86_400_000)
}

/** A partir de aquí ya toca volver a bajarla. */
export const DIAS_PARA_AVISAR = 120
