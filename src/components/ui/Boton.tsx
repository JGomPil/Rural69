import { Loader2 } from 'lucide-react'

type Variante = 'primario' | 'secundario' | 'suave' | 'peligro' | 'fantasma' | 'acento'
type Tamanyo = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-bosque-600 text-tinta-fuerte shadow-[0_1px_2px_rgba(27,55,39,0.3),0_6px_16px_-10px_rgba(27,55,39,0.8)] hover:bg-bosque-700 active:bg-bosque-800 active:shadow-[0_1px_2px_rgba(27,55,39,0.3)]',
  acento:
    'bg-tierra-500 text-tinta-fuerte shadow-[0_1px_2px_rgba(133,69,42,0.3),0_6px_16px_-10px_rgba(133,69,42,0.8)] hover:bg-tierra-600 active:bg-tierra-700 active:shadow-[0_1px_2px_rgba(133,69,42,0.3)]',
  secundario: 'bg-superficie text-bosque-700 border border-arena shadow-[0_1px_2px_rgba(74,59,42,0.05)] hover:bg-beige hover:border-arena active:bg-arena active:shadow-none',
  suave: 'bg-bosque-50 text-bosque-700 hover:bg-bosque-100 active:bg-bosque-200',
  peligro: 'bg-superficie text-tierra-700 border border-tierra-200 shadow-[0_1px_2px_rgba(74,59,42,0.05)] hover:bg-tierra-100 active:shadow-none',
  fantasma: 'text-carbon/70 hover:bg-black/5 active:bg-black/10',
}

const TAMANYOS: Record<Tamanyo, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-sm gap-2 rounded-2xl',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
}

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanyo?: Tamanyo
  cargando?: boolean
  ancho?: boolean
}

export function Boton({
  variante = 'primario',
  tamanyo = 'md',
  cargando = false,
  ancho = false,
  className = '',
  children,
  disabled,
  ...resto
}: Props) {
  return (
    <button
      {...resto}
      disabled={disabled || cargando}
      className={`inline-flex shrink-0 items-center justify-center font-semibold tracking-tight transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none ${VARIANTES[variante]} ${TAMANYOS[tamanyo]} ${ancho ? 'w-full' : ''} ${className}`}
    >
      {cargando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

interface PropsIcono extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  etiqueta: string
  tono?: 'normal' | 'peligro'
}

export function BotonIcono({ etiqueta, tono = 'normal', className = '', children, ...resto }: PropsIcono) {
  return (
    <button
      {...resto}
      aria-label={etiqueta}
      title={etiqueta}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl transition active:scale-95 ${
        tono === 'peligro' ? 'text-tierra-600 hover:bg-tierra-100' : 'text-carbon/55 hover:bg-black/5 hover:text-carbon'
      } ${className}`}
    >
      {children}
    </button>
  )
}
