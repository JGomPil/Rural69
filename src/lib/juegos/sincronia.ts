// =====================================================================
// Rural69 · Juegos · La partida en la mesa
// ---------------------------------------------------------------------
// Un juego de salón no es una pantalla por cabeza: es una mesa. Alguien
// lleva el mando —el moderador— y los demás miran. Eso es justo lo que
// hace esto: el moderador escribe la partida en `game_sessions` y a los
// demás les llega sola, sin recargar.
//
// Tres cosas que no se ven y que importan:
//
//   · Quien manda lo dicen los permisos de la base de datos, no la
//     educación: a los demás, Supabase les rechaza el cambio. Por eso
//     la pantalla de los que miran no tiene botones; no es decoración.
//   · El eco. Lo que escribe el moderador le vuelve por tiempo real un
//     instante después; si se lo creyera, su partida daría un saltito
//     en cada toque. Se reconoce por la hora exacta del envío, no por
//     quién lo firma: dos aparatos de la misma persona —el móvil y el
//     portátil— llevan la misma firma, y mirando solo la firma el
//     segundo se quedaba congelado.
//   · El desfase de relojes. La cuenta atrás viaja como un instante
//     («esto se acaba a las 23:04:11»), no como «quedan 30 segundos»,
//     porque dos móviles no tienen la misma hora. Al recibir se mide la
//     diferencia y cada pantalla corrige la suya.
//
// Y si no hay línea —o si todavía no se ha pasado el SQL— no se rompe
// nada: se juega a solas en este aparato, como antes.
// =====================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

/**
 * Lo único que la mesa necesita saber de una partida: cuándo se envió.
 * Con eso reconoce su propio eco y mide el desfase de relojes, y le da
 * igual si dentro hay un Furor o un ¿Quién soy?
 */
export interface Estado {
  emitido: number
}

interface Fila<T> {
  state: T
  moderator_id: string
  anyone_plays?: boolean
}

export interface Mesa<T> {
  partida: T | null
  /** Perfil que lleva el mando. `null` cuando se juega a solas. */
  moderador: string | null
  soyModerador: boolean
  /** Puedo escribir: o llevo el mando, o es partida en la que juegan todos. */
  puedoTocar: boolean
  /** Lo que va del reloj del que escribió al de este móvil, en milisegundos. */
  desfase: number
  cargando: boolean
  /** Sin línea con Supabase: la partida solo existe en este aparato. */
  aSolas: boolean
  /** Empieza una partida y se pone al mando. */
  empieza: (p: T) => Promise<void>
  /** Cambia la partida. Solo hace algo si puedes tocarla. */
  publica: (p: T) => void
  pasaElMando: (perfilId: string) => Promise<void>
  tomaElMando: () => Promise<void>
  termina: () => Promise<void>
}

export interface Trastos<T> {
  /** La copia de este aparato, para sobrevivir a un bloqueo de pantalla. */
  guarda: (p: T | null) => void
  lee: () => T | null
  /** Partida en la que cada jugador mueve lo suyo desde su móvil. */
  todosJuegan?: boolean
}

