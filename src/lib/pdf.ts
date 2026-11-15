import { cantidad } from './formato'

/**
 * Las fuentes que trae jsPDF de serie solo entienden WinAnsi: las tildes y la
 * eñe van bien, pero un emoji sale convertido en garabatos («Ø<ß») y además
 * descoloca el texto que venga detrás. Como incrustar una fuente completa son
 * cientos de kilobytes por un adorno, se quitan y en paz.
 */
function soloLatin1(texto: string): string {
  return texto
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export interface SeccionPDF {
  titulo: string
  subtitulo?: string
  articulos: { name: string; buy_qty: number; unit: string; notes?: string | null; purchased: boolean }[]
}

/**
 * Lista de la compra en PDF, pensada para llevarla al supermercado: una
 * casilla por producto, secciones claras y nada de adornos que gasten tinta.
 *
 * jsPDF se carga solo al pulsar el botón (son unos 350 kB): no tiene sentido
 * que lo descargue todo el mundo al abrir la aplicación.
 */
export async function listaDeCompraEnPDF({
  titulo,
  subtitulo,
  secciones,
  nombreFichero,
}: {
  titulo: string
  subtitulo?: string
  secciones: SeccionPDF[]
  nombreFichero: string
}): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const ANCHO = 210
  const MARGEN = 16
  const PIE = 282
  let y = 0
  let pagina = 0

  const nuevaPagina = () => {
    if (pagina > 0) doc.addPage()
    pagina += 1
    y = MARGEN + 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.setTextColor(27, 55, 39)
    doc.text(soloLatin1(titulo), MARGEN, y)

    if (subtitulo) {
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(120, 112, 102)
      doc.text(soloLatin1(subtitulo), MARGEN, y)
    }

    y += 5
    doc.setDrawColor(231, 220, 196)
    doc.setLineWidth(0.4)
    doc.line(MARGEN, y, ANCHO - MARGEN, y)
    y += 8
  }

  /** Reserva sitio; si no cabe, pasa de página. */
  const sitio = (alto: number) => {
    if (y + alto > PIE) nuevaPagina()
  }

  nuevaPagina()

  for (const seccion of secciones) {
    if (seccion.articulos.length === 0) continue

    sitio(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(47, 93, 66)
    doc.text(soloLatin1(seccion.titulo), MARGEN, y)

    if (seccion.subtitulo) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(140, 132, 122)
      doc.text(soloLatin1(seccion.subtitulo), ANCHO - MARGEN, y, { align: 'right' })
    }
    y += 6

    for (const a of seccion.articulos) {
      sitio(8)

      // Casilla para ir tachando por el pasillo del súper.
      doc.setDrawColor(150, 142, 130)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGEN, y - 3.4, 4, 4, 0.8, 0.8)
      if (a.purchased) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(47, 93, 66)
        doc.text('X', MARGEN + 1.1, y)
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(42, 38, 34)

      const medida = cantidad(a.buy_qty, a.unit)
      const anchoMedida = doc.getTextWidth(medida)
      const anchoTexto = ANCHO - MARGEN * 2 - 8 - anchoMedida - 4

      const lineas = doc.splitTextToSize(soloLatin1(a.name), anchoTexto) as string[]
      doc.text(lineas[0], MARGEN + 7, y)

      doc.setFont('helvetica', 'bold')
      doc.text(medida, ANCHO - MARGEN, y, { align: 'right' })

      for (const extra of lineas.slice(1)) {
        y += 5
        sitio(6)
        doc.setFont('helvetica', 'normal')
        doc.text(extra, MARGEN + 7, y)
      }

      if (a.notes) {
        y += 4.5
        sitio(6)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(140, 132, 122)
        const notas = doc.splitTextToSize(soloLatin1(a.notes), anchoTexto) as string[]
        doc.text(notas[0], MARGEN + 7, y)
      }

      y += 7
    }
    y += 4
  }

  // Numeración, al final, cuando ya se sabe cuántas páginas hay.
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(170, 162, 152)
    doc.text(`Rural69 · ${i} de ${total}`, ANCHO / 2, 290, { align: 'center' })
  }

  doc.save(nombreFichero)
}
