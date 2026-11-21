import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** `true` cuando las variables de entorno de Supabase están configuradas. */
export const supabaseConfigurado = Boolean(url && anonKey)

if (!supabaseConfigurado) {
  console.error(
    'Rural69: faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Crea un archivo .env.local (ver .env.example) o define los secrets en GitHub Actions.',
  )
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'sin-clave', {
  auth: {
    // PKCE: el enlace mágico vuelve como ?code=... y no choca con el router de hash.
    flowType: 'pkce',
    storageKey: 'rural69-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Convierte un error de Supabase en un mensaje legible en español. */
/**
 * Votar una segunda candidata choca con la restricción vieja mientras no se
 * haya pasado `supabase/10_voto_multiple.sql`. El error que llega es un
 * `23505` de Postgres, que no le dice nada a nadie.
 */
export function esVotoDuplicado(e: unknown): boolean {
  const t = mensajeError(e).toLowerCase()
  return (
    (t.includes('duplicate key') || t.includes('23505') || t.includes('ya existe')) &&
    (t.includes('voter_id') || t.includes('votes') || t.includes('sin_repetir'))
  )
}

/**
 * Una tabla que no existe todavía porque falta pasar su archivo SQL.
 *
 * PostgREST contesta `PGRST205` y el nombre de la tabla, que no le dice nada
 * a nadie. Mejor decir qué archivo falta por pasar.
 */
const ARCHIVOS_SQL: Record<string, string> = {
  trip_packing: 'supabase/13_equipaje.sql',
  trip_photos: 'supabase/18_fotos_escapada.sql',
  message_reactions: 'supabase/20_reacciones.sql',
  dishes: 'supabase/11_menus.sql',
  dish_items: 'supabase/11_menus.sql',
  trip_meal_dishes: 'supabase/11_menus.sql',
  trip_date_options: 'supabase/08_fechas.sql',
  date_votes: 'supabase/08_fechas.sql',
}

/** Y lo mismo con las columnas que llegaron después que su tabla. */
const COLUMNAS_SQL: Record<string, string> = {
  attending: 'supabase/17_quien_viene.sql',
  gate_code: 'supabase/19_datos_llegada.sql',
  wifi_password: 'supabase/19_datos_llegada.sql',
  arrival_notes: 'supabase/19_datos_llegada.sql',
  check_in: 'supabase/19_datos_llegada.sql',
  owner_phone: 'supabase/19_datos_llegada.sql',
  map_url: 'supabase/19_datos_llegada.sql',
}

export function faltaPasarSql(e: unknown): string | null {
  const t = mensajeError(e)
  const minusculas = t.toLowerCase()

  if (t.includes('PGRST205') || minusculas.includes('could not find the table')) {
    for (const [tabla, archivo] of Object.entries(ARCHIVOS_SQL)) {
      if (t.includes(tabla)) {
        return `Esto todavía no está en la base de datos: falta pasar ${archivo} en Supabase.`
      }
    }
    return null
  }

  // Una columna que no existe: PostgREST contesta PGRST204 al escribir y
  // 42703 al leer, y en los dos casos nombra la columna.
  if (t.includes('PGRST204') || t.includes('42703') || minusculas.includes('column')) {
    for (const [columna, archivo] of Object.entries(COLUMNAS_SQL)) {
      if (t.includes(columna)) {
        return `Esto todavía no está en la base de datos: falta pasar ${archivo} en Supabase.`
      }
    }
  }

  return null
}

/**
 * ¿Es que no hay red, o es que el servidor ha dicho que no?
 *
 * La diferencia manda: sin red lo que toca es enseñar la copia guardada y
 * apuntar el cambio para después; si el servidor ha contestado, hay que
 * decirlo y no esconderlo detrás de un «sin conexión».
 */
export function esFalloDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = typeof error === 'string' ? error : ((error as { message?: string })?.message ?? '')
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('network') ||
    msg.includes('fetch failed')
  )
}

export function mensajeError(error: unknown): string {
  if (!error) return 'Ha ocurrido un error inesperado.'
  const msg = typeof error === 'string' ? error : ((error as { message?: string }).message ?? '')
  const traducciones: Record<string, string> = {
    'Invalid login credentials': 'El email o la contraseña no son correctos.',
    'Email not confirmed': 'Tienes que confirmar tu email antes de entrar.',
    'User already registered': 'Ese email ya tiene cuenta.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Signups not allowed for this instance': 'El registro está cerrado. Pide al administrador que te invite.',
    'Email signups are disabled': 'El registro está cerrado. Pide al administrador que te invite.',
    'For security purposes, you can only request this after 60 seconds':
      'Por seguridad, espera un minuto antes de volver a intentarlo.',
    // Los que llegan por los enlaces de los emails de invitación y de
    // recuperar contraseña, que es justo cuando menos ganas hay de leer inglés.
    'Email link is invalid or has expired': 'el enlace ya se usó o ha caducado',
    'Token has expired or is invalid': 'el enlace ya se usó o ha caducado',
    'Invalid Refresh Token: Already Used': 'el enlace ya se usó',
    'New password should be different from the old password':
      'La contraseña nueva tiene que ser distinta de la anterior.',
    'Auth session missing!': 'La sesión ha caducado. Vuelve a entrar.',
  }
  for (const [en, es] of Object.entries(traducciones)) {
    if (msg.includes(en)) return es
  }
  if (msg.includes('row-level security')) {
    return 'No tienes permisos para hacer eso. Habla con el administrador del grupo.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Sin conexión con el servidor. Comprueba tu internet.'
  }
  return msg || 'Ha ocurrido un error inesperado.'
}
