import { useEffect, useState } from 'react'
import {
  AtSign,
  Bell,
  BellOff,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'
import { Avatar, AvatarEditable } from '../components/ui/Avatar'
import { Boton } from '../components/ui/Boton'
import { Campo, Entrada, Interruptor } from '../components/ui/Campos'
import { Etiqueta, Seccion, Tarjeta } from '../components/ui/Varios'
import { useAuth } from '../hooks/useAuth'
import { useGrupo } from '../hooks/useGrupo'
import { useAvisos } from '../hooks/useAvisos'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { useTema, type Preferencia } from '../hooks/useTema'
import { mensajeError, supabase } from '../lib/supabase'

export function Perfil() {
  const { perfil, session, esAdmin, salir, refrescarPerfil, cambiarEmail, cambiarPassword, compruebaPassword } =
    useAuth()
  const { miembros, hogares, refrescar } = useGrupo()

  const miembro = miembros.find((m) => m.id === perfil?.member_id) ?? null
  const hogar = hogares.find((h) => h.id === miembro?.household_id) ?? null
  const foto = perfil?.avatar_url ?? miembro?.avatar_url ?? null

  if (!perfil) return null

  return (
    <div className="space-y-6">
      <header className="animate-sube flex items-center gap-4">
        <Avatar src={foto} nombre={perfil.display_name || perfil.email} tamanyo="lg" />
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl text-bosque-800">
            {perfil.display_name || 'Sin nombre'}
          </h1>
          <p className="truncate text-sm text-carbon/60">{perfil.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Etiqueta tono={esAdmin ? 'oliva' : 'neutro'}>{esAdmin ? 'Administrador' : 'Integrante'}</Etiqueta>
            {miembro && <Etiqueta>{miembro.name}</Etiqueta>}
            {hogar && <Etiqueta tono="tierra">{hogar.name}</Etiqueta>}
          </div>
        </div>
      </header>

      <DatosPersonales
        perfil={perfil}
        foto={foto}
        onGuardado={async () => {
          await refrescarPerfil()
          await refrescar()
        }}
      />

      <Aspecto />

      <AvisosDelGrupo />

      <CambioEmail emailActual={session?.user.email ?? perfil.email} cambiarEmail={cambiarEmail} />

      <CambioPassword cambiarPassword={cambiarPassword} compruebaPassword={compruebaPassword} />

      {!perfil.member_id && (
        <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-4 py-3 text-sm text-tierra-700">
          Tu cuenta todavía no está vinculada a ningún integrante del grupo. Pídele a un administrador que lo
          haga en <strong>Ajustes</strong>: así tus votos y tus compras saldrán con tu nombre.
        </p>
      )}

      <Seccion titulo="Sesión" icono={<LogOut size={19} />}>
        <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-carbon/60">
            Cierra la sesión si estás en un móvil u ordenador que no es tuyo.
          </p>
          <Boton variante="peligro" onClick={() => void salir()}>
            <LogOut size={16} /> Cerrar sesión
          </Boton>
        </Tarjeta>
      </Seccion>

      <p className="text-center text-xs text-carbon/45">
        Los niños no tienen cuenta: sus datos y su foto los gestionan sus padres o un administrador desde
        Ajustes.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------

function DatosPersonales({
  perfil,
  foto,
  onGuardado,
}: {
  perfil: { id: string; display_name: string; avatar_url: string | null }
  foto: string | null
  onGuardado: () => Promise<void>
}) {
  const avisos = useAvisos()
  const [nombre, setNombre] = useState(perfil.display_name)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => setNombre(perfil.display_name), [perfil.display_name])

  const guardaFoto = async (url: string | null) => {
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', perfil.id)
      if (error) throw error
      await onGuardado()
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      avisos.error('Pon un nombre: es el que verán los demás.')
      return
    }
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: nombre.trim() })
        .eq('id', perfil.id)
      if (error) throw error
      await onGuardado()
      avisos.ok('Perfil guardado.')
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Seccion titulo="Tus datos" icono={<UserRound size={19} />}>
      <Tarjeta className="space-y-5 p-5">
        <Campo etiqueta="Foto" ayuda="Se ve en las votaciones y en la lista de la compra. Máximo 5 MB.">
          <AvatarEditable src={foto} nombre={nombre} onCambiar={(url) => void guardaFoto(url)} />
        </Campo>
        <form onSubmit={guardar} className="space-y-4">
          <Campo etiqueta="Nombre" ayuda="Así te llamará la aplicación." requerido>
            <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
          </Campo>
          <Boton type="submit" cargando={guardando} disabled={nombre.trim() === perfil.display_name}>
            Guardar nombre
          </Boton>
        </form>
      </Tarjeta>
    </Seccion>
  )
}

function CambioEmail({
  emailActual,
  cambiarEmail,
}: {
  emailActual: string
  cambiarEmail: (email: string) => Promise<void>
}) {
  const avisos = useAvisos()
  const [email, setEmail] = useState(emailActual)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => setEmail(emailActual), [emailActual])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      await cambiarEmail(email)
      setEnviado(true)
      avisos.ok('Te hemos enviado un correo para confirmar el cambio.')
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Seccion titulo="Correo electrónico" icono={<AtSign size={19} />}>
      <Tarjeta className="p-5">
        <form onSubmit={enviar} className="space-y-4">
          <Campo
            etiqueta="Email"
            ayuda="Es con lo que entras. Al cambiarlo recibirás un correo de confirmación en la dirección nueva; hasta que no lo abras, sigue valiendo la anterior."
          >
            <Entrada
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEnviado(false)
              }}
              required
              autoComplete="email"
              inputMode="email"
            />
          </Campo>
          {enviado && (
            <p className="rounded-2xl border border-oliva-300 bg-oliva-100 px-3.5 py-2.5 text-sm font-medium text-oliva-700">
              Revisa tu correo y abre el enlace de confirmación.
            </p>
          )}
          <Boton
            type="submit"
            variante="secundario"
            cargando={enviando}
            disabled={!email.trim() || email.trim() === emailActual}
          >
            Cambiar correo
          </Boton>
        </form>
      </Tarjeta>
    </Seccion>
  )
}

