import { useEffect, useRef, useState } from 'react'
import {
  Flag,
  Hourglass,
  History,
  Music,
  Pause,
  Play,
  RefreshCw,
  SkipForward,
  Trophy,
  Volume2,
} from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Tarjeta } from '../ui/Varios'
import { acierto, despiertaElSonido, mantenLaPantalla, quesito, tic, timbre } from '../../lib/juegos/sonido'
import {
  acierta,
  arrancaElReloj,
  clasificacion,
  refrescaElSonido,
  restanteDe,
  rindete,
  seAcabaElTiempo,
  tomaElMando,
  type Partida,
} from '../../lib/juegos/musica'

export function MusicaPartida({
  partida,
  miPerfil,
  miNombre,
  cosa,
  aSolas,
  desfase,
  onCambia,
  onSiguiente,
  onOtra,
  onSalir,
}: {
  partida: Partida
  miPerfil: string | null
  /** Cómo se llama el que mira esta pantalla, para contarlo si coge la música. */
  miNombre: string
  /** Qué se adivina: «película» o «canción». Es lo único que cambia. */
  cosa: string
  /** Sin línea: un solo móvil hace de todo, también de altavoz. */
  aSolas: boolean
  desfase: number
  onCambia: (p: Partida) => void
  onSiguiente: () => void
  onOtra: () => void
  onSalir: () => void
}) {
  const [, repinta] = useState(0)
  const [sonando, setSonando] = useState(false)
  const [mudo, setMudo] = useState(false)
  /** El audio no se puede traer: sin internet, o la URL ha caducado del todo. */
  const [roto, setRoto] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const ultimoTic = useRef(0)
  const comoEstaba = useRef<string | null>(null)

  const soyModerador = aSolas || (miPerfil !== null && partida.moderador?.perfil === miPerfil)
  /**
   * Quien puede tocar la ronda: el que lleva el mando, y si no lo lleva
   * nadie —se fue a por hielo con el móvil— cualquiera, que si no la
   * partida se queda clavada y no hay manera de seguir.
   */
  const puedoMandar = soyModerador || !partida.moderador
  const restante = restanteDe(partida, desfase)
  const pista = partida.ronda.pista
  const Cosa = cosa.charAt(0).toUpperCase() + cosa.slice(1)

  // --- La música -----------------------------------------------------
  // Solo suena en un móvil. Da vueltas a propósito: la preview son
  // treinta segundos y una ronda puede durar noventa.
  useEffect(() => {
    const el = audio.current
    if (!el) return
    if (!soyModerador || partida.fase !== 'sonando') {
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
  }, [pista.id, partida.fase, soyModerador])

  // Si la URL ha caducado, se pide otra a la tienda. Una vez.
  const arregla = async () => {
    setRoto(true)
    const nueva = await refrescaElSonido(pista.id)
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
    ultimoTic.current = restanteDe(partida, desfase)
    const reloj = setInterval(() => {
      const quedan = restanteDe(partida, desfase)
      if (quedan > 0) {
        repinta((n) => n + 1)
        // El pitido de los últimos segundos, no en el móvil que pone la
        // música: ahí se pisaría con la canción.
        if (quedan <= 3 && quedan !== ultimoTic.current) {
          ultimoTic.current = quedan
          if (!soyModerador) tic()
        }
        return
      }
      clearInterval(reloj)
      timbre()
      // La cierra uno solo, o se escribiría dos veces lo mismo.
      if (puedoMandar) onCambia(seAcabaElTiempo(partida))
      else repinta((n) => n + 1)
    }, 150)
    return () => clearInterval(reloj)
  }, [partida, desfase, puedoMandar, soyModerador, onCambia])

  // El veredicto suena en todos los móviles.
  useEffect(() => {
    const ahora = partida.ronda.acertante
    const antes = comoEstaba.current
    comoEstaba.current = ahora
    if (antes === null && ahora) quesito()
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
    return <Final partida={partida} cosa={cosa} onOtra={onOtra} onSalir={onSalir} />
  }

  return (
    <div className="space-y-4">
      {/* El reproductor vive siempre, aunque solo suene en un móvil. */}
      <audio
        ref={audio}
        src={pista.preview}
        loop
        preload="auto"
        onError={() => void arregla()}
        onPlay={() => {
          setSonando(true)
          // El reloj de la ronda empieza aquí, cuando suena de verdad.
          if (puedoMandar) onCambia(arrancaElReloj(partida))
        }}
        onPause={() => setSonando(false)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-tenue">
          {Cosa} {partida.numero} de {partida.rondas}
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

            {soyModerador ? (
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
                  {partida.moderador
                    ? `Suena en el móvil de ${partida.moderador.nombre}, y ahí se apuntan los aciertos.`
                    : 'Nadie está poniendo la música.'}
                </p>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    despiertaElSonido()
                    if (miPerfil) onCambia(tomaElMando(partida, miPerfil, miNombre))
                  }}
                >
                  <Volume2 size={17} /> Que suene aquí
                </Boton>
              </>
            )}
          </Tarjeta>

          {puedoMandar ? (
            <Tarjeta className="space-y-3 p-4">
              <p className="text-sm font-semibold text-bosque-800">¿Quién la ha sacado?</p>
              <div className="grid grid-cols-2 gap-2">
                {partida.jugadores.map((j, i) => (
                  <Boton key={j.nombre} variante="secundario" ancho onClick={() => onCambia(acierta(partida, i))}>
                    {j.nombre}
                  </Boton>
                ))}
              </div>
              <p className="text-xs text-suave">
                Se dice a voces y tú apuntas. Si no la saca nadie, «nos rendimos» la destapa.
              </p>
            </Tarjeta>
          ) : (
            <p className="text-center text-sm text-suave">
              Grítalo: lo apunta quien lleva la música.
            </p>
          )}

          {puedoMandar && (
            <div className="flex justify-center">
              <Boton variante="suave" onClick={() => onCambia(rindete(partida))}>
                <Flag size={16} /> Nos rendimos
              </Boton>
            </div>
          )}
        </>
      ) : (
        <Tarjeta className="space-y-4 p-5 text-center">
          <p className="text-sm font-semibold text-suave">
            {partida.ronda.acertante ? `¡${partida.ronda.acertante} la sacó!` : 'No la sacó nadie.'}
          </p>
          <h2 className="font-display text-2xl text-bosque-800">{pista.titulo}</h2>
          <p className="text-sm text-tenue">
            {pista.anyo} · {pista.pie}
          </p>
          {pista.alias.length > 0 && (
            <p className="text-xs text-suave">O, como la llama media España, «{pista.alias[0]}».</p>
          )}
          {soyModerador && (
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
          {puedoMandar ? (
            <Boton tamanyo="lg" ancho onClick={onSiguiente}>
              <SkipForward size={18} /> {partida.numero >= partida.rondas ? 'Ver el marcador' : `Siguiente ${cosa}`}
            </Boton>
          ) : (
            <p className="text-sm text-suave">A la siguiente pasa quien lleva la música.</p>
          )}
        </Tarjeta>
      )}

      <Marcador partida={partida} />
      <LoQueVaCayendo partida={partida} />

      <div className="flex justify-center pt-1">
        <button type="button" onClick={onSalir} className="text-xs text-suave underline-offset-2 hover:underline">
          Terminar la partida
        </button>
      </div>
    </div>
  )
}

