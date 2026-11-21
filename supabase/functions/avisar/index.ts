// =====================================================================
// Rural69 · Función «avisar»
// ---------------------------------------------------------------------
// Empuja al móvil los avisos que nacen en la base de datos, para que
// suenen con la aplicación cerrada.
//
// Vive aquí y no en el navegador por una razón sola: enviar un aviso
// push exige firmar con la clave privada VAPID, y una clave privada en
// el navegador no es privada. Por eso hace falta este trozo de servidor,
// y por eso es el único.
//
// Lo llama un «Database Webhook» de Supabase cada vez que se inserta una
// fila en `notifications`. Como `notificar()` inserta una fila por
// persona, llega una llamada por persona, cada una con su destinatario
// ya resuelto.
//
// Desplegar: panel de Supabase → Edge Functions → crear «avisar» y pegar
// esto. Secretos que necesita: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y
// VAPID_SUBJECT. Los dos de Supabase los pone él solo.
// =====================================================================

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const PUBLICA = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const PRIVADA = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
// A quién escribir si un servicio de push tiene una queja. Un correo basta.
const SUJETO = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:rural69@example.com'

webpush.setVapidDetails(SUJETO, PUBLICA, PRIVADA)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

interface Aviso {
  profile_id: string
  kind: string
  title: string
  body: string | null
  url: string | null
}

// ---------------------------------------------------------------------
// No molestar de noche
// ---------------------------------------------------------------------
// Esto está escrito dos veces a propósito: aquí, que es donde se decide
// porque es donde se firman los envíos, y en `src/lib/silencio.ts`, que
// es lo que deja al perfil decir «ahora mismo estarías en silencio». Una
// función de Deno no puede importar del navegador. Si cambia la regla,
// hay que cambiarla en los dos sitios.
// ---------------------------------------------------------------------

/** La hora que es en España (0–23), no la del servidor. */
function horaEnEspanya(cuando = new Date()): number {
  const texto = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(cuando)
  const h = Number.parseInt(texto, 10)
  return Number.isNaN(h) ? cuando.getUTCHours() : h
}

/** La ventana normal cruza la medianoche (de 23 a 8), de ahí las dos formas. */
function enSilencio(hora: number, desde: number, hasta: number): boolean {
  if (desde === hasta) return false
  return desde < hasta ? hora >= desde && hora < hasta : hora >= desde || hora < hasta
}

const CLAVE_SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/**
 * Solo una clave privilegiada puede mandar avisos.
 *
 * Supabase ya exige que el token sea válido para este proyecto, pero el de
 * cualquier integrante también lo es: sin esta comprobación, cualquiera del
 * grupo podría hacerle sonar el móvil a los demás con el texto que quisiera.
 *
 * Una clave privilegiada puede venir de tres formas, y las tres valen:
 *
 *  - `sb_secret_…`, el formato nuevo. No es un JWT y no se puede abrir, pero
 *    Supabase ya la ha dado por buena antes de llegar aquí, y solo la tiene
 *    quien administra el proyecto. Un integrante nunca ve una de estas.
 *  - El JWT antiguo con `role: service_role`.
 *  - La misma clave que Supabase le pasa a esta función, sea del formato
 *    que sea.
 *
 * Cuando rechaza, lo dice en el registro: sin esto, un 401 era un misterio
 * de media tarde.
 */
function loMandaElServidor(peticion: Request): boolean {
  const cabecera = peticion.headers.get('Authorization') ?? ''
  const token = cabecera.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    console.error('Rechazado: no viene cabecera Authorization')
    return false
  }
  if (token.startsWith('sb_secret_')) return true
  if (CLAVE_SERVICIO && token === CLAVE_SERVICIO) return true

  const trozos = token.split('.')
  if (trozos.length === 3) {
    try {
      const carga = JSON.parse(atob(trozos[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (carga.role === 'service_role') return true
      console.error('Rechazado: el token es de papel', carga.role, '— hace falta la clave de servicio')
      return false
    } catch {
      console.error('Rechazado: el token parece un JWT pero no se puede leer')
      return false
    }
  }
  // Nunca el token entero en el registro: es tan secreto como una contraseña.
  console.error('Rechazado: token de formato desconocido que empieza por', token.slice(0, 11))
  return false
}

Deno.serve(async (peticion) => {
  if (peticion.method !== 'POST') {
    return new Response('Solo POST', { status: 405 })
  }
  if (!PUBLICA || !PRIVADA) {
    console.error('Faltan las claves VAPID')
    return new Response('Sin configurar', { status: 500 })
  }
  if (!loMandaElServidor(peticion)) {
    return new Response('No autorizado', { status: 401 })
  }

  const cuerpo = await peticion.json().catch(() => null)
  const aviso: Aviso | null = cuerpo?.record ?? null
  if (!aviso?.profile_id || !aviso.title) {
    return new Response('Nada que enviar', { status: 200 })
  }

  // ¿Toca callarse? Se silencia el empujón, no el aviso: la fila de
  // `notifications` ya está escrita y por la mañana estará en la campana.
  const { data: quien, error: errPerfil } = await supabase
    .from('profiles')
    .select('quiet_hours, quiet_from, quiet_to')
    .eq('id', aviso.profile_id)
    .maybeSingle()

  if (errPerfil) {
    // Lo normal es que falte pasar `21_no_molestar.sql`. Ante la duda se
    // avisa: mejor sonar de noche una vez que callarse de día siempre.
    console.error('No he podido leer las horas de silencio:', errPerfil.message)
  } else if (quien?.quiet_hours && enSilencio(horaEnEspanya(), quien.quiet_from ?? 23, quien.quiet_to ?? 8)) {
    return new Response('En silencio: el aviso espera en la campana', { status: 200 })
  }

  const { data: suscripciones, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('profile_id', aviso.profile_id)

  if (error) {
    console.error('No he podido leer las suscripciones:', error.message)
    return new Response('Error al leer', { status: 500 })
  }
  if (!suscripciones || suscripciones.length === 0) {
    return new Response('Sin aparatos suscritos', { status: 200 })
  }

  const carga = JSON.stringify({
    title: aviso.title,
    body: aviso.body ?? '',
    url: aviso.url ?? '',
    kind: aviso.kind ?? 'aviso',
  })

  // Las suscripciones muertas se borran: un móvil que se formateó o un
  // navegador que se desinstaló dejan una dirección que ya no existe, y
  // guardarla para siempre solo hace más lento cada envío.
  const muertas: string[] = []
  const buenas: string[] = []

  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          carga,
          { TTL: 60 * 60 * 12 },
        )
        buenas.push(s.id)
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode
        if (codigo === 404 || codigo === 410) muertas.push(s.id)
        else console.error('Fallo al enviar a', s.endpoint.slice(0, 40), codigo, (e as Error).message)
      }
    }),
  )

  if (muertas.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', muertas)
  }
  // Solo a las que de verdad salieron. Marcarlas todas porque una funcionó
  // convierte el recibo en un adorno: deja de poder usarse para averiguar
  // qué aparato está recibiendo y cuál no.
  if (buenas.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ last_ok_at: new Date().toISOString() })
      .in('id', buenas)
  }

  return new Response(JSON.stringify({ enviados: buenas.length, borradas: muertas.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
