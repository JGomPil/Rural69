import { Link } from 'react-router-dom'
import { ArrowLeft, CloudOff, Info, Smile } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGrupo } from '../hooks/useGrupo'
import { QuienSoyJugadores } from '../components/juegos/QuienSoyJugadores'
import { QuienSoyPartida } from '../components/juegos/QuienSoyPartida'
import { Cargando } from '../components/ui/Varios'
import { guardaJuego, leeJuego, nuevoJuego, type Juego } from '../lib/juegos/quiensoy'
import { useMesa } from '../lib/juegos/sincronia'

export function QuienSoy() {
  const { perfil } = useAuth()
  const { miembros } = useGrupo()
  // Este es de los abiertos: cada uno mueve lo suyo desde su propio móvil.
  const mesa = useMesa<Juego>('quiensoy', perfil?.id ?? null, {
    guarda: guardaJuego,
    lee: leeJuego,
    todosJuegan: true,
  })

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
            {mesa.partida ? 'Partida en marcha.' : 'Cada uno es un famoso y no sabe cuál.'}
          </p>
        </div>
      </header>

      {mesa.cargando ? (
        <Cargando texto="Mirando si hay partida…" />
      ) : mesa.partida ? (
        <>
          <QuienSoyPartida
            juego={mesa.partida}
            miPerfil={perfil?.id ?? null}
            aSolas={mesa.aSolas}
            desfase={mesa.desfase}
            onCambia={mesa.publica}
            onSalir={() => void mesa.termina()}
          />
          {mesa.aSolas && (
            <p className="flex items-center justify-center gap-2 text-center text-xs text-suave">
              <CloudOff size={14} /> Sin línea con el servidor: se juega con este móvil, pasándolo de
              mano en mano.
            </p>
          )}
        </>
      ) : (
        <>
          <QuienSoyJugadores
            gente={miembros.filter((m) => m.active)}
            onEmpezar={(o) => void mesa.empieza(nuevoJuego(o))}
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
          Al empezar, a cada uno le toca un famoso y nadie sabe cuál es el suyo.{' '}
          <strong>Cada cual abre el juego en su propio móvil y dice quién es</strong>: desde ese momento
          ve las cartas de todos los demás, con la suya tapada.
        </p>
        <p>
          Por turnos, se hace <strong>una sola pregunta</strong> a la mesa —¿estoy vivo?, ¿soy español?,
          ¿canto?— y los demás contestan sí o no. Todos los móviles van a la vez: se ve de quién es el
          turno sin preguntarlo.
        </p>
        <p>
          Para acertar hay que <strong>escribir el nombre</strong>, no basta con decirlo. Si fallas, se
          te cuenta la pregunta y pasa el turno.
        </p>
        <p>
          El juego se acaba en cuanto alguien adivina quién es, y ahí mismo se os pregunta si queréis{' '}
          <strong>seguir hasta que acierten todos</strong>.
        </p>
        <p className="text-suave">
          Cuidado con mirar el móvil del de al lado: tu famoso sale en la pantalla de todos los demás.
          Y si no hay cobertura, se juega con un solo móvil que va pasando.
        </p>
      </div>
    </details>
  )
}
