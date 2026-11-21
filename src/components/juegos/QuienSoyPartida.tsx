import { useEffect, useRef, useState } from 'react'
import { Check, Eye, EyeOff, HelpCircle, History, RefreshCw, SkipForward, Trophy, Users, X } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Tarjeta } from '../ui/Varios'
import { despiertaElSonido, mantenLaPantalla, tic, timbre } from '../../lib/juegos/sonido'
import { EMOJI_CATEGORIA } from '../../lib/juegos/famosos'
import {
  acierta,
  clasificacion,
  loQueVe,
  mira,
  otraVez,
  pasa,
  quedanPorAcertar,
  restanteDe,
  seAcabaElTiempo,
  seguirJugando,
  terminaAqui,
  type Juego,
} from '../../lib/juegos/quiensoy'

export function QuienSoyPartida({
  juego,
  onCambia,
  onSalir,
}: {
  juego: Juego
  onCambia: (j: Juego) => void
  onSalir: () => void
}) {
  const [, repinta] = useState(0)
  const ultimoTic = useRef(0)
  const restante = restanteDe(juego)

  // El reloj mira la hora de fin en vez de contar vueltas: así no se estira
  // cuando el navegador adormece el temporizador.
  useEffect(() => {
    if (juego.fin === null || juego.fase !== 'mirando') return
    ultimoTic.current = Math.ceil(restanteDe(juego))
    const reloj = setInterval(() => {
      const quedan = restanteDe(juego)
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
      onCambia(seAcabaElTiempo(juego))
    }, 100)
    return () => clearInterval(reloj)
  }, [juego, onCambia])

  const mirando = juego.fase === 'mirando'
  useEffect(() => {
    void mantenLaPantalla(mirando)
    return () => void mantenLaPantalla(false)
  }, [mirando])

  if (juego.fase === 'fin') return <Final juego={juego} onCambia={onCambia} onSalir={onSalir} />

  const jugador = juego.jugadores[juego.turno]

  if (juego.fase === 'alguien-acerto') {
    const acertado = [...juego.jugadores].filter((p) => p.puesto > 0).pop()
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
          <EyeOff size={44} className="mx-auto text-tierra-500" />
          <div>
            <p className="text-sm text-suave">Pasa el móvil a</p>
            <p className="font-display text-3xl text-bosque-800">{jugador.nombre}</p>
          </div>
          <p className="text-sm text-tenue">
            Verás las cartas de los demás, nunca la tuya. Haces <strong>una sola pregunta</strong> a la
            mesa, te contestan sí o no, y el móvil pasa al siguiente.
          </p>
          <Boton
            tamanyo="lg"
            ancho
            onClick={() => {
              despiertaElSonido()
              onCambia(mira(juego))
            }}
          >
            <Eye size={18} /> Ya lo tengo yo
          </Boton>
        </Tarjeta>
        <Historia juego={juego} />
        <div className="flex justify-center">
          <Boton variante="fantasma" tamanyo="sm" onClick={() => onCambia(terminaAqui(juego))}>
            <X size={15} /> Terminar la partida
          </Boton>
        </div>
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
            <strong className="text-bosque-700">{jugador.nombre}</strong>, una pregunta y pasas
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

        <div className="rounded-2xl bg-beige px-4 py-3 text-center">
          <p className="text-xs text-suave">Tú eres</p>
          <p className="font-display text-3xl text-carbon">❓</p>
        </div>

        <p className="text-xs text-suave">Los demás son:</p>
        <ul className="space-y-1.5">
          {loQueVe(juego).map((p) => (
            <li
              key={p.nombre}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                p.puesto > 0 ? 'bg-bosque-50' : 'bg-superficie border border-arena'
              }`}
            >
              <span className="w-20 shrink-0 truncate text-sm text-tenue">{p.nombre}</span>
              <span className="flex-1 truncate font-semibold text-bosque-800">
                {EMOJI_CATEGORIA[p.carta.categoria]} {p.carta.nombre}
              </span>
              {p.puesto > 0 && <Check size={15} className="shrink-0 text-bosque-600" />}
            </li>
          ))}
        </ul>
      </Tarjeta>

      <div className="grid gap-2">
        <Boton tamanyo="lg" ancho onClick={() => onCambia(acierta(juego))}>
          <Check size={20} /> ¡Ya sé quién soy!
        </Boton>
        <Boton variante="secundario" tamanyo="lg" ancho onClick={() => onCambia(pasa(juego))}>
          <SkipForward size={18} /> Preguntado, al siguiente
        </Boton>
      </div>

      <p className="flex items-start gap-2 px-2 text-xs text-suave">
        <HelpCircle size={14} className="mt-0.5 shrink-0" />
        Si te la juegas y fallas, pulsa «al siguiente»: se cuenta como pregunta y ya está.
      </p>
    </div>
  )
}

function Vueltas({ juego }: { juego: Juego }) {
  return (
    <p className="text-center text-sm text-suave">
      Vuelta {juego.vuelta}
      {juego.vueltas !== null && ` de ${juego.vueltas}`} · faltan por saberlo{' '}
      {quedanPorAcertar(juego).length} de {juego.jugadores.length}
    </p>
  )
}

function Historia({ juego }: { juego: Juego }) {
  if (juego.historia.length === 0) return null
  return (
    <Tarjeta className="px-4 py-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-bosque-700">
        <History size={14} /> Lo último
      </p>
      <ul className="space-y-1 text-sm text-tenue">
        {juego.historia.slice(0, 3).map((linea, i) => (
          <li key={`${i}-${linea.slice(0, 10)}`}>{linea}</li>
        ))}
      </ul>
    </Tarjeta>
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
