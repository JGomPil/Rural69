// =====================================================================
// Rural69 · ¿Qué peli suena? · El repertorio
// ---------------------------------------------------------------------
// Las películas y su trozo de música viven en un .json que genera
// `scripts/bandas-sonoras.mjs` contra la tienda de Apple. Aquí solo se
// carga y se reparte.
//
// Por qué el .json trae ya la URL del sonido y no se pregunta en el
// momento: la tienda corta a las veinte peticiones por minuto POR IP, y
// diez móviles en el wifi de una casa rural son una sola IP. Preguntar
// en vivo sería quedarse sin música a la tercera ronda. Así no se le
// pide nada a nadie: el móvil que hace de altavoz va directo al archivo
// de sonido, que está en una CDN y no tiene ese límite.
//
// Las URL de preview caducan de higos a brevas. Para eso está el
// identificador: si el sonido falla, se pide una nueva —una sola
// petición, y solo cuando ha fallado— y la ronda sigue.
// =====================================================================

export interface Banda {
  /** El de la tienda. Sirve para no repetir y para pedir otra URL. */
  id: number
  peli: string
  /** Otros títulos de la misma peli. Se dicen al destaparla. */
  alias: string[]
  anyo: number
  /** El tema concreto que suena, para el remate de la ronda. */
  tema: string
  autor: string
  /** Treinta segundos de música, en la CDN de la tienda. */
  preview: string
}

let bandas: Banda[] | null = null

/** Carga el repertorio. La segunda vez no cuesta nada. */
export async function cargaLasBandas(): Promise<Banda[]> {
  if (!bandas) {
    const modulo = await import('./bandas.json')
    bandas = (modulo.default ?? modulo) as unknown as Banda[]
  }
  return bandas
}

/**
 * Saca una que no haya salido. Si se han acabado todas —partida larga
 * de verdad—, vuelve a empezar antes que dejar la ronda sin música.
 */
export function sacaBandaDe(todas: Banda[], usadas: number[], azar: () => number = Math.random): Banda | null {
  if (todas.length === 0) return null
  const gastadas = new Set(usadas)
  const quedan = todas.filter((b) => !gastadas.has(b.id))
  const monton = quedan.length > 0 ? quedan : todas
  return monton[Math.floor(azar() * monton.length)]
}

/**
 * La URL ha caducado: pedir otra a la tienda. Devuelve `null` si
 * tampoco hay manera, y entonces en pantalla sale el botón de saltar.
 */
export async function refrescaElSonido(id: number): Promise<string | null> {
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=ES`)
    if (!r.ok) return null
    const datos = JSON.parse(await r.text()) as { results?: { previewUrl?: string }[] }
    return datos.results?.[0]?.previewUrl ?? null
  } catch {
    return null
  }
}
