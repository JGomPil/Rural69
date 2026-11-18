// =====================================================================
// Rural69 · Qué falta por hacer en la escapada
// ---------------------------------------------------------------------
// La organización de una escapada es una cola de tareas que el grupo se
// pasa de mano en mano: proponer findes, votarlos, buscar casa, votarla,
// hacer la lista, repartir el equipaje. El panel sabía decir cuántas
// casas había propuestas, pero no lo único que de verdad importa al
// abrir la aplicación: **qué toca hacer ahora, y si me toca a mí**.
//
// Aquí se decide eso, aparte de la pantalla, por dos razones: son reglas
// con bastantes casos (y así se leen de un tirón), y no dependen de React
// para nada.
//
// Dos cosas a propósito:
//
//  · Lo tuyo va primero. «Te falta votar» se puede resolver ahora mismo;
//    «faltan tres por votar» no, por mucho que importe.
//  · No se avisa de lo que todavía no toca. Nada de «nadie ha propuesto
//    casa» sin fechas decididas: buscar casa antes del finde es trabajo
//    doble, y la propia pestaña de casas ya lo dice.
// =====================================================================

import { diasHasta } from './formato'
import type { Trip } from './types'

/** De quién es la tarea: mía, del grupo o de quien administra. */
export type DeQuien = 'tuyo' | 'grupo' | 'admin'

export interface Pendiente {
  id: string
  texto: string
  detalle?: string
  /** Ruta de la aplicación donde se resuelve. */
  a: string
  dequien: DeQuien
}

