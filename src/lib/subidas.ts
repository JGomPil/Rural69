import { supabase } from './supabase'

// =====================================================================
// Subir fotos
// ---------------------------------------------------------------------
// Una foto de un móvil de hoy mide 4032 px de lado y pesa entre 3 y 6 MB.
// Subirla tal cual tiene tres problemas, y los tres se notan justo el día
// que hace falta:
//
//   · Por el 4G de un pueblo, seis megas tardan una eternidad, y en la
//     pestaña de Fotos se suben diez de golpe.
//   · El plan gratuito de Supabase da un giga de almacenamiento. A seis
//     megas la foto, eso son 170 fotos: dos escapadas.
//   · Nadie va a mirar 4032 px en una pantalla de 390. Se tiran a la
//     basura el 95 % de los píxeles enseñando lo mismo.
//
// Así que antes de subir se encoge aquí, en el navegador: lado largo a
// 2000 px y JPEG. Una foto de 4 MB se queda en 400 KB sin que se note.
// =====================================================================

/** Lo que se acepta del carrete, antes de encogerla. */
const MAX_ENTRADA = 30 * 1024 * 1024
/** Lo que se sube. Si después de encogerla sigue pesando esto, algo va mal. */
const MAX_SALIDA = 5 * 1024 * 1024
/** Lado largo según para qué es la foto. Un avatar se ve a 40 px. */
const LADO: Record<string, number> = { avatares: 512 }
const LADO_POR_DEFECTO = 2000
const CALIDAD = 0.82
/** El GIF perdería la animación y el SVG no es un mapa de píxeles. */
const SIN_TOCAR = ['image/gif', 'image/svg+xml']

/**
 * Abre la imagen de forma que se pueda dibujar en un lienzo.
 *
 * Con `createImageBitmap` y `from-image`, que es lo que respeta la
 * orientación guardada en el EXIF: sin eso, las fotos hechas en vertical
 * con el móvil se suben tumbadas.
 */
async function abre(
  archivo: Blob,
): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; suelta: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
      return { fuente: mapa, ancho: mapa.width, alto: mapa.height, suelta: () => mapa.close() }
    } catch {
      // Hay navegadores que no aceptan las opciones, y formatos que no sabe
      // decodificar nadie más que el teléfono que los hizo (el HEIC del
      // iPhone). Se prueba con una etiqueta <img>, que es más permisiva.
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = await new Promise<HTMLImageElement>((bien, mal) => {
      const el = new Image()
      el.onload = () => bien(el)
      el.onerror = () => mal(new Error('No se puede leer la imagen.'))
      el.src = url
    })
    return {
      fuente: imagen,
      ancho: imagen.naturalWidth,
      alto: imagen.naturalHeight,
      suelta: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/**
 * Devuelve la foto encogida, o `null` si no hay nada que ganar o si el
 * navegador no sabe abrirla. En ese caso se sube la original: mejor una
 * foto pesada que ninguna.
 */
async function encoge(archivo: File, lado: number): Promise<Blob | null> {
  if (SIN_TOCAR.includes(archivo.type)) return null
  if (typeof document === 'undefined') return null

  let abierta: Awaited<ReturnType<typeof abre>>
  try {
    abierta = await abre(archivo)
  } catch {
    return null
  }

  try {
    const { ancho, alto } = abierta
    if (!ancho || !alto) return null

    const factor = Math.min(1, lado / Math.max(ancho, alto))
    const w = Math.max(1, Math.round(ancho * factor))
    const h = Math.max(1, Math.round(alto * factor))

    const lienzo = document.createElement('canvas')
    lienzo.width = w
    lienzo.height = h
    const pincel = lienzo.getContext('2d')
    if (!pincel) return null
    // Fondo blanco antes de dibujar: un PNG con transparencia pasado a
    // JPEG saldría con las zonas transparentes en negro.
    pincel.fillStyle = '#ffffff'
    pincel.fillRect(0, 0, w, h)
    pincel.drawImage(abierta.fuente, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((bien) => lienzo.toBlob(bien, 'image/jpeg', CALIDAD))
    if (!blob) return null
    // Si ya era pequeña y no se gana nada, se sube la original: volver a
    // comprimir un JPEG solo le quita calidad.
    if (factor === 1 && blob.size >= archivo.size) return null
    return blob
  } finally {
    abierta.suelta()
  }
}

/**
 * Sube una foto al bucket público `fotos` de Supabase Storage y
 * devuelve su URL pública. Si no quieres usar Storage, siempre se
 * puede pegar directamente la URL de una imagen.
 */
export async function subeFoto(archivo: File, carpeta = 'casas'): Promise<string> {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo tiene que ser una imagen.')
  }
  if (archivo.size > MAX_ENTRADA) {
    throw new Error('La imagen pesa más de 30 MB. Prueba con otra.')
  }

  const lado = LADO[carpeta.split('/')[0]] ?? LADO_POR_DEFECTO
  const encogida = await encoge(archivo, lado)
  const cuerpo: Blob = encogida ?? archivo

  if (cuerpo.size > MAX_SALIDA) {
    throw new Error('No hemos podido aligerar esta imagen y pesa demasiado. Prueba con otra.')
  }

  const tipo = encogida ? 'image/jpeg' : archivo.type || 'image/jpeg'
  const extension = encogida ? 'jpg' : archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  const { error } = await supabase.storage.from('fotos').upload(nombre, cuerpo, {
    cacheControl: '31536000',
    upsert: false,
    contentType: tipo,
  })
  if (error) throw error

  const { data } = supabase.storage.from('fotos').getPublicUrl(nombre)
  return data.publicUrl
}
