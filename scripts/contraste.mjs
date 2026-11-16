#!/usr/bin/env node
// =====================================================================
// Rural69 · Medidor de contraste
// ---------------------------------------------------------------------
// Repasa los pares de color que de verdad se usan en la interfaz, en los
// dos temas, y falla si alguno baja del mínimo que pide WCAG:
//
//   · 4,5:1  texto normal                      (1.4.3 Contraste mínimo)
//   · 3,0:1  iconos y bordes de controles      (1.4.11 Contraste no textual)
//
// Los valores NO están escritos aquí: se leen de `src/index.css`, así que
// si alguien cambia un token, esto se entera. Lo que sí está escrito aquí
// es qué va encima de qué, que es lo que el CSS no puede saber.
//
//   node scripts/contraste.mjs
// =====================================================================

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(raiz, 'src/index.css'), 'utf8')

// ---------------------------------------------------------------------
// Leer los tokens del CSS
// ---------------------------------------------------------------------

/** Saca el cuerpo de un bloque equilibrando las llaves. */
function bloque(texto, inicio) {
  const desde = texto.indexOf(inicio)
  if (desde === -1) throw new Error(`No encuentro el bloque ${inicio}`)
  let i = texto.indexOf('{', desde)
  let nivel = 0
  for (let j = i; j < texto.length; j++) {
    if (texto[j] === '{') nivel++
    else if (texto[j] === '}' && --nivel === 0) return texto.slice(i + 1, j)
  }
  throw new Error(`El bloque ${inicio} no se cierra`)
}

function colores(cuerpo) {
  const encontrados = {}
  for (const [, nombre, valor] of cuerpo.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    encontrados[nombre] = valor
  }
  return encontrados
}

const claro = colores(bloque(css, '@theme'))
// En oscuro solo se redeclara lo que cambia; el resto lo hereda del claro.
const oscuro = { ...claro, ...colores(bloque(css, ":root[data-tema='oscuro']")) }

// Tailwind trae `white` y `black` de su propio tema.
claro.white ??= '#ffffff'
claro.black ??= '#000000'
oscuro.white ??= '#ffffff'

// ---------------------------------------------------------------------
// Contraste (WCAG 2.x)
// ---------------------------------------------------------------------

function aRGB(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

function luminancia(hex) {
  const [r, g, b] = aRGB(hex).map((v) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// ---------------------------------------------------------------------
// Qué va encima de qué
// ---------------------------------------------------------------------
const TEXTO = 4.5
const INTERFAZ = 3.0
const ADORNO = 1.2

const PARES = [
  ['texto principal · tarjeta', 'carbon', 'superficie', TEXTO],
  ['texto principal · página', 'carbon', 'crema', TEXTO],
  ['texto principal · panel beige', 'carbon', 'beige', TEXTO],
  ['texto secundario · tarjeta', 'tenue', 'superficie', TEXTO],
  ['texto secundario · panel beige', 'tenue', 'beige', TEXTO],
  ['rótulos y metadatos · tarjeta', 'suave', 'superficie', TEXTO],
  ['rótulos y metadatos · página', 'suave', 'crema', TEXTO],
  ['rótulos y metadatos · panel beige', 'suave', 'beige', TEXTO],
  ['borde del campo · tarjeta', 'borde-campo', 'superficie', INTERFAZ],
  ['borde del campo · página', 'borde-campo', 'crema', INTERFAZ],
  ['borde del campo · panel beige', 'borde-campo', 'beige', INTERFAZ],
  ['titulares · tarjeta', 'bosque-800', 'superficie', TEXTO],
  ['enlaces y rótulos verdes · tarjeta', 'bosque-700', 'superficie', TEXTO],
  ['verde medio · tarjeta', 'bosque-600', 'superficie', TEXTO],
  ['iconos verdes · tarjeta', 'bosque-500', 'superficie', INTERFAZ],
  ['etiqueta bosque', 'bosque-700', 'bosque-50', TEXTO],
  ['pastilla activa del menú', 'bosque-700', 'bosque-100', TEXTO],
  ['etiqueta oliva', 'oliva-700', 'oliva-100', TEXTO],
  ['categoría bebidas', 'oliva-700', 'oliva-200', TEXTO],
  ['etiqueta tierra', 'tierra-700', 'tierra-100', TEXTO],
  ['avisos en tierra · tarjeta', 'tierra-600', 'superficie', TEXTO],
  ['botón primario', 'tinta-fuerte', 'bosque-600', TEXTO],
  ['botón primario · hover', 'tinta-fuerte', 'bosque-700', TEXTO],
  ['botón de acento', 'tinta-fuerte', 'tierra-600', TEXTO],
  ['botón de acento · hover', 'tinta-fuerte', 'tierra-700', TEXTO],
  ['aviso informativo sobre el velo', 'white', 'velo', TEXTO],
  ['separador (adorno)', 'arena', 'superficie', ADORNO],
]

// ---------------------------------------------------------------------
let fallos = 0

for (const [nombre, tema] of [
  ['CLARO', claro],
  ['OSCURO', oscuro],
]) {
  console.log(`\n===== ${nombre} =====`)
  let malos = 0
  for (const [desc, frente, fondo, minimo] of PARES) {
    if (!tema[frente] || !tema[fondo]) {
      console.log(`  ???   falta el token ${!tema[frente] ? frente : fondo}  ·  ${desc}`)
      malos++
      continue
    }
    const r = contraste(tema[frente], tema[fondo])
    const bien = r >= minimo
    if (!bien) malos++
    const marca = bien ? 'ok  ' : 'BAJO'
    console.log(`  ${marca} ${r.toFixed(2).padStart(5)}:1  (mín. ${minimo.toFixed(1)})  ${desc}`)
  }
  console.log(`  → ${malos === 0 ? 'todo cumple' : `${malos} por debajo del mínimo`}`)
  fallos += malos
}

console.log(
  fallos === 0
    ? `\n${PARES.length * 2} pares comprobados, todos cumplen.\n`
    : `\n${fallos} pares por debajo del mínimo.\n`,
)
process.exit(fallos === 0 ? 0 : 1)
