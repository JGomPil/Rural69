import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, LockOpen, Trophy, Vote as VotoIcono } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useConsulta } from '../../hooks/useConsulta'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useGrupo } from '../../hooks/useGrupo'
import { mensajeError, supabase } from '../../lib/supabase'
import { euros } from '../../lib/formato'
import { Boton } from '../ui/Boton'
import { Personas } from '../ui/Persona'
import { AvisoError, Cargando, Etiqueta, Tarjeta, Vacio } from '../ui/Varios'
import type { House, Vote } from '../../lib/types'

export function Votacion() {
  const { escapada, participantes, recargar } = useEscapada()
  const { perfil, esAdmin } = useAuth()
  const { perfiles } = useGrupo()
  const avisos = useAvisos()
  const [votando, setVotando] = useState<string | null>(null)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [casas, votos] = await Promise.all([
        supabase.from('houses').select('*').eq('trip_id', escapada.id).order('created_at'),
        supabase.from('votes').select('*').eq('trip_id', escapada.id),
      ])
      if (casas.error) throw casas.error
      if (votos.error) throw votos.error
      return { casas: (casas.data ?? []) as House[], votos: (votos.data ?? []) as Vote[] }
    },
    [escapada.id],
    { realtime: ['votes', 'houses', 'trips'] },
  )

  const resultados = useMemo(() => {
    const casas = datos?.casas ?? []
    const votos = datos?.votos ?? []
    const filas = casas.map((casa) => ({
      casa,
      votos: votos.filter((v) => v.house_id === casa.id),
    }))
    filas.sort((a, b) => b.votos.length - a.votos.length || a.casa.name.localeCompare(b.casa.name))
    const maximo = filas[0]?.votos.length ?? 0
    // Con voto múltiple el porcentaje se mide sobre la GENTE que ha votado,
    // no sobre el número de votos: lo que dice algo es «a 8 de 11 les vale
    // esta», no «esta se lleva el 22 % de los votos emitidos».
    const votantes = new Set(votos.map((v) => v.voter_id)).size
    return { filas, maximo, votantes, total: votos.length }
  }, [datos])

  // En el grupo solo pagan los adultos: los niños no cuentan para repartir el precio.
  const adultos = participantes.filter((m) => !m.is_child).length

  /** Las que he votado yo: de la casa al identificador de mi voto, para poder quitarlo. */
  const misVotos = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const v of datos?.votos ?? []) if (v.voter_id === perfil?.id) mapa.set(v.house_id, v.id)
    return mapa
  }, [datos, perfil?.id])

  const sinVotar = perfiles.filter((p) => !datos?.votos.some((v) => v.voter_id === p.id))

  const votar = async (houseId: string) => {
    if (!perfil) return
    setVotando(houseId)
    try {
      // Se puede votar cuantas valgan: pulsar una que ya tienes votada la
      // quita, y pulsar otra la añade. Ya no se sustituye nada.
      const mío = misVotos.get(houseId)
      if (mío) {
        const { error: err } = await supabase.from('votes').delete().eq('id', mío)
        if (err) throw err
        avisos.info('Voto retirado.')
      } else {
        const { error: err } = await supabase
          .from('votes')
          .insert({ trip_id: escapada.id, house_id: houseId, voter_id: perfil.id })
        if (err) throw err
        avisos.ok('¡Votada!')
      }
      await refrescar(true)
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setVotando(null)
    }
  }

  const cambiarVotacion = async (abierta: boolean) => {
    try {
      const { error: err } = await supabase.from('trips').update({ voting_open: abierta }).eq('id', escapada.id)
      if (err) throw err
      await recargar()
      avisos.ok(abierta ? 'Votación reabierta.' : 'Votación cerrada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const proclamar = async (houseId: string) => {
    try {
      const { error: err } = await supabase.from('trips').update({ chosen_house_id: houseId }).eq('id', escapada.id)
      if (err) throw err
      await recargar()
      avisos.ok('Casa marcada como elegida.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  if (cargando) return <Cargando texto="Cargando votación…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  if ((datos?.casas.length ?? 0) === 0) {
    return (
      <Vacio
        emoji="🗳️"
        titulo="Primero hay que proponer casas"
        texto="Cuando haya al menos dos candidatas, podréis votar."
        accion={
          <Link
            to={`/escapadas/${escapada.id}/casas`}
            className="font-semibold text-bosque-600 underline underline-offset-2"
          >
            Ir a las casas
          </Link>
        }
      />
    )
  }

  const ganadora = resultados.maximo > 0 ? resultados.filas.filter((f) => f.votos.length === resultados.maximo) : []
  const hayEmpate = ganadora.length > 1

  return (
    <div className="space-y-4">
      <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg text-bosque-800">
            <VotoIcono size={19} />
            {escapada.voting_open ? 'Votación abierta' : 'Votación cerrada'}
          </h2>
          <p className="mt-0.5 text-sm text-suave">
            {resultados.votantes === 0
              ? 'Nadie ha votado todavía'
              : `Han votado ${resultados.votantes} de ${perfiles.length}, con ${resultados.total} ${
                  resultados.total === 1 ? 'voto' : 'votos'
                } en total`}
          </p>
        </div>
        {esAdmin && (
          <Boton
            variante={escapada.voting_open ? 'secundario' : 'primario'}
            onClick={() => void cambiarVotacion(!escapada.voting_open)}
          >
            {escapada.voting_open ? (
              <>
                <Lock size={16} /> Cerrar votación
              </>
            ) : (
              <>
                <LockOpen size={16} /> Reabrir votación
              </>
            )}
          </Boton>
        )}
      </Tarjeta>

      {!escapada.voting_open && (
        <p className="rounded-2xl border border-arena bg-beige px-4 py-3 text-sm text-tenue">
          La votación está cerrada: ya no se pueden cambiar los votos.
        </p>
      )}

      {resultados.maximo > 0 && (
        <Tarjeta className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base text-bosque-800">
            <Trophy size={17} className="text-tierra-500" />
            {hayEmpate ? `Empate entre ${ganadora.length} casas` : `Va ganando: ${ganadora[0].casa.name}`}
          </h3>
          <div className="space-y-2.5">
            {resultados.filas.map(({ casa, votos }) => {
              const pct = resultados.votantes > 0 ? Math.round((votos.length / resultados.votantes) * 100) : 0
              const esGanadora = votos.length === resultados.maximo && votos.length > 0
              return (
                <div key={casa.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className={`truncate font-semibold ${esGanadora ? 'text-bosque-700' : 'text-tenue'}`}>
                      {casa.name}
                      {escapada.chosen_house_id === casa.id && ' 🏆'}
                    </span>
                    <span className="shrink-0 font-bold text-suave">
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
                    <Personas
                      className="mt-1.5 text-xs text-suave"
                      perfilIds={votos.map((v) => v.voter_id)}
                    />
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
        {resultados.filas.map(({ casa, votos }) => {
          const esMiVoto = misVotos.has(casa.id)
          const esGanadora = votos.length === resultados.maximo && votos.length > 0
          return (
            <Tarjeta
              key={casa.id}
              className={`flex gap-3 overflow-hidden p-0 ${esMiVoto ? 'ring-2 ring-bosque-500' : ''}`}
            >
              {casa.cover_image_url && (
                <img src={casa.cover_image_url} alt="" className="w-24 shrink-0 object-cover" loading="lazy" />
              )}
              {/* Sin foto no hay nada que separe el texto del borde, así que el
                  relleno izquierdo lo pone esta columna. */}
              <div
                className={`flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-3 ${
                  casa.cover_image_url ? '' : 'pl-4'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display truncate text-base text-bosque-800">{casa.name}</h3>
                  {esGanadora && (
                    <Etiqueta tono="oliva">
                      {votos.length} {votos.length === 1 ? 'voto' : 'votos'}
                    </Etiqueta>
                  )}
                </div>
                <p className="truncate text-sm text-suave">
                  {[casa.town, casa.province].filter(Boolean).join(', ') || '—'}
                  {casa.total_price != null &&
                    (adultos > 0
                      ? ` · ${euros(casa.total_price / adultos)}/adulto`
                      : ` · ${euros(casa.total_price)}`)}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <Boton
                    tamanyo="sm"
                    variante={esMiVoto ? 'primario' : 'secundario'}
                    disabled={!escapada.voting_open}
                    cargando={votando === casa.id}
                    onClick={() => void votar(casa.id)}
                  >
                    {esMiVoto ? (
                      <>
                        <Check size={15} /> Votada
                      </>
                    ) : (
                      'Votar esta'
                    )}
                  </Boton>
                  {esAdmin && escapada.chosen_house_id !== casa.id && (
                    <button
                      type="button"
                      onClick={() => void proclamar(casa.id)}
                      className="text-xs font-semibold text-suave hover:text-bosque-600 hover:underline"
                    >
                      Marcar como elegida
                    </button>
                  )}
                </div>
              </div>
            </Tarjeta>
          )
        })}
      </div>

      <p className="text-center text-xs text-suave">
        Vota <strong>todas las casas que te valgan</strong>, no solo una: así sale la que le gusta a más gente.
        Puedes quitarlas mientras la votación esté abierta.
      </p>
    </div>
  )
}
