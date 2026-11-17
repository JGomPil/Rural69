import { cuentaAdultosNinos } from './cantidades'
import { euros, noches, rangoFechas } from './formato'
import type { House, Member, Trip } from './types'

interface Resumen {
  escapada: Trip
  participantes: Member[]
  casaElegida: House | null
  casasPropuestas: number
  /** Personas que han votado la casa, no votos: cada cual puede votar varias. */
  hanVotado: number
  compraTotal: number
  compraHechos: number
  enlace: string
}

/**
 * El estado de la escapada en un texto para pegar en el grupo de WhatsApp.
 *
 * La coordinación de verdad pasa allí, no aquí: lo que esta aplicación puede
 * hacer es alimentar esa conversación en vez de competir con ella. Por eso el
 * texto se lee solo, sin entrar a nada, y termina con el enlace para quien
 * quiera el detalle.
 *
 * Los asteriscos son la negrita de WhatsApp. En cualquier otro sitio se ven
 * como asteriscos y tampoco molestan.
 */
export function resumenParaCompartir(d: Resumen): string {
  const { escapada: e } = d
  const lineas: string[] = [`🏕️ *${e.title}*`]

  const n = noches(e.start_date, e.end_date)
  if (e.start_date) {
    lineas.push(`📅 ${rangoFechas(e.start_date, e.end_date)}${n ? ` · ${n} ${n === 1 ? 'noche' : 'noches'}` : ''}`)
  } else {
    lineas.push(e.dates_voting_open ? '📅 Fechas por votar' : '📅 Fechas por decidir')
  }

  if (d.casaElegida) {
    const adultos = d.participantes.filter((m) => !m.is_child).length
    const porAdulto =
      d.casaElegida.total_price && adultos > 0 ? ` (${euros(d.casaElegida.total_price / adultos)} por adulto)` : ''
    const precio = d.casaElegida.total_price ? ` · ${euros(d.casaElegida.total_price)}${porAdulto}` : ''
    lineas.push(`🏡 ${d.casaElegida.name}${precio}`)
  } else if (d.casasPropuestas > 0) {
    lineas.push(`🏡 Casa sin elegir · ${d.casasPropuestas} propuesta${d.casasPropuestas === 1 ? '' : 's'}`)
  }

  if (d.participantes.length > 0) {
    const { adultos, ninos } = cuentaAdultosNinos(d.participantes)
    const quienes = ninos > 0 ? `${adultos} adultos y ${ninos} niños` : `${adultos} adultos`
    lineas.push(`👥 Vamos ${d.participantes.length}: ${quienes}`)
  }

  // Lo que falta por hacer, que es para lo que se pega esto en el grupo.
  const pendiente: string[] = []
  if (e.dates_voting_open) pendiente.push('⏳ Votación de *fechas* abierta')
  if (e.voting_open) {
    pendiente.push(
      `⏳ Votación de *casas* abierta${d.participantes.length > 0 ? ` · han votado ${d.hanVotado} de ${d.participantes.length}` : ''}`,
    )
  }
  if (d.compraTotal > 0) pendiente.push(`🛒 Compra: ${d.compraHechos} de ${d.compraTotal}`)
  if (pendiente.length > 0) lineas.push('', ...pendiente)

  lineas.push('', d.enlace)
  return lineas.join('\n')
}
