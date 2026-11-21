// =====================================================================
// Rural69 · ¿Qué canción suena? · El repertorio
// ---------------------------------------------------------------------
// Pop y rock, del rock and roll a hoy, resuelto contra la tienda por
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
 * Los montones que se pueden elegir al montar la partida. Con seiscientas
 * canciones, «de todo» es una tómbola donde al del heavy le toca Camilo
 * Sesto; esto es para que cada mesa juegue a lo suyo.
 *
 * Van en tres grupos. El estilo lo pone el grupo musical y no la canción,
 * así que «rock» no saca la balada que la tienda tiene fichada como pop.
 * Las épocas son una década cada una y se reparten todos los años sin
 * dejar huecos. Y el idioma va aparte, que es otra pregunta.
 */
export const CATEGORIAS: Categoria[] = [
  { id: 'todo', nombre: 'De todo', tiene: () => true },
  // Por estilo. Lo pone el grupo, no la canción.
  { id: 'rock', grupo: 'Por estilo', nombre: 'Rock', tiene: (p) => p.estilo === 'rock' },
  { id: 'heavy', grupo: 'Por estilo', nombre: 'Heavy y hard rock', tiene: (p) => p.estilo === 'heavy' },
  { id: 'pop', grupo: 'Por estilo', nombre: 'Pop y baile', tiene: (p) => p.estilo === 'pop' },
  { id: 'urbano', grupo: 'Por estilo', nombre: 'Rap y reguetón', tiene: (p) => p.estilo === 'urbano' },
  // Por época. Las seis se reparten TODOS los años y no se pisan: la
  // primera versión tenía «del 60 al 89» y «del 2010 para acá», y los
  // noventa y los dos mil se quedaban sin montón.
  { id: 'a60', grupo: 'Por época', nombre: 'Los 50 y los 60', tiene: (p) => p.anyo < 1970 },
  { id: 'a70', grupo: 'Por época', nombre: 'Los 70', tiene: (p) => p.anyo >= 1970 && p.anyo < 1980 },
  { id: 'a80', grupo: 'Por época', nombre: 'Los 80', tiene: (p) => p.anyo >= 1980 && p.anyo < 1990 },
  { id: 'a90', grupo: 'Por época', nombre: 'Los 90', tiene: (p) => p.anyo >= 1990 && p.anyo < 2000 },
  { id: 'a00', grupo: 'Por época', nombre: 'Los 2000', tiene: (p) => p.anyo >= 2000 && p.anyo < 2010 },
  { id: 'a10', grupo: 'Por época', nombre: 'Del 2010 a hoy', tiene: (p) => p.anyo >= 2010 },
  // Por idioma. Este sí se cruza con la época a propósito: «pon
  // españolas» en una sobremesa quiere decir las de antes, no las de
  // ahora, y al elegir un solo montón no se pueden juntar dos filtros.
  { id: 'esp', grupo: 'Por idioma', nombre: 'Solo en español', tiene: (p) => p.esp === true },
  {
    id: 'verbena',
    grupo: 'Por idioma',
    nombre: 'Españolas de toda la vida',
    tiene: (p) => p.esp === true && p.anyo < 1990,
  },
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
