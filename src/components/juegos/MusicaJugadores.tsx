import { useState, type ReactNode } from 'react'
import { Music, Play, Plus, UserRound, X } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Campo, Entrada, Lista } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import { despiertaElSonido } from '../../lib/juegos/sonido'
import type { Opciones } from '../../lib/juegos/musica'
import type { Member } from '../../lib/types'

// Los tiempos cortos son los que se usan: con noventa segundos la ronda se
// hace larga hasta cuando nadie la saca, y con cinco es a muerte súbita.
const TIEMPOS = [45, 30, 15, 5, 0]
const RONDAS = [5, 10, 15, 20, 30, 50]

export function MusicaJugadores({
  gente,
  cuantas,
  cosas,
  comoVa,
  segundosPorDefecto,
  rondasPorDefecto,
  onEmpezar,
}: {
  gente: Member[]
  /** Cuántas hay en el repertorio, para decirlo en pantalla. */
  cuantas: number
  /** «películas» o «canciones». */
  cosas: string
  /** El párrafo de «cómo va esto», que cambia de un juego a otro. */
  comoVa: ReactNode
  segundosPorDefecto: number
  rondasPorDefecto: number
  onEmpezar: (o: Omit<Opciones, 'moderador'>) => void
}) {
  const [nombres, setNombres] = useState<string[]>([])
  const [suelto, setSuelto] = useState('')
  const [segundos, setSegundos] = useState(segundosPorDefecto)
  const [rondas, setRondas] = useState(rondasPorDefecto)

  const anyade = (nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio || nombres.includes(limpio)) return
    setNombres((n) => [...n, limpio])
  }

  return (
    <div className="space-y-5">
      <Tarjeta className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-base text-bosque-800">
          <Music size={17} className="text-bosque-500" /> Cómo va esto
        </h2>
        <p className="text-sm text-tenue">{comoVa}</p>
      </Tarjeta>

      <Tarjeta className="space-y-4 p-4">
        <h2 className="flex items-center gap-2 text-base text-bosque-800">
          <UserRound size={17} className="text-bosque-500" /> Quién juega
        </h2>
        <p className="text-sm text-suave">
          Todos los que estén en el sofá, tengan móvil o no: aquí solo hace falta uno.
        </p>

        {nombres.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {nombres.map((n) => (
              <li
                key={n}
                className="flex items-center gap-1.5 rounded-full bg-bosque-100 py-1.5 pr-1.5 pl-3 text-sm font-semibold text-bosque-700"
              >
                {n}
                <button
                  type="button"
                  aria-label={`Quitar a ${n}`}
                  onClick={() => setNombres((l) => l.filter((x) => x !== n))}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-bosque-600 transition hover:bg-bosque-200"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Entrada
            value={suelto}
            onChange={(e) => setSuelto(e.target.value)}
            placeholder="Nombre"
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                anyade(suelto)
                setSuelto('')
              }
            }}
          />
          <Boton
            variante="secundario"
            onClick={() => {
              anyade(suelto)
              setSuelto('')
            }}
          >
            <Plus size={16} /> Añadir
          </Boton>
        </div>

        {gente.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-suave">O toca a los del grupo:</p>
            <div className="flex flex-wrap gap-1.5">
              {gente
                .filter((m) => !nombres.includes(m.name))
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => anyade(m.name)}
                    className="rounded-full border border-arena bg-superficie px-3 py-1.5 text-sm text-tenue transition active:scale-95 hover:bg-beige"
                  >
                    + {m.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </Tarjeta>

      <Tarjeta className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Tiempo por ronda">
            <Lista value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}>
              {TIEMPOS.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? 'Sin reloj' : `${s} segundos`}
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Rondas">
            <Lista value={rondas} onChange={(e) => setRondas(Number(e.target.value))}>
              {RONDAS.map((r) => (
                <option key={r} value={r}>
                  {r} {cosas}
                </option>
              ))}
            </Lista>
          </Campo>
        </div>
        <p className="text-sm text-suave">
          {cuantas} {cosas} en el repertorio, y en una partida no se repite ninguna.
          {segundos === 0
            ? ' Sin reloj: la música da vueltas hasta que alguien la saque.'
            : segundos <= 15
              ? ` A los ${segundos} segundos se para la música, y a correr.`
              : ` La música se repite hasta que se acaben los ${segundos} segundos.`}
          {segundos > 0 && ' Cuando se acaba, la ronda sigue abierta: la cierra el que lleva el mando.'}
        </p>
      </Tarjeta>

      <Boton
        tamanyo="lg"
        ancho
        disabled={nombres.length < 2}
        onClick={() => {
          despiertaElSonido()
          onEmpezar({ nombres, rondas, segundos })
        }}
      >
        <Play size={18} /> ¡Empezar!
      </Boton>
      {nombres.length < 2 && <p className="text-center text-sm text-suave">Hacen falta al menos dos jugadores.</p>}
    </div>
  )
}
