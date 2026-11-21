import { beforeEach, describe, expect, it } from 'vitest'
import {
  acierta,
  baraja,
  dejaElSitio,
  esLaCarta,
  intenta,
  miSitio,
  otraVez,
  tomaSitio,
  clasificacion,
  cuantosCaben,
  guardaJuego,
  leeJuego,
  loQueVe,
  mira,
  nuevoJuego,
  pasa,
  quedanPorAcertar,
  restanteDe,
  seAcabaElTiempo,
  seguirJugando,
  terminaAqui,
  type Juego,
} from './quiensoy'
import { BARAJA, CATEGORIAS, cartasDe } from './famosos'

const azarFijo = (valores: number[]) => {
  let i = 0
  return () => valores[i++ % valores.length]
}

const empieza = (extra: Partial<Parameters<typeof nuevoJuego>[0]> = {}) =>
  nuevoJuego(
    { nombres: ['Javi', 'Vero', 'Leo'], categoria: 'mezclado', segundos: 60, vueltas: null, ...extra },
    azarFijo([0.3, 0.7, 0.1, 0.9]),
  )

/** Un turno entero: coger el móvil, preguntar y pasar. */
const turnoEntero = (j: Juego) => pasa(mira(j, 1_000_000))

describe('la baraja de famosos', () => {
  it('tiene de sobra y ninguno repetido', () => {
    expect(BARAJA.length).toBeGreaterThanOrEqual(60)
    expect(new Set(BARAJA.map((c) => c.nombre)).size).toBe(BARAJA.length)
  })

  it('todas las categorías dan para una mesa grande', () => {
    for (const c of CATEGORIAS) expect(cuantosCaben(c)).toBeGreaterThanOrEqual(15)
    expect(cartasDe('mezclado')).toHaveLength(BARAJA.length)
  })

  it('todas llevan pista, y la pista no es la respuesta', () => {
    for (const c of BARAJA) {
      expect(c.pista.length).toBeGreaterThan(4)
      expect(c.pista.toLowerCase()).not.toContain(c.nombre.toLowerCase())
    }
  })

  it('barajar no pierde ni duplica cartas', () => {
    const mezclada = baraja(BARAJA, azarFijo([0.2, 0.8, 0.5]))
    expect(mezclada).toHaveLength(BARAJA.length)
    expect(new Set(mezclada.map((c) => c.nombre)).size).toBe(BARAJA.length)
  })
})

describe('el reparto', () => {
  it('da una carta a cada uno, y distinta', () => {
    const j = empieza()
    expect(j.jugadores).toHaveLength(3)
    expect(new Set(j.jugadores.map((p) => p.carta.nombre)).size).toBe(3)
  })

  it('respeta la categoría elegida', () => {
    const j = empieza({ categoria: 'musica' })
    expect(j.jugadores.every((p) => p.carta.categoria === 'musica')).toBe(true)
  })

  it('empiezan todos sin saber quiénes son y sin móvil', () => {
    const j = empieza()
    expect(j.jugadores.every((p) => p.puesto === 0 && p.preguntas === 0)).toBe(true)
    expect(j.jugadores.every((p) => p.perfil === null)).toBe(true)
    expect(j.fase).toBe('pasa')
    expect(quedanPorAcertar(j)).toHaveLength(3)
  })
})

describe('lo que ve el que tiene el móvil', () => {
  it('ve a los demás, nunca su propia carta', () => {
    const j = empieza()
    const visto = loQueVe(j)
    expect(visto).toHaveLength(2)
    expect(visto.map((p) => p.nombre)).toEqual(['Vero', 'Leo'])
    expect(visto.map((p) => p.carta.nombre)).not.toContain(j.jugadores[0].carta.nombre)
  })

  it('y cambia con el turno', () => {
    const j = turnoEntero(empieza())
    expect(loQueVe(j).map((p) => p.nombre)).toEqual(['Javi', 'Leo'])
  })
})

