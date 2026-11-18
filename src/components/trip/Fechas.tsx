import { useMemo, useState } from 'react'
import { CalendarDays, Check, Lock, LockOpen, Plus, Sparkles, Trash2, Trophy } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useConsulta } from '../../hooks/useConsulta'
import { useGrupo } from '../../hooks/useGrupo'
import { esVotoDuplicado, mensajeError, supabase } from '../../lib/supabase'
import { findeCorto, hoyISO, noches, proximosFindes, rangoFechas } from '../../lib/formato'
import { Boton, BotonIcono } from '../ui/Boton'
import { Campo, Entrada } from '../ui/Campos'
import { Confirmar, Modal } from '../ui/Modal'
import { Personas } from '../ui/Persona'
import { AvisoError, Cargando, Etiqueta, Tarjeta, Vacio } from '../ui/Varios'
import type { DateVote, TripDateOption } from '../../lib/types'

/**
 * Votación de fechas. Va antes que la de casas porque es el orden real del
 * grupo: primero se decide el fin de semana y, con la fecha ya puesta, se
 * buscan casas libres.
 *
 * Es el mismo patrón que la votación de casas (proponer, votar todas las
 * que valgan, abrir y cerrar, marcar la ganadora). La diferencia
 * es el final: al marcar las fechas elegidas se copian en la escapada, que
 * es de donde las lee todo lo demás —la cuenta atrás, los tiempos de la
 * compra, el historial—, así que no hay dos verdades.
 */
