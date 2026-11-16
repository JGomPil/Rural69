import { useMemo, useRef, useState } from 'react'
import {
  Archive,
  Calculator,
  ChevronDown,
  Copy,
  Download,
  FileText,
  HandHeart,
  Pencil,
  Plus,
  Printer,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useConsulta } from '../../hooks/useConsulta'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { nombreMiembro, useGrupo } from '../../hooks/useGrupo'
import { Persona } from '../ui/Persona'
import { mensajeError, supabase } from '../../lib/supabase'
import { cantidad, fecha, numero } from '../../lib/formato'
import { estiloCategoria } from '../../lib/constantes'
import { buscaEnDespensa, clave } from '../../lib/cantidades'
import { descarga, generaCSV, nombreArchivo } from '../../lib/exportar'
import { listaDeCompraEnPDF } from '../../lib/pdf'
import { Boton, BotonIcono } from '../ui/Boton'
import { Casilla, Contador, Entrada } from '../ui/Campos'
import { Confirmar } from '../ui/Modal'
import { AvisoError, Cargando, Etiqueta, Progreso, Tarjeta, Vacio } from '../ui/Varios'
import { DialogoDespensa, DialogoGenerarLista, DialogoRecalcular } from './DialogosCompra'
import { DialogoProducto } from './DialogoProducto'
import { DialogoTiempos, emojiTiempo } from './Tiempos'
import type { PantryItem, ShoppingItem, TripMeal } from '../../lib/types'

type Filtro = 'pendientes' | 'comprados' | 'todos'
/** Cómo se agrupa la lista en pantalla. */
type Agrupar = 'categoria' | 'tiempo'
/** `null` en el filtro de tiempo = todos; `'comun'` = los que no son de ningún tiempo. */
type FiltroTiempo = string | null

