import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ListChecks, UserCheck } from 'lucide-react'
import type { Pendiente } from '../../lib/pendientes'
import { Tarjeta } from '../ui/Varios'

/**
 * «Qué falta por hacer», en el panel.
 *
 * Es lo que convierte el panel en algo que se usa: antes saludaba y
 * enseñaba cuentas (tres casas, dos votos), y con eso no sabías si te
 * tocaba algo. Ahora lo primero que se lee es la tarea, con su enlace.
 *
 * Lo tuyo va marcado y arriba, con el color de acento, porque es lo único
 * que puedes resolver sin esperar a nadie.
 */
export function QueFalta({ pendientes }: { pendientes: Pendiente[] }) {
  if (pendientes.length === 0) {
    return (
      <Tarjeta className="animate-sube flex items-center gap-3 p-4">
        <CheckCircle2 size={20} className="shrink-0 text-bosque-600" />
        <p className="text-sm font-semibold text-bosque-800">
          Todo en orden: no hay nada pendiente ahora mismo.
        </p>
      </Tarjeta>
    )
  }

  const mias = pendientes.filter((p) => p.dequien === 'tuyo').length

  return (
    <Tarjeta className="animate-sube overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-arena px-4 py-3">
        <ListChecks size={19} className="shrink-0 text-bosque-500" />
        <h2 className="flex-1 text-base text-bosque-800">Qué falta por hacer</h2>
        {mias > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-tierra-600 px-2.5 py-0.5 text-xs font-bold text-tinta-fuerte">
            <UserCheck size={13} /> {mias} {mias === 1 ? 'tuya' : 'tuyas'}
          </span>
        )}
      </header>

      <ul className="divide-y divide-arena">
        {pendientes.map((p) => (
          <li key={p.id}>
            <Link
              to={p.a}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-beige/60 ${
                p.dequien === 'tuyo' ? 'bg-tierra-100/60' : ''
              }`}
            >
              <span
                className={`mt-0.5 size-2.5 shrink-0 rounded-full ${
                  p.dequien === 'tuyo' ? 'bg-tierra-600' : p.dequien === 'admin' ? 'bg-oliva-400' : 'bg-bosque-400'
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm leading-snug font-semibold ${
                    p.dequien === 'tuyo' ? 'text-tierra-700' : 'text-bosque-800'
                  }`}
                >
                  {p.texto}
                </span>
                {p.detalle && <span className="mt-0.5 block text-xs leading-snug text-suave">{p.detalle}</span>}
              </span>
              <ArrowRight size={16} className="shrink-0 text-carbon/30" />
            </Link>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}
