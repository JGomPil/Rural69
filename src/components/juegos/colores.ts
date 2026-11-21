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
