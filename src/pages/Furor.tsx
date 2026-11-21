import { Link } from 'react-router-dom'
import { ArrowLeft, Info, Music } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGrupo } from '../hooks/useGrupo'
import { FurorEquipos } from '../components/juegos/FurorEquipos'
import { FurorPartida } from '../components/juegos/FurorPartida'
import { Cargando } from '../components/ui/Varios'
import { guardaPartida, leePartida, nuevaPartida, type Partida } from '../lib/juegos/furor'
import { useMesa } from '../lib/juegos/sincronia'

export function Furor() {
  const { perfil, esAdmin } = useAuth()
  const { miembros, perfiles } = useGrupo()
  // El Furor es de los cerrados: manda el moderador y los demás miran.
  const mesa = useMesa<Partida>('furor', perfil?.id ?? null, {
    guarda: guardaPartida,
    lee: leePartida,
  })

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
            {mesa.partida ? 'Partida en marcha.' : 'Haced los equipos y a cantar.'}
          </p>
        </div>
      </header>

      {mesa.cargando ? (
        <Cargando texto="Mirando si hay partida…" />
      ) : mesa.partida ? (
        <FurorPartida
          partida={mesa.partida}
          gente={gente}
          perfiles={perfiles}
          mesa={mesa}
          puedeMandar={esAdmin}
        />
      ) : (
        <>
          <FurorEquipos gente={gente} onEmpezar={(o) => void mesa.empieza(nuevaPartida(o))} />
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
          <strong>minipunto</strong> al contrario. A los tres minipuntos, un punto y palabra nueva.
        </p>
        <p>
          Nadie abre dos palabras seguidas: después de cada fallo, la siguiente la empieza el otro
          equipo. Quién arranca la primera lo echa a suertes la aplicación.
        </p>
        <p>
          <strong>Manda el moderador.</strong> Él lleva el cronómetro y él decide el marcador: puede
          subir o bajar puntos cuando le parezca, y la partida se acaba cuando él dice. Los demás ven la
          palabra, el turno y la cuenta atrás en su propio móvil, sin botones.
        </p>
        <p className="text-suave">
          Es la prueba «Tienes la palabra» del Furor de Antena 3. Allí el equipo que perdía se comía un
          popurrí cantado subido a las mesas, y si lo bordaba, el presentador le daba el punto igual.
          Para eso están los botones de más y menos.
        </p>
      </div>
    </details>
  )
}
