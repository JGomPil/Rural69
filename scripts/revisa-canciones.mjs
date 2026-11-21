#!/usr/bin/env node
// =====================================================================
// Rural69 · Repasar el repertorio de canciones
// ---------------------------------------------------------------------
// El resolutor acierta casi siempre, pero «casi» no basta: la tienda
// devuelve algo para todo y lo que devuelve a veces no es la canción.
// Esto pregunta por los identificadores ya guardados —en dos tandas de
// doscientos, que `lookup` las admite, así que son dos peticiones y no
// trescientas— y saca una tabla para mirarla a ojo, con lo dudoso
// marcado: otro grupo, otro título, un directo colado, el año torcido o
// la previsualización caída.
//
//   node scripts/revisa-canciones.mjs          (solo lo dudoso)
//   node scripts/revisa-canciones.mjs --todas  (las trescientas y pico)
// =====================================================================

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const canciones = JSON.parse(readFileSync(join(AQUI, '..', 'src', 'lib', 'juegos', 'canciones.json'), 'utf8'))

const limpia = (t) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const RARAS = /\blive\b|en vivo|en directo|\(vivo\)|en concierto|\bel concierto\b|remix|club mix|extended|\bdemo\b|acoustic|unplugged|karaoke|tribute|parod|instrumental|re-?recorded/i

const tienda = new Map()
for (let i = 0; i < canciones.length; i += 150) {
  const trozo = canciones.slice(i, i + 150)
  const r = await fetch(`https://itunes.apple.com/lookup?id=${trozo.map((c) => c.id).join(',')}&country=ES`)
  if (!r.ok) {
    console.error(`La tienda no contesta (${r.status}). Prueba dentro de un rato.`)
    process.exit(1)
  }
  const datos = JSON.parse(await r.text())
  for (const x of datos.results ?? []) tienda.set(x.trackId, x)
  await new Promise((s) => setTimeout(s, 2000))
}

const todas = process.argv.includes('--todas')
let dudosas = 0
for (const c of canciones) {
  const t = tienda.get(c.id)
  const avisos = []
  if (!t) avisos.push('LA TIENDA YA NO LA TIENE')
  else {
    const suyo = limpia(t.artistName)
    const mio = limpia(c.artista)
    const pista = limpia((t.trackName ?? '').replace(/\s*[([][^)\]]*[)\]]\s*$/, ''))
    const titulo = limpia(c.titulo)
    if (!(suyo.includes(mio) || mio.includes(suyo))) avisos.push(`otro grupo: ${t.artistName}`)
    if (!(pista === titulo || pista.includes(titulo) || titulo.includes(pista))) avisos.push(`otro título: ${t.trackName}`)
    // Solo lo que va entre paréntesis y el nombre del disco: en el
    // título a secas, «Live Forever» no es un directo.
    const avisos2 = ((t.trackName ?? '').match(/[([][^)\]]*[)\]]/g) ?? []).join(' ')
    if (RARAS.test(avisos2) || RARAS.test(t.collectionName ?? '')) avisos.push('¿versión rara?')
    const anyo = Number((t.releaseDate ?? '').slice(0, 4))
    if (anyo && Math.abs(anyo - c.anyo) > 2) avisos.push(`año en la tienda: ${anyo}`)
    if (!t.previewUrl) avisos.push('sin previsualización')
  }
  if (avisos.length > 0) dudosas++
  if (!todas && avisos.length === 0) continue
  const linea = `${(c.anyo + '').padEnd(5)} ${c.titulo.slice(0, 42).padEnd(43)} ${c.artista.slice(0, 26).padEnd(27)}`
  console.log(avisos.length > 0 ? `⚠ ${linea} · ${avisos.join(' · ')}` : `  ${linea} → ${t.trackName.slice(0, 40)}`)
}
console.log(`\n${canciones.length} canciones · ${dudosas} para mirar`)