export function ListaCompra() {
  const { escapada, participantes, personas } = useEscapada()
  const { miembros } = useGrupo()
  const { perfil } = useAuth()
  const avisos = useAvisos()

  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const [agrupar, setAgrupar] = useState<Agrupar>('categoria')
  const [filtroTiempo, setFiltroTiempo] = useState<FiltroTiempo>(null)
  const [gestionandoTiempos, setGestionandoTiempos] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [ocultarListas, setOcultarListas] = useState(false)
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set())
  const [generando, setGenerando] = useState(false)
  const [revisandoDespensa, setRevisandoDespensa] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [editando, setEditando] = useState<ShoppingItem | null>(null)
  const [anyadiendo, setAnyadiendo] = useState(false)
  const [borrando, setBorrando] = useState<ShoppingItem | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const temporizadores = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const {
    datos: items,
    cargando,
    error,
    refrescar,
    setDatos,
  } = useConsulta<ShoppingItem[]>(
    async () => {
      const { data, error: err } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('trip_id', escapada.id)
        .order('category')
        .order('sort_order')
        .order('name')
      if (err) throw err
      return (data ?? []) as ShoppingItem[]
    },
    [escapada.id],
    { realtime: ['shopping_items'] },
  )

  const { datos: tiempos, refrescar: refrescarTiempos } = useConsulta<TripMeal[]>(
    async () => {
      const { data, error: err } = await supabase
        .from('trip_meals')
        .select('*')
        .eq('trip_id', escapada.id)
        .order('sort_order')
        .order('day')
      if (err) throw err
      return (data ?? []) as TripMeal[]
    },
    [escapada.id],
    { realtime: ['trip_meals'] },
  )

  const { datos: despensa, refrescar: refrescarDespensa } = useConsulta<PantryItem[]>(
    async () => {
      const { data, error: err } = await supabase.from('pantry_items').select('*').gt('qty', 0)
      if (err) throw err
      return (data ?? []) as PantryItem[]
    },
    [],
    { realtime: ['pantry_items'] },
  )

  const lista = useMemo(() => items ?? [], [items])
  const listaTiempos = useMemo(() => tiempos ?? [], [tiempos])
  const tiempoPorId = useMemo(() => new Map(listaTiempos.map((t) => [t.id, t])), [listaTiempos])
  const comprados = lista.filter((i) => i.purchased).length

  const coincidenciasDespensa = useMemo(() => {
    if (!despensa?.length) return 0
    return lista.filter((i) => i.available_qty === 0 && buscaEnDespensa(i, despensa)).length
  }, [lista, despensa])

  // ---------- Guardado con pequeño retardo para los +/− ----------
  const guarda = (id: string, campos: Partial<ShoppingItem>, retardo = 0) => {
    setDatos((prev) => (prev ?? []).map((i) => (i.id === id ? { ...i, ...campos } : i)))
    clearTimeout(temporizadores.current[id])
    temporizadores.current[id] = setTimeout(() => {
      void supabase
        .from('shopping_items')
        .update(campos)
        .eq('id', id)
        .then(({ error: err }) => {
          if (err) {
            avisos.error(mensajeError(err))
            void refrescar(true)
          }
        })
    }, retardo)
  }

  const duplicar = async (item: ShoppingItem) => {
    try {
      const { id: _id, created_at: _created, ...resto } = item
      const { error: err } = await supabase
        .from('shopping_items')
        .insert({ ...resto, name: `${item.name} (2)`, purchased: false, sort_order: item.sort_order + 1 })
      if (err) throw err
      await refrescar(true)
      avisos.ok('Producto duplicado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('shopping_items').delete().eq('id', borrando.id)
      if (err) throw err
      await refrescar(true)
      avisos.ok('Producto eliminado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  const vaciar = async () => {
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('shopping_items').delete().eq('trip_id', escapada.id)
      if (err) throw err
      await refrescar(true)
      avisos.ok('Lista vaciada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
    }
  }

  const exportar = () => {
    const filas = lista.map((i) => [
      tiempoPorId.get(i.meal_id ?? '')?.name ?? 'Compra común',
      i.category,
      i.name,
      numero(i.buy_qty),
      i.unit,
      numero(i.needed_qty),
      numero(i.available_qty),
      i.purchased ? 'Sí' : 'No',
      nombreMiembro(miembros, i.assigned_to) ?? '',
      i.notes ?? '',
    ])
    descarga(
      nombreArchivo(`compra-${escapada.title}`, 'csv'),
      generaCSV(
        [
          'Tiempo',
          'Categoría',
          'Producto',
          'A comprar',
          'Unidad',
          'Necesaria',
          'Ya tenemos',
          'Comprado',
          'Encargado',
          'Observaciones',
        ],
        filas,
      ),
    )
    avisos.ok('CSV descargado.')
  }

  // ---------- Filtrado y agrupación ----------

  /** Lo que se ve ahora mismo: el filtro de tiempo manda sobre todo lo demás. */
  const enElTiempo = useMemo(() => {
    if (filtroTiempo === null) return lista
    if (filtroTiempo === 'comun') return lista.filter((i) => !i.meal_id)
    return lista.filter((i) => i.meal_id === filtroTiempo)
  }, [lista, filtroTiempo])

  const visibles = useMemo(() => {
    const texto = clave(busqueda)
    return enElTiempo.filter((i) => {
      if (filtro === 'pendientes' && i.purchased) return false
      if (filtro === 'comprados' && !i.purchased) return false
      if (texto && !clave(i.name).includes(texto) && !clave(i.category).includes(texto)) return false
      return true
    })
  }, [enElTiempo, filtro, busqueda])

  const grupos = useMemo(() => {
    const porClave = new Map<string, ShoppingItem[]>()
    for (const i of visibles) {
      const k = agrupar === 'categoria' ? i.category : (i.meal_id ?? 'comun')
      if (!porClave.has(k)) porClave.set(k, [])
      porClave.get(k)!.push(i)
    }

    const hechos = (k: string) => {
      const todos =
        agrupar === 'categoria'
          ? lista.filter((i) => i.category === k)
          : lista.filter((i) => (i.meal_id ?? 'comun') === k)
      return todos.length > 0 && todos.every((i) => i.purchased)
    }

    if (agrupar === 'categoria') {
      return [...porClave.entries()]
        .map(([k, articulos]) => {
          const estilo = estiloCategoria(k)
          return {
            clave: k,
            titulo: k,
            emoji: estilo.emoji,
            claseEmoji: estilo.clase,
            tiempo: null as TripMeal | null,
            articulos,
            completada: hechos(k),
          }
        })
        .filter((g) => !(ocultarListas && g.completada))
        .sort((a, b) => a.titulo.localeCompare(b.titulo))
    }

    // Por tiempos: respetamos el orden de los tiempos y la común va la última.
    const orden = [...listaTiempos.map((t) => t.id), 'comun']
    return orden
      .filter((k) => porClave.has(k))
      .map((k) => {
        const tiempo = k === 'comun' ? null : (tiempoPorId.get(k) ?? null)
        return {
          clave: k,
          titulo: tiempo?.name ?? 'Compra común',
          emoji: tiempo ? emojiTiempo(tiempo.kind) : '🧺',
          claseEmoji: 'bg-bosque-50',
          tiempo,
          articulos: porClave.get(k)!,
          completada: hechos(k),
        }
      })
      .filter((g) => !(ocultarListas && g.completada))
  }, [visibles, lista, listaTiempos, tiempoPorId, agrupar, ocultarListas])

  // ---------- PDF ----------
  const tituloDeLoQueSeVe = () => {
    if (filtroTiempo === 'comun') return 'Compra común'
    if (filtroTiempo) return tiempoPorId.get(filtroTiempo)?.name ?? 'Compra'
    return 'Lista de la compra'
  }

  const exportarPDF = async () => {
    if (visibles.length === 0) {
      avisos.error('No hay nada que llevarse al PDF con estos filtros.')
      return
    }
    setGenerandoPDF(true)
    try {
      const encargadoDe = (g: (typeof grupos)[number]) => {
        const id = g.tiempo?.assigned_to
        const quien = id ? nombreMiembro(miembros, id) : null
        return quien ? `Compra: ${quien}` : undefined
      }
      await listaDeCompraEnPDF({
        titulo: `${escapada.title} · ${tituloDeLoQueSeVe()}`,
        subtitulo: [
          filtro === 'pendientes' ? 'Solo lo pendiente' : filtro === 'comprados' ? 'Solo lo comprado' : null,
          `${numero(personas)} personas equivalentes`,
        ]
          .filter(Boolean)
          .join(' · '),
        secciones: grupos.map((g) => ({
          titulo: g.titulo,
          subtitulo: agrupar === 'tiempo' ? encargadoDe(g) : undefined,
          articulos: g.articulos.map((i) => ({
            name: i.name,
            buy_qty: Number(i.buy_qty),
            unit: i.unit,
            notes: i.notes,
            purchased: i.purchased,
          })),
        })),
        nombreFichero: nombreArchivo(`compra-${escapada.title}-${tituloDeLoQueSeVe()}`, 'pdf'),
      })
      avisos.ok('PDF descargado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGenerandoPDF(false)
    }
  }

  /** Apuntarse a hacer la compra de un tiempo entero. */
  const meEncargo = async (tiempo: TripMeal, miembroId: string | null) => {
    try {
      const { error: err } = await supabase
        .from('trip_meals')
        .update({ assigned_to: miembroId })
        .eq('id', tiempo.id)
      if (err) throw err
      await refrescarTiempos(true)
      avisos.ok(miembroId ? `Te encargas de «${tiempo.name}».` : 'Tiempo liberado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  if (cargando) return <Cargando texto="Cargando la compra…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  if (lista.length === 0) {
    return (
      <>
        <Vacio
          emoji="🛒"
          titulo="La lista de la compra está vacía"
          texto="Genérala a partir de la lista maestra del grupo y ajusta lo que haga falta. También puedes añadir productos uno a uno."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Boton onClick={() => setGenerando(true)}>
                <Sparkles size={18} /> Generar desde la lista maestra
              </Boton>
              <Boton variante="secundario" onClick={() => setAnyadiendo(true)}>
                <Plus size={18} /> Añadir producto
              </Boton>
            </div>
          }
        />
        <DialogoGenerarLista
          abierto={generando}
          onCerrar={() => setGenerando(false)}
          tripId={escapada.id}
          personas={personas || 1}
          yaExisten={lista}
          onHecho={() => void refrescar(true)}
        />
        <DialogoProducto
          abierto={anyadiendo}
          onCerrar={() => setAnyadiendo(false)}
          tripId={escapada.id}
          participantes={participantes}
          tiempos={listaTiempos}
          siguienteOrden={0}
          onHecho={() => void refrescar(true)}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* -------- Cabecera con progreso -------- */}
      <Tarjeta className="p-4">
        <Progreso valor={comprados} total={lista.length} etiqueta="Productos marcados" />
        <div className="no-imprimir mt-3.5 flex flex-wrap gap-2">
          <Boton tamanyo="sm" onClick={() => setAnyadiendo(true)}>
            <Plus size={16} /> Producto
          </Boton>
          <Boton tamanyo="sm" variante="secundario" onClick={() => setGenerando(true)}>
            <Sparkles size={16} /> Lista maestra
          </Boton>
          <Boton tamanyo="sm" variante="secundario" onClick={() => setRecalculando(true)}>
            <Calculator size={16} /> Recalcular ({numero(personas)} pers.)
          </Boton>
          <Boton
            tamanyo="sm"
            variante={coincidenciasDespensa > 0 ? 'acento' : 'secundario'}
            onClick={() => setRevisandoDespensa(true)}
          >
            <Archive size={16} /> Despensa
            {coincidenciasDespensa > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 text-xs">{coincidenciasDespensa}</span>
            )}
          </Boton>
          <Boton tamanyo="sm" variante="secundario" onClick={() => setGestionandoTiempos(true)}>
            <UtensilsCrossed size={16} /> Tiempos
            {listaTiempos.length > 0 && (
              <span className="rounded-full bg-bosque-50 px-1.5 text-xs text-bosque-700">
                {listaTiempos.length}
              </span>
            )}
          </Boton>
          <Boton tamanyo="sm" variante="secundario" onClick={() => void exportarPDF()} cargando={generandoPDF}>
            <FileText size={16} /> PDF
          </Boton>
          <Boton tamanyo="sm" variante="secundario" onClick={exportar}>
            <Download size={16} /> CSV
          </Boton>
          <Boton tamanyo="sm" variante="secundario" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Boton>
        </div>
      </Tarjeta>

      {/* -------- Filtros -------- */}
      <div className="no-imprimir space-y-2.5">
        <div className="relative">
          <Search size={17} className="absolute top-3.5 left-3.5 text-carbon/35" />
          <Entrada
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 rounded-2xl bg-beige p-1">
            {(
              [
                ['pendientes', `Pendientes (${lista.length - comprados})`],
                ['comprados', `Comprados (${comprados})`],
                ['todos', 'Todos'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold whitespace-nowrap transition sm:text-sm ${
                  filtro === valor ? 'bg-superficie text-bosque-700 shadow-sm' : 'text-suave'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOcultarListas((v) => !v)}
            className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${
              ocultarListas ? 'border-bosque-500 bg-bosque-50 text-bosque-700' : 'border-arena bg-superficie text-suave'
            }`}
          >
            Ocultar lo que ya está
          </button>
        </div>

        {/* Qué parte de la compra se mira */}
        {listaTiempos.length > 0 && (
          <div className="scroll-oculto -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            <ChipTiempo activo={filtroTiempo === null} onClick={() => setFiltroTiempo(null)}>
              Toda la compra ({lista.length})
            </ChipTiempo>
            {listaTiempos.map((tm) => {
              const cuantos = lista.filter((i) => i.meal_id === tm.id).length
              return (
                <ChipTiempo key={tm.id} activo={filtroTiempo === tm.id} onClick={() => setFiltroTiempo(tm.id)}>
                  {emojiTiempo(tm.kind)} {tm.name} ({cuantos})
                </ChipTiempo>
              )
            })}
            <ChipTiempo activo={filtroTiempo === 'comun'} onClick={() => setFiltroTiempo('comun')}>
              🧺 Común ({lista.filter((i) => !i.meal_id).length})
            </ChipTiempo>
          </div>
        )}

        {/* Cómo se agrupa */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-suave">Agrupar por</span>
          {(
            [
              ['categoria', 'Categorías'],
              ['tiempo', 'Tiempos'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setAgrupar(valor)}
              className={`rounded-full px-3 py-1 font-bold transition ${
                agrupar === valor ? 'bg-bosque-600 text-tinta-fuerte' : 'bg-superficie text-suave hover:bg-beige'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {/* -------- Lista agrupada -------- */}
      {grupos.length === 0 ? (
        <Vacio
          emoji="🎉"
          titulo={filtro === 'pendientes' ? '¡No queda nada pendiente!' : 'Nada que mostrar'}
          texto={filtro === 'pendientes' ? 'Todo marcado. Buen trabajo.' : 'Prueba a cambiar el filtro o la búsqueda.'}
        />
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo) => {
            const { clave: k, titulo, emoji, claseEmoji, tiempo, articulos, completada } = grupo
            const plegada = plegadas.has(k)
            const yoMiembro = perfil?.member_id ?? null
            const seEncargaAlguien = tiempo?.assigned_to ?? null
            return (
              <Tarjeta key={k} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setPlegadas((prev) => {
                      const copia = new Set(prev)
                      if (copia.has(k)) copia.delete(k)
                      else copia.add(k)
                      return copia
                    })
                  }
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-beige/60"
                >
                  <span className={`flex size-8 items-center justify-center rounded-xl text-base ${claseEmoji}`} aria-hidden>
                    {emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block truncate text-base text-bosque-800">{titulo}</span>
                    <span className="block text-xs text-suave">
                      {articulos.filter((i) => i.purchased).length}/{articulos.length} marcados
                      {tiempo?.day && ` · ${fecha(tiempo.day)}`}
                      {tiempo?.notes && ` · ${tiempo.notes}`}
                    </span>
                  </span>
                  {seEncargaAlguien && <Persona miembroId={seEncargaAlguien} />}
                  {completada && <Etiqueta tono="oliva">lista ✔</Etiqueta>}
                  <ChevronDown
                    size={18}
                    className={`no-imprimir shrink-0 text-carbon/35 transition ${plegada ? '-rotate-90' : ''}`}
                  />
                </button>

                {/* Apuntarse a hacer la compra de este tiempo */}
                {tiempo && yoMiembro && (
                  <div className="no-imprimir flex items-center gap-2 border-t border-arena bg-beige/40 px-4 py-2">
                    {seEncargaAlguien === yoMiembro ? (
                      <>
                        <span className="flex-1 text-xs font-semibold text-bosque-700">
                          Te encargas tú de esta compra.
                        </span>
                        <button
                          type="button"
                          onClick={() => void meEncargo(tiempo, null)}
                          className="text-xs font-semibold text-suave hover:text-tierra-600 hover:underline"
                        >
                          Ya no
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-xs text-suave">
                          {seEncargaAlguien ? 'Lo lleva otra persona.' : 'Nadie se ha apuntado a esta compra.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void meEncargo(tiempo, yoMiembro)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-bosque-600 hover:underline"
                        >
                          <HandHeart size={14} /> Me encargo yo
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!plegada && (
                  <ul className="divide-y divide-arena border-t border-arena">
                    {articulos.map((item) => (
                      <FilaProducto
                        key={item.id}
                        item={item}
                        encargado={item.assigned_to}
                        tiempo={agrupar === 'categoria' ? (tiempoPorId.get(item.meal_id ?? '') ?? null) : null}
                        onMarcar={(v) => guarda(item.id, { purchased: v })}
                        onCantidad={(v) => guarda(item.id, { buy_qty: v }, 600)}
                        onEditar={() => setEditando(item)}
                        onDuplicar={() => void duplicar(item)}
                        onBorrar={() => setBorrando(item)}
                      />
                    ))}
                  </ul>
                )}
              </Tarjeta>
            )
          })}
        </div>
      )}

      <div className="no-imprimir flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setBorrando({ ...lista[0], id: '__todos__', name: 'toda la lista' })}
          className="text-xs font-semibold text-suave hover:text-tierra-600 hover:underline"
        >
          Vaciar la lista de esta escapada
        </button>
      </div>

      {/* -------- Diálogos -------- */}
      <DialogoGenerarLista
        abierto={generando}
        onCerrar={() => setGenerando(false)}
        tripId={escapada.id}
        personas={personas || 1}
        yaExisten={lista}
        tiempos={listaTiempos}
        onHecho={() => void refrescar(true)}
      />
      <DialogoTiempos
        abierto={gestionandoTiempos}
        onCerrar={() => setGestionandoTiempos(false)}
        escapada={escapada}
        tiempos={listaTiempos}
        participantes={participantes}
        onHecho={() => void refrescarTiempos(true)}
      />
      <DialogoDespensa
        abierto={revisandoDespensa}
        onCerrar={() => setRevisandoDespensa(false)}
        items={lista}
        despensa={despensa ?? []}
        onHecho={() => {
          void refrescar(true)
          void refrescarDespensa(true)
        }}
      />
      <DialogoRecalcular
        abierto={recalculando}
        onCerrar={() => setRecalculando(false)}
        items={lista}
        personas={personas || 1}
        onHecho={() => void refrescar(true)}
      />
      <DialogoProducto
        abierto={anyadiendo || Boolean(editando)}
        onCerrar={() => {
          setAnyadiendo(false)
          setEditando(null)
        }}
        tripId={escapada.id}
        item={editando}
        participantes={participantes}
        tiempos={listaTiempos}
        tiempoPorDefecto={filtroTiempo === 'comun' ? null : filtroTiempo}
        siguienteOrden={lista.length}
        onHecho={() => void refrescar(true)}
      />
      <Confirmar
        abierto={Boolean(borrando)}
        titulo={borrando?.id === '__todos__' ? '¿Vaciar toda la lista?' : `¿Quitar «${borrando?.name}»?`}
        texto={
          borrando?.id === '__todos__'
            ? 'Se borrarán todos los productos de la lista de esta escapada. La lista maestra no se toca.'
            : undefined
        }
        textoAceptar="Sí, quitar"
        cargando={enCurso}
        onAceptar={() => void (borrando?.id === '__todos__' ? vaciar() : borrar())}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  )
}

/** Píldora del selector de «qué parte de la compra estoy mirando». */
function ChipTiempo({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
        activo
          ? 'border-bosque-600 bg-bosque-600 text-tinta-fuerte shadow-sm'
          : 'border-arena bg-superficie text-suave hover:bg-beige'
      }`}
    >
      {children}
    </button>
  )
}

function FilaProducto({
  item,
  encargado,
  tiempo,
  onMarcar,
  onCantidad,
  onEditar,
  onDuplicar,
  onBorrar,
}: {
  item: ShoppingItem
  encargado: string | null
  /** Solo se pinta al agrupar por categorías: agrupando por tiempos ya se sabe. */
  tiempo: TripMeal | null
  onMarcar: (v: boolean) => void
  onCantidad: (v: number) => void
  onEditar: () => void
  onDuplicar: () => void
  onBorrar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <li className={`px-3 py-2.5 transition ${item.purchased ? 'bg-beige/40' : ''}`}>
      <div className="flex items-center gap-3">
        <Casilla
          grande
          checked={item.purchased}
          onChange={onMarcar}
          etiqueta={
            <span className={item.purchased ? 'text-suave line-through' : ''}>
              {item.name}
              {item.available_qty > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-oliva-700">
                  (ya hay {cantidad(item.available_qty, item.unit)})
                </span>
              )}
            </span>
          }
          descripcion={
            encargado || item.notes || tiempo ? (
              <>
                {tiempo && (
                  <span className="font-semibold text-bosque-600">
                    {emojiTiempo(tiempo.kind)} {tiempo.name}
                  </span>
                )}
                {encargado && <Persona miembroId={encargado} />}
                {item.notes && <span>{item.notes}</span>}
              </>
            ) : undefined
          }
        />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div className="no-imprimir">
            <Contador
              valor={Number(item.buy_qty)}
              onChange={onCantidad}
              paso={Number(item.buy_qty) < 2 ? 0.5 : 1}
              sufijo={item.unit}
            />
          </div>
          <span className="hidden text-sm font-bold text-bosque-700 print:inline">
            {cantidad(item.buy_qty, item.unit)}
          </span>
          <BotonIcono
            etiqueta="Más opciones"
            className="no-imprimir"
            onClick={() => setAbierto((v) => !v)}
          >
            <ShoppingBasket size={16} />
          </BotonIcono>
        </div>
      </div>

      {abierto && (
        <div className="no-imprimir mt-2 flex flex-wrap items-center gap-2 border-t border-arena pt-2 pl-10">
          <span className="text-xs text-suave">
            Necesaria {cantidad(item.needed_qty, item.unit)} · ya hay {cantidad(item.available_qty, item.unit)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <BotonIcono etiqueta="Editar producto" onClick={onEditar}>
              <Pencil size={15} />
            </BotonIcono>
            <BotonIcono etiqueta="Duplicar producto" onClick={onDuplicar}>
              <Copy size={15} />
            </BotonIcono>
            <BotonIcono etiqueta="Quitar producto" tono="peligro" onClick={onBorrar}>
              <Trash2 size={15} />
            </BotonIcono>
          </div>
        </div>
      )}
    </li>
  )
}
