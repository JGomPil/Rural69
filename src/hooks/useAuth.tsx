import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface ContextoAuth {
  session: Session | null
  perfil: Profile | null
  cargando: boolean
  /** Hay sesión pero la cuenta no tiene perfil en el grupo (no autorizada). */
  sinAutorizar: boolean
  esAdmin: boolean
  entrarConPassword: (email: string, password: string) => Promise<void>
  registrarse: (email: string, password: string, nombre: string) => Promise<{ necesitaConfirmar: boolean }>
  entrarConEnlace: (email: string) => Promise<void>
  recuperarPassword: (email: string) => Promise<void>
  cambiarPassword: (password: string) => Promise<void>
  salir: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const Contexto = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [perfilResuelto, setPerfilResuelto] = useState(false)

  const cargaPerfil = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) console.error('Rural69: no se ha podido cargar el perfil', error)
    setPerfil((data as Profile | null) ?? null)
    setPerfilResuelto(true)
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargando(false)
      return
    }
    let vivo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSession(data.session)
      if (!data.session) {
        setCargando(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion)
      if (!nuevaSesion) {
        setPerfil(null)
        setPerfilResuelto(false)
        setCargando(false)
      }
    })

    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let vivo = true
    setCargando(true)
    cargaPerfil(session.user.id).finally(() => {
      if (vivo) setCargando(false)
    })
    return () => {
      vivo = false
    }
  }, [session?.user?.id, cargaPerfil])

  const valor = useMemo<ContextoAuth>(
    () => ({
      session,
      perfil,
      cargando,
      sinAutorizar: Boolean(session) && perfilResuelto && !perfil,
      esAdmin: perfil?.role === 'admin',

      entrarConPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      },

      registrarse: async (email, password, nombre) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: nombre.trim() } },
        })
        if (error) throw error
        return { necesitaConfirmar: !data.session }
      },

      entrarConEnlace: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.href.split('#')[0], shouldCreateUser: false },
        })
        if (error) throw error
      },

      recuperarPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.href.split('#')[0],
        })
        if (error) throw error
      },

      cambiarPassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      },

      salir: async () => {
        await supabase.auth.signOut()
        setPerfil(null)
        setPerfilResuelto(false)
      },

      refrescarPerfil: async () => {
        if (session?.user) await cargaPerfil(session.user.id)
      },
    }),
    [session, perfil, cargando, perfilResuelto, cargaPerfil],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
