import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  ChefHat,
  ChevronRight,
  CloudOff,
  Dices,
  House,
  ListChecks,
  LogOut,
  MapPinned,
  Menu,
  RefreshCw,
  Settings,
  ShoppingCart,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Marca } from './Logo'
import { InstalarApp } from './InstalarApp'
import { BotonAvisos } from './Avisos'
import { useConexion } from '../../hooks/useConexion'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import { useGrupo } from '../../hooks/useGrupo'
import { useAvisos } from '../../hooks/useAvisos'
import { Modal } from '../ui/Modal'
import { Boton } from '../ui/Boton'

interface Enlace {
  a: string
  texto: string
  icono: typeof House
  exacto?: boolean
  /** Se ejecuta además de navegar. Lo usa «Compra» cuando no hay escapada. */
  alPulsar?: () => void
}

/**
 * Qué enlace se enciende. No vale el `isActive` de NavLink porque «Compra» no
 * es una sección propia: apunta a una pestaña de dentro de la escapada. Sin
 * este matiz se encienden dos a la vez, y pasaba en la barra lateral:
 *
 *   · en la compra de una escapada, `/escapadas/<id>/compra` empieza por
 *     `/escapadas`, así que se encendían «Escapadas» y «Compra»;
 *   · y mientras no hay ninguna escapada creada, «Compra» apunta también a la
 *     lista, así que las dos se encendían siempre.
 *
 * Vive aquí, fuera de las dos barras, para que no vuelvan a desincronizarse.
 */
function estaActivo(enlace: Enlace, ruta: string, compraActiva: boolean): boolean {
  if (enlace.texto === 'Compra') return compraActiva
  if (enlace.exacto) return ruta === enlace.a
  // Por tramos: `/escapadas` no debe encenderse con una hipotética
  // `/escapadas-archivadas`.
  const dentro = ruta === enlace.a || ruta.startsWith(`${enlace.a}/`)
  return dentro && !compraActiva
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { perfil, salir, esAdmin } = useAuth()
  const { escapadaActiva, miembros } = useGrupo()
  const avisos = useAvisos()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  const rutaCompra = escapadaActiva ? `/escapadas/${escapadaActiva.id}/compra` : '/escapadas'

  // Sin escapada no hay lista de la compra que enseñar, así que «Compra»
  // lleva a la lista de escapadas. Dicho así parece que el botón no hace
  // nada, de modo que lo explicamos al pulsarlo.
  const avisaSinEscapada = escapadaActiva
    ? undefined
    : () =>
        avisos.info(
          esAdmin
            ? 'Todavía no hay ninguna escapada. Crea la primera y aquí saldrá su lista de la compra.'
            : 'Todavía no hay ninguna escapada. Cuando el administrador cree la próxima, aquí saldrá su lista de la compra.',
        )

  const principales: Enlace[] = [
    { a: '/', texto: 'Inicio', icono: House, exacto: true },
    { a: '/escapadas', texto: 'Escapadas', icono: MapPinned },
    { a: rutaCompra, texto: 'Compra', icono: ShoppingCart, alPulsar: avisaSinEscapada },
    { a: '/despensa', texto: 'Despensa', icono: Archive },
  ]

  const secundarios: Enlace[] = [
    { a: '/lista-maestra', texto: 'Lista maestra', icono: ListChecks },
    { a: '/recetario', texto: 'Recetario', icono: ChefHat },
    { a: '/juegos', texto: 'Juegos', icono: Dices },
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
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-arena bg-superficie/70 px-4 py-6 backdrop-blur lg:flex">
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <Link to="/">
            <Marca />
          </Link>
          <BotonAvisos />
        </div>
        {[...principales, ...secundarios].map((e) => (
          <EnlaceLateral
            key={e.a + e.texto}
            enlace={e}
            activo={estaActivo(e, location.pathname, compraActiva)}
          />
        ))}
        <div className="mt-auto rounded-2xl bg-beige p-3">
          <Link
            to="/perfil"
            title="Mi perfil"
            className="-m-1.5 flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-superficie/70"
          >
            <Avatar src={miFoto} nombre={miNombre} tamanyo="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-bosque-800">{miNombre}</span>
              <span className="block truncate text-xs text-suave">
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
            <BotonAvisos />
            <Link to="/perfil" aria-label="Mi perfil" className="active:scale-95">
              <Avatar src={miFoto} nombre={miNombre} tamanyo="sm" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="inline-flex size-10 items-center justify-center rounded-2xl border border-arena bg-superficie text-bosque-700 active:scale-95"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        <TiraSinConexion />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>

        {/* ---------- Navegación inferior (móvil) ---------- */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-arena bg-crema/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-stretch">
            {principales.map((e) => (
              <NavLink
                key={e.texto}
                to={e.a}
                end={e.exacto}
                onClick={e.alPulsar}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                  estaActivo(e, location.pathname, compraActiva) ? 'text-bosque-600' : 'text-suave'
                }`}
              >
                {() => {
                  const activo = estaActivo(e, location.pathname, compraActiva)
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
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-suave"
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
              onClick={() => {
                setMenuAbierto(false)
                e.alPulsar?.()
              }}
              className="flex items-center gap-3 rounded-2xl bg-superficie px-4 py-3 font-semibold text-bosque-800 transition active:scale-[0.98]"
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
              <span className="block truncate text-sm text-suave">{perfil?.email}</span>
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

function EnlaceLateral({ enlace, activo }: { enlace: Enlace; activo: boolean }) {
  return (
    <NavLink
      to={enlace.a}
      end={enlace.exacto}
      onClick={enlace.alPulsar}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
        activo ? 'bg-bosque-600 text-tinta-fuerte shadow-sm' : 'text-tenue hover:bg-beige'
      }`}
    >
      <enlace.icono size={19} />
      {enlace.texto}
    </NavLink>
  )
}

/**
 * La tira de arriba cuando no hay red.
 *
 * Sin ella, la aplicación sin cobertura parece rota: las listas salen
 * (están guardadas en el aparato) pero no cambia nada y uno no sabe si es
 * que no se ha guardado o es que no hay línea. Y si hay retoques esperando,
 * decirlo es lo que permite guardar el móvil tranquilo.
 */
function TiraSinConexion() {
  const { enLinea, porMandar, mandando, manda } = useConexion()
  if (enLinea && porMandar === 0) return null

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${
        enLinea ? 'bg-oliva-100 text-oliva-700' : 'bg-tierra-100 text-tierra-700'
      }`}
    >
      {enLinea ? <RefreshCw size={14} className={mandando ? 'animate-spin' : ''} /> : <CloudOff size={14} />}
      <span className="flex-1">
        {enLinea
          ? `${porMandar} ${porMandar === 1 ? 'cambio' : 'cambios'} por mandar`
          : porMandar > 0
            ? `Sin conexión · ${porMandar} ${porMandar === 1 ? 'cambio guardado aquí' : 'cambios guardados aquí'}`
            : 'Sin conexión · estás viendo lo último que se guardó'}
      </span>
      {enLinea && !mandando && (
        <button type="button" onClick={() => void manda()} className="underline underline-offset-2">
          Mandar ahora
        </button>
      )}
    </div>
  )
}
