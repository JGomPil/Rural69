import { useEffect, useRef, useState } from 'react'
import { Flag, History, Mic, Pause, Play, RefreshCw, Repeat2, Shuffle, Trophy, Users, X } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Tarjeta } from '../ui/Varios'
import { COLOR } from './colores'
import { bocina, fanfarria, mantenLaPantalla, tic } from '../../lib/juegos/sonido'
import { cambiaPalabra, cantada, falla, otraVez, otroLado, type Lado, type Partida } from '../../lib/juegos/furor'
import type { Member } from '../../lib/types'

/** El círculo que se vacía. Se ve desde el otro lado de la mesa. */
function Cuenta({ restante, total }: { restante: number; total: number }) {
  const r = 70
  const vuelta = 2 * Math.PI * r
  const queda = Math.max(0, Math.min(1, restante / total))
  const apurado = restante <= 5
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-arena" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={vuelta}
          strokeDashoffset={vuelta * (1 - queda)}
          className={`transition-[stroke-dashoffset] duration-100 ease-linear ${
            apurado ? 'stroke-tierra-600' : 'stroke-bosque-600'
          }`}
        />
      </svg>
      <span
        className={`font-display absolute inset-0 flex items-center justify-center text-5xl tabular-nums ${
          apurado ? 'animate-pulse text-tierra-700' : 'text-bosque-800'
        }`}
      >
        {Math.ceil(restante)}
      </span>
    </div>
  )
}

