import { useEffect, useState } from 'react'
import { Share, Smartphone, X } from 'lucide-react'
import { Boton } from '../ui/Boton'

/** El evento que dispara Chrome cuando la app se puede instalar. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const OCULTO = 'rural69-instalar-oculto'

function yaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no entiende display-mode y usa esto otro.
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function esIOS(): boolean {
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
}

/**
 * Aviso para añadir Rural69 a la pantalla de inicio.
 *
 * En Android lo hace Chrome de un botón. En iPhone no hay manera de
 * provocarlo desde la web, así que solo queda explicar dónde está la
 * opción, que es justo lo que la gente no encuentra.
 */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (yaInstalada()) return
    try {
      if (localStorage.getItem(OCULTO) === 'si') return
    } catch {
      // Navegación privada: sin memoria, pero el aviso sigue valiendo.
    }

    if (esIOS()) {
      setVisible(true)
      return
    }

    const alPoder = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalacion)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', alPoder)
    return () => window.removeEventListener('beforeinstallprompt', alPoder)
  }, [])

  const cerrar = () => {
    setVisible(false)
    try {
      localStorage.setItem(OCULTO, 'si')
    } catch {
      // Da igual: como mucho el aviso vuelve a salir la próxima vez.
    }
  }

  const instalar = async () => {
    if (!evento) return
    await evento.prompt()
    const { outcome } = await evento.userChoice
    if (outcome === 'accepted') cerrar()
  }

  if (!visible) return null

  return (
    <div className="animate-sube no-imprimir relative flex items-start gap-3 rounded-2xl border border-oliva-300 bg-oliva-100 px-4 py-3.5 pr-10">
      <span className="mt-0.5 shrink-0 text-oliva-700">
        <Smartphone size={20} />
      </span>
      <div className="min-w-0 flex-1 text-sm text-oliva-700">
        <p className="font-bold text-bosque-800">Ten Rural69 en la pantalla de inicio</p>
        {evento ? (
          <>
            <p className="mt-0.5">Se abre como una app, a pantalla completa y con su icono.</p>
            <Boton tamanyo="sm" className="mt-2.5" onClick={() => void instalar()}>
              Instalar
            </Boton>
          </>
        ) : (
          <p className="mt-0.5">
            En el iPhone se hace a mano: toca{' '}
            <Share size={13} className="inline -translate-y-px" /> <strong>Compartir</strong> abajo en Safari y
            luego <strong>Añadir a pantalla de inicio</strong>.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={cerrar}
        aria-label="No volver a mostrar"
        className="absolute top-2.5 right-2.5 inline-flex size-7 items-center justify-center rounded-lg text-oliva-700/60 transition hover:bg-black/5"
      >
        <X size={16} />
      </button>
    </div>
  )
}
