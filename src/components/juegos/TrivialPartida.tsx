import { useEffect, useRef, useState } from 'react'
import { Check, Dices, Hourglass, RefreshCw, Smartphone, Trophy, Users, X } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Tarjeta } from '../ui/Varios'
import { despiertaElSonido, fanfarria, mantenLaPantalla, tic, timbre } from '../../lib/juegos/sonido'
import { TableroTrivial } from './TableroTrivial'
import { FICHAS } from './colores'
import {
  CATEGORIA,
  CATEGORIAS,
  IDS,
  TABLERO,
  clasificacionT,
  dejaElSitioT,
  miSitioT,
  mueve,
  otraPartida,
  responde,
  restanteDeT,
  seAcabaElTiempoT,
  siguiente,
  tira,
  tomaSitioT,
  type PartidaT,
  type Sacador,
} from '../../lib/juegos/trivial'

export function TrivialPartida({
  partida,
  miPerfil,
  aSolas,
  desfase,
  saca,
  onCambia,
  onSalir,
}: {
  partida: PartidaT
  miPerfil: string | null
  /** Sin línea: un solo móvil que va pasando de mano en mano. */
  aSolas: boolean
  desfase: number
  saca: Sacador
  onCambia: (p: PartidaT) => void
  onSalir: () => void
}) {
  const [, repinta] = useState(0)
  // Qué pregunta tenía abierto el tablero. Guardado así —y no como un
  // sí/no— se cierra solo en la siguiente pregunta, sin un efecto que
  // ande tocando el estado a destiempo.
  const [tableroAbiertoEn, setTableroAbiertoEn] = useState<string | null>(null)
  const ultimoTic = useRef(0)
  const yaSono = useRef(false)

  const sitio = aSolas ? partida.turno : miSitioT(partida, miPerfil)
  const meToca = sitio === partida.turno
  const jugador = partida.jugadores[partida.turno]
  const restante = restanteDeT(partida, desfase)

  // La cuenta atrás de la pregunta, igual en todas las pantallas porque
  // viaja como un instante y cada móvil corrige su propio reloj.
  useEffect(() => {
    if (partida.fin === null || partida.fase !== 'pregunta') return
    ultimoTic.current = Math.ceil(restanteDeT(partida, desfase))
    const reloj = setInterval(() => {
      const quedan = restanteDeT(partida, desfase)
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
      // Lo mueve el móvil del que está contestando; los demás solo lo oyen.
      if (meToca) onCambia(seAcabaElTiempoT(partida, saca))
      else repinta((n) => n + 1)
    }, 100)
    return () => clearInterval(reloj)
  }, [partida, desfase, meToca, onCambia, saca])

  useEffect(() => {
    void mantenLaPantalla(partida.fase !== 'fin')
    return () => void mantenLaPantalla(false)
  }, [partida.fase])

  useEffect(() => {
    if (partida.fase === 'fin' && !yaSono.current) {
      yaSono.current = true
      fanfarria()
    }
    if (partida.fase !== 'fin') yaSono.current = false
  }, [partida.fase])

  if (partida.fase === 'fin') {
    const tabla = clasificacionT(partida)
    return (
      <div className="space-y-5">
        <Tarjeta className="space-y-4 p-6 text-center">
          <Trophy size={44} className="mx-auto text-tierra-500" />
          <h2 className="font-display text-2xl text-bosque-800">
            ¡Gana {partida.jugadores[partida.ganador ?? 0].nombre}!
          </h2>
          <ol className="space-y-1.5 text-left">
            {tabla.map((j, i) => (
              <li key={j.nombre} className="flex items-center gap-3 rounded-xl bg-beige px-4 py-2.5">
                <span className="w-6 shrink-0 text-center text-lg">{i === 0 ? '🏆' : `${i + 1}.`}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-carbon">{j.nombre}</span>
                  <Quesitos tiene={j.quesitos} />
                </span>
                <span className="shrink-0 text-sm text-tenue tabular-nums">
                  {j.aciertos} de {j.aciertos + j.fallos}
                </span>
              </li>
            ))}
          </ol>
        </Tarjeta>
        <div className="grid gap-3 sm:grid-cols-2">
          <Boton tamanyo="lg" ancho onClick={() => onCambia(otraPartida(partida))}>
            <RefreshCw size={18} /> Otra partida
          </Boton>
          <Boton variante="secundario" tamanyo="lg" ancho onClick={onSalir}>
            <Users size={18} /> Cambiar jugadores
          </Boton>
        </div>
      </div>
    )
  }

  const contestando = partida.fase === 'pregunta' || partida.fase === 'resultado'
  const verTablero = tableroAbiertoEn !== null && tableroAbiertoEn === (partida.pregunta?.id ?? '')
  const apurado = partida.fin !== null && restante <= 5

  return (
    <div className="space-y-4">
      {/* Quién soy en este móvil */}
      {!aSolas && sitio < 0 && (
        <Tarjeta className="space-y-3 p-4 text-center">
          <Smartphone size={28} className="mx-auto text-tierra-500" />
          <p className="text-sm text-tenue">
            Dime quién eres y podrás tirar, elegir casilla y contestar desde este móvil.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {partida.jugadores.map((j, i) => (
              <Boton
                key={j.nombre}
                variante={j.perfil ? 'suave' : 'secundario'}
                tamanyo="sm"
                onClick={() => {
                  despiertaElSonido()
                  if (miPerfil) onCambia(tomaSitioT(partida, i, miPerfil))
                }}
              >
                {j.nombre}
                {j.perfil && ' ✓'}
              </Boton>
            ))}
          </div>
        </Tarjeta>
      )}

      {/* El tablero. Mientras hay pregunta se quita de en medio: en una
          pantalla de móvil no caben el tablero, el enunciado y cuatro
          respuestas, y lo que hay que ver en ese momento son las
          respuestas. El que quiera mirarlo, lo abre. */}
      {(!contestando || verTablero) && (
        <TableroTrivial
          jugadores={partida.jugadores}
          turno={partida.turno}
          destinos={meToca && partida.fase === 'eligiendo' ? partida.destinos : []}
          onElige={(clave) => onCambia(mueve(partida, clave, saca))}
        />
      )}

      <p className="text-center text-sm text-tenue">{partida.aviso}</p>

      {contestando && (
        <div className="flex justify-center">
          <Boton
            variante="fantasma"
            tamanyo="sm"
            onClick={() => setTableroAbiertoEn(verTablero ? null : (partida.pregunta?.id ?? ''))}
          >
            {verTablero ? 'Ocultar el tablero' : 'Ver el tablero'}
          </Boton>
        </div>
      )}

      {/* Lo que toca hacer */}
      {partida.fase === 'tirando' &&
        (meToca ? (
          <Boton
            tamanyo="lg"
            ancho
            onClick={() => {
              despiertaElSonido()
              onCambia(tira(partida))
            }}
          >
            <Dices size={20} /> Tirar el dado
          </Boton>
        ) : (
          <Espera nombre={jugador.nombre} que="tira" />
        ))}

      {partida.fase === 'eligiendo' && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bosque-700 font-display text-2xl text-crema">
              {partida.dado}
            </span>
            <p className="text-sm text-tenue">
              {meToca ? 'Toca en el tablero a dónde vas.' : `${jugador.nombre} está eligiendo casilla.`}
            </p>
          </div>
          {meToca && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {partida.destinos.map((d) => {
                const fin = d.camino[d.camino.length - 1]
                return (
                  <li key={d.clave}>
                    <Boton
                      variante="secundario"
                      ancho
                      onClick={() => onCambia(mueve(partida, d.clave, saca))}
                    >
                      <Casillero indice={fin} />
                    </Boton>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {contestando && partida.pregunta && (
        <Tarjeta className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: CATEGORIA[partida.pregunta.categoria].suave,
                color: CATEGORIA[partida.pregunta.categoria].color,
              }}
            >
              {CATEGORIA[partida.pregunta.categoria].emoji} {CATEGORIA[partida.pregunta.categoria].nombre}
            </span>
            {partida.fase === 'pregunta' && partida.fin !== null && (
              <span
                className={`font-display text-2xl tabular-nums ${
                  apurado ? 'animate-pulse text-tierra-700' : 'text-tenue'
                }`}
              >
                {Math.ceil(restante)}
              </span>
            )}
          </div>

          {partida.reto && (
            <p className="rounded-xl bg-tierra-50 px-3 py-2 text-center text-sm text-tierra-800">
              Desafío final · {partida.reto.hechas.length} de 5 · si falla, pierde un quesito
            </p>
          )}

          <p className="text-lg leading-snug font-semibold text-carbon">{partida.pregunta.texto}</p>

          <ul className="space-y-2">
            {partida.pregunta.opciones.map((opcion, i) => {
              const buena = i === partida.pregunta!.buena
              const elegida = partida.elegida === i
              const revelado = partida.fase === 'resultado'
              return (
                <li key={opcion}>
                  <button
                    type="button"
                    disabled={!meToca || revelado}
                    onClick={() => onCambia(responde(partida, i, saca))}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-base transition active:scale-[0.99] disabled:active:scale-100 ${
                      revelado && buena
                        ? 'border-bosque-500 bg-bosque-100 font-semibold text-bosque-800'
                        : revelado && elegida
                          ? 'border-tierra-500 bg-tierra-100 text-tierra-800 line-through'
                          : 'border-arena bg-superficie text-carbon hover:bg-beige disabled:opacity-70'
                    }`}
                  >
                    {opcion}
                  </button>
                </li>
              )
            })}
          </ul>

          {partida.pregunta.autor && (
            <p className="text-center text-xs text-suave">Pregunta de {partida.pregunta.autor}.</p>
          )}
          {!meToca && partida.fase === 'pregunta' && (
            <p className="text-center text-sm text-suave">Contesta {jugador.nombre}. Tú calla.</p>
          )}
        </Tarjeta>
      )}

      {partida.fase === 'resultado' && (
        <Boton tamanyo="lg" ancho onClick={() => onCambia(siguiente(partida))}>
          <Check size={18} /> Siguiente turno
        </Boton>
      )}

      <Marcador partida={partida} sitio={sitio} />

      <div className="flex flex-wrap justify-center gap-1">
        {!aSolas && sitio >= 0 && miPerfil && (
          <Boton
            variante="fantasma"
            tamanyo="sm"
            onClick={() => onCambia(dejaElSitioT(partida, miPerfil))}
          >
            <Smartphone size={15} /> No soy {partida.jugadores[sitio].nombre}
          </Boton>
        )}
        <Boton variante="fantasma" tamanyo="sm" onClick={onSalir}>
          <X size={15} /> Terminar la partida
        </Boton>
      </div>
    </div>
  )
}

function Espera({ nombre, que }: { nombre: string; que: string }) {
  return (
    <p className="flex items-center justify-center gap-2 rounded-2xl bg-beige px-4 py-3 text-center text-sm text-tenue">
      <Hourglass size={16} className="animate-pulse text-tierra-500" /> Le toca a{' '}
      <strong className="text-bosque-700">{nombre}</strong>: {que}.
    </p>
  )
}

/** Los cinco quesitos de alguien, los que tiene en color y los que no, huecos. */
function Quesitos({ tiene }: { tiene: string[] }) {
  return (
    <span className="mt-0.5 flex gap-1">
      {CATEGORIAS.map((c) => (
        <span
          key={c.id}
          title={c.nombre}
          className="h-3 w-3 rounded-full border"
          style={{
            backgroundColor: tiene.includes(c.id) ? c.color : 'transparent',
            borderColor: c.color,
            opacity: tiene.includes(c.id) ? 1 : 0.35,
          }}
        />
      ))}
    </span>
  )
}

function Marcador({ partida, sitio }: { partida: PartidaT; sitio: number }) {
  return (
    <ul className="space-y-1">
      {partida.jugadores.map((j, i) => (
        <li
          key={j.nombre}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
            i === partida.turno ? 'bg-bosque-50 ring-1 ring-bosque-200' : 'bg-superficie'
          }`}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-crema"
            style={{ backgroundColor: FICHAS[i % FICHAS.length] }}
          >
            {j.nombre.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-carbon">
            {j.nombre}
            {i === sitio && <span className="text-suave"> · tú</span>}
          </span>
          <Quesitos tiene={j.quesitos} />
          <span className="w-10 shrink-0 text-right text-xs text-suave tabular-nums">
            {j.quesitos.length}/{IDS.length}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** «📚 Cultura general» o «🎲 Vuelve a tirar», para elegir sin mirar el tablero. */
function Casillero({ indice }: { indice: number }) {
  const casilla = TABLERO[indice]
  if (casilla.tipo === 'centro') return <>🏆 El centro</>
  if (casilla.tipo === 'dado') return <>🎲 Vuelve a tirar</>
  const cat = CATEGORIA[casilla.cat!]
  return (
    <>
      {cat.emoji} {cat.nombre}
      {casilla.tipo === 'quesito' && ' · ¡quesito!'}
    </>
  )
}
