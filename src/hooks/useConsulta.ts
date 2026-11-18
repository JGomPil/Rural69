import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { esFalloDeRed, mensajeError, supabase } from '../lib/supabase'
import { guarda, lee } from '../lib/almacen'
import { EVENTO_SINCRONIZADO } from '../lib/cola'

interface Opciones {
  /** Tablas que, al cambiar en Supabase, disparan una recarga (tiempo real). */
  realtime?: string[]
  /** Evita la consulta hasta que se cumpla la condición. */
  activo?: boolean
  /**
   * Clave con la que guardar en el aparato lo último que se leyó.
   *
   * Con ella, la pantalla pinta de inmediato lo de la última vez y luego lo
   * cambia por lo de verdad; y si no hay red, se queda con la copia en lugar
   * de enseñar un error. Solo tiene sentido en lo que se mira donde no hay
   * cobertura: la compra, el equipaje, el menú, la escapada.
   */
  copia?: string
}

/**
 * Carga datos de Supabase, expone estado de carga/error y permite recargar.
 * Si se indican tablas en `realtime`, se suscribe a sus cambios para que
 * todos los móviles vean lo mismo al instante.
 */
export function useConsulta<T>(cargar: () => Promise<T>, deps: unknown[], opciones: Opciones = {}) {
  const { realtime, activo = true, copia } = opciones

  // La copia se lee antes del primer pintado: si se leyera en un efecto, la
  // pantalla enseñaría «cargando…» y pegaría un salto.
  const inicial = useMemo(() => (copia ? lee<T>(copia) : null), [copia])
  const [datos, setDatos] = useState<T | null>(inicial?.datos ?? null)
  const [cargando, setCargando] = useState(activo && !inicial)
  const [error, setError] = useState<string | null>(null)
  const [sinRed, setSinRed] = useState(false)

  const cargarRef = useRef(cargar)
  cargarRef.current = cargar
  const copiaRef = useRef(copia)
  copiaRef.current = copia
  // Para saber, al fallar, si hay algo que enseñar o la pantalla está vacía.
  const datosRef = useRef(datos)
  datosRef.current = datos

  const refrescar = useCallback(
    async (silencioso = false) => {
      if (!activo) {
        setCargando(false)
        return
      }
      if (!silencioso && datosRef.current === null) setCargando(true)
      try {
        const resultado = await cargarRef.current()
        setDatos(resultado)
        setError(null)
        setSinRed(false)
        if (copiaRef.current) guarda(copiaRef.current, resultado)
      } catch (e) {
        if (esFalloDeRed(e)) {
          // Sin red con algo que enseñar no es un error de pantalla: es la
          // copia de la última vez, y eso se dice arriba con una tira, no
          // tapando la lista con un aviso rojo.
          setSinRed(true)
          if (datosRef.current === null) setError(mensajeError(e))
        } else {
          console.error(e)
          setError(mensajeError(e))
        }
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

  // Al cambiar de escapada cambia la clave, y con ella la copia que toca.
  useEffect(() => {
    if (!copia) return
    const guardada = lee<T>(copia)
    if (guardada) {
      setDatos(guardada.datos)
      setCargando(false)
    }
  }, [copia])

  /**
   * Como `setDatos`, pero además actualiza la copia del aparato.
   *
   * Lo usan las pantallas que pintan el cambio antes de que conteste el
   * servidor (marcar comprado, los más y los menos). Sin esto, cerrar la
   * aplicación sin cobertura y volver a abrirla enseñaría lo de antes,
   * aunque el cambio esté esperando en la cola.
   */
  const actualiza = useCallback((accion: T | null | ((previo: T | null) => T | null)) => {
    setDatos((previo) => {
      const siguiente = typeof accion === 'function' ? (accion as (p: T | null) => T | null)(previo) : accion
      if (copiaRef.current && siguiente !== null) guarda(copiaRef.current, siguiente)
      return siguiente
    })
  }, [])

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

  // Cuando vuelve la red y se manda lo que estaba pendiente, hay que releer:
  // el tiempo real se perdió los cambios de los demás mientras no había línea.
  useEffect(() => {
    const alSincronizar = () => void refrescar(true)
    window.addEventListener(EVENTO_SINCRONIZADO, alSincronizar)
    return () => window.removeEventListener(EVENTO_SINCRONIZADO, alSincronizar)
  }, [refrescar])

  return { datos, cargando, error, refrescar, setDatos: actualiza, sinRed }
}
