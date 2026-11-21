// =====================================================================
// Rural69 · ¿Qué canción suena? · El repertorio
// ---------------------------------------------------------------------
// Pop y rock de 1960 a hoy, resuelto contra la tienda de Apple por
// `scripts/canciones.mjs`, que guarda el identificador y la
// previsualización de 30 segundos de cada una. Aquí solo se carga y se
// traduce a la `Pista` que entienden las reglas.
//
// En este el remate es el artista, no el compositor: lo que se grita en
// el salón es «¡Mecano!» igual de a menudo que el título.
// =====================================================================

import type { Categoria, Pista } from './musica'

/** Lo que trae el .json, tal cual lo escribe el script. */
interface Cancion {
  id: number
  titulo: string
  alias: string[]
  artista: string
  anyo: number
  /** rock, heavy, pop o urbano, puesto por el script. */
  estilo: string
  /** Si se canta en español. */
  esp: boolean
  preview: string
}

/**
 * Los montones que se pueden elegir al montar la partida. Con medio
 * millar de canciones, «de todo» es una tómbola donde al del heavy le
 * toca Camilo Sesto; esto es para que cada mesa juegue a lo suyo.
 *
 * El estilo lo pone el grupo, no la canción: así «rock» no te saca la
 * balada que la tienda tiene fichada como pop.
 */
export const CATEGORIAS: Categoria[] = [
  { id: 'todo', nombre: 'De todo', tiene: () => true },
  { id: 'rock', nombre: 'Rock', tiene: (p) => p.estilo === 'rock' },
  { id: 'heavy', nombre: 'Heavy y hard rock', tiene: (p) => p.estilo === 'heavy' },
  { id: 'pop', nombre: 'Pop y baile', tiene: (p) => p.estilo === 'pop' },
  { id: 'urbano', nombre: 'Rap y reguetón', tiene: (p) => p.estilo === 'urbano' },
  { id: 'esp', nombre: 'Solo en español', tiene: (p) => p.esp === true },
  // La sobremesa del domingo: copla, verbena y pop español de cuando la
  // tele era en blanco y negro. Es el montón que se pide de verdad
  // cuando alguien dice «pon españolas», y no vale con cruzar los dos
  // filtros a mano porque solo se elige uno.
  { id: 'verbena', nombre: 'Españolas de toda la vida', tiene: (p) => p.esp === true && p.anyo < 1990 },
  { id: 'viejas', nombre: 'Del 60 al 89', tiene: (p) => p.anyo < 1990 },
  { id: 'nuevas', nombre: 'Del 2010 para acá', tiene: (p) => p.anyo >= 2010 },
]

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
      estilo: c.estilo,
      esp: c.esp,
      preview: c.preview,
    }))
  }
  return pistas
}
