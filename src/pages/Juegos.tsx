import { Link } from 'react-router-dom'
import { ChevronRight, Dices, Music, Sparkles } from 'lucide-react'
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
        <Link
          to="/juegos/furor"
          className="tarjeta flex items-center gap-4 p-4 transition hover:-translate-y-0.5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tierra-100 text-tierra-700">
            <Music size={24} />
          </span>
          <span className="flex-1">
            <span className="font-display block text-lg text-bosque-800">Furor</span>
            <span className="block text-sm text-suave">
              Dos equipos, una palabra y a cantar. El que se queda en blanco, minipunto para el contrario.
            </span>
          </span>
          <ChevronRight size={18} className="text-carbon/30" />
        </Link>
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
