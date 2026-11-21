import { useMemo, useState } from 'react'
import { Check, ChevronDown, Users, X } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useConsulta } from '../../hooks/useConsulta'
import { useGrupo } from '../../hooks/useGrupo'
import { faltaPasarSql, mensajeError, supabase } from '../../lib/supabase'
import { personasEquivalentes } from '../../lib/cantidades'
import { numero } from '../../lib/formato'
import { Persona } from '../ui/Persona'
import { Tarjeta } from '../ui/Varios'
import type { Member } from '../../lib/types'

/**
 * «¿Quién viene?», contestado por cada cual.
 *
 * Antes lo ponía un administrador editando la escapada: una persona
 * persiguiendo por WhatsApp a las otras diez. Y de ese número salen las
 * cantidades de la compra y el precio por adulto, así que mientras nadie
 * lo actualizaba, la compra mentía.
 *
 * Hay tres estados, no dos: viene, no puede y **todavía no ha dicho
 * nada**. El tercero es el que permite decir «faltan cuatro por
 * contestar» en vez de dar por hecho que no vienen (ver
 * `supabase/17_quien_viene.sql`).
 *
 * Cada cual contesta por su casa —su pareja y sus niños—, que es como se
 * decide de verdad: nadie va por su cuenta.
 */
export function QuienViene() {
  const { escapada, personas, recargar } = useEscapada()
  const { miembros, hogares } = useGrupo()
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const [guardando, setGuardando] = useState<string | null>(null)
  const [porOtros, setPorOtros] = useState(false)

  const { datos, refrescar } = useConsulta(
    async () => {
      const { data, error } = await supabase
        .from('trip_participants')
        .select('*')
        .eq('trip_id', escapada.id)
      if (error) throw error
      // Antes de `17_quien_viene.sql` no había columna, y tener fila
      // significaba venir.
      return ((data ?? []) as { member_id: string; attending?: boolean }[]).map((r) => ({
        member_id: r.member_id,
        attending: r.attending ?? true,
      }))
    },
    [escapada.id],
    { realtime: ['trip_participants'] },
  )

  const respuestas = useMemo(() => new Map((datos ?? []).map((r) => [r.member_id, r.attending])), [datos])

  const activos = useMemo(() => miembros.filter((m) => m.active), [miembros])

  // Mi casa: yo y quien comparta unidad familiar conmigo (pareja y niños).
  const miCasa = useMemo(() => {
    const yo = miembros.find((m) => m.id === perfil?.member_id)
    if (!yo) return [] as Member[]
    return activos.filter((m) => m.id === yo.id || (yo.household_id && m.household_id === yo.household_id))
  }, [activos, miembros, perfil?.member_id])

  // Las demás casas, para poder contestar por quien no tiene cuenta —que
  // en este grupo son casi todos— o por quien no está mirando el móvil.
  // Lo normal sigue siendo que conteste cada casa; por eso va plegado.
  const otrasCasas = useMemo(() => {
    const mios = new Set(miCasa.map((m) => m.id))
    const porCasa = new Map<string, Member[]>()
    for (const m of activos) {
      if (mios.has(m.id)) continue
      const casa = m.household_id ?? 'sueltos'
      porCasa.set(casa, [...(porCasa.get(casa) ?? []), m])
    }
    return [...porCasa.entries()].map(([id, gente]) => ({
      id,
      nombre: hogares.find((h) => h.id === id)?.name ?? 'Sin casa',
      gente,
    }))
  }, [activos, miCasa, hogares])

  const vienen = activos.filter((m) => respuestas.get(m.id) === true)
  const noPueden = activos.filter((m) => respuestas.get(m.id) === false)
  const sinContestar = activos.filter((m) => !respuestas.has(m.id))

  const contesta = async (miembro: Member, viene: boolean) => {
    setGuardando(miembro.id)
    try {
      const { error } = await supabase
        .from('trip_participants')
        .upsert(
          { trip_id: escapada.id, member_id: miembro.id, attending: viene },
          { onConflict: 'trip_id,member_id' },
        )
      if (error) throw error
      await Promise.all([refrescar(true), recargar()])
    } catch (e) {
      avisos.error(faltaPasarSql(e) ?? mensajeError(e))
    } finally {
      setGuardando(null)
    }
  }

  return (
    <Tarjeta className="p-4">
      <h3 className="flex items-center gap-2 text-base text-bosque-800">
        <Users size={17} /> ¿Quién viene?
      </h3>

      {miCasa.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {miCasa.map((m) => (
            <FilaContesta
              key={m.id}
              miembro={m}
              respuesta={respuestas.get(m.id)}
              cargando={guardando === m.id}
              onContesta={(viene) => void contesta(m, viene)}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-suave">
          Tu cuenta no está enlazada con ningún integrante, así que no puedes contestar desde aquí. Un
          administrador lo arregla en <strong>Ajustes → Usuarios</strong>.
        </p>
      )}

      {otrasCasas.length > 0 && (
        <div className="mt-3 border-t border-arena pt-2">
          <button
            type="button"
            onClick={() => setPorOtros((v) => !v)}
            aria-expanded={porOtros}
            className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm font-semibold text-bosque-700"
          >
            Contestar por otra casa
            <ChevronDown
              size={16}
              className={`shrink-0 text-tenue transition-transform ${porOtros ? 'rotate-180' : ''}`}
            />
          </button>
          {porOtros && (
            <div className="mt-1 space-y-3">
              <p className="text-xs text-suave">
                Lo suyo es que conteste cada casa desde su móvil, pero no todo el mundo tiene cuenta.
                Aquí puedes contestar por ellos; lo verá todo el grupo igual.
              </p>
              {otrasCasas.map((casa) => (
                <div key={casa.id}>
                  <p className="mb-1 text-xs font-semibold text-tenue">{casa.nombre}</p>
                  <ul className="space-y-1.5">
                    {casa.gente.map((m) => (
                      <FilaContesta
                        key={m.id}
                        miembro={m}
                        respuesta={respuestas.get(m.id)}
                        cargando={guardando === m.id}
                        onContesta={(viene) => void contesta(m, viene)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 space-y-1.5 border-t border-arena pt-3 text-xs">
        <Fila etiqueta="Vienen" gente={vienen} tono="text-bosque-700" />
        {noPueden.length > 0 && <Fila etiqueta="No pueden" gente={noPueden} tono="text-tierra-600" apagado />}
        {sinContestar.length > 0 && (
          <Fila etiqueta="Sin contestar" gente={sinContestar} tono="text-suave" apagado />
        )}
      </div>

      <p className="mt-3 text-xs text-suave">
        {numero(personas || personasEquivalentes(vienen))} personas equivalentes para calcular la compra.
      </p>
    </Tarjeta>
  )
}

/** Una persona y sus dos botones. El mismo para tu casa y para las demás. */
function FilaContesta({
  miembro,
  respuesta,
  cargando,
  onContesta,
}: {
  miembro: Member
  respuesta: boolean | undefined
  cargando: boolean
  onContesta: (viene: boolean) => void
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tenue">
        <Persona miembroId={miembro.id} />
        {miembro.is_child && ' 🧒'}
      </span>
      <span className="flex shrink-0 rounded-xl bg-beige p-1">
        <BotonSiNo activo={respuesta === true} cargando={cargando} onClick={() => onContesta(true)} tono="si">
          <Check size={15} /> Sí
        </BotonSiNo>
        <BotonSiNo activo={respuesta === false} cargando={cargando} onClick={() => onContesta(false)} tono="no">
          <X size={15} /> No
        </BotonSiNo>
      </span>
    </li>
  )
}

function Fila({
  etiqueta,
  gente,
  tono,
  apagado = false,
}: {
  etiqueta: string
  gente: Member[]
  tono: string
  apagado?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`shrink-0 font-bold ${tono}`}>
        {etiqueta} ({gente.length})
      </span>
      <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${apagado ? 'opacity-60 grayscale' : ''}`}>
        {gente.map((m) => (
          <Persona key={m.id} miembroId={m.id} />
        ))}
      </span>
    </div>
  )
}

function BotonSiNo({
  activo,
  cargando,
  onClick,
  tono,
  children,
}: {
  activo: boolean
  cargando: boolean
  onClick: () => void
  tono: 'si' | 'no'
  children: React.ReactNode
}) {
  const encendido = tono === 'si' ? 'bg-bosque-600 text-tinta-fuerte shadow-sm' : 'bg-tierra-600 text-tinta-fuerte shadow-sm'
  return (
    <button
      type="button"
      disabled={cargando}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-bold transition active:scale-95 disabled:opacity-50 ${
        activo ? encendido : 'text-suave hover:bg-superficie'
      }`}
    >
      {children}
    </button>
  )
}
