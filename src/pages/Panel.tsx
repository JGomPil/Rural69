import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Home,
  MapPin,
  Plus,
  ShoppingCart,
  Trophy,
  Users,
  Vote,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGrupo } from '../hooks/useGrupo'
import { useConsulta } from '../hooks/useConsulta'
import { supabase } from '../lib/supabase'
import { cuentaAtras, euros, numero, rangoFechas } from '../lib/formato'
import { personasEquivalentes } from '../lib/cantidades'
import { estiloCategoria } from '../lib/constantes'
import { queFalta } from '../lib/pendientes'
import { Boton } from '../components/ui/Boton'
import { AvisoError, Cargando, Etiqueta, EtiquetaEstado, Progreso, Seccion, Tarjeta, Vacio } from '../components/ui/Varios'
import { InstalarApp } from '../components/layout/InstalarApp'
import { FormularioEscapada } from '../components/trip/FormularioEscapada'
import { QueFalta } from '../components/trip/QueFalta'
import type { House, PantryItem, Trip } from '../lib/types'

export function Panel() {
  const { perfil, esAdmin } = useAuth()
  const { escapadas, escapadaActiva, miembros, perfiles, cargando, error, refrescar } = useGrupo()
  const [formAbierto, setFormAbierto] = useState(false)

  const { datos } = useConsulta(
    async () => {
      const activa = escapadaActiva
      const vacio = Promise.resolve({ data: [] as Record<string, never>[], error: null })
      const [casas, votos, compra, participantes, despensa, opciones, votosFecha, equipaje] = await Promise.all([
        activa ? supabase.from('houses').select('*').eq('trip_id', activa.id) : vacio,
        activa ? supabase.from('votes').select('voter_id').eq('trip_id', activa.id) : vacio,
        activa ? supabase.from('shopping_items').select('purchased').eq('trip_id', activa.id) : vacio,
        activa ? supabase.from('trip_participants').select('*').eq('trip_id', activa.id) : vacio,
        supabase.from('pantry_items').select('*').gt('qty', 0).order('category'),
        activa ? supabase.from('trip_date_options').select('id').eq('trip_id', activa.id) : vacio,
        activa ? supabase.from('date_votes').select('voter_id').eq('trip_id', activa.id) : vacio,
        activa ? supabase.from('trip_packing').select('member_id').eq('trip_id', activa.id) : vacio,
      ])
      const items = (compra.data ?? []) as { purchased: boolean }[]
      // Quién ha votado, no cuántos votos: con voto por aprobación una
      // persona vota varias casas y el número de votos no dice nada.
      const quienVotoCasa = new Set(((votos.data ?? []) as { voter_id: string }[]).map((v) => v.voter_id))
      const quienVotoFecha = new Set(((votosFecha.data ?? []) as { voter_id: string }[]).map((v) => v.voter_id))
      const cosas = (equipaje.data ?? []) as { member_id: string | null }[]
      return {
        casas: (casas.data ?? []) as House[],
        votos: quienVotoCasa.size,
        heVotadoCasa: perfil ? quienVotoCasa.has(perfil.id) : false,
        totalCompra: items.length,
        compradosCompra: items.filter((i) => i.purchased).length,
        // `attending` no existe hasta pasar `17_quien_viene.sql`; sin ella,
        // tener fila significaba venir, que es lo que dice el `?? true`.
        idsParticipantes: ((participantes.data ?? []) as { member_id: string; attending?: boolean }[])
          .filter((r) => (r.attending ?? true) !== false)
          .map((r) => r.member_id),
        // Quien ya ha contestado, venga o no: lo que falta es la gente sin fila.
        hanContestado: ((participantes.data ?? []) as { member_id: string }[]).map((r) => r.member_id),
        despensa: (despensa.data ?? []) as PantryItem[],
        opcionesDeFecha: (opciones.data ?? []).length,
        votantesFecha: quienVotoFecha.size,
        heVotadoFechas: perfil ? quienVotoFecha.has(perfil.id) : false,
        equipajeSinDuenyo: cosas.filter((c) => !c.member_id).length,
      }
    },
    [escapadaActiva?.id, perfil?.id],
    {
      realtime: [
        'houses',
        'votes',
        'shopping_items',
        'trip_participants',
        'pantry_items',
        'trip_date_options',
        'date_votes',
        'trip_packing',
      ],
    },
  )

  if (cargando) return <Cargando texto="Cargando el panel…" />

  const participantes = miembros.filter((m) => datos?.idsParticipantes.includes(m.id))
  const adultosQueVienen = participantes.filter((m) => !m.is_child).length
  const anteriores = escapadas.filter((t) => t.id !== escapadaActiva?.id).slice(0, 3)
  const elegida = datos?.casas.find((c) => c.id === escapadaActiva?.chosen_house_id)
  const saludo = perfil?.display_name?.split(' ')[0] || 'amig@'

  // Quién ha contestado ya si viene, y si falto yo o alguien de mi casa.
  const activos = miembros.filter((m) => m.active)
  const yo = miembros.find((m) => m.id === perfil?.member_id)
  const miCasa = yo
    ? activos.filter((m) => m.id === yo.id || (yo.household_id && m.household_id === yo.household_id))
    : []
  const respondidos = new Set(datos?.hanContestado ?? [])
  const miCasaPendiente = miCasa.filter((m) => !respondidos.has(m.id)).length
  const sinContestar = activos.filter((m) => !respondidos.has(m.id)).length

  // Lo que toca hacer ahora mismo, con lo tuyo primero. Las reglas están en
  // `lib/pendientes.ts`, que son muchos casos y aquí no se leerían.
  const pendientes =
    escapadaActiva && datos
      ? queFalta({
          escapada: escapadaActiva,
          esAdmin,
          conCuenta: perfiles.length,
          opcionesDeFecha: datos.opcionesDeFecha,
          hanVotadoFechas: datos.votantesFecha,
          heVotadoFechas: datos.heVotadoFechas,
          casas: datos.casas.length,
          hanVotadoCasa: datos.votos,
          heVotadoCasa: datos.heVotadoCasa,
          meFaltaContestar: miCasaPendiente > 0,
          sinContestarOtros: sinContestar - miCasaPendiente,
          compraTotal: datos.totalCompra,
          compraPorComprar: datos.totalCompra - datos.compradosCompra,
          equipajeSinDuenyo: datos.equipajeSinDuenyo,
        })
      : null

  return (
    <div className="space-y-7">
      {error && <AvisoError texto={error} onReintentar={() => void refrescar()} />}

      <InstalarApp />

      <header className="animate-sube">
        <p className="text-sm font-semibold text-oliva-700">¡Hola, {saludo}!</p>
        <h1 className="font-display text-2xl text-bosque-800 sm:text-3xl">
          {escapadaActiva ? 'Nuestra próxima escapada' : 'Rural69'}
        </h1>
      </header>

      {!escapadaActiva ? (
        <Vacio
          emoji="🏕️"
          titulo="Todavía no hay ninguna escapada"
          texto={
            esAdmin
              ? 'Crea la primera y empezad a proponer casas rurales, votar y preparar la compra.'
              : 'Cuando el administrador cree la próxima escapada aparecerá aquí.'
          }
          accion={
            esAdmin ? (
              <Boton tamanyo="lg" onClick={() => setFormAbierto(true)}>
                <Plus size={19} /> Crear la primera escapada
              </Boton>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Lo primero, antes incluso de la tarjeta de la escapada: para eso
              se abre la aplicación. */}
          {pendientes && <QueFalta pendientes={pendientes} />}

          {/* ---------- Tarjeta principal ---------- */}
          <Tarjeta className="animate-sube overflow-hidden">
            <div className="relative">
              {/* Encima de esta cabecera va el título en blanco de verdad, así que
                  tanto el velo de la foto como el degradado de respaldo tienen que
                  seguir siendo oscuros en modo oscuro: de ahí el velo y los verdes
                  fijos en lugar de los del tema. */}
              {elegida?.cover_image_url ? (
                <div className="relative h-40 sm:h-52">
                  <img src={elegida.cover_image_url} alt="" className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-velo/85 via-velo/35 to-transparent" />
                </div>
              ) : (
                <div className="h-28 bg-gradient-to-br from-[#2f5d42] via-[#3d7555] to-[#8a9a5b] sm:h-32" />
              )}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <EtiquetaEstado estado={escapadaActiva.status} />
                  {cuentaAtras(escapadaActiva.start_date) && (
                    <span className="rounded-full bg-tierra-600 px-2.5 py-0.5 text-xs font-bold text-tinta-fuerte">
                      {cuentaAtras(escapadaActiva.start_date)}
                    </span>
                  )}
                </div>
                <h2 className="font-display mt-1.5 text-2xl leading-tight text-white drop-shadow-sm sm:text-3xl">
                  {escapadaActiva.title}
                </h2>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-tenue">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={16} className="text-bosque-500" />
                  {rangoFechas(escapadaActiva.start_date, escapadaActiva.end_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-bosque-500" />
                  {[escapadaActiva.town, escapadaActiva.province].filter(Boolean).join(', ') || 'Destino por decidir'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={16} className="text-bosque-500" />
                  {participantes.length} personas
                  {participantes.length > 0 && (
                    <span className="text-suave">({numero(personasEquivalentes(participantes))} equiv.)</span>
                  )}
                </span>
              </div>

              {/* Estado de la organización */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <AtajoEstado
                  a={`/escapadas/${escapadaActiva.id}/casas`}
                  icono={<Home size={17} />}
                  valor={datos?.casas.length ?? 0}
                  etiqueta="casas propuestas"
                />
                <AtajoEstado
                  a={`/escapadas/${escapadaActiva.id}/votacion`}
                  icono={<Vote size={17} />}
                  valor={datos?.votos ?? 0}
                  etiqueta={escapadaActiva.voting_open ? 'han votado (abierta)' : 'han votado (cerrada)'}
                />
                <AtajoEstado
                  a={`/escapadas/${escapadaActiva.id}/compra`}
                  icono={<ShoppingCart size={17} />}
                  valor={datos?.totalCompra ? `${datos.compradosCompra}/${datos.totalCompra}` : '0'}
                  etiqueta="compra marcada"
                />
                <AtajoEstado
                  a="/despensa"
                  icono={<Archive size={17} />}
                  valor={datos?.despensa.length ?? 0}
                  etiqueta="en la despensa"
                />
              </div>

              {Boolean(datos?.totalCompra) && (
                <Progreso
                  valor={datos?.compradosCompra ?? 0}
                  total={datos?.totalCompra ?? 0}
                  etiqueta="Lista de la compra"
                />
              )}

              {elegida ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-bosque-50 p-3.5">
                  <Trophy size={18} className="text-bosque-600" />
                  <span className="font-semibold text-bosque-800">{elegida.name}</span>
                  <Etiqueta tono="exito">{elegida.reserved ? 'Reservada' : 'Elegida'}</Etiqueta>
                  {elegida.total_price != null && adultosQueVienen > 0 && (
                    <span className="text-sm text-suave">
                      {euros(elegida.total_price / adultosQueVienen)} por adulto
                    </span>
                  )}
                </div>
              ) : (
                <Link
                  to={`/escapadas/${escapadaActiva.id}/${(datos?.casas.length ?? 0) > 0 ? 'votacion' : 'casas'}`}
                  className="flex items-center gap-2 rounded-2xl bg-tierra-100 p-3.5 font-semibold text-tierra-700 transition hover:bg-tierra-200"
                >
                  {(datos?.casas.length ?? 0) > 0 ? '¡A votar la casa!' : 'Hay que proponer casas rurales'}
                  <ArrowRight size={17} className="ml-auto" />
                </Link>
              )}

              <Link
                to={`/escapadas/${escapadaActiva.id}`}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-bosque-600 text-base font-semibold text-tinta-fuerte transition active:scale-[0.98] sm:hidden"
              >
                Abrir la escapada <ArrowRight size={18} />
              </Link>
              <Link
                to={`/escapadas/${escapadaActiva.id}`}
                className="hidden items-center gap-1.5 font-semibold text-bosque-600 hover:underline sm:flex"
              >
                Abrir la escapada <ArrowRight size={16} />
              </Link>
            </div>
          </Tarjeta>

          {esAdmin && (
            <div className="flex justify-center">
              <Boton variante="acento" tamanyo="lg" onClick={() => setFormAbierto(true)}>
                <Plus size={19} /> Crear nueva escapada
              </Boton>
            </div>
          )}
        </>
      )}

      {/* ---------- Despensa ---------- */}
      {(datos?.despensa.length ?? 0) > 0 && (
        <Seccion
          titulo="Nos quedó de la última vez"
          icono={<Archive size={19} />}
          accion={
            <Link to="/despensa" className="text-sm font-semibold text-bosque-600 hover:underline">
              Ver despensa
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            {datos?.despensa.slice(0, 14).map((p) => {
              const estilo = estiloCategoria(p.category)
              return (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${estilo.clase}`}
                >
                  <span aria-hidden>{estilo.emoji}</span>
                  {p.name}
                  <strong className="font-bold">
                    {numero(p.qty)} {p.unit}
                  </strong>
                </span>
              )
            })}
            {(datos?.despensa.length ?? 0) > 14 && (
              <span className="self-center text-sm text-suave">y {(datos?.despensa.length ?? 0) - 14} más…</span>
            )}
          </div>
        </Seccion>
      )}

      {/* ---------- Escapadas anteriores ---------- */}
      {anteriores.length > 0 && (
        <Seccion
          titulo="Escapadas anteriores"
          icono={<CalendarDays size={19} />}
          accion={
            <Link to="/escapadas" className="text-sm font-semibold text-bosque-600 hover:underline">
              Ver todas
            </Link>
          }
        >
          <div className="grid gap-2.5 sm:grid-cols-3">
            {anteriores.map((t) => (
              <TarjetaMini key={t.id} escapada={t} />
            ))}
          </div>
        </Seccion>
      )}

      <FormularioEscapada abierto={formAbierto} onCerrar={() => setFormAbierto(false)} />
    </div>
  )
}

function AtajoEstado({
  a,
  icono,
  valor,
  etiqueta,
}: {
  a: string
  icono: React.ReactNode
  valor: React.ReactNode
  etiqueta: string
}) {
  return (
    <Link
      to={a}
      className="rounded-2xl border border-arena bg-beige/50 px-3 py-2.5 transition hover:-translate-y-0.5 hover:bg-beige"
    >
      <span className="flex items-center gap-1.5 text-bosque-600">{icono}</span>
      <span className="font-display mt-1 block text-xl leading-none font-bold text-bosque-800">{valor}</span>
      <span className="mt-0.5 block text-xs leading-snug text-suave">{etiqueta}</span>
    </Link>
  )
}

function TarjetaMini({ escapada }: { escapada: Trip }) {
  return (
    <Link
      to={`/escapadas/${escapada.id}`}
      className="tarjeta flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-bosque-800">{escapada.title}</p>
        <p className="truncate text-xs text-suave">
          {rangoFechas(escapada.start_date, escapada.end_date)}
          {escapada.town && ` · ${escapada.town}`}
        </p>
      </div>
      <ChevronRight size={17} className="shrink-0 text-carbon/30" />
    </Link>
  )
}
