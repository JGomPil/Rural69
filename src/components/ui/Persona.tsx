import { useGrupo } from '../../hooks/useGrupo'
import { Avatar } from './Avatar'
import type { Member, Profile } from '../../lib/types'

type Tamanyo = 'xs' | 'sm' | 'md'

/**
 * Cara y nombre de alguien del grupo, se le llame por su cuenta o por su
 * ficha de integrante.
 *
 * Las fotos viven en dos sitios a propósito: la del perfil se la pone cada
 * cual y la del integrante la pone un administrador, que es la única manera
 * de que los niños tengan cara sin tener cuenta. Aquí se juntan las dos:
 * manda la del perfil y, si no hay, se tira de la del integrante vinculado.
 */
function resuelve(
  perfiles: Profile[],
  miembros: Member[],
  { perfilId, miembroId }: { perfilId?: string | null; miembroId?: string | null },
): { nombre: string; foto: string | null } | null {
  if (perfilId) {
    const p = perfiles.find((x) => x.id === perfilId)
    if (!p) return null
    const m = miembros.find((x) => x.id === p.member_id)
    return { nombre: p.display_name || p.email, foto: p.avatar_url ?? m?.avatar_url ?? null }
  }
  if (miembroId) {
    const m = miembros.find((x) => x.id === miembroId)
    if (!m) return null
    const p = perfiles.find((x) => x.member_id === m.id)
    return { nombre: m.name, foto: m.avatar_url ?? p?.avatar_url ?? null }
  }
  return null
}

export function Persona({
  perfilId,
  miembroId,
  tamanyo = 'xs',
  className = '',
  sinNombre = false,
}: {
  perfilId?: string | null
  miembroId?: string | null
  tamanyo?: Tamanyo
  className?: string
  /** Solo la cara, con el nombre en el `title` para quien pase por encima. */
  sinNombre?: boolean
}) {
  const { perfiles, miembros } = useGrupo()
  const quien = resuelve(perfiles, miembros, { perfilId, miembroId })
  if (!quien) return null

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={quien.nombre}>
      <Avatar src={quien.foto} nombre={quien.nombre} tamanyo={tamanyo} />
      {!sinNombre && <span className="truncate">{quien.nombre}</span>}
    </span>
  )
}

/** Varias personas seguidas, cada una con su cara. */
export function Personas({
  perfilIds,
  miembroIds,
  tamanyo = 'xs',
  className = '',
}: {
  perfilIds?: string[]
  miembroIds?: string[]
  tamanyo?: Tamanyo
  className?: string
}) {
  const ids = perfilIds ?? miembroIds ?? []
  if (ids.length === 0) return null
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      {ids.map((id) => (
        <Persona
          key={id}
          perfilId={perfilIds ? id : undefined}
          miembroId={miembroIds ? id : undefined}
          tamanyo={tamanyo}
        />
      ))}
    </span>
  )
}
