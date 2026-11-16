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
