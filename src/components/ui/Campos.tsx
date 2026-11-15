const BASE_CAMPO =
  'w-full rounded-2xl border border-arena bg-white px-3.5 py-2.5 text-carbon shadow-[inset_0_1px_2px_rgba(74,59,42,0.04)] ' +
  'placeholder:text-carbon/35 transition duration-150 outline-none ' +
  'hover:border-arena/90 focus:border-bosque-500 focus:ring-3 focus:ring-bosque-500/15 focus:shadow-none ' +
  'disabled:bg-beige disabled:opacity-70'

interface PropsCampo {
  etiqueta?: string
  ayuda?: string
  error?: string | null
  requerido?: boolean
  className?: string
  children: React.ReactNode
}

export function Campo({ etiqueta, ayuda, error, requerido, className = '', children }: PropsCampo) {
  return (
    <label className={`block ${className}`}>
      {etiqueta && (
        <span className="mb-1.5 flex items-center gap-0.5 text-[13px] font-semibold text-carbon/70">
          {etiqueta}
          {requerido && <span className="text-tierra-600">*</span>}
        </span>
      )}
      {children}
      {ayuda && !error && <span className="mt-1 block text-xs text-carbon/50">{ayuda}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-tierra-600">{error}</span>}
    </label>
  )
}

export function Entrada({ className = '', ...resto }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...resto} className={`${BASE_CAMPO} ${className}`} />
}

export function AreaTexto({ className = '', rows = 3, ...resto }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...resto} rows={rows} className={`${BASE_CAMPO} resize-y ${className}`} />
}

export function Lista({ className = '', children, ...resto }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...resto} className={`${BASE_CAMPO} ${className}`}>
      {children}
    </select>
  )
}

interface PropsCasilla {
  checked: boolean
  onChange: (valor: boolean) => void
  etiqueta: React.ReactNode
  descripcion?: string
  grande?: boolean
  disabled?: boolean
}

/** Casilla cómoda de pulsar con el dedo (lista de la compra). */
export function Casilla({ checked, onChange, etiqueta, descripcion, grande = false, disabled }: PropsCasilla) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 select-none ${disabled ? 'opacity-50' : ''} ${
        grande ? 'py-1' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={`shrink-0 cursor-pointer appearance-none rounded-lg border-2 border-arena bg-white transition
          checked:border-bosque-600 checked:bg-bosque-600
          checked:after:flex checked:after:h-full checked:after:items-center checked:after:justify-center
          checked:after:text-white checked:after:content-['✓']
          focus-visible:ring-3 focus-visible:ring-bosque-500/25
          ${grande ? "size-7 checked:after:text-lg" : "size-5 checked:after:text-xs"}`}
      />
      <span className="min-w-0 flex-1">
        <span className={`block ${grande ? 'text-base' : 'text-sm'} font-medium`}>{etiqueta}</span>
        {descripcion && <span className="block text-xs text-carbon/55">{descripcion}</span>}
      </span>
    </label>
  )
}

interface PropsInterruptor {
  checked: boolean
  onChange: (valor: boolean) => void
  etiqueta?: React.ReactNode
  disabled?: boolean
}

export function Interruptor({ checked, onChange, etiqueta, disabled }: PropsInterruptor) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 select-none ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ${checked ? 'bg-bosque-600' : 'bg-arena'}`}
      >
        <span
          className={`absolute top-[3px] size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[21px]' : 'left-[3px]'}`}
        />
      </button>
      {etiqueta && <span className="text-sm font-medium">{etiqueta}</span>}
    </label>
  )
}

/** Campo numérico con botones −/+ para usar con una mano en el supermercado. */
export function Contador({
  valor,
  onChange,
  paso = 1,
  min = 0,
  sufijo,
  disabled,
}: {
  valor: number
  onChange: (v: number) => void
  paso?: number
  min?: number
  sufijo?: string
  disabled?: boolean
}) {
  const ajusta = (delta: number) => {
    const bruto = (Number(valor) || 0) + delta
    const redondeado = Math.round(bruto * 100) / 100
    onChange(Math.max(min, redondeado))
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-arena bg-white p-1">
      <button
        type="button"
        onClick={() => ajusta(-paso)}
        disabled={disabled}
        className="size-8 shrink-0 rounded-xl text-lg font-bold text-carbon/60 transition hover:bg-beige active:scale-95 disabled:opacity-40"
        aria-label="Quitar"
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        step={paso}
        min={min}
        value={Number.isFinite(valor) ? valor : 0}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-11 border-0 bg-transparent px-0 text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {sufijo && <span className="max-w-14 truncate pr-0.5 text-xs text-carbon/55">{sufijo}</span>}
      <button
        type="button"
        onClick={() => ajusta(paso)}
        disabled={disabled}
        className="size-8 shrink-0 rounded-xl text-lg font-bold text-carbon/60 transition hover:bg-beige active:scale-95 disabled:opacity-40"
        aria-label="Añadir"
      >
        +
      </button>
    </div>
  )
}
