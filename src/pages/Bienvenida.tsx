import { useState } from 'react'
import { KeyRound, PartyPopper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Marca } from '../components/layout/Logo'
import { Boton } from '../components/ui/Boton'
import { Campo, Entrada } from '../components/ui/Campos'
import { useAuth } from '../hooks/useAuth'
import { mensajeError } from '../lib/supabase'

/**
 * El primer paso de quien llega por un email.
 *
 * A una invitación de Supabase no la acompaña ninguna contraseña: trae una
 * sesión y nada más. Si se le enseña la pantalla de acceso, se le está
 * pidiendo algo que no tiene y no hay forma de salir del bucle. Aquí la pone,
 * y ya entra como todo el mundo.
 *
 * Sirve igual para «he olvidado la contraseña», que vuelve por el mismo
 * camino y con el mismo problema.
 */
export function Bienvenida() {
  const { session, pendienteDeContrasenya, cambiarPassword, contrasenyaPuesta } = useAuth()
  const navega = useNavigate()
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esInvitacion = pendienteDeContrasenya !== 'recovery'

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (nueva !== repetida) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    setGuardando(true)
    try {
      await cambiarPassword(nueva)
      contrasenyaPuesta()
      navega('/', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="animate-sube w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Marca className="scale-125" />
          </div>
          <h1 className="font-display flex items-center justify-center gap-2 text-3xl text-bosque-800">
            {esInvitacion && <PartyPopper size={26} />}
            {esInvitacion ? 'Bienvenid@ a Rural69' : 'Pon una contraseña nueva'}
          </h1>
          <p className="mt-2 text-sm text-suave">
            {esInvitacion
              ? 'Ya estás dentro. Elige una contraseña y no te la volvemos a pedir hasta que cierres sesión.'
              : 'Elige una contraseña nueva para tu cuenta.'}
          </p>
        </div>

        <div className="tarjeta p-5 sm:p-6">
          <form onSubmit={enviar} className="space-y-4">
            {session?.user.email && (
              <p className="rounded-2xl border border-arena bg-beige px-3.5 py-2.5 text-sm text-tenue">
                Tu cuenta: <strong className="text-bosque-800">{session.user.email}</strong>
              </p>
            )}

            <Campo etiqueta="Contraseña" ayuda="Seis caracteres o más." requerido>
              <Entrada
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                autoFocus
              />
            </Campo>

            <Campo etiqueta="Repítela" requerido>
              <Entrada
                type="password"
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </Campo>

            {error && (
              <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
                {error}
              </p>
            )}

            <Boton type="submit" tamanyo="lg" ancho cargando={guardando}>
              <KeyRound size={18} /> Guardar y entrar
            </Boton>
          </form>
        </div>

        {esInvitacion && (
          <p className="mt-5 text-center text-xs text-suave">
            Si no reconoces esta invitación, cierra esta página sin poner nada.
          </p>
        )}
      </div>
    </div>
  )
}
