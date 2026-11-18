// =====================================================================
// Rural69 · Lo que queda por mandar
// ---------------------------------------------------------------------
// La otra mitad de funcionar sin cobertura. Mirar la lista guardada está
// bien, pero en el supermercado del pueblo —o en la cocina de la casa—
// lo que se hace es MARCAR: esto ya está comprado, esto lo llevo yo.
//
// Esos cambios no se pueden perder porque en ese momento no haya línea,
// así que se apuntan aquí y se mandan cuando vuelve. La pantalla ya los
// enseña aplicados desde el primer momento (lo hacía antes de esto, para
// que los más y los menos no esperasen al servidor), de modo que la cola
// es invisible mientras funciona.
//
// Qué se encola y qué no, a propósito:
//
//   · Se encolan los RETOQUES: marcar comprado, cambiar una cantidad,
//     decir quién lleva una cosa. Son los que se hacen allí, tienen la
//     fila ya creada y se pueden repetir sin estropear nada.
//   · No se encola crear ni borrar. Crear sin conexión obliga a
//     inventarse un identificador y a fingir una fila que todavía no
//     existe, y eso trae más problemas de los que resuelve. Esas
//     acciones dicen que hace falta conexión y se acabó.
//
// Si al mandar algo el servidor contesta que no —una fila que ya no
// existe, un permiso—, ese encargo se tira: dejarlo atascaría todos los
// que vengan detrás. Si lo que falla es la red, se queda y se reintenta.
// =====================================================================

import { esFalloDeRed, supabase } from './supabase'

const CLAVE = 'rural69-cola'

export interface Encargo {
  id: string
  tabla: string
  /** Qué fila: siempre por identificador, que es lo único estable. */
  filaId: string
  campos: Record<string, unknown>
  cuando: number
}

/** Avisa de que la cola ha cambiado (para pintar «1 cambio por mandar»). */
export const EVENTO_COLA = 'rural69:cola'
/** Avisa de que se ha vaciado: quien tenga datos en pantalla, que los relea. */
export const EVENTO_SINCRONIZADO = 'rural69:sincronizado'

function avisa(nombre: string) {
  window.dispatchEvent(new CustomEvent(nombre))
}

export function pendientes(): Encargo[] {
  try {
    const texto = localStorage.getItem(CLAVE)
    const lista = texto ? (JSON.parse(texto) as Encargo[]) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function escribe(lista: Encargo[]) {
  try {
    if (lista.length === 0) localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, JSON.stringify(lista))
  } catch {
    /* sin almacenamiento: el cambio se pierde si se cierra la pestaña */
  }
  avisa(EVENTO_COLA)
}

/**
 * Apunta un retoque para mandarlo cuando haya red.
 *
 * Si ya había uno para la misma fila, se funden en vez de apilarse: lo que
 * importa es cómo tiene que quedar la fila, no cuántas veces se tocó el
 * botón. Así, marcar y desmarcar cinco veces manda una sola cosa.
 */
export function encola(tabla: string, filaId: string, campos: Record<string, unknown>): void {
  const lista = pendientes()
  const previo = lista.find((e) => e.tabla === tabla && e.filaId === filaId)
  if (previo) {
    previo.campos = { ...previo.campos, ...campos }
    previo.cuando = Date.now()
  } else {
    lista.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tabla,
      filaId,
      campos,
      cuando: Date.now(),
    })
  }
  escribe(lista)
}

let enviando = false

/** Manda lo que haya. Devuelve cuántos salieron y cuántos se tiraron. */
export async function envia(): Promise<{ hechos: number; tirados: number; quedan: number }> {
  if (enviando) return { hechos: 0, tirados: 0, quedan: pendientes().length }
  enviando = true
  let hechos = 0
  let tirados = 0
  try {
    let lista = pendientes()
    while (lista.length > 0) {
      const encargo = lista[0]
      const { error } = await supabase.from(encargo.tabla).update(encargo.campos).eq('id', encargo.filaId)
      if (error) {
        if (esFalloDeRed(error)) break // Sigue sin red: lo dejamos para luego.
        console.error('Rural69: un cambio pendiente no se ha podido mandar', encargo, error)
        tirados++
      } else {
        hechos++
      }
      lista = pendientes().filter((e) => e.id !== encargo.id)
      escribe(lista)
    }
    if (hechos > 0 || tirados > 0) avisa(EVENTO_SINCRONIZADO)
    return { hechos, tirados, quedan: lista.length }
  } finally {
    enviando = false
  }
}

export function vaciaCola(): void {
  escribe([])
}