describe('una pregunta por turno', () => {
  it('mirar arranca el reloj cuando lo hay', () => {
    expect(mira(empieza(), 1_000_000).fin).toBe(1_060_000)
    expect(mira(empieza({ segundos: 0 }), 1_000_000).fin).toBeNull()
    expect(restanteDe(mira(empieza(), 1_000_000), 1_010_000)).toBe(50)
  })

  it('pasar cuenta la pregunta y cambia de manos', () => {
    const j = turnoEntero(empieza())
    expect(j.jugadores[0].preguntas).toBe(1)
    expect(j.turno).toBe(1)
    expect(j.fase).toBe('pasa')
    expect(j.fin).toBeNull()
  })

  it('al volver al primero sube la vuelta', () => {
    let j = empieza()
    expect(j.vuelta).toBe(1)
    for (let i = 0; i < 3; i++) j = turnoEntero(j)
    expect(j.vuelta).toBe(2)
    expect(j.turno).toBe(0)
  })

  it('quedarse sin tiempo pasa el turno sin contar pregunta', () => {
    const j = seAcabaElTiempo(mira(empieza(), 1_000_000))
    expect(j.turno).toBe(1)
    expect(j.jugadores[0].preguntas).toBe(0)
    expect(j.historia[0]).toContain('se le acabó el tiempo')
  })
})

describe('acertar', () => {
  it('el primero que acierta para el juego y pregunta si se sigue', () => {
    const j = acierta(mira(empieza(), 1_000_000))
    expect(j.fase).toBe('alguien-acerto')
    expect(j.jugadores[0].puesto).toBe(1)
    expect(j.historia[0]).toContain('¡Javi era')
  })

  it('se puede terminar ahí', () => {
    expect(terminaAqui(acierta(mira(empieza(), 1_000_000))).fase).toBe('fin')
  })

  it('o seguir hasta que acierten todos, saltándose al que ya sabe', () => {
    const j = seguirJugando(acierta(mira(empieza(), 1_000_000)))
    expect(j.fase).toBe('pasa')
    expect(j.turno).toBe(1)
    expect(j.seguir).toBe(true)
    // Y en las vueltas siguientes ya no le toca al que acertó.
    const vuelta = turnoEntero(turnoEntero(j))
    expect(vuelta.turno).toBe(1)
  })

  it('tras decidir seguir, los demás aciertos ya no preguntan nada', () => {
    let j = seguirJugando(acierta(mira(empieza(), 1_000_000)))
    j = acierta(mira(j, 1_000_000))
    expect(j.fase).toBe('pasa')
    expect(j.jugadores[1].puesto).toBe(2)
  })

  it('cuando aciertan todos, se acaba', () => {
    let j = seguirJugando(acierta(mira(empieza(), 1_000_000)))
    j = acierta(mira(j, 1_000_000))
    j = acierta(mira(j, 1_000_000))
    expect(j.fase).toBe('fin')
    expect(quedanPorAcertar(j)).toHaveLength(0)
  })
})

describe('cada móvil dice quién es', () => {
  it('sentarse en una silla la marca como tuya', () => {
    const j = tomaSitio(empieza(), 1, 'perfil-vero')
    expect(j.jugadores[1].perfil).toBe('perfil-vero')
    expect(miSitio(j, 'perfil-vero')).toBe(1)
    expect(j.historia[0]).toContain('Vero ya tiene su móvil')
  })

  it('una cuenta solo ocupa una silla: si cambia, deja la anterior', () => {
    let j = tomaSitio(empieza(), 1, 'perfil-vero')
    j = tomaSitio(j, 2, 'perfil-vero')
    expect(j.jugadores[1].perfil).toBeNull()
    expect(j.jugadores[2].perfil).toBe('perfil-vero')
  })

  it('me he sentado donde no era: suelto la silla', () => {
    const j = dejaElSitio(tomaSitio(empieza(), 1, 'perfil-vero'), 'perfil-vero')
    expect(j.jugadores[1].perfil).toBeNull()
    expect(miSitio(j, 'perfil-vero')).toBe(-1)
  })

  it('quien no se ha sentado no tiene sitio', () => {
    expect(miSitio(empieza(), 'nadie')).toBe(-1)
    expect(miSitio(empieza(), null)).toBe(-1)
  })

  it('otra partida reparte cartas nuevas pero respeta las sillas', () => {
    const j = tomaSitio(empieza(), 0, 'perfil-javi')
    const otra = otraVez(j, azarFijo([0.8, 0.2, 0.6]))
    expect(otra.jugadores[0].perfil).toBe('perfil-javi')
    expect(otra.jugadores[0].puesto).toBe(0)
  })
})

