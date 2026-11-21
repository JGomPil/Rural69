import { useEffect, useRef, useState } from 'react'
import {
  Clapperboard,
  Flag,
  Hourglass,
  Music,
  Pause,
  Play,
  RefreshCw,
  SkipForward,
  Smartphone,
  Trophy,
  Volume2,
  X,
} from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Entrada } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import { acierto, despiertaElSonido, fallo, mantenLaPantalla, quesito, tic, timbre } from '../../lib/juegos/sonido'
import { refrescaElSonido } from '../../lib/juegos/bandas'
import {
  arrancaElRelojB,
  clasificacionB,
  intentaB,
  miSitioB,
  ponAltavoz,
  restanteDeB,
  rindeteB,
  seAcabaElTiempoB,
  tomaSitioB,
  type PartidaB,
} from '../../lib/juegos/bandasonora'

export function PeliPartida({
  partida,
  miPerfil,
  aSolas,
  desfase,
  onCambia,
  onSiguiente,
  onOtra,
  onSalir,
}: {
  partida: PartidaB
  miPerfil: string | null
  /** Sin línea: un solo móvil hace de todo, también de altavoz. */
  aSolas: boolean
  desfase: number
  onCambia: (p: PartidaB) => void
  onSiguiente: () => void
  onOtra: () => void
  onSalir: () => void
}) {
  const [, repinta] = useState(0)
  const [dicho, setDicho] = useState('')
  const [sonando, setSonando] = useState(false)
  /** Sin línea: a quién se le apunta el acierto en este único móvil. */
  const [quienDice, setQuienDice] = useState(0)
  const [mudo, setMudo] = useState(false)
  /** El audio no se puede traer: sin internet, o la URL ha caducado del todo. */
  const [roto, setRoto] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const ultimoTic = useRef(0)
  const comoEstaba = useRef<{ acertante: string | null; fallo: string } | null>(null)

  const sitio = miSitioB(partida, miPerfil)
  const sentado = aSolas || sitio >= 0
  const soyAltavoz = aSolas || (miPerfil !== null && partida.altavoz === miPerfil)
  const altavoz = partida.jugadores.find((j) => j.perfil === partida.altavoz)
  const restante = restanteDeB(partida, desfase)
  const banda = partida.ronda.banda
  /** Quién da por acabada la ronda cuando se agota el reloj. Uno y solo uno. */
  const cierroYo = soyAltavoz || (!partida.altavoz && sitio === 0)

  // --- La música -----------------------------------------------------
  // Solo suena en un móvil. Da vueltas a propósito: la preview son
  // treinta segundos y una ronda puede durar noventa.
  useEffect(() => {
    const el = audio.current
    if (!el) return
    if (!soyAltavoz || partida.fase !== 'sonando') {
      // Parar ya dispara `onPause`, que es quien apaga el indicador.
      el.pause()
      return
    }
    el.currentTime = 0
    void el
      .play()
      .then(() => {
        setSonando(true)
        setMudo(false)
        setRoto(false)
      })
      .catch(() => {
        // iOS no deja sonar sin que alguien toque antes la pantalla.
        setSonando(false)
        setMudo(true)
      })
  }, [banda.id, partida.fase, soyAltavoz])

  // Si la URL ha caducado, se pide otra a la tienda. Una vez.
  const arregla = async () => {
    setRoto(true)
    const nueva = await refrescaElSonido(banda.id)
    const el = audio.current
    if (!nueva || !el) return
    el.src = nueva
    void el
      .play()
      .then(() => {
        setRoto(false)
        setSonando(true)
      })
      .catch(() => setSonando(false))
  }

  // --- El reloj ------------------------------------------------------
  useEffect(() => {
    if (partida.fin === null || partida.fase !== 'sonando') return
    ultimoTic.current = restanteDeB(partida, desfase)
    const reloj = setInterval(() => {
      const quedan = restanteDeB(partida, desfase)
      if (quedan > 0) {
        repinta((n) => n + 1)
        // El pitido de los últimos segundos, no en el móvil que pone la
        // música: ahí se pisaría con la canción.
        if (quedan <= 3 && quedan !== ultimoTic.current) {
          ultimoTic.current = quedan
          if (!soyAltavoz) tic()
        }
        return
      }
      clearInterval(reloj)
      timbre()
      // Lo cierra uno solo: el que pone la música. Y si se ha ido con la
      // música puesta, el de la primera silla, que si no la ronda se
      // queda clavada en cero y nadie puede seguir.
      if (cierroYo) onCambia(seAcabaElTiempoB(partida))
      else repinta((n) => n + 1)
    }, 150)
    return () => clearInterval(reloj)
  }, [partida, desfase, cierroYo, soyAltavoz, onCambia])

  // El veredicto suena en todos los móviles.
  useEffect(() => {
    const ahora = {
      acertante: partida.ronda.acertante,
      fallo: partida.ronda.fallos[0] ? `${partida.ronda.fallos[0].nombre}:${partida.ronda.fallos[0].dicho}` : '',
    }
    const antes = comoEstaba.current
    comoEstaba.current = ahora
    if (!antes) return
    if (ahora.acertante && !antes.acertante) quesito()
    else if (ahora.fallo && ahora.fallo !== antes.fallo) fallo()
  }, [partida])

  useEffect(() => {
    if (partida.fase === 'fin') acierto(2)
  }, [partida.fase])

  const enMarcha = partida.fase === 'sonando'
  useEffect(() => {
    void mantenLaPantalla(enMarcha)
    return () => void mantenLaPantalla(false)
  }, [enMarcha])

  if (partida.fase === 'fin') {
    return <Final partida={partida} onOtra={onOtra} onSalir={onSalir} />
  }

  // Un móvil que no ha dicho quién es no puntúa: que lo diga primero.
  if (!sentado) {
    return (
      <Tarjeta className="space-y-4 p-6 text-center">
        <Smartphone size={40} className="mx-auto text-tierra-500" />
        <h2 className="font-display text-xl text-bosque-800">¿Quién eres tú?</h2>
        <p className="text-sm text-tenue">
          Para apuntarte los aciertos. El primero que lo diga se queda con la música.
        </p>
        <div className="grid gap-2">
          {partida.jugadores.map((p, i) => (
            <Boton
              key={p.nombre}
              variante={p.perfil ? 'suave' : 'secundario'}
              ancho
              onClick={() => {
                despiertaElSonido()
                if (miPerfil) onCambia(tomaSitioB(partida, i, miPerfil))
              }}
            >
              {p.nombre}
              {p.perfil && ' · ya tiene móvil'}
            </Boton>
          ))}
        </div>
      </Tarjeta>
    )
  }

  return (
    <div className="space-y-4">
      {/* El reproductor vive siempre, aunque solo suene en un móvil. */}
      <audio
        ref={audio}
        src={banda.preview}
        loop
        preload="auto"
        onError={() => void arregla()}
        onPlay={() => {
          setSonando(true)
          // El reloj de la ronda empieza aquí, cuando suena de verdad.
          if (cierroYo) onCambia(arrancaElRelojB(partida))
        }}
        onPause={() => setSonando(false)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-tenue">
          Película {partida.numero} de {partida.rondas}
        </p>
        {partida.fin !== null && partida.fase === 'sonando' && (
          <p
            className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${
              restante <= 5 ? 'text-tierra-700' : 'text-suave'
            }`}
          >
            <Hourglass size={15} /> {restante}s
          </p>
        )}
      </div>

      {partida.fase === 'sonando' ? (
        <>
          <Tarjeta className="space-y-4 p-5 text-center">
            <div
              className={`mx-auto flex size-20 items-center justify-center rounded-full ${
                sonando ? 'animate-pulse bg-bosque-100 text-bosque-700' : 'bg-beige text-suave'
              }`}
            >
              <Music size={34} />
            </div>

            {soyAltavoz ? (
              <>
                <p className="text-sm text-tenue">
                  {sonando
                    ? 'Está sonando en este móvil. Súbele el volumen.'
                    : 'Dale para que suene. Si es un iPhone, quítale el silencio del lateral.'}
                </p>
                {roto && (
                  <p className="text-xs text-tierra-700">
                    No hay manera de traer la música. Mira si tienes internet; si no, saltad a la
                    siguiente con «nos rendimos».
                  </p>
                )}
                {mudo && !sonando && !roto && (
                  <p className="text-xs text-tierra-700">
                    El móvil no deja sonar nada hasta que toques la pantalla. Toca el botón.
                  </p>
                )}
                <div className="flex justify-center gap-2">
                  <Boton
                    variante={sonando ? 'secundario' : 'primario'}
                    onClick={() => {
                      despiertaElSonido()
                      const el = audio.current
                      if (!el) return
                      if (sonando) el.pause()
                      else void el.play().catch(() => setMudo(true))
                    }}
                  >
                    {sonando ? <Pause size={17} /> : <Play size={17} />}
                    {sonando ? 'Parar' : 'Que suene'}
                  </Boton>
                  <Boton
                    variante="suave"
                    onClick={() => {
                      const el = audio.current
                      if (!el) return
                      el.currentTime = 0
                      void el.play().catch(() => setMudo(true))
                    }}
                  >
                    <RefreshCw size={16} /> Desde el principio
                  </Boton>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-tenue">
                  {altavoz ? `Suena en el móvil de ${altavoz.nombre}.` : 'Nadie está poniendo la música.'}
                </p>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    despiertaElSonido()
                    if (miPerfil) onCambia(ponAltavoz(partida, miPerfil))
                  }}
                >
                  <Volume2 size={17} /> Que suene aquí
                </Boton>
              </>
            )}
          </Tarjeta>

          <Tarjeta className="space-y-3 p-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!dicho.trim()) return
                onCambia(intentaB(partida, aSolas ? quienDice : sitio, dicho))
                setDicho('')
              }}
            >
              <Entrada
                value={dicho}
                onChange={(e) => setDicho(e.target.value)}
                placeholder="¿Qué película es?"
                maxLength={60}
                autoComplete="off"
              />
              <Boton type="submit" disabled={!dicho.trim()}>
                <Clapperboard size={17} /> ¡Es esa!
              </Boton>
            </form>
            {aSolas && (
              <div>
                <p className="mb-1.5 text-xs text-suave">¿Quién la ha dicho?</p>
                <div className="flex flex-wrap gap-1.5">
                  {partida.jugadores.map((j, i) => (
                    <button
                      key={j.nombre}
                      type="button"
                      onClick={() => setQuienDice(i)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                        i === quienDice ? 'bg-bosque-600 text-white' : 'bg-beige text-tenue hover:bg-arena'
                      }`}
                    >
                      {j.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-suave">
              Con el título a medias basta. Si fallas no pasa nada: puedes volver a probar.
            </p>
          </Tarjeta>

          {partida.ronda.fallos.length > 0 && (
            <Tarjeta className="space-y-1.5 p-4">
              <p className="text-xs font-semibold text-suave">Ya se ha dicho, y no era:</p>
              <ul className="flex flex-wrap gap-1.5">
                {partida.ronda.fallos.map((f, i) => (
                  <li
                    key={`${f.nombre}-${f.dicho}-${i}`}
                    className="flex items-center gap-1 rounded-full bg-tierra-100 px-2.5 py-1 text-xs text-tierra-700"
                  >
                    <X size={12} /> {f.dicho} <span className="text-tierra-600/70">· {f.nombre}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <div className="flex justify-center">
            <Boton variante="suave" onClick={() => onCambia(rindeteB(partida))}>
              <Flag size={16} /> Nos rendimos
            </Boton>
          </div>
        </>
      ) : (
        <Tarjeta className="space-y-4 p-5 text-center">
          <p className="text-sm font-semibold text-suave">
            {partida.ronda.acertante ? `¡${partida.ronda.acertante} la sacó!` : 'No la sacó nadie.'}
          </p>
          <h2 className="font-display text-2xl text-bosque-800">{banda.peli}</h2>
          <p className="text-sm text-tenue">
            {banda.anyo} · «{banda.tema}», de {banda.autor}
          </p>
          {soyAltavoz && (
            <Boton
              variante="suave"
              onClick={() => {
                const el = audio.current
                if (!el) return
                el.currentTime = 0
                void el.play()
              }}
            >
              <Play size={16} /> Oírla otra vez
            </Boton>
          )}
          <Boton tamanyo="lg" ancho onClick={onSiguiente}>
            <SkipForward size={18} /> {partida.numero >= partida.rondas ? 'Ver el marcador' : 'Siguiente película'}
          </Boton>
        </Tarjeta>
      )}

      <Marcador partida={partida} miPerfil={miPerfil} />

      <div className="flex justify-center pt-1">
        <button type="button" onClick={onSalir} className="text-xs text-suave underline-offset-2 hover:underline">
          Terminar la partida
        </button>
      </div>
    </div>
  )
}

function Marcador({ partida, miPerfil }: { partida: PartidaB; miPerfil: string | null }) {
  return (
    <Tarjeta className="p-3">
      <ul className="flex flex-wrap gap-1.5">
        {clasificacionB(partida).map((j) => (
          <li
            key={j.nombre}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              j.perfil && j.perfil === miPerfil
                ? 'bg-bosque-600 text-white'
                : 'bg-beige text-tenue'
            }`}
          >
            {j.nombre} <span className="tabular-nums">{j.puntos}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

function Final({
  partida,
  onOtra,
  onSalir,
}: {
  partida: PartidaB
  onOtra: () => void
  onSalir: () => void
}) {
  const tabla = clasificacionB(partida)
  const mejor = tabla[0]?.puntos ?? 0
  return (
    <div className="space-y-4">
      <Tarjeta className="space-y-4 p-6 text-center">
        <Trophy size={40} className="mx-auto text-tierra-500" />
        <h2 className="font-display text-xl text-bosque-800">
          {tabla.filter((j) => j.puntos === mejor && mejor > 0).map((j) => j.nombre).join(' y ') || 'Nadie'}
          {mejor > 0 ? ', que se las sabe todas' : ' acertó ninguna'}
        </h2>
        <ol className="space-y-1.5 text-left">
          {tabla.map((j, i) => (
            <li
              key={j.nombre}
              className="flex items-center justify-between rounded-2xl bg-beige px-3.5 py-2 text-sm font-semibold text-tenue"
            >
              <span>
                <span className="mr-2 text-suave">{i + 1}.</span>
                {j.nombre}
              </span>
              <span className="tabular-nums">
                {j.puntos} {j.puntos === 1 ? 'peli' : 'pelis'}
              </span>
            </li>
          ))}
        </ol>
      </Tarjeta>
      <div className="grid grid-cols-2 gap-2">
        <Boton variante="secundario" ancho onClick={onOtra}>
          <RefreshCw size={17} /> Otra partida
        </Boton>
        <Boton variante="suave" ancho onClick={onSalir}>
          Terminar
        </Boton>
      </div>
    </div>
  )
}
