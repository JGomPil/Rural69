import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChefHat, Clock, Plus, ShoppingCart, Sparkles, X } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useAvisos } from '../../hooks/useAvisos'
import { useConsulta } from '../../hooks/useConsulta'
import { mensajeError, supabase } from '../../lib/supabase'
import { escalaCantidad } from '../../lib/cantidades'
import { fecha, numero } from '../../lib/formato'
import { DialogoTiempos, TIPOS, emojiTiempo } from './Tiempos'
import { Boton, BotonIcono } from '../ui/Boton'
import { Modal } from '../ui/Modal'
import { AvisoError, Cargando, Etiqueta, Tarjeta, Vacio } from '../ui/Varios'
import type { Dish, DishItem, ShoppingItem, TripMeal, TripMealDish } from '../../lib/types'

/**
 * El menú de la escapada, por días.
 *
 * Aquí se decide qué se cocina en cada comida y cada cena, eligiendo del
 * recetario del grupo. Lo que gana con esto la lista de la compra es que
 * deja de salir de la cabeza de alguien: se recorren los tiempos, se juntan
 * los ingredientes de sus platos, se escalan al grupo que va y se meten en
 * la compra ya repartidos por comida.
 *
 * Las cantidades siguen siendo una propuesta. Lo que se genera se puede
 * retocar a mano en la pestaña de la compra, y volver a generar no pisa lo
 * que ya hayas tocado: solo añade lo que falte.
 */
