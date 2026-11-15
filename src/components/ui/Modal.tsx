import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Boton } from './Boton'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: React.ReactNode
  pie?: React.ReactNode
  ancho?: 'sm' | 'md' | 'lg'
}

/**
 * Hoja inferior en móvil y diálogo centrado en escritorio.
 */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie, ancho = 'md' }: Props) {
  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  const anchos = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }

  // Se monta en <body> con un portal. Si se quedara dentro de la página, cualquier
  // ancestro con `transform` (por ejemplo una sección animada) pasaría a ser el
  // marco de referencia de `position: fixed` y el diálogo aparecería descolocado.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-aparece absolute inset-0 bg-carbon/45 backdrop-blur-sm" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`animate-sube relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-crema shadow-2xl sm:rounded-3xl ${anchos[ancho]}`}
      >
        <header className="flex items-start gap-3 border-b border-arena bg-white/70 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg text-bosque-800">{titulo}</h2>
            {descripcion && <p className="mt-0.5 text-sm text-carbon/60">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-carbon/50 transition hover:bg-black/5"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {pie && (
          <footer className="safe-bottom flex items-center justify-end gap-2 border-t border-arena bg-white/70 px-5 pt-3.5 [--relleno-inferior:0.875rem]">
            {pie}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface PropsConfirmar {
  abierto: boolean
  titulo: string
  texto?: string
  textoAceptar?: string
  cargando?: boolean
  onAceptar: () => void
  onCancelar: () => void
}

export function Confirmar({
  abierto,
  titulo,
  texto,
  textoAceptar = 'Sí, continuar',
  cargando,
  onAceptar,
  onCancelar,
}: PropsConfirmar) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo={titulo}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCancelar}>
            Cancelar
          </Boton>
          <Boton variante="acento" onClick={onAceptar} cargando={cargando}>
            {textoAceptar}
          </Boton>
        </>
      }
    >
      <p className="text-sm text-carbon/70">{texto ?? 'Esta acción no se puede deshacer.'}</p>
    </Modal>
  )
}
