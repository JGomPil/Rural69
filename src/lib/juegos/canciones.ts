// =====================================================================
// Rural69 · ¿Qué canción suena? · El repertorio
// ---------------------------------------------------------------------
// Pop y rock de 1960 a 2010, resuelto contra la tienda de Apple por
// `scripts/canciones.mjs`, que guarda el identificador y la
// previsualización de 30 segundos de cada una. Aquí solo se carga y se
// traduce a la `Pista` que entienden las reglas.
//
// En este el remate es el artista, no el compositor: lo que se grita en
// el salón es «¡Mecano!» igual de a menudo que el título.
// =====================================================================

import type { Pista } from './musica'

/** Lo que trae el .json, tal cual lo escribe el script. */
interface Cancion {
  id: number
  titulo: string
  alias: string[]
  artista: string
  anyo: number
  preview: string
}

let pistas: Pista[] | null = null

/** Carga el repertorio. La segunda vez no cuesta nada. */
export async function cargaLasCanciones(): Promise<Pista[]> {
  if (!pistas) {
    const modulo = await import('./canciones.json')
    const canciones = (modulo.default ?? modulo) as unknown as Cancion[]
    pistas = canciones.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      alias: c.alias,
      anyo: c.anyo,
      pie: c.artista,
      preview: c.preview,
    }))
  }
  return pistas
}
