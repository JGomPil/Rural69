// =====================================================================
// Rural69 · Juegos · Trivial de la casa
// ---------------------------------------------------------------------
// Las reglas del `trivialrural` que Javi montó en 2026, traídas aquí.
// El tablero, los caminos del dado y el desafío del centro son los
// suyos: funcionaban, están jugados, y no hay ninguna razón para
// inventarse otros. Lo que cambia es dónde viven.
//
// Allí había un servidor en Python con WebSockets que guardaba la
// partida y se la mandaba a todos. Aquí no hay servidor donde ponerlo
// —esto es un sitio estático—, pero tampoco hace falta: la mesa
// compartida (`sincronia.ts`) hace ese trabajo, y encima sobrevive a
// que se cierre el portátil de quien lo arrancó.
//
// El tablero: 46 casillas. 30 en el anillo (cinco lados de seis), 15
// en los cinco corredores que van al centro, y el centro. En cada lado
// hay una casilla de quesito y una de volver a tirar.
//
// Tres decisiones heredadas que merece la pena explicar:
//
//   · Acertar no da otro turno. En el Trivial de toda la vida sí, y
//     con diez personas eso es una mesa esperando a que uno encadene.
//     Aquí el turno pasa siempre, salvo en la casilla del dado.
//   · Del centro no te puedes quedar a vivir: si el dado te lleva más
//     allá, sales por otro corredor; solo te quedas si caes justo.
//   · Fallar el desafío final cuesta un quesito. Duele, y por eso se
//     avisa antes de entrar.
//
// Una cosa que sí es distinta y conviene saber: la pregunta viaja
// entera en el estado compartido, con la respuesta buena dentro. Quien
// abra las herramientas del navegador puede verla. En una casa con
// amigos eso no es un agujero de seguridad, es alguien haciendo
// trampas, y para eso no hay programa que valga.
// =====================================================================

import { levanta, sienta, sitioDe } from './sillas'
import type { Estado } from './sincronia'

export type CategoriaId = 'cultura' | 'nosotros' | 'animacion' | 'entretenimiento' | 'gastronomia'

export interface Categoria {
  id: CategoriaId
  nombre: string
  emoji: string
  /** Pareja de colores: el fuerte para el relleno, el suave para el fondo. */
  color: string
  suave: string
}

export const CATEGORIAS: Categoria[] = [
  { id: 'cultura', nombre: 'Cultura general', emoji: '📚', color: '#2B4C7E', suave: '#C2D1E6' },
  { id: 'nosotros', nombre: 'Nosotros', emoji: '🥂', color: '#9B2C5B', suave: '#EBC4D4' },
  { id: 'animacion', nombre: 'Animación', emoji: '🎭', color: '#6B3FA0', suave: '#D5C5EC' },
  { id: 'entretenimiento', nombre: 'Entretenimiento', emoji: '🎬', color: '#2F6B3A', suave: '#C4DECB' },
  { id: 'gastronomia', nombre: 'Gastronomía', emoji: '🍴', color: '#C2531C', suave: '#F3CFB4' },
]

export const IDS: CategoriaId[] = CATEGORIAS.map((c) => c.id)
export const CATEGORIA: Record<CategoriaId, Categoria> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.id, c]),
) as Record<CategoriaId, Categoria>

// ── El tablero ───────────────────────────────────────────────────────
export const ANILLO = 30
export const CORREDOR_INICIO = 30
export const LARGO_CORREDOR = 3
export const CENTRO = 45

export type TipoCasilla = 'quesito' | 'normal' | 'dado' | 'centro'
export interface Casilla {
  tipo: TipoCasilla
  cat: CategoriaId | null
}

