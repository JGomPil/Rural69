import { beforeEach, describe, expect, it } from 'vitest'
import {
  ajustaPuntos,
  arranca,
  cambiaPalabra,
  cantada,
  falla,
  guardaPartida,
  leePartida,
  nuevaPartida,
  otroLado,
  para,
  ponPalabra,
  reparteAlAzar,
  restanteDe,
  sella,
} from './furor'
import { PALABRAS, eligePalabra } from './palabras'

/** Un azar de mentira, para que las pruebas no dependan de la suerte. */
const azarFijo = (valores: number[]) => {
  let i = 0
  return () => valores[i++ % valores.length]
}

const arrancaPartida = (extra: Partial<Parameters<typeof nuevaPartida>[0]> = {}, azar = azarFijo([0.1])) =>
  nuevaPartida(
    { nombreA: 'Ellas', nombreB: 'Ellos', genteA: ['1'], genteB: ['2'], segundos: 30, ...extra },
    azar,
    1_000_000,
  )

describe('el sorteo del comienzo', () => {
  it('con menos de medio empieza el equipo A, y le toca a él', () => {
    const p = arrancaPartida({}, azarFijo([0.1]))
    expect(p.abre).toBe('a')
    expect(p.turno).toBe('a')
    expect(p.historia[0]).toContain('Empieza Ellas')
  })

  it('con más de medio empieza el equipo B', () => {
    expect(arrancaPartida({}, azarFijo([0.9])).abre).toBe('b')
  })

  it('sale una palabra de la lista, el reloj parado y nadie ganando', () => {
    const p = arrancaPartida()
    expect(PALABRAS).toContain(p.palabra)
    expect(p.usadas).toEqual([p.palabra])
    expect(p.fin).toBeNull()
    expect(p.equipos.a.puntos + p.equipos.b.puntos).toBe(0)
  })
})

describe('el reloj', () => {
  it('arranca poniendo la hora de fin, no una cuenta de segundos', () => {
    const p = arranca(arrancaPartida(), 1_000_000)
    expect(p.fin).toBe(1_030_000)
  })

  it('parado, lo que queda es el tiempo entero', () => {
    expect(restanteDe(arrancaPartida(), 0, 9_999_999)).toBe(30)
  })

  it('corriendo, cuenta hacia atrás', () => {
    const p = arranca(arrancaPartida(), 1_000_000)
    expect(restanteDe(p, 0, 1_010_000)).toBe(20)
  })

  it('nunca baja de cero', () => {
    const p = arranca(arrancaPartida(), 1_000_000)
    expect(restanteDe(p, 0, 1_999_999)).toBe(0)
  })

  it('corrige el desfase entre el reloj del moderador y el mío', () => {
    // El moderador va cinco segundos adelantado: su «fin» cae antes en su
    // reloj que en el mío, y sin corregirlo yo vería cinco segundos menos.
    const p = arranca(arrancaPartida(), 1_000_000)
    expect(restanteDe(p, 5_000, 1_010_000)).toBe(25)
    expect(restanteDe(p, -5_000, 1_010_000)).toBe(15)
  })

  it('la pausa para el reloj sin tocar nada más', () => {
    const corriendo = arranca(arrancaPartida(), 1_000_000)
    const parada = para(corriendo)
    expect(parada.fin).toBeNull()
    expect(parada.palabra).toBe(corriendo.palabra)
    expect(parada.turno).toBe(corriendo.turno)
  })

  it('sellar deja la hora de envío, que es lo que mide el desfase', () => {
    expect(sella(arrancaPartida(), 123456).emitido).toBe(123456)
  })
})

describe('cantar a tiempo', () => {
  it('pasa el turno con el reloj entero para el otro equipo', () => {
    const p = cantada(arranca(arrancaPartida(), 1_000_000), 1_005_000)
    expect(p.turno).toBe('b')
    expect(p.cantadas).toBe(1)
    expect(p.fin).toBe(1_035_000)
    expect(p.equipos.a.puntos + p.equipos.b.puntos).toBe(0)
  })

  it('la palabra no cambia mientras sigan saliendo canciones', () => {
    const p = arrancaPartida()
    const despues = cantada(cantada(cantada(p)))
    expect(despues.palabra).toBe(p.palabra)
    expect(despues.cantadas).toBe(3)
    expect(despues.turno).toBe('b')
  })
})

