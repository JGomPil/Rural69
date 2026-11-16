import { useEffect, useMemo, useState } from 'react'
import { Archive, Sparkles } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Campo, Casilla, Entrada, Interruptor, Lista } from '../ui/Campos'
import { Modal } from '../ui/Modal'
import { Cargando, Etiqueta } from '../ui/Varios'
import { useAvisos } from '../../hooks/useAvisos'
import { mensajeError, supabase } from '../../lib/supabase'
import { buscaEnDespensa, escalaCantidad, pendienteDeComprar, redondea } from '../../lib/cantidades'
import { cantidad, numero } from '../../lib/formato'
import { estiloCategoria } from '../../lib/constantes'
import { emojiTiempo } from './Tiempos'
import type { MasterItem, PantryItem, ShoppingItem, TripMeal } from '../../lib/types'

// =====================================================================
// 1 · Generar la lista de la escapada a partir de la lista maestra
// =====================================================================
export function DialogoGenerarLista({
  abierto,
  onCerrar,
  tripId,
  personas,
  yaExisten,
  tiempos = [],
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  tripId: string
  personas: number
  yaExisten: ShoppingItem[]
  tiempos?: TripMeal[]
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [maestros, setMaestros] = useState<MasterItem[] | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [ajustar, setAjustar] = useState(true)
  const [tiempo, setTiempo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setMaestros(null)
    void supabase
      .from('master_items')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .order('name')
      .then(({ data }) => {
        const lista = (data ?? []) as MasterItem[]
        setMaestros(lista)
        const yaPuestos = new Set(yaExisten.map((i) => i.master_item_id).filter(Boolean) as string[])
        setSeleccion(new Set(lista.filter((m) => !yaPuestos.has(m.id)).map((m) => m.id)))
      })
  }, [abierto, yaExisten])

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, MasterItem[]>()
    for (const m of maestros ?? []) {
      if (!mapa.has(m.category)) mapa.set(m.category, [])
      mapa.get(m.category)!.push(m)
    }
    return [...mapa.entries()]
  }, [maestros])

  const calcula = (m: MasterItem) =>
    ajustar ? escalaCantidad(m.qty, m.base_people, personas, m.unit) : redondea(Number(m.qty) || 0, m.unit)

  const generar = async () => {
    if (!maestros) return
    setGuardando(true)
    try {
      const elegidos = maestros.filter((m) => seleccion.has(m.id))
      const base = yaExisten.length
      const filas = elegidos.map((m, i) => {
        const necesaria = calcula(m)
        return {
          trip_id: tripId,
          master_item_id: m.id,
          name: m.name,
          category: m.category,
          unit: m.unit,
          needed_qty: necesaria,
          available_qty: 0,
          buy_qty: necesaria,
          notes: m.notes,
          meal_id: tiempo || null,
          sort_order: base + i,
        }
      })
      if (filas.length) {
        const { error } = await supabase.from('shopping_items').insert(filas)
        if (error) throw error
      }
      avisos.ok(`${filas.length} productos añadidos a la lista.`)
      onHecho()
      onCerrar()
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Generar la lista de la compra"
      descripcion="Partimos de la lista maestra. Después podréis cambiar todo lo que queráis."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={() => void generar()} cargando={guardando} disabled={seleccion.size === 0}>
            <Sparkles size={16} /> Añadir {seleccion.size} productos
          </Boton>
        </>
      }
    >
      {!maestros ? (
        <Cargando texto="Cargando lista maestra…" alto="py-10" />
      ) : maestros.length === 0 ? (
        <p className="rounded-2xl bg-beige px-4 py-3 text-sm text-carbon/70">
          La lista maestra está vacía. Añade productos en <strong>Lista maestra</strong> y vuelve aquí.
        </p>
      ) : (
        <div className="space-y-4">
          {tiempos.length > 0 && (
            <Campo
              etiqueta="¿Para qué tiempo?"
              ayuda="Todo lo que generes ahora cae en este tiempo. Luego puedes mover productos sueltos."
            >
              <Lista value={tiempo} onChange={(e) => setTiempo(e.target.value)}>
                <option value="">🧺 Compra común</option>
                {tiempos.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {emojiTiempo(tm.kind)} {tm.name}
                  </option>
                ))}
              </Lista>
            </Campo>
          )}

          <div className="rounded-2xl border border-arena bg-superficie p-4">
            <Interruptor
              checked={ajustar}
              onChange={setAjustar}
              etiqueta={`Ajustar las cantidades a ${numero(personas)} personas equivalentes`}
            />
            <p className="mt-1.5 text-xs text-carbon/50">
              La lista maestra guarda cantidades pensadas para un grupo de referencia. Si lo activas, se recalculan
              proporcionalmente. Son solo propuestas: podrás editarlas una a una.
            </p>
          </div>

          <div className="flex gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSeleccion(new Set(maestros.map((m) => m.id)))}
              className="text-bosque-600 hover:underline"
            >
              Seleccionar todo
            </button>
            <span className="text-carbon/25">·</span>
            <button type="button" onClick={() => setSeleccion(new Set())} className="text-carbon/50 hover:underline">
              Quitar todo
            </button>
          </div>

          <div className="space-y-4">
            {porCategoria.map(([categoria, items]) => {
              const estilo = estiloCategoria(categoria)
              return (
                <div key={categoria}>
                  <p className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${estilo.clase}`}>
                    <span aria-hidden>{estilo.emoji}</span> {categoria}
                  </p>
                  <div className="divide-y divide-arena rounded-2xl border border-arena bg-superficie">
                    {items.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3.5 py-2">
                        <Casilla
                          checked={seleccion.has(m.id)}
                          onChange={(v) =>
                            setSeleccion((prev) => {
                              const copia = new Set(prev)
                              if (v) copia.add(m.id)
                              else copia.delete(m.id)
                              return copia
                            })
                          }
                          etiqueta={m.name}
                          descripcion={m.notes ?? undefined}
                        />
                        <span className="ml-auto shrink-0 text-sm font-bold text-bosque-700">
                          {cantidad(calcula(m), m.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}

// =====================================================================
// 2 · Revisar la despensa: proponer descuentos de los sobrantes
// =====================================================================
interface Coincidencia {
  item: ShoppingItem
  sobrante: PantryItem
  disponible: number
  elegido: boolean
}

export function DialogoDespensa({
  abierto,
  onCerrar,
  items,
  despensa,
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  items: ShoppingItem[]
  despensa: PantryItem[]
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [filas, setFilas] = useState<Coincidencia[]>([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const encontradas: Coincidencia[] = []
    for (const item of items) {
      const sobrante = buscaEnDespensa(item, despensa)
      if (!sobrante) continue
      const disponible = Math.min(Number(sobrante.qty), Number(item.needed_qty) || Number(sobrante.qty))
      encontradas.push({ item, sobrante, disponible: redondea(disponible, item.unit), elegido: true })
    }
    setFilas(encontradas)
  }, [abierto, items, despensa])

  const aplicar = async () => {
    setGuardando(true)
    try {
      const elegidas = filas.filter((f) => f.elegido)
      for (const f of elegidas) {
        const { error } = await supabase
          .from('shopping_items')
          .update({
            available_qty: f.disponible,
            buy_qty: pendienteDeComprar(f.item.needed_qty, f.disponible, f.item.unit),
          })
          .eq('id', f.item.id)
        if (error) throw error
      }
      avisos.ok(
        elegidas.length === 1
          ? 'Cantidad ajustada con lo que ya tenemos.'
          : `${elegidas.length} productos ajustados con lo de la despensa.`,
      )
      onHecho()
      onCerrar()
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="¿Qué tenemos ya en la despensa?"
      descripcion="Nada se descuenta solo: revisa las cantidades y confirma lo que quieras aplicar."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={() => void aplicar()} cargando={guardando} disabled={!filas.some((f) => f.elegido)}>
            <Archive size={16} /> Aplicar a {filas.filter((f) => f.elegido).length}
          </Boton>
        </>
      }
    >
      {filas.length === 0 ? (
        <p className="rounded-2xl bg-beige px-4 py-3 text-sm text-carbon/70">
          No hay coincidencias entre la lista de esta escapada y los sobrantes guardados en la despensa.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filas.map((f, i) => (
            <div key={f.item.id} className="rounded-2xl border border-arena bg-superficie p-3.5">
              <div className="flex items-start gap-3">
                <Casilla
                  checked={f.elegido}
                  onChange={(v) =>
                    setFilas((prev) => prev.map((x, j) => (i === j ? { ...x, elegido: v } : x)))
                  }
                  etiqueta={f.item.name}
                  descripcion={`En la despensa: ${cantidad(f.sobrante.qty, f.sobrante.unit)}${
                    f.sobrante.condition ? ` · ${f.sobrante.condition}` : ''
                  }`}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-beige px-2 py-2">
                  <p className="text-[11px] font-semibold text-carbon/50">Necesitamos</p>
                  <p className="font-bold text-carbon/80">{cantidad(f.item.needed_qty, f.item.unit)}</p>
                </div>
                <Campo className="text-left">
                  <span className="mb-1 block text-[11px] font-semibold text-carbon/50">Ya tenemos</span>
                  <Entrada
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={f.disponible}
                    onChange={(e) =>
                      setFilas((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, disponible: Number(e.target.value) || 0 } : x)),
                      )
                    }
                    className="py-1.5 text-center"
                  />
                </Campo>
                <div className="rounded-xl bg-bosque-50 px-2 py-2">
                  <p className="text-[11px] font-semibold text-bosque-600">A comprar</p>
                  <p className="font-bold text-bosque-700">
                    {cantidad(pendienteDeComprar(f.item.needed_qty, f.disponible, f.item.unit), f.item.unit)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-carbon/50">
            Al aplicarlo se guarda la cantidad disponible y se recalcula lo que hay que comprar. La despensa no se
            modifica hasta que registréis lo consumido al volver.
          </p>
        </div>
      )}
    </Modal>
  )
}

// =====================================================================
// 3 · Recalcular cantidades para el número real de asistentes
// =====================================================================
export function DialogoRecalcular({
  abierto,
  onCerrar,
  items,
  personas,
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  items: ShoppingItem[]
  personas: number
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [maestros, setMaestros] = useState<MasterItem[] | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setMaestros(null)
    void supabase
      .from('master_items')
      .select('*')
      .then(({ data }) => setMaestros((data ?? []) as MasterItem[]))
  }, [abierto])

  const propuestas = useMemo(() => {
    if (!maestros) return []
    const resultado: { item: ShoppingItem; nueva: number }[] = []
    for (const item of items) {
      const m = maestros.find((x) => x.id === item.master_item_id)
      if (!m) continue
      const nueva = escalaCantidad(m.qty, m.base_people, personas, item.unit)
      if (nueva !== Number(item.needed_qty)) resultado.push({ item, nueva })
    }
    return resultado
  }, [maestros, items, personas])

  useEffect(() => {
    setSeleccion(new Set(propuestas.map((p) => p.item.id)))
  }, [propuestas])

  const aplicar = async () => {
    setGuardando(true)
    try {
      for (const p of propuestas.filter((x) => seleccion.has(x.item.id))) {
        const { error } = await supabase
          .from('shopping_items')
          .update({
            needed_qty: p.nueva,
            buy_qty: pendienteDeComprar(p.nueva, p.item.available_qty, p.item.unit),
          })
          .eq('id', p.item.id)
        if (error) throw error
      }
      avisos.ok('Cantidades actualizadas.')
      onHecho()
      onCerrar()
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Recalcular para ${numero(personas)} personas`}
      descripcion="Comparamos con la lista maestra y proponemos cantidades proporcionales."
      ancho="md"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={() => void aplicar()} cargando={guardando} disabled={seleccion.size === 0}>
            Aplicar a {seleccion.size}
          </Boton>
        </>
      }
    >
      {!maestros ? (
        <Cargando alto="py-10" />
      ) : propuestas.length === 0 ? (
        <p className="rounded-2xl bg-beige px-4 py-3 text-sm text-carbon/70">
          Las cantidades ya encajan con el número de asistentes. No hay nada que cambiar.
        </p>
      ) : (
        <div className="divide-y divide-arena rounded-2xl border border-arena bg-superficie">
          {propuestas.map(({ item, nueva }) => (
            <div key={item.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Casilla
                checked={seleccion.has(item.id)}
                onChange={(v) =>
                  setSeleccion((prev) => {
                    const copia = new Set(prev)
                    if (v) copia.add(item.id)
                    else copia.delete(item.id)
                    return copia
                  })
                }
                etiqueta={item.name}
              />
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-sm">
                <span className="text-carbon/45 line-through">{cantidad(item.needed_qty, item.unit)}</span>
                <span aria-hidden>→</span>
                <Etiqueta tono="bosque">{cantidad(nueva, item.unit)}</Etiqueta>
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
