import { useEffect, useState } from 'react'
import { Check, MoreVertical, Share, Smartphone, X } from 'lucide-react'
import { Boton } from '../ui/Boton'

/** El evento que dispara Chrome cuando la app se puede instalar. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const OCULTO = 'rural69-instalar-oculto'

type Plataforma = 'ios' | 'android' | 'escritorio'

export function yaInstalada(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // Safari en iOS no entiende display-mode y usa esto otro.
      (window.navigator as { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

function queTelefono(): Plataforma {
  const ua = window.navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'escritorio'
}

/** Chrome y Firefox en iOS también son Safari por dentro, pero sin «Añadir a inicio» fiable. */
function esSafari(): boolean {
  const ua = window.navigator.userAgent
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

/**
 * Aviso para añadir Rural69 a la pantalla de inicio.
 *
 * Chrome avisa por su cuenta con `beforeinstallprompt` y entonces basta un
 * botón. Pero ese evento no siempre llega —si ya lo has rechazado antes, o si
 * el navegador aún no ha decidido que la app le gusta—, y en iPhone no existe
 * directamente. Así que cuando no hay evento se explica dónde está la opción a
 * mano, que es justo lo que nadie encuentra.
 */
export function InstalarApp({ siempre = false }: { siempre?: boolean }) {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)
  const [oculto, setOculto] = useState(true)
  const [instalada, setInstalada] = useState(false)

  useEffect(() => {
    setInstalada(yaInstalada())
    try {
      setOculto(!siempre && localStorage.getItem(OCULTO) === 'si')
    } catch {
      setOculto(false) // Navegación privada: sin memoria, pero el aviso vale igual.
    }

    const alPoder = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalacion)
    }
    const alInstalar = () => setInstalada(true)
    window.addEventListener('beforeinstallprompt', alPoder)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoder)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [siempre])

  const cerrar = () => {
    setOculto(true)
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

  if (instalada) {
    return siempre ? (
      <p className="flex items-center gap-2 rounded-2xl border border-oliva-300 bg-oliva-100 px-4 py-3 text-sm font-semibold text-oliva-700">
        <Check size={17} /> Ya la tienes instalada.
      </p>
    ) : null
  }
  if (oculto) return null

  const plataforma = queTelefono()

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
        ) : plataforma === 'ios' ? (
          esSafari() ? (
            <p className="mt-0.5">
              En el iPhone se hace a mano: toca <Share size={13} className="inline -translate-y-px" />{' '}
              <strong>Compartir</strong>, en la barra de abajo de Safari, baja un poco y elige{' '}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p className="mt-0.5">
              Abre esta página <strong>en Safari</strong> (no en Chrome) y allí toca{' '}
              <Share size={13} className="inline -translate-y-px" /> <strong>Compartir</strong> →{' '}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          )
        ) : plataforma === 'android' ? (
          <p className="mt-0.5">
            Toca <MoreVertical size={13} className="inline -translate-y-px" /> los tres puntos de arriba a la
            derecha de Chrome y elige <strong>Instalar aplicación</strong> o{' '}
            <strong>Añadir a pantalla de inicio</strong>.
          </p>
        ) : (
          <p className="mt-0.5">
            En el ordenador, el icono de instalar sale a la derecha de la barra de direcciones. En el móvil lo
            tienes en el menú del navegador.
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
