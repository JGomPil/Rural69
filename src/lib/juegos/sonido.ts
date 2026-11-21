// =====================================================================
// Rural69 · Juegos · Los sonidos y la pantalla encendida
// ---------------------------------------------------------------------
// Dos cosas que un juego con cronómetro necesita en un móvil encima de
// una mesa: que se OIGA cuando se acaba el tiempo —mirando el aparato
// no está nadie, están cantando a gritos— y que la pantalla no se
// apague sola a los treinta segundos.
//
// El aviso del final no es un pitido educado: son tres repiques de dos
// tonos, como un timbre, con onda cuadrada, que es la que se abre paso
// entre once personas. Los tonos se programan con el reloj del propio
// sonido en lugar de con `setTimeout`, para que no se descuadren.
//
// Todo va envuelto en `try`: si el navegador no deja, el juego sigue.
// Dos avisos que no se pueden arreglar desde aquí: en iPhone, el
// interruptor de silencio del lateral calla también esto, y el sonido
// no arranca hasta que alguien toca la pantalla —por eso se despierta
// en el primer botón que se pulsa—.
// =====================================================================

let contexto: AudioContext | null = null

function dameContexto(): AudioContext | null {
  try {
    contexto ??= new AudioContext()
    if (contexto.state === 'suspended') void contexto.resume()
    return contexto
  } catch {
    return null
  }
}

/** Se llama desde un botón: sin un toque previo, iOS no deja sonar nada. */
export function despiertaElSonido(): void {
  dameContexto()
}

type Onda = 'sine' | 'square' | 'triangle'

function pita(hz: number, segundos: number, volumen: number, retraso = 0, onda: Onda = 'sine'): void {
  const ctx = dameContexto()
  if (!ctx) return
  try {
    const cuando = ctx.currentTime + retraso
    const osc = ctx.createOscillator()
    const ganancia = ctx.createGain()
    osc.type = onda
    osc.frequency.value = hz
    ganancia.gain.setValueAtTime(0.0001, cuando)
    ganancia.gain.exponentialRampToValueAtTime(volumen, cuando + 0.012)
    ganancia.gain.exponentialRampToValueAtTime(0.0001, cuando + segundos)
    osc.connect(ganancia)
    ganancia.connect(ctx.destination)
    osc.start(cuando)
    osc.stop(cuando + segundos + 0.02)
  } catch {
    // Sin sonido se juega igual.
  }
}

/** Los últimos segundos, que se note. */
export function tic(): void {
  pita(880, 0.08, 0.2)
}

/**
 * SE ACABÓ EL TIEMPO. Esto tiene que oírse desde la cocina: tres
 * repiques de dos tonos, onda cuadrada y casi dos segundos.
 */
export function timbre(): void {
  for (let repique = 0; repique < 3; repique++) {
    const base = repique * 0.62
    for (let i = 0; i < 3; i++) {
      pita(i % 2 === 0 ? 1047 : 784, 0.17, 0.42, base + i * 0.18, 'square')
    }
  }
  try {
    navigator.vibrate?.([250, 100, 250, 100, 400])
  } catch {
    // Los iPhone no vibran por web. Ya está el timbre.
  }
}

/** Punto para alguien. */
export function fanfarria(): void {
  pita(660, 0.12, 0.3, 0, 'triangle')
  pita(880, 0.24, 0.3, 0.13, 'triangle')
}

// --- Los del Trivial -------------------------------------------------
// Un juego de tablero sin ruido se queda a medias: el dado que rueda, el
// «tac» de marcar una respuesta y el veredicto son parte de jugar. Van
// todos cortos y bajitos a propósito, porque suenan a la vez en diez
// móviles alrededor de la misma mesa; el único que grita es el timbre
// del tiempo, y para eso está.

let ruidoBlanco: AudioBuffer | null = null

