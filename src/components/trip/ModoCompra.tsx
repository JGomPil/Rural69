import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ShoppingCart, Undo2, X } from 'lucide-react'
import { cantidad } from '../../lib/formato'
import { estiloCategoria } from '../../lib/constantes'
import type { ShoppingItem } from '../../lib/types'

/**
 * Modo «estoy comprando»: la lista como hace falta en el supermercado.
 *
 * La pantalla normal está pensada para preparar la compra en el sofá —
 * cantidades, tiempos, quién se encarga, editar, duplicar—, y eso en el
 * pasillo del súper estorba: con una mano en el carro, lo único que se
 * quiere es ver lo que falta y tacharlo de un toque.
 *
 * De ahí las decisiones de aquí:
 *
 *  · Toda la fila es el botón, y mide lo que mide un dedo. Nada de
 *    casillas de 20 px ni de menús de tres puntos.
 *  · Por categorías, siempre. En el súper se recorre la frutería y luego
 *    los lácteos; el orden por comidas no sirve de nada ahí dentro.
 *  · Lo comprado desaparece de la lista y se va al final, a «en el carro»,
 *    donde se puede devolver. Equivocarse de toque pasa, y pasa con la
 *    mano llena.
 *  · La pantalla no se apaga mientras está abierto, si el navegador deja.
 */

/**
 * Mantiene la pantalla encendida mientras dure la compra.
 *
 * El permiso se pierde solo al irse a otra aplicación o al apagar la
 * pantalla a mano, así que hay que volver a pedirlo al regresar. Donde no
 * existe (iPhone, hasta hace poco) simplemente no pasa nada.
 */
function usePantallaEncendida() {
  useEffect(() => {
    const api = (
      navigator as Navigator & {
        wakeLock?: { request: (tipo: 'screen') => Promise<{ release: () => Promise<void> }> }
      }
    ).wakeLock
    if (!api) return

    let permiso: { release: () => Promise<void> } | null = null
    let vivo = true

    const pide = async () => {
      if (!vivo || document.visibilityState !== 'visible' || permiso) return
      try {
        permiso = await api.request('screen')
      } catch {
        // No es importante: como mucho la pantalla se apaga como siempre.
      }
    }

    const alVolver = () => {
      if (document.visibilityState === 'visible') void pide()
      else permiso = null
    }

    void pide()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alVolver)
      void permiso?.release().catch(() => undefined)
    }
  }, [])
}

export function ModoCompra({
  titulo,
  items,
  onMarcar,
  onCerrar,
}: {
  titulo: string
  /** Lo que se está mirando, comprado y por comprar. */
  items: ShoppingItem[]
  onMarcar: (item: ShoppingItem, comprado: boolean) => void
  onCerrar: () => void
}) {
  const [verCarro, setVerCarro] = useState(false)
  usePantallaEncendida()

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  const porComprar = useMemo(() => items.filter((i) => !i.purchased), [items])
  const enElCarro = useMemo(() => items.filter((i) => i.purchased), [items])

  const grupos = useMemo(() => {
    const mapa = new Map<string, ShoppingItem[]>()
    for (const i of porComprar) {
      const lista = mapa.get(i.category)
      if (lista) lista.push(i)
      else mapa.set(i.category, [i])
    }
    return [...mapa.entries()]
      .map(([categoria, articulos]) => ({ categoria, articulos, estilo: estiloCategoria(categoria) }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'))
  }, [porComprar])

  const pct = items.length > 0 ? Math.round((enElCarro.length / items.length) * 100) : 0

  return createPortal(
    <div
      className="animate-aparece fixed inset-0 z-50 flex flex-col bg-crema"
      role="dialog"
      aria-modal="true"
      aria-label="Modo compra"
    >
      {/* -------- Cabecera: a cuánto vamos -------- */}
      <header className="shrink-0 border-b border-arena bg-superficie px-3 pt-3 pb-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="shrink-0 text-bosque-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-bosque-800">{titulo}</p>
            <p className="cifras text-xs text-suave">
              {enElCarro.length} de {items.length} en el carro · quedan {porComprar.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Salir del modo compra"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-tenue transition hover:bg-black/5 active:scale-95"
          >
            <X size={22} />
          </button>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-arena">
          <div
            className="h-full rounded-full bg-bosque-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      {/* -------- La lista -------- */}
      <div className="safe-bottom flex-1 overflow-y-auto overscroll-contain [--relleno-inferior:1.5rem]">
        {porComprar.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="text-5xl" aria-hidden>
              🎉
            </span>
            <h2 className="font-display text-xl text-bosque-800">¡Todo en el carro!</h2>
            <p className="max-w-xs text-sm text-suave">
              No queda nada por coger de esta lista. Puedes salir tranquilo.
            </p>
            <button
              type="button"
              onClick={onCerrar}
              className="mt-1 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-bosque-600 px-6 text-base font-semibold text-tinta-fuerte active:scale-[0.98]"
            >
              Salir del modo compra
            </button>
          </div>
        ) : (
          grupos.map((g) => (
            <section key={g.categoria}>
              <h2 className="sticky top-0 z-10 flex items-center gap-2 border-b border-arena bg-beige/95 px-4 py-2 text-sm font-bold text-bosque-800 backdrop-blur">
                <span aria-hidden>{g.estilo.emoji}</span>
                {g.categoria}
                <span className="cifras ml-auto text-xs font-semibold text-suave">{g.articulos.length}</span>
              </h2>
              <ul className="divide-y divide-arena">
                {g.articulos.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onMarcar(item, true)}
                      className="flex w-full items-center gap-3.5 bg-superficie px-4 py-4 text-left transition active:bg-bosque-50"
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-borde-campo text-transparent"
                        aria-hidden
                      >
                        <Check size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base leading-snug font-semibold break-words text-carbon">
                          {item.name}
                        </span>
                        {(item.notes || item.available_qty > 0) && (
                          <span className="mt-0.5 block text-xs leading-snug text-suave">
                            {item.available_qty > 0 && `Ya hay ${cantidad(item.available_qty, item.unit)} en casa`}
                            {item.available_qty > 0 && item.notes ? ' · ' : ''}
                            {item.notes}
                          </span>
                        )}
                      </span>
                      <span className="font-display cifras shrink-0 text-lg font-bold text-bosque-700">
                        {cantidad(item.buy_qty, item.unit)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {/* -------- Lo que ya está, por si fue un toque sin querer -------- */}
        {enElCarro.length > 0 && (
          <section className="mt-4 px-3 pb-6">
            <button
              type="button"
              onClick={() => setVerCarro((v) => !v)}
              className="flex w-full items-center gap-2 rounded-2xl bg-beige px-4 py-3 text-left text-sm font-bold text-tenue"
            >
              <ShoppingCart size={16} className="shrink-0" />
              Ya en el carro ({enElCarro.length})
              <ChevronDown size={17} className={`ml-auto shrink-0 transition ${verCarro ? '' : '-rotate-90'}`} />
            </button>
            {verCarro && (
              <ul className="mt-2 space-y-1.5">
                {enElCarro.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onMarcar(item, false)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-arena bg-superficie/70 px-3.5 py-3 text-left transition active:bg-beige"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bosque-600 text-tinta-fuerte">
                        <Check size={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-suave line-through">
                        {item.name}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-tierra-600">
                        <Undo2 size={14} /> devolver
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
