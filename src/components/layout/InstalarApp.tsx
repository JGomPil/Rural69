import { useEffect, useState } from 'react'
import { Check, MoreVertical, Share, Smartphone, X } from 'lucide-react'
import { Boton } from '../ui/Boton'

/** El evento que dispara Chrome cuando la app se puede instalar. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    /** Lo guarda el script de index.html, que escucha antes de que React exista. */
    __rural69Instalable?: EventoInstalacion | null
  }
}

const OCULTO = 'rural69-instalar-oculto'
const INSTALADA = 'rural69-instalada'

/**
 * Cuánto se espera al evento de Chrome antes de dar por hecho que no va a
 * llegar. Suele llegar en cuanto carga la página; este margen es para no
 * decidir demasiado pronto y enseñar el aviso un instante de más.
 */
const MARGEN_MS = 2000

type Plataforma = 'ios' | 'android' | 'escritorio'

/** ¿Estamos DENTRO de la app instalada ahora mismo? */
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

/**
 * ¿Es un navegador de los que avisan cuando se puede instalar?
 *
 * Importa mucho más de lo que parece. En Chrome y Edge, si la app ya está
 * instalada el evento NO se dispara. Así que en ellos «no ha llegado el
 * evento» significa «no hay nada que ofrecer», y explicar dónde está el
 * botón de instalar es justo lo contrario de lo que hace falta: ese botón
 * ya no existe. En Safari y Firefox el evento no existe en absoluto, y ahí
 * sí hay que explicar el camino a mano.
 */
function avisaSolo(): boolean {
  return 'onbeforeinstallprompt' in window
}

function recuerda(valor: boolean) {
  try {
    if (valor) localStorage.setItem(INSTALADA, 'si')
  } catch {
    // Navegación privada: sin memoria. No pasa nada.
  }
}

function recordada(): boolean {
  try {
    return localStorage.getItem(INSTALADA) === 'si'
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
 * Solo sale cuando de verdad hay algo que hacer. Se da por instalada si
 * estamos dentro de la app, si el navegador lo dijo alguna vez, o si es un
 * navegador que avisa solo y no ha avisado.
 */
export function InstalarApp({ siempre = false }: { siempre?: boolean }) {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)
  const [oculto, setOculto] = useState(true)
  const [instalada, setInstalada] = useState(false)
  const [decidiendo, setDecidiendo] = useState(true)

  useEffect(() => {
    const dentro = yaInstalada()
    // Si estamos dentro de la app instalada, queda anotado: la próxima vez que
    // se abra en una pestaña normal del navegador ya se sabrá, que es
    // justamente el caso en el que el aviso salía sin venir a cuento.
    if (dentro) recuerda(true)
    setInstalada(dentro || recordada())

    try {
      setOculto(!siempre && localStorage.getItem(OCULTO) === 'si')
    } catch {
      setOculto(false) // Navegación privada: sin memoria, pero el aviso vale igual.
    }

    // El evento puede haber llegado antes de que React montara nada.
    if (window.__rural69Instalable) {
      setEvento(window.__rural69Instalable)
      setDecidiendo(false)
    }

    const alPoder = (e: Event) => {
      e.preventDefault()
      window.__rural69Instalable = e as EventoInstalacion
      setEvento(e as EventoInstalacion)
      setDecidiendo(false)
    }
    const alInstalar = () => {
      recuerda(true)
      setInstalada(true)
      window.__rural69Instalable = null
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', alPoder)
    window.addEventListener('appinstalled', alInstalar)

    const reloj = setTimeout(() => setDecidiendo(false), MARGEN_MS)
    return () => {
      clearTimeout(reloj)
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

  const yaLaTengo = () => {
    recuerda(true)
    setInstalada(true)
  }

  const instalar = async () => {
    if (!evento) return
    await evento.prompt()
    const { outcome } = await evento.userChoice
    if (outcome === 'accepted') {
      yaLaTengo()
      cerrar()
    }
  }

  const mensajeInstalada = siempre ? (
    <p className="flex items-center gap-2 rounded-2xl border border-oliva-300 bg-oliva-100 px-4 py-3 text-sm font-semibold text-oliva-700">
      <Check size={17} /> Ya la tienes instalada.
    </p>
  ) : null

  if (instalada) return mensajeInstalada

  // En Chrome y Edge, si no ha avisado es que no hay nada que ofrecer: o ya
  // está instalada, o este navegador no la puede instalar. En los dos casos,
  // explicar dónde está el botón sería mentira.
  if (avisaSolo() && !evento) return decidiendo ? null : mensajeInstalada
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
        ) : (
          <>
            {plataforma === 'ios' ? (
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
                Toca <MoreVertical size={13} className="inline -translate-y-px" /> los tres puntos de arriba a
                la derecha de Chrome y elige <strong>Instalar aplicación</strong> o{' '}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : (
              <p className="mt-0.5">
                En el ordenador, el icono de instalar sale a la derecha de la barra de direcciones.
              </p>
            )}
            {/* En Safari no hay forma de saber si ya está instalada —la app y el
                navegador ni siquiera comparten memoria—, así que se pregunta. */}
            <button
              type="button"
              onClick={yaLaTengo}
              className="mt-2 text-xs font-bold text-oliva-700 underline underline-offset-2"
            >
              Ya la tengo instalada
            </button>
          </>
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
