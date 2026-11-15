import { useEffect, useState } from 'react'
import { Boton } from '../ui/Boton'
import { AreaTexto, Campo, Entrada, Lista } from '../ui/Campos'
import { Modal } from '../ui/Modal'
import { useAvisos } from '../../hooks/useAvisos'
import { mensajeError, supabase } from '../../lib/supabase'
import { CATEGORIAS, UNIDADES } from '../../lib/constantes'
import { pendienteDeComprar } from '../../lib/cantidades'
import { cantidad } from '../../lib/formato'
import type { Member, ShoppingItem } from '../../lib/types'

interface Props {
  abierto: boolean
  onCerrar: () => void
  tripId: string
  item?: ShoppingItem | null
  participantes: Member[]
  siguienteOrden: number
  onHecho: () => void
}

export function DialogoProducto({
  abierto,
  onCerrar,
  tripId,
  item,
  participantes,
  siguienteOrden,
  onHecho,
}: Props) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<string>('Otros')
  const [unidad, setUnidad] = useState('ud')
  const [necesaria, setNecesaria] = useState('1')
  const [disponible, setDisponible] = useState('0')
  const [comprar, setComprar] = useState('1')
  const [asignado, setAsignado] = useState('')
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    if (item) {
      setNombre(item.name)
      setCategoria(item.category)
      setUnidad(item.unit)
      setNecesaria(String(item.needed_qty))
      setDisponible(String(item.available_qty))
      setComprar(String(item.buy_qty))
      setAsignado(item.assigned_to ?? '')
      setPrecio(item.price != null ? String(item.price) : '')
      setNotas(item.notes ?? '')
    } else {
      setNombre('')
      setCategoria('Otros')
      setUnidad('ud')
      setNecesaria('1')
      setDisponible('0')
      setComprar('1')
      setAsignado('')
      setPrecio('')
      setNotas('')
    }
  }, [abierto, item])

  const sugerido = pendienteDeComprar(Number(necesaria) || 0, Number(disponible) || 0, unidad)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El producto necesita un nombre.')
      return
    }
    setGuardando(true)
    try {
      const datos = {
        name: nombre.trim(),
        category: categoria,
        unit: unidad,
        needed_qty: Number(necesaria) || 0,
        available_qty: Number(disponible) || 0,
        buy_qty: Number(comprar) || 0,
        assigned_to: asignado || null,
        price: precio.trim() === '' ? null : Number(precio),
        notes: notas.trim() || null,
      }
      if (item) {
        const { error: err } = await supabase.from('shopping_items').update(datos).eq('id', item.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('shopping_items')
          .insert({ ...datos, trip_id: tripId, sort_order: siguienteOrden })
        if (err) throw err
      }
      avisos.ok(item ? 'Producto actualizado.' : 'Producto añadido.')
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
      titulo={item ? 'Editar producto' : 'Añadir producto'}
      ancho="md"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-producto" cargando={guardando}>
            {item ? 'Guardar' : 'Añadir'}
          </Boton>
        </>
      }
    >
      <form id="form-producto" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Producto" requerido>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Chorizo para la barbacoa" required />
        </Campo>

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

        <div className="rounded-2xl border border-arena bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-carbon/75">Cantidades</p>
          <div className="grid grid-cols-3 gap-2.5">
            <Campo etiqueta="Necesaria">
              <Entrada
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={necesaria}
                onChange={(e) => setNecesaria(e.target.value)}
                className="text-center"
              />
            </Campo>
            <Campo etiqueta="Ya tenemos">
              <Entrada
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={disponible}
                onChange={(e) => setDisponible(e.target.value)}
                className="text-center"
              />
            </Campo>
            <Campo etiqueta="A comprar">
              <Entrada
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={comprar}
                onChange={(e) => setComprar(e.target.value)}
                className="text-center font-bold"
              />
            </Campo>
          </div>
          {sugerido !== (Number(comprar) || 0) && (
            <button
              type="button"
              onClick={() => setComprar(String(sugerido))}
              className="mt-2 text-xs font-semibold text-bosque-600 hover:underline"
            >
              Usar lo que falta: {cantidad(sugerido, unidad)}
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="¿Quién lo compra?">
            <Lista value={asignado} onChange={(e) => setAsignado(e.target.value)}>
              <option value="">Sin asignar</option>
              {participantes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Precio pagado (€)" ayuda="Opcional, para las estadísticas de gasto.">
            <Entrada
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Observaciones">
          <AreaTexto value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
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
