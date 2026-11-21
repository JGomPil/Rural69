// =====================================================================
// Rural69 · ¿Quién soy? · La baraja
// ---------------------------------------------------------------------
// El criterio de esta lista es el mismo que el de las palabras del
// Furor, y es el que decide si el juego funciona: que cualquiera de la
// mesa —incluidos los de cincuenta y los de quince— sepa quién es sin
// tener que explicarlo. Mejor conocidos de sobra que originales.
//
// Van mezclados españoles e internacionales a propósito, y cada carta
// lleva una pista corta por si el que la tiene se atasca del todo.
// =====================================================================

export const CATEGORIAS = ['cine', 'musica', 'deporte', 'historia'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  cine: 'Cine y tele',
  musica: 'Música',
  deporte: 'Deportes',
  historia: 'Históricos',
}

export const EMOJI_CATEGORIA: Record<Categoria, string> = {
  cine: '🎬',
  musica: '🎵',
  deporte: '⚽',
  historia: '🏛️',
}

export interface Carta {
  nombre: string
  categoria: Categoria
  /** Una pista corta, por si se atasca. No es la respuesta. */
  pista: string
}

export const BARAJA: Carta[] = [
  // --- Cine y tele ---
  { nombre: 'Penélope Cruz', categoria: 'cine', pista: 'Actriz española con un Óscar' },
  { nombre: 'Javier Bardem', categoria: 'cine', pista: 'Actor español con un Óscar' },
  { nombre: 'Antonio Banderas', categoria: 'cine', pista: 'De Málaga a Hollywood' },
  { nombre: 'Pedro Almodóvar', categoria: 'cine', pista: 'Director de cine muy reconocible' },
  { nombre: 'Santiago Segura', categoria: 'cine', pista: 'Dirige y actúa, y hace mucha taquilla' },
  { nombre: 'Úrsula Corberó', categoria: 'cine', pista: 'Serie de atracadores con mono rojo' },
  { nombre: 'Leonardo DiCaprio', categoria: 'cine', pista: 'Tardó mucho en ganar su Óscar' },
  { nombre: 'Tom Cruise', categoria: 'cine', pista: 'Se hace él mismo las escenas de riesgo' },
  { nombre: 'Julia Roberts', categoria: 'cine', pista: 'La sonrisa más famosa de los noventa' },
  { nombre: 'Will Smith', categoria: 'cine', pista: 'Empezó en una serie de los noventa' },
  { nombre: 'Scarlett Johansson', categoria: 'cine', pista: 'Superheroína de traje negro' },
  { nombre: 'Keanu Reeves', categoria: 'cine', pista: 'Pastillas roja y azul' },
  { nombre: 'Meryl Streep', categoria: 'cine', pista: 'La actriz con más nominaciones' },
  { nombre: 'Chiquito de la Calzada', categoria: 'cine', pista: 'Humorista malagueño, «fistro»' },
  { nombre: 'Rosa María Mateo', categoria: 'cine', pista: 'Voz clásica de los telediarios' },
  { nombre: 'Mr. Bean', categoria: 'cine', pista: 'Casi no habla y tiene un coche amarillo' },
  { nombre: 'Darth Vader', categoria: 'cine', pista: 'Respira fuerte y es el padre de alguien' },
  { nombre: 'Homer Simpson', categoria: 'cine', pista: 'Dibujo animado amarillo, le gustan los donuts' },

  // --- Música ---
  { nombre: 'Rosalía', categoria: 'musica', pista: 'Flamenco pasado por otro sitio' },
  { nombre: 'Alejandro Sanz', categoria: 'musica', pista: 'Canta «Corazón partío»' },
  { nombre: 'Shakira', categoria: 'musica', pista: 'Colombiana, caderas que no mienten' },
  { nombre: 'Joaquín Sabina', categoria: 'musica', pista: 'Sombrero, Úbeda y mucha noche' },
  { nombre: 'Rocío Jurado', categoria: 'musica', pista: 'La más grande de la copla' },
  { nombre: 'Camarón de la Isla', categoria: 'musica', pista: 'Leyenda del flamenco' },
  { nombre: 'David Bisbal', categoria: 'musica', pista: 'Almeriense de Operación Triunfo' },
  { nombre: 'Melendi', categoria: 'musica', pista: 'Asturiano de voz rota' },
  { nombre: 'Quevedo', categoria: 'musica', pista: 'Canario, una sesión que arrasó' },
  { nombre: 'Julio Iglesias', categoria: 'musica', pista: 'Vendió discos en medio mundo' },
  { nombre: 'Freddie Mercury', categoria: 'musica', pista: 'Cantante de una banda con reina en el nombre' },
  { nombre: 'Michael Jackson', categoria: 'musica', pista: 'El guante y el paso hacia atrás' },
  { nombre: 'Madonna', categoria: 'musica', pista: 'Lleva décadas reinventándose' },
  { nombre: 'Beyoncé', categoria: 'musica', pista: 'Empezó en un grupo de chicas' },
  { nombre: 'Bad Bunny', categoria: 'musica', pista: 'Puertorriqueño, reguetón' },
  { nombre: 'Taylor Swift', categoria: 'musica', pista: 'Sus giras llenan estadios enteros' },
  { nombre: 'Bob Marley', categoria: 'musica', pista: 'Reggae y Jamaica' },
  { nombre: 'Elvis Presley', categoria: 'musica', pista: 'El rey del rock and roll' },

  // --- Deportes ---
  { nombre: 'Rafa Nadal', categoria: 'deporte', pista: 'Mallorquín, tierra batida' },
  { nombre: 'Lionel Messi', categoria: 'deporte', pista: 'Argentino, zurdo, bajito' },
  { nombre: 'Cristiano Ronaldo', categoria: 'deporte', pista: 'Portugués, celebra saltando' },
  { nombre: 'Iker Casillas', categoria: 'deporte', pista: 'Paró en la final de Sudáfrica' },
  { nombre: 'Andrés Iniesta', categoria: 'deporte', pista: 'Marcó el gol más importante' },
  { nombre: 'Fernando Alonso', categoria: 'deporte', pista: 'Asturiano, dos veces campeón' },
  { nombre: 'Pau Gasol', categoria: 'deporte', pista: 'Muy alto, jugó en la NBA' },
  { nombre: 'Carlos Alcaraz', categoria: 'deporte', pista: 'Murciano, joven y ya número uno' },
  { nombre: 'Marc Márquez', categoria: 'deporte', pista: 'Dos ruedas y codo al suelo' },
  { nombre: 'Alexia Putellas', categoria: 'deporte', pista: 'Balón de Oro del fútbol femenino' },
  { nombre: 'Miguel Indurain', categoria: 'deporte', pista: 'Navarro, cinco Tours seguidos' },
  { nombre: 'Severiano Ballesteros', categoria: 'deporte', pista: 'Golf, cántabro, leyenda' },
  { nombre: 'Usain Bolt', categoria: 'deporte', pista: 'Jamaicano, el más rápido' },
  { nombre: 'Michael Jordan', categoria: 'deporte', pista: 'Baloncesto, el número 23' },
  { nombre: 'Diego Armando Maradona', categoria: 'deporte', pista: 'La mano de Dios' },
  { nombre: 'Serena Williams', categoria: 'deporte', pista: 'Tenista estadounidense dominante' },

  // --- Históricos ---
  { nombre: 'Cristóbal Colón', categoria: 'historia', pista: 'Tres carabelas y el año 1492' },
  { nombre: 'Cleopatra', categoria: 'historia', pista: 'Egipto, la última reina' },
  { nombre: 'Napoleón Bonaparte', categoria: 'historia', pista: 'Francés bajito con la mano en la chaqueta' },
  { nombre: 'Albert Einstein', categoria: 'historia', pista: 'Pelo revuelto y relatividad' },
  { nombre: 'Marie Curie', categoria: 'historia', pista: 'Dos Nobel, radiactividad' },
  { nombre: 'Frida Kahlo', categoria: 'historia', pista: 'Pintora mexicana, autorretratos' },
  { nombre: 'Pablo Picasso', categoria: 'historia', pista: 'Malagueño, el Guernica' },
  { nombre: 'Salvador Dalí', categoria: 'historia', pista: 'Bigote y relojes blandos' },
  { nombre: 'Miguel de Cervantes', categoria: 'historia', pista: 'Escribió sobre molinos' },
  { nombre: 'Leonardo da Vinci', categoria: 'historia', pista: 'Pintó una sonrisa famosa' },
  { nombre: 'Juana la Loca', categoria: 'historia', pista: 'Reina de Castilla, mal apodo' },
  { nombre: 'Nelson Mandela', categoria: 'historia', pista: 'Sudáfrica, 27 años preso' },
  { nombre: 'Julio César', categoria: 'historia', pista: 'Romano, los idus de marzo' },
  { nombre: 'Gandhi', categoria: 'historia', pista: 'India y la no violencia' },
  { nombre: 'Isabel la Católica', categoria: 'historia', pista: 'Reina, y financió un viaje' },
  { nombre: 'Federico García Lorca', categoria: 'historia', pista: 'Poeta granadino' },
]

/** Las cartas de una categoría, o la baraja entera si van mezcladas. */
export function cartasDe(categoria: Categoria | 'mezclado'): Carta[] {
  return categoria === 'mezclado' ? BARAJA : BARAJA.filter((c) => c.categoria === categoria)
}