export function useMesa<T extends Estado>(
  juego: string,
  miPerfil: string | null,
  trastos: Trastos<T>,
): Mesa<T> {
  const { guarda, lee, todosJuegan = false } = trastos
  const [partida, setPartida] = useState<T | null>(null)
  const [moderador, setModerador] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aSolas, setASolas] = useState(false)
  const [desfase, setDesfase] = useState(0)

  const soyModerador = aSolas || (miPerfil !== null && moderador === miPerfil)
  const puedoTocar = soyModerador || todosJuegan
  // En un `ref` porque lo lee el envío, que no se vuelve a crear en cada
  // pintado, y se pone al día en un efecto: tocar un `ref` mientras se pinta
  // es justo lo que React pide no hacer.
  const puedoTocarRef = useRef(puedoTocar)
  useEffect(() => {
    puedoTocarRef.current = puedoTocar
  }, [puedoTocar])
  /** La hora del último envío propio: así se reconoce el eco sin equivocarse. */
  const ultimoEnvio = useRef(0)
  /**
   * La hora de la partida que tengo ahora mismo. Una lectura puede venir
   * de hace medio segundo y llegar después de un toque mío, y entonces no
   * vale: se mira la hora, no quién la escribió.
   */
  const miHora = useRef(0)

  /**
   * Guarda lo que llega. `fresco` dice si viene de un aviso de tiempo
   * real —recién escrito— o de una lectura de la tabla, que puede tener
   * media hora. Importa para el reloj: la diferencia entre el reloj del
   * otro y el mío solo se puede medir con algo recién emitido. Midiéndola
   * contra una partida vieja, la cuenta atrás salía más larga que el
   * tiempo que se había puesto.
   */
  const recoge = useCallback(
    (fila: Fila<T> | null, fresco: boolean) => {
      if (!fila) {
        setPartida(null)
        setModerador(null)
        miHora.current = 0
        return
      }
      setPartida(fila.state)
      setModerador(fila.moderator_id)
      miHora.current = fila.state?.emitido ?? 0
      if (fresco && typeof fila.state?.emitido === 'number') {
        setDesfase(Date.now() - fila.state.emitido)
      }
    },
    [],
  )

  // Lo que hay puesto ahora mismo en la mesa.
  const mira = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('state, moderator_id')
        .eq('game', juego)
        .maybeSingle()
      if (error) throw error
      // No se pisa lo que ya tengo con una lectura más vieja —la del que
      // acaba de mover es la buena—, pero cualquier cosa igual o más nueva
      // sí entra. Antes esto se decidía por «¿mando yo?», y en un juego en
      // el que mandan todos eso quería decir «no me entero de nada»: el que
      // abría el juego con la partida ya empezada no la veía.
      const fila = (data as Fila<T> | null) ?? null
      if (!fila || (fila.state?.emitido ?? 0) >= miHora.current) recoge(fila, false)
      setASolas(false)
    } catch {
      // Ni tabla ni línea: a solas, con lo último que hubiera aquí.
      setASolas(true)
      setPartida((antes) => antes ?? lee())
      setModerador(null)
      setDesfase(0)
    } finally {
      setCargando(false)
    }
    // `guarda` y `lee` son funciones del módulo del juego, las mismas en
    // cada pintado: ponerlas aquí no dispara relecturas.
  }, [juego, recoge, lee])

  useEffect(() => {
    // Sin `void` directo: así el primer `setCargando` cae en otro tic y no
    // encadena pintados dentro del propio efecto.
    const id = setTimeout(() => void mira(), 0)
    return () => clearTimeout(id)
  }, [mira])

  // Y se vuelve a mirar cuando el móvil despierta. Un teléfono bloqueado
  // pierde el cable del tiempo real sin avisar, y al desbloquearlo la
  // pantalla se habría quedado congelada en la jugada de hace diez
  // minutos: esto es lo que la pone al día.
  useEffect(() => {
    const despierta = () => {
      if (document.visibilityState === 'visible') void mira()
    }
    document.addEventListener('visibilitychange', despierta)
    window.addEventListener('online', despierta)
    return () => {
      document.removeEventListener('visibilitychange', despierta)
      window.removeEventListener('online', despierta)
    }
  }, [mira])

  // Y lo que vaya pasando, sin recargar.
  useEffect(() => {
    const canal = supabase
      .channel(`juego:${juego}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `game=eq.${juego}` },
        (aviso) => {
          if (aviso.eventType === 'DELETE') {
            setPartida(null)
            setModerador(null)
            return
          }
          const fila = aviso.new as unknown as Fila<T>
          // El eco de lo que acabo de escribir yo: ni caso.
          if (fila.state?.emitido === ultimoEnvio.current) return
          recoge(fila, true)
          setASolas(false)
        },
      )
    canal.subscribe((estado) => {
      // Entre que la página carga y el canal queda dado de alta pasan unos
      // segundos, y lo que ocurra en ese hueco no llega nunca. Al quedar
      // suscrito se relee la mesa, que es barato y cierra el agujero.
      if (estado === 'SUBSCRIBED') void mira()
    })
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [juego, recoge, mira])

  // La copia de este aparato es la red de seguridad del que escribe.
  useEffect(() => {
    if (puedoTocar) guarda(partida)
  }, [partida, puedoTocar, guarda])

  const escribe = useCallback(
    async (p: T, nuevoDuenyo = false) => {
      if (!miPerfil) return
      const sellada = { ...p, emitido: Date.now() }
      ultimoEnvio.current = sellada.emitido
      miHora.current = sellada.emitido
      // Lo que escribo yo va con mi reloj: contra mí mismo no hay desfase.
      setDesfase(0)

      // Durante la partida se CAMBIA la fila, no se da de alta otra vez. No
      // es un detalle: un alta exige firmarla como moderador, y en el
      // ¿Quién soy? el que toca no suele serlo. Mandándola igualmente, el
      // último que pulsara se llevaría el mando sin pretenderlo.
      if (!nuevoDuenyo) {
        const { data, error } = await supabase
          .from('game_sessions')
          .update({ state: sellada, updated_at: new Date().toISOString() })
          .eq('game', juego)
          .select('game')
        if (error) throw error
        // Si no había fila que cambiar —alguien terminó la partida por otro
        // lado—, no se pierde el envío en silencio: se vuelve a poner.
        if (data && data.length > 0) return
      }

      const fila: Record<string, unknown> = {
        game: juego,
        state: sellada,
        moderator_id: miPerfil,
        updated_at: new Date().toISOString(),
      }
      // La columna llegó en `23_juegos_de_todos.sql` y solo la necesitan los
      // juegos abiertos. Mandarla siempre haría que, hasta pasar ese SQL, el
      // Furor —que ya funcionaba— se cayera a jugar a solas.
      if (todosJuegan) fila.anyone_plays = true
      const { error } = await supabase.from('game_sessions').upsert(fila)
      if (error) throw error
    },
    [juego, miPerfil, todosJuegan],
  )

  const empieza = useCallback(
    async (p: T) => {
      setPartida(p)
      setModerador(miPerfil)
      try {
        await escribe(p, true)
        setASolas(false)
      } catch {
        setASolas(true)
      }
    },
    [escribe, miPerfil],
  )

  // Durante la partida no se espera a la base de datos: la pantalla del
  // moderador cambia al instante y el envío va detrás. Si falla, se juega
  // a solas y se avisa, pero el juego no se para por una mala cobertura.
  const publica = useCallback(
    (p: T) => {
      if (!puedoTocarRef.current) return
      setPartida(p)
      if (aSolas) return
      void escribe(p).catch(() => setASolas(true))
    },
    [aSolas, escribe],
  )

  const pasaElMando = useCallback(
    async (perfilId: string) => {
      if (!partida) return
      const { error } = await supabase
        .from('game_sessions')
        .update({ moderator_id: perfilId, updated_at: new Date().toISOString() })
        .eq('game', juego)
      if (error) throw error
      setModerador(perfilId)
    },
    [juego, partida],
  )

  const tomaElMando = useCallback(async () => {
    if (!miPerfil) return
    await pasaElMando(miPerfil)
  }, [miPerfil, pasaElMando])

  const termina = useCallback(async () => {
    setPartida(null)
    setModerador(null)
    guarda(null)
    if (aSolas) return
    try {
      await supabase.from('game_sessions').delete().eq('game', juego)
    } catch {
      // Si no se pudo borrar, al volver a entrar se verá la de antes.
    }
  }, [aSolas, juego, guarda])

  return {
    partida,
    moderador,
    soyModerador,
    puedoTocar,
    desfase,
    cargando,
    aSolas,
    empieza,
    publica,
    pasaElMando,
    tomaElMando,
    termina,
  }
}
