// =====================================================================
// Rural69 · Exportación de datos (CSV y copia de seguridad en JSON)
// =====================================================================

function escapaCSV(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor)
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** CSV con `;` como separador, que es lo que espera Excel en español. */
export function generaCSV(cabeceras: string[], filas: unknown[][]): string {
  const lineas = [cabeceras.join(';'), ...filas.map((f) => f.map(escapaCSV).join(';'))]
  return `﻿${lineas.join('\r\n')}`
}

export function descarga(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function nombreArchivo(base: string, extension: string): string {
  const limpio = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const d = new Date()
  const sello = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${limpio || 'rural69'}-${sello}.${extension}`
}
