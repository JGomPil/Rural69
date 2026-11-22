import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  Columns3,
  ExternalLink,
  LayoutGrid,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useConsulta } from '../../hooks/useConsulta'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { esVotoDuplicado, mensajeError, supabase } from '../../lib/supabase'
import { euros, numero } from '../../lib/formato'
import { portadaDe } from '../../lib/portada'
import { Boton, BotonIcono } from '../ui/Boton'
import { Confirmar } from '../ui/Modal'
import { Persona } from '../ui/Persona'
import { AvisoError, Cargando, Etiqueta, Tarjeta, Vacio } from '../ui/Varios'
import { FormularioCasa } from './FormularioCasa'
import { GaleriaCasa } from './GaleriaCasa'
import type { House, HousePhoto } from '../../lib/types'

export function CasasRurales() {
  const { escapada, participantes, recargar } = useEscapada()
  const { esAdmin, perfil } = useAuth()
  const avisos = useAvisos()
  const [vista, setVista] = useState<'tarjetas' | 'comparar'>('tarjetas')
  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState<House | null>(null)
  const [borrando, setBorrando] = useState<House | null>(null)
  const [galeria, setGaleria] = useState<House | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [votando, setVotando] = useState<string | null>(null)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [casas, fotos, votos] = await Promise.all([
        supabase.from('houses').select('*').eq('trip_id', escapada.id).order('created_at'),
        supabase.from('house_photos').select('*').order('sort_order'),
        supabase.from('votes').select('id, house_id, voter_id').eq('trip_id', escapada.id),
      ])
      if (casas.error) throw casas.error
      if (fotos.error) throw fotos.error
      if (votos.error) throw votos.error
      const conteo: Record<string, number> = {}
      for (const v of votos.data ?? []) conteo[v.house_id as string] = (conteo[v.house_id as string] ?? 0) + 1
      return {
        casas: (casas.data ?? []) as House[],
        fotos: (fotos.data ?? []) as HousePhoto[],
        votos: conteo,
        emitidos: (votos.data ?? []) as { id: string; house_id: string; voter_id: string }[],
      }
    },
    [escapada.id],
    { realtime: ['houses', 'house_photos', 'votes'] },
  )

  // En el grupo solo pagan los adultos: los niños no cuentan para repartir el precio.
  const adultos = participantes.filter((m) => !m.is_child).length
  const porAdulto = (casa: House) =>
    casa.total_price != null && adultos > 0 ? casa.total_price / adultos : null

  const fotosDe = useMemo(() => {
    const mapa: Record<string, string[]> = {}
    for (const f of datos?.fotos ?? []) {
      if (!mapa[f.house_id]) mapa[f.house_id] = []
      mapa[f.house_id].push(f.url)
    }
    return mapa
  }, [datos?.fotos])

  /**
   * Portadas que se quedaron apuntando a una foto borrada. Pasaba con las
   * casas de antes: la portada se guardaba aparte de la lista de fotos, así
   * que al quitar la foto que era portada la columna seguía señalándola y la
   * casa enseñaba esa foto en el Panel, en la Votación y en el Resumen, que
   * no tienen la lista a mano para darse cuenta. Se corrige al cargar, una
   * vez por casa, y de paso se rellena la portada de las que no tenían
   * ninguna apuntada aun teniendo fotos.
   */
  const arregladas = useRef(new Set<string>())
  useEffect(() => {
    const porArreglar: { id: string; portada: string | null }[] = []
    for (const casa of datos?.casas ?? []) {
      const apuntada = casa.cover_image_url || null
      const buena = portadaDe(apuntada, fotosDe[casa.id] ?? [])
      if (buena === apuntada || arregladas.current.has(casa.id)) continue
      arregladas.current.add(casa.id)
      porArreglar.push({ id: casa.id, portada: buena })
    }
    if (!porArreglar.length) return
    void (async () => {
      for (const { id, portada } of porArreglar) {
        const { error: err } = await supabase.from('houses').update({ cover_image_url: portada }).eq('id', id)
        // Si no se puede escribir no pasa nada: la tarjeta ya enseña la buena.
        if (err) console.error('Rural69: no se ha podido arreglar la portada', err)
      }
    })()
  }, [datos?.casas, fotosDe])

  /**
   * Las que he votado yo: de la casa al identificador de mi voto, para poder
   * quitarlo.
   *
   * Votar estaba solo en la pestaña «Votación», y eso dejaba un salto tonto:
   * el aviso de «alguien ha propuesto una casa» te traía aquí, mirabas las
   * fotos, y para decir que te valía había que cambiar de pestaña y buscarla
   * otra vez en una lista distinta. Ahora se vota donde se mira.
   */
  const misVotos = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const v of datos?.emitidos ?? []) if (v.voter_id === perfil?.id) mapa.set(v.house_id, v.id)
    return mapa
  }, [datos?.emitidos, perfil?.id])

  const votar = async (casa: House) => {
    if (!perfil) return
    setVotando(casa.id)
    try {
      // Voto por aprobación: pulsar una votada la quita, pulsar otra la añade.
      const mío = misVotos.get(casa.id)
      if (mío) {
        const { error: err } = await supabase.from('votes').delete().eq('id', mío)
        if (err) throw err
        avisos.info('Voto retirado.')
      } else {
        const { error: err } = await supabase
          .from('votes')
          .insert({ trip_id: escapada.id, house_id: casa.id, voter_id: perfil.id })
        if (err) throw err
        avisos.ok('¡Votada!')
      }
      await refrescar(true)
    } catch (e) {
      avisos.error(
        esVotoDuplicado(e)
          ? 'Todavía no se pueden votar varias: falta pasar el último cambio de la base de datos (10_voto_multiple.sql).'
          : mensajeError(e),
      )
    } finally {
      setVotando(null)
    }
  }

  const elegirCasa = async (casa: House, reservar: boolean) => {
    try {
      const esLaElegida = escapada.chosen_house_id === casa.id
      const { error: err } = await supabase
        .from('trips')
        .update({ chosen_house_id: esLaElegida && !reservar ? null : casa.id })
        .eq('id', escapada.id)
      if (err) throw err
      if (reservar) {
        const { error: err2 } = await supabase
          .from('houses')
          .update({ reserved: true })
          .eq('id', casa.id)
        if (err2) throw err2
        await supabase.from('houses').update({ reserved: false }).eq('trip_id', escapada.id).neq('id', casa.id)
      }
      await recargar()
      await refrescar(true)
      avisos.ok(reservar ? `¡${casa.name} marcada como reservada!` : esLaElegida ? 'Ya no es la casa elegida.' : `${casa.name} es la casa elegida.`)
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('houses').delete().eq('id', borrando.id)
      if (err) throw err
      await refrescar(true)
      avisos.ok('Casa eliminada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  if (cargando) return <Cargando texto="Cargando casas…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  const casas = datos?.casas ?? []

  return (
    <div className="space-y-4">
      {!escapada.start_date && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-oliva-300 bg-oliva-100 px-4 py-3 text-sm text-oliva-700">
          <CalendarDays size={16} className="shrink-0" />
          <span className="flex-1">
            Todavía no hay fechas. Buscar casa antes de saber el finde suele ser trabajo doble: la mitad
            estarán ocupadas.
          </span>
          <Link
            to={`/escapadas/${escapada.id}/fechas`}
            className="font-semibold underline underline-offset-2"
          >
            Votar las fechas
          </Link>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl bg-beige p-1">
          {(
            [
              ['tarjetas', 'Tarjetas', LayoutGrid],
              ['comparar', 'Comparar', Columns3],
            ] as const
          ).map(([valor, texto, Icono]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setVista(valor)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                vista === valor ? 'bg-superficie text-bosque-700 shadow-sm' : 'text-suave'
              }`}
            >
              <Icono size={16} /> {texto}
            </button>
          ))}
        </div>
        <Boton
          onClick={() => {
            setEditando(null)
            setFormAbierto(true)
          }}
        >
          <Plus size={18} /> Añadir casa
        </Boton>
      </div>

      {casas.length === 0 ? (
        <Vacio
          emoji="🏠"
          titulo="Ninguna casa propuesta todavía"
          texto="Cualquiera del grupo puede añadir casas candidatas con su web, precio y fotos."
          accion={
            <Boton onClick={() => setFormAbierto(true)}>
              <Plus size={18} /> Añadir la primera
            </Boton>
          }
        />
      ) : vista === 'tarjetas' ? (
        <>
          {escapada.voting_open && (
            <p className="text-sm text-suave">
              Marca <strong>«Me vale»</strong> en todas las que te sirvan, aquí mismo. En{' '}
              <Link
                to={`/escapadas/${escapada.id}/votacion`}
                className="font-semibold text-bosque-600 underline underline-offset-2"
              >
                Votación
              </Link>{' '}
              se ve cómo va.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {casas.map((casa) => (
              <TarjetaCasa
                key={casa.id}
                casa={casa}
                fotos={fotosDe[casa.id] ?? []}
                votos={datos?.votos[casa.id] ?? 0}
                porAdulto={porAdulto(casa)}
                votacionAbierta={escapada.voting_open}
                esMiVoto={misVotos.has(casa.id)}
                votando={votando === casa.id}
                onVotar={() => void votar(casa)}
                elegida={escapada.chosen_house_id === casa.id}
                propuestaPor={casa.proposed_by}
                puedeEditar
                puedeBorrar={esAdmin || casa.proposed_by === perfil?.id}
                onEditar={() => {
                  setEditando(casa)
                  setFormAbierto(true)
                }}
                onBorrar={() => setBorrando(casa)}
                onGaleria={() => setGaleria(casa)}
                onElegir={esAdmin ? () => void elegirCasa(casa, false) : undefined}
                onReservar={esAdmin ? () => void elegirCasa(casa, true) : undefined}
              />
            ))}
          </div>
        </>
      ) : (
        <Comparador
          casas={casas}
          votos={datos?.votos ?? {}}
          adultos={adultos}
          elegidaId={escapada.chosen_house_id}
        />
      )}

      <FormularioCasa
        abierto={formAbierto}
        onCerrar={() => {
          setFormAbierto(false)
          setEditando(null)
        }}
        tripId={escapada.id}
        casa={editando}
        onGuardada={() => void refrescar(true)}
      />
      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Quitar «${borrando?.name}»?`}
        texto="Se borrarán sus fotos y los votos que haya recibido."
        textoAceptar="Sí, quitar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
      <GaleriaCasa casa={galeria} fotos={galeria ? (fotosDe[galeria.id] ?? []) : []} onCerrar={() => setGaleria(null)} />
    </div>
  )
}

interface PropsTarjeta {
  casa: House
  fotos: string[]
  votos: number
  porAdulto: number | null
  votacionAbierta: boolean
  esMiVoto: boolean
  votando: boolean
  onVotar: () => void
  elegida: boolean
  propuestaPor: string | null
  puedeEditar: boolean
  puedeBorrar: boolean
  onEditar: () => void
  onBorrar: () => void
  onGaleria: () => void
  onElegir?: () => void
  onReservar?: () => void
}

/** El botoncito de enlace del pie de la tarjeta, que se repite cuatro veces. */
const CHIP =
  'inline-flex items-center gap-1.5 rounded-xl bg-bosque-50 px-3 py-1.5 text-sm font-semibold text-bosque-700 transition hover:bg-bosque-100'

function TarjetaCasa({
  casa,
  fotos,
  votos,
  porAdulto,
  votacionAbierta,
  esMiVoto,
  votando,
  onVotar,
  elegida,
  propuestaPor,
  puedeEditar,
  puedeBorrar,
  onEditar,
  onBorrar,
  onGaleria,
  onElegir,
  onReservar,
}: PropsTarjeta) {
  const portada = portadaDe(casa.cover_image_url, fotos)
  const extras = [
    casa.has_pool && '🏊 Piscina',
    casa.has_bbq && '🔥 Barbacoa',
    casa.has_garden && '🌳 Jardín',
    casa.pets_allowed && '🐕 Mascotas',
  ].filter(Boolean) as string[]

  return (
    <Tarjeta
      className={`flex flex-col overflow-hidden ${
        elegida ? 'ring-2 ring-bosque-500' : esMiVoto ? 'ring-2 ring-oliva-400' : ''
      }`}
    >
      <button
        type="button"
        onClick={onGaleria}
        className="relative block aspect-16/10 w-full overflow-hidden bg-beige"
        aria-label={`Ver fotos de ${casa.name}`}
      >
        {portada ? (
          <img
            src={portada}
            alt={casa.name}
            loading="lazy"
            className="size-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-4xl opacity-40">🏡</span>
        )}
        {fotos.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-velo/65 px-2 py-0.5 text-xs font-semibold text-white">
            {fotos.length} fotos
          </span>
        )}
        <span className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {elegida && (
            <Etiqueta tono="exito">
              <Trophy size={12} /> {casa.reserved ? 'Reservada' : 'Elegida'}
            </Etiqueta>
          )}
          {votos > 0 && (
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-bosque-700">
              {votos} {votos === 1 ? 'voto' : 'votos'}
            </span>
          )}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight text-bosque-800">{casa.name}</h3>
            <p className="truncate text-sm text-suave">
              {[casa.town, casa.province].filter(Boolean).join(', ') || 'Sin localidad'}
            </p>
          </div>
          <div className="-mt-1 -mr-1 flex shrink-0">
            {puedeEditar && (
              <BotonIcono etiqueta="Editar casa" onClick={onEditar}>
                <Pencil size={16} />
              </BotonIcono>
            )}
            {puedeBorrar && (
              <BotonIcono etiqueta="Quitar casa" tono="peligro" onClick={onBorrar}>
                <Trash2 size={16} />
              </BotonIcono>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {casa.total_price != null ? (
            <>
              <span className="font-display text-xl font-bold text-bosque-700">{euros(casa.total_price)}</span>
              {porAdulto != null && (
                <span className="text-sm font-semibold text-tierra-600">{euros(porAdulto)}/adulto</span>
              )}
            </>
          ) : (
            <span className="text-sm text-suave">Precio por confirmar</span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-tenue">
          {casa.max_guests != null && (
            <span className="flex items-center gap-1">
              <Users size={14} /> {casa.max_guests} plazas
            </span>
          )}
          {casa.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble size={14} /> {casa.bedrooms} hab.
            </span>
          )}
          {casa.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath size={14} /> {casa.bathrooms} baños
            </span>
          )}
        </div>

        {extras.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {extras.map((e) => (
              <Etiqueta key={e} tono="oliva">
                {e}
              </Etiqueta>
            ))}
          </div>
        )}

        {casa.features && <p className="text-sm text-tenue">{casa.features}</p>}
        {casa.common_spaces && (
          <p className="text-sm text-suave">
            <span className="font-semibold">Espacios comunes destacables:</span> {casa.common_spaces}
          </p>
        )}
        {casa.notes && (
          <p className="rounded-xl bg-beige px-3 py-2 text-sm whitespace-pre-wrap text-tenue">{casa.notes}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-arena pt-3">
          <Boton
            tamanyo="sm"
            variante={esMiVoto ? 'primario' : 'secundario'}
            disabled={!votacionAbierta}
            cargando={votando}
            onClick={onVotar}
            title={votacionAbierta ? undefined : 'La votación está cerrada'}
          >
            {esMiVoto ? (
              <>
                <Check size={15} /> Me vale
              </>
            ) : (
              'Me vale'
            )}
          </Boton>
          {casa.url && (
            <a
              href={casa.url}
              target="_blank"
              rel="noreferrer noopener"
              className={CHIP}
            >
              <ExternalLink size={15} /> Ver la web
            </a>
          )}
          {/* Una casa suele tener dos sitios donde mirarla, y un teléfono al
              que llamar para preguntar por el finde: de poco sirven si hay
              que abrir el formulario de edición para verlos. */}
          {casa.url2 && (
            <a href={casa.url2} target="_blank" rel="noreferrer noopener" className={CHIP}>
              <ExternalLink size={15} /> La otra web
            </a>
          )}
          {casa.contact_phone && (
            <a href={`tel:${casa.contact_phone.replace(/\s+/g, '')}`} className={CHIP}>
              <Phone size={15} /> {casa.contact_phone}
            </a>
          )}
          {casa.contact_email && (
            <a href={`mailto:${casa.contact_email}`} className={CHIP} aria-label={`Escribir a ${casa.name}`}>
              <Mail size={15} /> Escribir
            </a>
          )}
          {onElegir && (
            <button
              type="button"
              onClick={onElegir}
              className="rounded-xl px-2.5 py-1.5 text-sm font-semibold text-suave transition hover:bg-black/5"
            >
              {elegida ? 'Quitar elección' : 'Marcar elegida'}
            </button>
          )}
          {onReservar && !casa.reserved && (
            <button
              type="button"
              onClick={onReservar}
              className="rounded-xl px-2.5 py-1.5 text-sm font-semibold text-tierra-600 transition hover:bg-tierra-100"
            >
              Marcar reservada
            </button>
          )}
          {propuestaPor && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-suave">
              Propuesta por <Persona perfilId={propuestaPor} />
            </span>
          )}
        </div>
      </div>
    </Tarjeta>
  )
}

/** El enlace de dentro de la tabla comparativa. */
const ENLACE = 'font-semibold text-bosque-600 underline underline-offset-2'

function Comparador({
  casas,
  votos,
  adultos,
  elegidaId,
}: {
  casas: House[]
  votos: Record<string, number>
  adultos: number
  elegidaId: string | null
}) {
  const filas: { etiqueta: string; valor: (c: House) => React.ReactNode; destacar?: boolean }[] = [
    {
      etiqueta: 'Precio total',
      valor: (c) => (c.total_price != null ? euros(c.total_price) : '—'),
      destacar: true,
    },
    {
      etiqueta: 'Por adulto',
      valor: (c) => (c.total_price != null && adultos > 0 ? euros(c.total_price / adultos) : '—'),
      destacar: true,
    },
    { etiqueta: 'Localidad', valor: (c) => [c.town, c.province].filter(Boolean).join(', ') || '—' },
    { etiqueta: 'Plazas', valor: (c) => (c.max_guests != null ? numero(c.max_guests) : '—') },
    { etiqueta: 'Habitaciones', valor: (c) => (c.bedrooms != null ? numero(c.bedrooms) : '—') },
    { etiqueta: 'Baños', valor: (c) => (c.bathrooms != null ? numero(c.bathrooms) : '—') },
    { etiqueta: 'Piscina', valor: (c) => (c.has_pool ? '✅' : '—') },
    { etiqueta: 'Barbacoa', valor: (c) => (c.has_bbq ? '✅' : '—') },
    { etiqueta: 'Jardín', valor: (c) => (c.has_garden ? '✅' : '—') },
    { etiqueta: 'Mascotas', valor: (c) => (c.pets_allowed ? '✅' : '—') },
    { etiqueta: 'Espacios comunes destacables', valor: (c) => c.common_spaces || '—' },
    { etiqueta: 'Características', valor: (c) => c.features || '—' },
    { etiqueta: 'Votos', valor: (c) => votos[c.id] ?? 0, destacar: true },
    {
      etiqueta: 'Teléfono',
      valor: (c) =>
        c.contact_phone ? (
          <a href={`tel:${c.contact_phone.replace(/\s+/g, '')}`} className={ENLACE}>
            {c.contact_phone}
          </a>
        ) : (
          '—'
        ),
    },
    {
      etiqueta: 'Correo',
      valor: (c) =>
        c.contact_email ? (
          <a href={`mailto:${c.contact_email}`} className={ENLACE}>
            {c.contact_email}
          </a>
        ) : (
          '—'
        ),
    },
    {
      etiqueta: 'Web',
      valor: (c) => {
        const webs = [c.url, c.url2].filter(Boolean) as string[]
        if (!webs.length) return '—'
        return (
          <span className="flex flex-wrap gap-2">
            {webs.map((web, i) => (
              <a key={web} href={web} target="_blank" rel="noreferrer noopener" className={ENLACE}>
                {i === 0 ? 'Abrir' : 'La otra'}
              </a>
            ))}
          </span>
        )
      },
    },
  ]

  const minPrecio = Math.min(...casas.filter((c) => c.total_price != null).map((c) => Number(c.total_price)))

  return (
    <div className="tarjeta overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-bosque-600 text-left text-tinta-fuerte">
              <th className="sticky left-0 z-10 bg-bosque-600 px-4 py-3 font-semibold">Casa</th>
              {casas.map((c) => (
                <th key={c.id} className="min-w-40 px-4 py-3 font-semibold">
                  <span className="flex items-center gap-1.5">
                    {c.name}
                    {elegidaId === c.id && <Trophy size={14} className="text-tierra-300" />}
                  </span>
                  {c.total_price != null && Number(c.total_price) === minPrecio && (
                    <span className="mt-1 block text-xs font-medium text-oliva-200">la más barata</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={fila.etiqueta} className={i % 2 ? 'bg-beige/50' : 'bg-superficie'}>
                <th
                  className={`sticky left-0 z-10 px-4 py-2.5 text-left font-semibold whitespace-nowrap text-tenue ${
                    i % 2 ? 'bg-beige' : 'bg-superficie'
                  }`}
                >
                  {fila.etiqueta}
                </th>
                {casas.map((c) => (
                  <td
                    key={c.id}
                    className={`px-4 py-2.5 align-top ${fila.destacar ? 'font-bold text-bosque-700' : 'text-tenue'}`}
                  >
                    {fila.valor(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
