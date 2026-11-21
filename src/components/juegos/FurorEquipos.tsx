import { useMemo, useState } from 'react'
import { Dices, Eraser, Play, Users } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Boton } from '../ui/Boton'
import { Campo, Entrada, Lista } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import { reparteAlAzar, type Lado, type Opciones } from '../../lib/juegos/furor'
import { COLOR } from './colores'
import type { Member } from '../../lib/types'

const SEGUNDOS = [15, 20, 30, 45, 60]
const METAS = [1, 2, 3, 5]

export function FurorEquipos({ gente, onEmpezar }: { gente: Member[]; onEmpezar: (o: Opciones) => void }) {
  const [nombreA, setNombreA] = useState('Ellas')
  const [nombreB, setNombreB] = useState('Ellos')
  const [segundos, setSegundos] = useState(30)
  const [meta, setMeta] = useState(3)
  const [reparto, setReparto] = useState<Record<string, Lado | undefined>>({})

  const equipos = useMemo(() => {
    const a = gente.filter((m) => reparto[m.id] === 'a').map((m) => m.id)
    const b = gente.filter((m) => reparto[m.id] === 'b').map((m) => m.id)
    return { a, b, sinRepartir: gente.length - a.length - b.length }
  }, [gente, reparto])

  const pon = (id: string, lado: Lado) =>
    setReparto((r) => ({ ...r, [id]: r[id] === lado ? undefined : lado }))

  const alAzar = () => {
    const [a, b] = reparteAlAzar(gente.map((m) => m.id))
    const nuevo: Record<string, Lado> = {}
    for (const id of a) nuevo[id] = 'a'
    for (const id of b) nuevo[id] = 'b'
    setReparto(nuevo)
  }

  return (
    <div className="space-y-5">
      <Tarjeta className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Un equipo">
            <Entrada value={nombreA} onChange={(e) => setNombreA(e.target.value)} maxLength={18} />
          </Campo>
          <Campo etiqueta="El otro">
            <Entrada value={nombreB} onChange={(e) => setNombreB(e.target.value)} maxLength={18} />
          </Campo>
        </div>
        <p className="text-sm text-suave">
          Lo clásico es ellas contra ellos, pero los equipos se hacen como queráis: cambiad los nombres y
          repartid a mano, o que lo eche a suertes el botón de los dados.
        </p>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-arena px-4 py-3">
          <h2 className="flex items-center gap-2 text-base text-bosque-800">
            <Users size={17} className="text-bosque-500" /> Quién juega
          </h2>
          <div className="flex gap-2">
            <Boton variante="secundario" tamanyo="sm" onClick={alAzar}>
              <Dices size={15} /> Al azar
            </Boton>
            <Boton variante="fantasma" tamanyo="sm" onClick={() => setReparto({})}>
              <Eraser size={15} /> Vaciar
            </Boton>
          </div>
        </header>

        <ul className="divide-y divide-arena/70">
          {gente.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar src={m.avatar_url} nombre={m.name} tamanyo="sm" />
              <span className="flex-1 truncate text-sm font-medium text-carbon">{m.name}</span>
              <div className="flex overflow-hidden rounded-xl border border-arena">
                {(['a', 'b'] as Lado[]).map((lado) => {
                  const puesto = reparto[m.id] === lado
                  return (
                    <button
                      key={lado}
                      type="button"
                      onClick={() => pon(m.id, lado)}
                      aria-pressed={puesto}
                      className={`h-9 w-20 truncate px-2 text-xs font-semibold transition ${
                        puesto ? `${COLOR[lado].fondo} text-tinta-fuerte` : 'bg-superficie text-tenue hover:bg-beige'
                      } ${lado === 'b' ? 'border-l border-arena' : ''}`}
                    >
                      {(lado === 'a' ? nombreA : nombreB) || (lado === 'a' ? 'Equipo 1' : 'Equipo 2')}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>

        {gente.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-suave">
            No hay nadie en el grupo todavía. Se puede jugar igual: los equipos se apañan con los nombres.
          </p>
        )}
      </Tarjeta>

      <Tarjeta className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Tiempo para arrancar" ayuda="Por canción">
            <Lista value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}>
              {SEGUNDOS.map((s) => (
                <option key={s} value={s}>
                  {s} segundos
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Gana quien llegue a" ayuda="Tres minipuntos, un punto">
            <Lista value={meta} onChange={(e) => setMeta(Number(e.target.value))}>
              {METAS.map((p) => (
                <option key={p} value={p}>
                  {p} {p === 1 ? 'punto' : 'puntos'}
                </option>
              ))}
            </Lista>
          </Campo>
        </div>
      </Tarjeta>

      <Boton
        tamanyo="lg"
        ancho
        onClick={() =>
          onEmpezar({
            nombreA: nombreA.trim() || 'Equipo 1',
            nombreB: nombreB.trim() || 'Equipo 2',
            genteA: equipos.a,
            genteB: equipos.b,
            segundos,
            meta,
          })
        }
      >
        <Play size={18} /> ¡A jugar!
      </Boton>

      {equipos.sinRepartir > 0 && gente.length > 0 && (
        <p className="text-center text-sm text-suave">
          {equipos.sinRepartir === gente.length
            ? 'Nadie repartido todavía: podéis empezar igual y repartiros de viva voz.'
            : `Quedan ${equipos.sinRepartir} sin equipo. No pasa nada, se puede empezar.`}
        </p>
      )}
    </div>
  )
}
