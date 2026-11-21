import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera, ShoppingCart, Sun, UtensilsCrossed } from 'lucide-react'
import { useConsulta } from '../../hooks/useConsulta'
import { supabase } from '../../lib/supabase'
import { diaDeLaEstancia, reparteTiempos } from '../../lib/estancia'
import { hoyISO } from '../../lib/formato'
import { Tarjeta } from '../ui/Varios'
import { emojiTiempo } from './Tiempos'
import type { Dish, Member, Trip, TripMeal, TripMealDish } from '../../lib/types'

/**
 * La otra cara del panel: los tres días que importan.
 *
 * El resto de la aplicación sirve para organizar; esto sirve para estar
 * allí. Y estando allí nadie quiere saber cuántas casas se propusieron:
 * quiere saber qué se cena, qué falta por comprar y poder subir las
 * fotos sin buscar la pestaña.
 *
 * Trae sus propios datos en lugar de ampliar la consulta del panel: así
 * las cuatro consultas del menú solo se piden los días que se van a
 * mirar, y con copia local, que es la cocina de una casa rural y ahí no
 * hay cobertura.
 */
export function EstamosAlli({
  escapada,
  miembros,
  porComprar,
}: {
  escapada: Trip
  miembros: Member[]
  porComprar: number
}) {
  const { datos } = useConsulta(
    async () => {
      const [tiempos, platos, enTiempos] = await Promise.all([
        supabase.from('trip_meals').select('*').eq('trip_id', escapada.id).order('sort_order'),
        supabase.from('dishes').select('id, name'),
        supabase.from('trip_meal_dishes').select('*'),
      ])
      for (const r of [tiempos, platos, enTiempos]) if (r.error) throw r.error
      const mios = (tiempos.data ?? []) as TripMeal[]
      const ids = new Set(mios.map((t) => t.id))
      return {
        tiempos: mios,
        platos: (platos.data ?? []) as Pick<Dish, 'id' | 'name'>[],
        // `trip_meal_dishes` no tiene trip_id: cuelga del tiempo.
        enTiempos: ((enTiempos.data ?? []) as TripMealDish[]).filter((x) => ids.has(x.meal_id)),
      }
    },
    [escapada.id],
    { realtime: ['trip_meals', 'trip_meal_dishes'], copia: `alli:${escapada.id}` },
  )

  const hoy = hoyISO()
  const dia = diaDeLaEstancia(escapada.start_date, escapada.end_date, hoy)
  const reparto = useMemo(() => reparteTiempos(datos?.tiempos ?? [], hoy), [datos?.tiempos, hoy])

  const nombresDePlatos = useMemo(() => {
    const porId = new Map((datos?.platos ?? []).map((p) => [p.id, p.name]))
    const porTiempo = new Map<string, string[]>()
    for (const x of datos?.enTiempos ?? []) {
      const nombre = porId.get(x.dish_id)
      if (!nombre) continue
      porTiempo.set(x.meal_id, [...(porTiempo.get(x.meal_id) ?? []), nombre])
    }
    return porTiempo
  }, [datos?.platos, datos?.enTiempos])

  const quien = (id: string | null) => (id ? miembros.find((m) => m.id === id)?.name ?? null : null)

  const diaSemana = new Date(`${hoy}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long' })
  const base = `/escapadas/${escapada.id}`

  return (
    <Tarjeta className="animate-sube border-oliva-300 bg-oliva-100/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 className="font-display flex items-center gap-2 text-xl text-bosque-800">
          <Sun size={19} className="text-tierra-600" /> Ya estamos allí
        </h2>
        <p className="text-sm font-semibold text-oliva-700">
          {diaSemana}
          {dia && dia.total > 1 && ` · día ${dia.dia} de ${dia.total}`}
        </p>
      </div>

      {/* ---------------- Lo de hoy ---------------- */}
      <div className="mt-3.5 rounded-2xl bg-superficie p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-suave uppercase">
          <UtensilsCrossed size={13} /> Hoy se come
        </p>

        {reparto.hoy.length === 0 ? (
          <p className="text-sm text-suave">
            No hay nada apuntado para hoy.{' '}
            <Link to={`${base}/menu`} className="font-semibold text-bosque-600 underline underline-offset-2">
              Ponedlo en el menú
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {reparto.hoy.map((t) => {
              const platos = nombresDePlatos.get(t.id) ?? []
              const encargado = quien(t.assigned_to)
              return (
                <li key={t.id} className="flex gap-2.5 text-sm">
                  <span className="text-base leading-6" aria-hidden>
                    {emojiTiempo(t.kind)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-bosque-800">{t.name}</span>
                    {platos.length > 0 && <span className="text-tenue"> · {platos.join(', ')}</span>}
                    {encargado && <span className="block text-xs text-suave">Se encarga {encargado}</span>}
                    {t.notes && <span className="block text-xs text-suave">{t.notes}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {reparto.manyana.length > 0 && (
          <p className="mt-2.5 border-t border-arena pt-2.5 text-xs text-suave">
            <strong className="font-bold">Mañana:</strong>{' '}
            {reparto.manyana
              .map((t) => {
                const platos = nombresDePlatos.get(t.id) ?? []
                return platos.length > 0 ? `${t.name} (${platos.join(', ')})` : t.name
              })
              .join(' · ')}
          </p>
        )}
      </div>

      {/* ---------------- Lo que queda por hacer allí ---------------- */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {porComprar > 0 ? (
          <Link
            to={`${base}/compra`}
            className="flex items-center gap-2 rounded-2xl bg-tierra-100 p-3 text-sm font-semibold text-tierra-700 transition hover:bg-tierra-200"
          >
            <ShoppingCart size={16} />
            {porComprar === 1 ? 'Falta 1 cosa por comprar' : `Faltan ${porComprar} cosas por comprar`}
            <ArrowRight size={15} className="ml-auto shrink-0" />
          </Link>
        ) : (
          <Link
            to={`${base}/compra`}
            className="flex items-center gap-2 rounded-2xl bg-bosque-50 p-3 text-sm font-semibold text-bosque-700 transition hover:bg-bosque-100"
          >
            <ShoppingCart size={16} /> La compra está hecha
            <ArrowRight size={15} className="ml-auto shrink-0" />
          </Link>
        )}

        <Link
          to={`${base}/fotos`}
          className="flex items-center gap-2 rounded-2xl bg-superficie p-3 text-sm font-semibold text-bosque-700 transition hover:bg-beige"
        >
          <Camera size={16} /> Subir las fotos de hoy
          <ArrowRight size={15} className="ml-auto shrink-0" />
        </Link>
      </div>
    </Tarjeta>
  )
}
