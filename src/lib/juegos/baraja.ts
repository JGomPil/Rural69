// =====================================================================
// Rural69 · Juegos · La baraja del Trivial
// ---------------------------------------------------------------------
// Dos montones que se juegan como uno solo:
//
//   · Las 1.523 de serie, las del `trivialrural`, en un .json que pesa
//     184 KB. No va dentro del paquete principal: se carga sola la
//     primera vez que alguien abre el Trivial, y el que entra a mirar
//     la lista de la compra no paga por ellas.
//   · Las que escribimos desde el móvil, que viven en Supabase y
//     pueden crecer en mitad del finde.
//
// Sacar una pregunta tiene que ser instantáneo —pasa dentro de las
// reglas, sin esperas—, así que los dos montones se tienen ya en la
// mano antes de empezar a jugar.
// =====================================================================

import type { CategoriaId, Pregunta, Sacador } from './trivial'

/** `[pregunta, buena, mala, mala, mala]`. Compacto a propósito: son 1.523. */
export type BarajaBase = Record<CategoriaId, string[][]>

export interface PreguntaNuestra {
  id: string
  category: CategoriaId
  question: string
  correct: string
  wrong: string[]
  autor?: string | null
}

let base: BarajaBase | null = null

/** Carga las de serie. La segunda vez no cuesta nada. */
export async function cargaLaBaraja(): Promise<BarajaBase> {
  if (!base) {
    const modulo = await import('./preguntas.json')
    base = (modulo.default ?? modulo) as unknown as BarajaBase
  }
  return base
}

function baraja<T>(cosas: T[], azar: () => number): T[] {
  const copia = [...cosas]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function arma(id: string, categoria: CategoriaId, texto: string, buena: string, malas: string[], azar: () => number, autor?: string | null): Pregunta {
  const opciones = baraja([buena, ...malas], azar)
  return { id, categoria, texto, opciones, buena: opciones.indexOf(buena), ...(autor ? { autor } : {}) }
}

/**
 * Fabrica el sacador de preguntas que usan las reglas.
 *
 * Si se agota una categoría, se vuelve a empezar con ella en vez de
 * dejar la partida sin pregunta: 300 preguntas por categoría no se
 * acaban en una noche, pero en la que se acaben, lo peor que puede
 * pasar es que alguien diga «esta ya la hemos tenido».
 */
export function hazSacador(deSerie: BarajaBase, nuestras: PreguntaNuestra[]): Sacador {
  return (categoria, usadas, azar) => {
    const gastadas = new Set(usadas)
    const todas: Array<() => Pregunta> = []
    const propias: Array<() => Pregunta> = []

    ;(deSerie[categoria] ?? []).forEach((fila, i) => {
      const id = `${categoria}:${i}`
      const hazla = () => arma(id, categoria, fila[0], fila[1], fila.slice(2), azar)
      todas.push(hazla)
      if (!gastadas.has(id)) propias.push(hazla)
    })
    for (const n of nuestras) {
      if (n.category !== categoria) continue
      const id = `db:${n.id}`
      const hazla = () => arma(id, categoria, n.question, n.correct, n.wrong, azar, n.autor)
      todas.push(hazla)
      if (!gastadas.has(id)) propias.push(hazla)
    }

    const monton = propias.length > 0 ? propias : todas
    if (monton.length === 0) return null
    return monton[Math.floor(azar() * monton.length)]()
  }
}

/** Cuántas hay de cada, para poder contarlo en pantalla. */
export function cuentaLaBaraja(deSerie: BarajaBase | null, nuestras: PreguntaNuestra[]) {
  const total = deSerie ? Object.values(deSerie).reduce((n, v) => n + v.length, 0) : 0
  return { deSerie: total, nuestras: nuestras.length, total: total + nuestras.length }
}