function construyeTablero(): Casilla[] {
  const casillas: Casilla[] = []
  for (let lado = 0; lado < 5; lado++) {
    casillas.push({ tipo: 'quesito', cat: IDS[lado] })
    casillas.push({ tipo: 'normal', cat: IDS[(lado + 1) % 5] })
    casillas.push({ tipo: 'normal', cat: IDS[(lado + 2) % 5] })
    casillas.push({ tipo: 'dado', cat: IDS[(lado + 3) % 5] })
    casillas.push({ tipo: 'normal', cat: IDS[(lado + 4) % 5] })
    casillas.push({ tipo: 'normal', cat: IDS[lado] })
  }
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < LARGO_CORREDOR; j++) casillas.push({ tipo: 'normal', cat: IDS[i] })
  }
  casillas.push({ tipo: 'centro', cat: null })
  return casillas
}

export const TABLERO: Casilla[] = construyeTablero()

// ── Movimiento ───────────────────────────────────────────────────────
// Puerto directo del `server.py`. Los nombres de las direcciones se
// mantienen (`cw`, `ccw`, `in`…) porque son los que salen en el camino
// y así se puede comparar con el original sin traducir mentalmente.

function porElAnillo(pos: number, pasos: number, sentido: 'cw' | 'ccw'): number[] {
  const camino: number[] = []
  const d = sentido === 'cw' ? 1 : -1
  let p = pos
  for (let i = 0; i < pasos; i++) {
    p = (p + d + ANILLO) % ANILLO
    camino.push(p)
  }
  return camino
}

function haciaDentro(pos: number, pasos: number): number[] {
  const camino: number[] = []
  let p = pos
  for (let i = 0; i < pasos; i++) {
    if (p < ANILLO) {
      if (p % 6 === 0) p = CORREDOR_INICIO + (p / 6) * LARGO_CORREDOR
      else break
    } else if (p < CENTRO) {
      const ci = Math.floor((p - CORREDOR_INICIO) / LARGO_CORREDOR)
      const off = (p - CORREDOR_INICIO) % LARGO_CORREDOR
      const cf = CORREDOR_INICIO + ci * LARGO_CORREDOR
      p = off < LARGO_CORREDOR - 1 ? cf + off + 1 : CENTRO
    } else break
    camino.push(p)
  }
  return camino
}

function haciaFuera(pos: number, pasos: number): number[] {
  const camino: number[] = []
  let p = pos
  for (let i = 0; i < pasos; i++) {
    if (p === CENTRO) break
    else if (p >= CORREDOR_INICIO && p < CENTRO) {
      const ci = Math.floor((p - CORREDOR_INICIO) / LARGO_CORREDOR)
      const off = (p - CORREDOR_INICIO) % LARGO_CORREDOR
      const cf = CORREDOR_INICIO + ci * LARGO_CORREDOR
      p = off > 0 ? cf + off - 1 : ci * 6
    } else if (p < ANILLO) p = (p + 1) % ANILLO
    else break
    camino.push(p)
  }
  return camino
}

function desdeElCentro(pasos: number, corredor: number): number[] {
  const camino: number[] = []
  let p = CENTRO
  for (let i = 0; i < pasos; i++) {
    if (p === CENTRO) p = CORREDOR_INICIO + corredor * LARGO_CORREDOR + (LARGO_CORREDOR - 1)
    else if (p >= CORREDOR_INICIO && p < CENTRO) {
      const ci = Math.floor((p - CORREDOR_INICIO) / LARGO_CORREDOR)
      const off = (p - CORREDOR_INICIO) % LARGO_CORREDOR
      const cf = CORREDOR_INICIO + ci * LARGO_CORREDOR
      p = off > 0 ? cf + off - 1 : ci * 6
    } else if (p < ANILLO) p = (p + 1) % ANILLO
    else break
    camino.push(p)
  }
  return camino
}

function desdeElCentroHacia(pasos: number, corredor: number, sentido: 'cw' | 'ccw'): number[] {
  const hastaElQuesito = LARGO_CORREDOR + 1
  if (pasos <= hastaElQuesito) return desdeElCentro(pasos, corredor)
  return [
    ...desdeElCentro(hastaElQuesito, corredor),
    ...porElAnillo(corredor * 6, pasos - hastaElQuesito, sentido),
  ]
}

export interface Destino {
  /** Clave del original: `cw`, `ccw`, `in`, `out_cw`, `d3_ccw`… */
  clave: string
  camino: number[]
}

