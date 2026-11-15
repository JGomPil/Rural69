import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Check, CircleAlert, Info, X } from 'lucide-react'

type Tipo = 'ok' | 'error' | 'info'
interface Aviso {
  id: number
  tipo: Tipo
  texto: string
}

interface ContextoAvisos {
  ok: (texto: string) => void
  error: (texto: string) => void
  info: (texto: string) => void
}

const Contexto = createContext<ContextoAvisos | null>(null)

const ESTILOS: Record<Tipo, string> = {
  ok: 'bg-bosque-600 text-white',
  error: 'bg-tierra-600 text-white',
  info: 'bg-carbon text-white',
}

const ICONOS: Record<Tipo, typeof Check> = { ok: Check, error: CircleAlert, info: Info }

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const anyade = useCallback((tipo: Tipo, texto: string) => {
    const id = Date.now() + Math.random()
    setAvisos((prev) => [...prev, { id, tipo, texto }])
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), tipo === 'error' ? 6000 : 3500)
  }, [])

  const valor = useMemo<ContextoAvisos>(
    () => ({
      ok: (t) => anyade('ok', t),
      error: (t) => anyade('error', t),
      info: (t) => anyade('info', t),
    }),
    [anyade],
  )

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {avisos.map((aviso) => {
          const Icono = ICONOS[aviso.tipo]
          return (
            <div
              key={aviso.id}
              className={`animate-sube pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${ESTILOS[aviso.tipo]}`}
            >
              <Icono size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{aviso.texto}</span>
              <button
                type="button"
                onClick={() => setAvisos((prev) => prev.filter((a) => a.id !== aviso.id))}
                className="shrink-0 opacity-70 transition hover:opacity-100"
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </Contexto.Provider>
  )
}

export function useAvisos(): ContextoAvisos {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAvisos debe usarse dentro de <AvisosProvider>')
  return ctx
}
