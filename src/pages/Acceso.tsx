import { useState } from 'react'
import { KeyRound, Mail, ShieldAlert } from 'lucide-react'
import { Marca } from '../components/layout/Logo'
import { Boton } from '../components/ui/Boton'
import { Campo, Entrada } from '../components/ui/Campos'
import { useAuth } from '../hooks/useAuth'
import { mensajeError, supabaseConfigurado } from '../lib/supabase'

type Modo = 'password' | 'enlace' | 'registro'

export function Acceso() {
  const { entrarConPassword, entrarConEnlace, registrarse, recuperarPassword } = useAuth()
  const [modo, setModo] = useState<Modo>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
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
      if (modo === 'password') {
        await entrarConPassword(email, password)
      } else if (modo === 'enlace') {
        await entrarConEnlace(email)
        setAviso('Te hemos enviado un enlace de acceso. Ábrelo desde este mismo móvil u ordenador.')
      } else {
        const { necesitaConfirmar } = await registrarse(email, password, nombre)
        setAviso(
          necesitaConfirmar
            ? 'Cuenta creada. Confirma tu email con el mensaje que acabas de recibir y vuelve a entrar.'
            : '¡Cuenta creada! Entrando…',
        )
      }
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
          <p className="mx-auto mt-2 max-w-xs text-sm text-carbon/60">
            Casas rurales, votaciones, lista de la compra y lo que sobró de la última vez. Todo en un sitio.
          </p>
        </div>

        <div className="tarjeta p-5 sm:p-6">
          <div className="mb-5 flex rounded-2xl bg-beige p-1">
            {(
              [
                ['password', 'Contraseña'],
                ['enlace', 'Enlace mágico'],
                ['registro', 'Crear cuenta'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => {
                  setModo(valor)
                  setError(null)
                  setAviso(null)
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition sm:text-sm ${
                  modo === valor ? 'bg-white text-bosque-700 shadow-sm' : 'text-carbon/55'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="space-y-4">
            {modo === 'registro' && (
              <Campo etiqueta="Tu nombre" requerido>
                <Entrada
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Javi"
                  required
                  autoComplete="name"
                />
              </Campo>
            )}

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

            {modo !== 'enlace' && (
              <Campo
                etiqueta="Contraseña"
                requerido
                ayuda={modo === 'registro' ? 'Mínimo 6 caracteres.' : undefined}
              >
                <Entrada
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                />
              </Campo>
            )}

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
              {modo === 'password' && (
                <>
                  <KeyRound size={18} /> Entrar
                </>
              )}
              {modo === 'enlace' && (
                <>
                  <Mail size={18} /> Enviarme el enlace
                </>
              )}
              {modo === 'registro' && 'Crear mi cuenta'}
            </Boton>

            {modo === 'password' && (
              <button
                type="button"
                onClick={() => void recuperar()}
                className="w-full text-center text-xs font-semibold text-carbon/50 hover:text-bosque-600"
              >
                He olvidado la contraseña
              </button>
            )}
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-carbon/45">
          Rural69 es privada: solo entran los integrantes del grupo autorizados por el administrador.
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
