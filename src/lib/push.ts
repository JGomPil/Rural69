import { supabase } from './supabase'

/**
 * La clave pública VAPID del grupo.
 *
 * Es pública de verdad: viaja a cada navegador y al servicio de push, y
 * está aquí a la vista a propósito. La privada, con la que se firma cada
 * envío, vive solo en los secretos de Supabase y no aparece en ningún
 * sitio de este repositorio.
 */
export const CLAVE_PUBLICA = 'BID6UPXAGWUhlXHoT4T5_XefMG8FsYBssLBkG9X158R3gQeeOvKKR0kCePiAepz3L8F5Mt1CadNxPG5SCDvObZc'

/** El navegador quiere la clave en bytes, no en texto. */
function aBytes(base64url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = atob(base64)
  const bytes = new Uint8Array(crudo.length)
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes
}

function aTexto(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function soportaPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Apunta este aparato para recibir avisos con la aplicación cerrada.
 *
 * Se llama después de conceder el permiso. Si ya estaba suscrito, el
 * navegador devuelve la misma suscripción y la base de datos la actualiza
 * en vez de duplicarla, que para eso el `endpoint` es único.
 */
export async function suscribe(profileId: string): Promise<void> {
  if (!soportaPush()) return
  const registro = await navigator.serviceWorker.ready
  const suscripcion =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      // Obligatorio en los navegadores de hoy: todo push tiene que acabar
      // en un aviso visible. Nada de seguimiento silencioso.
      userVisibleOnly: true,
      applicationServerKey: aBytes(CLAVE_PUBLICA) as BufferSource,
    }))

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      endpoint: suscripcion.endpoint,
      p256dh: aTexto(suscripcion.getKey('p256dh')),
      auth: aTexto(suscripcion.getKey('auth')),
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

/** Deja de recibirlos en este aparato, y lo borra de la base de datos. */
export async function desuscribe(): Promise<void> {
  if (!soportaPush()) return
  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()
  if (!suscripcion) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', suscripcion.endpoint)
  await suscripcion.unsubscribe()
}
