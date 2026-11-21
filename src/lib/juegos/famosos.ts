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
//
// Y no todos existen. Los personajes inventados son media baraja de un
// juego así —Superman o Darth Vader los conoce todo el mundo, de los
// quince a los setenta, mejor que a la mitad de los políticos— y además
// se prestan a preguntas que con gente real no funcionan: «¿soy
// humano?», «¿salgo en dibujos?», «¿tengo poderes?».
// =====================================================================

export const CATEGORIAS = ['cine', 'musica', 'deporte', 'historia', 'ficcion'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  cine: 'Cine y tele',
  musica: 'Música',
  deporte: 'Deportes',
  historia: 'Históricos',
  ficcion: 'De ficción',
}

export const EMOJI_CATEGORIA: Record<Categoria, string> = {
  cine: '🎬',
  musica: '🎵',
  deporte: '⚽',
  historia: '🏛️',
  ficcion: '🦸',
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
  { nombre: 'Brad Pitt', categoria: 'cine', pista: 'Estuvo casado con otra estrella muy famosa' },
  { nombre: 'Jim Carrey', categoria: 'cine', pista: 'La cara de goma de los noventa' },
  { nombre: 'Emma Watson', categoria: 'cine', pista: 'Creció haciendo de bruja en el cine' },
  { nombre: 'Dwayne Johnson', categoria: 'cine', pista: 'Enorme, venía de la lucha libre' },
  { nombre: 'Mario Casas', categoria: 'cine', pista: 'Actor español, moto y tres metros sobre algo' },
  { nombre: 'Belén Esteban', categoria: 'cine', pista: 'La princesa del pueblo, de los platós' },
  { nombre: 'David Broncano', categoria: 'cine', pista: 'Pregunta por el dinero y por otra cosa' },
  { nombre: 'Pablo Motos', categoria: 'cine', pista: 'Presenta con dos hormigas' },
  { nombre: 'Rosa María Mateo', categoria: 'cine', pista: 'Voz clásica de los telediarios' },
  
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
  { nombre: 'Aitana', categoria: 'musica', pista: 'Salió de un concurso de la tele y llenó estadios' },
  { nombre: 'Estopa', categoria: 'musica', pista: 'Dos hermanos de Cornellá con guitarras' },
  { nombre: 'Raphael', categoria: 'musica', pista: 'Señor de Linares que mueve mucho las manos' },
  { nombre: 'Enrique Iglesias', categoria: 'musica', pista: 'Hijo de otro cantante muy famoso' },
  { nombre: 'Lola Flores', categoria: 'musica', pista: 'La Faraona' },
  { nombre: 'Paco de Lucía', categoria: 'musica', pista: 'La mejor guitarra flamenca' },
  { nombre: 'Rihanna', categoria: 'musica', pista: 'De Barbados, cantó en la Super Bowl embarazada' },
  { nombre: 'Elton John', categoria: 'musica', pista: 'Gafas enormes y piano' },

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
  { nombre: 'Lamine Yamal', categoria: 'deporte', pista: 'Jovencísimo y ya titular' },
  { nombre: 'Jorge Lorenzo', categoria: 'deporte', pista: 'Motos, mallorquín, cinco títulos' },
  { nombre: 'Mireia Belmonte', categoria: 'deporte', pista: 'Natación, medallas olímpicas' },
  { nombre: 'Carolina Marín', categoria: 'deporte', pista: 'Bádminton, onubense, grita al ganar' },
  { nombre: 'Ronaldinho', categoria: 'deporte', pista: 'Brasileño que jugaba sonriendo' },
  { nombre: 'Muhammad Ali', categoria: 'deporte', pista: 'Boxeo: volar como una mariposa' },
  { nombre: 'Michael Phelps', categoria: 'deporte', pista: 'El de las muchas medallas en el agua' },
  { nombre: 'Pelé', categoria: 'deporte', pista: 'Brasileño, tres mundiales' },

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
  { nombre: 'Mozart', categoria: 'historia', pista: 'Niño prodigio con peluca' },
  { nombre: 'Beethoven', categoria: 'historia', pista: 'Compuso sordo' },
  { nombre: 'Vincent van Gogh', categoria: 'historia', pista: 'Girasoles y una oreja de menos' },
  { nombre: 'Galileo Galilei', categoria: 'historia', pista: 'Telescopio y un disgusto con la Iglesia' },
  { nombre: 'Rosa Parks', categoria: 'historia', pista: 'No se levantó del asiento del autobús' },
  { nombre: 'Martin Luther King', categoria: 'historia', pista: 'Tenía un sueño' },
  { nombre: 'Tutankamón', categoria: 'historia', pista: 'Faraón niño y una máscara de oro' },
  { nombre: 'Juana de Arco', categoria: 'historia', pista: 'Francesa con armadura y mal final' },
  // --- De ficción: inventados, pero más conocidos que mucha gente real ---
  { nombre: 'Superman', categoria: 'ficcion', pista: 'Capa roja y viene de otro planeta' },
  { nombre: 'Batman', categoria: 'ficcion', pista: 'Murciélago, millonario y sin poderes' },
  { nombre: 'Spiderman', categoria: 'ficcion', pista: 'Le picó un bicho y se pega a las paredes' },
  { nombre: 'Darth Vader', categoria: 'ficcion', pista: 'Respira fuerte y es el padre de alguien' },
  { nombre: 'Yoda', categoria: 'ficcion', pista: 'Pequeño, verde y habla del revés' },
  { nombre: 'Chewbacca', categoria: 'ficcion', pista: 'Peludo, copiloto y no se le entiende' },
  { nombre: 'Harry Potter', categoria: 'ficcion', pista: 'Gafas, cicatriz y un colegio con escobas' },
  { nombre: 'Hermione Granger', categoria: 'ficcion', pista: 'La que se sabe todos los hechizos' },
  { nombre: 'Gandalf', categoria: 'ficcion', pista: 'Mago con barba: «¡no pasarás!»' },
  { nombre: 'Gollum', categoria: 'ficcion', pista: 'Obsesionado con un anillo, «mi tesoro»' },
  { nombre: 'Indiana Jones', categoria: 'ficcion', pista: 'Sombrero, látigo y arqueología' },
  { nombre: 'James Bond', categoria: 'ficcion', pista: 'Espía con licencia y martini' },
  { nombre: 'Rocky Balboa', categoria: 'ficcion', pista: 'Boxeador de Filadelfia que sube escaleras' },
  { nombre: 'Forrest Gump', categoria: 'ficcion', pista: 'Corre mucho y la vida es una caja de bombones' },
  { nombre: 'Jack Sparrow', categoria: 'ficcion', pista: 'Pirata que camina raro' },
  { nombre: 'Shrek', categoria: 'ficcion', pista: 'Ogro verde con un burro de amigo' },
  { nombre: 'Buzz Lightyear', categoria: 'ficcion', pista: 'Juguete astronauta: «hasta el infinito»' },
  { nombre: 'Woody', categoria: 'ficcion', pista: 'Vaquero de juguete con sombrero' },
  { nombre: 'Mickey Mouse', categoria: 'ficcion', pista: 'Ratón con guantes blancos y orejas redondas' },
  { nombre: 'Bob Esponja', categoria: 'ficcion', pista: 'Vive en una piña debajo del mar' },
  { nombre: 'Pikachu', categoria: 'ficcion', pista: 'Amarillo, eléctrico y cabe en una bola' },
  { nombre: 'Son Goku', categoria: 'ficcion', pista: 'Se le pone el pelo rubio cuando se enfada' },
  { nombre: 'Super Mario', categoria: 'ficcion', pista: 'Fontanero con bigote y gorra roja' },
  { nombre: 'Sonic', categoria: 'ficcion', pista: 'Erizo azul que corre muchísimo' },
  { nombre: 'Doraemon', categoria: 'ficcion', pista: 'Gato cósmico con bolsillo mágico' },
  { nombre: 'Bugs Bunny', categoria: 'ficcion', pista: 'Conejo con zanahoria: «¿qué hay de nuevo?»' },
  { nombre: 'Scooby-Doo', categoria: 'ficcion', pista: 'Perro miedica que resuelve misterios' },
  { nombre: 'Homer Simpson', categoria: 'ficcion', pista: 'Amarillo, donuts y cerveza Duff' },
  { nombre: 'Bart Simpson', categoria: 'ficcion', pista: 'Niño amarillo con monopatín y pizarra' },
  { nombre: 'Mortadelo', categoria: 'ficcion', pista: 'Se disfraza de todo, agencia de la TIA' },
  { nombre: 'Astérix', categoria: 'ficcion', pista: 'Galo pequeño con poción mágica' },
  { nombre: 'Obélix', categoria: 'ficcion', pista: 'Galo grande que reparte menhires' },
  { nombre: 'Tintín', categoria: 'ficcion', pista: 'Reportero con tupé y perro blanco' },
  { nombre: 'Mafalda', categoria: 'ficcion', pista: 'Niña argentina que odia la sopa' },
  { nombre: 'Don Quijote', categoria: 'ficcion', pista: 'Manchego que ataca molinos' },
  { nombre: 'Sancho Panza', categoria: 'ficcion', pista: 'Escudero bajito con burro' },
  { nombre: 'Sherlock Holmes', categoria: 'ficcion', pista: 'Detective de Londres con lupa y pipa' },
  { nombre: 'Walter White', categoria: 'ficcion', pista: 'Profesor de química con sombrero y caravana' },
  { nombre: 'El Profesor', categoria: 'ficcion', pista: 'Planea el atraco a la Fábrica de Moneda' },
  { nombre: 'Terminator', categoria: 'ficcion', pista: 'Robot con acento: «volveré»' },
  { nombre: 'E.T.', categoria: 'ficcion', pista: 'Quiere llamar a su casa' },
  { nombre: 'Mr. Bean', categoria: 'ficcion', pista: 'Casi no habla y tiene un coche amarillo' },
  { nombre: 'Elsa', categoria: 'ficcion', pista: 'Princesa del hielo, canción muy repetida' },
  { nombre: 'Simba', categoria: 'ficcion', pista: 'León pequeño que será rey' },
  { nombre: 'Blancanieves', categoria: 'ficcion', pista: 'Siete amigos bajitos y una manzana' },
  { nombre: 'Campanilla', categoria: 'ficcion', pista: 'Hada diminuta amiga de un niño que vuela' },
  { nombre: 'Papá Noel', categoria: 'ficcion', pista: 'Barba blanca, trineo y chimeneas' },
  { nombre: 'Drácula', categoria: 'ficcion', pista: 'Capa, colmillos y Transilvania' },
  { nombre: 'Frankenstein', categoria: 'ficcion', pista: 'Lo cosieron y lo levantó un rayo' },
  { nombre: 'King Kong', categoria: 'ficcion', pista: 'Gorila gigante subido a un rascacielos' },
  { nombre: 'Peppa Pig', categoria: 'ficcion', pista: 'Cerdita rosa que salta en charcos' },
  { nombre: 'Hulk', categoria: 'ficcion', pista: 'Se pone verde cuando se enfada' },
  { nombre: 'Wonder Woman', categoria: 'ficcion', pista: 'Amazona con lazo y brazaletes' },
  { nombre: 'Catwoman', categoria: 'ficcion', pista: 'Ladrona con traje de gato' },
]

/** Las cartas de una categoría, o la baraja entera si van mezcladas. */
export function cartasDe(categoria: Categoria | 'mezclado'): Carta[] {
  return categoria === 'mezclado' ? BARAJA : BARAJA.filter((c) => c.categoria === categoria)
}
