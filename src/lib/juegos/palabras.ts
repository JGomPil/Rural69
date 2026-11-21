// =====================================================================
// Rural69 · Furor · Las palabras
// ---------------------------------------------------------------------
// La prueba del programa se llamaba «Tienes la palabra»: el presentador
// decía una palabra y los equipos cantaban por turnos canciones que la
// contuvieran. Así que todo el juego depende de esta lista, y una
// palabra mala lo estropea.
//
// El criterio para que una palabra entre aquí es uno solo: que a
// cualquiera se le ocurran tres canciones en castellano con ella sin
// pensar. Nada de palabras bonitas pero raras —«crepúsculo», «anhelo»—,
// que dejan a once personas mirándose en silencio, y nada tan común que
// valga cualquier canción («de», «que»).
//
// Están en minúsculas y sin tilde ninguna de adorno: se enseñan tal cual
// y en mayúsculas en la pantalla.
// =====================================================================

export const PALABRAS: string[] = [
  // --- El corazón del cancionero ---
  'amor', 'corazón', 'vida', 'alma', 'beso', 'besar', 'querer', 'amar',
  'cariño', 'olvidar', 'recuerdo', 'pena', 'llorar', 'lágrima', 'dolor',
  'suerte', 'destino', 'sueño', 'soñar', 'esperar', 'volver', 'quedarse',
  'adiós', 'nunca', 'siempre', 'jamás',

  // --- Lo que se ve por la ventana ---
  'luna', 'sol', 'estrella', 'cielo', 'mar', 'playa', 'arena', 'río',
  'lluvia', 'viento', 'nube', 'fuego', 'tierra', 'montaña', 'campo',
  'flor', 'rosa', 'árbol', 'jardín',

  // --- La hora y el día ---
  'noche', 'madrugada', 'mañana', 'tarde', 'verano', 'invierno',
  'primavera', 'otoño', 'ayer', 'hoy', 'domingo', 'sábado', 'año',
  'tiempo', 'hora', 'minuto',

  // --- La gente ---
  'niña', 'niño', 'mujer', 'hombre', 'madre', 'padre', 'amigo', 'gente',
  'nadie', 'alguien', 'nombre', 'reina', 'rey', 'ladrón', 'loco',

  // --- El cuerpo ---
  'ojos', 'boca', 'manos', 'pelo', 'piel', 'labios', 'pies', 'sangre',
  'cara', 'voz',

  // --- Lo que se hace ---
  'bailar', 'cantar', 'reír', 'correr', 'volar', 'caminar', 'buscar',
  'perder', 'ganar', 'beber', 'dormir', 'despertar', 'gritar', 'mirar',
  'esperando', 'bésame',

  // --- Los sitios ---
  'casa', 'calle', 'ciudad', 'pueblo', 'puerta', 'ventana', 'cama',
  'camino', 'carretera', 'barrio', 'bar', 'tren', 'barco', 'coche',
  'avión', 'frontera', 'españa', 'méxico', 'sevilla', 'madrid',

  // --- La fiesta ---
  'fiesta', 'baile', 'música', 'canción', 'guitarra', 'tambor', 'radio',
  'vino', 'copa', 'cerveza', 'café', 'azúcar', 'sal', 'pan', 'limón',

  // --- Colores y cosas sueltas ---
  'blanco', 'negro', 'azul', 'rojo', 'verde', 'dorado', 'oro', 'plata',
  'dinero', 'cadena', 'anillo', 'carta', 'teléfono', 'foto', 'espejo',
  'cristal', 'puente', 'llave', 'maleta', 'sombrero', 'zapatos', 'camisa',
  'perro', 'gato', 'caballo', 'pájaro', 'paloma', 'toro', 'mariposa',

  // --- De las que calientan la sala ---
  'guapa', 'loca', 'veneno', 'infierno', 'gloria', 'santa',
  'diablo', 'ángel', 'milagro', 'guerra', 'paz', 'libertad', 'bandera',
]

/** Las que ya salieron no repiten hasta que se acaban todas. */
export function eligePalabra(usadas: string[], azar: () => number = Math.random): string {
  const quedan = PALABRAS.filter((p) => !usadas.includes(p))
  const bolsa = quedan.length > 0 ? quedan : PALABRAS
  return bolsa[Math.floor(azar() * bolsa.length) % bolsa.length]
}
