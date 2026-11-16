import { useEffect, useMemo, useState } from 'react'
import {
  Baby,
  DatabaseBackup,
  HousePlus,
  KeyRound,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAvisos } from '../hooks/useAvisos'
import { useGrupo } from '../hooks/useGrupo'
import { mensajeError, supabase } from '../lib/supabase'
import { descarga, nombreArchivo } from '../lib/exportar'
import { numero } from '../lib/formato'
import { personasEquivalentes } from '../lib/cantidades'
import { Avatar, AvatarEditable } from '../components/ui/Avatar'
import { Boton, BotonIcono } from '../components/ui/Boton'
import { Campo, Entrada, Interruptor, Lista } from '../components/ui/Campos'
import { Confirmar, Modal } from '../components/ui/Modal'
import { Cargando, Etiqueta, Seccion, Tarjeta } from '../components/ui/Varios'
import type { Household, Member, Profile, Rol } from '../lib/types'

export function Ajustes() {
  const { perfil, esAdmin } = useAuth()
  const { cargando } = useGrupo()
  if (cargando) return <Cargando texto="Cargando ajustes…" />

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800 sm:text-3xl">
          <Settings size={26} /> Ajustes
        </h1>
        <p className="mt-0.5 text-sm text-carbon/60">
          {esAdmin ? 'Eres administrador del grupo.' : 'Tu cuenta es de integrante.'} ·{' '}
          {perfil?.email}
        </p>
      </header>

      <MiCuenta />
      {esAdmin && <AjustesGrupo />}
      <Integrantes />
      {esAdmin && <Usuarios />}
      <CopiaSeguridad />
    </div>
  )
}

