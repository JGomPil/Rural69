import { useMemo, useState } from 'react'
import { ChefHat, CookingPot, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAvisos } from '../hooks/useAvisos'
import { useConsulta } from '../hooks/useConsulta'
import { mensajeError, supabase } from '../lib/supabase'
import { numero } from '../lib/formato'
import { TIPOS } from '../components/trip/Tiempos'
import { Boton, BotonIcono } from '../components/ui/Boton'
import { AreaTexto, Campo, Entrada, Lista } from '../components/ui/Campos'
import { Confirmar, Modal } from '../components/ui/Modal'
import { AvisoError, Cargando, Etiqueta, Seccion, Tarjeta, Vacio } from '../components/ui/Varios'
import { CATEGORIAS, UNIDADES } from '../lib/constantes'
import type { Dish, DishItem, MasterItem, TipoTiempo } from '../lib/types'

/**
 * El recetario del grupo.
 *
 * Es la pieza que faltaba entre «cena del sábado» y «comprar dos kilos de
 * arroz»: un plato con sus ingredientes para un número de personas de
 * referencia. Se guarda aparte de las escapadas, como la lista maestra,
 * porque la paella es la misma todos los años y escribirla otra vez cada
 * vez no tiene ningún sentido.
 *
 * Lo escribe cualquiera del grupo: es un cuaderno de cocina compartido, no
 * un catálogo que haya que pedir permiso para tocar.
 */