export function Fechas() {
  const { escapada, recargar } = useEscapada()
  const { perfil, esAdmin } = useAuth()
  const { perfiles } = useGrupo()
  const avisos = useAvisos()
  const [formAbierto, setFormAbierto] = useState(false)
  const [votando, setVotando] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<TripDateOption | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [proponiendo, setProponiendo] = useState<string | null>(null)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [opciones, votos] = await Promise.all([
        supabase.from('trip_date_options').select('*').eq('trip_id', escapada.id).order('start_date'),
        supabase.from('date_votes').select('*').eq('trip_id', escapada.id),
      ])
      if (opciones.error) throw opciones.error
      if (votos.error) throw votos.error
      return {
        opciones: (opciones.data ?? []) as TripDateOption[],
        votos: (votos.data ?? []) as DateVote[],
      }
    },
    [escapada.id],
    { realtime: ['trip_date_options', 'date_votes', 'trips'] },
  )

  const resultados = useMemo(() => {
    const opciones = datos?.opciones ?? []
    const votos = datos?.votos ?? []
    const filas = opciones.map((opcion) => ({
      opcion,
      votos: votos.filter((v) => v.option_id === opcion.id),
    }))
    // Más votadas primero; a igualdad de votos, por fecha.
    filas.sort((a, b) => b.votos.length - a.votos.length || a.opcion.start_date.localeCompare(b.opcion.start_date))
    const maximo = filas[0]?.votos.length ?? 0
    // El porcentaje se mide sobre la gente que ha votado, no sobre el número
    // de votos: con voto múltiple lo que dice algo es a cuántos les vale.
    const votantes = new Set(votos.map((v) => v.voter_id)).size
    return { filas, maximo, votantes, total: votos.length }
  }, [datos])

  /** Los findes que he votado yo: de la opción al identificador de mi voto. */
  const misVotos = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const v of datos?.votos ?? []) if (v.voter_id === perfil?.id) mapa.set(v.option_id, v.id)
    return mapa
  }, [datos, perfil?.id])

  const sinVotar = perfiles.filter((p) => !datos?.votos.some((v) => v.voter_id === p.id))

  // Los findes que vienen, para proponer de un toque. Se calcula una vez: no
  // depende de nada que cambie mientras se mira la pantalla.
  const findes = useMemo(() => proximosFindes(10), [])
  const yaPropuestos = useMemo(
    () => new Set((datos?.opciones ?? []).map((o) => `${o.start_date}|${o.end_date}`)),
    [datos?.opciones],
  )

  const proponFinde = async (finde: { inicio: string; fin: string }) => {
    if (!perfil) return
    const clave = `${finde.inicio}|${finde.fin}`
    setProponiendo(clave)
    try {
      const { error: err } = await supabase.from('trip_date_options').insert({
        trip_id: escapada.id,
        start_date: finde.inicio,
        end_date: finde.fin,
        proposed_by: perfil.id,
      })
      if (err) throw err
      await refrescar(true)
      avisos.ok(`Propuesto el ${findeCorto(finde.inicio, finde.fin)}.`)
    } catch (e) {
      const texto = mensajeError(e)
      avisos.error(
        texto.includes('sin_repetir') || texto.includes('duplicate')
          ? 'Ese finde ya estaba propuesto.'
          : texto,
      )
    } finally {
      setProponiendo(null)
    }
  }

  const votar = async (optionId: string) => {
    if (!perfil) return
    setVotando(optionId)
    try {
      // Vota todos los findes que te valgan: pulsar uno votado lo quita.
      const mío = misVotos.get(optionId)
      if (mío) {
        const { error: err } = await supabase.from('date_votes').delete().eq('id', mío)
        if (err) throw err
        avisos.info('Voto retirado.')
      } else {
        const { error: err } = await supabase
          .from('date_votes')
          .insert({ trip_id: escapada.id, option_id: optionId, voter_id: perfil.id })
        if (err) throw err
        avisos.ok('¡Votadas!')
      }
      await refrescar(true)
    } catch (e) {
      avisos.error(esVotoDuplicado(e) ? 'Todavía no se pueden votar varias: falta pasar el último cambio de la base de datos (10_voto_multiple.sql).' : mensajeError(e))
    } finally {
      setVotando(null)
    }
  }

  const cambiarVotacion = async (abierta: boolean) => {
    try {
      const { error: err } = await supabase
        .from('trips')
        .update({ dates_voting_open: abierta })
        .eq('id', escapada.id)
      if (err) throw err
      await recargar()
      avisos.ok(abierta ? 'Votación de fechas reabierta.' : 'Votación de fechas cerrada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  // Marcar las ganadoras copia las fechas en la escapada: a partir de aquí la
  // cuenta atrás y los tiempos de la compra ya tienen de dónde tirar.
  const proclamar = async (opcion: TripDateOption) => {
    try {
      const { error: err } = await supabase
        .from('trips')
        .update({
          chosen_date_option_id: opcion.id,
          start_date: opcion.start_date,
          end_date: opcion.end_date,
        })
        .eq('id', escapada.id)
      if (err) throw err
      await recargar()
      avisos.ok('Fechas fijadas. Ya podéis buscar casa.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('trip_date_options').delete().eq('id', borrando.id)
      if (err) throw err
      setBorrando(null)
      await refrescar(true)
      avisos.ok('Fechas retiradas.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando fechas…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  const ganadoras = resultados.maximo > 0 ? resultados.filas.filter((f) => f.votos.length === resultados.maximo) : []
  const hayEmpate = ganadoras.length > 1
  const yaHayFechas = Boolean(escapada.start_date)

  return (
    <div className="space-y-4">
      <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg text-bosque-800">
            <CalendarDays size={19} />
            {escapada.dates_voting_open ? 'Fechas a votación' : 'Votación de fechas cerrada'}
          </h2>
          <p className="mt-0.5 text-sm text-suave">
            {/* Tres estados distintos, y decirlos mal despista: «todavía sin
                fechas» con cinco findes ya propuestos y la gente votando no
                es verdad. */}
            {yaHayFechas ? (
              <>
                Fechas de la escapada: <strong>{rangoFechas(escapada.start_date, escapada.end_date)}</strong>
              </>
            ) : resultados.filas.length === 0 ? (
              'Todavía sin fechas. Proponed fines de semana y votad.'
            ) : (
              `${resultados.filas.length} ${resultados.filas.length === 1 ? 'finde propuesto' : 'findes propuestos'}; han votado ${resultados.votantes} de ${perfiles.length}. Sin decidir todavía.`
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {escapada.dates_voting_open && (
            <Boton variante="secundario" onClick={() => setFormAbierto(true)}>
              <Plus size={16} /> Proponer fechas
            </Boton>
          )}
          {esAdmin && (
            <Boton
              variante={escapada.dates_voting_open ? 'fantasma' : 'primario'}
              onClick={() => void cambiarVotacion(!escapada.dates_voting_open)}
            >
              {escapada.dates_voting_open ? (
                <>
                  <Lock size={16} /> Cerrar
                </>
              ) : (
                <>
                  <LockOpen size={16} /> Reabrir
                </>
              )}
            </Boton>
          )}
        </div>
      </Tarjeta>

      {escapada.dates_voting_open && (
        <Tarjeta className="p-4">
          <h3 className="flex items-center gap-2 text-base text-bosque-800">
            <Sparkles size={17} className="text-oliva-600" /> Los findes que vienen
          </h3>
          <p className="mt-0.5 text-xs text-suave">
            Un toque y queda propuesto, para que no haya que escribir dos fechas en el móvil. Para un puente
            o unas fechas sueltas, «Proponer fechas».
          </p>
          <div className="scroll-oculto -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
            {findes.map((f) => {
              const clave = `${f.inicio}|${f.fin}`
              const ya = yaPropuestos.has(clave)
              return (
                <button
                  key={clave}
                  type="button"
                  disabled={ya || proponiendo !== null}
                  onClick={() => void proponFinde(f)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-bold whitespace-nowrap transition disabled:opacity-100 ${
                    ya
                      ? 'cursor-default border-bosque-100 bg-bosque-50 text-bosque-700'
                      : 'border-arena bg-superficie text-tenue hover:border-bosque-400 hover:bg-beige active:scale-95 disabled:opacity-50'
                  }`}
                >
                  {ya ? <Check size={14} /> : <Plus size={14} />}
                  {findeCorto(f.inicio, f.fin)}
                </button>
              )
            })}
          </div>
        </Tarjeta>
      )}

      {!escapada.dates_voting_open && (
        <p className="rounded-2xl border border-arena bg-beige px-4 py-3 text-sm text-tenue">
          La votación de fechas está cerrada: ya no se pueden proponer ni cambiar los votos.
        </p>
      )}

      {resultados.filas.length === 0 ? (
        <Vacio
          emoji="🗓️"
          titulo="Ningún fin de semana propuesto todavía"
          texto="Proponed los findes que os cuadren y votad. Cuando haya fechas, toca buscar casa."
          accion={
            escapada.dates_voting_open ? (
              <Boton tamanyo="lg" onClick={() => setFormAbierto(true)}>
                <Plus size={19} /> Proponer las primeras
              </Boton>
            ) : undefined
          }
        />
      ) : (
        <>
          {resultados.maximo > 0 && (
            <Tarjeta className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-base text-bosque-800">
                <Trophy size={17} className="text-tierra-500" />
                {hayEmpate
                  ? `Empate entre ${ganadoras.length} fechas`
                  : `Van ganando: ${rangoFechas(ganadoras[0].opcion.start_date, ganadoras[0].opcion.end_date)}`}
              </h3>
              <div className="space-y-2.5">
                {resultados.filas.map(({ opcion, votos }) => {
                  const pct = resultados.votantes > 0 ? Math.round((votos.length / resultados.votantes) * 100) : 0
                  const esGanadora = votos.length === resultados.maximo && votos.length > 0
                  return (
                    <div key={opcion.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className={`truncate font-semibold ${esGanadora ? 'text-bosque-700' : 'text-tenue'}`}>
                          {rangoFechas(opcion.start_date, opcion.end_date)}
                          {escapada.chosen_date_option_id === opcion.id && ' 🏆'}
                        </span>
                        <span className="cifras shrink-0 font-bold text-suave">
                          {votos.length} ({pct}%)
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-arena">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            esGanadora ? 'bg-bosque-500' : 'bg-oliva-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {votos.length > 0 && (
                        <Personas className="mt-1.5 text-xs text-suave" perfilIds={votos.map((v) => v.voter_id)} />
                      )}
                    </div>
                  )
                })}
              </div>
              {sinVotar.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-arena pt-3 text-xs text-suave">
                  <span className="font-semibold">Faltan por votar:</span>
                  <Personas perfilIds={sinVotar.map((p) => p.id)} className="opacity-70 grayscale" />
                </div>
              )}
            </Tarjeta>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {resultados.filas.map(({ opcion, votos }) => {
              const esMiVoto = misVotos.has(opcion.id)
              const esGanadora = votos.length === resultados.maximo && votos.length > 0
              const n = noches(opcion.start_date, opcion.end_date)
              const elegidas = escapada.chosen_date_option_id === opcion.id
              const puedeBorrar = esAdmin || opcion.proposed_by === perfil?.id
              return (
                <Tarjeta
                  key={opcion.id}
                  className={`flex flex-col gap-1.5 p-4 ${esMiVoto ? 'ring-2 ring-bosque-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base text-bosque-800">
                      {rangoFechas(opcion.start_date, opcion.end_date)}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      {elegidas && <Etiqueta tono="exito">Elegidas</Etiqueta>}
                      {esGanadora && !elegidas && (
                        <Etiqueta tono="oliva">
                          {votos.length} {votos.length === 1 ? 'voto' : 'votos'}
                        </Etiqueta>
                      )}
                      {puedeBorrar && escapada.dates_voting_open && !elegidas && (
                        <BotonIcono etiqueta="Retirar estas fechas" tono="peligro" onClick={() => setBorrando(opcion)}>
                          <Trash2 size={15} />
                        </BotonIcono>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-suave">
                    {[opcion.label, n ? `${n} ${n === 1 ? 'noche' : 'noches'}` : null].filter(Boolean).join(' · ') ||
                      '—'}
                  </p>
                  {opcion.notes && <p className="text-sm text-tenue">{opcion.notes}</p>}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <Boton
                      tamanyo="sm"
                      variante={esMiVoto ? 'primario' : 'secundario'}
                      disabled={!escapada.dates_voting_open}
                      cargando={votando === opcion.id}
                      onClick={() => void votar(opcion.id)}
                    >
                      {esMiVoto ? (
                        <>
                          <Check size={15} /> Votadas
                        </>
                      ) : (
                        'Votar estas'
                      )}
                    </Boton>
                    {esAdmin && !elegidas && (
                      <button
                        type="button"
                        onClick={() => void proclamar(opcion)}
                        className="text-xs font-semibold text-suave hover:text-bosque-600 hover:underline"
                      >
                        Fijar estas fechas
                      </button>
                    )}
                  </div>
                </Tarjeta>
              )
            })}
          </div>
        </>
      )}

      <p className="medida mx-auto text-center text-xs text-suave">
        Vota <strong>todos los findes que te valgan</strong>, no solo uno: así sale el que le viene bien a más
        gente. Puedes quitarlos mientras la votación esté abierta. Al fijar unas fechas se copian en la
        escapada: de ahí salen la cuenta atrás y los tiempos de la compra.
      </p>

      <FormularioFechas
        abierto={formAbierto}
        tripId={escapada.id}
        onCerrar={() => setFormAbierto(false)}
        onGuardado={async () => {
          setFormAbierto(false)
          await refrescar(true)
        }}
      />

      <Confirmar
        abierto={Boolean(borrando)}
        titulo="¿Retirar estas fechas?"
        texto={
          borrando
            ? `Se quitan ${rangoFechas(borrando.start_date, borrando.end_date)} de la votación, con los votos que tengan.`
            : undefined
        }
        textoAceptar="Sí, retirar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------

function FormularioFechas({
  abierto,
  tripId,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  tripId: string
  onCerrar: () => void
  onGuardado: () => Promise<void>
}) {
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limpia = () => {
    setInicio('')
    setFin('')
    setNombre('')
    setNotas('')
    setError(null)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!inicio) {
      setError('Pon al menos la fecha de ida.')
      return
    }
    // Una escapada de un día es válida: ida y vuelta coinciden.
    const vuelta = fin || inicio
    if (vuelta < inicio) {
      setError('La vuelta no puede ser anterior a la ida.')
      return
    }
    setGuardando(true)
    try {
      const { error: err } = await supabase.from('trip_date_options').insert({
        trip_id: tripId,
        start_date: inicio,
        end_date: vuelta,
        label: nombre.trim() || null,
        notes: notas.trim() || null,
        proposed_by: perfil?.id ?? null,
      })
      if (err) throw err
      limpia()
      await onGuardado()
      avisos.ok('Fechas propuestas.')
    } catch (err) {
      // El índice único salta si alguien ya había propuesto ese mismo finde.
      const texto = mensajeError(err)
      setError(
        texto.includes('sin_repetir') || texto.includes('duplicate')
          ? 'Esas fechas ya están propuestas.'
          : texto,
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Proponer fechas"
      descripcion="Un fin de semana concreto. Solo la ida es obligatoria."
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-fechas" cargando={guardando}>
            Proponer
          </Boton>
        </>
      }
    >
      <form id="form-fechas" onSubmit={guardar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Ida" requerido>
            <Entrada type="date" value={inicio} min={hoyISO()} onChange={(e) => setInicio(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Vuelta" ayuda="Si lo dejas vacío, se toma el mismo día.">
            <Entrada type="date" value={fin} min={inicio || hoyISO()} onChange={(e) => setFin(e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Nombre" ayuda="Opcional: «puente de mayo», «finde de la feria»…">
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Puente de mayo" />
        </Campo>
        <Campo etiqueta="Observaciones">
          <Entrada
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="A Marta le pilla de exámenes"
          />
        </Campo>
        {error && (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm text-tierra-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