// ---------------------------------------------------------------------
// Mi cuenta
// ---------------------------------------------------------------------
function MiCuenta() {
  const { perfil, cambiarPassword, refrescarPerfil } = useAuth()
  const avisos = useAvisos()
  const [nombre, setNombre] = useState(perfil?.display_name ?? '')
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardarNombre = async () => {
    if (!perfil || !nombre.trim()) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('profiles').update({ display_name: nombre.trim() }).eq('id', perfil.id)
      if (error) throw error
      await refrescarPerfil()
      avisos.ok('Nombre actualizado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const guardarPassword = async () => {
    if (password.length < 6) {
      avisos.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setGuardando(true)
    try {
      await cambiarPassword(password)
      setPassword('')
      avisos.ok('Contraseña cambiada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Seccion titulo="Mi cuenta" icono={<UserRound size={19} />}>
      <Tarjeta className="grid gap-4 p-4 sm:grid-cols-2">
        <Campo etiqueta="Cómo me ven los demás">
          <div className="flex gap-2">
            <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Boton variante="secundario" onClick={() => void guardarNombre()} cargando={guardando}>
              Guardar
            </Boton>
          </div>
        </Campo>
        <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 6 caracteres.">
          <div className="flex gap-2">
            <Entrada
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <Boton variante="secundario" onClick={() => void guardarPassword()} disabled={!password}>
              <KeyRound size={16} /> Cambiar
            </Boton>
          </div>
        </Campo>
      </Tarjeta>
    </Seccion>
  )
}

// ---------------------------------------------------------------------
// Ajustes del grupo (factor de los niños, grupo de referencia)
// ---------------------------------------------------------------------
function AjustesGrupo() {
  const { ajustes, refrescar } = useGrupo()
  const avisos = useAvisos()
  const [factor, setFactor] = useState(String(ajustes.factorNinos))
  const [grupo, setGrupo] = useState(String(ajustes.grupoHabitual))
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setFactor(String(ajustes.factorNinos))
    setGrupo(String(ajustes.grupoHabitual))
  }, [ajustes])

  const guardar = async () => {
    setGuardando(true)
    try {
      const { error } = await supabase.from('app_settings').upsert([
        { key: 'child_factor', value: Number(factor) || 0.5 },
        { key: 'default_group_size', value: Number(grupo) || 15 },
      ])
      if (error) throw error
      await refrescar()
      avisos.ok('Ajustes guardados.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Seccion titulo="Cálculo de cantidades" icono={<Baby size={19} />}>
      <Tarjeta className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Factor de consumo de los niños"
            ayuda="Se aplica a los integrantes nuevos marcados como niños. Ejemplo: 0,5 = medio adulto."
          >
            <Entrada
              type="number"
              min="0"
              max="2"
              step="0.1"
              inputMode="decimal"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Grupo de referencia de la lista maestra"
            ayuda="Número de personas para el que están pensadas las cantidades habituales."
          >
            <Entrada
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
            />
          </Campo>
        </div>
        <Boton onClick={() => void guardar()} cargando={guardando}>
          Guardar ajustes
        </Boton>
      </Tarjeta>
    </Seccion>
  )
}

// ---------------------------------------------------------------------
// Integrantes y unidades familiares
// ---------------------------------------------------------------------
function Integrantes() {
  const { miembros, hogares, ajustes, refrescar } = useGrupo()
  const { esAdmin } = useAuth()
  const avisos = useAvisos()
  const [form, setForm] = useState<{ item: Member | null } | null>(null)
  const [borrando, setBorrando] = useState<Member | null>(null)
  const [nuevoHogar, setNuevoHogar] = useState('')
  const [hogarBorrando, setHogarBorrando] = useState<Household | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  const porHogar = useMemo(() => {
    const grupos: { hogar: Household | null; gente: Member[] }[] = hogares.map((h) => ({
      hogar: h,
      gente: miembros.filter((m) => m.household_id === h.id),
    }))
    const sueltos = miembros.filter((m) => !m.household_id || !hogares.some((h) => h.id === m.household_id))
    if (sueltos.length) grupos.push({ hogar: null, gente: sueltos })
    return grupos
  }, [hogares, miembros])

  const activos = miembros.filter((m) => m.active)

  const crearHogar = async () => {
    if (!nuevoHogar.trim()) return
    try {
      const { error } = await supabase
        .from('households')
        .insert({ name: nuevoHogar.trim(), sort_order: hogares.length })
      if (error) throw error
      setNuevoHogar('')
      await refrescar()
      avisos.ok('Unidad familiar creada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const borrarMiembro = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error } = await supabase.from('members').delete().eq('id', borrando.id)
      if (error) throw error
      await refrescar()
      avisos.ok('Integrante eliminado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  const borrarHogar = async () => {
    if (!hogarBorrando) return
    setEnCurso(true)
    try {
      const { error } = await supabase.from('households').delete().eq('id', hogarBorrando.id)
      if (error) throw error
      await refrescar()
      avisos.ok('Unidad familiar eliminada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setHogarBorrando(null)
    }
  }

  return (
    <Seccion
      titulo="Integrantes del grupo"
      icono={<Users size={19} />}
      accion={
        esAdmin ? (
          <Boton tamanyo="sm" onClick={() => setForm({ item: null })}>
            <Plus size={16} /> Integrante
          </Boton>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <Tarjeta className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-sm">
          <span className="text-carbon/70">
            <strong>{activos.length}</strong> activos
          </span>
          <span className="text-carbon/70">
            <strong>{activos.filter((m) => !m.is_child).length}</strong> adultos
          </span>
          <span className="text-carbon/70">
            <strong>{activos.filter((m) => m.is_child).length}</strong> niños
          </span>
          <span className="text-carbon/70">
            <strong>{numero(personasEquivalentes(activos))}</strong> personas equivalentes
          </span>
        </Tarjeta>

        {porHogar.map(({ hogar, gente }) => (
          <Tarjeta key={hogar?.id ?? 'sueltos'} className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-arena bg-beige/60 px-4 py-2.5">
              <span className="font-display flex-1 text-sm font-bold text-bosque-800">
                {hogar?.name ?? 'Sin unidad familiar'}
              </span>
              <span className="text-xs text-carbon/50">{gente.length}</span>
              {esAdmin && hogar && (
                <BotonIcono etiqueta="Eliminar unidad familiar" tono="peligro" onClick={() => setHogarBorrando(hogar)}>
                  <Trash2 size={14} />
                </BotonIcono>
              )}
            </div>
            {gente.length === 0 ? (
              <p className="px-4 py-3 text-sm text-carbon/50">Nadie asignado todavía.</p>
            ) : (
              <ul className="divide-y divide-arena">
                {gente.map((m) => (
                  <li key={m.id} className={`flex items-center gap-3 px-4 py-2.5 ${m.active ? '' : 'opacity-50'}`}>
                    <Avatar src={m.avatar_url} nombre={m.name} tamanyo="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{m.name}</span>
                      <span className="block text-xs text-carbon/50">
                        {m.is_child ? 'Niñ@' : 'Adulto'} · factor {numero(m.consumption_factor)}
                        {!m.active && ' · inactivo'}
                      </span>
                    </span>
                    {m.is_child && <Etiqueta tono="tierra">🧒</Etiqueta>}
                    {esAdmin && (
                      <div className="-mr-1 flex shrink-0">
                        <BotonIcono etiqueta="Editar integrante" onClick={() => setForm({ item: m })}>
                          <Pencil size={15} />
                        </BotonIcono>
                        <BotonIcono etiqueta="Eliminar integrante" tono="peligro" onClick={() => setBorrando(m)}>
                          <Trash2 size={15} />
                        </BotonIcono>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        ))}

        {esAdmin && (
          <Tarjeta className="flex flex-wrap items-end gap-2 p-4">
            <Campo etiqueta="Nueva unidad familiar (pareja, familia…)" className="min-w-50 flex-1">
              <Entrada
                value={nuevoHogar}
                onChange={(e) => setNuevoHogar(e.target.value)}
                placeholder="Ej.: Javi y Marta"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void crearHogar()
                  }
                }}
              />
            </Campo>
            <Boton variante="secundario" onClick={() => void crearHogar()} disabled={!nuevoHogar.trim()}>
              <HousePlus size={17} /> Crear
            </Boton>
          </Tarjeta>
        )}
      </div>

      <FormularioMiembro
        abierto={Boolean(form)}
        onCerrar={() => setForm(null)}
        item={form?.item ?? null}
        hogares={hogares}
        factorNinos={ajustes.factorNinos}
        onHecho={() => void refrescar()}
      />
      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Eliminar a ${borrando?.name}?`}
        texto="Se quitará de las escapadas en las que estuviera apuntado. Si solo falta a una escapada, es mejor desmarcarlo en esa escapada o marcarlo como inactivo."
        textoAceptar="Sí, eliminar"
        cargando={enCurso}
        onAceptar={() => void borrarMiembro()}
        onCancelar={() => setBorrando(null)}
      />
      <Confirmar
        abierto={Boolean(hogarBorrando)}
        titulo={`¿Eliminar «${hogarBorrando?.name}»?`}
        texto="Sus integrantes se quedarán sin unidad familiar, pero no se borran."
        textoAceptar="Sí, eliminar"
        cargando={enCurso}
        onAceptar={() => void borrarHogar()}
        onCancelar={() => setHogarBorrando(null)}
      />
    </Seccion>
  )
}

function FormularioMiembro({
  abierto,
  onCerrar,
  item,
  hogares,
  factorNinos,
  onHecho,
}: {
  abierto: boolean
  onCerrar: () => void
  item: Member | null
  hogares: Household[]
  factorNinos: number
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState('')
  const [hogar, setHogar] = useState('')
  const [esNino, setEsNino] = useState(false)
  const [factor, setFactor] = useState('1')
  const [activo, setActivo] = useState(true)
  const [foto, setFoto] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setNombre(item?.name ?? '')
    setHogar(item?.household_id ?? '')
    setEsNino(item?.is_child ?? false)
    setFactor(String(item?.consumption_factor ?? 1))
    setActivo(item?.active ?? true)
    setFoto(item?.avatar_url ?? null)
  }, [abierto, item])

  const cambiaNino = (valor: boolean) => {
    setEsNino(valor)
    if (!item) setFactor(valor ? String(factorNinos) : '1')
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Pon el nombre del integrante.')
      return
    }
    setGuardando(true)
    try {
      const datos = {
        name: nombre.trim(),
        household_id: hogar || null,
        is_child: esNino,
        consumption_factor: Number(factor) || (esNino ? factorNinos : 1),
        active: activo,
        avatar_url: foto,
      }
      if (item) {
        const { error: err } = await supabase.from('members').update(datos).eq('id', item.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('members').insert(datos)
        if (err) throw err
      }
      avisos.ok(item ? 'Integrante actualizado.' : 'Integrante añadido.')
      onHecho()
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={item ? 'Editar integrante' : 'Nuevo integrante'}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-miembro" cargando={guardando}>
            {item ? 'Guardar' : 'Añadir'}
          </Boton>
        </>
      }
    >
      <form id="form-miembro" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Foto" ayuda="Opcional. Los niños no tienen cuenta, así que su foto se pone desde aquí.">
          <AvatarEditable src={foto} nombre={nombre} onCambiar={setFoto} tamanyo="lg" />
        </Campo>
        <Campo etiqueta="Nombre" requerido>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej.: Marta" />
        </Campo>
        <Campo etiqueta="Unidad familiar">
          <Lista value={hogar} onChange={(e) => setHogar(e.target.value)}>
            <option value="">Sin asignar</option>
            {hogares.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Lista>
        </Campo>
        <div className="space-y-3 rounded-2xl border border-arena bg-superficie p-4">
          <Interruptor checked={esNino} onChange={cambiaNino} etiqueta="Es niñ@" />
          <Interruptor checked={activo} onChange={setActivo} etiqueta="Participa habitualmente" />
        </div>
        <Campo
          etiqueta="Factor de consumo"
          ayuda="1 = un adulto. Se usa para calcular las cantidades de la compra."
        >
          <Entrada
            type="number"
            min="0"
            max="3"
            step="0.1"
            inputMode="decimal"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
        </Campo>
        {error && (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------
// Usuarios con cuenta (solo administradores)
// ---------------------------------------------------------------------
function Usuarios() {
  const { perfiles, miembros, refrescar } = useGrupo()
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const [borrando, setBorrando] = useState<Profile | null>(null)
  const [editando, setEditando] = useState<Profile | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  // Los niños no tienen cuenta, así que no hay a quién vincularlos.
  const adultos = miembros.filter((m) => !m.is_child)

  const actualiza = async (p: Profile, campos: Partial<Profile>) => {
    try {
      const { error } = await supabase.from('profiles').update(campos).eq('id', p.id)
      if (error) throw error
      await refrescar()
      avisos.ok('Usuario actualizado.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const quitarAcceso = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', borrando.id)
      if (error) throw error
      await refrescar()
      avisos.ok('Acceso retirado. La cuenta ya no puede ver los datos del grupo.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  return (
    <Seccion titulo="Usuarios con cuenta" icono={<ShieldCheck size={19} />}>
      <Tarjeta className="divide-y divide-arena overflow-hidden">
        {perfiles.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar
              src={p.avatar_url ?? miembros.find((m) => m.id === p.member_id)?.avatar_url}
              nombre={p.display_name || p.email}
              tamanyo="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-bosque-800">
                {p.display_name || p.email}
                {p.id === perfil?.id && <span className="ml-1.5 text-xs text-carbon/45">(tú)</span>}
              </span>
              <span className="block truncate text-xs text-carbon/50">{p.email}</span>
            </span>
            <Lista
              aria-label={`Integrante vinculado a ${p.display_name}`}
              value={p.member_id ?? ''}
              onChange={(e) => void actualiza(p, { member_id: e.target.value || null })}
              className="w-auto py-1.5 text-sm"
            >
              <option value="">Sin vincular</option>
              {adultos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Lista>
            <Lista
              aria-label={`Rol de ${p.display_name}`}
              value={p.role}
              onChange={(e) => void actualiza(p, { role: e.target.value as Rol })}
              className="w-auto py-1.5 text-sm"
              disabled={p.id === perfil?.id}
            >
              <option value="user">Integrante</option>
              <option value="admin">Administrador</option>
            </Lista>
            <div className="-mr-1 flex shrink-0">
              <BotonIcono etiqueta={`Editar ${p.display_name || p.email}`} onClick={() => setEditando(p)}>
                <Pencil size={15} />
              </BotonIcono>
              {p.id !== perfil?.id && (
                <BotonIcono etiqueta="Quitar acceso" tono="peligro" onClick={() => setBorrando(p)}>
                  <Trash2 size={15} />
                </BotonIcono>
              )}
            </div>
          </div>
        ))}
      </Tarjeta>

      <div className="mt-3 rounded-2xl border border-arena bg-beige px-4 py-3 text-sm text-carbon/70">
        <p className="font-semibold text-bosque-800">¿Cómo doy acceso a alguien nuevo?</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>
            En Supabase: <em>Authentication → Users → Add user → Create new user</em>, con su email y una
            contraseña provisional. Marca <em>Auto Confirm User</em> para que pueda entrar sin confirmar nada.
          </li>
          <li>Pásale el enlace de Rural69, su email y esa contraseña: aparecerá aquí en cuanto entre.</li>
          <li>Vincúlalo con su integrante del grupo y, si hace falta, dale rol de administrador.</li>
          <li>Que se cambie la contraseña y se ponga foto desde su perfil. Tú también puedes hacerlo por él.</li>
        </ol>
        <p className="mt-2 text-xs text-carbon/50">
          Los niños no llevan cuenta: ni votan ni pagan. Van como integrantes del grupo y los gestionan sus
          padres o un administrador.
        </p>
      </div>

      <FormularioUsuario
        abierto={Boolean(editando)}
        perfil={editando}
        miembros={miembros}
        onCerrar={() => setEditando(null)}
        onHecho={() => void refrescar()}
      />

      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Quitar el acceso de ${borrando?.display_name || borrando?.email}?`}
        texto="Su cuenta seguirá existiendo en Supabase, pero no podrá ver ni modificar nada del grupo."
        textoAceptar="Sí, quitar acceso"
        cargando={enCurso}
        onAceptar={() => void quitarAcceso()}
        onCancelar={() => setBorrando(null)}
      />
    </Seccion>
  )
}

// ---------------------------------------------------------------------
// Editar una cuenta (solo administradores)
// ---------------------------------------------------------------------
function FormularioUsuario({
  abierto,
  perfil,
  miembros,
  onCerrar,
  onHecho,
}: {
  abierto: boolean
  perfil: Profile | null
  miembros: Member[]
  onCerrar: () => void
  onHecho: () => void
}) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setNombre(perfil?.display_name ?? '')
    setFoto(perfil?.avatar_url ?? null)
  }, [abierto, perfil])

  const miembro = miembros.find((m) => m.id === perfil?.member_id) ?? null

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfil) return
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: nombre.trim(), avatar_url: foto })
        .eq('id', perfil.id)
      if (error) throw error
      avisos.ok('Cuenta actualizada.')
      onHecho()
      onCerrar()
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Editar a ${perfil?.display_name || perfil?.email || ''}`}
      descripcion="Como administrador puedes cambiarle el nombre y la foto."
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-usuario" cargando={guardando}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="form-usuario" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Foto">
          <AvatarEditable src={foto ?? miembro?.avatar_url} nombre={nombre} onCambiar={setFoto} tamanyo="lg" />
        </Campo>
        <Campo etiqueta="Nombre" requerido>
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej.: Javi" />
        </Campo>
        <div className="rounded-2xl border border-arena bg-beige px-4 py-3 text-sm text-carbon/65">
          <p>
            <strong className="text-bosque-800">Email:</strong> {perfil?.email}
          </p>
          <p className="mt-1 text-xs">
            El correo y la contraseña los cambia cada cual desde su perfil. Si alguien pierde el acceso,
            cámbiale la contraseña en Supabase (<em>Authentication → Users</em>).
          </p>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------
// Copia de seguridad
// ---------------------------------------------------------------------
const TABLAS = [
  'profiles',
  'households',
  'members',
  'trips',
  'trip_participants',
  'houses',
  'house_photos',
  'votes',
  'master_items',
  'shopping_items',
  'pantry_items',
  'app_settings',
] as const

function CopiaSeguridad() {
  const avisos = useAvisos()
  const [cargando, setCargando] = useState(false)

  const exportar = async () => {
    setCargando(true)
    try {
      const copia: Record<string, unknown> = {
        aplicacion: 'Rural69',
        fecha: new Date().toISOString(),
      }
      for (const tabla of TABLAS) {
        const { data, error } = await supabase.from(tabla).select('*')
        if (error) throw error
        copia[tabla] = data ?? []
      }
      descarga(nombreArchivo('copia-rural69', 'json'), JSON.stringify(copia, null, 2), 'application/json')
      avisos.ok('Copia de seguridad descargada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Seccion titulo="Copia de seguridad" icono={<DatabaseBackup size={19} />}>
      <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="max-w-lg text-sm text-carbon/65">
          Descarga un archivo JSON con todo: escapadas, casas, votos, listas, despensa e integrantes. Guárdalo de vez
          en cuando por si acaso.
        </p>
        <Boton variante="secundario" onClick={() => void exportar()} cargando={cargando}>
          <DatabaseBackup size={17} /> Descargar copia
        </Boton>
      </Tarjeta>
    </Seccion>
  )
}
