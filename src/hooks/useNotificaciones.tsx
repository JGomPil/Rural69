import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { desuscribe, suscribe } from '../lib/push'
import { ponInsignia } from '../lib/insignia'
import type { Notification as Aviso } from '../lib/types'
import { useAuth } from './useAuth'
import { useConsulta } from './useConsulta'

/**
 * Los avisos del grupo: alguien escribe en el chat, propone una casa, se abre
 * una votación, ya hay casa elegida.
 *
 * Dos cosas distintas, y conviene no confundirlas:
 *
 *   1. El buzón de dentro de la aplicación (la campana). Funciona siempre, en
 *      cualquier navegador, y es la fuente de la verdad: los avisos están en
 *      Supabase y llegan en tiempo real.
 *   2. El aviso del sistema operativo, el que suena. Hay que autorizarlo
 *      aparato por aparato. Lo que se lanza desde aquí es solo para cuando la
 *      aplicación está abierta; con la aplicación cerrada el aviso llega
 *      empujado desde el servidor (ver `lib/push.ts` y la función `avisar`),
 *      y entonces lo pinta el service worker, no esto.
 */

const CLAVE_PREFERENCIA = 'rural69-avisos'

/** Lo que llega después de esto se considera recién llegado y suena. */
const RECIENTE_MS = 2 * 60 * 1000

export type EstadoPermiso = 'concedido' | 'denegado' | 'sin-pedir' | 'no-soportado'

function soportaAvisos(): boolean {
  // En iPhone, `Notification` no existe hasta que la aplicación se instala en
  // la pantalla de inicio.
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

function estadoPermiso(): EstadoPermiso {
  if (!soportaAvisos()) return 'no-soportado'
  if (Notification.permission === 'granted') return 'concedido'
  if (Notification.permission === 'denied') return 'denegado'
  return 'sin-pedir'
}

function leePreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE_PREFERENCIA) === 'si'
  } catch {
    return false
  }
}

function guardaPreferencia(valor: boolean) {
  try {
    localStorage.setItem(CLAVE_PREFERENCIA, valor ? 'si' : 'no')
  } catch {
    /* sin almacenamiento: vale para esta sesión */
  }
}

interface ContextoAvisosGrupo {
  lista: Aviso[]
  sinLeer: number
  cargando: boolean
  /** Marca como leídos todos los que hay. */
  marcarTodos: () => Promise<void>
  marcarUno: (id: string) => Promise<void>
  /** Vacía el buzón (solo los ya leídos). */
  borrarLeidos: () => Promise<void>
  // --- avisos del sistema operativo, por aparato ---
  permiso: EstadoPermiso
  /** Si están encendidos en este aparato (y autorizados). */
  activados: boolean
  /** Pide permiso al navegador. Tiene que salir de un clic de la persona. */
  activar: () => Promise<void>
  desactivar: () => void
}

