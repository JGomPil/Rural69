/**
 * El cajón de emojis del chat.
 *
 * En el móvil el teclado ya trae los suyos, pero hay que buscarlos; y en
 * el ordenador no hay ninguno a mano. Esto es un puñado elegido —caras,
 * manos, fiesta, comida y campo—, que es lo que de verdad se usa en un
 * grupo que organiza findes en una casa rural. Ni buscador ni mil
 * páginas: lo que cabe de un vistazo y se toca con el pulgar.
 */
const FILAS: { titulo: string; emojis: string[] }[] = [
  {
    titulo: 'Caras',
    emojis: ['😀', '😂', '🤣', '😅', '😍', '😘', '🤩', '😎', '🤔', '😴', '🙄', '😭', '😱', '🤯', '🥳', '🤢'],
  },
  {
    titulo: 'Manos y gente',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '✌️', '🫶', '👌', '🤷', '💃', '🕺', '👨‍👩‍👧‍👦', '🐕', '🧒'],
  },
  {
    titulo: 'Fiesta y corazones',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🎉', '🎊', '🥂', '🍾', '🎁', '🎂', '🔥', '✨', '⭐', '💯'],
  },
  {
    titulo: 'Comida y bebida',
    emojis: ['🍷', '🍺', '☕', '🍳', '🥘', '🍖', '🧀', '🥖', '🥗', '🍝', '🍕', '🌮', '🍰', '🍫', '🍉', '🫒'],
  },
  {
    titulo: 'Casa y campo',
    emojis: ['🏡', '🔥', '🛏️', '🚗', '🧳', '🗺️', '⛰️', '🌳', '🌻', '☀️', '🌧️', '❄️', '🌙', '⏰', '📸', '⚽'],
  },
]

export function Emojis({ onElige }: { onElige: (emoji: string) => void }) {
  return (
    <div className="mb-2 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-arena bg-superficie p-2.5">
      {FILAS.map((fila) => (
        <div key={fila.titulo}>
          <p className="mb-1 px-1 text-[11px] font-semibold text-suave">{fila.titulo}</p>
          <div className="grid grid-cols-8 gap-0.5">
            {fila.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onElige(emoji)}
                aria-label={`Poner ${emoji}`}
                className="flex h-9 items-center justify-center rounded-xl text-xl transition active:scale-90 hover:bg-beige"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
