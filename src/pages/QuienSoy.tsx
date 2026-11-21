import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Info, Smile } from 'lucide-react'
import { useGrupo } from '../hooks/useGrupo'
import { QuienSoyJugadores } from '../components/juegos/QuienSoyJugadores'
import { QuienSoyPartida } from '../components/juegos/QuienSoyPartida'
import { guardaJuego, leeJuego, nuevoJuego, type Juego } from '../lib/juegos/quiensoy'

export function QuienSoy() {
  const { miembros } = useGrupo()
  // Se juega en un solo aparato, así que la partida vive aquí; si el móvil
  // se bloquea a mitad, se recupera donde estaba.
  const [juego, setJuego] = useState<Juego | null>(() => leeJuego())

  useEffect(() => {
    guardaJuego(juego)
  }, [juego])

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
            <Smile size={22} className="text-tierra-600" /> ¿Quién soy?
          </h1>
          <p className="text-sm text-tenue">
            {juego ? 'Partida en marcha.' : 'La carta en la frente, de toda la vida.'}
          </p>
        </div>
      </header>

      {juego ? (
        <QuienSoyPartida juego={juego} onCambia={setJuego} onSalir={() => setJuego(null)} />
      ) : (
        <>
          <QuienSoyJugadores
            gente={miembros.filter((m) => m.active)}
            onEmpezar={(o) => setJuego(nuevoJuego(o))}
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
          El móvil va pasando de mano en mano. Al que le toca se lo pone en la frente con la pantalla
          hacia fuera, <strong>sin mirar</strong>, y los demás ven el nombre del famoso.
        </p>
        <p>
          El de la carta pregunta y los demás solo pueden contestar <strong>sí o no</strong>: ¿estoy
          vivo?, ¿soy español?, ¿canto? Si lo adivina, punto.
        </p>
        <p>
          <strong>Con reloj</strong>, el turno es una ráfaga: cada acierto saca otra carta hasta que se
          acaba el tiempo, y entonces suena el timbre. <strong>Sin reloj</strong>, cada turno es una
          carta y ya: se acierta o se pasa, y el móvil cambia de manos.
        </p>
        <p>
          Hay 68 famosos entre cine y tele, música, deportes e históricos. En una misma partida no se
          repite ninguno, así que el mazo da para una noche larga.
        </p>
      </div>
    </details>
  )
}
