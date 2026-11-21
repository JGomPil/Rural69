// =====================================================================
// Rural69 · Juegos · La forma del tablero
// ---------------------------------------------------------------------
// Dónde se pinta cada una de las 46 casillas. Son cuentas de senos y
// cosenos, y están aquí y no en el componente por una razón práctica:
// así la pantalla solo recorre una lista, y esto se puede mirar —y
// arreglar— sin pelearse con el JSX.
//
// El tablero original se dibujaba en un `canvas` de ordenador. Aquí es
// un SVG que se estira hasta el ancho del móvil: no pixela, no hay que
// redibujarlo al girar el teléfono, y cada casilla es un elemento de
// verdad, así que se puede TOCAR. Eso cambia el juego en el móvil: en
// vez de botones de «izquierda / derecha / adentro», se toca la
// casilla a la que quieres ir.
//
// El sistema de coordenadas es un cuadrado de 100×100 con el centro en
// (50, 50). La casilla 0 está arriba del todo y se avanza en el
// sentido de las agujas del reloj.
// =====================================================================

import { ANILLO, CENTRO, CORREDOR_INICIO, LARGO_CORREDOR, TABLERO, type Casilla } from './trivial'

const CENTRO_X = 50
const CENTRO_Y = 50

/** Radios, de fuera adentro. */
const ANILLO_FUERA = 49
const ANILLO_DENTRO = 37.5
const CORREDOR_FUERA = 35.5
const CORREDOR_DENTRO = 15
const NUCLEO = 13.5

const GRADOS_CASILLA = 360 / ANILLO // 12°
/** Un pelo de aire entre casillas: se ven los bordes sin pintar rayas. */
const AIRE = 0.6

function punto(radio: number, grados: number): [number, number] {
  const rad = ((grados - 90) * Math.PI) / 180
  return [CENTRO_X + radio * Math.cos(rad), CENTRO_Y + radio * Math.sin(rad)]
}

/** Un trozo de corona circular: la forma de todas las casillas menos el centro. */
function trozo(rDentro: number, rFuera: number, desde: number, hasta: number): string {
  const [x1, y1] = punto(rFuera, desde)
  const [x2, y2] = punto(rFuera, hasta)
  const [x3, y3] = punto(rDentro, hasta)
  const [x4, y4] = punto(rDentro, desde)
  const grande = hasta - desde > 180 ? 1 : 0
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rFuera} ${rFuera} 0 ${grande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rDentro} ${rDentro} 0 ${grande} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ')
}

export interface Pieza {
  indice: number
  casilla: Casilla
  /** El contorno, para pintarla. */ d: string
  /** El centro, para poner la ficha o el icono. */ cx: number
  cy: number
  /** Cuánto ocupa de ancho, para no pasarse con el icono. */ tamanyo: number
}

function hazPiezas(): Pieza[] {
  const piezas: Pieza[] = []

  // El anillo: 30 casillas de 12°, la 0 justo arriba.
  for (let i = 0; i < ANILLO; i++) {
    const medio = i * GRADOS_CASILLA
    const desde = medio - GRADOS_CASILLA / 2 + AIRE
    const hasta = medio + GRADOS_CASILLA / 2 - AIRE
    const [cx, cy] = punto((ANILLO_FUERA + ANILLO_DENTRO) / 2, medio)
    piezas.push({
      indice: i,
      casilla: TABLERO[i],
      d: trozo(ANILLO_DENTRO, ANILLO_FUERA, desde, hasta),
      cx,
      cy,
      tamanyo: ANILLO_FUERA - ANILLO_DENTRO,
    })
  }

  // Los cinco corredores, cada uno saliendo de su casilla de quesito.
  const largo = (CORREDOR_FUERA - CORREDOR_DENTRO) / LARGO_CORREDOR
  for (let c = 0; c < 5; c++) {
    const medio = c * 6 * GRADOS_CASILLA
    const desde = medio - GRADOS_CASILLA / 2 + AIRE
    const hasta = medio + GRADOS_CASILLA / 2 - AIRE
    for (let off = 0; off < LARGO_CORREDOR; off++) {
      const rFuera = CORREDOR_FUERA - off * largo
      const rDentro = rFuera - largo + AIRE / 2
      const indice = CORREDOR_INICIO + c * LARGO_CORREDOR + off
      const [cx, cy] = punto((rFuera + rDentro) / 2, medio)
      piezas.push({
        indice,
        casilla: TABLERO[indice],
        d: trozo(rDentro, rFuera, desde, hasta),
        cx,
        cy,
        tamanyo: largo,
      })
    }
  }

  // El centro: un círculo partido en cinco, que se dibuja aparte.
  piezas.push({
    indice: CENTRO,
    casilla: TABLERO[CENTRO],
    d: `M ${CENTRO_X} ${CENTRO_Y - NUCLEO} A ${NUCLEO} ${NUCLEO} 0 1 1 ${CENTRO_X - 0.01} ${
      CENTRO_Y - NUCLEO
    } Z`,
    cx: CENTRO_X,
    cy: CENTRO_Y,
    tamanyo: NUCLEO * 2,
  })

  return piezas
}

export const PIEZAS: Pieza[] = hazPiezas()

/** Las cinco porciones del centro, en el orden de las categorías. */
export const PORCIONES: string[] = Array.from({ length: 5 }, (_, i) => {
  const desde = i * 72 - 36
  const hasta = desde + 72
  const [x1, y1] = punto(NUCLEO, desde)
  const [x2, y2] = punto(NUCLEO, hasta)
  return `M ${CENTRO_X} ${CENTRO_Y} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${NUCLEO} ${NUCLEO} 0 0 1 ${x2.toFixed(
    2,
  )} ${y2.toFixed(2)} Z`
})

/**
 * Dónde va la ficha de alguien que comparte casilla con otros. En
 * corrillo alrededor del centro de la casilla, nunca una encima de
 * otra: con diez personas y 46 casillas, compartir es lo normal.
 */
export function sitioDeFicha(pieza: Pieza, cual: number, cuantos: number): [number, number] {
  if (cuantos <= 1) return [pieza.cx, pieza.cy]
  const radio = Math.min(pieza.tamanyo * 0.26, 3.4)
  const vuelta = (cual / cuantos) * 2 * Math.PI - Math.PI / 2
  return [pieza.cx + radio * Math.cos(vuelta), pieza.cy + radio * Math.sin(vuelta)]
}
