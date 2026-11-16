import { useEffect, useState } from 'react'
import { Boton } from '../ui/Boton'
import { AreaTexto, Campo, Entrada, Interruptor, Lista } from '../ui/Campos'
import { Modal } from '../ui/Modal'
import { useAvisos } from '../../hooks/useAvisos'
import { mensajeError, supabase } from '../../lib/supabase'
import { CATEGORIAS, ESTADOS_SOBRANTE, UNIDADES } from '../../lib/constantes'
import type { PantryItem } from '../../lib/types'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Escapada de la que proceden los sobrantes (opcional). */
  tripId?: string | null
  item?: PantryItem | null
  /** Valores iniciales cuando se registra desde la lista de la compra. */
  inicial?: Partial<PantryItem> | null
  onHecho: () => void
}

export function FormularioSobrante({ abierto, onCerrar, tripId, item, inicial, onHecho }: Props) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('Otros')
  const [qty, setQty] = useState('1')
  const [unidad, setUnidad] = useState('ud')
  const [estado, setEstado] = useState<string>('Perfecto')
  const [notas, setNotas] = useState('')
  const [conservable, setConservable] = useState(true)
  const [masterId, setMasterId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    const base = item ?? inicial
    setNombre(base?.name ?? '')
    setCategoria(base?.category ?? 'Otros')
    setQty(base?.qty != null ? String(base.qty) : '1')
    setUnidad(base?.unit ?? 'ud')
    setEstado(base?.condition ?? 'Perfecto')
    setNotas(base?.notes ?? '')
    setConservable(base?.keepable ?? true)
    setMasterId(base?.master_item_id ?? null)
  }, [abierto, item, inicial])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Dinos qué producto ha sobrado.')
      return
    }
    setGuardando(true)
    try {
      const datos = {
        name: nombre.trim(),
        category: categoria,
        qty: Number(qty) || 0,
        unit: unidad,
        condition: estado || null,
        notes: notas.trim() || null,
        keepable: conservable,
        master_item_id: masterId,
      }
      if (item) {
        const { error: err } = await supabase.from('pantry_items').update(datos).eq('id', item.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('pantry_items')
          .insert({ ...datos, source_trip_id: tripId ?? null })
        if (err) throw err
      }
      avisos.ok(item ? 'Sobrante actualizado.' : 'Sobrante guardado en la despensa.')
      onHecho()
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={item ? 'Editar sobrante' : '¿Qué ha sobrado?'}
      ancho="md"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-sobrante" cargando={guardando}>
            {item ? 'Guardar' : 'Guardar en la despensa'}
          </Boton>
        </>
      }
    >
      <form id="form-sobrante" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Producto" requerido>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Aceite de oliva" required />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Cantidad sobrante">
            <Entrada
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Unidad">
            <Lista value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Lista>
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Categoría">
            <Lista value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Estado del producto">
            <Lista value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS_SOBRANTE.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Lista>
          </Campo>
        </div>

        <div className="rounded-2xl border border-arena bg-superficie p-4">
          <Interruptor
            checked={conservable}
            onChange={setConservable}
            etiqueta="Se puede guardar para la próxima escapada"
          />
          <p className="mt-1.5 text-xs text-carbon/50">
            Si lo desactivas seguirá apuntado, pero no se propondrá para descontar de la próxima compra.
          </p>
        </div>

        <Campo etiqueta="Observaciones">
          <AreaTexto
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Se queda en casa de Javi"
          />
        </Campo>

        {error && (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
