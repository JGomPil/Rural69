import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  Hourglass,
  RefreshCw,
  SkipForward,
  Smartphone,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Entrada } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import {
  acierto,
  despiertaElSonido,
  fallo,
  mantenLaPantalla,
  quesito,
  tic,
  timbre,
} from '../../lib/juegos/sonido'
import { EMOJI_CATEGORIA } from '../../lib/juegos/famosos'
import {
  clasificacion,
  dejaElSitio,
  intenta,
  mira,
  miSitio,
  otraVez,
  pasa,
  quedanPorAcertar,
  restanteDe,
  seAcabaElTiempo,
  seguirJugando,
  terminaAqui,
  tomaSitio,
  type Juego,
} from '../../lib/juegos/quiensoy'

export function QuienSoyPartida({
  juego,
  miPerfil,
  aSolas,
  desfase,
  onCambia,
  onSalir,
}: {
  juego: Juego
  miPerfil: string | null
  /** Sin línea: un solo móvil que va pasando, como toda la vida. */
  aSolas: boolean
  desfase: number
  onCambia: (j: Juego) => void
  onSalir: () => void
}) {
  const [, repinta] = useState(0)
  const [dicho, setDicho] = useState('')
  const ultimoTic = useRef(0)
  const comoEstaba = useRef<{ faltan: number; fallo: string } | null>(null)
  const restante = restanteDe(juego, desfase)

  // Con un solo aparato, la silla es la de quien tenga el turno; con cada
  // uno en su móvil, la que haya dicho que es suya.
  const sitio = aSolas ? juego.turno : miSitio(juego, miPerfil)
  const yo = sitio >= 0 ? juego.jugadores[sitio] : null
  const meToca = sitio === juego.turno
  const jugador = juego.jugadores[juego.turno]

  useEffect(() => {
    if (juego.fin === null || juego.fase !== 'mirando') return
    ultimoTic.current = Math.ceil(restanteDe(juego, desfase))
    const reloj = setInterval(() => {
      const quedan = restanteDe(juego, desfase)
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
      timbre()
      // Lo mueve el móvil del que está preguntando; los demás solo lo oyen.
      if (meToca) onCambia(seAcabaElTiempo(juego))
      else repinta((n) => n + 1)
    }, 100)
    return () => clearInterval(reloj)
  }, [juego, desfase, meToca, onCambia])

  // El veredicto suena en todos los móviles, no solo en el de quien lo
  // intentó: así la mesa se entera sin tener que mirar la pantalla.
  useEffect(() => {
    const ahora = {
      faltan: quedanPorAcertar(juego).length,
      fallo: juego.ultimoFallo ? `${juego.ultimoFallo.nombre}:${juego.ultimoFallo.dicho}` : '',
    }
    const antes = comoEstaba.current
    comoEstaba.current = ahora
    if (!antes) return
    if (ahora.faltan < antes.faltan) quesito()
    else if (ahora.fallo && ahora.fallo !== antes.fallo) fallo()
  }, [juego])

  useEffect(() => {
    if (juego.fase === 'fin') acierto(2)
  }, [juego.fase])

  const mirando = juego.fase === 'mirando'
  useEffect(() => {
    void mantenLaPantalla(mirando && meToca)
    return () => void mantenLaPantalla(false)
  }, [mirando, meToca])

  if (juego.fase === 'fin') return <Final juego={juego} onCambia={onCambia} onSalir={onSalir} />

  // Un móvil que no ha dicho quién es no puede ver ni una carta: la
  // primera que vería sería la suya.
  if (!aSolas && sitio < 0) {
    return (
      <div className="space-y-4">
        <Tarjeta className="space-y-4 p-6 text-center">
          <Smartphone size={40} className="mx-auto text-tierra-500" />
          <h2 className="font-display text-xl text-bosque-800">¿Quién eres tú?</h2>
          <p className="text-sm text-tenue">
            Dilo antes de mirar nada. Este móvil te enseñará las cartas de los demás y tapará la tuya.
          </p>
          <div className="grid gap-2">
            {juego.jugadores.map((p, i) => (
              <Boton
                key={p.nombre}
                variante={p.perfil ? 'suave' : 'secundario'}
                ancho
                onClick={() => {
                  despiertaElSonido()
                  if (miPerfil) onCambia(tomaSitio(juego, i, miPerfil))
                }}
              >
                {p.nombre}
                {p.perfil && ' · ya tiene móvil'}
              </Boton>
            ))}
          </div>
        </Tarjeta>
      </div>
    )
  }

  if (juego.fase === 'alguien-acerto') {
    const acertado = [...juego.jugadores].filter((p) => p.puesto > 0).sort((a, b) => b.puesto - a.puesto)[0]
    return (
      <div className="space-y-5">
        <Tarjeta className="space-y-4 p-7 text-center">
          <Trophy size={44} className="mx-auto text-tierra-500" />
          <h2 className="font-display text-2xl text-bosque-800">¡{acertado?.nombre} lo ha adivinado!</h2>
          <p className="text-base text-tenue">
            Era <strong>{acertado?.carta.nombre}</strong>.
          </p>
          <p className="text-sm text-suave">
            Aquí se acaba el juego… salvo que queráis seguir hasta que acierten todos. Quedan{' '}
            {quedanPorAcertar(juego).length} por saber quiénes son.
          </p>
        </Tarjeta>
        <div className="grid gap-3 sm:grid-cols-2">
          <Boton tamanyo="lg" ancho onClick={() => onCambia(seguirJugando(juego))}>
            Seguir hasta que acierten todos
          </Boton>
          <Boton variante="secundario" tamanyo="lg" ancho onClick={() => onCambia(terminaAqui(juego))}>
            Terminar aquí
          </Boton>
        </div>
      </div>
    )
  }

  if (juego.fase === 'pasa') {
    return (
      <div className="space-y-4">
        <Vueltas juego={juego} />
        <Tarjeta className="space-y-5 p-8 text-center">
          {aSolas ? (
            <>
              <EyeOff size={44} className="mx-auto text-tierra-500" />
              <div>
                <p className="text-sm text-suave">Pasa el móvil a</p>
                <p className="font-display text-3xl text-bosque-800">{jugador.nombre}</p>
              </div>
              <p className="text-sm text-tenue">
                Verás las cartas de los demás, nunca la tuya. Haces <strong>una sola pregunta</strong> a
                la mesa, te contestan sí o no, y el móvil pasa al siguiente.
              </p>
              <Boton tamanyo="lg" ancho onClick={() => onCambia(mira(juego))}>
                <Eye size={18} /> Ya lo tengo yo
              </Boton>
            </>
          ) : meToca ? (
            <>
              <Eye size={44} className="mx-auto text-bosque-500" />
              <p className="font-display text-2xl text-bosque-800">Te toca preguntar</p>
              <p className="text-sm text-tenue">
                Una pregunta a la mesa, de las de sí o no. Si te lanzas a decir quién eres, tendrás que
                escribirlo.
              </p>
              <Boton tamanyo="lg" ancho onClick={() => onCambia(mira(juego))}>
                Empiezo
              </Boton>
            </>
          ) : (
            <>
              <Hourglass size={40} className="mx-auto animate-pulse text-tierra-500" />
              <p className="text-sm text-suave">Le toca preguntar a</p>
              <p className="font-display text-3xl text-bosque-800">{jugador.nombre}</p>
              <p className="text-sm text-tenue">Contéstale solo sí o no.</p>
            </>
          )}
        </Tarjeta>
        {!aSolas && yo && <Cartas juego={juego} sitio={sitio} />}
        <Pie
        juego={juego}
        yo={yo?.nombre}
        aSolas={aSolas}
        onTerminar={() => onCambia(terminaAqui(juego))}
        onNoSoy={!aSolas && miPerfil ? () => onCambia(dejaElSitio(juego, miPerfil)) : undefined}
      />
      </div>
    )
  }

  const apurado = juego.fin !== null && restante <= 5

  return (
    <div className="space-y-4">
      <Vueltas juego={juego} />

      <Tarjeta className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-suave">
            {meToca ? (
              <>
                <strong className="text-bosque-700">Tú preguntas</strong> · una y pasas
              </>
            ) : (
              <>
                Pregunta <strong className="text-bosque-700">{jugador.nombre}</strong>
              </>
            )}
          </p>
          {juego.fin !== null && (
            <span
              className={`font-display text-2xl tabular-nums ${
                apurado ? 'animate-pulse text-tierra-700' : 'text-tenue'
              }`}
            >
              {Math.ceil(restante)}
            </span>
          )}
        </div>

        <Cartas juego={juego} sitio={sitio} />
      </Tarjeta>

      {meToca ? (
        <div className="space-y-2">
          <Tarjeta className="space-y-2 p-4">
            <p className="text-sm font-semibold text-bosque-800">¿Ya sabes quién eres?</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setDicho('')
                onCambia(intenta(juego, dicho))
              }}
            >
              <Entrada
                value={dicho}
                onChange={(e) => setDicho(e.target.value)}
                placeholder="Escribe el nombre"
                maxLength={40}
              />
              <Boton type="submit" disabled={dicho.trim().length < 3}>
                <Check size={18} /> Soy yo
              </Boton>
            </form>
            <p className="text-xs text-suave">
              Escrito, que si no siempre hay alguien que «ya lo sabía». Si fallas, se te cuenta la
              pregunta y pasa el turno.
            </p>
          </Tarjeta>
          <Boton variante="secundario" tamanyo="lg" ancho onClick={() => onCambia(pasa(juego))}>
            <SkipForward size={18} /> Preguntado, al siguiente
          </Boton>
        </div>
      ) : (
        <p className="rounded-2xl bg-beige px-4 py-3 text-center text-sm text-tenue">
          Contéstale sí o no. Tu turno llegará.
        </p>
      )}

      <Pie
        juego={juego}
        yo={yo?.nombre}
        aSolas={aSolas}
        onTerminar={() => onCambia(terminaAqui(juego))}
        onNoSoy={!aSolas && miPerfil ? () => onCambia(dejaElSitio(juego, miPerfil)) : undefined}
      />
    </div>
  )
}

