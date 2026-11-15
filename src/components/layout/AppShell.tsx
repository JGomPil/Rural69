import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  ChevronRight,
  House,
  ListChecks,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  ShoppingCart,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Marca } from './Logo'
import { InstalarApp } from './InstalarApp'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import { useGrupo } from '../../hooks/useGrupo'
import { Modal } from '../ui/Modal'
import { Boton } from '../ui/Boton'

interface Enlace {
  a: string
  texto: string
  icono: typeof House
  exacto?: boolean
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { perfil, salir, esAdmin } = useAuth()
  const { escapadaActiva, miembros } = useGrupo()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  const rutaCompra = escapadaActiva ? `/escapadas/${escapadaActiva.id}/compra` : '/escapadas'

  const principales: Enlace[] = [
    { a: '/', texto: 'Inicio', icono: House, exacto: true },
    { a: '/escapadas', texto: 'Escapadas', icono: MapPinned },
    { a: rutaCompra, texto: 'Compra', icono: ShoppingCart },
    { a: '/despensa', texto: 'Despensa', icono: Archive },
  ]

  const secundarios: Enlace[] = [
    { a: '/lista-maestra', texto: 'Lista maestra', icono: ListChecks },
    { a: '/historial', texto: 'Historial', icono: BarChart3 },
    { a: '/perfil', texto: 'Mi perfil', icono: UserRound },
    { a: '/ajustes', texto: 'Ajustes', icono: Settings },
  ]

  const compraActiva = location.pathname.includes('/compra')

  // La foto del perfil manda; si no se ha puesto ninguna, vale la del integrante
  // con el que esté vinculada la cuenta.
  const miFoto = perfil?.avatar_url ?? miembros.find((m) => m.id === perfil?.member_id)?.avatar_url ?? null
  const miNombre = perfil?.display_name || perfil?.email || ''

  return (
    <div className="min-h-dvh lg:flex">
      {/* ---------- Barra lateral (escritorio) ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-arena bg-white/70 px-4 py-6 backdrop-blur lg:flex">
        <Link to="/" className="mb-6 px-2">
          <Marca />
        </Link>
        {[...principales, ...secundarios].map((e) => (
          <EnlaceLateral key={e.a + e.texto} enlace={e} />
        ))}
        <div className="mt-auto rounded-2xl bg-beige p-3">
          <Link
            to="/perfil"
            title="Mi perfil"
            className="-m-1.5 flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-white/70"
          >
            <Avatar src={miFoto} nombre={miNombre} tamanyo="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-bosque-800">{miNombre}</span>
              <span className="block truncate text-xs text-carbon/55">
                {esAdmin ? 'Administrador' : 'Integrante'}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-carbon/30" />
          </Link>
          <button
            type="button"
            onClick={() => void salir()}
            className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-tierra-600 hover:underline"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- Cabecera (móvil) ---------- */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-arena bg-crema/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Link to="/">
            <Marca />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/perfil" aria-label="Mi perfil" className="active:scale-95">
              <Avatar src={miFoto} nombre={miNombre} tamanyo="sm" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="inline-flex size-10 items-center justify-center rounded-2xl border border-arena bg-white text-bosque-700 active:scale-95"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>

        {/* ---------- Navegación inferior (móvil) ---------- */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-arena bg-crema/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-stretch">
            {principales.map((e) => (
              <NavLink
                key={e.texto}
                to={e.a}
                end={e.exacto}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                    (e.texto === 'Compra' ? compraActiva : isActive && !compraActiva)
                    ? 'text-bosque-600'
                    : 'text-carbon/45'
                  }`
                }
              >
                {({ isActive }) => {
                  const activo = e.texto === 'Compra' ? compraActiva : isActive && !compraActiva
                  return (
                    <>
                      <span
                        className={`flex size-9 items-center justify-center rounded-2xl transition ${
                          activo ? 'bg-bosque-100' : ''
                        }`}
                      >
                        <e.icono size={20} strokeWidth={activo ? 2.5 : 2} />
                      </span>
                      {e.texto}
                    </>
                  )
                }}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-carbon/45"
            >
              <span className="flex size-9 items-center justify-center rounded-2xl">
                <Sparkles size={20} />
              </span>
              Más
            </button>
          </div>
        </nav>
      </div>

      {/* ---------- Menú «Más» ---------- */}
      <Modal abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} titulo="Rural69" ancho="sm">
        <div className="space-y-1.5">
          {[...principales, ...secundarios].map((e) => (
            <Link
              key={e.texto}
              to={e.a}
              onClick={() => setMenuAbierto(false)}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 font-semibold text-bosque-800 transition active:scale-[0.98]"
            >
              <e.icono size={20} className="text-bosque-500" />
              <span className="flex-1">{e.texto}</span>
              <ChevronRight size={18} className="text-carbon/30" />
            </Link>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-beige p-4">
          <Link to="/perfil" onClick={() => setMenuAbierto(false)} className="flex items-center gap-3">
            <Avatar src={miFoto} nombre={miNombre} tamanyo="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-bosque-800">{miNombre}</span>
              <span className="block truncate text-sm text-carbon/55">{perfil?.email}</span>
              <span className="mt-0.5 block text-xs font-semibold text-oliva-700">
                {esAdmin ? 'Administrador' : 'Integrante'}
              </span>
            </span>
            <ChevronRight size={18} className="text-carbon/30" />
          </Link>
          <Boton variante="peligro" className="mt-3" ancho onClick={() => void salir()}>
            <LogOut size={16} /> Cerrar sesión
          </Boton>
        </div>

        {/* Aquí sale siempre, aunque se haya cerrado el aviso del panel. */}
        <div className="mt-3">
          <InstalarApp siempre />
        </div>
      </Modal>
    </div>
  )
}

function EnlaceLateral({ enlace }: { enlace: Enlace }) {
  return (
    <NavLink
      to={enlace.a}
      end={enlace.exacto}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive ? 'bg-bosque-600 text-white shadow-sm' : 'text-carbon/70 hover:bg-beige'
        }`
      }
    >
      <enlace.icono size={19} />
      {enlace.texto}
    </NavLink>
  )
}
