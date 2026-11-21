import { useMemo, useState } from 'react'
import { Backpack, Check, Plus, Trash2 } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useConsulta } from '../../hooks/useConsulta'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { esFalloDeRed, faltaPasarSql, mensajeError, supabase } from '../../lib/supabase'
import { encola } from '../../lib/cola'
import { AvisoError, Cargando, Progreso, Tarjeta, Vacio } from '../ui/Varios'
import { Boton, BotonIcono } from '../ui/Boton'
import { Entrada, Lista } from '../ui/Campos'
import { Persona } from '../ui/Persona'
import type { Member, TripPacking } from '../../lib/types'

/**
 * Lo común: lo que se lleva de casa y nunca está en ninguna parte.
 *
 * Se llamaba «equipaje» y el nombre engañaba: esto no es la maleta de
 * cada uno, es lo que hace falta para la casa y que alguien tiene que
 * acordarse de meter en el coche.
 *
 * Los sacos, las toallas, el altavoz, la paellera, el desayuno que lleva cada
 * uno. Se acuerda por WhatsApp y se olvida, y siempre acaba faltando algo o
 * yendo por duplicado. Aquí se ve de un golpe lo que no lleva nadie, que es
 * para lo que sirve una lista así.
 */
const SUGERENCIAS = [
  'Sacos o sábanas',
  'Toallas',
  'Altavoz',
  'Cargadores',
  'Botas de monte',
  'Linterna',
  'Juegos de mesa',
  'Paellera',
  'Cafetera',
  'Botiquín',
]

