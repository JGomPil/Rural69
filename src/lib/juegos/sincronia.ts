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
//     en cada toque. Se ignora lo que viene firmado por uno mismo.
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
import { guardaPartida, leePartida, sella, type Partida } from './furor'

interface Fila {
  state: Partida
  moderator_id: string
}

export interface Mesa {
  partida: Partida | null
  /** Perfil que lleva el mando. `null` cuando se juega a solas. */
  moderador: string | null
  soyModerador: boolean
  /** Lo que va del reloj del moderador al de este móvil, en milisegundos. */
  desfase: number
  cargando: boolean
  /** Sin línea con Supabase: la partida solo existe en este aparato. */
  aSolas: boolean
  /** Empieza una partida y se pone al mando. */
  empieza: (p: Partida) => Promise<void>
  /** Cambia la partida. Solo hace algo si llevas el mando. */
  publica: (p: Partida) => void
  pasaElMando: (perfilId: string) => Promise<void>
  tomaElMando: () => Promise<void>
  termina: () => Promise<void>
}

export function usaMesa(juego: string, miPerfil: string | null): Mesa {
  const [partida, setPartida] = useState<Partida | null>(null)
  const [moderador, setModerador] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aSolas, setASolas] = useState(false)
  const [desfase, setDesfase] = useState(0)

  const soyModerador = aSolas || (miPerfil !== null && moderador === miPerfil)
  const soyModeradorRef = useRef(soyModerador)
  soyModeradorRef.current = soyModerador

  const recoge = useCallback(
    (fila: Fila | null) => {
      if (!fila) {
        setPartida(null)
        setModerador(null)
        return
      }
      setPartida(fila.state)
      setModerador(fila.moderator_id)
      // La hora del otro contra la mía, medida al recibir.
      setDesfase(typeof fila.state?.emitido === 'number' ? Date.now() - fila.state.emitido : 0)
    },
    [],
  )

  // Lo que hay puesto ahora mismo en la mesa.
  useEffect(() => {
    let vivo = true
    const mira = async () => {
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('state, moderator_id')
          .eq('game', juego)
          .maybeSingle()
        if (error) throw error
        if (!vivo) return
        recoge((data as Fila | null) ?? null)
        setASolas(false)
      } catch {
        // Ni tabla ni línea: a solas, con lo último que hubiera aquí.
        if (!vivo) return
        setASolas(true)
        setPartida(leePartida())
        setModerador(null)
        setDesfase(0)
      } finally {
        if (vivo) setCargando(false)
      }
    }
    void mira()
    return () => {
      vivo = false
    }
  }, [juego, recoge])

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
          const fila = aviso.new as unknown as Fila
          // El eco de lo que acabo de escribir yo: ni caso.
          if (soyModeradorRef.current && fila.moderator_id === miPerfil) return
          recoge(fila)
          setASolas(false)
        },
      )
    canal.subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [juego, miPerfil, recoge])

  // La copia de este aparato es la red de seguridad del que lleva el mando.
  useEffect(() => {
    if (soyModerador) guardaPartida(partida)
  }, [partida, soyModerador])

  const escribe = useCallback(
    async (p: Partida) => {
      if (!miPerfil) return
      const { error } = await supabase
        .from('game_sessions')
        .upsert({ game: juego, state: sella(p), moderator_id: miPerfil, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    [juego, miPerfil],
  )

  const empieza = useCallback(
    async (p: Partida) => {
      setPartida(p)
      setModerador(miPerfil)
      try {
        await escribe(p)
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
    (p: Partida) => {
      if (!soyModeradorRef.current) return
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
    guardaPartida(null)
    if (aSolas) return
    try {
      await supabase.from('game_sessions').delete().eq('game', juego)
    } catch {
      // Si no se pudo borrar, al volver a entrar se verá la de antes.
    }
  }, [aSolas, juego])

  return {
    partida,
    moderador,
    soyModerador,
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
