import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { subeFoto } from '../../lib/subidas'
import { mensajeError } from '../../lib/supabase'
import { useAvisos } from '../../hooks/useAvisos'

const TAMANYOS = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-20 text-xl',
  xl: 'size-28 text-3xl',
} as const

/** Dos iniciales como mucho: «Marta Pérez» → MP, «Marta» → MA. */
export function iniciales(nombre: string | null | undefined): string {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return '··'
  const trozos = limpio.split(/\s+/)
  if (trozos.length === 1) return trozos[0].slice(0, 2).toUpperCase()
  return (trozos[0][0] + trozos[1][0]).toUpperCase()
}

export function Avatar({
  src,
  nombre,
  tamanyo = 'md',
  className = '',
}: {
  src?: string | null
  nombre?: string | null
  tamanyo?: keyof typeof TAMANYOS
  className?: string
}) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-arena bg-bosque-100 font-bold text-bosque-700 select-none ${TAMANYOS[tamanyo]} ${className}`

  if (src) {
    return (
      <span className={base}>
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      </span>
    )
  }
  return (
    <span className={base} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}

/**
 * Avatar con botón para cambiar la foto. Sube al bucket `fotos` de
 * Supabase y devuelve la URL pública por `onCambiar`; no guarda nada en
 * la base de datos, de eso se encarga quien lo use.
 */
export function AvatarEditable({
  src,
  nombre,
  onCambiar,
  tamanyo = 'xl',
}: {
  src?: string | null
  nombre?: string | null
  onCambiar: (url: string | null) => void
  tamanyo?: keyof typeof TAMANYOS
}) {
  const avisos = useAvisos()
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendo(true)
    try {
      onCambiar(await subeFoto(archivo, 'avatares'))
      avisos.ok('Foto actualizada.')
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={src} nombre={nombre} tamanyo={tamanyo} />
        {subiendo && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-velo/45 text-white">
            <Loader2 size={22} className="animate-spin" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => void elegir(e)} />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={subiendo}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-arena bg-superficie px-3 text-sm font-semibold text-bosque-700 transition hover:bg-beige active:scale-[0.97] disabled:opacity-50"
        >
          <Camera size={15} /> {src ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {src && (
          <button
            type="button"
            onClick={() => onCambiar(null)}
            disabled={subiendo}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-tierra-600 transition hover:bg-tierra-100 active:scale-[0.97] disabled:opacity-50"
          >
            <Trash2 size={15} /> Quitar
          </button>
        )}
      </div>
    </div>
  )
}
