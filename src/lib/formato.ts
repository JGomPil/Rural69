// =====================================================================
// Rural69 · Formateo de fechas, números y cantidades
// =====================================================================

const EUROS = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const EUROS_DECIMAL = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function euros(valor: number | null | undefined, decimales = false): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return decimales ? EUROS_DECIMAL.format(valor) : EUROS.format(valor)
}

export function numero(valor: number | null | undefined, maxDecimales = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxDecimales }).format(valor)
}

/** `2026-03-14` -> `14 mar 2026` */
export function fecha(iso: string | null | undefined, largo = false): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: largo ? 'long' : 'short',
    year: 'numeric',
  })
}

/** Rango compacto: `13 – 15 mar 2026` */
export function rangoFechas(inicio: string | null, fin: string | null): string {
  if (!inicio && !fin) return 'Fechas por decidir'
  if (inicio && !fin) return fecha(inicio)
  if (!inicio && fin) return `hasta el ${fecha(fin)}`
  const a = new Date(`${inicio}T12:00:00`)
  const b = new Date(`${fin}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—'
  const mismoAnyo = a.getFullYear() === b.getFullYear()
  const mismoMes = mismoAnyo && a.getMonth() === b.getMonth()
  if (mismoMes) {
    return `${a.getDate()} – ${b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  if (mismoAnyo) {
    return `${a.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return `${fecha(inicio)} – ${fecha(fin)}`
}

/** Número de noches entre las dos fechas. */
export function noches(inicio: string | null, fin: string | null): number | null {
  if (!inicio || !fin) return null
  const a = new Date(`${inicio}T12:00:00`).getTime()
  const b = new Date(`${fin}T12:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  const dias = Math.round((b - a) / 86_400_000)
  return dias > 0 ? dias : null
}

/** Días que faltan para la fecha (negativo si ya pasó). */
export function diasHasta(iso: string | null): number | null {
  if (!iso) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d.getTime() - hoy.getTime()) / 86_400_000)
}

export function cuentaAtras(iso: string | null): string | null {
  const d = diasHasta(iso)
  if (d === null) return null
  if (d > 1) return `En ${d} días`
  if (d === 1) return '¡Mañana!'
  if (d === 0) return '¡Hoy es el día!'
  return null
}

/** `1.5 l` con la unidad pegada y sin decimales inútiles. */
export function cantidad(valor: number | null | undefined, unidad?: string | null): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  const n = numero(valor, 2)
  return unidad ? `${n} ${unidad}` : n
}

export function hoyISO(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Hora de un mensaje: `18:42`. */
export function hora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/** Separador de día del chat: «Hoy», «Ayer» o `martes, 14 de marzo`. */
export function diaDeChat(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const soloDia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dias = Math.round((soloDia(new Date()) - soloDia(d)) / 86_400_000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const opciones: Intl.DateTimeFormatOptions =
    dias < 365 ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' }
  return d.toLocaleDateString('es-ES', opciones)
}
