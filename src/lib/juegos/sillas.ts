// =====================================================================
// Rural69 · Juegos · Quién es quién en cada móvil
// ---------------------------------------------------------------------
// En los juegos en los que cada uno juega desde su teléfono hace falta
// saber qué silla ocupa este aparato. Y la silla se guarda EN LA
// PARTIDA, no en el móvil: así quien se queda sin batería y sigue en
// otro teléfono vuelve a ser quien era, y el que todavía no ha dicho
// quién es no ve lo que no debe.
//
// Vive aparte porque lo usan ya dos juegos, y dos copias de esto
// acaban siendo dos reglas distintas sin que nadie se dé cuenta.
// =====================================================================

export interface ConSilla {
  perfil: string | null
}

/** En qué silla se ha sentado esta cuenta. `-1` si en ninguna. */
export function sitioDe(jugadores: readonly ConSilla[], perfil: string | null): number {
  if (!perfil) return -1
  return jugadores.findIndex((p) => p.perfil === perfil)
}

/**
 * Sienta a esta cuenta en una silla. Una cuenta ocupa una y solo una:
 * si estaba en otra, se levanta de aquella.
 */
export function sienta<T extends ConSilla>(jugadores: readonly T[], indice: number, perfil: string): T[] {
  return jugadores.map((p, i) => ({
    ...p,
    perfil: i === indice ? perfil : p.perfil === perfil ? null : p.perfil,
  }))
}

/** Me he sentado donde no era: suelto la silla. */
export function levanta<T extends ConSilla>(jugadores: readonly T[], perfil: string): T[] {
  return jugadores.map((p) => (p.perfil === perfil ? { ...p, perfil: null } : p))
}