export function Menu() {
  const { escapada, participantes, personas } = useEscapada()
  const avisos = useAvisos()
  const [eligiendo, setEligiendo] = useState<TripMeal | null>(null)
  const [generando, setGenerando] = useState(false)
  const [gestionandoTiempos, setGestionandoTiempos] = useState(false)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [tiempos, platos, ingredientes, enTiempos, compra] = await Promise.all([
        supabase.from('trip_meals').select('*').eq('trip_id', escapada.id).order('day').order('sort_order'),
        supabase.from('dishes').select('*').eq('active', true).order('name'),
        supabase.from('dish_items').select('*').order('sort_order'),
        supabase.from('trip_meal_dishes').select('*'),
        supabase.from('shopping_items').select('*').eq('trip_id', escapada.id),
      ])
      for (const r of [tiempos, platos, ingredientes, enTiempos, compra]) if (r.error) throw r.error
      const misTiempos = (tiempos.data ?? []) as TripMeal[]
      const idsTiempos = new Set(misTiempos.map((t) => t.id))
      return {
        tiempos: misTiempos,
        platos: (platos.data ?? []) as Dish[],
        ingredientes: (ingredientes.data ?? []) as DishItem[],
        // Solo los de esta escapada: la tabla no tiene trip_id, cuelga del tiempo.
        enTiempos: ((enTiempos.data ?? []) as TripMealDish[]).filter((x) => idsTiempos.has(x.meal_id)),
        compra: (compra.data ?? []) as ShoppingItem[],
      }
    },
    [escapada.id],
    { realtime: ['trip_meals', 'trip_meal_dishes', 'dishes', 'dish_items', 'shopping_items'] },
  )

  const porTiempo = useMemo(() => {
    const platos = new Map((datos?.platos ?? []).map((p) => [p.id, p]))
    const mapa = new Map<string, Dish[]>()
    for (const x of datos?.enTiempos ?? []) {
      const plato = platos.get(x.dish_id)
      if (!plato) continue
      const lista = mapa.get(x.meal_id)
      if (lista) lista.push(plato)
      else mapa.set(x.meal_id, [plato])
    }
    return mapa
  }, [datos])

  /** Los tiempos agrupados por día, en orden. */
  const dias = useMemo(() => {
    const mapa = new Map<string, TripMeal[]>()
    for (const t of datos?.tiempos ?? []) {
      const clave = t.day ?? 'sin-dia'
      const lista = mapa.get(clave)
      if (lista) lista.push(t)
      else mapa.set(clave, [t])
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [datos])

  /**
   * Lo que haría falta comprar según el menú, ya escalado al grupo y sin lo
   * que ya esté en la lista. Se calcula antes de generar para poder decir
   * cuántas cosas se van a añadir, en vez de generar a ciegas.
   */
  const pendiente = useMemo(() => {
    const ingredientesPor = new Map<string, DishItem[]>()
    for (const i of datos?.ingredientes ?? []) {
      const lista = ingredientesPor.get(i.dish_id)
      if (lista) lista.push(i)
      else ingredientesPor.set(i.dish_id, [i])
    }
    const yaEsta = new Set(
      (datos?.compra ?? []).map((c) => `${c.meal_id ?? ''}|${c.name.trim().toLowerCase()}`),
    )
    const nuevos: Partial<ShoppingItem>[] = []
    let orden = (datos?.compra ?? []).length * 10
    for (const tiempo of datos?.tiempos ?? []) {
      for (const plato of porTiempo.get(tiempo.id) ?? []) {
        for (const ing of ingredientesPor.get(plato.id) ?? []) {
          const clave = `${tiempo.id}|${ing.name.trim().toLowerCase()}`
          if (yaEsta.has(clave)) continue
          yaEsta.add(clave)
          const cantidad = escalaCantidad(ing.qty, plato.base_people, personas, ing.unit)
          nuevos.push({
            trip_id: escapada.id,
            master_item_id: ing.master_item_id,
            dish_id: plato.id,
            meal_id: tiempo.id,
            name: ing.name,
            category: ing.category,
            unit: ing.unit,
            needed_qty: cantidad,
            available_qty: 0,
            buy_qty: cantidad,
            notes: plato.name,
            sort_order: (orden += 10),
          })
        }
      }
    }
    return nuevos
  }, [datos, porTiempo, personas, escapada.id])

  const quitarPlato = async (mealId: string, dishId: string) => {
    try {
      const { error: err } = await supabase
        .from('trip_meal_dishes')
        .delete()
        .eq('meal_id', mealId)
        .eq('dish_id', dishId)
      if (err) throw err
      await refrescar(true)
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const generar = async () => {
    if (pendiente.length === 0) {
      avisos.info('La compra ya tiene todo lo del menú.')
      return
    }
    setGenerando(true)
    try {
      const { error: err } = await supabase.from('shopping_items').insert(pendiente)
      if (err) throw err
      await refrescar(true)
      avisos.ok(`${pendiente.length} cosas añadidas a la compra.`)
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando el menú…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  const conPlatos = [...porTiempo.values()].reduce((n, l) => n + l.length, 0)

  if ((datos?.tiempos.length ?? 0) === 0) {
    return (
      <>
        <Vacio
          emoji="🍽️"
          titulo="Esta escapada no tiene comidas todavía"
          texto="El menú se cuelga de las comidas y cenas de cada día. Créalas y luego elige qué se cocina en cada una: se generan solas a partir de las fechas de la escapada."
          accion={
            <Boton tamanyo="lg" onClick={() => setGestionandoTiempos(true)}>
              <Clock size={19} /> Crear las comidas
            </Boton>
          }
        />
        <DialogoTiempos
          abierto={gestionandoTiempos}
          onCerrar={() => setGestionandoTiempos(false)}
          escapada={escapada}
          tiempos={datos?.tiempos ?? []}
          participantes={participantes}
          onHecho={() => void refrescar(true)}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg text-bosque-800">
            <ChefHat size={19} /> Menú por días
          </h2>
          <p className="mt-0.5 text-sm text-suave">
            {conPlatos === 0
              ? 'Elige qué se cocina en cada comida y la compra saldrá sola.'
              : `${conPlatos} ${conPlatos === 1 ? 'plato puesto' : 'platos puestos'}; cantidades para ${numero(personas)} personas equivalentes.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Boton variante="secundario" onClick={() => setGestionandoTiempos(true)}>
            <Clock size={16} /> Comidas
          </Boton>
          <Boton onClick={() => void generar()} cargando={generando} disabled={pendiente.length === 0}>
            <Sparkles size={16} />
            {pendiente.length === 0 ? 'Compra al día' : `Pasar ${pendiente.length} a la compra`}
          </Boton>
        </div>
      </Tarjeta>

      {(datos?.platos.length ?? 0) === 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-oliva-300 bg-oliva-100 px-4 py-3 text-sm text-oliva-700">
          <ChefHat size={16} className="shrink-0" />
          <span className="flex-1">El recetario está vacío, así que no hay platos que elegir.</span>
          <Link to="/recetario" className="font-semibold underline underline-offset-2">
            Apuntar platos
          </Link>
        </p>
      )}

      {dias.map(([dia, tiempos]) => (
        <div key={dia}>
          <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-tenue">
            <CalendarDays size={15} />
            {dia === 'sin-dia' ? 'Sin día asignado' : fecha(dia)}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {tiempos.map((tiempo) => {
              const suyos = porTiempo.get(tiempo.id) ?? []
              return (
                <Tarjeta key={tiempo.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-base text-bosque-800">
                      {emojiTiempo(tiempo.kind)} {tiempo.name}
                    </h4>
                    <Boton tamanyo="sm" variante="secundario" onClick={() => setEligiendo(tiempo)}>
                      <Plus size={15} /> Plato
                    </Boton>
                  </div>

                  {suyos.length === 0 ? (
                    <p className="text-sm text-suave">Sin decidir.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {suyos.map((plato) => (
                        <li
                          key={plato.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-beige px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tenue">
                            {plato.name}
                          </span>
                          <BotonIcono
                            etiqueta={`Quitar ${plato.name} de ${tiempo.name}`}
                            tono="peligro"
                            onClick={() => void quitarPlato(tiempo.id, plato.id)}
                          >
                            <X size={14} />
                          </BotonIcono>
                        </li>
                      ))}
                    </ul>
                  )}
                </Tarjeta>
              )
            })}
          </div>
        </div>
      ))}

      <p className="medida mx-auto text-center text-xs text-suave">
        Lo que se pasa a la compra queda apuntado a su comida y con el nombre del plato, para que se sepa de
        dónde salió. Volver a pasarlo no pisa lo que ya hayas retocado a mano: solo añade lo que falte.
      </p>

      <DialogoTiempos
        abierto={gestionandoTiempos}
        onCerrar={() => setGestionandoTiempos(false)}
        escapada={escapada}
        tiempos={datos?.tiempos ?? []}
        participantes={participantes}
        onHecho={() => void refrescar(true)}
      />

      {eligiendo && (
        <ElegirPlato
          tiempo={eligiendo}
          platos={datos?.platos ?? []}
          yaPuestos={new Set((porTiempo.get(eligiendo.id) ?? []).map((p) => p.id))}
          onCerrar={() => setEligiendo(null)}
          onElegido={async (dishId) => {
            try {
              const { error: err } = await supabase
                .from('trip_meal_dishes')
                .insert({ meal_id: eligiendo.id, dish_id: dishId })
              if (err) throw err
              await refrescar(true)
            } catch (e) {
              avisos.error(mensajeError(e))
            }
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------

function ElegirPlato({
  tiempo,
  platos,
  yaPuestos,
  onCerrar,
  onElegido,
}: {
  tiempo: TripMeal
  platos: Dish[]
  yaPuestos: Set<string>
  onCerrar: () => void
  onElegido: (dishId: string) => Promise<void>
}) {
  const [busca, setBusca] = useState('')

  // Primero los del mismo tiempo: para una cena, las cenas.
  const ordenados = useMemo(() => {
    const texto = busca.trim().toLowerCase()
    return platos
      .filter((p) => !texto || p.name.toLowerCase().includes(texto))
      .sort((a, b) => {
        const pa = a.kind === tiempo.kind ? 0 : 1
        const pb = b.kind === tiempo.kind ? 0 : 1
        return pa - pb || a.name.localeCompare(b.name)
      })
  }, [platos, busca, tiempo.kind])

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Qué se cocina: ${tiempo.name}`}
      descripcion="Del recetario del grupo. Puedes poner más de un plato en la misma comida."
      ancho="md"
      pie={
        <Boton variante="secundario" onClick={onCerrar}>
          Listo
        </Boton>
      }
    >
      <div className="space-y-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar un plato…"
          aria-label="Buscar un plato"
          className="w-full rounded-2xl border border-borde-campo bg-superficie px-3.5 py-2.5 text-sm"
        />
        {ordenados.length === 0 ? (
          <p className="py-6 text-center text-sm text-suave">
            Ningún plato con ese nombre.{' '}
            <Link to="/recetario" className="font-semibold text-bosque-600 underline">
              Ir al recetario
            </Link>
          </p>
        ) : (
          <ul className="space-y-1.5">
            {ordenados.map((plato) => {
              const puesto = yaPuestos.has(plato.id)
              return (
                <li key={plato.id}>
                  <button
                    type="button"
                    disabled={puesto}
                    onClick={() => void onElegido(plato.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition ${
                      puesto
                        ? 'cursor-default border-arena bg-beige opacity-60'
                        : 'border-arena bg-superficie hover:border-bosque-500 hover:bg-bosque-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-tenue">
                        {TIPOS.find((t) => t.valor === plato.kind)?.emoji} {plato.name}
                      </span>
                      {plato.notes && <span className="block truncate text-xs text-suave">{plato.notes}</span>}
                    </span>
                    {puesto ? (
                      <Etiqueta tono="exito">Puesto</Etiqueta>
                    ) : (
                      <ShoppingCart size={15} className="shrink-0 text-suave" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
