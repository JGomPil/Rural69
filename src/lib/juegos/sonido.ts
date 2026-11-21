// =====================================================================
// Rural69 · Juegos · El pitido y la pantalla encendida
// ---------------------------------------------------------------------
// Dos cosas que un juego con cronómetro necesita en un móvil encima de
// una mesa: que se oiga cuando se acaba el tiempo —mirando el aparato no
// está nadie, están cantando— y que la pantalla no se apague sola a los
// treinta segundos.
//
// Todo va envuelto en `try`: si el navegador no deja (iOS es tacaño con
// el sonido y con el bloqueo de pantalla), el juego sigue igual, solo
// que en silencio. Nada de esto justifica romper una partida.
// =====================================================================

let contexto: AudioContext | null = null

/** El sonido se despierta con el primer toque del dedo; antes no deja. */
function pita(hz: number, segundos: number, volumen = 0.25): void {
  try {
    contexto ??= new AudioContext()
    if (contexto.state === 'suspended') void contexto.resume()
    const ahora = contexto.currentTime
    const onda = contexto.createOscillator()
    const ganancia = contexto.createGain()
    onda.type = 'sine'
    onda.frequency.value = hz
    ganancia.gain.setValueAtTime(0.0001, ahora)
    ganancia.gain.exponentialRampToValueAtTime(volumen, ahora + 0.01)
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + segundos)
    onda.connect(ganancia)
    ganancia.connect(contexto.destination)
    onda.start(ahora)
    onda.stop(ahora + segundos)
  } catch {
    // Sin sonido se juega igual.
  }
}

/** Los últimos segundos, que se note. */
export function tic(): void {
  pita(880, 0.08, 0.18)
}

/** Se acabó el tiempo. */
export function bocina(): void {
  pita(220, 0.55, 0.3)
  try {
    navigator.vibrate?.([120, 60, 220])
  } catch {
    // Los iPhone no vibran por web. Ya está el pitido.
  }
}

/** Punto para alguien. */
export function fanfarria(): void {
  pita(660, 0.12)
  setTimeout(() => pita(880, 0.22), 130)
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