export interface EstadoOrganizacion {
  escapada: Trip
  esAdmin: boolean
  /** Personas con cuenta: el denominador de las votaciones. */
  conCuenta: number
  opcionesDeFecha: number
  hanVotadoFechas: number
  heVotadoFechas: boolean
  casas: number
  hanVotadoCasa: number
  heVotadoCasa: boolean
  /** Alguien de mi casa (yo, mi pareja, mis niños) sin contestar si viene. */
  meFaltaContestar: boolean
  /** Gente de fuera de mi casa que todavía no ha dicho si viene. */
  sinContestarOtros: number
  compraTotal: number
  compraPorComprar: number
  equipajeSinDuenyo: number
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`
}

export function queFalta(e: EstadoOrganizacion): Pendiente[] {
  const t = e.escapada
  const base = `/escapadas/${t.id}`
  const mias: Pendiente[] = []
  const grupo: Pendiente[] = []

  // Una escapada ya pasada o archivada no tiene nada pendiente.
  if (t.status === 'realizada' || t.status === 'archivada') return []

  const hayFechas = Boolean(t.start_date)
  const dias = diasHasta(t.start_date)
  const faltanFechas = Math.max(0, e.conCuenta - e.hanVotadoFechas)
  const faltanCasa = Math.max(0, e.conCuenta - e.hanVotadoCasa)

  // ---------------- Fechas ----------------
  if (!hayFechas) {
    if (e.opcionesDeFecha === 0) {
      grupo.push({
        id: 'fechas-vacias',
        texto: 'Nadie ha propuesto fechas todavía',
        detalle: 'Es lo primero: el finde manda sobre todo lo demás.',
        a: `${base}/fechas`,
        dequien: 'grupo',
      })
    } else if (t.dates_voting_open && !e.heVotadoFechas) {
      mias.push({
        id: 'votar-fechas',
        texto: 'Te falta votar las fechas',
        detalle: `Hay ${plural(e.opcionesDeFecha, 'finde propuesto', 'findes propuestos')}. Vota todos los que te valgan.`,
        a: `${base}/fechas`,
        dequien: 'tuyo',
      })
      if (faltanFechas > 1) {
        grupo.push({
          id: 'faltan-fechas',
          texto: `Faltáis ${faltanFechas} por votar las fechas`,
          a: `${base}/fechas`,
          dequien: 'grupo',
        })
      }
    } else if (t.dates_voting_open && faltanFechas > 0) {
      grupo.push({
        id: 'faltan-fechas',
        texto: `${plural(faltanFechas, 'persona', 'personas')} por votar las fechas`,
        detalle: 'Hasta que voten, el finde no se puede cerrar.',
        a: `${base}/fechas`,
        dequien: 'grupo',
      })
    } else if (e.esAdmin) {
      grupo.push({
        id: 'fijar-fechas',
        texto: 'Falta fijar las fechas elegidas',
        detalle: t.dates_voting_open
          ? 'Ya ha votado todo el mundo: marca las ganadoras y a buscar casa.'
          : 'La votación está cerrada pero la escapada sigue sin fechas.',
        a: `${base}/fechas`,
        dequien: 'admin',
      })
    }
  }

  // ---------------- Casas ----------------
  if (!t.chosen_house_id) {
    if (e.casas === 0) {
      // Sin fechas todavía no toca: la mitad de las casas estarán ocupadas.
      if (hayFechas) {
        grupo.push({
          id: 'casas-vacias',
          texto: 'Nadie ha propuesto casa todavía',
          detalle: 'Ya hay fechas: toca buscar casas libres ese finde.',
          a: `${base}/casas`,
          dequien: 'grupo',
        })
      }
    } else if (t.voting_open && !e.heVotadoCasa) {
      mias.push({
        id: 'votar-casa',
        texto: 'Te falta votar la casa',
        detalle: `Hay ${plural(e.casas, 'casa propuesta', 'casas propuestas')}. Vota todas las que te valgan.`,
        a: `${base}/casas`,
        dequien: 'tuyo',
      })
      if (faltanCasa > 1) {
        grupo.push({
          id: 'faltan-casa',
          texto: `Faltáis ${faltanCasa} por votar la casa`,
          a: `${base}/votacion`,
          dequien: 'grupo',
        })
      }
    } else if (t.voting_open && faltanCasa > 0) {
      grupo.push({
        id: 'faltan-casa',
        texto: `${plural(faltanCasa, 'persona', 'personas')} por votar la casa`,
        a: `${base}/votacion`,
        dequien: 'grupo',
      })
    } else if (e.esAdmin) {
      grupo.push({
        id: 'marcar-casa',
        texto: 'Falta marcar la casa elegida',
        detalle: t.voting_open
          ? 'Ya ha votado todo el mundo: cierra la votación y marca la ganadora.'
          : 'La votación está cerrada y ninguna casa es la elegida.',
        a: `${base}/votacion`,
        dequien: 'admin',
      })
    }
  }

  // ---------------- Quién viene ----------------
  // Solo cuando ya hay fechas: preguntar «¿vienes?» sin saber qué finde es
  // no tiene respuesta posible.
  if (hayFechas) {
    if (e.meFaltaContestar) {
      mias.push({
        id: 'contestar',
        texto: 'No has dicho si vienes',
        detalle: 'De las respuestas salen las cantidades de la compra y el precio por adulto.',
        a: base,
        dequien: 'tuyo',
      })
    }
    if (e.sinContestarOtros > 0) {
      grupo.push({
        id: 'sin-contestar',
        texto: `${plural(e.sinContestarOtros, 'persona', 'personas')} sin decir si vienen`,
        a: base,
        dequien: 'grupo',
      })
    }
  }

  // ---------------- Compra y equipaje ----------------
  // Solo cuando ya hay casa o ya hay fecha cerca: antes de eso es ruido.
  const tocaPreparar = Boolean(t.chosen_house_id) || (dias !== null && dias <= 21)

  if (tocaPreparar && e.compraTotal === 0) {
    grupo.push({
      id: 'compra-vacia',
      texto: 'La lista de la compra está vacía',
      detalle: 'Se genera de un tirón desde la lista maestra del grupo.',
      a: `${base}/compra`,
      dequien: 'grupo',
    })
  }

  if (tocaPreparar && e.equipajeSinDuenyo > 0) {
    grupo.push({
      id: 'equipaje',
      texto: `${plural(e.equipajeSinDuenyo, 'cosa', 'cosas')} del equipaje que no lleva nadie`,
      detalle: 'Los sacos y el altavoz no aparecen allí por su cuenta.',
      a: `${base}/equipaje`,
      dequien: 'grupo',
    })
  }

  // La última semana sí interesa cuánto queda por comprar.
  if (dias !== null && dias >= 0 && dias <= 7 && e.compraPorComprar > 0) {
    grupo.push({
      id: 'compra-pendiente',
      texto: `${plural(e.compraPorComprar, 'producto', 'productos')} sin comprar`,
      detalle: dias <= 2 ? '¡Y la escapada es ya!' : `Quedan ${dias} días.`,
      a: `${base}/compra`,
      dequien: 'grupo',
    })
  }

  return [...mias, ...grupo]
}
