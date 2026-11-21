import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CloudOff, Info, Music } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGrupo } from '../hooks/useGrupo'
import { Cargando } from '../components/ui/Varios'
import { PeliJugadores } from '../components/juegos/PeliJugadores'
import { PeliPartida } from '../components/juegos/PeliPartida'
import { useMesa } from '../lib/juegos/sincronia'
import { cargaLasBandas, sacaBandaDe, type Banda } from '../lib/juegos/bandas'
import {
  guardaPartidaB,
  leePartidaB,
  nuevaPartidaB,
  otraPartidaB,
  siguienteB,
  type OpcionesB,
  type PartidaB,
} from '../lib/juegos/bandasonora'

export function QuePeliSuena() {
  const { perfil } = useAuth()
  const { miembros } = useGrupo()
  // De los abiertos: el mando puede cambiar de móvil sin montar otra partida.
  const mesa = useMesa<PartidaB>('quepeli', perfil?.id ?? null, {
    guarda: guardaPartidaB,
    lee: leePartidaB,
    todosJuegan: true,
  })

  // Una partida de la versión anterior —cuando la película se escribía— no se
  // puede pintar con estas reglas: no trae moderador y trae sillas. Se da por
  // terminada, y la mesa vuelve a la pantalla de empezar.
  const yaLimpiada = useRef(false)
  const vieja = mesa.partida !== null && mesa.partida.version !== 2
  useEffect(() => {
    if (!vieja || yaLimpiada.current) return
    yaLimpiada.current = true
    void mesa.termina()
  }, [vieja, mesa])

  // El repertorio va en un .json aparte que se trae solo al entrar aquí.
  const [bandas, setBandas] = useState<Banda[] | null>(null)
  useEffect(() => {
    void cargaLasBandas().then(setBandas)
  }, [])

  const saca = useCallback(
    (usadas: number[], azar: () => number) => (bandas ? sacaBandaDe(bandas, usadas, azar) : null),
    [bandas],
  )

  const empieza = useCallback(
    (o: Omit<OpcionesB, 'moderador'>) => {
      // Quien monta la partida se queda con la música, que para eso la monta.
      const mando = perfil ? { perfil: perfil.id, nombre: perfil.display_name } : null
      const partida = nuevaPartidaB({ ...o, moderador: mando }, saca)
      if (partida) void mesa.empieza(partida)
    },
    [mesa, saca, perfil],
  )

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
            <Music size={22} className="text-tierra-600" /> ¿Qué peli suena?
          </h1>
          <p className="text-sm text-tenue">
            {mesa.partida ? 'Partida en marcha.' : 'Treinta segundos de banda sonora, y a ver quién la saca.'}
          </p>
        </div>
      </header>

      {mesa.cargando || !bandas || vieja ? (
        <Cargando
          texto={vieja ? 'Cerrando la partida de antes…' : bandas ? 'Mirando si hay partida…' : 'Buscando la música…'}
        />
      ) : mesa.partida ? (
        <>
          <PeliPartida
            partida={mesa.partida}
            miPerfil={perfil?.id ?? null}
            miNombre={perfil?.display_name ?? 'Alguien'}
            aSolas={mesa.aSolas}
            desfase={mesa.desfase}
            onCambia={mesa.publica}
            onSiguiente={() => mesa.partida && mesa.publica(siguienteB(mesa.partida, saca))}
            onOtra={() => {
              if (!mesa.partida) return
              const otra = otraPartidaB(mesa.partida, saca)
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
          <PeliJugadores
            gente={miembros.filter((m) => m.active)}
            cuantas={bandas.length}
            onEmpezar={empieza}
          />
          <ComoSeJuega />
        </>
      )}
    </div>
  )
}

function ComoSeJuega() {
  return (
    <details className="group rounded-2xl border border-arena bg-superficie">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-bosque-700">
        <Info size={16} /> Cómo se juega
      </summary>
      <div className="space-y-2 border-t border-arena px-4 py-3 text-sm text-tenue">
        <p>
          Suenan treinta segundos de una banda sonora —el tema de la película, no una versión— y{' '}
          <strong>se grita</strong>. Nadie escribe nada: el que pone la música hace de moderador,
          toca el nombre del que la ha sacado y a la siguiente. La música da vueltas hasta
          entonces, o hasta que se acabe el tiempo.
        </p>
        <p>
          <strong>Suena en un solo móvil</strong>, el que esté más cerca del altavoz. Diez teléfonos
          medio segundo desincronizados no es música, es ruido. Quien modera juega igual: no ve nada
          que no oigan los demás hasta que se destapa. Y si se va con el móvil en el bolsillo,
          cualquiera recoge el mando con «que suene aquí».
        </p>
        <p>
          Lo que vale y lo que no lo decide la mesa, como en el salón de casa: «la de los piratas»
          cuenta si todo el mundo está de acuerdo.
        </p>
        <p className="text-suave">
          La música son las previsualizaciones de la tienda de Apple, las mismas que suenan al mirar
          una canción antes de comprarla. No se guarda nada: el móvil que hace de altavoz va a
          buscarlas en el momento, así que hace falta internet.
        </p>
      </div>
    </details>
  )
}
