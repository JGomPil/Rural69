import { describe, it, expect, beforeEach } from 'vitest'
import {
  CENTRO,
  IDS,
  TABLERO,
  clasificacionT,
  dejaElSitioT,
  destinosDe,
  guardaPartidaT,
  leePartidaT,
  miSitioT,
  mueve,
  nuevaPartidaT,
  otraPartida,
  responde,
  seAcabaElTiempoT,
  siguiente,
  tieneTodos,
  tira,
  tomaSitioT,
  type CategoriaId,
  type PartidaT,
  type Pregunta,
  type Sacador,
} from './trivial'

/** Un dado y un azar que no sorprenden: la lista se va gastando en orden. */
function azarFijo(valores: number[]) {
  let i = 0
  return () => valores[i++ % valores.length]
}

let numero = 0
const saca: Sacador = (categoria) => {
  numero += 1
  return {
    id: `falsa:${numero}`,
    categoria,
    texto: `¿Pregunta ${numero} de ${categoria}?`,
    opciones: ['buena', 'mala1', 'mala2', 'mala3'],
    buena: 0,
  }
}

function partida(segundos = 0): PartidaT {
  return nuevaPartidaT({ nombres: ['Javi', 'Vero', 'Leo'], segundos }, () => 0, 1_000)
}

/** Lleva a quien tiene el turno a una casilla concreta, sin pasar por el dado. */
function ponEn(p: PartidaT, pos: number): PartidaT {
  return { ...p, jugadores: p.jugadores.map((j, i) => (i === p.turno ? { ...j, pos } : j)) }
}

beforeEach(() => {
  numero = 0
  localStorage.clear()
})

describe('el tablero', () => {
  it('tiene 46 casillas: 30 de anillo, 15 de corredor y el centro', () => {
    expect(TABLERO).toHaveLength(46)
    expect(TABLERO[CENTRO].tipo).toBe('centro')
  })

  it('hay un quesito y un dado en cada lado, cinco de cada', () => {
    expect(TABLERO.filter((c) => c.tipo === 'quesito')).toHaveLength(5)
    expect(TABLERO.filter((c) => c.tipo === 'dado')).toHaveLength(5)
    // Los quesitos, en las bocas de los corredores.
    for (const i of [0, 6, 12, 18, 24]) expect(TABLERO[i].tipo).toBe('quesito')
  })

  it('las cinco categorías están repartidas por igual en el anillo', () => {
    const cuenta = new Map<string, number>()
    for (let i = 0; i < 30; i++) cuenta.set(TABLERO[i].cat!, (cuenta.get(TABLERO[i].cat!) ?? 0) + 1)
    expect([...cuenta.values()]).toEqual([6, 6, 6, 6, 6])
  })
})

describe('el dado y los caminos', () => {
  it('desde una casilla cualquiera se puede ir por los dos lados', () => {
    const d = destinosDe(2, 3).map((x) => x.clave)
    expect(d).toContain('cw')
    expect(d).toContain('ccw')
  })

  it('desde un quesito se puede entrar al corredor', () => {
    expect(destinosDe(0, 2).map((x) => x.clave)).toContain('in')
  })

  it('del centro no se sale al centro: hay que elegir corredor', () => {
    const d = destinosDe(CENTRO, 3)
    expect(d.length).toBeGreaterThan(1)
    expect(d.every((x) => x.camino[x.camino.length - 1] !== CENTRO)).toBe(true)
  })

  it('dos caminos que acaban en la misma casilla cuentan como uno', () => {
    for (let pos = 0; pos < 46; pos++) {
      for (let dado = 1; dado <= 6; dado++) {
        const finales = destinosDe(pos, dado).map((d) => d.camino[d.camino.length - 1])
        expect(new Set(finales).size).toBe(finales.length)
      }
    }
  })
})

