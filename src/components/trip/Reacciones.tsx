import { useEffect, useRef, useState } from 'react'
import { SmilePlus } from 'lucide-react'
import type { MessageReaction } from '../../lib/types'

/**
 * Las que ofrece el botón. Seis, que es lo que cabe en una fila de un
 * móvil estrecho sin tener que desplazar nada.
 */
const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🏡']

/**
 * Un toque en un mensaje del chat.
 *
 * Once personas y alguien propone algo: o once «vale» seguidos que
 * entierran la conversación, o esto. Y no avisan a nadie a propósito:
 * un aviso por cada pulgar arriba sería justo el ruido que se le quitó
 * al chat cuando se le puso freno a los avisos.
 *
 * Nada depende de pasar el ratón por encima: en un móvil no hay ratón, y
 * lo que se esconde detrás de un `hover` es lo mismo que no existe.
 */
export function Reacciones({
  reacciones,
  miPerfil,
  nombreDe,
  onToca,
  mio,
}: {
  reacciones: MessageReaction[]
  miPerfil: string | null
  nombreDe: (id: string) => string
  onToca: (emoji: string) => void
  /** Los mensajes propios van alineados a la derecha, y sus reacciones también. */
  mio: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // Cerrar el elegidor al tocar fuera o al pulsar Escape, que es lo que
  // todo el mundo intenta.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('touchstart', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('touchstart', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  /** Cada emoji, con quién lo ha puesto. En el orden en que fueron llegando. */
  const grupos: { emoji: string; quienes: string[]; mia: boolean }[] = []
  for (const r of reacciones) {
    let g = grupos.find((x) => x.emoji === r.emoji)
    if (!g) {
      g = { emoji: r.emoji, quienes: [], mia: false }
      grupos.push(g)
    }
    g.quienes.push(nombreDe(r.profile_id))
    if (r.profile_id === miPerfil) g.mia = true
  }

  const toca = (emoji: string) => {
    setAbierto(false)
    onToca(emoji)
  }

  return (
    <div ref={caja} className={`relative mt-0.5 flex flex-wrap items-center gap-1 ${mio ? 'justify-end' : ''}`}>
      {grupos.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => toca(g.emoji)}
          title={g.quienes.join(', ')}
          aria-label={`${g.emoji} ${g.quienes.join(', ')}${g.mia ? '. Quitar la tuya' : ''}`}
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition ${
            g.mia
              ? 'border-bosque-300 bg-bosque-100 text-bosque-800'
              : 'border-arena bg-superficie text-tenue hover:bg-beige'
          }`}
        >
          <span aria-hidden>{g.emoji}</span>
          {g.quienes.length > 1 && <span className="cifras font-bold">{g.quienes.length}</span>}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label="Reaccionar a este mensaje"
        aria-expanded={abierto}
        className="inline-flex size-6 items-center justify-center rounded-full text-suave transition hover:bg-beige hover:text-bosque-700"
      >
        <SmilePlus size={14} />
      </button>

      {abierto && (
        <div
          role="menu"
          className={`absolute bottom-7 z-20 flex gap-0.5 rounded-2xl border border-arena bg-superficie p-1 shadow-lg ${
            mio ? 'right-0' : 'left-0'
          }`}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              onClick={() => toca(emoji)}
              aria-label={`Reaccionar con ${emoji}`}
              className="inline-flex size-9 items-center justify-center rounded-xl text-lg transition hover:bg-beige active:scale-90"
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
