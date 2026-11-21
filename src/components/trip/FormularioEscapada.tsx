import { useEffect, useMemo, useState } from 'react'
import { CopyPlus, Users } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { AreaTexto, Campo, Casilla, Entrada, Lista } from '../ui/Campos'
import { Modal } from '../ui/Modal'
import { Persona } from '../ui/Persona'
import { Etiqueta } from '../ui/Varios'
import { useAvisos } from '../../hooks/useAvisos'
import { useGrupo } from '../../hooks/useGrupo'
import { useAuth } from '../../hooks/useAuth'
import { faltaPasarSql, mensajeError, supabase } from '../../lib/supabase'
import { ESTADOS } from '../../lib/constantes'
import { personasEquivalentes } from '../../lib/cantidades'
import { numero } from '../../lib/formato'
import { hereda, resumeHeredado, type QueHeredar } from '../../lib/heredar'
import type { EstadoEscapada, Trip } from '../../lib/types'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Si se pasa, el formulario edita esa escapada en lugar de crear una nueva. */
  escapada?: Trip | null
  onGuardada?: (id: string) => void
}

export function FormularioEscapada({ abierto, onCerrar, escapada, onGuardada }: Props) {
  const { miembros, hogares, escapadas, refrescar } = useGrupo()
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const editando = Boolean(escapada)

  const [titulo, setTitulo] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [provincia, setProvincia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [estado, setEstado] = useState<EstadoEscapada>('planificacion')
  const [participantes, setParticipantes] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // De qué escapada parte esta, y qué se trae de ella.
  // `null` = nadie ha tocado la lista todavía, y entonces manda la anterior.
  // Así un refresco por detrás (hay realtime) no te cambia lo que acabas de
  // elegir, y tampoco hace falta rellenarlo desde un efecto.
  const [origen, setOrigen] = useState<string | null>(null)
  const [queTraer, setQueTraer] = useState<QueHeredar>({ menu: true, equipaje: true, compra: false })

  /** Las que ya existen, de la más reciente a la más vieja. La primera es
   *  «la anterior», que es de la que se parte casi siempre. */
  const anteriores = useMemo(
    () =>
      escapadas
        .filter((t) => t.id !== escapada?.id)
        .slice()
        .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? '') || b.created_at.localeCompare(a.created_at)),
    [escapadas, escapada?.id],
  )
  const origenId = origen ?? anteriores[0]?.id ?? ''

  useEffect(() => {
    if (!abierto) return
    setError(null)
    if (escapada) {
      setTitulo(escapada.title)
      setInicio(escapada.start_date ?? '')
      setFin(escapada.end_date ?? '')
      setLocalidad(escapada.town ?? '')
      setProvincia(escapada.province ?? '')
      setObservaciones(escapada.notes ?? '')
      setEstado(escapada.status)
      void supabase
        .from('trip_participants')
        .select('*')
        .eq('trip_id', escapada.id)
        .then(({ data }) =>
          setParticipantes(
            new Set(
              ((data ?? []) as { member_id: string; attending?: boolean }[])
                .filter((r) => (r.attending ?? true) !== false)
                .map((r) => r.member_id),
            ),
          ),
        )
    } else {
      const anyo = new Date().getFullYear()
      setTitulo(`Escapada ${anyo}`)
      setInicio('')
      setFin('')
      setLocalidad('')
      setProvincia('')
      setObservaciones('')
      setEstado('planificacion')
      setParticipantes(new Set(miembros.filter((m) => m.active).map((m) => m.id)))
      // La anterior viene elegida: es lo que se quiere el 90 % de las veces,
      // y está a la vista antes de pulsar «Crear», no escondida en un ajuste.
      setOrigen(null)
      setQueTraer({ menu: true, equipaje: true, compra: false })
    }
  }, [abierto, escapada, miembros])

  const seleccionados = useMemo(() => miembros.filter((m) => participantes.has(m.id)), [miembros, participantes])
  const equivalentes = personasEquivalentes(seleccionados)
  const adultos = seleccionados.filter((m) => !m.is_child).length
  const ninos = seleccionados.length - adultos

  const alterna = (id: string) => {
    setParticipantes((prev) => {
      const copia = new Set(prev)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!titulo.trim()) {
      setError('Ponle un nombre a la escapada.')
      return
    }
    if (inicio && fin && fin < inicio) {
      setError('La fecha de vuelta no puede ser anterior a la de ida.')
      return
    }
    setGuardando(true)
    try {
      const datos = {
        title: titulo.trim(),
        start_date: inicio || null,
        end_date: fin || null,
        town: localidad.trim() || null,
        province: provincia.trim() || null,
        notes: observaciones.trim() || null,
        status: estado,
      }

      let id = escapada?.id
      if (escapada) {
        const { error: err } = await supabase.from('trips').update(datos).eq('id', escapada.id)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase
          .from('trips')
          .insert({ ...datos, created_by: perfil?.id ?? null })
          .select('id')
          .single()
        if (err) throw err
        id = data.id as string
      }

      if (id) {
        // Se contesta por todo el mundo, no solo por quien viene: así no queda
        // nadie en «todavía no ha dicho nada» después de que un administrador
        // haya puesto la lista a mano.
        const filas = miembros.map((m) => ({
          trip_id: id,
          member_id: m.id,
          attending: participantes.has(m.id),
        }))
        if (filas.length) {
          const { error: errPart } = await supabase
            .from('trip_participants')
            .upsert(filas, { onConflict: 'trip_id,member_id' })
          if (errPart) throw errPart
        }
      }

      // Lo heredado va al final y aparte: si algo falla aquí, la escapada ya
      // existe y lo que no se puede es perderla por una copia a medias.
      let traido = ''
      const deDonde = anteriores.find((t) => t.id === origenId)
      if (!editando && id && deDonde && (queTraer.menu || queTraer.equipaje || queTraer.compra)) {
        try {
          const hecho = await hereda({
            origen: { id: deDonde.id, start_date: deDonde.start_date },
            destino: { id, start_date: inicio || null },
            que: queTraer,
            perfilId: perfil?.id ?? null,
          })
          traido = ` ${resumeHeredado(hecho)}`
        } catch (e) {
          console.error('Rural69: no se ha podido heredar de la escapada anterior', e)
          avisos.error(`La escapada se ha creado, pero no se ha podido traer lo de «${deDonde.title}»: ${mensajeError(e)}`)
        }
      }

      await refrescar()
      avisos.ok(editando ? 'Escapada actualizada.' : `¡Escapada creada!${traido || ' Ya podéis proponer casas.'}`)
      onCerrar()
      if (id && onGuardada) onGuardada(id)
    } catch (e) {
      setError(faltaPasarSql(e) ?? mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const porHogar = useMemo(() => {
    const grupos: { nombre: string; miembros: typeof miembros }[] = []
    for (const h of hogares) {
      const gente = miembros.filter((m) => m.household_id === h.id)
      if (gente.length) grupos.push({ nombre: h.name, miembros: gente })
    }
    const sueltos = miembros.filter((m) => !m.household_id || !hogares.some((h) => h.id === m.household_id))
    if (sueltos.length) grupos.push({ nombre: 'Sin unidad familiar', miembros: sueltos })
    return grupos
  }, [hogares, miembros])

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={editando ? 'Editar escapada' : 'Nueva escapada'}
      descripcion="Solo el nombre es obligatorio: las fechas y el sitio pueden esperar a la votación."
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-escapada" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear escapada'}
          </Boton>
        </>
      }
    >
      <form id="form-escapada" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Nombre de la escapada" requerido>
          <Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Escapada de otoño" required />
        </Campo>

        {!editando && anteriores.length > 0 && (
          <div className="rounded-2xl border border-arena bg-superficie p-4">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-tenue">
              <CopyPlus size={16} className="text-bosque-600" /> Partir de una anterior
            </p>
            <p className="mb-3 text-xs text-suave">
              El menú y el equipaje se repiten casi enteros de un año para otro. Los días se desplazan solos: la cena
              del viernes cae en el viernes nuevo.
            </p>
            <Lista value={origenId} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Empezar de cero</option>
              {anteriores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Lista>
            {origenId && (
              <div className="mt-3 space-y-1.5 border-t border-arena pt-3">
                <Casilla
                  checked={queTraer.menu}
                  onChange={() => setQueTraer((p) => ({ ...p, menu: !p.menu }))}
                  etiqueta="El menú: los tiempos del finde y qué se cocinaba en cada uno"
                />
                <Casilla
                  checked={queTraer.equipaje}
                  onChange={() => setQueTraer((p) => ({ ...p, equipaje: !p.equipaje }))}
                  etiqueta="El equipaje: quién llevaba qué, otra vez sin tachar"
                />
                <Casilla
                  checked={queTraer.compra}
                  onChange={() => setQueTraer((p) => ({ ...p, compra: !p.compra }))}
                  etiqueta="La lista de la compra: sin marcar y sin precios"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha de ida" ayuda="Si todavía están por decidir, déjalas en blanco: saldrá «Fechas por decidir».">
            <Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
          <Campo etiqueta="Fecha de vuelta">
            <Entrada type="date" value={fin} onChange={(e) => setFin(e.target.value)} min={inicio || undefined} />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Localidad">
            <Entrada value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Potes" />
          </Campo>
          <Campo etiqueta="Provincia" ayuda="Si depende de la casa que salga votada, déjalo vacío.">
            <Entrada value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Cantabria" />
          </Campo>
        </div>

        <Campo etiqueta="Estado">
          <Lista value={estado} onChange={(e) => setEstado(e.target.value as EstadoEscapada)}>
            {Object.entries(ESTADOS).map(([valor, e]) => (
              <option key={valor} value={valor}>
                {e.emoji} {e.etiqueta}
              </option>
            ))}
          </Lista>
        </Campo>

        <Campo etiqueta="Observaciones generales">
          <AreaTexto
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Quedamos el viernes a las 18:00 en la gasolinera…"
          />
        </Campo>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-tenue">
              <Users size={16} /> ¿Quién viene?
            </span>
            <Etiqueta tono="oliva">
              {adultos} adultos · {ninos} niños · {numero(equivalentes)} equivalentes
            </Etiqueta>
          </div>

          {miembros.length === 0 ? (
            <p className="rounded-2xl bg-beige px-4 py-3 text-sm text-suave">
              Todavía no hay integrantes. Añádelos en <strong>Ajustes → Integrantes del grupo</strong>.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-arena bg-superficie p-3.5">
              {porHogar.map((grupo) => (
                <div key={grupo.nombre}>
                  <p className="mb-1 text-xs font-bold tracking-wide text-suave uppercase">{grupo.nombre}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {grupo.miembros.map((m) => (
                      <Casilla
                        key={m.id}
                        checked={participantes.has(m.id)}
                        onChange={() => alterna(m.id)}
                        etiqueta={
                          <span className="flex items-center gap-1.5">
                            <Persona miembroId={m.id} />
                            {m.is_child && <span className="text-xs text-tierra-600">niñ@</span>}
                            {!m.active && <span className="text-xs text-suave">(inactivo)</span>}
                          </span>
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-2 border-t border-arena pt-2.5">
                <button
                  type="button"
                  onClick={() => setParticipantes(new Set(miembros.filter((m) => m.active).map((m) => m.id)))}
                  className="text-xs font-semibold text-bosque-600 hover:underline"
                >
                  Vienen todos
                </button>
                <span className="text-carbon/25">·</span>
                <button
                  type="button"
                  onClick={() => setParticipantes(new Set())}
                  className="text-xs font-semibold text-suave hover:underline"
                >
                  Quitar a todos
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
