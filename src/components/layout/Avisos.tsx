import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CheckCheck, House, Inbox, Trash2, Trophy, Vote } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Boton } from '../ui/Boton'
import { Modal } from '../ui/Modal'
import { useGrupo } from '../../hooks/useGrupo'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import { hace } from '../../lib/formato'
import type { Notification as Aviso, TipoAviso } from '../../lib/types'

const ICONOS: Record<TipoAviso, typeof House> = {
  casa_propuesta: House,
  votacion_abierta: Vote,
  votacion_cerrada: CheckCheck,
  casa_elegida: Trophy,
}

const TONOS: Record<TipoAviso, string> = {
  casa_propuesta: 'bg-bosque-50 text-bosque-700',
  votacion_abierta: 'bg-oliva-100 text-oliva-700',
  votacion_cerrada: 'bg-beige text-tenue',
  casa_elegida: 'bg-tierra-100 text-tierra-700',
}

/** La campana de la cabecera, con el número de avisos sin leer. */
export function BotonAvisos({ className = '' }: { className?: string }) {
  const { sinLeer } = useNotificaciones()
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={sinLeer > 0 ? `Avisos (${sinLeer} sin leer)` : 'Avisos'}
        className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-arena bg-superficie text-bosque-700 transition active:scale-95 ${className}`}
      >
        {sinLeer > 0 ? <BellRing size={19} /> : <Bell size={19} />}
        {sinLeer > 0 && (
          <span className="animate-pop absolute -top-1 -right-1 inline-flex min-w-5 justify-center rounded-full bg-tierra-600 px-1 text-[11px] leading-5 font-bold text-tinta-fuerte">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>
      <PanelAvisos abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}

function PanelAvisos({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { lista, sinLeer, marcarTodos, marcarUno, borrarLeidos } = useNotificaciones()
  const { perfiles, miembros } = useGrupo()
  const navegar = useNavigate()

  const abre = (aviso: Aviso) => {
    void marcarUno(aviso.id)
    onCerrar()
    if (aviso.url) navegar(aviso.url)
  }

  const leidos = lista.length - sinLeer

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Avisos"
      descripcion={sinLeer > 0 ? `${sinLeer} sin leer` : 'Todo visto'}
      ancho="sm"
      pie={
        lista.length > 0 ? (
          <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
            {leidos > 0 && (
              <Boton variante="fantasma" tamanyo="sm" onClick={() => void borrarLeidos()}>
                <Trash2 size={15} /> Vaciar leídos
              </Boton>
            )}
            {sinLeer > 0 && (
              <Boton variante="secundario" tamanyo="sm" onClick={() => void marcarTodos()}>
                <CheckCheck size={15} /> Marcar todos
              </Boton>
            )}
          </div>
        ) : undefined
      }
    >
      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-8 text-center">
          <Inbox size={30} className="text-carbon/30" />
          <p className="text-sm text-suave">
            Aquí saldrá cuando alguien proponga una casa o se abra una votación.
          </p>
        </div>
      ) : (
        <ul className="-mx-1 space-y-1.5">
          {lista.map((aviso) => {
            const Icono = ICONOS[aviso.kind] ?? Bell
            const autor = perfiles.find((p) => p.id === aviso.actor_id)
            const foto =
              autor?.avatar_url ?? miembros.find((m) => m.id === autor?.member_id)?.avatar_url ?? null
            return (
              <li key={aviso.id}>
                <button
                  type="button"
                  onClick={() => abre(aviso)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-beige ${
                    aviso.read_at ? 'opacity-60' : 'bg-superficie'
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${TONOS[aviso.kind] ?? 'bg-beige text-tenue'}`}
                  >
                    <Icono size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-sm font-semibold text-bosque-800">
                        {aviso.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-suave">
                        {hace(aviso.created_at)}
                      </span>
                    </span>
                    {aviso.body && <span className="mt-0.5 block text-xs text-tenue">{aviso.body}</span>}
                  </span>
                  {autor && (
                    <span className="mt-0.5 shrink-0">
                      <Avatar src={foto} nombre={autor.display_name || autor.email} tamanyo="sm" />
                    </span>
                  )}
                  {!aviso.read_at && (
                    <span
                      aria-hidden
                      className="mt-3 size-2 shrink-0 rounded-full bg-tierra-500"
                      title="Sin leer"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
