import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { mensajeError, supabase, supabaseConfigurado } from '../lib/supabase'
import type { Profile } from '../lib/types'

/** Lo que deja el script de `index.html` al rescatar el # de un email. */
interface Entrada {
  access_token: string | null
  refresh_token: string | null
  tipo: string
  error: string | null
}

declare global {
  interface Window {
    __rural69Entrada?: Entrada
  }
}

const ENTRADA = 'rural69-entrada'

function olvidaEntrada() {
  try {
    sessionStorage.removeItem(ENTRADA)
  } catch {
    // Navegación privada: no había nada que olvidar.
  }
}

/** ¿Entró por un email y todavía no ha puesto contraseña? */
function entradaPendiente(): 'invite' | 'recovery' | null {
  try {
    const v = sessionStorage.getItem(ENTRADA)
    return v === 'invite' || v === 'recovery' ? v : null
  } catch {
    return null
  }
}

interface ContextoAuth {
  session: Session | null
  perfil: Profile | null
  cargando: boolean
  /** Hay sesión pero la cuenta no tiene perfil en el grupo (no autorizada). */
  sinAutorizar: boolean
  esAdmin: boolean
  entrarConPassword: (email: string, password: string) => Promise<void>
  recuperarPassword: (email: string) => Promise<void>
  cambiarPassword: (password: string) => Promise<void>
  cambiarEmail: (email: string) => Promise<void>
  /** Comprueba una contraseña sin tocar la sesión actual. */
  compruebaPassword: (password: string) => Promise<boolean>
  /** Llegó por una invitación o por «he olvidado la contraseña», y le falta ponerla. */
  pendienteDeContrasenya: 'invite' | 'recovery' | null
  /** El enlace del email venía caducado o ya usado. */
  errorDelEnlace: string | null
  /** Ya tiene contraseña: se acabó el paso de bienvenida. */
  contrasenyaPuesta: () => void
  salir: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const Contexto = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [perfilResuelto, setPerfilResuelto] = useState(false)
  const [pendiente, setPendiente] = useState<'invite' | 'recovery' | null>(() => entradaPendiente())
  const [errorDelEnlace, setErrorDelEnlace] = useState<string | null>(
    () => window.__rural69Entrada?.error ?? null,
  )

  const cargaPerfil = useCallback(async (userId: string, emailSesion?: string | null) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) console.error('Rural69: no se ha podido cargar el perfil', error)
    let fila = (data as Profile | null) ?? null

    // Al cambiar el correo desde el perfil, auth lo actualiza cuando la persona
    // confirma el cambio por email. La tabla `profiles` no se entera sola, así
    // que la ponemos al día aquí, que es por donde pasa todo el mundo al entrar.
    if (fila && emailSesion && emailSesion !== fila.email) {
      const { data: actualizada } = await supabase
        .from('profiles')
        .update({ email: emailSesion })
        .eq('id', userId)
        .select('*')
        .maybeSingle()
      if (actualizada) fila = actualizada as Profile
    }

    setPerfil(fila)
    setPerfilResuelto(true)
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargando(false)
      return
    }
    let vivo = true

    // Si venimos de un email, los tokens los rescató `index.html` del # antes
    // de que el router lo pisara. Aquí se canjean por una sesión de verdad.
    const entrada = window.__rural69Entrada
    delete window.__rural69Entrada
    const arranca = async () => {
      if (entrada?.access_token && entrada.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: entrada.access_token,
          refresh_token: entrada.refresh_token,
        })
        if (error) {
          setErrorDelEnlace(mensajeError(error))
          olvidaEntrada()
          setPendiente(null)
        }
      }
      const { data } = await supabase.auth.getSession()
      if (!vivo) return
      setSession(data.session)
      if (!data.session) {
        setCargando(false)
        // Sin sesión no hay bienvenida que dar: el enlace no sirvió.
        olvidaEntrada()
        setPendiente(null)
      }
    }
    void arranca()

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
    cargaPerfil(session.user.id, session.user.email).finally(() => {
      if (vivo) setCargando(false)
    })
    return () => {
      vivo = false
    }
  }, [session?.user?.id, session?.user?.email, cargaPerfil])

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

      pendienteDeContrasenya: pendiente,
      errorDelEnlace,
      contrasenyaPuesta: () => {
        olvidaEntrada()
        setPendiente(null)
      },

      cambiarEmail: async (email) => {
        const { error } = await supabase.auth.updateUser({ email: email.trim() })
        if (error) throw error
      },

      // Supabase deja cambiar la contraseña sin pedir la anterior. Para que no
      // baste con pillar un móvil desbloqueado, la comprobamos antes a mano.
      compruebaPassword: async (password) => {
        if (!session?.user.email) return false
        const { error } = await supabase.auth.signInWithPassword({ email: session.user.email, password })
        return !error
      },

      salir: async () => {
        await supabase.auth.signOut()
        setPerfil(null)
        setPerfilResuelto(false)
      },

      refrescarPerfil: async () => {
        if (session?.user) await cargaPerfil(session.user.id, session.user.email)
      },
    }),
    [session, perfil, cargando, perfilResuelto, cargaPerfil, pendiente, errorDelEnlace],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
