import { Link } from 'react-router-dom'
import { ChevronRight, Home, NotebookPen, ShoppingCart, Trophy, Users, Vote } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useConsulta } from '../../hooks/useConsulta'
import { useGrupo } from '../../hooks/useGrupo'
import { supabase } from '../../lib/supabase'
import { AvisoError, Cargando, Dato, Etiqueta, Progreso, Tarjeta } from '../ui/Varios'
import { cuentaAdultosNinos } from '../../lib/cantidades'
import { euros, numero } from '../../lib/formato'
import type { House } from '../../lib/types'

export function ResumenEscapada() {
  const { escapada, participantes, personas } = useEscapada()
  const { hogares } = useGrupo()

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [casas, votos, compra] = await Promise.all([
        supabase.from('houses').select('*').eq('trip_id', escapada.id),
        supabase.from('votes').select('house_id').eq('trip_id', escapada.id),
        supabase.from('shopping_items').select('purchased').eq('trip_id', escapada.id),
      ])
      if (casas.error) throw casas.error
      if (votos.error) throw votos.error
      if (compra.error) throw compra.error
      const items = compra.data ?? []
      return {
        casas: (casas.data ?? []) as House[],
        votos: (votos.data ?? []).length,
        total: items.length,
        comprados: items.filter((i) => i.purchased).length,
      }
    },
    [escapada.id],
    { realtime: ['houses', 'votes', 'shopping_items'] },
  )

  if (cargando) return <Cargando />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />
  if (!datos) return null

  const { adultos, ninos } = cuentaAdultosNinos(participantes)
  const elegida = datos.casas.find((c) => c.id === escapada.chosen_house_id)
  const adultosQueVienen = participantes.filter((m) => !m.is_child).length
  const precioPorAdulto =
    elegida?.total_price && adultosQueVienen > 0 ? elegida.total_price / adultosQueVienen : null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato
          icono={<Users size={18} />}
          valor={participantes.length}
          etiqueta={`${adultos} adultos · ${ninos} niños`}
        />
        <Dato icono={<Home size={18} />} valor={datos.casas.length} etiqueta="Casas propuestas" tono="oliva" />
        <Dato icono={<Vote size={18} />} valor={datos.votos} etiqueta="Votos emitidos" tono="tierra" />
        <Dato
          icono={<ShoppingCart size={18} />}
          valor={datos.total ? `${datos.comprados}/${datos.total}` : '—'}
          etiqueta="Compra marcada"
        />
      </div>

      {elegida ? (
        <Tarjeta className="overflow-hidden">
          <div className="flex items-stretch gap-0">
            {elegida.cover_image_url && (
              <img
                src={elegida.cover_image_url}
                alt=""
                className="hidden w-40 shrink-0 object-cover sm:block"
                loading="lazy"
              />
            )}
            <div className="flex-1 p-4">
              <Etiqueta tono="exito">
                <Trophy size={12} /> {elegida.reserved ? 'Reservada' : 'Casa elegida'}
              </Etiqueta>
              <h3 className="font-display mt-2 text-lg text-bosque-800">{elegida.name}</h3>
              <p className="text-sm text-carbon/60">
                {[elegida.town, elegida.province].filter(Boolean).join(', ') || 'Sin localidad'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {elegida.total_price != null && <Etiqueta>{euros(elegida.total_price)} en total</Etiqueta>}
                {precioPorAdulto != null && <Etiqueta tono="oliva">{euros(precioPorAdulto)} por adulto</Etiqueta>}
              </div>
              {elegida.url && (
                <a
                  href={elegida.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block text-sm font-semibold text-bosque-600 underline underline-offset-2"
                >
                  Ver la casa
                </a>
              )}
            </div>
          </div>
        </Tarjeta>
      ) : (
        <Link
          to={`/escapadas/${escapada.id}/casas`}
          className="tarjeta flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
        >
          <span className="text-2xl" aria-hidden>
            🏡
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-bosque-800">Todavía no hay casa elegida</span>
            <span className="block text-sm text-carbon/60">
              {datos.casas.length === 0
                ? 'Añadid las casas rurales candidatas.'
                : `${datos.casas.length} candidatas esperando votos.`}
            </span>
          </span>
          <ChevronRight size={18} className="text-carbon/30" />
        </Link>
      )}

      {datos.total > 0 && (
        <Tarjeta className="p-4">
          <Progreso valor={datos.comprados} total={datos.total} etiqueta="Lista de la compra" />
          <div className="mt-3 flex items-center justify-end">
            <Link
              to={`/escapadas/${escapada.id}/compra`}
              className="text-sm font-semibold text-bosque-600 hover:underline"
            >
              Ir a la compra →
            </Link>
          </div>
        </Tarjeta>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Tarjeta className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-base text-bosque-800">
            <Users size={17} /> Quién viene
          </h3>
          {participantes.length === 0 ? (
            <p className="text-sm text-carbon/55">
              Nadie apuntado todavía. Edita la escapada para marcar quién viene.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {participantes.map((m) => (
                  <span
                    key={m.id}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      m.is_child ? 'bg-tierra-100 text-tierra-700' : 'bg-bosque-50 text-bosque-700'
                    }`}
                  >
                    {m.name}
                    {m.is_child && ' 🧒'}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-carbon/50">
                {numero(personas)} personas equivalentes para calcular la compra
                {hogares.length > 0 && ` · ${new Set(participantes.map((m) => m.household_id)).size} unidades familiares`}
              </p>
            </>
          )}
        </Tarjeta>

        <Tarjeta className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-base text-bosque-800">
            <NotebookPen size={17} /> Observaciones
          </h3>
          {escapada.notes ? (
            <p className="text-sm whitespace-pre-wrap text-carbon/70">{escapada.notes}</p>
          ) : (
            <p className="text-sm text-carbon/50">Sin notas. Podéis apuntar aquí la hora de llegada, quién lleva el coche…</p>
          )}
        </Tarjeta>
      </div>
    </div>
  )
}
