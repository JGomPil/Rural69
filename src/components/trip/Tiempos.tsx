import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useAvisos } from '../../hooks/useAvisos'
import { mensajeError, supabase } from '../../lib/supabase'
import { fecha } from '../../lib/formato'
import { Boton, BotonIcono } from '../ui/Boton'
import { Campo, Entrada, Lista } from '../ui/Campos'
import { Confirmar, Modal } from '../ui/Modal'
import { Persona } from '../ui/Persona'
import { Etiqueta } from '../ui/Varios'
import type { Member, TipoTiempo, Trip, TripMeal } from '../../lib/types'

export const TIPOS: { valor: TipoTiempo; texto: string; emoji: string }[] = [
  { valor: 'desayuno', texto: 'Desayuno', emoji: '☕' },
  { valor: 'comida', texto: 'Comida', emoji: '🍽️' },
  { valor: 'merienda', texto: 'Merienda', emoji: '🍪' },
  { valor: 'cena', texto: 'Cena', emoji: '🌙' },
  { valor: 'picoteo', texto: 'Picoteo', emoji: '🫒' },
  { valor: 'bebida', texto: 'Bebida', emoji: '🍷' },
  { valor: 'otro', texto: 'Otro', emoji: '🧺' },
]

export function emojiTiempo(kind: TipoTiempo): string {
  return TIPOS.find((t) => t.valor === kind)?.emoji ?? '🧺'
}

/** `2026-03-14` → `viernes` */
function diaSemana(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-ES', { weekday: 'long' })
}

