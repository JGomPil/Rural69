import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, MapPin, Plus, Users } from 'lucide-react'
import { Boton } from '../components/ui/Boton'
import { AvisoError, Cargando, EtiquetaEstado, Tarjeta, Vacio } from '../components/ui/Varios'
import { FormularioEscapada } from '../components/trip/FormularioEscapada'
import { useGrupo } from '../hooks/useGrupo'
import { useAuth } from '../hooks/useAuth'
import { useConsulta } from '../hooks/useConsulta'
import { supabase } from '../lib/supabase'
import { cuentaAtras, rangoFechas } from '../lib/formato'
import type { Trip } from '../lib/types'

type Filtro = 'activas' | 'pasadas' | 'todas'

export function Escapadas() {
  const { escapadas, cargando, error, refrescar } = useGrupo()
  const { esAdmin } = useAuth()
  const navegar = useNavigate()
  const [filtro, setFiltro] = useState<Filtro>('activas')
  const [formAbierto, setFormAbierto] = useState(false)

  // Número de participantes de cada escapada (una sola consulta).
  const { datos: conteos } = useConsulta<Record<string, number>>(
    async () => {
      const { data, error: err } = await supabase.from('trip_participants').select('trip_id')
      if (err) throw err
      const mapa: Record<string, number> = {}
      for (const fila of data ?? []) mapa[fila.trip_id as string] = (mapa[fila.trip_id as string] ?? 0) + 1
      return mapa
    },
    [],
    { realtime: ['trip_participants'] },
  )

  const visibles = useMemo(() => {
    if (filtro === 'todas') return escapadas
    if (filtro === 'activas')
      return escapadas.filter((t) => t.status === 'planificacion' || t.status === 'confirmada')
    return escapadas.filter((t) => t.status === 'realizada' || t.status === 'archivada')
  }, [escapadas, filtro])

  if (cargando) return <Cargando texto="Cargando escapadas…" />

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-bosque-800 sm:text-3xl">Escapadas</h1>
          <p className="mt-0.5 text-sm text-suave">
            {escapadas.length === 1 ? '1 escapada guardada' : `${escapadas.length} escapadas guardadas`}
          </p>
        </div>
        {esAdmin && (
          <Boton onClick={() => setFormAbierto(true)}>
            <Plus size={18} /> Nueva escapada
          </Boton>
        )}
      </header>

      {error && <AvisoError texto={error} onReintentar={() => void refrescar()} />}

      <div className="scroll-oculto flex gap-1.5 overflow-x-auto rounded-2xl bg-beige p-1">
        {(
          [
            ['activas', 'En marcha'],
            ['pasadas', 'Anteriores'],
            ['todas', 'Todas'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
              filtro === valor ? 'bg-superficie text-bosque-700 shadow-sm' : 'text-suave'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Vacio
          emoji="🏡"
          titulo={filtro === 'pasadas' ? 'Aún no hay escapadas terminadas' : 'No hay ninguna escapada en marcha'}
          texto={
            esAdmin
              ? 'Crea la próxima y empezad a proponer casas rurales.'
              : 'Cuando el administrador cree la próxima escapada, aparecerá aquí.'
          }
          accion={
            esAdmin ? (
              <Boton onClick={() => setFormAbierto(true)}>
                <Plus size={18} /> Crear escapada
              </Boton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map((t) => (
            <TarjetaEscapada
              key={t.id}
              escapada={t}
              participantes={conteos?.[t.id] ?? 0}
              onAbrir={() => navegar(`/escapadas/${t.id}`)}
            />
          ))}
        </div>
      )}

      <FormularioEscapada
        abierto={formAbierto}
        onCerrar={() => setFormAbierto(false)}
        onGuardada={(id) => navegar(`/escapadas/${id}`)}
      />
    </div>
  )
}

function TarjetaEscapada({
  escapada,
  participantes,
  onAbrir,
}: {
  escapada: Trip
  participantes: number
  onAbrir: () => void
}) {
  const cuenta = escapada.status !== 'realizada' && escapada.status !== 'archivada' ? cuentaAtras(escapada.start_date) : null
  return (
    <Tarjeta onClick={onAbrir} className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg leading-tight text-bosque-800">{escapada.title}</h3>
        <ChevronRight size={18} className="mt-1 shrink-0 text-carbon/25" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tenue">
        <span className="flex items-center gap-1">
          <CalendarDays size={14} /> {rangoFechas(escapada.start_date, escapada.end_date)}
        </span>
        {(escapada.town || escapada.province) && (
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {[escapada.town, escapada.province].filter(Boolean).join(', ')}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={14} /> {participantes}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EtiquetaEstado estado={escapada.status} />
        {cuenta && (
          <span className="rounded-full bg-tierra-600 px-2.5 py-0.5 text-xs font-bold text-tinta-fuerte">{cuenta}</span>
        )}
      </div>
    </Tarjeta>
  )
}