function anota(destinos: Destino[], clave: string, camino: number[]) {
  if (camino.length === 0) return
  const fin = camino[camino.length - 1]
  // Dos caminos distintos que acaban en la misma casilla son la misma
  // jugada para quien la elige: se queda el primero.
  if (destinos.some((d) => d.camino[d.camino.length - 1] === fin)) return
  destinos.push({ clave, camino })
}

/** Todas las casillas a las que se puede llegar con este dado. */
export function destinosDe(pos: number, dado: number): Destino[] {
  const destinos: Destino[] = []

  if (pos === CENTRO) {
    for (let i = 0; i < 5; i++) {
      anota(destinos, `d${i}_cw`, desdeElCentroHacia(dado, i, 'cw'))
      anota(destinos, `d${i}_ccw`, desdeElCentroHacia(dado, i, 'ccw'))
    }
    return destinos
  }

  if (pos >= CORREDOR_INICIO) {
    const ci = Math.floor((pos - CORREDOR_INICIO) / LARGO_CORREDOR)
    const off = (pos - CORREDOR_INICIO) % LARGO_CORREDOR
    const quesito = ci * 6
    const hastaElCentro = LARGO_CORREDOR - off
    const hastaElQuesito = off + 1

    if (dado <= hastaElQuesito) {
      anota(destinos, 'out', haciaFuera(pos, dado))
    } else {
      const alQuesito = haciaFuera(pos, hastaElQuesito)
      const sobran = dado - hastaElQuesito
      anota(destinos, 'out_cw', [...alQuesito, ...porElAnillo(quesito, sobran, 'cw')])
      anota(destinos, 'out_ccw', [...alQuesito, ...porElAnillo(quesito, sobran, 'ccw')])
    }

    if (dado <= hastaElCentro) {
      anota(destinos, 'in', haciaDentro(pos, dado))
    } else {
      const alCentro = haciaDentro(pos, hastaElCentro)
      const sobran = dado - hastaElCentro
      for (let i = 0; i < 5; i++) {
        if (i === ci) continue
        anota(destinos, `d${i}_cw`, [...alCentro, ...desdeElCentroHacia(sobran, i, 'cw')])
        anota(destinos, `d${i}_ccw`, [...alCentro, ...desdeElCentroHacia(sobran, i, 'ccw')])
      }
    }
    return destinos
  }

  anota(destinos, 'cw', porElAnillo(pos, dado, 'cw'))
  anota(destinos, 'ccw', porElAnillo(pos, dado, 'ccw'))

  if (pos % 6 === 0) anota(destinos, 'in', haciaDentro(pos, dado))

  for (const sentido of ['cw', 'ccw'] as const) {
    const d = sentido === 'cw' ? 1 : -1
    for (let hasta = 1; hasta <= dado; hasta++) {
      const cand = (pos + d * hasta + ANILLO) % ANILLO
      if (cand % 6 !== 0) continue
      const sobran = dado - hasta
      if (sobran === 0) break
      anota(destinos, `in_${sentido}`, [
        ...porElAnillo(pos, hasta, sentido),
        ...haciaDentro(cand, sobran),
      ])
      break
    }
  }

  return destinos
}

// ── La partida ───────────────────────────────────────────────────────
export interface Pregunta {
  /** `cultura:17` para las de serie, `db:<uuid>` para las añadidas. */
  id: string
  categoria: CategoriaId
  texto: string
  /** Ya barajadas. */
  opciones: string[]
  buena: number
  /** Quién la escribió, si es de las nuestras. */
  autor?: string
}

export interface JugadorT {
  nombre: string
  perfil: string | null
  pos: number
  quesitos: CategoriaId[]
  aciertos: number
  fallos: number
}

export type FaseT = 'tirando' | 'eligiendo' | 'pregunta' | 'resultado' | 'fin'