export function Equipaje() {
  const { escapada, participantes } = useEscapada()
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const [nuevo, setNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const { datos, cargando, error, refrescar, setDatos } = useConsulta(
    async () => {
      const { data, error: err } = await supabase
        .from('trip_packing')
        .select('*')
        .eq('trip_id', escapada.id)
        .order('sort_order')
        .order('created_at')
      if (err) throw new Error(faltaPasarSql(err) ?? mensajeError(err))
      return (data ?? []) as TripPacking[]
    },
    [escapada.id],
    { realtime: ['trip_packing'], copia: `equipaje:${escapada.id}` },
  )

  const lista = useMemo(() => datos ?? [], [datos])

  // Por persona, y los que no lleva nadie delante del todo: son los que
  // hay que resolver.
  const porPersona = useMemo(() => {
    const grupos = new Map<string, TripPacking[]>()
    for (const cosa of lista) {
      const clave = cosa.member_id ?? ''
      const previos = grupos.get(clave)
      if (previos) previos.push(cosa)
      else grupos.set(clave, [cosa])
    }
    const orden = [...grupos.entries()].sort(([a], [b]) => {
      if (a === '') return -1
      if (b === '') return 1
      const na = participantes.find((m) => m.id === a)?.name ?? ''
      const nb = participantes.find((m) => m.id === b)?.name ?? ''
      return na.localeCompare(nb, 'es')
    })
    return orden
  }, [lista, participantes])

  const anyade = async (nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio) return
    if (lista.some((c) => c.name.trim().toLowerCase() === limpio.toLowerCase())) {
      avisos.info(`«${limpio}» ya está en la lista.`)
      return
    }
    setGuardando(true)
    try {
      const { error: err } = await supabase.from('trip_packing').insert({
        trip_id: escapada.id,
        name: limpio,
        created_by: perfil?.id ?? null,
        sort_order: (lista.at(-1)?.sort_order ?? 0) + 10,
      })
      if (err) throw err
      setNuevo('')
      await refrescar(true)
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const cambia = async (cosa: TripPacking, parche: Partial<TripPacking>) => {
    // Se pinta antes de preguntar: en la casa no hay línea y esperar al
    // servidor para ver el cambio sería esperar sentado.
    setDatos((prev) => (prev ?? []).map((c) => (c.id === cosa.id ? { ...c, ...parche } : c)))
    const { error: err } = await supabase.from('trip_packing').update(parche).eq('id', cosa.id)
    if (!err) {
      await refrescar(true)
      return
    }
    if (esFalloDeRed(err)) {
      encola('trip_packing', cosa.id, parche)
      return
    }
    avisos.error(mensajeError(err))
    await refrescar(true)
  }

  const quita = async (cosa: TripPacking) => {
    const { error: err } = await supabase.from('trip_packing').delete().eq('id', cosa.id)
    if (err) avisos.error(mensajeError(err))
    else await refrescar(true)
  }

  if (cargando) return <Cargando texto="Cargando lo común…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  const sinDuenyo = lista.filter((c) => !c.member_id).length
  const listos = lista.filter((c) => c.done).length
  const pendientes = SUGERENCIAS.filter(
    (s) => !lista.some((c) => c.name.trim().toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display flex items-center gap-2 text-xl text-bosque-800">
          <Backpack size={21} /> Qué lleva cada uno
        </h2>
        <p className="mt-0.5 text-sm text-suave">
          Lo que va de casa y no se compra allí. Sin nombre al lado quiere decir que todavía no lo lleva nadie.
        </p>
      </header>

      {lista.length > 0 && (
        <Tarjeta className="space-y-3 p-4">
          <Progreso valor={listos} total={lista.length} etiqueta={`${listos} de ${lista.length} preparados`} />
          {sinDuenyo > 0 && (
            <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
              {sinDuenyo === 1 ? 'Queda 1 cosa sin dueño.' : `Quedan ${sinDuenyo} cosas sin dueño.`} Elegid quién
              las lleva antes de salir.
            </p>
          )}
        </Tarjeta>
      )}

      <Tarjeta className="space-y-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void anyade(nuevo)
          }}
          className="flex gap-2"
        >
          <Entrada
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            placeholder="Ej.: saco de dormir"
            aria-label="Qué más hay que llevar"
          />
          <Boton type="submit" disabled={!nuevo.trim()} cargando={guardando}>
            <Plus size={17} /> Añadir
          </Boton>
        </form>

        {pendientes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendientes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void anyade(s)}
                className="rounded-full border border-arena bg-superficie px-3 py-1 text-xs font-semibold text-tenue transition hover:bg-beige"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </Tarjeta>

      {lista.length === 0 ? (
        <Vacio
          emoji="🎒"
          titulo="Todavía no hay nada apuntado"
          texto="Apunta lo que haya que llevar de casa y repartidlo. Arriba tienes las cosas de siempre, a un toque."
        />
      ) : (
        <div className="space-y-4">
          {porPersona.map(([idMiembro, cosas]) => (
            <section key={idMiembro || 'nadie'}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-bosque-800">
                {idMiembro ? (
                  <Persona miembroId={idMiembro} />
                ) : (
                  <span className="text-tierra-700">🙋 Sin dueño ({cosas.length})</span>
                )}
              </h3>
              <Tarjeta className="divide-y divide-arena">
                {cosas.map((cosa) => (
                  <Fila
                    key={cosa.id}
                    cosa={cosa}
                    participantes={participantes}
                    onCambia={(p) => void cambia(cosa, p)}
                    onQuita={() => void quita(cosa)}
                  />
                ))}
              </Tarjeta>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Fila({
  cosa,
  participantes,
  onCambia,
  onQuita,
}: {
  cosa: TripPacking
  participantes: Member[]
  onCambia: (parche: Partial<TripPacking>) => void
  onQuita: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={() => onCambia({ done: !cosa.done })}
        aria-label={cosa.done ? `Marcar «${cosa.name}» como pendiente` : `Marcar «${cosa.name}» como preparado`}
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg border transition ${
          cosa.done
            ? 'border-bosque-600 bg-bosque-600 text-tinta-fuerte'
            : 'border-arena bg-superficie hover:border-bosque-400'
        }`}
      >
        {cosa.done && <Check size={15} />}
      </button>

      <span className={`min-w-0 flex-1 text-sm font-semibold ${cosa.done ? 'text-suave line-through' : 'text-bosque-800'}`}>
        {cosa.name}
      </span>

      <Lista
        value={cosa.member_id ?? ''}
        onChange={(e) => onCambia({ member_id: e.target.value || null })}
        aria-label={`Quién lleva ${cosa.name}`}
        className="w-36 shrink-0 text-xs"
      >
        <option value="">Nadie aún</option>
        {participantes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Lista>

      <BotonIcono etiqueta={`Quitar ${cosa.name}`} tono="peligro" onClick={onQuita}>
        <Trash2 size={16} />
      </BotonIcono>
    </div>
  )
}
