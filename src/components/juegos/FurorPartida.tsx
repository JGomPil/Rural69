import { useEffect, useRef, useState } from 'react'
import {
  CloudOff,
  Eye,
  Flag,
  Hand,
  History,
  Mic,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Shuffle,
  X,
} from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Entrada, Lista } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import { COLOR } from './colores'
import { despiertaElSonido, fanfarria, mantenLaPantalla, tic, timbre } from '../../lib/juegos/sonido'
import {
  ajustaPuntos,
  arranca,
  cambiaPalabra,
  cantada,
  falla,
  otraVez,
  otroLado,
  para,
  ponPalabra,
  restanteDe,
  type Lado,
  type Partida,
} from '../../lib/juegos/furor'
import type { Mesa } from '../../lib/juegos/sincronia'
import type { Member, Profile } from '../../lib/types'

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
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < cuantos ? COLOR[lado].fondo : 'bg-arena'}`} />
      ))}
    </span>
  )
}

function Marcador({
  partida,
  gente,
  mando,
  onAjusta,
}: {
  partida: Partida
  gente: Member[]
  mando: boolean
  onAjusta: (lado: Lado, cuantos: number) => void
}) {
  const nombres = (ids: string[]) =>
    ids
      .map((id) => gente.find((m) => m.id === id)?.name)
      .filter(Boolean)
      .join(', ')

  return (
    <Tarjeta className="p-4">
      {/* `min-w-0` no es decorativo: sin él, la lista de nombres estira su
          columna y el marcador se sale de la tarjeta. */}
      <div className="flex items-start gap-3">
        {(['a', 'b'] as Lado[]).map((lado, i) => (
          <div key={lado} className={`min-w-0 flex-1 ${i === 0 ? 'text-left' : 'text-right'}`}>
            <p className={`truncate font-semibold ${COLOR[lado].texto}`}>{partida.equipos[lado].nombre}</p>
            <div className={`flex items-center gap-2 ${i === 0 ? 'justify-start' : 'justify-end'}`}>
              {mando && i === 1 && <Mas onClick={() => onAjusta(lado, -1)} signo="menos" />}
              <p className="font-display text-3xl text-carbon tabular-nums">{partida.equipos[lado].puntos}</p>
              {mando && i === 0 && <Mas onClick={() => onAjusta(lado, 1)} signo="mas" />}
              {mando && i === 0 && <Mas onClick={() => onAjusta(lado, -1)} signo="menos" />}
              {mando && i === 1 && <Mas onClick={() => onAjusta(lado, 1)} signo="mas" />}
            </div>
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
      </div>
    </Tarjeta>
  )
}

function Mas({ onClick, signo }: { onClick: () => void; signo: 'mas' | 'menos' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={signo === 'mas' ? 'Un punto más' : 'Un punto menos'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arena bg-superficie text-tenue transition active:scale-90 hover:bg-beige"
    >
      {signo === 'mas' ? <Plus size={14} /> : <Minus size={14} />}
    </button>
  )
}

export function FurorPartida({
  partida,
  gente,
  perfiles,
  mesa,
  puedeMandar,
}: {
  partida: Partida
  gente: Member[]
  perfiles: Profile[]
  mesa: Mesa
  /** Un administrador puede recoger el mando si el moderador desaparece. */
  puedeMandar: boolean
}) {
  const { soyModerador, desfase, publica, aSolas } = mesa
  const [, repinta] = useState(0)
  const [verHistoria, setVerHistoria] = useState(false)
  const [escribiendo, setEscribiendo] = useState(false)
  const [aMano, setAMano] = useState('')
  const ultimoTic = useRef(0)
  const corriendo = partida.fin !== null
  const restante = restanteDe(partida, desfase)

  // El reloj no cuenta vueltas: compara con el instante de fin que viaja
  // dentro de la partida. Por eso la cuenta atrás es la misma en todos los
  // móviles, y por eso no se estira cuando el navegador adormece el
  // temporizador en segundo plano.
  useEffect(() => {
    if (partida.fin === null) return
    ultimoTic.current = Math.ceil(restanteDe(partida, desfase))
    const reloj = setInterval(() => {
      const quedan = restanteDe(partida, desfase)
      if (quedan > 0) {
        repinta((n) => n + 1)
        const entero = Math.ceil(quedan)
        if (entero <= 3 && entero !== ultimoTic.current) {
          ultimoTic.current = entero
          tic()
        }
        return
      }
      clearInterval(reloj)
      // Suena en todos los móviles: es el momento del juego.
      timbre()
      // Pero el marcador lo mueve solo quien lleva el mando.
      if (soyModerador) publica(falla(partida, 'tiempo'))
      else repinta((n) => n + 1)
    }, 100)
    return () => clearInterval(reloj)
  }, [partida, desfase, soyModerador, publica])

  // Mientras corre el reloj, la pantalla no se apaga.
  useEffect(() => {
    void mantenLaPantalla(corriendo)
    return () => void mantenLaPantalla(false)
  }, [corriendo])

  const puntosTotales = partida.equipos.a.puntos + partida.equipos.b.puntos
  const ultimoPunto = useRef(puntosTotales)
  useEffect(() => {
    if (puntosTotales > ultimoPunto.current) fanfarria()
    ultimoPunto.current = puntosTotales
  }, [puntosTotales])

  const turno = partida.turno
  const rival = otroLado(turno)

  const conSonido = (hacer: () => void) => () => {
    despiertaElSonido()
    hacer()
  }

  return (
    <div className="space-y-4">
      <Mando mesa={mesa} perfiles={perfiles} puedeMandar={puedeMandar} />

      <Marcador
        partida={partida}
        gente={gente}
        mando={soyModerador}
        onAjusta={(lado, cuantos) => publica(ajustaPuntos(partida, lado, cuantos))}
      />

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
            <p className="text-sm text-suave">{partida.historia[0] ?? 'Preparados…'}</p>
            {soyModerador ? (
              <Boton tamanyo="lg" onClick={conSonido(() => publica(arranca(partida)))}>
                <Play size={20} /> ¡Ya!
              </Boton>
            ) : (
              <p className="text-sm text-tenue">Esperando al moderador…</p>
            )}
          </div>
        )}

        {soyModerador ? (
          <>
            <Boton
              tamanyo="lg"
              ancho
              disabled={!corriendo}
              onClick={conSonido(() => publica(cantada(partida)))}
              className={COLOR[turno].fondo}
            >
              <Mic size={18} /> ¡Cantada! Le toca a {partida.equipos[rival].nombre}
            </Boton>

            <div className="grid grid-cols-2 gap-2">
              <Boton
                variante="peligro"
                disabled={!corriendo}
                onClick={conSonido(() => {
                  timbre()
                  publica(falla(partida, 'blanco'))
                })}
              >
                <Flag size={16} /> No les sale
              </Boton>
              <Boton
                variante="peligro"
                disabled={!corriendo}
                onClick={conSonido(() => {
                  timbre()
                  publica(falla(partida, 'repetida'))
                })}
              >
                <Repeat2 size={16} /> Repiten
              </Boton>
            </div>

            {escribiendo && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  publica(ponPalabra(partida, aMano))
                  setAMano('')
                  setEscribiendo(false)
                }}
              >
                <Entrada
                  value={aMano}
                  onChange={(e) => setAMano(e.target.value)}
                  placeholder="La palabra que quieras"
                  maxLength={24}
                  autoFocus
                />
                <Boton type="submit" disabled={aMano.trim() === ''}>
                  Ponerla
                </Boton>
              </form>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              {corriendo && (
                <Boton variante="fantasma" tamanyo="sm" onClick={() => publica(para(partida))}>
                  <Pause size={15} /> Pausa
                </Boton>
              )}
              <Boton variante="fantasma" tamanyo="sm" onClick={() => publica(cambiaPalabra(partida))}>
                <Shuffle size={15} /> Otra al azar
              </Boton>
              <Boton variante="fantasma" tamanyo="sm" onClick={() => setEscribiendo((v) => !v)}>
                <Pencil size={15} /> Escribirla yo
              </Boton>
              <Boton variante="fantasma" tamanyo="sm" onClick={() => publica(otraVez(partida))}>
                <RefreshCw size={15} /> Empezar de cero
              </Boton>
              <Boton variante="fantasma" tamanyo="sm" onClick={() => void mesa.termina()}>
                <X size={15} /> Terminar
              </Boton>
            </div>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-beige px-4 py-3 text-sm text-tenue">
            <Eye size={16} /> El mando lo lleva otro. Tú canta.
          </p>
        )}
      </Tarjeta>

      {aSolas && (
        <p className="flex items-center justify-center gap-2 text-center text-xs text-suave">
          <CloudOff size={14} /> Sin línea con el servidor: esta partida solo se ve en este aparato.
        </p>
      )}

      <Historia partida={partida} abierta={verHistoria} onAlternar={() => setVerHistoria((v) => !v)} />
    </div>
  )
}

/** Quién lleva el mando, y cómo cambiarlo. */
function Mando({
  mesa,
  perfiles,
  puedeMandar,
}: {
  mesa: Mesa
  perfiles: Profile[]
  puedeMandar: boolean
}) {
  const { moderador, soyModerador, aSolas } = mesa
  if (aSolas) return null

  const quien = perfiles.find((p) => p.id === moderador)

  return (
    <Tarjeta className="flex flex-wrap items-center gap-2 px-4 py-3">
      <Hand size={16} className="text-bosque-500" />
      <span className="text-sm text-tenue">
        {soyModerador ? 'Llevas tú el mando' : `Lleva el mando ${quien?.display_name ?? 'otro'}`}
      </span>
      <span className="flex-1" />
      {soyModerador ? (
        <Lista
          value=""
          aria-label="Pasar el mando"
          className="!h-9 !w-40 !text-sm"
          onChange={(e) => {
            if (e.target.value) void mesa.pasaElMando(e.target.value)
          }}
        >
          <option value="">Pasar el mando…</option>
          {perfiles
            .filter((p) => p.id !== moderador)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
        </Lista>
      ) : (
        puedeMandar && (
          <Boton variante="secundario" tamanyo="sm" onClick={() => void mesa.tomaElMando()}>
            Tomar el mando
          </Boton>
        )
      )}
    </Tarjeta>
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