/** Las cartas de los demás. La de la silla de este móvil, tapada. */
function Cartas({ juego, sitio }: { juego: Juego; sitio: number }) {
  return (
    <ul className="space-y-1.5">
      {juego.jugadores.map((p, i) =>
        i === sitio ? (
          <li
            key={p.nombre}
            className="flex items-center gap-3 rounded-xl border border-dashed border-arena bg-beige px-3 py-2"
          >
            <span className="w-20 shrink-0 truncate text-sm font-semibold text-bosque-700">Tú</span>
            <span className="flex-1 font-display text-xl text-carbon">❓</span>
          </li>
        ) : (
          <li
            key={p.nombre}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              p.puesto > 0 ? 'bg-bosque-50' : 'border border-arena bg-superficie'
            }`}
          >
            <span className="w-20 shrink-0 truncate text-sm text-tenue">{p.nombre}</span>
            <span className="flex-1 truncate font-semibold text-bosque-800">
              {EMOJI_CATEGORIA[p.carta.categoria]} {p.carta.nombre}
            </span>
            {p.puesto > 0 && <Check size={15} className="shrink-0 text-bosque-600" />}
          </li>
        ),
      )}
    </ul>
  )
}

function Vueltas({ juego }: { juego: Juego }) {
  return (
    <div className="space-y-2">
      <p className="text-center text-sm text-suave">
        Vuelta {juego.vuelta}
        {juego.vueltas !== null && ` de ${juego.vueltas}`} · faltan por saberlo{' '}
        {quedanPorAcertar(juego).length} de {juego.jugadores.length}
      </p>
      {juego.ultimoFallo && (
        <p className="rounded-xl bg-tierra-50 px-4 py-2 text-center text-sm text-tierra-800">
          {juego.ultimoFallo.nombre} dijo «{juego.ultimoFallo.dicho}» y no era.
        </p>
      )}
    </div>
  )
}

function Pie({
  juego,
  yo,
  aSolas,
  onTerminar,
  onNoSoy,
}: {
  juego: Juego
  yo?: string
  aSolas: boolean
  onTerminar: () => void
  onNoSoy?: () => void
}) {
  const sinMovil = juego.jugadores.filter((p) => !p.perfil).map((p) => p.nombre)
  return (
    <div className="space-y-2">
      {!aSolas && (
        <>
          <p className="text-center text-xs text-suave">
            Esta pantalla es la de <strong>{yo}</strong>. Cuidado con mirar el móvil de al lado: ahí sí
            sale tu personaje.
          </p>
          {sinMovil.length > 0 && (
            <p className="text-center text-xs text-suave">
              Todavía sin móvil: {sinMovil.join(', ')}. Que abran el juego y digan quiénes son.
            </p>
          )}
        </>
      )}
      <div className="flex flex-wrap justify-center gap-1">
        {onNoSoy && (
          <Boton variante="fantasma" tamanyo="sm" onClick={onNoSoy}>
            <Smartphone size={15} /> No soy {yo}
          </Boton>
        )}
        <Boton variante="fantasma" tamanyo="sm" onClick={onTerminar}>
          <X size={15} /> Terminar la partida
        </Boton>
      </div>
    </div>
  )
}

function Final({
  juego,
  onCambia,
  onSalir,
}: {
  juego: Juego
  onCambia: (j: Juego) => void
  onSalir: () => void
}) {
  const tabla = clasificacion(juego)
  const campeon = tabla.find((p) => p.puesto === 1)

  return (
    <div className="space-y-5">
      <Tarjeta className="space-y-4 p-6 text-center">
        <Trophy size={44} className="mx-auto text-tierra-500" />
        <h2 className="font-display text-2xl text-bosque-800">
          {campeon ? `¡Gana ${campeon.nombre}!` : 'Se acabó sin que nadie lo adivinara'}
        </h2>
        <ol className="space-y-1.5 text-left">
          {tabla.map((p) => (
            <li key={p.nombre} className="flex items-center gap-3 rounded-xl bg-beige px-4 py-2.5">
              <span className="w-6 shrink-0 text-center text-lg">
                {p.puesto === 1 ? '🏆' : p.puesto > 0 ? `${p.puesto}.` : '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-carbon">{p.nombre}</span>
                <span className="block truncate text-sm text-suave">
                  {EMOJI_CATEGORIA[p.carta.categoria]} {p.carta.nombre}
                </span>
              </span>
              <span className="shrink-0 text-sm text-tenue tabular-nums">
                {p.preguntas} {p.preguntas === 1 ? 'pregunta' : 'preguntas'}
              </span>
            </li>
          ))}
        </ol>
      </Tarjeta>

      <div className="grid gap-3 sm:grid-cols-2">
        <Boton tamanyo="lg" ancho onClick={() => onCambia(otraVez(juego))}>
          <RefreshCw size={18} /> Otra partida
        </Boton>
        <Boton variante="secundario" tamanyo="lg" ancho onClick={onSalir}>
          <Users size={18} /> Cambiar jugadores
        </Boton>
      </div>
    </div>
  )
}
