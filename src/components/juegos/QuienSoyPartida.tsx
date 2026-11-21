import { useEffect, useRef, useState } from 'react'
import { Check, Eye, EyeOff, RefreshCw, SkipForward, Trophy, Users, X } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Tarjeta } from '../ui/Varios'
import { despiertaElSonido, mantenLaPantalla, tic, timbre } from '../../lib/juegos/sonido'
import { EMOJI_CATEGORIA } from '../../lib/juegos/famosos'
import {
  acierta,
  clasificacion,
  muestra,
  otraVez,
  pasa,
  restanteDe,
  seAcabaElTiempo,
  termina,
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

  // El reloj mira la hora de fin, no cuenta vueltas: así no se estira si el
  // navegador adormece el temporizador mientras el móvil está en una frente.
  useEffect(() => {
    if (juego.fin === null || juego.fase !== 'jugando') return
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

  const enJuego = juego.fase === 'jugando'
  useEffect(() => {
    void mantenLaPantalla(enJuego)
    return () => void mantenLaPantalla(false)
  }, [enJuego])

  if (juego.fase === 'fin') return <Final juego={juego} onCambia={onCambia} onSalir={onSalir} />

  const jugador = juego.jugadores[juego.turno]

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
          <p className="text-base font-semibold text-tierra-700">¡No mires la pantalla!</p>
          <p className="text-sm text-tenue">
            Póntelo en la frente con la pantalla hacia fuera. Los demás verán el nombre y te
            contestarán solo sí o no.
          </p>
          <Boton
            tamanyo="lg"
            ancho
            onClick={() => {
              despiertaElSonido()
              onCambia(muestra(juego))
            }}
          >
            <Eye size={18} /> Mostrar mi carta
          </Boton>
        </Tarjeta>
        <Marcador juego={juego} />
        <div className="flex justify-center">
          <Boton variante="fantasma" tamanyo="sm" onClick={() => onCambia(termina(juego))}>
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

      <Tarjeta className={`space-y-4 p-5 text-center ${apurado ? 'border-tierra-300' : ''}`}>
        <p className="text-sm text-suave">{jugador.nombre}, no mires</p>

        <p className="text-4xl" aria-hidden>
          {juego.carta ? EMOJI_CATEGORIA[juego.carta.categoria] : ''}
        </p>
        <p className="font-display text-5xl leading-tight break-words text-bosque-800 sm:text-7xl">
          {juego.carta?.nombre}
        </p>

        {juego.fin !== null && (
          <p
            className={`font-display text-4xl tabular-nums ${
              apurado ? 'animate-pulse text-tierra-700' : 'text-tenue'
            }`}
          >
            {Math.ceil(restante)}
          </p>
        )}

        <p className="text-sm text-suave">
          <span className="font-semibold">Pista para los demás:</span> {juego.carta?.pista}
        </p>

        <div className="grid gap-2">
          <Boton tamanyo="lg" ancho onClick={() => onCambia(acierta(juego))}>
            <Check size={20} /> ¡Lo adiviné!
          </Boton>
          <Boton variante="secundario" tamanyo="lg" ancho onClick={() => onCambia(pasa(juego))}>
            <SkipForward size={18} /> {juego.segundos > 0 ? 'Paso, otra carta' : 'Paso, siguiente turno'}
          </Boton>
        </div>
      </Tarjeta>

      <Marcador juego={juego} />
    </div>
  )
}

function Vueltas({ juego }: { juego: Juego }) {
  return (
    <p className="text-center text-sm text-suave">
      Vuelta {Math.min(juego.vuelta, juego.vueltas)} de {juego.vueltas} · quedan {juego.mazo.length}{' '}
      cartas
    </p>
  )
}

function Marcador({ juego }: { juego: Juego }) {
  return (
    <Tarjeta className="p-3">
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {juego.jugadores.map((p, i) => (
          <li
            key={p.nombre}
            className={i === juego.turno ? 'font-semibold text-bosque-700' : 'text-tenue'}
          >
            {p.nombre} <span className="tabular-nums">{p.puntos}</span>
          </li>
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
  const mejor = tabla[0]?.puntos ?? 0
  const campeones = tabla.filter((p) => p.puntos === mejor && mejor > 0)

  return (
    <div className="space-y-5">
      <Tarjeta className="space-y-4 p-6 text-center">
        <Trophy size={44} className="mx-auto text-tierra-500" />
        <h2 className="font-display text-2xl text-bosque-800">
          {campeones.length === 0
            ? 'Se acabó'
            : campeones.length === 1
              ? `¡Gana ${campeones[0].nombre}!`
              : `Empate: ${campeones.map((p) => p.nombre).join(' y ')}`}
        </h2>
        <ol className="space-y-1.5 text-left">
          {tabla.map((p, i) => (
            <li
              key={p.nombre}
              className="flex items-center gap-3 rounded-xl bg-beige px-4 py-2.5"
            >
              <span className="w-6 text-center text-lg">
                {i === 0 && p.puntos > 0 ? '🏆' : `${i + 1}.`}
              </span>
              <span className="flex-1 truncate font-semibold text-carbon">{p.nombre}</span>
              <span className="font-display text-xl text-bosque-800 tabular-nums">{p.puntos}</span>
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
