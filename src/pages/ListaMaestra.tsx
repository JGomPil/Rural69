import { useEffect, useMemo, useState } from 'react'
import { Download, Lightbulb, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAvisos } from '../hooks/useAvisos'
import { useConsulta } from '../hooks/useConsulta'
import { useGrupo } from '../hooks/useGrupo'
import { mensajeError, supabase } from '../lib/supabase'
import { CATEGORIAS, UNIDADES, estiloCategoria } from '../lib/constantes'
import { clave, personasEquivalentes, redondea } from '../lib/cantidades'
import { cantidad, numero } from '../lib/formato'
import { descarga, generaCSV, nombreArchivo } from '../lib/exportar'
import { Boton, BotonIcono } from '../components/ui/Boton'
import { AreaTexto, Campo, Casilla, Entrada, Interruptor, Lista } from '../components/ui/Campos'
import { Confirmar, Modal } from '../components/ui/Modal'
import { AvisoError, Cargando, Etiqueta, Tarjeta, Vacio } from '../components/ui/Varios'
import type { MasterItem, ShoppingItem } from '../lib/types'

export function ListaMaestra() {
  const { esAdmin } = useAuth()
  const { ajustes } = useGrupo()
  const avisos = useAvisos()
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<{ item: MasterItem | null } | null>(null)
  const [borrando, setBorrando] = useState<MasterItem | null>(null)
  const [mejorando, setMejorando] = useState(false)
  const [enCurso, setEnCurso] = useState(false)

  const { datos, cargando, error, refrescar } = useConsulta<MasterItem[]>(
    async () => {
      const { data, error: err } = await supabase
        .from('master_items')
        .select('*')
        .order('category')
        .order('sort_order')
        .order('name')
      if (err) throw err
      return (data ?? []) as MasterItem[]
    },
    [],
    { realtime: ['master_items'] },
  )

  const lista = useMemo(() => datos ?? [], [datos])

  const grupos = useMemo(() => {
    const texto = clave(busqueda)
    const filtrados = texto
      ? lista.filter((m) => clave(m.name).includes(texto) || clave(m.category).includes(texto))
      : lista
    const mapa = new Map<string, MasterItem[]>()
    for (const m of filtrados) {
      if (!mapa.has(m.category)) mapa.set(m.category, [])
      mapa.get(m.category)!.push(m)
    }
    return [...mapa.entries()].sort(
      (a, b) => CATEGORIAS.indexOf(a[0] as never) - CATEGORIAS.indexOf(b[0] as never) || a[0].localeCompare(b[0]),
    )
  }, [lista, busqueda])

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('master_items').delete().eq('id', borrando.id)
      if (err) throw err
      await refrescar(true)
      avisos.ok('Producto eliminado de la lista maestra.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  const exportar = () => {
    const filas = lista.map((m) => [
      m.category,
      m.name,
      m.qty != null ? numero(m.qty) : '',
      m.unit,
      numero(m.base_people),
      m.active ? 'Sí' : 'No',
      m.notes ?? '',
    ])
    descarga(
      nombreArchivo('lista-maestra-rural69', 'csv'),
      generaCSV(['Categoría', 'Producto', 'Cantidad', 'Unidad', 'Calculada para', 'Activo', 'Observaciones'], filas),
    )
    avisos.ok('CSV descargado.')
  }

  if (cargando) return <Cargando texto="Cargando la lista maestra…" />

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800 sm:text-3xl">
            <ListChecks size={26} /> Lista maestra
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-carbon/60">
            La lista de siempre, que vamos mejorando escapada tras escapada. De aquí nace la compra de cada viaje.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={exportar} disabled={lista.length === 0}>
            <Download size={17} /> CSV
          </Boton>
          {esAdmin && (
            <>
              <Boton variante="secundario" onClick={() => setMejorando(true)}>
                <Lightbulb size={17} /> Mejorar
              </Boton>
              <Boton onClick={() => setForm({ item: null })}>
                <Plus size={18} /> Producto
              </Boton>
            </>
          )}
        </div>
      </header>

      {error && <AvisoError texto={error} onReintentar={() => void refrescar()} />}

      {!esAdmin && (
        <p className="rounded-2xl border border-arena bg-beige px-4 py-3 text-sm text-carbon/65">
          Solo el administrador puede cambiar la lista maestra. Tú sí puedes modificar la lista de cada escapada.
        </p>
      )}

      {lista.length === 0 ? (
        <Vacio
          emoji="📝"
          titulo="La lista maestra está vacía"
          texto="Añade los productos que compráis siempre con su cantidad habitual. Puedes usar también el archivo supabase/03_seed.sql para cargar una lista completa de golpe."
          accion={
            esAdmin ? (
              <Boton onClick={() => setForm({ item: null })}>
                <Plus size={18} /> Añadir el primero
              </Boton>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="relative">
            <Search size={17} className="absolute top-3.5 left-3.5 text-carbon/35" />
            <Entrada
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto…"
              className="pl-10"
            />
          </div>

          <p className="text-sm text-carbon/55">
            {lista.length} productos · cantidades de referencia para{' '}
            <strong>{numero(ajustes.grupoHabitual)} personas</strong>
          </p>

          <div className="space-y-5">
            {grupos.map(([categoria, items]) => {
              const estilo = estiloCategoria(categoria)
              return (
                <section key={categoria}>
                  <h2
                    className={`mb-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${estilo.clase}`}
                  >
                    <span aria-hidden>{estilo.emoji}</span> {categoria}
                    <span className="opacity-60">({items.length})</span>
                  </h2>
                  <Tarjeta className="divide-y divide-arena overflow-hidden">
                    {items.map((m) => (
                      <div key={m.id} className={`flex items-center gap-3 px-4 py-2.5 ${m.active ? '' : 'opacity-50'}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-carbon">
                            {m.name}
                            {!m.active && <span className="ml-1.5 text-xs text-carbon/50">(desactivado)</span>}
                          </p>
                          {m.notes && <p className="text-xs text-carbon/50">{m.notes}</p>}
                        </div>
                        <span className="shrink-0 text-sm font-bold text-bosque-700">
                          {m.qty != null ? cantidad(m.qty, m.unit) : '—'}
                        </span>
                        {m.base_people !== ajustes.grupoHabitual && (
                          <Etiqueta>para {numero(m.base_people)}</Etiqueta>
                        )}
                        {esAdmin && (
                          <div className="-mr-1 flex shrink-0">
                            <BotonIcono etiqueta="Editar" onClick={() => setForm({ item: m })}>
                              <Pencil size={15} />
                            </BotonIcono>
                            <BotonIcono etiqueta="Eliminar" tono="peligro" onClick={() => setBorrando(m)}>
                              <Trash2 size={15} />
                            </BotonIcono>
                          </div>
                        )}
                      </div>
                    ))}
                  </Tarjeta>
                </section>
              )
            })}
          </div>
        </>
      )}

      <FormularioMaestro
        abierto={Boolean(form)}
        onCerrar={() => setForm(null)}
        item={form?.item ?? null}
        grupoHabitual={ajustes.grupoHabitual}
        siguienteOrden={lista.length * 10}
        onHecho={() => void refrescar(true)}
      />
      <DialogoMejorarMaestra
        abierto={mejorando}
        onCerrar={() => setMejorando(false)}
        maestros={lista}
        grupoHabitual={ajustes.grupoHabitual}
        onHecho={() => void refrescar(true)}
      />
      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Eliminar «${borrando?.name}» de la lista maestra?`}
        texto="Las listas de escapadas anteriores no se modifican."
        textoAceptar="Sí, eliminar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------
// Formulario de producto de la lista maestra
// ---------------------------------------------------------------------
function FormularioMaestro({
  abierto,
  onCerrar,
  item,
  grupoHabitual,
  siguienteOrden,
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  item: MasterItem | null
  grupoHabitual: number
  siguienteOrden: number
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('Otros')
  const [qty, setQty] = useState('1')
  const [unidad, setUnidad] = useState('ud')
  const [basePersonas, setBasePersonas] = useState(String(grupoHabitual))
  const [notas, setNotas] = useState('')
  const [activo, setActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setNombre(item?.name ?? '')
    setCategoria(item?.category ?? 'Otros')
    setQty(item?.qty != null ? String(item.qty) : '1')
    setUnidad(item?.unit ?? 'ud')
    setBasePersonas(String(item?.base_people ?? grupoHabitual))
    setNotas(item?.notes ?? '')
    setActivo(item?.active ?? true)
  }, [abierto, item, grupoHabitual])

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
        qty: qty.trim() === '' ? null : Number(qty),
        unit: unidad,
        base_people: Number(basePersonas) || grupoHabitual,
        notes: notas.trim() || null,
        active: activo,
      }
      if (item) {
        const { error: err } = await supabase.from('master_items').update(datos).eq('id', item.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('master_items')
          .insert({ ...datos, sort_order: siguienteOrden })
        if (err) throw err
      }
      avisos.ok(item ? 'Producto actualizado.' : 'Producto añadido a la lista maestra.')
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
      titulo={item ? 'Editar producto' : 'Nuevo producto de la lista maestra'}
      ancho="md"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-maestro" cargando={guardando}>
            {item ? 'Guardar' : 'Añadir'}
          </Boton>
        </>
      }
    >
      <form id="form-maestro" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Producto" requerido>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Aceite de oliva" />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cantidad habitual">
            <Entrada
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Calculada para (personas)" ayuda="Grupo de referencia para escalar la cantidad.">
            <Entrada
              type="number"
              min="1"
              step="0.5"
              inputMode="decimal"
              value={basePersonas}
              onChange={(e) => setBasePersonas(e.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Observaciones">
          <AreaTexto value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
        </Campo>

        <div className="rounded-2xl border border-arena bg-white p-4">
          <Interruptor checked={activo} onChange={setActivo} etiqueta="Incluir al generar listas nuevas" />
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

// ---------------------------------------------------------------------
// «Mejorar»: aprende de los cambios hechos en la última escapada
// ---------------------------------------------------------------------
interface Sugerencia {
  tipo: 'cantidad' | 'nuevo'
  item: ShoppingItem
  maestro?: MasterItem
  propuesta: number
  elegida: boolean
}

function DialogoMejorarMaestra({
  abierto,
  onCerrar,
  maestros,
  grupoHabitual,
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  maestros: MasterItem[]
  grupoHabitual: number
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const { escapadas, miembros } = useGrupo()
  const [tripId, setTripId] = useState<string>('')
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null)
  const [guardando, setGuardando] = useState(false)

  const candidatas = useMemo(
    () => escapadas.filter((t) => t.status === 'realizada' || t.status === 'confirmada' || t.status === 'archivada'),
    [escapadas],
  )

  useEffect(() => {
    if (!abierto) return
    setTripId(candidatas[0]?.id ?? escapadas[0]?.id ?? '')
  }, [abierto, candidatas, escapadas])

  useEffect(() => {
    if (!abierto || !tripId) return
    setSugerencias(null)
    void (async () => {
      const [compra, participantes] = await Promise.all([
        supabase.from('shopping_items').select('*').eq('trip_id', tripId),
        supabase.from('trip_participants').select('member_id').eq('trip_id', tripId),
      ])
      const items = (compra.data ?? []) as ShoppingItem[]
      const ids = (participantes.data ?? []).map((r) => r.member_id as string)
      const personas = personasEquivalentes(miembros.filter((m) => ids.includes(m.id))) || grupoHabitual

      const resultado: Sugerencia[] = []
      for (const item of items) {
        const maestro = maestros.find((m) => m.id === item.master_item_id)
        if (maestro) {
          const base = Number(maestro.base_people) || grupoHabitual
          const equivalente = redondea((Number(item.needed_qty) * base) / personas, item.unit)
          const actual = Number(maestro.qty) || 0
          const diferencia = actual > 0 ? Math.abs(equivalente - actual) / actual : 1
          if (equivalente > 0 && diferencia >= 0.1) {
            resultado.push({ tipo: 'cantidad', item, maestro, propuesta: equivalente, elegida: false })
          }
        } else {
          const equivalente = redondea((Number(item.needed_qty) * grupoHabitual) / personas, item.unit)
          if (!maestros.some((m) => clave(m.name) === clave(item.name))) {
            resultado.push({ tipo: 'nuevo', item, propuesta: equivalente, elegida: false })
          }
        }
      }
      setSugerencias(resultado)
    })()
  }, [abierto, tripId, maestros, miembros, grupoHabitual])

  const aplicar = async () => {
    if (!sugerencias) return
    setGuardando(true)
    try {
      const elegidas = sugerencias.filter((s) => s.elegida)
      for (const s of elegidas) {
        if (s.tipo === 'cantidad' && s.maestro) {
          const { error } = await supabase
            .from('master_items')
            .update({ qty: s.propuesta })
            .eq('id', s.maestro.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('master_items').insert({
            name: s.item.name,
            category: s.item.category,
            qty: s.propuesta,
            unit: s.item.unit,
            base_people: grupoHabitual,
            notes: s.item.notes,
            sort_order: 9999,
          })
          if (error) throw error
        }
      }
      avisos.ok(`Lista maestra mejorada con ${elegidas.length} cambios.`)
      onHecho()
      onCerrar()
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const alterna = (i: number) =>
    setSugerencias((prev) => (prev ?? []).map((s, j) => (i === j ? { ...s, elegida: !s.elegida } : s)))

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Mejorar la lista maestra"
      descripcion="Comparamos la lista de una escapada con la maestra y te proponemos los cambios. Tú decides qué se aplica."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cerrar
          </Boton>
          <Boton
            onClick={() => void aplicar()}
            cargando={guardando}
            disabled={!sugerencias?.some((s) => s.elegida)}
          >
            Aplicar {sugerencias?.filter((s) => s.elegida).length ?? 0} cambios
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        <Campo etiqueta="Escapada de referencia">
          <Lista value={tripId} onChange={(e) => setTripId(e.target.value)}>
            {escapadas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Lista>
        </Campo>

        {sugerencias === null ? (
          <Cargando texto="Comparando…" alto="py-8" />
        ) : sugerencias.length === 0 ? (
          <p className="rounded-2xl bg-beige px-4 py-3 text-sm text-carbon/70">
            Esa escapada no aporta novedades: las cantidades coinciden con la lista maestra.
          </p>
        ) : (
          <>
            <div className="flex gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSugerencias((prev) => (prev ?? []).map((s) => ({ ...s, elegida: true })))}
                className="text-bosque-600 hover:underline"
              >
                Marcar todas
              </button>
              <span className="text-carbon/25">·</span>
              <button
                type="button"
                onClick={() => setSugerencias((prev) => (prev ?? []).map((s) => ({ ...s, elegida: false })))}
                className="text-carbon/50 hover:underline"
              >
                Desmarcar
              </button>
            </div>
            <div className="divide-y divide-arena rounded-2xl border border-arena bg-white">
              {sugerencias.map((s, i) => (
                <div key={`${s.item.id}-${s.tipo}`} className="flex items-center gap-3 px-3.5 py-2.5">
                  <Casilla checked={s.elegida} onChange={() => alterna(i)} etiqueta={s.item.name} />
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 text-sm">
                    {s.tipo === 'nuevo' ? (
                      <Etiqueta tono="tierra">nuevo · {cantidad(s.propuesta, s.item.unit)}</Etiqueta>
                    ) : (
                      <>
                        <span className="text-carbon/45 line-through">
                          {cantidad(s.maestro?.qty ?? 0, s.maestro?.unit ?? s.item.unit)}
                        </span>
                        <span aria-hidden>→</span>
                        <Etiqueta tono="bosque">{cantidad(s.propuesta, s.item.unit)}</Etiqueta>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-carbon/50">
              Las cantidades se normalizan al grupo de referencia de {numero(grupoHabitual)} personas.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
