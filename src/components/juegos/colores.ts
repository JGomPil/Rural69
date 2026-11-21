import type { Lado } from '../../lib/juegos/furor'

/**
 * Verde para un equipo y terracota para el otro, iguales en el reparto,
 * en el marcador y en los botones. En un juego a voces, el color es lo
 * que se lee desde el otro lado de la mesa, no el nombre.
 */
export const COLOR: Record<Lado, { fondo: string; texto: string; suave: string; borde: string }> = {
  a: { fondo: 'bg-bosque-600', texto: 'text-bosque-700', suave: 'bg-bosque-100', borde: 'border-bosque-300' },
  b: { fondo: 'bg-tierra-600', texto: 'text-tierra-700', suave: 'bg-tierra-100', borde: 'border-tierra-300' },
}

/**
 * Los colores de las fichas del Trivial. Diez, porque somos los que
 * somos, y elegidos para distinguirse de un vistazo en una ficha de
 * tres milímetros: ni dos azules ni dos verdes seguidos.
 */
export const FICHAS = [
  '#C2402A',
  '#1D5C8A',
  '#3E7D32',
  '#D98324',
  '#6B3FA0',
  '#0E8F86',
  '#8A3B5F',
  '#5C4433',
  '#9A8C1A',
  '#2C3E73',
]
