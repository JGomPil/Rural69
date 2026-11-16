import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { AreaTexto, Campo, Casilla, Entrada, Lista } from '../ui/Campos'
import { Modal } from '../ui/Modal'
import { Persona } from '../ui/Persona'
import { Etiqueta } from '../ui/Varios'
import { useAvisos } from '../../hooks/useAvisos'
import { useGrupo } from '../../hooks/useGrupo'
import { useAuth } from '../../hooks/useAuth'
import { mensajeError, supabase } from '../../lib/supabase'
import { ESTADOS } from '../../lib/constantes'
import { personasEquivalentes } from '../../lib/cantidades'
import { numero } from '../../lib/formato'
import type { EstadoEscapada, Trip } from '../../lib/types'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Si se pasa, el formulario edita esa escapada en lugar de crear una nueva. */
  escapada?: Trip | null
  onGuardada?: (id: string) => void
}

export function FormularioEscapada({ abierto, onCerrar, escapada, onGuardada }: Props) {
  const { miembros, hogares, refrescar } = useGrupo()
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
        .select('member_id')
        .eq('trip_id', escapada.id)
        .then(({ data }) => setParticipantes(new Set((data ?? []).map((r) => r.member_id as string))))
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
        const { error: errBorrado } = await supabase.from('trip_participants').delete().eq('trip_id', id)
        if (errBorrado) throw errBorrado
        if (participantes.size) {
          const filas = [...participantes].map((member_id) => ({ trip_id: id, member_id }))
          const { error: errIns } = await supabase.from('trip_participants').insert(filas)
          if (errIns) throw errIns
        }
      }

      await refrescar()
      avisos.ok(editando ? 'Escapada actualizada.' : '¡Escapada creada! Ya podéis proponer casas.')
      onCerrar()
      if (id && onGuardada) onGuardada(id)
    } catch (e) {
      setError(mensajeError(e))
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
      descripcion={editando ? undefined : 'Los datos se pueden completar más tarde.'}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha de ida">
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
          <Campo etiqueta="Provincia">
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
            <span className="flex items-center gap-1.5 text-sm font-semibold text-carbon/75">
              <Users size={16} /> ¿Quién viene?
            </span>
            <Etiqueta tono="oliva">
              {adultos} adultos · {ninos} niños · {numero(equivalentes)} equivalentes
            </Etiqueta>
          </div>

          {miembros.length === 0 ? (
            <p className="rounded-2xl bg-beige px-4 py-3 text-sm text-carbon/60">
              Todavía no hay integrantes. Añádelos en <strong>Ajustes → Integrantes del grupo</strong>.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-arena bg-superficie p-3.5">
              {porHogar.map((grupo) => (
                <div key={grupo.nombre}>
                  <p className="mb-1 text-xs font-bold tracking-wide text-carbon/40 uppercase">{grupo.nombre}</p>
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
                            {!m.active && <span className="text-xs text-carbon/40">(inactivo)</span>}
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
                  className="text-xs font-semibold text-carbon/50 hover:underline"
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
