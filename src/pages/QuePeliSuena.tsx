import { useCallback, useEffect, useState } from 'react'
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
  // De los abiertos: cada uno escribe desde su móvil.
  const mesa = useMesa<PartidaB>('quepeli', perfil?.id ?? null, {
    guarda: guardaPartidaB,
    lee: leePartidaB,
    todosJuegan: true,
  })

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
    (o: Omit<OpcionesB, 'altavoz'>) => {
      // Quien monta la partida se queda con la música, que para eso la monta.
      const partida = nuevaPartidaB({ ...o, altavoz: perfil?.id ?? null }, saca)
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

      {mesa.cargando || !bandas ? (
        <Cargando texto={bandas ? 'Mirando si hay partida…' : 'Buscando la música…'} />
      ) : mesa.partida ? (
        <>
          <PeliPartida
            partida={mesa.partida}
            miPerfil={perfil?.id ?? null}
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
              <CloudOff size={14} /> Sin línea con el servidor: se juega con este móvil, que hace
              también de altavoz.
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
          Suenan treinta segundos de una banda sonora —el tema de la película, no una versión— y
          gana el punto el primero que escribe de qué película es. La música da vueltas hasta que
          alguien la saca o se acaba el tiempo.
        </p>
        <p>
          <strong>Suena en un solo móvil</strong>, el que esté más cerca del altavoz. Diez teléfonos
          medio segundo desincronizados no es música, es ruido. Quien pone la música juega igual: no
          ve nada que no oigan los demás. Cualquiera puede quedarse con ella tocando «que suene
          aquí».
        </p>
        <p>
          Vale el título a medias: para «Piratas del Caribe» cuenta «piratas», y para «La guerra de
          las galaxias» cuenta «Star Wars». Las tildes dan igual. El que falla lo ve toda la mesa y
          puede volver a probar: no hay castigo.
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