function Minipuntos({ cuantos, de, lado }: { cuantos: number; de: number; lado: Lado }) {
  return (
    <span className="flex justify-center gap-1" aria-label={`${cuantos} de ${de} minipuntos`}>
      {Array.from({ length: de }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < cuantos ? COLOR[lado].fondo : 'bg-arena'}`}
        />
      ))}
    </span>
  )
}

function Marcador({ partida, gente }: { partida: Partida; gente: Member[] }) {
  const nombres = (ids: string[]) =>
    ids
      .map((id) => gente.find((m) => m.id === id)?.name)
      .filter(Boolean)
      .join(', ')

  return (
    <Tarjeta className="p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {(['a', 'b'] as Lado[]).map((lado, i) => (
          <div key={lado} className={i === 0 ? 'text-left' : 'text-right'}>
            <p className={`truncate font-semibold ${COLOR[lado].texto}`}>{partida.equipos[lado].nombre}</p>
            <p className="font-display text-3xl text-carbon tabular-nums">{partida.equipos[lado].puntos}</p>
            <div className={i === 0 ? 'flex justify-start' : 'flex justify-end'}>
              <Minipuntos
                cuantos={partida.equipos[lado].minipuntos}
                de={partida.minipuntosPorPunto}
                lado={lado}
              />
            </div>
            {nombres(partida.equipos[lado].gente) && (
              <p className="mt-1 truncate text-xs text-suave">{nombres(partida.equipos[lado].gente)}</p>
            )}
          </div>
        ))}
        <span className="self-start pt-7 text-sm text-suave">a {partida.meta}</span>
      </div>
    </Tarjeta>
  )
}

export function FurorPartida({
  partida,
  gente,
  onCambia,
  onDejarlo,
}: {
  partida: Partida
  gente: Member[]
  onCambia: (p: Partida) => void
  onDejarlo: () => void
}) {
  const [fin, setFin] = useState<number | null>(null)
  const [restante, setRestante] = useState(partida.segundos)
  const [verHistoria, setVerHistoria] = useState(false)
  const ultimoTic = useRef(0)
  const corriendo = fin !== null

  const arranca = () => {
    setRestante(partida.segundos)
    ultimoTic.current = partida.segundos
    setFin(Date.now() + partida.segundos * 1000)
  }
  const para = () => setFin(null)

  // El reloj se reinicia solo cada vez que cambia de manos o sale palabra
  // nueva. No cuenta con `setInterval` a pelo: se compara con la hora de
  // fin, porque el navegador adormece los temporizadores en segundo plano
  // y si no el tiempo se estiraría a favor de quien canta.
  useEffect(() => {
    if (fin === null || partida.ganador) return
    const reloj = setInterval(() => {
      const quedan = (fin - Date.now()) / 1000
      if (quedan <= 0) {
        clearInterval(reloj)
        setRestante(0)
        setFin(null)
        bocina()
        onCambia(falla(partida, 'tiempo'))
        return
      }
      setRestante(quedan)
      const entero = Math.ceil(quedan)
      if (entero <= 3 && entero !== ultimoTic.current) {
        ultimoTic.current = entero
        tic()
      }
    }, 100)
    return () => clearInterval(reloj)
  }, [fin, partida, onCambia])

  // Mientras se juega, la pantalla no se apaga.
  useEffect(() => {
    void mantenLaPantalla(corriendo)
    return () => void mantenLaPantalla(false)
  }, [corriendo])

  const suenaPunto = useRef(partida.equipos.a.puntos + partida.equipos.b.puntos)
  useEffect(() => {
    const total = partida.equipos.a.puntos + partida.equipos.b.puntos
    if (total > suenaPunto.current) fanfarria()
    suenaPunto.current = total
  }, [partida.equipos.a.puntos, partida.equipos.b.puntos])

  const turno = partida.turno
  const rival = otroLado(turno)

  if (partida.ganador) {
    const g = partida.equipos[partida.ganador]
    return (
      <div className="space-y-5">
        <Tarjeta className="space-y-3 p-8 text-center">
          <Trophy size={48} className="mx-auto text-tierra-500" />
          <h2 className="font-display text-2xl text-bosque-800">¡Gana {g.nombre}!</h2>
          <p className="font-display text-4xl text-carbon tabular-nums">
            {partida.equipos.a.puntos} — {partida.equipos.b.puntos}
          </p>
          <p className="text-sm text-suave">
            Al perdedor le toca el popurrí: cantar un mix subidos a lo que haya, y si lo bordan, empate.
          </p>
        </Tarjeta>
        <div className="grid gap-3 sm:grid-cols-2">
          <Boton tamanyo="lg" ancho onClick={() => onCambia(otraVez(partida))}>
            <RefreshCw size={18} /> Otra partida
          </Boton>
          <Boton variante="secundario" tamanyo="lg" ancho onClick={onDejarlo}>
            <Users size={18} /> Cambiar equipos
          </Boton>
        </div>
        <Historia partida={partida} abierta onAlternar={() => undefined} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Marcador partida={partida} gente={gente} />

      <Tarjeta className="space-y-4 p-5 text-center">
        <p className="text-sm text-suave">Canta una canción que diga…</p>
        <p className="font-display text-4xl break-words text-bosque-800 uppercase sm:text-5xl">
          {partida.palabra}
        </p>
        <p className="text-sm text-tenue">
          {partida.cantadas === 0
            ? 'Palabra nueva'
            : `${partida.cantadas} ${partida.cantadas === 1 ? 'canción' : 'canciones'} ya con esta palabra`}
        </p>

        <div
          className={`mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${COLOR[turno].suave} ${COLOR[turno].texto}`}
        >
          <Mic size={15} /> Le toca a {partida.equipos[turno].nombre}
        </div>

        {corriendo ? (
          <Cuenta restante={restante} total={partida.segundos} />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-3">
            <p className="text-sm text-suave">
              {partida.historia[0]?.startsWith('¡Punto')
                ? partida.historia[0]
                : partida.historia[0] ?? 'Preparados…'}
            </p>
            <Boton tamanyo="lg" onClick={arranca}>
              <Play size={20} /> ¡Ya!
            </Boton>
          </div>
        )}

        <Boton
          tamanyo="lg"
          ancho
          disabled={!corriendo}
          onClick={() => {
            onCambia(cantada(partida))
            arranca()
          }}
          className={COLOR[turno].fondo}
        >
          <Mic size={18} /> ¡Cantada! Le toca a {partida.equipos[rival].nombre}
        </Boton>

        <div className="grid grid-cols-2 gap-2">
          <Boton
            variante="peligro"
            disabled={!corriendo}
            onClick={() => {
              para()
              bocina()
              onCambia(falla(partida, 'blanco'))
            }}
          >
            <Flag size={16} /> No les sale
          </Boton>
          <Boton
            variante="peligro"
            disabled={!corriendo}
            onClick={() => {
              para()
              bocina()
              onCambia(falla(partida, 'repetida'))
            }}
          >
            <Repeat2 size={16} /> Repiten
          </Boton>
        </div>

        <div className="flex items-center justify-center gap-2">
          {corriendo && (
            <Boton variante="fantasma" tamanyo="sm" onClick={para}>
              <Pause size={15} /> Pausa
            </Boton>
          )}
          <Boton
            variante="fantasma"
            tamanyo="sm"
            onClick={() => {
              para()
              onCambia(cambiaPalabra(partida))
            }}
          >
            <Shuffle size={15} /> Otra palabra
          </Boton>
          <Boton variante="fantasma" tamanyo="sm" onClick={onDejarlo}>
            <X size={15} /> Dejarlo
          </Boton>
        </div>
      </Tarjeta>

      <Historia partida={partida} abierta={verHistoria} onAlternar={() => setVerHistoria((v) => !v)} />
    </div>
  )
}

function Historia({
  partida,
  abierta,
  onAlternar,
}: {
  partida: Partida
  abierta: boolean
  onAlternar: () => void
}) {
  if (partida.historia.length === 0) return null
  return (
    <Tarjeta className="overflow-hidden">
      <button
        type="button"
        onClick={onAlternar}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-bosque-700"
      >
        <History size={16} /> Lo que va pasando
        <span className="ml-auto text-xs font-normal text-suave">{partida.historia.length}</span>
      </button>
      {abierta && (
        <ul className="space-y-1.5 border-t border-arena px-4 py-3 text-sm text-tenue">
          {partida.historia.slice(0, 30).map((linea, i) => (
            <li key={`${i}-${linea.slice(0, 12)}`}>{linea}</li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
