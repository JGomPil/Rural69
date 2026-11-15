import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/supabase'

interface Opciones {
  /** Tablas que, al cambiar en Supabase, disparan una recarga (tiempo real). */
  realtime?: string[]
  /** Evita la consulta hasta que se cumpla la condición. */
  activo?: boolean
}

/**
 * Carga datos de Supabase, expone estado de carga/error y permite recargar.
 * Si se indican tablas en `realtime`, se suscribe a sus cambios para que
 * todos los móviles vean lo mismo al instante.
 */
export function useConsulta<T>(cargar: () => Promise<T>, deps: unknown[], opciones: Opciones = {}) {
  const { realtime, activo = true } = opciones
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(activo)
  const [error, setError] = useState<string | null>(null)

  const cargarRef = useRef(cargar)
  cargarRef.current = cargar

  const refrescar = useCallback(
    async (silencioso = false) => {
      if (!activo) {
        setCargando(false)
        return
      }
      if (!silencioso) setCargando(true)
      try {
        const resultado = await cargarRef.current()
        setDatos(resultado)
        setError(null)
      } catch (e) {
        console.error(e)
        setError(mensajeError(e))
      } finally {
        setCargando(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activo, ...deps],
  )

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  const tablas = (realtime ?? []).join(',')
  useEffect(() => {
    if (!tablas || !activo) return
    const nombre = `rural69-${tablas}-${Math.random().toString(36).slice(2, 8)}`
    const canal = supabase.channel(nombre)
    for (const tabla of tablas.split(',')) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        void refrescar(true)
      })
    }
    canal.subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [tablas, activo, refrescar])

  return { datos, cargando, error, refrescar, setDatos }
}
