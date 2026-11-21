import { useState } from 'react'
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { useAvisos } from '../../hooks/useAvisos'

/**
 * Lleva el estado de la escapada al grupo de WhatsApp.
 *
 * Hay un botón que va derecho a WhatsApp y otro que abre el menú de
 * compartir del sistema. Parece repetido y no lo es: el menú del móvil
 * enseña diez sitios y hay que buscar el icono, y en el ordenador no
 * existe siquiera. Como el 99% de las veces esto acaba en el grupo, ese
 * camino está puesto entero.
 *
 * `wa.me` funciona en los dos sitios: en el móvil abre la aplicación y
 * en el ordenador, WhatsApp Web. Si no hay nada de eso, queda copiar.
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

  const porWhatsapp = () => {
    // `wa.me` sin número abre el «¿a quién se lo mandas?» de WhatsApp.
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
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
    <div className="flex flex-wrap justify-end gap-2">
      <Boton onClick={porWhatsapp}>
        <MessageCircle size={17} /> Mandar por WhatsApp
      </Boton>
      <Boton variante="secundario" onClick={() => void compartir()}>
        {copiado ? <Check size={17} /> : puedeCompartir ? <Share2 size={17} /> : <Copy size={17} />}
        {copiado ? 'Copiado' : puedeCompartir ? 'Compartir' : 'Copiar'}
      </Boton>
    </div>
  )
}
