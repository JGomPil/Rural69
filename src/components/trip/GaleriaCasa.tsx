import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import type { House } from '../../lib/types'

/** Visor de fotos a pantalla completa, cómodo de pasar con el dedo. */
export function GaleriaCasa({
  casa,
  fotos,
  onCerrar,
}: {
  casa: House | null
  fotos: string[]
  onCerrar: () => void
}) {
  const [indice, setIndice] = useState(0)
  const todas = casa?.cover_image_url && !fotos.includes(casa.cover_image_url) ? [casa.cover_image_url, ...fotos] : fotos

  useEffect(() => {
    setIndice(0)
  }, [casa?.id])

  useEffect(() => {
    if (!casa) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight') setIndice((i) => (i + 1) % Math.max(1, todas.length))
      if (e.key === 'ArrowLeft') setIndice((i) => (i - 1 + Math.max(1, todas.length)) % Math.max(1, todas.length))
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [casa, todas.length, onCerrar])

  if (!casa) return null

  return (
    <div className="animate-aparece fixed inset-0 z-[60] flex flex-col bg-carbon/95">
      <header className="flex items-start gap-3 px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-lg">{casa.name}</h2>
          <p className="truncate text-sm text-white/60">
            {[casa.town, casa.province].filter(Boolean).join(', ')}
            {todas.length > 0 && ` · ${indice + 1}/${todas.length}`}
          </p>
        </div>
        {casa.url && (
          <a
            href={casa.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-sm font-semibold"
          >
            <ExternalLink size={15} /> Web
          </a>
        )}
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="inline-flex size-9 items-center justify-center rounded-xl bg-white/15"
        >
          <X size={20} />
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4">
        {todas.length === 0 ? (
          <p className="text-white/60">Esta casa no tiene fotos todavía.</p>
        ) : (
          <>
            <img
              src={todas[indice]}
              alt={`${casa.name} · foto ${indice + 1}`}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {todas.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIndice((i) => (i - 1 + todas.length) % todas.length)}
                  aria-label="Foto anterior"
                  className="absolute left-3 inline-flex size-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur active:scale-95"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => setIndice((i) => (i + 1) % todas.length)}
                  aria-label="Foto siguiente"
                  className="absolute right-3 inline-flex size-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur active:scale-95"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {todas.length > 1 && (
        <div className="scroll-oculto flex gap-2 overflow-x-auto px-4 pb-6">
          {todas.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIndice(i)}
              className={`size-16 shrink-0 overflow-hidden rounded-xl transition ${
                i === indice ? 'ring-2 ring-white' : 'opacity-55'
              }`}
            >
              <img src={url} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
