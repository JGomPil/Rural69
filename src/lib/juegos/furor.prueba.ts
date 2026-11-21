import { beforeEach, describe, expect, it } from 'vitest'
import {
  cambiaPalabra,
  cantada,
  falla,
  guardaPartida,
  leePartida,
  nuevaPartida,
  otroLado,
  reparteAlAzar,
} from './furor'
import { PALABRAS, eligePalabra } from './palabras'

/** Un azar de mentira, para que las pruebas no dependan de la suerte. */
const azarFijo = (valores: number[]) => {
  let i = 0
  return () => valores[i++ % valores.length]
}

const arranca = (extra: Partial<Parameters<typeof nuevaPartida>[0]> = {}, azar = azarFijo([0.1])) =>
  nuevaPartida(
    { nombreA: 'Ellas', nombreB: 'Ellos', genteA: ['1'], genteB: ['2'], segundos: 30, meta: 2, ...extra },
    azar,
  )

describe('el sorteo del comienzo', () => {
  it('con menos de medio empieza el equipo A, y le toca a él', () => {
    const p = arranca({}, azarFijo([0.1]))
    expect(p.abre).toBe('a')
    expect(p.turno).toBe('a')
    expect(p.historia[0]).toContain('Empieza Ellas')
  })

  it('con más de medio empieza el equipo B', () => {
    expect(arranca({}, azarFijo([0.9])).abre).toBe('b')
  })

  it('sale una palabra de la lista y queda marcada como usada', () => {
    const p = arranca()
    expect(PALABRAS).toContain(p.palabra)
    expect(p.usadas).toEqual([p.palabra])
  })
})

describe('cantar a tiempo', () => {
  it('pasa el turno al otro equipo sin tocar el marcador', () => {
    const p = cantada(arranca())
    expect(p.turno).toBe('b')
    expect(p.cantadas).toBe(1)
    expect(p.equipos.a.puntos + p.equipos.b.puntos).toBe(0)
    expect(p.equipos.a.minipuntos + p.equipos.b.minipuntos).toBe(0)
  })

  it('la palabra no cambia mientras sigan saliendo canciones', () => {
    const p = arranca()
    const despues = cantada(cantada(cantada(p)))
    expect(despues.palabra).toBe(p.palabra)
    expect(despues.cantadas).toBe(3)
    expect(despues.turno).toBe('b')
  })
})

describe('quedarse en blanco', () => {
  it('da un minipunto al contrario', () => {
    const p = falla(arranca(), 'tiempo', azarFijo([0.3]))
    expect(p.equipos.b.minipuntos).toBe(1)
    expect(p.equipos.a.minipuntos).toBe(0)
  })

  it('saca palabra nueva y la abre el otro equipo', () => {
    const antes = arranca()
    const p = falla(antes, 'tiempo', azarFijo([0.3]))
    expect(p.palabra).not.toBe(antes.palabra)
    expect(p.abre).toBe('b')
    expect(p.turno).toBe('b')
    expect(p.cantadas).toBe(0)
  })

  it('cuenta en la historia quién falló y por qué', () => {
    const p = falla(arranca(), 'repetida', azarFijo([0.3]))
    expect(p.historia[0]).toContain('Ellas repitieron canción')
    expect(p.historia[0]).toContain('Minipunto para Ellos')
  })

  it('nadie abre dos palabras seguidas', () => {
    let p = arranca()
    const abren = [p.abre]
    for (let i = 0; i < 4; i++) {
      p = falla(p, 'tiempo', azarFijo([0.3]))
      abren.push(p.abre)
    }
    expect(abren).toEqual(['a', 'b', 'a', 'b', 'a'])
  })
})

