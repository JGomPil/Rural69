// =====================================================================
// El puerto del movimiento, contra el original
// ---------------------------------------------------------------------
// El tablero del Trivial no se inventó aquí: viene del `server.py` de
// `trivialrural`, y traducir a mano 150 líneas de aritmética de anillos
// y corredores es justo el sitio donde se cuela un `+1` y nadie se
// entera hasta que alguien cae donde no tocaba una noche de agosto.
//
// Así que no se comprueba «que parezca bien»: se comprueba contra el
// original. El archivo de al lado es el volcado de `compute_dirs()`
// para LAS 276 combinaciones posibles de casilla y dado, sacado
// ejecutando el Python de verdad. Si algún día se toca el movimiento,
// esto avisa.
// =====================================================================

import { describe, it, expect } from 'vitest'
import { destinosDe } from './trivial'
import original from '../../pruebas/datos/movimiento-trivialrural.json'

const casos = original as Record<string, Record<string, number[]>>

describe('el movimiento del tablero', () => {
  it('da exactamente lo mismo que el trivialrural original, en los 276 casos', () => {
    const distintos: string[] = []
    for (const [clave, esperado] of Object.entries(casos)) {
      const [pos, dado] = clave.split(':').map(Number)
      const mio = Object.fromEntries(
        destinosDe(pos, dado)
          .map((d) => [d.clave, d.camino] as const)
          .sort((a, b) => a[0].localeCompare(b[0])),
      )
      if (JSON.stringify(mio) !== JSON.stringify(esperado)) {
        distintos.push(`${clave}: python ${JSON.stringify(esperado)} · aquí ${JSON.stringify(mio)}`)
      }
    }
    expect(distintos).toEqual([])
  })

  it('son 276 casos, no vaya a pasar la prueba con el archivo vacío', () => {
    expect(Object.keys(casos)).toHaveLength(276)
  })
})
