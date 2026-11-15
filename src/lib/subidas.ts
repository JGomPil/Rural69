import { supabase } from './supabase'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Sube una foto al bucket público `fotos` de Supabase Storage y
 * devuelve su URL pública. Si no quieres usar Storage, siempre se
 * puede pegar directamente la URL de una imagen.
 */
export async function subeFoto(archivo: File, carpeta = 'casas'): Promise<string> {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo tiene que ser una imagen.')
  }
  if (archivo.size > MAX_BYTES) {
    throw new Error('La imagen pesa más de 5 MB. Prueba con una más ligera.')
  }
  const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  const { error } = await supabase.storage.from('fotos').upload(nombre, archivo, {
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from('fotos').getPublicUrl(nombre)
  return data.publicUrl
}
