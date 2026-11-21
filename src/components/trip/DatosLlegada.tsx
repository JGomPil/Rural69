import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Clock, Copy, KeyRound, MapPin, Phone, Signpost, Wifi } from 'lucide-react'
import { Tarjeta } from '../ui/Varios'
import type { House } from '../../lib/types'

/**
 * Lo que hace falta cuando ya estás en el coche.
 *
 * Todo lo demás de la aplicación sirve para decidir: votar el finde,
 * comparar casas, repartir la compra. Esta tarjeta es la única que sirve
 * estando allí, y por eso vive en el Resumen, que es lo primero que se
 * abre, y se guarda en la copia local, que es lo único que hay cuando no
 * hay cobertura.
 *
 * Aparece sola: mientras nadie haya apuntado nada, en su lugar se ve un
 * recordatorio de apuntarlo.
 */
export function DatosLlegada({
  casa,
  escapadaId,
  /** En el panel, durante la escapada, callarse si no hay nada apuntado:
   *  ya estás dentro de la casa, recordarte que apuntes la dirección no
   *  sirve para nada. */
  silencioso = false,
}: {
  casa: House
  escapadaId: string
  silencioso?: boolean
}) {
  const direccion = [casa.address, casa.town, casa.province].map((x) => x?.trim()).filter(Boolean).join(', ')
  const mapa =
    casa.map_url?.trim() ||
    (direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : null)

  const hayAlgo = Boolean(
    casa.address ||
      casa.map_url ||
      casa.check_in ||
      casa.check_out ||
      casa.owner_phone ||
      casa.owner_name ||
      casa.gate_code ||
      casa.wifi_name ||
      casa.wifi_password ||
      casa.arrival_notes,
  )

  if (!hayAlgo) {
    if (silencioso) return null
    return (
      <Link
        to={`/escapadas/${escapadaId}/casas`}
        className="tarjeta no-imprimir flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
      >
        <span className="text-2xl" aria-hidden>
          🔑
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-bosque-800">Faltan los datos de llegada</span>
          <span className="block text-sm text-suave">
            La dirección, la hora de entrada, el teléfono del dueño, la clave del portón y el wifi. Apúntalos en la
            ficha de la casa y los tendréis aquí aunque no haya cobertura.
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-carbon/30" />
      </Link>
    )
  }

  const horas = [casa.check_in?.trim() && `Entrada: ${casa.check_in.trim()}`, casa.check_out?.trim() && `Salida: ${casa.check_out.trim()}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <Tarjeta className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-base text-bosque-800">
        <KeyRound size={17} /> Al llegar
      </h3>

      <dl className="space-y-3">
        {direccion && (
          <Fila icono={<MapPin size={15} />} titulo="Dirección">
            {mapa ? (
              <a
                href={mapa}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-bosque-600 underline underline-offset-2"
              >
                {direccion}
              </a>
            ) : (
              direccion
            )}
          </Fila>
        )}

        {horas && (
          <Fila icono={<Clock size={15} />} titulo="Horario">
            {horas}
          </Fila>
        )}

        {(casa.owner_phone?.trim() || casa.owner_name?.trim()) && (
          <Fila icono={<Phone size={15} />} titulo={casa.owner_name?.trim() || 'Teléfono'}>
            {casa.owner_phone?.trim() ? (
              <a
                href={`tel:${casa.owner_phone.replace(/[^\d+]/g, '')}`}
                className="font-semibold text-bosque-600 underline underline-offset-2"
              >
                {casa.owner_phone.trim()}
              </a>
            ) : (
              'Sin teléfono apuntado'
            )}
          </Fila>
        )}

        {casa.gate_code?.trim() && (
          <Fila icono={<KeyRound size={15} />} titulo="Clave">
            <Copiable texto={casa.gate_code.trim()} />
          </Fila>
        )}

        {(casa.wifi_name?.trim() || casa.wifi_password?.trim()) && (
          <Fila icono={<Wifi size={15} />} titulo={casa.wifi_name?.trim() || 'Wifi'}>
            {casa.wifi_password?.trim() ? <Copiable texto={casa.wifi_password.trim()} /> : 'Sin contraseña apuntada'}
          </Fila>
        )}

        {casa.arrival_notes?.trim() && (
          <Fila icono={<Signpost size={15} />} titulo="Cómo llegar">
            <span className="whitespace-pre-wrap">{casa.arrival_notes.trim()}</span>
          </Fila>
        )}
      </dl>
    </Tarjeta>
  )
}

function Fila({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-bosque-600" aria-hidden>
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-bold tracking-wide text-suave uppercase">{titulo}</dt>
        <dd className="text-sm break-words text-tenue">{children}</dd>
      </div>
    </div>
  )
}

/**
 * Una clave se copia, no se teclea: la del portón se mete en un teclado
 * numérico con el coche en marcha, y la del wifi tiene catorce caracteres
 * aleatorios. En un móvil, además, se agradece no tener que seleccionar
 * texto con el dedo.
 */
function Copiable({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      // Sin permiso de portapapeles no pasa nada: el texto está a la vista.
    }
  }

  return (
    <span className="flex items-center gap-2">
      <code className="rounded-lg bg-beige px-2 py-0.5 font-mono text-sm tracking-wide text-bosque-800 select-all">
        {texto}
      </code>
      <button
        type="button"
        onClick={() => void copia()}
        aria-label={copiado ? 'Copiado' : 'Copiar'}
        className="no-imprimir rounded-lg p-1.5 text-suave transition hover:bg-beige hover:text-bosque-700"
      >
        {copiado ? <Check size={15} className="text-bosque-600" /> : <Copy size={15} />}
      </button>
    </span>
  )
}
