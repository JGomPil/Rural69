import { MessageCircle } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { useAvisos } from '../../hooks/useAvisos'

/**
 * Lleva el estado de la escapada al grupo de WhatsApp.
 *
 * Un botón y ya: `wa.me` sin número abre el «¿a quién se lo mandas?» de
 * WhatsApp, en el móvil con la aplicación y en el ordenador con
 * WhatsApp Web. Aquí hubo también el botón de compartir del sistema, y
 * sobraba: enseña diez sitios para elegir uno que ya sabemos cuál es.
 *
 * Queda el portapapeles por si el navegador bloquea la ventana nueva,
 * que es lo único que puede fallar de esto.
 */
export function CompartirResumen({ texto }: { texto: string }) {
  const avisos = useAvisos()

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
    avisos.ok('No se ha podido abrir WhatsApp, pero el resumen está copiado. Pégalo en el grupo.')
  }

  const porWhatsapp = () => {
    const ventana = window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
    if (!ventana) void copiar()
  }

  return (
    <Boton onClick={porWhatsapp}>
      <MessageCircle size={17} /> Mandar por WhatsApp
    </Boton>
  )
}