describe('quedarse en blanco', () => {
  it('da un minipunto al contrario y para el reloj', () => {
    const p = falla(arranca(arrancaPartida(), 1_000_000), 'tiempo', azarFijo([0.3]))
    expect(p.equipos.b.minipuntos).toBe(1)
    expect(p.equipos.a.minipuntos).toBe(0)
    expect(p.fin).toBeNull()
  })

  it('saca palabra nueva y la abre el otro equipo', () => {
    const antes = arrancaPartida()
    const p = falla(antes, 'tiempo', azarFijo([0.3]))
    expect(p.palabra).not.toBe(antes.palabra)
    expect(p.abre).toBe('b')
    expect(p.turno).toBe('b')
    expect(p.cantadas).toBe(0)
  })

  it('cuenta en la historia quién falló y por qué', () => {
    const p = falla(arrancaPartida(), 'repetida', azarFijo([0.3]))
    expect(p.historia[0]).toContain('Ellas repitieron canción')
    expect(p.historia[0]).toContain('Minipunto para Ellos')
  })

  it('nadie abre dos palabras seguidas', () => {
    let p = arrancaPartida()
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
    // los minipuntos se reparten 1-0, 1-1, 2-1, 2-2, y el quinto fallo le
    // da a B su tercero y el punto.
    let p = arrancaPartida()
    for (let i = 0; i < 5; i++) p = falla(p, 'tiempo', azarFijo([0.3]))
    expect(p.equipos.b.puntos).toBe(1)
    expect(p.equipos.a.minipuntos).toBe(0)
    expect(p.equipos.b.minipuntos).toBe(0)
    expect(p.historia[0]).toContain('¡Punto para Ellos!')
  })

  it('el equipo que no falla nunca se lleva el punto en tres palabras', () => {
    let p = arrancaPartida()
    for (let i = 0; i < 3; i++) {
      p = falla(p, 'tiempo', azarFijo([0.3])) // falla A
      if (p.turno === 'b') p = cantada(p) // B canta y devuelve
    }
    expect(p.equipos.b.puntos).toBe(1)
    expect(p.equipos.a.puntos).toBe(0)
  })

  it('la partida no se acaba sola: no hay meta ni ganador', () => {
    let p = arrancaPartida()
    for (let i = 0; i < 20; i++) p = falla(p, 'tiempo', azarFijo([0.3]))
    expect(p.equipos.a.puntos + p.equipos.b.puntos).toBe(4)
    expect(Object.keys(p)).not.toContain('ganador')
    expect(Object.keys(p)).not.toContain('meta')
  })
})

describe('el marcador a mano', () => {
  it('el moderador suma y resta puntos', () => {
    const p = ajustaPuntos(ajustaPuntos(arrancaPartida(), 'a', 1), 'a', 1)
    expect(p.equipos.a.puntos).toBe(2)
    expect(p.historia[0]).toContain('+1 a mano para Ellas')
  })

  it('no baja de cero, y si no cambia nada no apunta nada', () => {
    const inicial = arrancaPartida()
    const p = ajustaPuntos(inicial, 'b', -1)
    expect(p.equipos.b.puntos).toBe(0)
    expect(p).toBe(inicial)
  })

  it('no toca los minipuntos de la prueba en curso', () => {
    const conMini = falla(arrancaPartida(), 'tiempo', azarFijo([0.3]))
    const p = ajustaPuntos(conMini, 'b', 1)
    expect(p.equipos.b.minipuntos).toBe(conMini.equipos.b.minipuntos)
  })
})

describe('la palabra la pone el moderador', () => {
  it('se escribe y manda sobre la que había', () => {
    const p = ponPalabra(cantada(arrancaPartida()), '  Verbena ')
    expect(p.palabra).toBe('verbena')
    expect(p.cantadas).toBe(0)
    expect(p.turno).toBe(p.abre)
    expect(p.fin).toBeNull()
    expect(p.historia[0]).toContain('VERBENA')
  })

  it('queda marcada como usada, para que el azar no la repita', () => {
    const p = ponPalabra(arrancaPartida(), 'verbena')
    expect(p.usadas).toContain('verbena')
  })

  it('en blanco no hace nada', () => {
    const antes = arrancaPartida()
    expect(ponPalabra(antes, '   ')).toBe(antes)
  })
})

describe('cambiar una palabra imposible', () => {
  it('no mueve el marcador y devuelve el turno a quien abría', () => {
    const p = cantada(arrancaPartida())
    const nueva = cambiaPalabra(p, azarFijo([0.5]))
    expect(nueva.palabra).not.toBe(p.palabra)
    expect(nueva.turno).toBe(p.abre)
    expect(nueva.cantadas).toBe(0)
    expect(nueva.fin).toBeNull()
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
    const p = cantada(arrancaPartida())
    guardaPartida(p)
    expect(leePartida()).toEqual(p)
  })

  it('una partida de otra versión no se recupera', () => {
    localStorage.setItem('rural69-furor', JSON.stringify({ version: 1, palabra: 'amor' }))
    expect(leePartida()).toBeNull()
  })

  it('una basura cualquiera no rompe nada', () => {
    localStorage.setItem('rural69-furor', 'esto no es json')
    expect(leePartida()).toBeNull()
  })

  it('se puede borrar al terminar', () => {
    guardaPartida(arrancaPartida())
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
