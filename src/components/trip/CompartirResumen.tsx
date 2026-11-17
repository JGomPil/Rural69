import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { useAvisos } from '../../hooks/useAvisos'

/**
 * Lleva el estado de la escapada al grupo de WhatsApp.
 *
 * En el móvil abre el menú de compartir del sistema, que es donde está
 * WhatsApp. En el ordenador no existe ese menú, así que copia al portapapeles
 * y lo dice. Las dos cosas acaban igual: el texto pegado en el grupo.
 */
export function CompartirResumen({ texto }: { texto: string }) {
  const avisos = useAvisos()
  const [copiado, setCopiado] = useState(false)

  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Sin permiso de portapapeles —o sin https— queda el camino de toda la
      // vida: un textarea invisible y el `execCommand` de siempre.
      const caja = document.createElement('textarea')
      caja.value = texto
      caja.setAttribute('readonly', '')
      caja.style.position = 'fixed'
      caja.style.opacity = '0'
      document.body.appendChild(caja)
      caja.select()
      document.execCommand('copy')
      document.body.removeChild(caja)
    }
    setCopiado(true)
    avisos.ok('Resumen copiado. Pégalo en el grupo.')
    setTimeout(() => setCopiado(false), 2500)
  }

  const compartir = async () => {
    if (!puedeCompartir) return void copiar()
    try {
      await navigator.share({ text: texto })
    } catch (e) {
      // Cerrar el menú de compartir no es un fallo: no hay nada que decir.
      if ((e as { name?: string })?.name === 'AbortError') return
      void copiar()
    }
  }

  return (
    <Boton variante="secundario" onClick={() => void compartir()}>
      {copiado ? <Check size={17} /> : puedeCompartir ? <Share2 size={17} /> : <Copy size={17} />}
      {copiado ? 'Copiado' : 'Compartir resumen'}
    </Boton>
  )
}
