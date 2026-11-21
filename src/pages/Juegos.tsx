import { Link } from 'react-router-dom'
import { ChevronRight, Dices, Music, Smile, Sparkles } from 'lucide-react'
import { Seccion, Tarjeta } from '../components/ui/Varios'

/**
 * El cajón de los juegos de la casa. De momento hay uno.
 *
 * Esta sección acabará saliendo sola cuando estéis allí —igual que el
 * panel cambia de cara durante la escapada—, pero mientras se diseñan
 * los juegos está siempre a la vista para poder probarlos desde el sofá.
 * El día que se cierre, basta con esconder el enlace del menú: la página
 * seguirá existiendo.
 */
export function Juegos() {
  return (
    <div className="space-y-6">
      <header className="animate-sube">
        <h1 className="font-display text-2xl text-bosque-800">Juegos</h1>
        <p className="text-sm text-tenue">
          Para las noches de la casa rural, cuando ya se ha cenado y nadie quiere irse a dormir.
        </p>
      </header>

      <Seccion titulo="Listos para jugar" icono={<Dices size={18} />}>
        <div className="space-y-3">
          <Juego
            a="/juegos/furor"
            icono={<Music size={24} />}
            titulo="Furor"
            que="Dos equipos, una palabra y a cantar. El que se queda en blanco, minipunto para el contrario."
            como="Por equipos · manda un moderador · se ve en todos los móviles"
          />
          <Juego
            a="/juegos/trivial"
            icono={<Dices size={24} />}
            titulo="Trivial de la casa"
            que="El tablero, los quesitos y 1.523 preguntas, con 199 que van de nosotros."
            como="Cada uno desde su móvil · se tocan las casillas · se pueden añadir preguntas"
          />
          <Juego
            a="/juegos/quien-soy"
            icono={<Smile size={24} />}
            titulo="¿Quién soy?"
            que="Cada uno es un famoso y no sabe cuál. Ves las cartas de los demás, la tuya no."
            como="Una pregunta por turno · cada uno con su móvil"
          />
        </div>
      </Seccion>

      <Seccion titulo="En camino" icono={<Sparkles size={18} />}>
        <Tarjeta className="p-4">
          <p className="text-sm text-tenue">
            Este cajón se irá llenando. Hay sitio para el que se nos ocurra: adivinar canciones, pruebas
            por parejas, preguntas sobre el propio grupo… Si se te ocurre uno, se diseña.
          </p>
        </Tarjeta>
      </Seccion>

      <p className="text-center text-xs text-suave">
        Mientras los probamos, los juegos están siempre a mano. Cuando estén rodados, esta sección
        aparecerá sola durante la escapada.
      </p>
    </div>
  )
}

function Juego({
  a,
  icono,
  titulo,
  que,
  como,
}: {
  a: string
  icono: React.ReactNode
  titulo: string
  que: string
  como: string
}) {
  return (
    <Link to={a} className="tarjeta flex items-center gap-4 p-4 transition hover:-translate-y-0.5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tierra-100 text-tierra-700">
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display block text-lg text-bosque-800">{titulo}</span>
        <span className="block text-sm text-suave">{que}</span>
        <span className="mt-1 block text-xs text-carbon/45">{como}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-carbon/30" />
    </Link>
  )
}