describe('el turno', () => {
  it('tirar deja elegir a dónde', () => {
    const p = tira(partida(), azarFijo([0.5]))
    expect(p.dado).toBe(4)
    expect(p.fase).toBe('eligiendo')
    expect(p.destinos.length).toBeGreaterThan(0)
  })

  it('la casilla de dado devuelve la tirada al mismo jugador', () => {
    // La casilla 3 de cada lado es la del dado.
    const p = mueve(tira(ponEn(partida(), 0), azarFijo([0.4])), 'cw', saca)
    expect(TABLERO[p.jugadores[p.turno].pos].tipo).toBe('dado')
    expect(p.fase).toBe('tirando')
    expect(p.turno).toBe(0)
    expect(p.pregunta).toBeNull()
  })

  it('acertar no da otro turno: el turno pasa siempre', () => {
    const p = responde(mueve(tira(partida(), azarFijo([0.1])), 'cw', saca), 0, saca)
    expect(p.fase).toBe('resultado')
    expect(siguiente(p).turno).toBe(1)
    expect(siguiente(p).fase).toBe('tirando')
  })

  it('fallar cuenta el fallo y dice cuál era', () => {
    const p = responde(mueve(tira(partida(), azarFijo([0.1])), 'cw', saca), 2, saca)
    expect(p.jugadores[0].fallos).toBe(1)
    expect(p.aviso).toContain('buena')
  })

  it('quedarse sin tiempo es como fallar', () => {
    const p = seAcabaElTiempoT(mueve(tira(partida(30), azarFijo([0.1])), 'cw', saca), saca)
    expect(p.elegida).toBe(-1)
    expect(p.aviso).toContain('Se acabó el tiempo')
    expect(p.fin).toBeNull()
  })
})

describe('los quesitos', () => {
  it('se ganan acertando en su casilla', () => {
    const p = responde({ ...mueve(tira(ponEn(partida(), 29), azarFijo([0.1])), 'cw', saca) }, 0, saca)
    expect(p.jugadores[0].pos).toBe(0)
    expect(p.jugadores[0].quesitos).toEqual([TABLERO[0].cat])
    expect(p.aviso).toContain('Quesito')
  })

  it('el mismo quesito no se gana dos veces', () => {
    let p = ponEn(partida(), 29)
    p = { ...p, jugadores: p.jugadores.map((j, i) => (i === 0 ? { ...j, quesitos: [TABLERO[0].cat!] } : j)) }
    p = responde(mueve(tira(p, azarFijo([0.1])), 'cw', saca), 0, saca)
    expect(p.jugadores[0].quesitos).toHaveLength(1)
  })

  it('acertar fuera de casilla de quesito no da quesito', () => {
    const p = responde(mueve(tira(ponEn(partida(), 0), azarFijo([0.1])), 'cw', saca), 0, saca)
    expect(p.jugadores[0].quesitos).toEqual([])
    expect(p.jugadores[0].aciertos).toBe(1)
  })
})

describe('el centro', () => {
  const conTodos = (p: PartidaT): PartidaT => ({
    ...p,
    jugadores: p.jugadores.map((j, i) => (i === p.turno ? { ...j, quesitos: [...IDS] } : j)),
  })

  it('sin los cinco quesitos, el centro es una pregunta más', () => {
    const p = mueve(tira(ponEn(partida(), 32), azarFijo([0.1])), 'in', saca)
    expect(p.jugadores[0].pos).toBe(CENTRO)
    expect(p.reto).toBeNull()
    expect(p.pregunta).not.toBeNull()
  })

  it('con los cinco, se abre el desafío de cinco preguntas', () => {
    const p = mueve(tira(conTodos(ponEn(partida(), 32)), azarFijo([0.1])), 'in', saca)
    expect(p.reto?.faltan).toHaveLength(5)
    expect(p.reto?.hechas).toEqual([])
    expect(p.aviso).toContain('cinco quesitos')
  })

  it('cinco aciertos seguidos ganan la partida', () => {
    let p = mueve(tira(conTodos(ponEn(partida(), 32)), azarFijo([0.1])), 'in', saca)
    for (let i = 0; i < 5; i++) p = responde(p, 0, saca)
    expect(p.fase).toBe('fin')
    expect(p.ganador).toBe(0)
    expect(p.aviso).toContain('gana')
  })

  it('fallar en el centro cuesta un quesito', () => {
    let p = mueve(tira(conTodos(ponEn(partida(), 32)), azarFijo([0.1])), 'in', saca)
    p = responde(p, 3, saca, azarFijo([0]))
    expect(p.jugadores[0].quesitos).toHaveLength(4)
    expect(p.reto).toBeNull()
    expect(p.fase).toBe('resultado')
    expect(p.aviso).toContain('Pierde el quesito')
  })

  it('tenerlos todos se sabe mirando la lista, no contando', () => {
    expect(tieneTodos({ nombre: 'x', perfil: null, pos: 0, quesitos: [...IDS], aciertos: 0, fallos: 0 })).toBe(true)
    const repes = [IDS[0], IDS[0], IDS[1], IDS[2], IDS[3]] as CategoriaId[]
    expect(tieneTodos({ nombre: 'x', perfil: null, pos: 0, quesitos: repes, aciertos: 0, fallos: 0 })).toBe(false)
  })
})