const Contexto = createContext<ContextoAvisosGrupo | null>(null)

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const { perfil } = useAuth()
  const [permiso, setPermiso] = useState<EstadoPermiso>(estadoPermiso)
  const [quiere, setQuiere] = useState<boolean>(leePreferencia)

  const { datos, cargando, refrescar, setDatos } = useConsulta<Aviso[]>(
    async () => {
      if (!perfil) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as Aviso[]
    },
    [perfil?.id],
    { realtime: ['notifications'], activo: Boolean(perfil) },
  )

  // Memorizada: si fuese `datos ?? []` a secas, sería un array nuevo en cada
  // pintado y el contexto cambiaría siempre, repintando media aplicación.
  const lista = useMemo(() => datos ?? [], [datos])
  const sinLeer = lista.filter((a) => !a.read_at).length

  // ---------------------------------------------------------------
  // El número en el icono de la pantalla de inicio
  // ---------------------------------------------------------------
  // La campana de dentro solo se ve si ya has abierto la aplicación. Esto
  // es lo de fuera, y se apaga en el momento en que abres el buzón. No
  // depende de tener los avisos del sistema activados: es otra cosa, y en
  // una aplicación instalada funciona igual.
  useEffect(() => {
    void ponInsignia(sinLeer)
  }, [sinLeer])

  // ---------------------------------------------------------------
  // Avisos del sistema para lo que acaba de llegar
  // ---------------------------------------------------------------
  const vistos = useRef<Set<string> | null>(null)
  const activados = quiere && permiso === 'concedido'

  // Quien ya tenía los avisos puestos de antes no vuelve a pasar por
  // `activar()`, así que nunca se apuntaría para los del móvil. Se
  // comprueba al entrar: si ya está apuntado, el navegador devuelve la
  // misma suscripción y esto no hace nada.
  useEffect(() => {
    if (!activados || !perfil?.id) return
    void suscribe(perfil.id).catch((e) =>
      console.error('Rural69: no he podido apuntar este aparato para los avisos', e),
    )
  }, [activados, perfil?.id])

  useEffect(() => {
    if (!datos) return

    // La primera carga no suena: si no, al abrir la aplicación saltarían de
    // golpe todos los avisos pendientes de la semana.
    if (vistos.current === null) {
      vistos.current = new Set(datos.map((a) => a.id))
      return
    }

    const nuevos = datos.filter(
      (a) =>
        !vistos.current!.has(a.id) &&
        !a.read_at &&
        Date.now() - new Date(a.created_at).getTime() < RECIENTE_MS,
    )
    for (const a of datos) vistos.current.add(a.id)

    if (!activados || nuevos.length === 0) return
    // Si la persona está mirando la aplicación, ya ve la campana: no hace
    // falta un aviso del sistema encima.
    if (document.visibilityState === 'visible') return

    void (async () => {
      try {
        const registro = await navigator.serviceWorker.ready
        for (const a of nuevos) {
          await registro.showNotification(a.title, {
            body: a.body ?? undefined,
            icon: `${import.meta.env.BASE_URL}icon-192.png`,
            badge: `${import.meta.env.BASE_URL}icon-192.png`,
            // Con la misma etiqueta, un aviso sustituye al anterior en lugar
            // de apilarse: si se proponen cuatro casas, no suena cuatro veces.
            tag: a.kind,
            data: { url: a.url },
          })
        }
      } catch (e) {
        console.error('Rural69: no se ha podido mostrar el aviso', e)
      }
    })()
  }, [datos, activados])

  // ---------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------
  const marcarTodos = useCallback(async () => {
    if (!perfil || sinLeer === 0) return
    const ahora = new Date().toISOString()
    // Se pinta antes de que conteste el servidor: el contador tiene que
    // apagarse en el mismo momento en que se abre el buzón.
    setDatos((prev) => (prev ?? []).map((a) => (a.read_at ? a : { ...a, read_at: ahora })))
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: ahora })
      .eq('profile_id', perfil.id)
      .is('read_at', null)
    if (error) {
      console.error(error)
      await refrescar(true)
    }
  }, [perfil, sinLeer, setDatos, refrescar])

  const marcarUno = useCallback(
    async (id: string) => {
      const ahora = new Date().toISOString()
      setDatos((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, read_at: a.read_at ?? ahora } : a)))
      const { error } = await supabase.from('notifications').update({ read_at: ahora }).eq('id', id)
      if (error) {
        console.error(error)
        await refrescar(true)
      }
    },
    [setDatos, refrescar],
  )

  const borrarLeidos = useCallback(async () => {
    if (!perfil) return
    setDatos((prev) => (prev ?? []).filter((a) => !a.read_at))
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('profile_id', perfil.id)
      .not('read_at', 'is', null)
    if (error) {
      console.error(error)
      await refrescar(true)
    }
  }, [perfil, setDatos, refrescar])

  const activar = useCallback(async () => {
    if (!soportaAvisos()) {
      setPermiso('no-soportado')
      return
    }
    const respuesta = await Notification.requestPermission()
    const nuevo: EstadoPermiso =
      respuesta === 'granted' ? 'concedido' : respuesta === 'denied' ? 'denegado' : 'sin-pedir'
    setPermiso(nuevo)
    if (nuevo === 'concedido') {
      guardaPreferencia(true)
      setQuiere(true)
      // Y además, apuntar este aparato para que suene con la aplicación
      // cerrada. Si falla, el permiso sigue valiendo: se seguirán viendo
      // los avisos mientras la app esté abierta, que es como era antes.
      if (perfil?.id) {
        try {
          await suscribe(perfil.id)
        } catch (e) {
          console.error('Rural69: no he podido apuntar este aparato para los avisos', e)
        }
      }
    }
  }, [perfil?.id])

  const desactivar = useCallback(() => {
    guardaPreferencia(false)
    setQuiere(false)
    void desuscribe().catch((e) =>
      console.error('Rural69: no he podido dar de baja este aparato', e),
    )
  }, [])

  const valor = useMemo<ContextoAvisosGrupo>(
    () => ({
      lista,
      sinLeer,
      cargando,
      marcarTodos,
      marcarUno,
      borrarLeidos,
      permiso,
      activados,
      activar,
      desactivar,
    }),
    [lista, sinLeer, cargando, marcarTodos, marcarUno, borrarLeidos, permiso, activados, activar, desactivar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useNotificaciones(): ContextoAvisosGrupo {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>')
  return ctx
}
