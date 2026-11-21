// =====================================================================
// Rural69 · ¿Qué peli suena? · El repertorio
// ---------------------------------------------------------------------
// Las películas y su trozo de música viven en un .json que genera
// `scripts/bandas-sonoras.mjs` contra la tienda de Apple. Aquí solo se
// carga y se traduce a la `Pista` que entienden las reglas.
//
// Por qué el .json trae ya la URL del sonido y no se pregunta en el
// momento: la tienda corta a las veinte peticiones por minuto POR IP, y
// diez móviles en el wifi de una casa rural son una sola IP. Preguntar
// en vivo sería quedarse sin música a la tercera ronda. Así no se le
// pide nada a nadie: el móvil que hace de altavoz va directo al archivo
// de sonido, que está en una CDN y no tiene ese límite.
// =====================================================================

import type { Pista } from './musica'

/** Lo que trae el .json, tal cual lo escribe el script. */
interface Banda {
  id: number
  peli: string
  alias: string[]
  anyo: number
  /** El tema concreto que suena, para el remate de la ronda. */
  tema: string
  autor: string
  preview: string
}

let pistas: Pista[] | null = null

/** Carga el repertorio. La segunda vez no cuesta nada. */
export async function cargaLasBandas(): Promise<Pista[]> {
  if (!pistas) {
    const modulo = await import('./bandas.json')
    const bandas = (modulo.default ?? modulo) as unknown as Banda[]
    pistas = bandas.map((b) => ({
      id: b.id,
      titulo: b.peli,
      alias: b.alias,
      anyo: b.anyo,
      pie: `«${b.tema}», de ${b.autor}`,
      preview: b.preview,
    }))
  }
  return pistas
}
