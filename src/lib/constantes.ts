import type { EstadoEscapada } from './types'

export const CATEGORIAS = [
  'Desayunos',
  'Aperitivos',
  'Comidas',
  'Cenas',
  'Bebidas',
  'Postres',
  'Fruta',
  'Verduras',
  'Carne y pescado',
  'Limpieza',
  'Otros',
] as const

/** Emoji y color por categoría, para que la lista se lea de un vistazo. */
export const ESTILO_CATEGORIA: Record<string, { emoji: string; clase: string }> = {
  Desayunos: { emoji: '🥐', clase: 'bg-tierra-100 text-tierra-700' },
  Aperitivos: { emoji: '🫒', clase: 'bg-oliva-100 text-oliva-700' },
  Comidas: { emoji: '🥘', clase: 'bg-tierra-200 text-tierra-700' },
  Cenas: { emoji: '🌙', clase: 'bg-bosque-100 text-bosque-700' },
  Bebidas: { emoji: '🍻', clase: 'bg-oliva-200 text-oliva-700' },
  Postres: { emoji: '🍰', clase: 'bg-tierra-100 text-tierra-700' },
  Fruta: { emoji: '🍎', clase: 'bg-tierra-200 text-tierra-700' },
  Verduras: { emoji: '🥬', clase: 'bg-oliva-100 text-oliva-700' },
  'Carne y pescado': { emoji: '🍖', clase: 'bg-tierra-200 text-tierra-700' },
  Limpieza: { emoji: '🧼', clase: 'bg-bosque-50 text-bosque-600' },
  Otros: { emoji: '🧺', clase: 'bg-arena text-tenue' },
}

export function estiloCategoria(categoria: string) {
  return ESTILO_CATEGORIA[categoria] ?? ESTILO_CATEGORIA.Otros
}

export const UNIDADES = [
  'ud',
  'kg',
  'g',
  'l',
  'ml',
  'paquete',
  'bolsa',
  'botella',
  'lata',
  'bote',
  'barra',
  'docena',
  'rollo',
  'tableta',
  'bandeja',
] as const

export const ESTADOS: Record<EstadoEscapada, { etiqueta: string; clase: string; emoji: string }> = {
  planificacion: { etiqueta: 'En planificación', clase: 'bg-tierra-100 text-tierra-700 border-tierra-200', emoji: '✏️' },
  confirmada: { etiqueta: 'Confirmada', clase: 'bg-oliva-100 text-oliva-700 border-oliva-300', emoji: '✅' },
  realizada: { etiqueta: 'Realizada', clase: 'bg-bosque-100 text-bosque-700 border-bosque-200', emoji: '🏡' },
  archivada: { etiqueta: 'Archivada', clase: 'bg-arena text-suave border-arena', emoji: '📦' },
}

export const ESTADOS_SOBRANTE = ['Perfecto', 'Abierto', 'Casi acabado', 'Caduca pronto'] as const