export interface PartidaT extends Estado {
  version: 1
  emitido: number
  jugadores: JugadorT[]
  turno: number
  fase: FaseT
  dado: number | null
  destinos: Destino[]
  /** Por dónde pasó la última ficha, para animarla en todas las pantallas. */
  camino: number[]
  pregunta: Pregunta | null
  /** Lo que contestó: índice en `opciones`, o -1 si se acabó el tiempo. */
  elegida: number | null
  /** El desafío del centro: lo que le falta y lo que lleva. */
  reto: { faltan: CategoriaId[]; hechas: CategoriaId[] } | null
  /** Preguntas ya gastadas, por su id. */
  usadas: string[]
  segundos: number
  fin: number | null
  ganador: number | null
  aviso: string
  historia: string[]
}

export interface OpcionesT {
  nombres: string[]
  /** Segundos para contestar. Cero, sin reloj. */
  segundos: number
}

/** De dónde salen las preguntas. Se inyecta para no atar las reglas a la baraja. */
export type Sacador = (categoria: CategoriaId, usadas: string[], azar: () => number) => Pregunta | null

export function nuevaPartidaT(
  o: OpcionesT,
  azar: () => number = Math.random,
  ahora = Date.now(),
): PartidaT {
  // El orden se echa a suertes, como en el original: evita la discusión
  // de quién empieza antes de que empiece nada.
  const nombres = [...o.nombres]
  for (let i = nombres.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[nombres[i], nombres[j]] = [nombres[j], nombres[i]]
  }
  return {
    version: 1,
    emitido: ahora,
    jugadores: nombres.map((nombre) => ({
      nombre,
      perfil: null,
      pos: 0,
      quesitos: [],
      aciertos: 0,
      fallos: 0,
    })),
    turno: 0,
    fase: 'tirando',
    dado: null,
    destinos: [],
    camino: [],
    pregunta: null,
    elegida: null,
    reto: null,
    usadas: [],
    segundos: o.segundos,
    fin: null,
    ganador: null,
    aviso: `Empieza ${nombres[0]}. Orden: ${nombres.join(', ')}.`,
    historia: [],
  }
}

/** Apunta la pregunta como gastada, sin repetirla si la baraja dio la vuelta. */
function apunta(usadas: string[], pregunta: Pregunta | null): string[] {
  if (!pregunta || usadas.includes(pregunta.id)) return usadas
  return [...usadas, pregunta.id]
}

export function tieneTodos(j: JugadorT): boolean {
  return IDS.every((id) => j.quesitos.includes(id))
}

export function tira(p: PartidaT, azar: () => number = Math.random): PartidaT {
  if (p.fase !== 'tirando') return p
  const dado = 1 + Math.floor(azar() * 6)
  const jugador = p.jugadores[p.turno]
  return {
    ...p,
    dado,
    destinos: destinosDe(jugador.pos, dado),
    camino: [],
    fase: 'eligiendo',
    aviso: `${jugador.nombre} saca un ${dado}. Elige a dónde.`,
  }
}

/**
 * Mueve y mira dónde cae. La casilla del dado devuelve el turno a quien
 * tiró; el centro, con los cinco quesitos, abre el desafío.
 */
