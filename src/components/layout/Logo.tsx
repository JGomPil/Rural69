/**
 * El logo de Rural69: una casa rural cuyas dos ventanas son un 6 y un 9.
 *
 * El 9 no se dibuja aparte: es exactamente el mismo 6 girado media vuelta,
 * que es justo lo que son esas dos cifras. De lejos, o en el icono diminuto
 * de la pestaña, se leen como dos ventanas redondas; de cerca, como el 69.
 */

const BOSQUE = '#2f5d42'
const CREMA = '#f7f2e7'
const TIERRA = '#c87941'

/** Un «6» centrado en el origen, de unas 15 unidades de alto. */
function Seis({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round">
      <circle cx="0" cy="2.6" r="3.9" />
      <path d="M-3.9 2.6C-3.9-2.6-1.3-6 2.7-7.2" />
    </g>
  )
}

export function Logo({ size = 32, fondo = true }: { size?: number; fondo?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      {fondo && <rect width="64" height="64" rx="14" fill="currentColor" />}

      {/* Chimenea, detrás del tejado */}
      <rect x="41" y="11" width="5.5" height="11" rx="1.8" fill={CREMA} />

      {/* Tejado a dos aguas, con alero */}
      <path d="M32 7.5 56 28.5H51.5L32 12.5 12.5 28.5H8Z" fill={CREMA} />

      {/* Fachada */}
      <path d="M14 27.5H50V53A3 3 0 0 1 47 56H17A3 3 0 0 1 14 53Z" fill={CREMA} />

      {/* Las ventanas: el 6 y, girado media vuelta, el 9 */}
      <g transform="translate(23.5 38)">
        <Seis color={BOSQUE} />
      </g>
      <g transform="translate(40.5 38) rotate(180)">
        <Seis color={BOSQUE} />
      </g>

      {/* Puerta con arco */}
      <path d="M28.5 56v-6a3.5 3.5 0 0 1 7 0v6Z" fill={TIERRA} />
    </svg>
  )
}

export function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="text-bosque-600">
        <Logo size={34} />
      </span>
      <span className="font-display text-xl leading-none font-extrabold tracking-tight text-bosque-800">
        Rural<span className="text-tierra-500">69</span>
      </span>
    </span>
  )
}
