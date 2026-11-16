import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Claro, oscuro o lo que diga el móvil.
 *
 * La preferencia se guarda en el navegador, no en Supabase: es de cada
 * aparato. En el móvil apetece oscuro de noche y en el portátil igual no, y
 * además así se aplica antes de que haya sesión (incluso en la pantalla de
 * acceso) y sin esperar a la red.
 *
 * En el HTML queda escrito el tema ya resuelto (`data-tema="claro" | "oscuro"`),
 * nunca «sistema»: el CSS solo tiene que mirar un atributo. Quien lo escribe
 * por primera vez es el script de index.html, antes del primer pintado, para
 * que no se vea un fogonazo blanco al abrir la aplicación en oscuro.
 */
export type Preferencia = 'claro' | 'oscuro' | 'sistema'
export type Resuelto = 'claro' | 'oscuro'

const CLAVE = 'rural69-tema'

/** El color de la barra del navegador y de la del móvil cuando está instalada. */
const COLOR_BARRA: Record<Resuelto, string> = { claro: '#2f5d42', oscuro: '#13160f' }

function esPreferencia(valor: unknown): valor is Preferencia {
  return valor === 'claro' || valor === 'oscuro' || valor === 'sistema'
}

/** En modo privado o con las cookies bloqueadas, `localStorage` revienta. */
function leeGuardada(): Preferencia {
  try {
    const valor = localStorage.getItem(CLAVE)
    if (esPreferencia(valor)) return valor
  } catch {
    /* sin almacenamiento: vale el automático */
  }
  return 'sistema'
}

function guarda(preferencia: Preferencia) {
  try {
    localStorage.setItem(CLAVE, preferencia)
  } catch {
    /* no se puede recordar; al menos funciona en esta sesión */
  }
}

function prefiereOscuro(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resuelve(preferencia: Preferencia): Resuelto {
  if (preferencia === 'sistema') return prefiereOscuro() ? 'oscuro' : 'claro'
  return preferencia
}

function aplica(resuelto: Resuelto) {
  document.documentElement.dataset.tema = resuelto
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[resuelto])
}

interface ContextoTema {
  /** Lo que ha elegido la persona: puede ser «sistema». */
  preferencia: Preferencia
  /** Lo que se está viendo de verdad ahora mismo. */
  resuelto: Resuelto
  cambiar: (preferencia: Preferencia) => void
}

const Contexto = createContext<ContextoTema | null>(null)

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [preferencia, setPreferencia] = useState<Preferencia>(leeGuardada)
  const [sistemaOscuro, setSistemaOscuro] = useState<boolean>(prefiereOscuro)

  // El tema que se ve se calcula al pintar, no se guarda en otro estado: así
  // no hay dos sitios que puedan decir cosas distintas.
  const resuelto: Resuelto = preferencia === 'sistema' ? (sistemaOscuro ? 'oscuro' : 'claro') : preferencia

  // Lo único que hace falta sincronizar con el exterior es el HTML.
  useEffect(() => {
    aplica(resuelto)
  }, [resuelto])

  // Y seguir al sistema mientras la app está abierta: si el móvil se pone en
  // oscuro al atardecer, la aplicación va detrás (si está en «automático»).
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const alCambiar = () => setSistemaOscuro(consulta.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  const cambiar = useCallback((nueva: Preferencia) => {
    guarda(nueva)
    setPreferencia(nueva)
  }, [])

  const valor = useMemo<ContextoTema>(() => ({ preferencia, resuelto, cambiar }), [preferencia, resuelto, cambiar])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTema(): ContextoTema {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useTema debe usarse dentro de <TemaProvider>')
  return ctx
}
