import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { EVENTO_COLA, envia, pendientes } from '../lib/cola'

interface ContextoConexion {
  enLinea: boolean
  /** Cuántos retoques esperan a que vuelva la red. */
  porMandar: number
  mandando: boolean
  /** Intentar mandarlos ahora mismo. */
  manda: () => Promise<void>
}

const Contexto = createContext<ContextoConexion | null>(null)

/**
 * Si hay red y qué queda por mandar.
 *
 * El navegador avisa de los dos cambios —`online` y `offline`—, pero
 * `navigator.onLine` solo sabe si hay *interfaz* de red: en una casa rural
 * con wifi sin internet dice que sí. Por eso lo que de verdad manda es si
 * las consultas fallan (ver `useConsulta`); esto es la parte cómoda, la que
 * permite reaccionar en el momento en que vuelve la cobertura.
 */
export function ConexionProvider({ children }: { children: React.ReactNode }) {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)
  const [porMandar, setPorMandar] = useState(() => pendientes().length)
  const [mandando, setMandando] = useState(false)

  const manda = useCallback(async () => {
    if (pendientes().length === 0) return
    setMandando(true)
    try {
      await envia()
    } finally {
      setMandando(false)
      setPorMandar(pendientes().length)
    }
  }, [])

  useEffect(() => {
    const cuenta = () => setPorMandar(pendientes().length)
    const vuelve = () => {
      setEnLinea(true)
      void manda()
    }
    const sale = () => setEnLinea(false)

    window.addEventListener(EVENTO_COLA, cuenta)
    window.addEventListener('online', vuelve)
    window.addEventListener('offline', sale)
    // Y al abrir: puede que la pestaña anterior se cerrara con cosas sin mandar.
    if (navigator.onLine) void manda()

    return () => {
      window.removeEventListener(EVENTO_COLA, cuenta)
      window.removeEventListener('online', vuelve)
      window.removeEventListener('offline', sale)
    }
  }, [manda])

  const valor = useMemo<ContextoConexion>(
    () => ({ enLinea, porMandar, mandando, manda }),
    [enLinea, porMandar, mandando, manda],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useConexion(): ContextoConexion {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useConexion debe usarse dentro de <ConexionProvider>')
  return ctx
}
