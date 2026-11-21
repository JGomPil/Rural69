import { PIEZAS, PORCIONES, sitioDeFicha } from '../../lib/juegos/geometria'
import { CATEGORIAS, CATEGORIA, CENTRO, type Destino, type JugadorT } from '../../lib/juegos/trivial'
import { FICHAS } from './colores'

/**
 * El tablero.
 *
 * Pensado para una pantalla de móvil sujeta con una mano:
 *
 *   · Se estira hasta el ancho que le den y no pixela nunca, porque es
 *     un SVG y no un `canvas` de medidas fijas como el original.
 *   · A donde puedes ir se TOCA. El juego de antes tenía botones de
 *     dirección —«cw», «ccw», «adentro»—, que obligan a traducir en la
 *     cabeza lo que ya estás viendo. Aquí la casilla a la que llegas
 *     late, y la tocas.
 *   · Lo que no se lee en 350 píxeles, no se pinta. Solo llevan icono
 *     las casillas que cambian el turno —quesitos y dados—; las demás
 *     se distinguen por el color, que es como se leen de verdad.
 *   · Las fichas que comparten casilla se ponen en corrillo. Con diez
 *     personas en 46 casillas, compartir es lo normal, y una ficha
 *     tapando a otra es una discusión.
 */
export function TableroTrivial({
  jugadores,
  turno,
  destinos,
  onElige,
}: {
  jugadores: JugadorT[]
  turno: number
  /** Las casillas a las que puede ir quien tiene el turno. Vacío, no se elige nada. */
  destinos: Destino[]
  onElige?: (clave: string) => void
}) {
  const llegadas = new Map<number, string>()
  for (const d of destinos) {
    const fin = d.camino[d.camino.length - 1]
    if (!llegadas.has(fin)) llegadas.set(fin, d.clave)
  }

  const porCasilla = new Map<number, number[]>()
  jugadores.forEach((j, i) => {
    const lista = porCasilla.get(j.pos) ?? []
    lista.push(i)
    porCasilla.set(j.pos, lista)
  })

  return (
    <svg
      viewBox="0 0 100 100"
      className="mx-auto block h-auto w-full select-none"
      role="img"
      aria-label="Tablero del Trivial"
    >
      {/* Las casillas */}
      {PIEZAS.map((pieza) => {
        if (pieza.indice === CENTRO) return null
        const cat = pieza.casilla.cat ? CATEGORIA[pieza.casilla.cat] : null
        const quesito = pieza.casilla.tipo === 'quesito'
        return (
          <path
            key={pieza.indice}
            d={pieza.d}
            fill={quesito ? cat?.color : cat?.suave}
            stroke={cat?.color}
            strokeWidth={quesito ? 0.6 : 0.35}
            opacity={quesito ? 1 : 0.95}
          />
        )
      })}

      {/* El centro, partido en cinco */}
      {PORCIONES.map((d, i) => (
        <path key={i} d={d} fill={CATEGORIAS[i].color} opacity={0.9} />
      ))}
      <circle cx="50" cy="50" r="5.6" fill="#FDFBF6" />
      <text x="50" y="50" textAnchor="middle" dy="0.36em" fontSize="5.4">
        🏆
      </text>

      {/* Los iconos que importan: quesito y vuelve a tirar */}
      {PIEZAS.map((pieza) => {
        if (pieza.casilla.tipo === 'quesito') {
          return (
            <text
              key={`i${pieza.indice}`}
              x={pieza.cx}
              y={pieza.cy}
              textAnchor="middle"
              dy="0.36em"
              fontSize="5"
            >
              {CATEGORIA[pieza.casilla.cat!].emoji}
            </text>
          )
        }
        if (pieza.casilla.tipo === 'dado') {
          return (
            <text
              key={`i${pieza.indice}`}
              x={pieza.cx}
              y={pieza.cy}
              textAnchor="middle"
              dy="0.36em"
              fontSize="4.6"
              opacity="0.75"
            >
              🎲
            </text>
          )
        }
        return null
      })}

      {/* A dónde puedes ir */}
      {[...llegadas.entries()].map(([indice, clave]) => {
        const pieza = PIEZAS[indice]
        return (
          <g key={`d${indice}`} className="cursor-pointer" onClick={() => onElige?.(clave)}>
            <path
              d={pieza.d}
              fill="none"
              stroke="#1B3A2B"
              strokeWidth="1.4"
              className="animate-pulse"
            />
            {/* Un blanco de dedo más grande que la casilla: 44 píxeles de verdad. */}
            <circle cx={pieza.cx} cy={pieza.cy} r="6" fill="transparent" />
          </g>
        )
      })}

      {/* Las fichas */}
      {[...porCasilla.entries()].flatMap(([pos, quienes]) =>
        quienes.map((indice, k) => {
          const [x, y] = sitioDeFicha(PIEZAS[pos], k, quienes.length)
          const esSuTurno = indice === turno
          return (
            <g key={`f${indice}`}>
              {/* El aro del turno. Nada de `animate-ping`: en SVG esa animación
                  escala desde el origen del lienzo y el aro aparece en otro
                  sitio, no alrededor de la ficha. */}
              {esSuTurno && (
                <circle
                  cx={x}
                  cy={y}
                  r="4.3"
                  fill="none"
                  stroke="#1B3A2B"
                  strokeWidth="0.7"
                  strokeDasharray="2 1.4"
                  className="animate-[spin_6s_linear_infinite] [transform-box:fill-box] [transform-origin:center]"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r="3.1"
                fill={FICHAS[indice % FICHAS.length]}
                stroke="#FDFBF6"
                strokeWidth="0.7"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dy="0.35em"
                fontSize="3"
                fontWeight="700"
                fill="#FDFBF6"
              >
                {jugadores[indice].nombre.slice(0, 1).toUpperCase()}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}
