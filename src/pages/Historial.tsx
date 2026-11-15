import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Download, Home, Receipt, Users } from 'lucide-react'
import { useAvisos } from '../hooks/useAvisos'
import { useConsulta } from '../hooks/useConsulta'
import { useGrupo } from '../hooks/useGrupo'
import { supabase } from '../lib/supabase'
import { euros, numero, rangoFechas } from '../lib/formato'
import { clave } from '../lib/cantidades'
import { descarga, generaCSV, nombreArchivo } from '../lib/exportar'
import { Boton } from '../components/ui/Boton'
import { AvisoError, Cargando, Dato, Etiqueta, EtiquetaEstado, Seccion, Tarjeta, Vacio } from '../components/ui/Varios'
import type { House, PantryItem, ShoppingItem } from '../lib/types'

export function Historial() {
  const { escapadas, miembros, cargando: cargandoGrupo } = useGrupo()
  const avisos = useAvisos()

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [casas, compra, despensa, participantes] = await Promise.all([
        supabase.from('houses').select('*'),
        supabase.from('shopping_items').select('*'),
        supabase.from('pantry_items').select('*'),
        supabase.from('trip_participants').select('trip_id, member_id'),
      ])
      const primerError = [casas, compra, despensa, participantes].find((r) => r.error)?.error
      if (primerError) throw primerError
      return {
        casas: (casas.data ?? []) as House[],
        compra: (compra.data ?? []) as ShoppingItem[],
        despensa: (despensa.data ?? []) as PantryItem[],
        participantes: (participantes.data ?? []) as { trip_id: string; member_id: string }[],
      }
    },
    [],
    { realtime: ['houses', 'shopping_items', 'pantry_items'] },
  )

  const resumen = useMemo(() => {
    if (!datos) return null
    const realizadas = escapadas.filter((t) => t.status === 'realizada' || t.status === 'archivada')
    const porEscapada = escapadas.map((t) => {
      const casa = datos.casas.find((c) => c.id === t.chosen_house_id)
      const items = datos.compra.filter((i) => i.trip_id === t.id)
      const idsDelViaje = datos.participantes.filter((p) => p.trip_id === t.id).map((p) => p.member_id)
      const personas = idsDelViaje.length
      const adultos = miembros.filter((m) => idsDelViaje.includes(m.id) && !m.is_child).length
      return {
        escapada: t,
        casa,
        personas,
        adultos,
        productos: items.length,
        porAdultoCasa: casa?.total_price != null && adultos > 0 ? Number(casa.total_price) / adultos : null,
      }
    })

    const conPrecio = porEscapada.filter((f) => f.porAdultoCasa != null)

    // Productos que suelen sobrar
    const sobras = new Map<string, { nombre: string; veces: number; total: number; unidad: string }>()
    for (const p of datos.despensa) {
      const k = clave(p.name)
      const actual = sobras.get(k) ?? { nombre: p.name, veces: 0, total: 0, unidad: p.unit }
      actual.veces += 1
      actual.total += Number(p.qty) || 0
      sobras.set(k, actual)
    }

    // Productos que siempre se acaban: comprados alguna vez y nunca registrados como sobrante
    const comprados = new Map<string, { nombre: string; veces: number; unidad: string }>()
    for (const i of datos.compra) {
      if (!i.purchased) continue
      const k = clave(i.name)
      const actual = comprados.get(k) ?? { nombre: i.name, veces: 0, unidad: i.unit }
      actual.veces += 1
      comprados.set(k, actual)
    }
    const seAgotan = [...comprados.entries()]
      .filter(([k]) => !sobras.has(k))
      .map(([, v]) => v)
      .sort((a, b) => b.veces - a.veces)

    return {
      realizadas: realizadas.length,
      casasVisitadas: porEscapada.filter((f) => f.casa).map((f) => f.casa!),
      precioMedioPersona:
        conPrecio.length > 0 ? conPrecio.reduce((s, f) => s + (f.porAdultoCasa ?? 0), 0) / conPrecio.length : null,
      porEscapada,
      sueleSobrar: [...sobras.values()].sort((a, b) => b.veces - a.veces || b.total - a.total),
      seAgotan,
    }
  }, [datos, escapadas, miembros])

  const exportar = () => {
    if (!resumen) return
    const filas = resumen.porEscapada.map((f) => [
      f.escapada.title,
      f.escapada.start_date ?? '',
      f.escapada.end_date ?? '',
      [f.escapada.town, f.escapada.province].filter(Boolean).join(', '),
      f.escapada.status,
      f.personas,
      f.casa?.name ?? '',
      f.casa?.total_price != null ? numero(f.casa.total_price) : '',
      f.adultos,
      f.porAdultoCasa != null ? numero(f.porAdultoCasa) : '',
      f.productos,
    ])
    descarga(
      nombreArchivo('historial-rural69', 'csv'),
      generaCSV(
        [
          'Escapada',
          'Inicio',
          'Fin',
          'Destino',
          'Estado',
          'Participantes',
          'Adultos',
          'Casa',
          'Precio casa',
          'Casa por adulto',
          'Productos',
        ],
        filas,
      ),
    )
    avisos.ok('CSV descargado.')
  }

  if (cargandoGrupo || cargando) return <Cargando texto="Calculando estadísticas…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />
  if (!resumen) return null

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800 sm:text-3xl">
            <BarChart3 size={26} /> Historial
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-carbon/60">
            Lo que hemos aprendido de las escapadas anteriores para organizar mejor las siguientes.
          </p>
        </div>
        <Boton variante="secundario" onClick={exportar} disabled={escapadas.length === 0}>
          <Download size={17} /> CSV
        </Boton>
      </header>

      {escapadas.length === 0 ? (
        <Vacio emoji="📊" titulo="Aún no hay datos" texto="Cuando hagáis la primera escapada, aquí aparecerán las estadísticas." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Dato icono={<Home size={18} />} valor={resumen.realizadas} etiqueta="Escapadas realizadas" />
            <Dato
              icono={<Users size={18} />}
              valor={resumen.casasVisitadas.length}
              etiqueta="Casas rurales elegidas"
              tono="oliva"
            />
            <Dato
              icono={<Receipt size={18} />}
              valor={euros(resumen.precioMedioPersona)}
              etiqueta="Precio medio de casa por adulto"
              tono="tierra"
            />
          </div>

          {/* ---------- Casas visitadas ---------- */}
          {resumen.casasVisitadas.length > 0 && (
            <Seccion titulo="Casas donde hemos estado" icono={<Home size={19} />}>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {resumen.porEscapada
                  .filter((f) => f.casa)
                  .map((f) => (
                    <Tarjeta key={f.escapada.id} className="overflow-hidden">
                      {f.casa?.cover_image_url && (
                        <img src={f.casa.cover_image_url} alt="" className="h-28 w-full object-cover" loading="lazy" />
                      )}
                      <div className="p-3.5">
                        <p className="font-semibold text-bosque-800">{f.casa?.name}</p>
                        <p className="text-xs text-carbon/55">
                          {[f.casa?.town, f.casa?.province].filter(Boolean).join(', ')}
                        </p>
                        <p className="mt-1 text-xs text-carbon/50">
                          {f.escapada.title} · {rangoFechas(f.escapada.start_date, f.escapada.end_date)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {f.casa?.total_price != null && <Etiqueta>{euros(f.casa.total_price)}</Etiqueta>}
                          {f.porAdultoCasa != null && (
                            <Etiqueta tono="oliva">{euros(f.porAdultoCasa)}/adulto</Etiqueta>
                          )}
                        </div>
                      </div>
                    </Tarjeta>
                  ))}
              </div>
            </Seccion>
          )}

          {/* ---------- Sobrantes y agotados ---------- */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Seccion titulo="Lo que siempre sobra" icono={<span aria-hidden>🫙</span>}>
              <Tarjeta className="p-4">
                {resumen.sueleSobrar.length === 0 ? (
                  <p className="text-sm text-carbon/55">Todavía no habéis registrado sobrantes.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {resumen.sueleSobrar.slice(0, 12).map((s) => (
                      <li key={s.nombre} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-carbon/75">{s.nombre}</span>
                        <span className="shrink-0 text-xs font-semibold text-carbon/50">
                          {s.veces} {s.veces === 1 ? 'vez' : 'veces'} · {numero(s.total)} {s.unidad}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-arena pt-2.5 text-xs text-carbon/50">
                  Candidatos a comprar menos la próxima vez.
                </p>
              </Tarjeta>
            </Seccion>

            <Seccion titulo="Lo que nunca sobra" icono={<span aria-hidden>🔥</span>}>
              <Tarjeta className="p-4">
                {resumen.seAgotan.length === 0 ? (
                  <p className="text-sm text-carbon/55">Sin datos todavía.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {resumen.seAgotan.slice(0, 12).map((s) => (
                      <li key={s.nombre} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-carbon/75">{s.nombre}</span>
                        <span className="shrink-0 text-xs font-semibold text-carbon/50">
                          comprado {s.veces} {s.veces === 1 ? 'vez' : 'veces'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-arena pt-2.5 text-xs text-carbon/50">
                  Se compran y nunca vuelven a casa: quizá haya que subir la cantidad.
                </p>
              </Tarjeta>
            </Seccion>
          </div>

          {/* ---------- Tabla de escapadas ---------- */}
          <Seccion titulo="Todas las escapadas" icono={<span aria-hidden>🗂️</span>}>
            <Tarjeta className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-arena text-left text-carbon/55">
                    <th className="px-4 py-2.5 font-semibold">Escapada</th>
                    <th className="px-4 py-2.5 font-semibold">Fechas</th>
                    <th className="px-4 py-2.5 font-semibold">Personas</th>
                    <th className="px-4 py-2.5 font-semibold">Casa</th>
                    <th className="px-4 py-2.5 font-semibold">Por adulto</th>
                    <th className="px-4 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.porEscapada.map((f) => (
                    <tr key={f.escapada.id} className="border-b border-arena/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link to={`/escapadas/${f.escapada.id}`} className="font-semibold text-bosque-700 hover:underline">
                          {f.escapada.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-carbon/70">
                        {rangoFechas(f.escapada.start_date, f.escapada.end_date)}
                      </td>
                      <td className="px-4 py-2.5 text-carbon/70">{f.personas || '—'}</td>
                      <td className="px-4 py-2.5 text-carbon/70">{f.casa?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-carbon/70">{euros(f.porAdultoCasa)}</td>
                      <td className="px-4 py-2.5">
                        <EtiquetaEstado estado={f.escapada.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
          </Seccion>
        </>
      )}
    </div>
  )
}