export function mueve(
  p: PartidaT,
  clave: string,
  saca: Sacador,
  azar: () => number = Math.random,
  ahora = Date.now(),
): PartidaT {
  if (p.fase !== 'eligiendo') return p
  const destino = p.destinos.find((d) => d.clave === clave) ?? p.destinos[0]
  if (!destino) return p
  const camino = destino.camino
  const pos = camino[camino.length - 1]
  const jugador = p.jugadores[p.turno]
  const jugadores = p.jugadores.map((j, i) => (i === p.turno ? { ...j, pos } : j))
  const casilla = TABLERO[pos]
  const base = { ...p, jugadores, camino, destinos: [], elegida: null }

  if (casilla.tipo === 'dado') {
    return {
      ...base,
      fase: 'tirando',
      dado: null,
      pregunta: null,
      aviso: `${jugador.nombre} cae en casilla de dado: vuelve a tirar.`,
    }
  }

  if (casilla.tipo === 'centro' && tieneTodos(jugador)) {
    const faltan = [...IDS]
    for (let i = faltan.length - 1; i > 0; i--) {
      const k = Math.floor(azar() * (i + 1))
      ;[faltan[i], faltan[k]] = [faltan[k], faltan[i]]
    }
    const pregunta = saca(faltan[0], p.usadas, azar)
    return {
      ...base,
      fase: 'pregunta',
      reto: { faltan, hechas: [] },
      pregunta,
      usadas: apunta(p.usadas, pregunta),
      fin: p.segundos > 0 ? ahora + p.segundos * 1000 : null,
      aviso: `¡${jugador.nombre} entra al centro con los cinco quesitos! Cinco preguntas seguidas.`,
    }
  }

  const categoria =
    casilla.cat ?? IDS[Math.floor(azar() * IDS.length)]
  const pregunta = saca(categoria, p.usadas, azar)
  return {
    ...base,
    fase: 'pregunta',
    pregunta,
    usadas: apunta(p.usadas, pregunta),
    fin: p.segundos > 0 ? ahora + p.segundos * 1000 : null,
    aviso:
      casilla.tipo === 'quesito'
        ? `¡Casilla de quesito! ${CATEGORIA[categoria].nombre}.`
        : `${jugador.nombre}, ${CATEGORIA[categoria].nombre}.`,
  }
}

/** Contesta. `-1` es «se acabó el tiempo». */
export function responde(
  p: PartidaT,
  elegida: number,
  saca: Sacador,
  azar: () => number = Math.random,
  ahora = Date.now(),
): PartidaT {
  if (p.fase !== 'pregunta' || !p.pregunta) return p
  const bien = elegida === p.pregunta.buena
  const jugador = p.jugadores[p.turno]
  const base = { ...p, elegida, fin: null }

  // ── Desafío del centro ──
  if (p.reto) {
    if (!bien) {
      // Fallar aquí cuesta un quesito, al azar.
      const perdido = jugador.quesitos[Math.floor(azar() * jugador.quesitos.length)]
      const jugadores = p.jugadores.map((j, i) =>
        i === p.turno
          ? { ...j, fallos: j.fallos + 1, quesitos: j.quesitos.filter((q) => q !== perdido) }
          : j,
      )
      return {
        ...base,
        jugadores,
        fase: 'resultado',
        reto: null,
        aviso: `Falla. Era «${p.pregunta.opciones[p.pregunta.buena]}». Pierde el quesito de ${
          CATEGORIA[perdido].nombre
        }.`,
        historia: [`${jugador.nombre} se quedó a las puertas.`, ...p.historia],
      }
    }
    const hechas = [...p.reto.hechas, p.reto.faltan[0]]
    const faltan = p.reto.faltan.slice(1)
    const jugadores = p.jugadores.map((j, i) =>
      i === p.turno ? { ...j, aciertos: j.aciertos + 1 } : j,
    )
    if (faltan.length === 0) {
      return {
        ...base,
        jugadores,
        fase: 'fin',
        reto: null,
        ganador: p.turno,
        aviso: `¡${jugador.nombre} gana el Trivial de la casa!`,
        historia: [`${jugador.nombre} ganó la partida.`, ...p.historia],
      }
    }
    const pregunta = saca(faltan[0], p.usadas, azar)
    return {
      ...base,
      jugadores,
      reto: { faltan, hechas },
      pregunta,
      usadas: apunta(p.usadas, pregunta),
      elegida: null,
      fin: p.segundos > 0 ? ahora + p.segundos * 1000 : null,
      aviso: `¡Bien! Van ${hechas.length} de 5. Ahora ${CATEGORIA[faltan[0]].nombre}.`,
    }
  }

  // ── Pregunta normal ──
  if (!bien) {
    const jugadores = p.jugadores.map((j, i) => (i === p.turno ? { ...j, fallos: j.fallos + 1 } : j))
    return {
      ...base,
      jugadores,
      fase: 'resultado',
      aviso:
        elegida === -1
          ? `Se acabó el tiempo. Era «${p.pregunta.opciones[p.pregunta.buena]}».`
          : `No. Era «${p.pregunta.opciones[p.pregunta.buena]}».`,
    }
  }

  const casilla = TABLERO[jugador.pos]
  const cat = p.pregunta.categoria
  const gana = casilla.tipo === 'quesito' && !jugador.quesitos.includes(cat)
  const jugadores = p.jugadores.map((j, i) =>
    i === p.turno
      ? { ...j, aciertos: j.aciertos + 1, quesitos: gana ? [...j.quesitos, cat] : j.quesitos }
      : j,
  )
  const yo = jugadores[p.turno]
  return {
    ...base,
    jugadores,
    fase: 'resultado',
    aviso: gana
      ? tieneTodos(yo)
        ? `¡Quesito de ${CATEGORIA[cat].nombre}! Ya tiene los cinco: al centro.`
        : `¡Quesito de ${CATEGORIA[cat].nombre}!`
      : '¡Correcto!',
    historia: gana
      ? [`${jugador.nombre} se lleva el quesito de ${CATEGORIA[cat].nombre}.`, ...p.historia]
      : p.historia,
  }
}