describe('hay que escribirlo', () => {
  it('vale el nombre entero, con o sin tildes y mayúsculas', () => {
    expect(esLaCarta('penelope cruz', 'Penélope Cruz')).toBe(true)
    expect(esLaCarta('  PENÉLOPE   CRUZ ', 'Penélope Cruz')).toBe(true)
  })

  it('vale un apellido que lo identifique', () => {
    expect(esLaCarta('nadal', 'Rafa Nadal')).toBe(true)
    expect(esLaCarta('einstein', 'Albert Einstein')).toBe(true)
  })

  it('no vale cualquier cosa', () => {
    expect(esLaCarta('nad', 'Rafa Nadal')).toBe(false)
    expect(esLaCarta('messi', 'Rafa Nadal')).toBe(false)
    expect(esLaCarta('', 'Rafa Nadal')).toBe(false)
    // «de» y «la» son relleno: no pueden dar un acierto.
    expect(esLaCarta('de', 'Camarón de la Isla')).toBe(false)
  })

  it('acertar escribiéndolo cuenta como acierto', () => {
    const j = mira(empieza(), 1_000_000)
    const suyo = j.jugadores[j.turno].carta.nombre
    const despues = intenta(j, suyo)
    expect(despues.jugadores[0].puesto).toBe(1)
    expect(despues.fase).toBe('alguien-acerto')
  })

  it('fallar cuesta la pregunta y el turno', () => {
    const j = mira(empieza(), 1_000_000)
    const despues = intenta(j, 'Chuck Norris')
    expect(despues.jugadores[0].puesto).toBe(0)
    expect(despues.jugadores[0].preguntas).toBe(1)
    expect(despues.turno).toBe(1)
    expect(despues.historia[0]).toContain('Javi dijo «Chuck Norris» y no era')
  })

  it('el fallo queda apuntado para todas las pantallas, y se borra al turno siguiente', () => {
    const fallado = intenta(mira(empieza(), 1_000_000), 'Chuck Norris')
    expect(fallado.ultimoFallo).toEqual({ nombre: 'Javi', dicho: 'Chuck Norris' })
    expect(mira(fallado, 1_000_000).ultimoFallo).toBeNull()
  })

  it('fuera de turno no hace nada', () => {
    const j = empieza()
    expect(intenta(j, 'lo que sea')).toBe(j)
  })
})

describe('las vueltas', () => {
  it('sin límite, se puede jugar indefinidamente', () => {
    let j = empieza({ vueltas: null })
    for (let i = 0; i < 30; i++) j = turnoEntero(j)
    expect(j.fase).toBe('pasa')
    expect(j.vuelta).toBe(11)
  })

  it('con límite, se acaba al pasarse', () => {
    let j = empieza({ vueltas: 2 })
    for (let i = 0; i < 6; i++) j = turnoEntero(j)
    expect(j.fase).toBe('fin')
  })
})

describe('la clasificación', () => {
  it('primero los que acertaron por orden, y detrás los que no', () => {
    let j = seguirJugando(acierta(mira(empieza(), 1_000_000))) // Javi, 1º
    j = turnoEntero(j) // Vero pregunta
    j = acierta(mira(j, 1_000_000)) // Leo, 2º
    const tabla = clasificacion(j)
    expect(tabla.map((p) => p.nombre)).toEqual(['Javi', 'Leo', 'Vero'])
    expect(tabla[2].puesto).toBe(0)
  })
})

describe('el juego guardado en el aparato', () => {
  beforeEach(() => localStorage.clear())

  it('sobrevive al bloqueo del móvil', () => {
    const j = mira(empieza(), 1_000_000)
    guardaJuego(j)
    expect(leeJuego()).toEqual(j)
  })

  it('una basura cualquiera no rompe nada', () => {
    localStorage.setItem('rural69-quiensoy', '{{{')
    expect(leeJuego()).toBeNull()
  })

  it('un juego de otra versión no se recupera', () => {
    localStorage.setItem('rural69-quiensoy', JSON.stringify({ ...empieza(), version: 2 }))
    expect(leeJuego()).toBeNull()
  })
})
