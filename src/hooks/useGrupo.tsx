import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { mensajeError, supabase } from '../lib/supabase'
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
  const vivas = escapadas.filter((t) => t.status === 'planificacion' || t.status === 'confirmada')
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
  const [miembros, setMiembros] = useState<Member[]>([])
  const [hogares, setHogares] = useState<Household[]>([])
  const [perfiles, setPerfiles] = useState<Profile[]>([])
  const [escapadas, setEscapadas] = useState<Trip[]>([])
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_POR_DEFECTO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      setMiembros((m.data ?? []) as Member[])
      setHogares((h.data ?? []) as Household[])
      setPerfiles((p.data ?? []) as Profile[])
      setEscapadas(ordenaEscapadas((t.data ?? []) as Trip[]))

      const mapa = new Map((a.data ?? []).map((row) => [row.key as string, row.value]))
      setAjustes({
        factorNinos: Number(mapa.get('child_factor') ?? AJUSTES_POR_DEFECTO.factorNinos),
        grupoHabitual: Number(mapa.get('default_group_size') ?? AJUSTES_POR_DEFECTO.grupoHabitual),
      })
      setError(null)
    } catch (e) {
      console.error(e)
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [perfil])

  useEffect(() => {
    if (!perfil) {
      setCargando(false)
      return
    }
    setCargando(true)
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
