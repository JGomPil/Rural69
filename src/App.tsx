import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { LogOut, UserX } from 'lucide-react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { AvisosProvider } from './hooks/useAvisos'
import { GrupoProvider } from './hooks/useGrupo'
import { NotificacionesProvider } from './hooks/useNotificaciones'
import { TemaProvider } from './hooks/useTema'
import { AppShell } from './components/layout/AppShell'
import { Marca } from './components/layout/Logo'
import { Boton } from './components/ui/Boton'
import { Cargando } from './components/ui/Varios'
import { Acceso } from './pages/Acceso'
import { Bienvenida } from './pages/Bienvenida'
import { Panel } from './pages/Panel'
import { Escapadas } from './pages/Escapadas'
import { Escapada } from './pages/Escapada'
import { ListaMaestra } from './pages/ListaMaestra'
import { Recetario } from './pages/Recetario'
import { Despensa } from './pages/Despensa'
import { Historial } from './pages/Historial'
import { Ajustes } from './pages/Ajustes'
import { Perfil } from './pages/Perfil'
import { ResumenEscapada } from './components/trip/ResumenEscapada'
import { Fechas } from './components/trip/Fechas'
import { Menu } from './components/trip/Menu'
import { CasasRurales } from './components/trip/CasasRurales'
import { Votacion } from './components/trip/Votacion'
import { ListaCompra } from './components/trip/ListaCompra'
import { Sobrantes } from './components/trip/Sobrantes'
import { Chat } from './components/trip/Chat'

function PantallaCarga() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <Marca className="scale-110" />
      <Cargando texto="Preparando la escapada…" alto="py-0" />
    </div>
  )
}

function NoAutorizado() {
  const { salir, session } = useAuth()
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="tarjeta max-w-md space-y-4 p-6 text-center">
        <UserX className="mx-auto text-tierra-500" size={36} />
        <h1 className="font-display text-xl text-bosque-800">Tu cuenta aún no está autorizada</h1>
        <p className="text-sm text-tenue">
          Has entrado con <strong>{session?.user.email}</strong>, pero esa cuenta todavía no forma parte del grupo.
          Pídele al administrador de Rural69 que te dé acceso.
        </p>
        <Boton variante="secundario" ancho onClick={() => void salir()}>
          <LogOut size={16} /> Salir
        </Boton>
      </div>
    </div>
  )
}

function Protegido() {
  const { session, perfil, cargando, sinAutorizar, pendienteDeContrasenya } = useAuth()
  const location = useLocation()

  if (cargando) return <PantallaCarga />
  if (!session) return <Navigate to="/acceso" replace state={{ desde: location.pathname }} />
  // Llegó por un email y todavía no tiene contraseña: si le dejamos pasar de
  // largo, la próxima vez no sabrá entrar.
  if (pendienteDeContrasenya) return <Navigate to="/bienvenida" replace />
  if (sinAutorizar) return <NoAutorizado />
  if (!perfil) return <PantallaCarga />

  return (
    <GrupoProvider>
      <NotificacionesProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </NotificacionesProvider>
    </GrupoProvider>
  )
}

function SoloInvitados() {
  const { session, cargando, sinAutorizar, pendienteDeContrasenya } = useAuth()
  if (cargando) return <PantallaCarga />
  if (session && pendienteDeContrasenya) return <Navigate to="/bienvenida" replace />
  if (session && sinAutorizar) return <NoAutorizado />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}

/**
 * La bienvenida de quien llega por un email. Va por libre: ni es pública —hace
 * falta la sesión que trajo el enlace— ni puede colgar de `Protegido`, que es
 * justo quien manda aquí.
 */
function Bienvenido() {
  const { session, cargando } = useAuth()
  if (cargando) return <PantallaCarga />
  if (!session) return <Navigate to="/acceso" replace />
  return <Bienvenida />
}

export function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <AvisosProvider>
          <HashRouter>
            <Routes>
              <Route element={<SoloInvitados />}>
                <Route path="/acceso" element={<Acceso />} />
              </Route>

              <Route path="/bienvenida" element={<Bienvenido />} />

              <Route element={<Protegido />}>
                <Route path="/" element={<Panel />} />
                <Route path="/escapadas" element={<Escapadas />} />
                <Route path="/escapadas/:id" element={<Escapada />}>
                  <Route index element={<ResumenEscapada />} />
                  <Route path="fechas" element={<Fechas />} />
                  <Route path="casas" element={<CasasRurales />} />
                  <Route path="votacion" element={<Votacion />} />
                  <Route path="menu" element={<Menu />} />
                  <Route path="compra" element={<ListaCompra />} />
                  <Route path="sobrantes" element={<Sobrantes />} />
                  <Route path="chat" element={<Chat />} />
                </Route>
                <Route path="/lista-maestra" element={<ListaMaestra />} />
                <Route path="/recetario" element={<Recetario />} />
                <Route path="/despensa" element={<Despensa />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/ajustes" element={<Ajustes />} />
                <Route path="/perfil" element={<Perfil />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AvisosProvider>
      </AuthProvider>
    </TemaProvider>
  )
}