function Marcador({ partida }: { partida: Partida }) {
  return (
    <Tarjeta className="p-3">
      <ul className="flex flex-wrap gap-1.5">
        {clasificacion(partida).map((j) => (
          <li
            key={j.nombre}
            className="flex items-center gap-1.5 rounded-full bg-beige px-3 py-1 text-sm font-semibold text-tenue"
          >
            {j.nombre} <span className="tabular-nums">{j.puntos}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

function LoQueVaCayendo({ partida }: { partida: Partida }) {
  if (partida.historia.length === 0) return null
  return (
    <details className="group rounded-2xl border border-arena bg-superficie">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-semibold text-bosque-700">
        <History size={15} /> Lo que va cayendo
        <span className="ml-auto text-xs font-normal text-suave">{partida.historia.length}</span>
      </summary>
      <ul className="space-y-1 border-t border-arena px-4 py-3 text-sm text-tenue">
        {partida.historia.slice(0, 20).map((linea, i) => (
          <li key={`${linea}-${i}`}>{linea}</li>
        ))}
      </ul>
    </details>
  )
}

/** «canción» → «canciones», «película» → «películas». Nada más hace falta. */
const cosas = (cosa: string) => (cosa.endsWith('n') ? cosa.replace(/ón$/, 'ones') : cosa + 's')

function Final({
  partida,
  cosa,
  onOtra,
  onSalir,
}: {
  partida: Partida
  cosa: string
  onOtra: () => void
  onSalir: () => void
}) {
  const tabla = clasificacion(partida)
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
                {j.puntos} {j.puntos === 1 ? cosa : cosas(cosa)}
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
