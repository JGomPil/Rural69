// =====================================================================
// Rural69 · Juegos de oído · La pantalla
// ---------------------------------------------------------------------
// El «¿Qué peli suena?» y el «¿Qué canción suena?» son el mismo juego:
// suenan treinta segundos y la mesa grita. Así que la pantalla es una,
// y cada juego le pasa lo suyo —su repertorio, su palabra, su llave de
// guardado— en vez de copiarla con otros textos.
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CloudOff, Info, Music } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGrupo } from '../../hooks/useGrupo'
import { Cargando } from '../ui/Varios'
import { MusicaJugadores } from './MusicaJugadores'
import { MusicaPartida } from './MusicaPartida'
import { useMesa } from '../../lib/juegos/sincronia'
import {
  nuevaPartida,
  otraPartida,
  sacaPistaDe,
  siguiente,
  trastosDe,
  type Categoria,
  type Opciones,
  type Partida,
  type Pista,
} from '../../lib/juegos/musica'

export function JuegoDeMusica({
  juego,
  llave,
  titulo,
  lema,
  cosa,
  cosas,
  comoVa,
  comoSeJuega,
  segundosPorDefecto,
  rondasPorDefecto,
  carga,
  categorias,
}: {
  /** La fila de `game_sessions`: «quepeli», «quecancion». */
  juego: string
  /** Dónde se guarda la copia de este móvil. Una por juego. */
  llave: string
  titulo: string
  lema: string
  /** «película» o «canción», en singular y en plural. */
  cosa: string
  cosas: string
  /** El resumen corto de la pantalla de montar partida. */
  comoVa: ReactNode
  /** Y las reglas largas, en el desplegable. */
  comoSeJuega: ReactNode
  segundosPorDefecto: number
  rondasPorDefecto: number
  carga: () => Promise<Pista[]>
  /** Los montones que puede elegir la mesa. Sin esto, se juega con todo. */
  categorias?: Categoria[]
}) {
  const { perfil } = useAuth()
  const { miembros } = useGrupo()
  // Estables de por vida: `useMesa` los guarda y no se espera que cambien.
  const trastos = useMemo(() => trastosDe(llave), [llave])
  // De los abiertos: el mando puede cambiar de móvil sin montar otra partida.
  const mesa = useMesa<Partida>(juego, perfil?.id ?? null, {
    guarda: trastos.guarda,
    lee: trastos.lee,
    todosJuegan: true,
  })

  // Una partida de una versión anterior no se puede pintar con estas
  // reglas —la ficha vivía en otro sitio—, así que se da por terminada y la
  // mesa vuelve a la pantalla de empezar.
  const yaLimpiada = useRef(false)
  const vieja = mesa.partida !== null && mesa.partida.version !== 4
  useEffect(() => {
    if (!vieja || yaLimpiada.current) return
    yaLimpiada.current = true
    void mesa.termina()
  }, [vieja, mesa])

  // El repertorio va en un .json aparte que se trae solo al entrar aquí.
  const [pistas, setPistas] = useState<Pista[] | null>(null)
  useEffect(() => {
    void carga().then(setPistas)
  }, [carga])

  /** El montón de una categoría. Sin categoría —o sin lista—, todo. */
  const montonDe = useCallback(
    (id: string | null) => {
      const cual = categorias?.find((c) => c.id === id)
      return cual && pistas ? pistas.filter(cual.tiene) : (pistas ?? [])
    },
    [categorias, pistas],
  )

  // El de la partida en marcha: la ronda siguiente la saca quien lleva
  // el mando, que puede ser otro móvil, y tiene que tirar del mismo.
  const elegida = mesa.partida?.categoria ?? null
  const saca = useCallback(
    (usadas: number[], azar: () => number) => {
      const monton = montonDe(elegida)
      return monton.length > 0 ? sacaPistaDe(monton, usadas, azar) : null
    },
    [montonDe, elegida],
  )

  const empieza = useCallback(
    (o: Omit<Opciones, 'moderador'>) => {
      // Quien monta la partida se queda con la música, que para eso la monta.
      const mando = perfil ? { perfil: perfil.id, nombre: perfil.display_name } : null
      // Aquí todavía no hay partida de la que leer la categoría: manda
      // la que se acaba de elegir en la pantalla de montar.
      const monton = montonDe(o.categoria)
      const partida = nuevaPartida({ ...o, moderador: mando }, (usadas, azar) =>
        sacaPistaDe(monton, usadas, azar),
      )
      if (partida) void mesa.empieza(partida)
    },
    [mesa, montonDe, perfil],
  )

  /** Cuántas hay de cada montón, para la pantalla de montar. */
  const conCuentas = useMemo(
    () => categorias?.map((c) => ({ id: c.id, nombre: c.nombre, cuantas: (pistas ?? []).filter(c.tiene).length })),
    [categorias, pistas],
  )
  const etiqueta = elegida && elegida !== 'todo' ? (categorias?.find((c) => c.id === elegida)?.nombre ?? null) : null

  return (
    <div className="space-y-5">
      <header className="animate-sube flex items-start gap-3">
        <Link
          to="/juegos"
          aria-label="Volver a los juegos"
          className="mt-1 text-carbon/40 transition hover:text-bosque-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800">
            <Music size={22} className="text-tierra-600" /> {titulo}
          </h1>
          <p className="text-sm text-tenue">{mesa.partida ? 'Partida en marcha.' : lema}</p>
        </div>
      </header>

      {mesa.cargando || !pistas || vieja ? (
        <Cargando
          texto={vieja ? 'Cerrando la partida de antes…' : pistas ? 'Mirando si hay partida…' : 'Buscando la música…'}
        />
      ) : mesa.partida ? (
        <>
          <MusicaPartida
            partida={mesa.partida}
            miPerfil={perfil?.id ?? null}
            miNombre={perfil?.display_name ?? 'Alguien'}
            cosa={cosa}
            etiqueta={etiqueta}
            aSolas={mesa.aSolas}
            desfase={mesa.desfase}
            onCambia={mesa.publica}
            onSiguiente={() => mesa.partida && mesa.publica(siguiente(mesa.partida, saca))}
            onOtra={() => {
              if (!mesa.partida) return
              const otra = otraPartida(mesa.partida, saca)
              if (otra) mesa.publica(otra)
            }}
            onSalir={() => void mesa.termina()}
          />
          {mesa.aSolas && (
            <p className="flex items-center justify-center gap-2 text-center text-xs text-suave">
              <CloudOff size={14} /> Sin línea con el servidor: se juega con este móvil, que pone la
              música y apunta.
            </p>
          )}
        </>
      ) : (
        <>
          <MusicaJugadores
            gente={miembros.filter((m) => m.active)}
            cuantas={pistas.length}
            categorias={conCuentas}
            cosas={cosas}
            comoVa={comoVa}
            segundosPorDefecto={segundosPorDefecto}
            rondasPorDefecto={rondasPorDefecto}
            onEmpezar={empieza}
          />
          <details className="group rounded-2xl border border-arena bg-superficie">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-bosque-700">
              <Info size={16} /> Cómo se juega
            </summary>
            <div className="space-y-2 border-t border-arena px-4 py-3 text-sm text-tenue">{comoSeJuega}</div>
          </details>
        </>
      )}
    </div>
  )
}