describe('los minipuntos y el punto', () => {
  it('tres minipuntos son un punto, y los minipuntos se borran', () => {
    // Falla siempre quien tiene el turno, y tras cada fallo abre el otro:
    // así los minipuntos se reparten uno a uno —1-0, 1-1, 2-1, 2-2— y el
    // quinto fallo es el que le da a B su tercer minipunto y el punto.
    let p = arranca()
    for (let i = 0; i < 5; i++) p = falla(p, 'tiempo', azarFijo([0.3]))
    expect(p.equipos.b.puntos).toBe(1)
    expect(p.equipos.a.puntos + p.equipos.b.puntos).toBe(1)
    expect(p.equipos.a.minipuntos).toBe(0)
    expect(p.equipos.b.minipuntos).toBe(0)
  })

  it('el equipo que no falla nunca se lleva el punto en tres palabras', () => {
    // A falla siempre: cantamos una vez con B para devolverle el turno a A.
    let p = arranca()
    for (let i = 0; i < 3; i++) {
      p = falla(p, 'tiempo', azarFijo([0.3])) // falla A
      if (p.turno === 'b' && !p.ganador) p = cantada(p) // B canta y devuelve
    }
    expect(p.equipos.b.puntos).toBe(1)
    expect(p.equipos.a.puntos).toBe(0)
  })

  it('al llegar a la meta hay ganador y la partida se queda quieta', () => {
    let p = arranca({ meta: 1 })
    for (let i = 0; i < 3; i++) {
      p = falla(p, 'tiempo', azarFijo([0.3]))
      if (p.turno === 'b' && !p.ganador) p = cantada(p)
    }
    expect(p.ganador).toBe('b')
    expect(p.historia[0]).toContain('Ellos gana la partida')

    const congelada = falla(cantada(p), 'tiempo', azarFijo([0.3]))
    expect(congelada).toEqual(p)
  })
})

describe('cambiar una palabra imposible', () => {
  it('no mueve el marcador y devuelve el turno a quien abría', () => {
    const p = cantada(arranca())
    const nueva = cambiaPalabra(p, azarFijo([0.5]))
    expect(nueva.palabra).not.toBe(p.palabra)
    expect(nueva.turno).toBe(p.abre)
    expect(nueva.cantadas).toBe(0)
    expect(nueva.equipos.a.minipuntos + nueva.equipos.b.minipuntos).toBe(0)
  })
})

describe('las palabras', () => {
  it('no repiten mientras queden sin usar', () => {
    const usadas: string[] = []
    for (let i = 0; i < PALABRAS.length; i++) {
      const p = eligePalabra(usadas, azarFijo([0.42, 0.07, 0.93, 0.5]))
      expect(usadas).not.toContain(p)
      usadas.push(p)
    }
    expect(usadas).toHaveLength(PALABRAS.length)
  })

  it('cuando se acaban, la bolsa vuelve a llenarse', () => {
    expect(PALABRAS).toContain(eligePalabra([...PALABRAS], azarFijo([0.5])))
  })

  it('ninguna está repetida ni vacía', () => {
    expect(new Set(PALABRAS).size).toBe(PALABRAS.length)
    expect(PALABRAS.every((p) => p.trim().length > 1)).toBe(true)
  })
})

describe('repartir equipos al azar', () => {
  it('no pierde ni duplica a nadie', () => {
    const gente = ['1', '2', '3', '4', '5', '6', '7']
    const [a, b] = reparteAlAzar(gente, azarFijo([0.2, 0.8, 0.5, 0.1, 0.9, 0.3]))
    expect([...a, ...b].sort()).toEqual(gente)
  })

  it('deja los equipos igualados', () => {
    for (const cuantos of [2, 3, 8, 11]) {
      const gente = Array.from({ length: cuantos }, (_, i) => String(i))
      const [a, b] = reparteAlAzar(gente, azarFijo([0.37]))
      expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(1)
    }
  })
})

describe('la partida guardada en el aparato', () => {
  beforeEach(() => localStorage.clear())

  it('sobrevive a que se bloquee el móvil', () => {
    const p = cantada(arranca())
    guardaPartida(p)
    expect(leePartida()).toEqual(p)
  })

  it('una partida de otra versión no se recupera', () => {
    localStorage.setItem('rural69-furor', JSON.stringify({ version: 0, palabra: 'amor' }))
    expect(leePartida()).toBeNull()
  })

  it('una basura cualquiera no rompe nada', () => {
    localStorage.setItem('rural69-furor', 'esto no es json')
    expect(leePartida()).toBeNull()
  })

  it('se puede borrar al terminar', () => {
    guardaPartida(arranca())
    guardaPartida(null)
    expect(leePartida()).toBeNull()
  })
})

describe('el otro lado', () => {
  it('es el otro', () => {
    expect(otroLado('a')).toBe('b')
    expect(otroLado('b')).toBe('a')
  })
})
