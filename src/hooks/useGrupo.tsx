import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { esFalloDeRed, mensajeError, supabase } from '../lib/supabase'
import { guarda, lee } from '../lib/almacen'
import { yaPaso } from '../lib/estancia'
import type { Household, Member, Profile, Trip } from '../lib/types'
import { useAuth } from './useAuth'

interface Ajustes {
  factorNinos: number
  grupoHabitual: number
}

interface ContextoGrupo {
  miembros: Member[]
  hogares: Household[]
  perfiles: Profile[]
  escapadas: Trip[]
  ajustes: Ajustes
  cargando: boolean
  error: string | null
  /** Escapada que se muestra por defecto en el panel y en la navegación. */
  escapadaActiva: Trip | null
  refrescar: () => Promise<void>
}

const Contexto = createContext<ContextoGrupo | null>(null)

const AJUSTES_POR_DEFECTO: Ajustes = { factorNinos: 0.5, grupoHabitual: 15 }

/**
 * El grupo entero, guardado en el aparato.
 *
 * Es la copia más importante de todas: sin integrantes y sin escapadas la
 * aplicación no tiene de qué hablar, y cada pantalla diría «no encontramos
 * esta escapada». Son cuatro listas cortas —quince personas, cinco
 * escapadas—, así que cabe de sobra.
 */
const CLAVE_GRUPO = 'grupo'

interface GrupoGuardado {
  miembros: Member[]
  hogares: Household[]
  perfiles: Profile[]
  escapadas: Trip[]
  ajustes: Ajustes
}

/** Ordena: primero las próximas por fecha, luego las sin fecha, luego las pasadas. */
function ordenaEscapadas(escapadas: Trip[]): Trip[] {
  return [...escapadas].sort((a, b) => {
    if (a.start_date && b.start_date) return b.start_date.localeCompare(a.start_date)
    if (a.start_date) return -1
    if (b.start_date) return 1
    return b.created_at.localeCompare(a.created_at)
  })
}

function eligeActiva(escapadas: Trip[]): Trip | null {
  const hoy = new Date().toISOString().slice(0, 10)
  const vivas = escapadas.filter((t) => !yaPaso(t, hoy))
  const futuras = vivas
    .filter((t) => !t.end_date || t.end_date >= hoy)
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
  if (futuras.length) return futuras[0]
  if (vivas.length) return ordenaEscapadas(vivas)[0]
  const pasadas = ordenaEscapadas(escapadas.filter((t) => t.status !== 'archivada'))
  return pasadas[0] ?? ordenaEscapadas(escapadas)[0] ?? null
}

export function GrupoProvider({ children }: { children: React.ReactNode }) {
  const { perfil } = useAuth()
  // Lo guardado se lee antes del primer pintado: si se leyera en un efecto,
  // la aplicación enseñaría un momento que no hay escapadas.
  const copia = useMemo(() => lee<GrupoGuardado>(CLAVE_GRUPO)?.datos ?? null, [])
  const [miembros, setMiembros] = useState<Member[]>(copia?.miembros ?? [])
  const [hogares, setHogares] = useState<Household[]>(copia?.hogares ?? [])
  const [perfiles, setPerfiles] = useState<Profile[]>(copia?.perfiles ?? [])
  const [escapadas, setEscapadas] = useState<Trip[]>(copia?.escapadas ?? [])
  const [ajustes, setAjustes] = useState<Ajustes>(copia?.ajustes ?? AJUSTES_POR_DEFECTO)
  const [cargando, setCargando] = useState(!copia)
  const [error, setError] = useState<string | null>(null)
  /** Si hay algo que enseñar, un fallo de red no es una pantalla de error. */
  const hayAlgo = useRef(Boolean(copia))

  const refrescar = useCallback(async () => {
    if (!perfil) return
    try {
      const [m, h, p, t, a] = await Promise.all([
        supabase.from('members').select('*').order('created_at'),
        supabase.from('households').select('*').order('sort_order').order('name'),
        supabase.from('profiles').select('*').order('display_name'),
        supabase.from('trips').select('*'),
        supabase.from('app_settings').select('*'),
      ])
      const primerError = [m, h, p, t, a].find((r) => r.error)?.error
      if (primerError) throw primerError

      const mapa = new Map((a.data ?? []).map((row) => [row.key as string, row.value]))
      const nuevo: GrupoGuardado = {
        miembros: (m.data ?? []) as Member[],
        hogares: (h.data ?? []) as Household[],
        perfiles: (p.data ?? []) as Profile[],
        escapadas: ordenaEscapadas((t.data ?? []) as Trip[]),
        ajustes: {
          factorNinos: Number(mapa.get('child_factor') ?? AJUSTES_POR_DEFECTO.factorNinos),
          grupoHabitual: Number(mapa.get('default_group_size') ?? AJUSTES_POR_DEFECTO.grupoHabitual),
        },
      }

      setMiembros(nuevo.miembros)
      setHogares(nuevo.hogares)
      setPerfiles(nuevo.perfiles)
      setEscapadas(nuevo.escapadas)
      setAjustes(nuevo.ajustes)
      setError(null)
      hayAlgo.current = true
      guarda(CLAVE_GRUPO, nuevo)
    } catch (e) {
      console.error(e)
      // Sin red y con copia, la aplicación sigue funcionando con lo guardado.
      if (!(esFalloDeRed(e) && hayAlgo.current)) setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [perfil])

  useEffect(() => {
    if (!perfil) {
      setCargando(false)
      return
    }
    if (!hayAlgo.current) setCargando(true)
    void refrescar()
  }, [perfil, refrescar])

  // Tiempo real: cualquier cambio en el grupo o en las escapadas se refleja al instante.
  useEffect(() => {
    if (!perfil) return
    const canal = supabase.channel('rural69-grupo')
    for (const tabla of ['members', 'households', 'trips', 'profiles', 'app_settings']) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        void refrescar()
      })
    }
    canal.subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [perfil, refrescar])

  const valor = useMemo<ContextoGrupo>(
    () => ({
      miembros,
      hogares,
      perfiles,
      escapadas,
      ajustes,
      cargando,
      error,
      escapadaActiva: eligeActiva(escapadas),
      refrescar,
    }),
    [miembros, hogares, perfiles, escapadas, ajustes, cargando, error, refrescar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useGrupo(): ContextoGrupo {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useGrupo debe usarse dentro de <GrupoProvider>')
  return ctx
}

/** Nombre a mostrar de un perfil. */
export function nombrePerfil(perfiles: Profile[], id: string | null | undefined): string {
  if (!id) return 'Alguien'
  const p = perfiles.find((x) => x.id === id)
  return p?.display_name || p?.email || 'Alguien'
}

export function nombreMiembro(miembros: Member[], id: string | null | undefined): string | null {
  if (!id) return null
  return miembros.find((m) => m.id === id)?.name ?? null
}
