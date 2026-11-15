import { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { Marca } from '../components/layout/Logo'
import { Boton } from '../components/ui/Boton'
import { Campo, Entrada } from '../components/ui/Campos'
import { useAuth } from '../hooks/useAuth'
import { mensajeError, supabaseConfigurado } from '../lib/supabase'

// Solo se entra con email y contraseña: las cuentas las crea un administrador
// en Supabase y reparte la contraseña inicial, que luego cada cual cambia en su
// perfil. Ni registro abierto ni enlaces mágicos.
export function Acceso() {
  const { entrarConPassword, recuperarPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!supabaseConfigurado) return <SinConfigurar />

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setCargando(true)
    try {
      await entrarConPassword(email, password)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }

  const recuperar = async () => {
    if (!email) {
      setError('Escribe tu email y vuelve a pulsar.')
      return
    }
    setError(null)
    setCargando(true)
    try {
      await recuperarPassword(email)
      setAviso('Te hemos enviado un email para cambiar la contraseña.')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="animate-sube w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Marca className="scale-125" />
          </div>
          <h1 className="font-display text-3xl text-bosque-800">Nuestras escapadas, en orden</h1>
          <p className="mt-2 text-sm text-carbon/60">Casas, votaciones y lista de la compra.</p>
        </div>

        <div className="tarjeta p-5 sm:p-6">
          <form onSubmit={enviar} className="space-y-4">
            <Campo etiqueta="Email" requerido>
              <Entrada
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@email.com"
                required
                autoComplete="email"
                inputMode="email"
              />
            </Campo>

            <Campo etiqueta="Contraseña" requerido>
              <Entrada
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </Campo>

            {error && (
              <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
                {error}
              </p>
            )}
            {aviso && (
              <p className="rounded-2xl border border-oliva-300 bg-oliva-100 px-3.5 py-2.5 text-sm font-medium text-oliva-700">
                {aviso}
              </p>
            )}

            <Boton type="submit" tamanyo="lg" ancho cargando={cargando}>
              <KeyRound size={18} /> Entrar
            </Boton>

            <button
              type="button"
              onClick={() => void recuperar()}
              className="w-full text-center text-xs font-semibold text-carbon/50 hover:text-bosque-600"
            >
              He olvidado la contraseña
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-carbon/45">
          Privada. Las cuentas las crea el administrador.
        </p>
      </div>
    </div>
  )
}

function SinConfigurar() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="tarjeta max-w-lg space-y-3 p-6">
        <ShieldAlert className="text-tierra-500" size={32} />
        <h1 className="font-display text-xl text-bosque-800">Falta conectar Supabase</h1>
        <p className="text-sm text-carbon/70">
          La aplicación necesita dos variables de entorno para funcionar:{' '}
          <code className="rounded bg-beige px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> y{' '}
          <code className="rounded bg-beige px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-carbon/70">
          <li>
            En local: crea el archivo <code className="rounded bg-beige px-1.5 py-0.5 text-xs">.env.local</code>{' '}
            copiando <code className="rounded bg-beige px-1.5 py-0.5 text-xs">.env.example</code>.
          </li>
          <li>
            En GitHub: añade los dos valores en <em>Settings → Secrets and variables → Actions</em> y vuelve a
            desplegar.
          </li>
        </ul>
        <p className="text-xs text-carbon/50">Tienes el paso a paso completo en el README del repositorio.</p>
      </div>
    </div>
  )
}