/** Un golpe seco de ruido: la madera del dado contra la mesa. */
function golpe(segundos: number, volumen: number, retraso: number, hz: number): void {
  const ctx = dameContexto()
  if (!ctx) return
  try {
    if (!ruidoBlanco) {
      ruidoBlanco = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const datos = ruidoBlanco.getChannelData(0)
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
    }
    const cuando = ctx.currentTime + retraso
    const fuente = ctx.createBufferSource()
    fuente.buffer = ruidoBlanco
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = hz
    filtro.Q.value = 1.4
    const ganancia = ctx.createGain()
    ganancia.gain.setValueAtTime(volumen, cuando)
    ganancia.gain.exponentialRampToValueAtTime(0.0001, cuando + segundos)
    fuente.connect(filtro)
    filtro.connect(ganancia)
    ganancia.connect(ctx.destination)
    fuente.start(cuando)
    fuente.stop(cuando + segundos + 0.02)
  } catch {
    // Sin sonido se juega igual.
  }
}

/** El dado rodando y parándose. */
export function dados(): void {
  const rebotes = [0, 0.055, 0.115, 0.17, 0.235, 0.305]
  rebotes.forEach((cuando, i) => {
    golpe(0.07, 0.3 - i * 0.03, cuando, 1500 + Math.random() * 900)
  })
  // El último, más grave: ya se ha parado.
  golpe(0.16, 0.26, 0.4, 420)
  pita(160, 0.1, 0.12, 0.4, 'triangle')
}

/** El «tac» de marcar una respuesta. Solo para quien la pulsa. */
export function toque(): void {
  pita(1320, 0.05, 0.14)
}

/**
 * Acierto. El `paso` sube el tono, que es lo que hace que las cinco
 * preguntas del desafío del centro se vivan como una escalera y no
 * como cinco veces lo mismo.
 */
export function acierto(paso = 0): void {
  const subida = 1 + paso * 0.09
  pita(660 * subida, 0.1, 0.26, 0, 'triangle')
  pita(880 * subida, 0.18, 0.26, 0.1, 'triangle')
}

/** Fallo: dos tonos que bajan, sin saña. */
export function fallo(): void {
  pita(300, 0.14, 0.24, 0, 'square')
  pita(190, 0.26, 0.22, 0.13, 'square')
}

/** Quesito ganado. Tiene que sonar mejor que un acierto normal. */
export function quesito(): void {
  pita(784, 0.1, 0.28, 0, 'triangle')
  pita(988, 0.1, 0.28, 0.1, 'triangle')
  pita(1319, 0.28, 0.3, 0.2, 'triangle')
}

/** Al centro con los cinco: redoble corto, que se note que viene lo gordo. */
export function redoble(): void {
  for (let i = 0; i < 7; i++) golpe(0.06, 0.16 + i * 0.015, i * 0.065, 260)
  pita(523, 0.3, 0.26, 0.5, 'triangle')
  pita(698, 0.34, 0.26, 0.62, 'triangle')
}

/** Te toca a ti. Suena solo en tu móvil, que para eso lo tienes. */
export function teToca(): void {
  pita(587, 0.09, 0.2, 0, 'sine')
  pita(880, 0.16, 0.2, 0.1, 'sine')
  try {
    navigator.vibrate?.(120)
  } catch {
    // Los iPhone no vibran por web.
  }
}

// --- Que no se apague la pantalla ------------------------------------

type Cerrojo = { release: () => Promise<void> }
type NavegadorConCerrojo = Navigator & { wakeLock?: { request: (tipo: 'screen') => Promise<Cerrojo> } }

let cerrojo: Cerrojo | null = null

export async function mantenLaPantalla(encendida: boolean): Promise<void> {
  try {
    const nav = navigator as NavegadorConCerrojo
    if (!nav.wakeLock) return
    if (encendida && !cerrojo) cerrojo = await nav.wakeLock.request('screen')
    if (!encendida && cerrojo) {
      await cerrojo.release()
      cerrojo = null
    }
  } catch {
    // Si el navegador no quiere, que se apague: no es grave.
    cerrojo = null
  }
}
