import { Loader2 } from 'lucide-react'
import type { EstadoEscapada } from '../../lib/types'
import { ESTADOS } from '../../lib/constantes'

export function Tarjeta({
  className = '',
  children,
  onClick,
}: {
  className?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`tarjeta sombra-flotante-hover w-full text-left transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${className}`}
      >
        {children}
      </button>
    )
  }
  return <div className={`tarjeta ${className}`}>{children}</div>
}

export function Seccion({
  titulo,
  icono,
  accion,
  children,
  className = '',
}: {
  titulo: string
  icono?: React.ReactNode
  accion?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`animate-sube ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg text-bosque-800">
          {icono && <span className="text-bosque-500">{icono}</span>}
          {titulo}
        </h2>
        {accion}
      </header>
      {children}
    </section>
  )
}

export function Etiqueta({
  children,
  tono = 'neutro',
  className = '',
}: {
  children: React.ReactNode
  tono?: 'neutro' | 'bosque' | 'oliva' | 'tierra' | 'exito'
  className?: string
}) {
  const tonos = {
    neutro: 'bg-beige text-carbon/70 border-arena',
    bosque: 'bg-bosque-50 text-bosque-700 border-bosque-100',
    oliva: 'bg-oliva-100 text-oliva-700 border-oliva-200',
    tierra: 'bg-tierra-100 text-tierra-700 border-tierra-200',
    exito: 'bg-bosque-600 text-white border-bosque-600',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap ${tonos[tono]} ${className}`}
    >
      {children}
    </span>
  )
}

export function EtiquetaEstado({ estado }: { estado: EstadoEscapada }) {
  const e = ESTADOS[estado]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${e.clase}`}
    >
      <span aria-hidden>{e.emoji}</span>
      {e.etiqueta}
    </span>
  )
}

export function Progreso({
  valor,
  total,
  etiqueta,
  tono = 'bosque',
}: {
  valor: number
  total: number
  etiqueta?: string
  tono?: 'bosque' | 'tierra'
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-carbon/60">
        <span>{etiqueta}</span>
        <span>
          {valor}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-arena">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tono === 'bosque' ? 'bg-bosque-500' : 'bg-tierra-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Cargando({ texto = 'Cargando…', alto = 'py-16' }: { texto?: string; alto?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-carbon/50 ${alto}`}>
      <Loader2 size={28} className="animate-spin text-bosque-500" />
      <p className="text-sm font-medium">{texto}</p>
    </div>
  )
}

export function Vacio({
  emoji = '🌿',
  titulo,
  texto,
  accion,
}: {
  emoji?: string
  titulo: string
  texto?: string
  accion?: React.ReactNode
}) {
  return (
    <div className="animate-sube flex flex-col items-center gap-3 rounded-card border border-dashed border-arena bg-white/60 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <div>
        <h3 className="text-base text-bosque-800">{titulo}</h3>
        {texto && <p className="mx-auto mt-1 max-w-sm text-sm text-carbon/60">{texto}</p>}
      </div>
      {accion}
    </div>
  )
}

export function AvisoError({ texto, onReintentar }: { texto: string; onReintentar?: () => void }) {
  return (
    <div className="rounded-2xl border border-tierra-200 bg-tierra-100 px-4 py-3 text-sm text-tierra-700">
      <p className="font-semibold">Vaya, algo no ha ido bien</p>
      <p className="mt-0.5 opacity-90">{texto}</p>
      {onReintentar && (
        <button type="button" onClick={onReintentar} className="mt-2 font-semibold underline underline-offset-2">
          Reintentar
        </button>
      )}
    </div>
  )
}

/** Dato destacado para paneles y estadísticas. */
export function Dato({
  valor,
  etiqueta,
  icono,
  tono = 'bosque',
}: {
  valor: React.ReactNode
  etiqueta: string
  icono?: React.ReactNode
  tono?: 'bosque' | 'oliva' | 'tierra'
}) {
  const tonos = {
    bosque: 'text-bosque-700',
    oliva: 'text-oliva-700',
    tierra: 'text-tierra-600',
  }
  return (
    <div className="tarjeta flex flex-col gap-1 p-4">
      {icono && <span className={`${tonos[tono]} opacity-80`}>{icono}</span>}
      <span className={`font-display text-2xl leading-tight font-bold tracking-tight tabular-nums ${tonos[tono]}`}>
        {valor}
      </span>
      <span className="text-xs leading-snug font-medium text-carbon/55">{etiqueta}</span>
    </div>
  )
}