/** Se acabó la cuenta atrás: cuenta como fallo. */
export function seAcabaElTiempoT(p: PartidaT, saca: Sacador, azar: () => number = Math.random): PartidaT {
  return responde(p, -1, saca, azar)
}

export function siguiente(p: PartidaT): PartidaT {
  if (p.fase !== 'resultado') return p
  const turno = (p.turno + 1) % p.jugadores.length
  return {
    ...p,
    turno,
    fase: 'tirando',
    dado: null,
    destinos: [],
    camino: [],
    pregunta: null,
    elegida: null,
    fin: null,
    aviso: `Le toca a ${p.jugadores[turno].nombre}.`,
  }
}

export function otraPartida(p: PartidaT, azar: () => number = Math.random, ahora = Date.now()): PartidaT {
  const nueva = nuevaPartidaT(
    { nombres: p.jugadores.map((j) => j.nombre), segundos: p.segundos },
    azar,
    ahora,
  )
  // Las sillas se quedan: los móviles ya saben quién es quién.
  const porNombre = new Map(p.jugadores.map((j) => [j.nombre, j.perfil]))
  return {
    ...nueva,
    jugadores: nueva.jugadores.map((j) => ({ ...j, perfil: porNombre.get(j.nombre) ?? null })),
  }
}

// ── Sillas ───────────────────────────────────────────────────────────
export function miSitioT(p: PartidaT, perfil: string | null): number {
  return sitioDe(p.jugadores, perfil)
}

export function tomaSitioT(p: PartidaT, indice: number, perfil: string): PartidaT {
  if (indice < 0 || indice >= p.jugadores.length) return p
  return { ...p, jugadores: sienta(p.jugadores, indice, perfil) }
}

export function dejaElSitioT(p: PartidaT, perfil: string): PartidaT {
  if (!p.jugadores.some((j) => j.perfil === perfil)) return p
  return { ...p, jugadores: levanta(p.jugadores, perfil) }
}

// ── Reloj y clasificación ────────────────────────────────────────────
export function restanteDeT(p: PartidaT, desfase = 0, ahora = Date.now()): number {
  if (p.fin === null) return 0
  return Math.max(0, (p.fin - (ahora - desfase)) / 1000)
}

export function clasificacionT(p: PartidaT): JugadorT[] {
  return [...p.jugadores].sort(
    (a, b) => b.quesitos.length - a.quesitos.length || b.aciertos - a.aciertos,
  )
}

// ── La copia de este aparato ─────────────────────────────────────────
const CLAVE = 'rural69-trivial'

export function guardaPartidaT(p: PartidaT | null) {
  try {
    if (p) localStorage.setItem(CLAVE, JSON.stringify(p))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin sitio o sin permiso: la partida vive igual en la mesa.
  }
}

export function leePartidaT(): PartidaT | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const p = JSON.parse(crudo) as PartidaT
    if (p?.version !== 1 || !Array.isArray(p.jugadores) || p.jugadores.length < 2) return null
    return p
  } catch {
    return null
  }
}
