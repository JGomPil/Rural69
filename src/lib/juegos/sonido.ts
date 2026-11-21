// =====================================================================
// Rural69 · Juegos · El timbre y la pantalla encendida
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
