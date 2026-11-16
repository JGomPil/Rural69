import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAvisos } from '../hooks/useAvisos'
import { useConsulta } from '../hooks/useConsulta'
import { useGrupo } from '../hooks/useGrupo'
import { mensajeError, supabase } from '../lib/supabase'
import { CATEGORIAS, UNIDADES, estiloCategoria } from '../lib/constantes'
import { clave } from '../lib/cantidades'
import { cantidad, numero } from '../lib/formato'
import { descarga, generaCSV, nombreArchivo } from '../lib/exportar'
import { listaDeCompraEnPDF } from '../lib/pdf'
import { Boton, BotonIcono } from '../components/ui/Boton'
import { AreaTexto, Campo, Entrada, Interruptor, Lista } from '../components/ui/Campos'
import { Confirmar, Modal } from '../components/ui/Modal'
import { AvisoError, Cargando, Etiqueta, Tarjeta, Vacio } from '../components/ui/Varios'
import type { MasterItem } from '../lib/types'

export function ListaMaestra() {
  const { esAdmin } = useAuth()
  const { ajustes } = useGrupo()
  const avisos = useAvisos()
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<{ item: MasterItem | null } | null>(null)
  const [borrando, setBorrando] = useState<MasterItem | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)

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

  const exportarPDF = async () => {
    if (lista.length === 0) return
    setGenerandoPDF(true)
    try {
      const porCategoria = new Map<string, MasterItem[]>()
      for (const m of lista) {
        if (!porCategoria.has(m.category)) porCategoria.set(m.category, [])
        porCategoria.get(m.category)!.push(m)
      }
      await listaDeCompraEnPDF({
        titulo: 'Rural69 · Lista maestra',
        subtitulo: `Cantidades para ${numero(ajustes.grupoHabitual)} personas`,
        secciones: [...porCategoria.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([categoria, items]) => ({
            titulo: categoria,
            articulos: items.map((m) => ({
              name: m.name,
              buy_qty: m.qty ?? 0,
              unit: m.unit,
              notes: m.notes,
              purchased: false,
            })),
          })),
        nombreFichero: nombreArchivo('lista-maestra-rural69', 'pdf'),
      })
      avisos.ok('PDF descargado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGenerandoPDF(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando la lista maestra…" />

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800 sm:text-3xl">
            <ListChecks size={26} /> Lista maestra
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-suave">
            La lista de siempre, que vamos mejorando escapada tras escapada. De aquí nace la compra de cada viaje.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton
            variante="secundario"
            onClick={() => void exportarPDF()}
            cargando={generandoPDF}
            disabled={lista.length === 0}
          >
            <FileText size={17} /> PDF
          </Boton>
          <Boton variante="secundario" onClick={exportar} disabled={lista.length === 0}>
            <Download size={17} /> CSV
          </Boton>
          {esAdmin && (
            <Boton onClick={() => setForm({ item: null })}>
              <Plus size={18} /> Producto
            </Boton>
          )}
        </div>
      </header>

      {error && <AvisoError texto={error} onReintentar={() => void refrescar()} />}

      {!esAdmin && (
        <p className="rounded-2xl border border-arena bg-beige px-4 py-3 text-sm text-tenue">
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
              aria-label="Buscar producto en la lista maestra"
              className="pl-10"
            />
          </div>

          <p className="text-sm text-suave">
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
                          {/* `break-words`: sin esto un nombre largo de una sola palabra
                              («Champiñones») se sale de su columna y se monta encima de
                              la cantidad, porque nada le da dónde partirlo. */}
                          <p className="font-medium break-words text-carbon">
                            {m.name}
                            {!m.active && <span className="ml-1.5 text-xs text-suave">(desactivado)</span>}
                          </p>
                          {(m.notes || m.base_people !== ajustes.grupoHabitual) && (
                            <p className="text-xs text-suave">
                              {m.notes}
                              {/* En el móvil no cabe la pastilla, así que va aquí. */}
                              {m.base_people !== ajustes.grupoHabitual && (
                                <span className="sm:hidden">
                                  {m.notes && ' · '}
                                  para {numero(m.base_people)}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-right text-sm font-bold text-bosque-700">
                          {m.qty != null ? cantidad(m.qty, m.unit) : '—'}
                        </span>
                        {m.base_people !== ajustes.grupoHabitual && (
                          <span className="hidden shrink-0 sm:block">
                            <Etiqueta>para {numero(m.base_people)}</Etiqueta>
                          </span>
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

        <div className="rounded-2xl border border-arena bg-superficie p-4">
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