export function Recetario() {
  const { perfil, esAdmin } = useAuth()
  const avisos = useAvisos()
  const [editando, setEditando] = useState<Dish | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Dish | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [filtro, setFiltro] = useState<TipoTiempo | 'todos'>('todos')
  // Buscar también por ingrediente: «¿en qué platos entra el pimentón?» es
  // justo la pregunta que uno le hace a un recetario.
  const [busqueda, setBusqueda] = useState('')

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [platos, ingredientes] = await Promise.all([
        supabase.from('dishes').select('*').order('kind').order('sort_order').order('name'),
        supabase.from('dish_items').select('*').order('sort_order'),
      ])
      if (platos.error) throw platos.error
      if (ingredientes.error) throw ingredientes.error
      return {
        platos: (platos.data ?? []) as Dish[],
        ingredientes: (ingredientes.data ?? []) as DishItem[],
      }
    },
    [],
    { realtime: ['dishes', 'dish_items'] },
  )

  const porPlato = useMemo(() => {
    const mapa = new Map<string, DishItem[]>()
    for (const i of datos?.ingredientes ?? []) {
      const lista = mapa.get(i.dish_id)
      if (lista) lista.push(i)
      else mapa.set(i.dish_id, [i])
    }
    return mapa
  }, [datos])

  const texto = clave(busqueda)

  const visibles = (datos?.platos ?? []).filter((p) => {
    if (filtro !== 'todos' && p.kind !== filtro) return false
    if (!texto) return true
    if (clave(p.name).includes(texto)) return true
    if (p.notes && clave(p.notes).includes(texto)) return true
    return (porPlato.get(p.id) ?? []).some((i) => clave(i.name).includes(texto))
  })

  /**
   * Los ingredientes por los que ha salido este plato.
   *
   * Hace falta decirlo: la tarjeta solo enseña los seis primeros, así que
   * buscar «pimentón» y ver aparecer un plato sin ninguna pista de por qué
   * parecería un error de la aplicación.
   */
  const porQueSale = (platoId: string, nombre: string): string[] => {
    if (!texto || clave(nombre).includes(texto)) return []
    return (porPlato.get(platoId) ?? []).filter((i) => clave(i.name).includes(texto)).map((i) => i.name)
  }

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('dishes').delete().eq('id', borrando.id)
      if (err) throw err
      setBorrando(null)
      await refrescar(true)
      avisos.ok('Plato borrado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando el recetario…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  return (
    <div className="space-y-5">
      <Seccion
        titulo="Recetario"
        icono={<ChefHat size={22} />}
        accion={
          <Boton onClick={() => setEditando('nuevo')}>
            <Plus size={17} /> Nuevo plato
          </Boton>
        }
      >
        <p className="medida text-sm text-tenue">
          Los platos del grupo, con sus ingredientes. Se guardan aquí, aparte de las escapadas, porque la
          paella es la misma todos los años. De aquí sale la compra de cada comida.
        </p>
      </Seccion>

      <div className="relative">
        <Search size={17} className="absolute top-3.5 left-3.5 text-carbon/35" />
        <Entrada
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar un plato o un ingrediente…"
          aria-label="Buscar en el recetario"
          className="pl-10"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            aria-label="Dejar de buscar"
            className="absolute top-2.5 right-2.5 inline-flex size-7 items-center justify-center rounded-lg text-suave transition hover:bg-black/5"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="scroll-oculto -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {([{ valor: 'todos', texto: 'Todos', emoji: '🍽️' }, ...TIPOS] as const).map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setFiltro(t.valor as TipoTiempo | 'todos')}
            className={`rounded-2xl px-3.5 py-2 text-sm font-bold whitespace-nowrap transition ${
              filtro === t.valor ? 'bg-bosque-600 text-tinta-fuerte' : 'bg-superficie text-suave hover:bg-beige'
            }`}
          >
            {t.emoji} {t.texto}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Vacio
          emoji="🥘"
          titulo={
            texto
              ? `Ningún plato con «${busqueda.trim()}»`
              : filtro === 'todos'
                ? 'El recetario está vacío'
                : 'Ningún plato de este tipo'
          }
          texto={
            texto
              ? 'Se busca en el nombre, en las notas y en los ingredientes.'
              : 'Apunta un plato con sus ingredientes y podrás ponerlo en la cena de cualquier escapada.'
          }
          accion={
            texto ? (
              <Boton variante="secundario" onClick={() => setBusqueda('')}>
                Quitar la búsqueda
              </Boton>
            ) : (
              <Boton tamanyo="lg" onClick={() => setEditando('nuevo')}>
                <Plus size={19} /> Apuntar el primero
              </Boton>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map((plato) => {
            const ingredientes = porPlato.get(plato.id) ?? []
            const puedeBorrar = esAdmin || plato.created_by === perfil?.id
            const tipo = TIPOS.find((t) => t.valor === plato.kind)
            return (
              <Tarjeta key={plato.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base text-bosque-800">
                    {tipo?.emoji} {plato.name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1">
                    <BotonIcono etiqueta="Editar plato" onClick={() => setEditando(plato)}>
                      <Pencil size={15} />
                    </BotonIcono>
                    {puedeBorrar && (
                      <BotonIcono etiqueta="Borrar plato" tono="peligro" onClick={() => setBorrando(plato)}>
                        <Trash2 size={15} />
                      </BotonIcono>
                    )}
                  </div>
                </div>

                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-suave">
                  <Etiqueta tono="oliva">{tipo?.texto ?? plato.kind}</Etiqueta>
                  <span className="cifras flex items-center gap-1">
                    <Users size={13} /> para {numero(plato.base_people)}
                  </span>
                  <span>
                    · {ingredientes.length} {ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'}
                  </span>
                </p>

                {porQueSale(plato.id, plato.name).length > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-oliva-700">
                    Lleva {porQueSale(plato.id, plato.name).join(', ')}
                  </p>
                )}

                {plato.notes && <p className="mt-1.5 text-sm text-tenue">{plato.notes}</p>}

                {ingredientes.length > 0 && (
                  <ul className="mt-2.5 space-y-0.5 text-sm text-tenue">
                    {ingredientes.slice(0, 6).map((i) => (
                      <li key={i.id} className="flex justify-between gap-2">
                        <span className="truncate">{i.name}</span>
                        <span className="cifras shrink-0 text-suave">
                          {i.qty ? `${numero(i.qty)} ${i.unit}` : '—'}
                        </span>
                      </li>
                    ))}
                    {ingredientes.length > 6 && (
                      <li className="text-xs text-suave">y {ingredientes.length - 6} más…</li>
                    )}
                  </ul>
                )}
              </Tarjeta>
            )
          })}
        </div>
      )}

      <p className="medida mx-auto text-center text-xs text-suave">
        Las cantidades son para el número de personas que diga cada plato. Al pasarlas a la compra de una
        escapada se escalan al grupo que vaya, y ahí se pueden retocar a mano.
      </p>

      {editando && (
        <FormularioPlato
          plato={editando === 'nuevo' ? null : editando}
          ingredientes={editando === 'nuevo' ? [] : (porPlato.get(editando.id) ?? [])}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null)
            await refrescar(true)
          }}
        />
      )}

      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Borrar «${borrando?.name}»?`}
        texto="Se borran también sus ingredientes. Lo que ya esté en la lista de la compra de una escapada se queda."
        textoAceptar="Sí, borrar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------

/** Un ingrediente mientras se edita, antes de guardarlo. */
interface Fila {
  id?: string
  master_item_id: string | null
  name: string
  category: string
  qty: string
  unit: string
}

/**
 * El nombre como se compara: sin espacios de más, sin mayúsculas y sin
 * tildes. Lo de las tildes es a propósito: quien escribe «platano» con prisa
 * se refiere al «Plátano» que ya está en la lista, y crear los dos es
 * exactamente lo que queremos evitar.
 */
function clave(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Apunta en la lista maestra los ingredientes que no vengan de ella y
 * devuelve el id de cada producto por su nombre comparable.
 *
 * Busca antes de dar de alta: si «Garrofón» ya estaba y alguien lo escribió a
 * mano en vez de elegirlo del desplegable, se enlaza con el que hay. Solo se
 * da de alta lo que de verdad no existe, y con las personas de referencia del
 * plato, que es para cuántos son esas cantidades.
 *
 * Mira también los que están dados de baja (`active = false`): resucitar el
 * enlace a uno viejo es mejor que tener el mismo producto dos veces.
 */
async function apuntaEnMaestra(filas: Fila[], personas: number): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('master_items').select('id, name')
  if (error) throw error

  const porNombre = new Map<string, string>()
  for (const m of (data ?? []) as { id: string; name: string }[]) porNombre.set(clave(m.name), m.id)

  // Dos filas con el mismo nombre nuevo se dan de alta una sola vez.
  const porCrear = new Map<string, Fila>()
  for (const fila of filas) {
    const k = clave(fila.name)
    if (k && !porNombre.has(k) && !porCrear.has(k)) porCrear.set(k, fila)
  }

  if (porCrear.size > 0) {
    const { data: creados, error: err } = await supabase
      .from('master_items')
      .insert(
        [...porCrear.values()].map((fila) => ({
          name: fila.name.trim(),
          category: fila.category,
          unit: fila.unit,
          qty: fila.qty === '' ? null : Number(fila.qty),
          base_people: personas,
        })),
      )
      .select('id, name')
    if (err) throw err
    for (const m of (creados ?? []) as { id: string; name: string }[]) porNombre.set(clave(m.name), m.id)
  }

  return porNombre
}

function FormularioPlato({
  plato,
  ingredientes,
  onCerrar,
  onGuardado,
}: {
  plato: Dish | null
  ingredientes: DishItem[]
  onCerrar: () => void
  onGuardado: () => Promise<void>
}) {
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const [nombre, setNombre] = useState(plato?.name ?? '')
  const [tipo, setTipo] = useState<TipoTiempo>(plato?.kind ?? 'comida')
  const [personas, setPersonas] = useState(String(plato?.base_people ?? 15))
  const [notas, setNotas] = useState(plato?.notes ?? '')
  const [filas, setFilas] = useState<Fila[]>(
    ingredientes.map((i) => ({
      id: i.id,
      master_item_id: i.master_item_id,
      name: i.name,
      category: i.category,
      qty: i.qty == null ? '' : String(i.qty),
      unit: i.unit,
    })),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // La lista maestra sirve de diccionario: si el ingrediente ya está ahí, se
  // enlaza, y entonces la despensa sabe emparejarlo sin adivinar por el nombre.
  const { datos: maestra } = useConsulta(async () => {
    const { data, error: err } = await supabase
      .from('master_items')
      .select('*')
      .eq('active', true)
      .order('name')
    if (err) throw err
    return (data ?? []) as MasterItem[]
  }, [])

  const cambia = (i: number, parche: Partial<Fila>) =>
    setFilas((f) => f.map((fila, j) => (j === i ? { ...fila, ...parche } : fila)))

  const desdeMaestra = (i: number, idMaestro: string) => {
    const m = (maestra ?? []).find((x) => x.id === idMaestro)
    if (!m) {
      cambia(i, { master_item_id: null })
      return
    }
    cambia(i, {
      master_item_id: m.id,
      name: m.name,
      category: m.category,
      unit: m.unit,
      qty: m.qty == null ? '' : String(m.qty),
    })
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) {
      setError('El plato necesita un nombre.')
      return
    }
    const limpias = filas.filter((f) => f.name.trim())
    setGuardando(true)
    try {
      let dishId = plato?.id
      const campos = {
        name: nombre.trim(),
        kind: tipo,
        base_people: Number(personas) || 15,
        notes: notas.trim() || null,
      }
      if (dishId) {
        const { error: err } = await supabase.from('dishes').update(campos).eq('id', dishId)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase
          .from('dishes')
          .insert({ ...campos, created_by: perfil?.id ?? null })
          .select('id')
          .single()
        if (err) throw err
        dishId = (data as { id: string }).id
      }

      // Lo que no venga de la lista maestra se apunta en ella y queda
      // enlazado. Un ingrediente suelto llega bien a la compra, pero la
      // despensa no lo sabe emparejar con los sobrantes y no se le ofrece a
      // nadie la próxima vez que apunte una receta.
      let enlaces = new Map<string, string>()
      let falloMaestra: string | null = null
      if (limpias.some((fila) => !fila.master_item_id)) {
        try {
          enlaces = await apuntaEnMaestra(
            limpias.filter((fila) => !fila.master_item_id),
            Number(personas) || 15,
          )
        } catch (err) {
          // El plato se guarda igual. Perder una receta porque no se ha podido
          // tocar la lista maestra sería absurdo: el enlace se puede poner
          // después eligiendo el ingrediente del desplegable.
          falloMaestra = mensajeError(err)
        }
      }

      // Los ingredientes se rehacen enteros: son pocos y así no hay que
      // llevar la cuenta de cuáles se han tocado.
      const { error: errBorrar } = await supabase.from('dish_items').delete().eq('dish_id', dishId)
      if (errBorrar) throw errBorrar
      if (limpias.length > 0) {
        const { error: errMeter } = await supabase.from('dish_items').insert(
          limpias.map((f, i) => ({
            dish_id: dishId,
            master_item_id: f.master_item_id ?? enlaces.get(clave(f.name)) ?? null,
            name: f.name.trim(),
            category: f.category,
            qty: f.qty === '' ? null : Number(f.qty),
            unit: f.unit,
            sort_order: (i + 1) * 10,
          })),
        )
        if (errMeter) throw errMeter
      }
      await onGuardado()
      avisos.ok(plato ? 'Plato guardado.' : '¡Plato apuntado!')
      if (falloMaestra) {
        avisos.error(
          `El plato está guardado, pero no he podido apuntar los ingredientes nuevos en la lista maestra: ${falloMaestra}`,
        )
      }
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={plato ? 'Editar plato' : 'Nuevo plato'}
      descripcion="Las cantidades, para las personas que digas abajo. Se escalan solas al grupo de cada escapada."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-plato" cargando={guardando}>
            {plato ? 'Guardar' : 'Apuntar plato'}
          </Boton>
        </>
      }
    >
      <form id="form-plato" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Nombre del plato" requerido>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Paella" required />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Para qué tiempo">
            <Lista value={tipo} onChange={(e) => setTipo(e.target.value as TipoTiempo)}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.emoji} {t.texto}
                </option>
              ))}
            </Lista>
          </Campo>
          <Campo etiqueta="Cantidades para" ayuda="Cuántas personas comen con estas cantidades.">
            <Entrada
              type="number"
              min="1"
              step="1"
              value={personas}
              onChange={(e) => setPersonas(e.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Notas">
          <AreaTexto
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Se hace en la paellera grande, la del cobertizo"
          />
        </Campo>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-bosque-800">
              <CookingPot size={16} /> Ingredientes
            </h3>
            <Boton
              tamanyo="sm"
              variante="secundario"
              onClick={() =>
                setFilas((f) => [...f, { master_item_id: null, name: '', category: 'Otros', qty: '', unit: 'ud' }])
              }
            >
              <Plus size={15} /> Añadir
            </Boton>
          </div>

          {/* Que no sea magia silenciosa: la lista maestra va a crecer. */}
          <p className="mb-2 text-xs text-suave">
            Elígelos de la lista maestra con el desplegable de cada fila. Lo que escribas y no esté en ella{' '}
            <strong>se apunta solo</strong>, para que la despensa lo reconozca y salga ya hecho la próxima vez.
          </p>

          {filas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-arena px-4 py-5 text-center text-sm text-suave">
              Sin ingredientes todavía. Un plato sin ellos sirve para planear el menú, pero no generará compra.
            </p>
          ) : (
            <ul className="space-y-2">
              {filas.map((fila, i) => (
                <li key={fila.id ?? `nueva-${i}`} className="rounded-2xl border border-arena bg-beige p-2.5">
                  <div className="flex gap-2">
                    <Entrada
                      className="flex-1"
                      value={fila.name}
                      onChange={(e) => cambia(i, { name: e.target.value, master_item_id: null })}
                      placeholder="Arroz bomba"
                      aria-label={`Ingrediente ${i + 1}`}
                    />
                    <BotonIcono
                      etiqueta={`Quitar el ingrediente ${i + 1}`}
                      tono="peligro"
                      onClick={() => setFilas((f) => f.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={15} />
                    </BotonIcono>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Entrada
                      type="number"
                      min="0"
                      step="0.1"
                      value={fila.qty}
                      onChange={(e) => cambia(i, { qty: e.target.value })}
                      placeholder="Cantidad"
                      aria-label={`Cantidad del ingrediente ${i + 1}`}
                    />
                    <Lista
                      value={fila.unit}
                      onChange={(e) => cambia(i, { unit: e.target.value })}
                      aria-label={`Unidad del ingrediente ${i + 1}`}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Lista>
                    <Lista
                      value={fila.category}
                      onChange={(e) => cambia(i, { category: e.target.value })}
                      aria-label={`Categoría del ingrediente ${i + 1}`}
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Lista>
                    <Lista
                      value={fila.master_item_id ?? ''}
                      onChange={(e) => desdeMaestra(i, e.target.value)}
                      aria-label={`Traer el ingrediente ${i + 1} de la lista maestra`}
                    >
                      <option value="">Suelto</option>
                      {(maestra ?? []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </Lista>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm text-tierra-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