function CambioPassword({
  cambiarPassword,
  compruebaPassword,
}: {
  cambiarPassword: (password: string) => Promise<void>
  compruebaPassword: (password: string) => Promise<boolean>
}) {
  const avisos = useAvisos()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nueva.length < 6) {
      avisos.error('La contraseña nueva necesita al menos 6 caracteres.')
      return
    }
    if (nueva !== repetida) {
      avisos.error('Las dos contraseñas nuevas no coinciden.')
      return
    }
    setGuardando(true)
    try {
      if (!(await compruebaPassword(actual))) {
        avisos.error('La contraseña actual no es correcta.')
        return
      }
      await cambiarPassword(nueva)
      setActual('')
      setNueva('')
      setRepetida('')
      avisos.ok('Contraseña cambiada.')
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Seccion titulo="Contraseña" icono={<KeyRound size={19} />}>
      <Tarjeta className="p-5">
        <form onSubmit={enviar} className="space-y-4">
          <p className="flex items-start gap-2 rounded-2xl bg-beige px-3.5 py-2.5 text-sm text-carbon/70">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-oliva-600" />
            Si entraste con una contraseña que te dio el administrador, cámbiala por una tuya.
          </p>
          <Campo etiqueta="Contraseña actual" requerido>
            <Entrada
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nueva" ayuda="Mínimo 6 caracteres." requerido>
              <Entrada
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </Campo>
            <Campo etiqueta="Repítela" requerido>
              <Entrada
                type="password"
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </Campo>
          </div>
          <Boton type="submit" cargando={guardando} disabled={!actual || !nueva || !repetida}>
            Cambiar contraseña
          </Boton>
        </form>
      </Tarjeta>
    </Seccion>
  )
}

// ---------------------------------------------------------------------

const ASPECTOS: [Preferencia, string, typeof Sun][] = [
  ['claro', 'Claro', Sun],
  ['oscuro', 'Oscuro', Moon],
  ['sistema', 'Automático', Monitor],
]

function Aspecto() {
  const { preferencia, resuelto, cambiar } = useTema()

  return (
    <Seccion titulo="Aspecto" icono={<Moon size={19} />}>
      <Tarjeta className="space-y-3 p-5">
        <div className="flex flex-wrap rounded-2xl bg-beige p-1">
          {ASPECTOS.map(([valor, texto, Icono]) => (
            <button
              key={valor}
              type="button"
              onClick={() => cambiar(valor)}
              aria-pressed={preferencia === valor}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                preferencia === valor ? 'bg-superficie text-bosque-700 shadow-sm' : 'text-carbon/55'
              }`}
            >
              <Icono size={16} /> {texto}
            </button>
          ))}
        </div>
        <p className="text-sm text-carbon/60">
          {preferencia === 'sistema'
            ? `Sigue a tu móvil u ordenador, que ahora mismo está en ${resuelto}.`
            : 'Fijo, sin hacer caso a lo que diga el sistema.'}{' '}
          Es una preferencia de este aparato: si entras desde otro, se elige allí aparte.
        </p>
      </Tarjeta>
    </Seccion>
  )
}

function AvisosDelGrupo() {
  const { permiso, activados, activar, desactivar } = useNotificaciones()
  const avisos = useAvisos()

  const pedir = async () => {
    await activar()
    if (Notification.permission === 'denied') {
      avisos.error('El navegador ha bloqueado los avisos. Hay que permitirlos en sus ajustes.')
    }
  }

  return (
    <Seccion titulo="Avisos" icono={activados ? <Bell size={19} /> : <BellOff size={19} />}>
      <Tarjeta className="space-y-4 p-5">
        <p className="text-sm text-carbon/70">
          Cuando alguien propone una casa, se abre una votación o ya hay casa elegida, te sale en la campana
          de arriba. Eso funciona siempre. Aparte, este aparato puede avisarte con un toque del sistema.
        </p>

        {permiso === 'no-soportado' ? (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm text-tierra-700">
            Este navegador no deja mandar avisos del sistema. En el iPhone hay que instalar antes Rural69 en
            la pantalla de inicio (botón <strong>Compartir → Añadir a inicio</strong>).
          </p>
        ) : permiso === 'denegado' ? (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm text-tierra-700">
            Los avisos están bloqueados para Rural69. Para volver a activarlos hay que permitirlos en los
            ajustes del navegador (el candado de la barra de direcciones).
          </p>
        ) : activados ? (
          <>
            <Interruptor
              checked
              onChange={() => desactivar()}
              etiqueta="Avisarme en este aparato"
            />
            <p className="text-sm text-carbon/60">
              Suena mientras Rural69 esté abierta, aunque sea de fondo o con la pantalla apagada. Con la
              aplicación cerrada del todo no puede sonar: para eso haría falta un servidor propio, y Rural69
              no tiene ninguno a propósito (es lo que la hace gratis de mantener).
            </p>
          </>
        ) : (
          <>
            <Boton variante="secundario" onClick={() => void pedir()}>
              <Bell size={16} /> Activar avisos en este aparato
            </Boton>
            <p className="text-sm text-carbon/60">
              El navegador te preguntará si los permites. Se elige aparato por aparato.
            </p>
          </>
        )}
      </Tarjeta>
    </Seccion>
  )
}