describe('la baraja no se repite', () => {
  it('cada pregunta servida se apunta una sola vez', () => {
    const repetidora: Sacador = (categoria) => ({
      id: 'siempre-la-misma',
      categoria,
      texto: '¿?',
      opciones: ['a', 'b'],
      buena: 0,
    })
    let p = mueve(tira(partida(), azarFijo([0.1])), 'cw', repetidora)
    p = siguiente(responde(p, 0, repetidora))
    p = mueve(tira(p, azarFijo([0.1])), 'cw', repetidora)
    expect(p.usadas).toEqual(['siempre-la-misma'])
  })

  it('una pregunta que no llega no rompe la partida', () => {
    const vacio: Sacador = () => null
    const p = mueve(tira(partida(), azarFijo([0.1])), 'cw', vacio)
    expect(p.pregunta).toBeNull()
    expect(p.usadas).toEqual([])
  })
})

describe('cada móvil en su silla', () => {
  it('sentarse y levantarse', () => {
    let p = tomaSitioT(partida(), 1, 'perfil-vero')
    expect(miSitioT(p, 'perfil-vero')).toBe(1)
    p = dejaElSitioT(p, 'perfil-vero')
    expect(miSitioT(p, 'perfil-vero')).toBe(-1)
  })

  it('otra partida reparte de nuevo pero cada móvil sigue siendo quien era', () => {
    const empezada = partida()
    // El orden se echa a suertes, así que la silla 1 no tiene por qué ser
    // Vero: lo que importa es que el móvil siga pegado a la misma persona.
    const quien = empezada.jugadores[1].nombre
    const p = tomaSitioT(empezada, 1, 'perfil-vero')
    const otra = otraPartida(p, () => 0.5, 2_000)
    expect(otra.jugadores.find((j) => j.perfil === 'perfil-vero')?.nombre).toBe(quien)
    expect(otra.jugadores.every((j) => j.quesitos.length === 0)).toBe(true)
  })
})

describe('la clasificación y la copia', () => {
  it('manda el número de quesitos, y los aciertos desempatan', () => {
    const p = partida()
    const con = {
      ...p,
      jugadores: [
        { ...p.jugadores[0], quesitos: [IDS[0]], aciertos: 1 },
        { ...p.jugadores[1], quesitos: [IDS[0], IDS[1]], aciertos: 2 },
        { ...p.jugadores[2], quesitos: [IDS[0]], aciertos: 5 },
      ],
    }
    expect(clasificacionT(con).map((j) => j.nombre)).toEqual([
      con.jugadores[1].nombre,
      con.jugadores[2].nombre,
      con.jugadores[0].nombre,
    ])
  })

  it('la partida se guarda y se recupera en este aparato', () => {
    const p = partida()
    guardaPartidaT(p)
    expect(leePartidaT()?.jugadores).toHaveLength(3)
    guardaPartidaT(null)
    expect(leePartidaT()).toBeNull()
  })

  it('una partida de otra versión no se recupera', () => {
    localStorage.setItem('rural69-trivial', JSON.stringify({ ...partida(), version: 99 }))
    expect(leePartidaT()).toBeNull()
  })
})

describe('la pregunta que viaja', () => {
  it('lleva la categoría de la casilla en la que se cae', () => {
    const p = mueve(tira(ponEn(partida(), 0), azarFijo([0.1])), 'cw', saca)
    const pregunta = p.pregunta as Pregunta
    expect(pregunta.categoria).toBe(TABLERO[p.jugadores[0].pos].cat)
  })
})
