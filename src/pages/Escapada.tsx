import { useCallback, useState } from 'react'
import { NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Pencil, Trash2, Users } from 'lucide-react'
import { BotonIcono } from '../components/ui/Boton'
import { AvisoError, Cargando, EtiquetaEstado, Vacio } from '../components/ui/Varios'
import { Confirmar } from '../components/ui/Modal'
import { FormularioEscapada } from '../components/trip/FormularioEscapada'
import { useAuth } from '../hooks/useAuth'
import { useAvisos } from '../hooks/useAvisos'
import { useConsulta } from '../hooks/useConsulta'
import { useGrupo } from '../hooks/useGrupo'
import { useSinLeer } from '../hooks/useSinLeer'
import { mensajeError, supabase } from '../lib/supabase'
import { personasEquivalentes } from '../lib/cantidades'
import { cuentaAtras, numero, rangoFechas } from '../lib/formato'
import type { Member, Trip } from '../lib/types'

export interface ContextoEscapada {
  escapada: Trip
  participantes: Member[]
  /** Personas equivalentes (los niños cuentan por su factor de consumo). */
  personas: number
  recargar: () => Promise<void>
}

export function useEscapada() {
  return useOutletContext<ContextoEscapada>()
}

const PESTANYAS = [
  { a: '', texto: 'Resumen' },
  { a: 'casas', texto: 'Casas' },
  { a: 'votacion', texto: 'Votación' },
  { a: 'compra', texto: 'Compra' },
  { a: 'sobrantes', texto: 'Sobrantes' },
  { a: 'chat', texto: 'Chat' },
]

export function Escapada() {
  const { id } = useParams<{ id: string }>()
  const { miembros, escapadas, refrescar: refrescarGrupo } = useGrupo()
  const { esAdmin } = useAuth()
  const avisos = useAvisos()
  const navegar = useNavigate()
  const [editando, setEditando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [enCurso, setEnCurso] = useState(false)
  const sinLeer = useSinLeer(id)

  const {
    datos,
    cargando,
    error,
    refrescar: recargarDatos,
  } = useConsulta(
    async () => {
      if (!id) return null
      const [t, p] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).maybeSingle(),
        supabase.from('trip_participants').select('member_id').eq('trip_id', id),
      ])
      if (t.error) throw t.error
      if (p.error) throw p.error
      return {
        escapada: (t.data as Trip | null) ?? null,
        idsParticipantes: (p.data ?? []).map((r) => r.member_id as string),
      }
    },
    [id],
    { realtime: ['trips', 'trip_participants'] },
  )

  const recargar = useCallback(async () => {
    await Promise.all([recargarDatos(true), refrescarGrupo()])
  }, [recargarDatos, refrescarGrupo])

  const borrar = async () => {
    if (!id) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('trips').delete().eq('id', id)
      if (err) throw err
      await refrescarGrupo()
      avisos.ok('Escapada eliminada.')
      navegar('/escapadas', { replace: true })
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando escapada…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void recargarDatos()} />

  const escapada = datos?.escapada
  if (!escapada) {
    return (
      <Vacio
        emoji="🧐"
        titulo="No encontramos esta escapada"
        texto="Puede que se haya eliminado."
        accion={
          <button type="button" onClick={() => navegar('/escapadas')} className="font-semibold text-bosque-600 underline">
            Ver todas las escapadas
          </button>
        }
      />
    )
  }

  const participantes = miembros.filter((m) => datos.idsParticipantes.includes(m.id))
  const personas = personasEquivalentes(participantes)
  const cuenta = escapada.status === 'planificacion' || escapada.status === 'confirmada' ? cuentaAtras(escapada.start_date) : null
  const otras = escapadas.filter((t) => t.id !== escapada.id)

  const contexto: ContextoEscapada = { escapada, participantes, personas, recargar }

  return (
    <div className="space-y-5">
      <header className="animate-sube">
        <div className="flex items-center gap-1">
          <BotonIcono etiqueta="Volver" onClick={() => navegar('/escapadas')}>
            <ArrowLeft size={20} />
          </BotonIcono>
          {otras.length > 0 && (
            <select
              aria-label="Cambiar de escapada"
              value={escapada.id}
              onChange={(e) => navegar(`/escapadas/${e.target.value}`)}
              className="min-w-0 flex-1 truncate rounded-xl border border-arena bg-superficie px-2.5 py-1.5 text-xs font-semibold text-carbon/70 sm:max-w-xs"
            >
              <option value={escapada.id}>Cambiar de escapada…</option>
              {otras.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex items-center">
            {esAdmin && (
              <>
                <BotonIcono etiqueta="Editar escapada" onClick={() => setEditando(true)}>
                  <Pencil size={18} />
                </BotonIcono>
                <BotonIcono etiqueta="Eliminar escapada" tono="peligro" onClick={() => setBorrando(true)}>
                  <Trash2 size={18} />
                </BotonIcono>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl text-bosque-800 sm:text-3xl">{escapada.title}</h1>
          <EtiquetaEstado estado={escapada.status} />
          {cuenta && (
            <span className="rounded-full bg-tierra-500 px-2.5 py-0.5 text-xs font-bold text-tinta-fuerte">{cuenta}</span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-carbon/65">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} /> {rangoFechas(escapada.start_date, escapada.end_date)}
          </span>
          {(escapada.town || escapada.province) && (
            <span className="flex items-center gap-1.5">
              <MapPin size={15} /> {[escapada.town, escapada.province].filter(Boolean).join(', ')}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={15} /> {participantes.length} personas
            <span className="text-carbon/40">({numero(personas)} equivalentes)</span>
          </span>
        </div>
      </header>

      <nav className="scroll-oculto -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {PESTANYAS.map((p) => (
          <NavLink
            key={p.texto}
            to={p.a ? `/escapadas/${escapada.id}/${p.a}` : `/escapadas/${escapada.id}`}
            end={!p.a}
            className={({ isActive }) =>
              `rounded-2xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
                isActive ? 'bg-bosque-600 text-tinta-fuerte shadow-sm' : 'bg-superficie text-carbon/60 hover:bg-beige'
              }`
            }
          >
            {p.texto}
            {p.a === 'chat' && sinLeer > 0 && (
              <span className="ml-1.5 inline-flex min-w-5 justify-center rounded-full bg-tierra-500 px-1.5 text-[11px] leading-5 font-bold text-tinta-fuerte">
                {sinLeer > 99 ? '99+' : sinLeer}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet context={contexto} />

      <FormularioEscapada
        abierto={editando}
        onCerrar={() => setEditando(false)}
        escapada={escapada}
        onGuardada={() => void recargar()}
      />
      <Confirmar
        abierto={borrando}
        titulo={`¿Eliminar «${escapada.title}»?`}
        texto="Se borrarán también sus casas propuestas, votos y lista de la compra. Los sobrantes que ya estén en la despensa se conservan."
        textoAceptar="Sí, eliminar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(false)}
      />
    </div>
  )
}
