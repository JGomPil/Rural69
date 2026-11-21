import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Info, Music } from 'lucide-react'
import { useGrupo } from '../hooks/useGrupo'
import { FurorEquipos } from '../components/juegos/FurorEquipos'
import { FurorPartida } from '../components/juegos/FurorPartida'
import { guardaPartida, leePartida, nuevaPartida, type Partida } from '../lib/juegos/furor'

export function Furor() {
  const { miembros } = useGrupo()
  // Si el móvil se bloqueó a mitad de partida, se recupera donde estaba.
  const [partida, setPartida] = useState<Partida | null>(() => leePartida())

  useEffect(() => {
    guardaPartida(partida)
  }, [partida])

  const gente = miembros.filter((m) => m.active)

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
            <Music size={22} className="text-tierra-600" /> Furor
          </h1>
          <p className="text-sm text-tenue">
            {partida ? 'Partida en marcha.' : 'Haced los equipos y a cantar.'}
          </p>
        </div>
      </header>

      {partida ? (
        <FurorPartida
          partida={partida}
          gente={gente}
          onCambia={setPartida}
          onDejarlo={() => setPartida(null)}
        />
      ) : (
        <>
          <FurorEquipos gente={gente} onEmpezar={(o) => setPartida(nuevaPartida(o))} />
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
          Sale una palabra. Los dos equipos cantan por turnos una canción que la diga, y cada uno tiene
          sus segundos para arrancar. Vale cualquier canción con tal de que se cante: media estrofa
          basta, y manda el jaleo de la mesa.
        </p>
        <p>
          El equipo que se queda en blanco —o que repite una canción ya cantada— le regala un{' '}
          <strong>minipunto</strong> al contrario. A los tres minipuntos, un punto y palabra nueva. Gana
          quien llegue antes a los puntos acordados.
        </p>
        <p>
          Nadie abre dos palabras seguidas: después de cada fallo, la siguiente la empieza el otro
          equipo. Quién arranca la primera lo echa a suertes la aplicación.
        </p>
        <p className="text-suave">
          Es la prueba «Tienes la palabra» del Furor de Antena 3. Allí el equipo que perdía se comía un
          popurrí cantado subido a las mesas, y si lo bordaba, empataba. Eso ya es cosa vuestra.
        </p>
      </div>
    </details>
  )
}
