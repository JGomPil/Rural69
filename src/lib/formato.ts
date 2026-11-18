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

/** `2026-03-14` -> `14 mar` (y con el año si no es el que corre). */
export function fechaCorta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  const mismoAnyo = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(mismoAnyo ? {} : { year: '2-digit' }),
  })
}

/** Un fin de semana en corto: `20–22 nov`. */
export function findeCorto(inicio: string, fin: string): string {
  const a = new Date(`${inicio}T12:00:00`)
  const b = new Date(`${fin}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—'
  const mismoMes = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  return mismoMes ? `${a.getDate()}–${fechaCorta(fin)}` : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`
}

/**
 * Los fines de semana que vienen, de viernes a domingo.
 *
 * Existe porque proponer unas fechas obligaba a escribir dos fechas a mano
 * en un móvil, y eso lo hace una persona del grupo, no once. Con los findes
 * ya calculados, proponer es un toque y la votación arranca sola.
 *
 * El primero es el próximo viernes; si hoy es viernes, hoy. El fin de semana
 * que ya ha empezado no se ofrece: nadie organiza una escapada para esta
 * misma tarde.
 */
export function proximosFindes(cuantos = 10, desde: Date = new Date()): { inicio: string; fin: string }[] {
  const dia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  // 5 = viernes. Lo que falta hasta el próximo (0 si hoy ya lo es).
  const faltan = (5 - dia.getDay() + 7) % 7
  dia.setDate(dia.getDate() + faltan)

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const findes: { inicio: string; fin: string }[] = []
  for (let i = 0; i < cuantos; i++) {
    const viernes = new Date(dia)
    viernes.setDate(dia.getDate() + i * 7)
    const domingo = new Date(viernes)
    domingo.setDate(viernes.getDate() + 2)
    findes.push({ inicio: iso(viernes), fin: iso(domingo) })
  }
  return findes
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

/** Antigüedad de un aviso, corta: «ahora», «hace 5 min», «hace 3 h», «ayer». */
export function hace(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const seg = Math.round((Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'ahora'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86_400) return `hace ${Math.floor(seg / 3600)} h`
  const dias = Math.floor(seg / 86_400)
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return fecha(iso)
}
