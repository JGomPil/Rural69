// =====================================================================
// Rural69 · Qué foto hace de portada
// ---------------------------------------------------------------------
// La casa guarda su portada en `cover_image_url`, aparte de la lista de
// `house_photos`. Eso traía un fallo que se veía enseguida: al borrar la
// foto que era portada, la columna seguía apuntando a ella —el fichero
// del bucket no se va a ninguna parte—, y la casa enseñaba en el Panel,
// en la Votación y en el Resumen una foto que ya no estaba en la ficha.
//
// La regla ahora es una sola: la portada es la primera de las fotos. La
// columna se sigue guardando porque hay cuatro pantallas que solo tienen
// la casa a mano, sin su lista de fotos, pero se mantiene en su sitio.
// Lo que queda apuntado y no cuadra se corrige al cargar.
// =====================================================================

/**
 * Las fotos con la portada delante. Si la apuntada ya no está entre ellas
 * manda la primera que quede; si no queda ninguna, la portada es lo único
 * que hay (casas antiguas que solo tenían esa) y se conserva.
 */
export function ordenaConPortada(portada: string | null | undefined, fotos: string[]): string[] {
  const limpia = (portada ?? '').trim()
  if (!limpia) return [...fotos]
  if (fotos.includes(limpia)) return [limpia, ...fotos.filter((url) => url !== limpia)]
  return fotos.length ? [...fotos] : [limpia]
}

/** La foto que toca enseñar como portada, o nada si la casa no tiene ninguna. */
export function portadaDe(portada: string | null | undefined, fotos: string[]): string | null {
  return ordenaConPortada(portada, fotos)[0] ?? null
}
