import { useState } from 'react'
import { Play, Plus, UserRound, X } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Campo, Entrada, Lista } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import { despiertaElSonido } from '../../lib/juegos/sonido'
import { CATEGORIAS, EMOJI_CATEGORIA, NOMBRE_CATEGORIA, cartasDe } from '../../lib/juegos/famosos'
import type { Categoria } from '../../lib/juegos/famosos'
import type { Opciones } from '../../lib/juegos/quiensoy'
import type { Member } from '../../lib/types'

const TIEMPOS = [0, 30, 60, 90]
/** `0` es «sin límite»: se juega hasta que acierten todos o se corte. */
const VUELTAS = [0, 2, 3, 5, 10]

export function QuienSoyJugadores({
  gente,
  onEmpezar,
}: {
  gente: Member[]
  onEmpezar: (o: Opciones) => void
}) {
  const [nombres, setNombres] = useState<string[]>([])
  const [suelto, setSuelto] = useState('')
  const [categoria, setCategoria] = useState<Categoria | 'mezclado'>('mezclado')
  const [segundos, setSegundos] = useState(0)
  const [vueltas, setVueltas] = useState(0)

  const anyade = (nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio || nombres.includes(limpio)) return
    setNombres((n) => [...n, limpio])
  }

  const cartas = cartasDe(categoria).length
  const sobran = nombres.length > cartas

  return (
    <div className="space-y-5">
      <Tarjeta className="space-y-4 p-4">
        <h2 className="flex items-center gap-2 text-base text-bosque-800">
          <UserRound size={17} className="text-bosque-500" /> Quién juega
        </h2>

        {nombres.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {nombres.map((n, i) => (
              <li
                key={n}
                className="flex items-center gap-1.5 rounded-full bg-bosque-100 py-1.5 pr-1.5 pl-3 text-sm font-semibold text-bosque-700"
              >
                <span className="text-xs text-bosque-500">{i + 1}.</span>
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
        <Campo etiqueta="De qué van los famosos">
          <Lista value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | 'mezclado')}>
            <option value="mezclado">🎲 Mezclado</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {EMOJI_CATEGORIA[c]} {NOMBRE_CATEGORIA[c]}
              </option>
            ))}
          </Lista>
        </Campo>
        <p className="text-sm text-suave">
          {cartas} famosos, y a cada uno le toca uno distinto.
          {sobran && ' Sois más que cartas: quitad gente o cambiad de categoría.'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Tiempo por pregunta">
            <Lista value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}>
              {TIEMPOS.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? 'Sin reloj' : `${s} segundos`}
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Vueltas">
            <Lista value={vueltas} onChange={(e) => setVueltas(Number(e.target.value))}>
              {VUELTAS.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? 'Sin límite' : `${v} vueltas`}
                </option>
              ))}
            </Lista>
          </Campo>
        </div>

        <p className="text-sm text-suave">
          {segundos === 0
            ? 'Sin reloj: cada uno se toma lo que necesite para su pregunta.'
            : `Con reloj, ${segundos} segundos para preguntar; si se pasa, el móvil cambia de manos igual.`}
          {vueltas === 0
            ? ' Sin límite de vueltas: se da por acabado cuando acierten todos, o cuando digáis.'
            : ` A las ${vueltas} vueltas se acaba, acierten todos o no.`}
        </p>
      </Tarjeta>

      <Boton
        tamanyo="lg"
        ancho
        disabled={nombres.length < 2 || sobran}
        onClick={() => {
          despiertaElSonido()
          onEmpezar({ nombres, categoria, segundos, vueltas: vueltas === 0 ? null : vueltas })
        }}
      >
        <Play size={18} /> ¡Empezar!
      </Boton>
      {nombres.length < 2 && (
        <p className="text-center text-sm text-suave">Hacen falta al menos dos jugadores.</p>
      )}
    </div>
  )
}