/** Los días de la escapada, de la primera fecha a la última. */
function diasDe(escapada: Trip): string[] {
  if (!escapada.start_date) return []
  const fin = escapada.end_date ?? escapada.start_date
  const dias: string[] = []
  const d = new Date(`${escapada.start_date}T12:00:00`)
  const ultimo = new Date(`${fin}T12:00:00`)
  if (Number.isNaN(d.getTime()) || Number.isNaN(ultimo.getTime())) return []
  while (d <= ultimo && dias.length < 31) {
    dias.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dias
}

// =====================================================================
// Diálogo de gestión
// =====================================================================
export function DialogoTiempos({
  abierto,
  onCerrar,
  escapada,
  tiempos,
  participantes,
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  escapada: Trip
  tiempos: TripMeal[]
  participantes: Member[]
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [editando, setEditando] = useState<TripMeal | null>(null)
  const [creando, setCreando] = useState(false)
  const [borrando, setBorrando] = useState<TripMeal | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  const dias = useMemo(() => diasDe(escapada), [escapada])

  /** Crea desayuno, comida y cena de cada día, saltándose los que ya estén. */
  const generar = async () => {
    if (dias.length === 0) {
      avisos.error('La escapada no tiene fechas todavía. Ponlas y vuelve a intentarlo.')
      return
    }
    setEnCurso(true)
    try {
      const existentes = new Set(tiempos.map((t) => `${t.day ?? ''}|${t.kind}`))
      const nuevos: Partial<TripMeal>[] = []
      let orden = tiempos.length * 10

      dias.forEach((dia, i) => {
        const esUltimo = i === dias.length - 1
        // El primer día se llega para comer o cenar, y el último se va después
        // de comer: generar los tres tiempos de todos los días sobra siempre.
        const tipos: TipoTiempo[] =
          dias.length === 1
            ? ['comida', 'cena']
            : i === 0
              ? ['comida', 'cena']
              : esUltimo
                ? ['desayuno', 'comida']
                : ['desayuno', 'comida', 'cena']

        for (const kind of tipos) {
          if (existentes.has(`${dia}|${kind}`)) continue
          const nombreTipo = TIPOS.find((t) => t.valor === kind)!.texto
          const dia_ = diaSemana(dia)
          nuevos.push({
            trip_id: escapada.id,
            name: dia_ ? `${nombreTipo} del ${dia_}` : nombreTipo,
            day: dia,
            kind,
            sort_order: (orden += 10),
          })
        }
      })

      if (nuevos.length === 0) {
        avisos.info('Ya estaban creados todos los tiempos de estas fechas.')
        return
      }
      const { error } = await supabase.from('trip_meals').insert(nuevos)
      if (error) throw error
      onHecho()
      avisos.ok(`${nuevos.length} tiempos creados.`)
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
    }
  }

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error } = await supabase.from('trip_meals').delete().eq('id', borrando.id)
      if (error) throw error
      onHecho()
      avisos.ok('Tiempo eliminado. Sus productos se quedan en la compra común.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  return (
    <>
      <Modal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo="Tiempos de la escapada"
        descripcion="Cada comida y cena por separado, para repartir la compra."
        pie={
          <>
            <Boton variante="secundario" onClick={onCerrar}>
              Cerrar
            </Boton>
            <Boton onClick={() => setCreando(true)}>
              <Plus size={16} /> Nuevo tiempo
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          {tiempos.length === 0 ? (
            <div className="rounded-2xl border border-arena bg-beige px-4 py-5 text-center">
              <p className="text-sm text-tenue">
                Todavía no hay tiempos. Puedo crearlos a partir de las fechas de la escapada y luego los
                retocas.
              </p>
              <Boton className="mt-3" onClick={() => void generar()} cargando={enCurso} disabled={dias.length === 0}>
                <Sparkles size={16} /> Crear desde las fechas
              </Boton>
              {dias.length === 0 && (
                <p className="mt-2 text-xs text-tierra-600">La escapada no tiene fechas todavía.</p>
              )}
            </div>
          ) : (
            <>
              <ul className="divide-y divide-arena overflow-hidden rounded-2xl border border-arena bg-superficie">
                {tiempos.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="text-lg" aria-hidden>
                      {emojiTiempo(t.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-bosque-800">{t.name}</span>
                      <span className="block truncate text-xs text-suave">
                        {t.day ? fecha(t.day) : 'Sin día'}
                        {t.notes && ` · ${t.notes}`}
                      </span>
                    </span>
                    {t.assigned_to && <Persona miembroId={t.assigned_to} />}
                    <div className="-mr-1 flex shrink-0">
                      <BotonIcono etiqueta={`Editar ${t.name}`} onClick={() => setEditando(t)}>
                        <Pencil size={15} />
                      </BotonIcono>
                      <BotonIcono etiqueta={`Eliminar ${t.name}`} tono="peligro" onClick={() => setBorrando(t)}>
                        <Trash2 size={15} />
                      </BotonIcono>
                    </div>
                  </li>
                ))}
              </ul>
              <Boton
                variante="secundario"
                ancho
                onClick={() => void generar()}
                cargando={enCurso}
                disabled={dias.length === 0}
              >
                <Sparkles size={16} /> Completar con las fechas de la escapada
              </Boton>
            </>
          )}

          <p className="text-xs text-suave">
            Los productos que no pertenezcan a ningún tiempo se quedan en la <strong>compra común</strong>:
            bebida, desayunos, lo que no es de una comida concreta.
          </p>
        </div>
      </Modal>

      <FormularioTiempo
        abierto={creando || Boolean(editando)}
        tiempo={editando}
        escapada={escapada}
        participantes={participantes}
        siguienteOrden={tiempos.length * 10 + 10}
        onCerrar={() => {
          setCreando(false)
          setEditando(null)
        }}
        onHecho={onHecho}
      />

      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Eliminar «${borrando?.name}»?`}
        texto="Los productos que tuviera asignados no se borran: pasan a la compra común."
        textoAceptar="Sí, eliminar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
    </>
  )
}

// =====================================================================
// Alta y edición de un tiempo
// =====================================================================
function FormularioTiempo({
  abierto,
  tiempo,
  escapada,
  participantes,
  siguienteOrden,
  onCerrar,
  onHecho,
}: {
  abierto: boolean
  tiempo: TripMeal | null
  escapada: Trip
  participantes: Member[]
  siguienteOrden: number
  onCerrar: () => void
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState('')
  const [dia, setDia] = useState('')
  const [tipo, setTipo] = useState<TipoTiempo>('cena')
  const [encargado, setEncargado] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const adultos = participantes.filter((m) => !m.is_child)

  useEffect(() => {
    if (!abierto) return
    setNombre(tiempo?.name ?? '')
    setDia(tiempo?.day ?? escapada.start_date ?? '')
    setTipo(tiempo?.kind ?? 'cena')
    setEncargado(tiempo?.assigned_to ?? '')
    setNotas(tiempo?.notes ?? '')
  }, [abierto, tiempo, escapada.start_date])

  // El nombre se propone solo mientras no lo toques: «Cena del viernes».
  const sugerencia = useMemo(() => {
    const nombreTipo = TIPOS.find((t) => t.valor === tipo)?.texto ?? ''
    const d = diaSemana(dia)
    return d ? `${nombreTipo} del ${d}` : nombreTipo
  }, [tipo, dia])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const titulo = (nombre.trim() || sugerencia).trim()
    if (!titulo) {
      avisos.error('Ponle nombre al tiempo.')
      return
    }
    setGuardando(true)
    try {
      const datos = {
        name: titulo,
        day: dia || null,
        kind: tipo,
        assigned_to: encargado || null,
        notes: notas.trim() || null,
      }
      const { error } = tiempo
        ? await supabase.from('trip_meals').update(datos).eq('id', tiempo.id)
        : await supabase.from('trip_meals').insert({ ...datos, trip_id: escapada.id, sort_order: siguienteOrden })
      if (error) throw error
      onHecho()
      onCerrar()
      avisos.ok(tiempo ? 'Tiempo actualizado.' : 'Tiempo creado.')
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={tiempo ? 'Editar tiempo' : 'Nuevo tiempo'}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-tiempo" cargando={guardando}>
            {tiempo ? 'Guardar' : 'Crear'}
          </Boton>
        </>
      }
    >
      <form id="form-tiempo" onSubmit={guardar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Qué es">
            <Lista value={tipo} onChange={(e) => setTipo(e.target.value as TipoTiempo)}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.emoji} {t.texto}
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Día">
            <Entrada type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Nombre" ayuda={`Si lo dejas vacío se llamará «${sugerencia}».`}>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={sugerencia} />
        </Campo>
        <Campo etiqueta="¿Quién hace esta compra?" ayuda="Puedes dejarlo sin decidir y que alguien se apunte luego.">
          <Lista value={encargado} onChange={(e) => setEncargado(e.target.value)}>
            <option value="">Sin decidir</option>
            {adultos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Lista>
        </Campo>
        <Campo etiqueta="Observaciones">
          <Entrada
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej.: paella, que hay dos vegetarianos"
          />
        </Campo>
      </form>
    </Modal>
  )
}

/** Chip con el emoji y el nombre del tiempo. */
export function EtiquetaTiempo({ tiempo }: { tiempo: TripMeal | null }) {
  if (!tiempo) return <Etiqueta>🧺 Compra común</Etiqueta>
  return (
    <Etiqueta tono="bosque">
      {emojiTiempo(tiempo.kind)} {tiempo.name}
    </Etiqueta>
  )
}
