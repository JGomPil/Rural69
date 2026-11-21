#!/usr/bin/env node
// =====================================================================
// Rural69 · El repertorio de «¿Qué peli suena?»
// ---------------------------------------------------------------------
// La lista de películas se escribe aquí a mano —título, años, qué tema
// suena y de quién es— y este script la resuelve contra la tienda de
// Apple para quedarse con el identificador de cada canción y su preview
// de 30 segundos, que es lo que el juego reproduce.
//
// Por qué guardar el identificador y no solo la URL: las URL de preview
// cambian de vez en cuando, y con el id se puede volver a preguntar
// (`/lookup?id=…`) y recuperar una nueva sin tocar el código.
//
// La trampa de esto es la tienda misma: buscar «Piratas del Caribe»
// devuelve cuatro orquestas de tributo antes que la banda sonora. Por
// eso cada ficha lleva el autor y aquí se puntúan los candidatos: la
// banda original gana, las versiones restan.
//
//   node scripts/bandas-sonoras.mjs            (revisar en pantalla)
//   node scripts/bandas-sonoras.mjs --escribe  (guardar el JSON)
// =====================================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DESTINO = join(AQUI, '..', 'src', 'lib', 'juegos', 'bandas.json')

// peli: cómo se llama en España · alias: cómo la llama el resto del mundo
// tema/autor: qué buscar en la tienda · anyo: para el remate de la ronda
// busca: el artista con el que preguntar, cuando no es quien firma el tema
const PELICULAS = [
  { peli: 'La guerra de las galaxias', alias: ['Star Wars'], anyo: 1977, tema: 'Main Title', autor: 'John Williams' },
  { peli: 'Indiana Jones', alias: ['En busca del arca perdida'], anyo: 1981, tema: 'Raiders March', autor: 'John Williams' },
  { peli: 'Tiburón', alias: ['Jaws'], anyo: 1975, tema: 'Main Title (Theme From Jaws)', autor: 'John Williams' },
  { peli: 'E.T.', alias: ['ET', 'El extraterrestre'], anyo: 1982, tema: 'Flying Theme', autor: 'John Williams' },
  { peli: 'Parque Jurásico', alias: ['Jurassic Park'], anyo: 1993, tema: 'Theme from Jurassic Park', autor: 'John Williams' },
  { peli: 'Superman', alias: [], anyo: 1978, tema: 'Theme from Superman', autor: 'John Williams' },
  { peli: 'Harry Potter', alias: [], anyo: 2001, tema: "Hedwig's Theme", autor: 'John Williams' },
  { peli: 'La lista de Schindler', alias: [], anyo: 1993, tema: "Theme from Schindler's List", autor: 'John Williams' },
  { peli: 'Solo en casa', alias: ['Home Alone'], anyo: 1990, tema: 'Somewhere in My Memory', autor: 'John Williams' },
  { peli: 'Regreso al futuro', alias: ['Back to the Future'], anyo: 1985, tema: 'Back to the Future', autor: 'Alan Silvestri' },
  { peli: 'Forrest Gump', alias: [], anyo: 1994, tema: 'Forrest Gump Suite', autor: 'Alan Silvestri' },
  { peli: 'Los Vengadores', alias: ['Vengadores', 'Avengers'], anyo: 2012, tema: 'The Avengers', autor: 'Alan Silvestri' },
  { peli: 'Rocky', alias: [], anyo: 1976, tema: 'Gonna Fly Now', autor: 'Bill Conti' },
  { peli: 'Piratas del Caribe', alias: [], anyo: 2003, tema: "He's a Pirate", autor: 'Klaus Badelt' },
  { peli: 'El Señor de los Anillos', alias: ['Lord of the Rings'], anyo: 2001, tema: 'Concerning Hobbits', autor: 'Howard Shore' },
  { peli: 'El Padrino', alias: ['The Godfather'], anyo: 1972, tema: 'Love Theme from The Godfather', autor: 'Nino Rota' },
  { peli: 'Misión Imposible', alias: ['Mission Impossible'], anyo: 1996, tema: 'Mission: Impossible Theme', autor: 'Lalo Schifrin' },
  { peli: 'James Bond', alias: ['007', 'Agente 007'], anyo: 1962, tema: 'James Bond Theme', autor: 'Monty Norman' },
  { peli: 'Titanic', alias: [], anyo: 1997, tema: 'My Heart Will Go On', autor: 'Céline Dion' },
  { peli: 'Gladiator', alias: ['El gladiador'], anyo: 2000, tema: 'Now We Are Free', autor: 'Hans Zimmer' },
  { peli: 'Interstellar', alias: [], anyo: 2014, tema: 'Cornfield Chase', autor: 'Hans Zimmer' },
  { peli: 'El rey león', alias: ['Lion King'], anyo: 1994, tema: 'Circle of Life', autor: 'Elton John' },
  { peli: 'Grease', alias: [], anyo: 1978, tema: "You're the One That I Want", autor: 'John Travolta' },
  { peli: 'Dirty Dancing', alias: [], anyo: 1987, tema: '(I’ve Had) The Time of My Life', autor: 'Bill Medley' },
  { peli: 'Fiebre del sábado noche', alias: ['Saturday Night Fever'], anyo: 1977, tema: "Stayin' Alive", autor: 'Bee Gees' },
  { peli: 'Flashdance', alias: [], anyo: 1983, tema: 'Flashdance... What a Feeling', autor: 'Irene Cara' },
  { peli: 'Footloose', alias: [], anyo: 1984, tema: 'Footloose', autor: 'Kenny Loggins' },
  { peli: 'Pulp Fiction', alias: [], anyo: 1994, tema: 'Misirlou', autor: 'Dick Dale' },
  { peli: 'Psicosis', alias: ['Psycho'], anyo: 1960, tema: 'The Murder', autor: 'Bernard Herrmann' },
  { peli: 'Halloween', alias: [], anyo: 1978, tema: 'Halloween Theme', autor: 'John Carpenter' },
  { peli: 'Los cazafantasmas', alias: ['Ghostbusters'], anyo: 1984, tema: 'Ghostbusters', autor: 'Ray Parker Jr.' },
  { peli: 'Men in Black', alias: ['Hombres de negro'], anyo: 1997, tema: 'Men in Black', autor: 'Will Smith' },
  { peli: 'El guardaespaldas', alias: ['The Bodyguard'], anyo: 1992, tema: 'I Will Always Love You', autor: 'Whitney Houston' },
  { peli: 'Pretty Woman', alias: [], anyo: 1990, tema: 'Oh, Pretty Woman', autor: 'Roy Orbison' },
  { peli: 'Top Gun', alias: [], anyo: 1986, tema: 'Danger Zone', autor: 'Kenny Loggins' },
  { peli: 'Terminator 2', alias: ['Terminator'], anyo: 1991, tema: 'Main Title', autor: 'Brad Fiedel' },
  { peli: 'Matrix', alias: [], anyo: 1999, tema: 'Clubbed to Death', autor: 'Rob Dougan' },
  { peli: 'Blade Runner', alias: [], anyo: 1982, tema: 'Main Titles', autor: 'Vangelis' },
  { peli: 'Carros de fuego', alias: ['Chariots of Fire'], anyo: 1981, tema: 'Chariots of Fire', autor: 'Vangelis' },
  // De esta no hay banda sonora: hay grabaciones de Strauss, firmadas por la
  // orquesta, y el amanecer es el primer movimiento. De ahí el `busca`.
  { peli: '2001: Una odisea del espacio', alias: ['2001'], anyo: 1968, tema: 'Also sprach Zarathustra, Op. 30, TrV 176: I. Einleitung', autor: 'Richard Strauss', busca: 'Boston Symphony Orchestra' },
  { peli: 'La pantera rosa', alias: ['Pink Panther'], anyo: 1963, tema: 'The Pink Panther Theme', autor: 'Henry Mancini' },
  { peli: 'Desayuno con diamantes', alias: [], anyo: 1961, tema: 'Moon River', autor: 'Henry Mancini' },
  { peli: 'Cantando bajo la lluvia', alias: ['Singin in the Rain'], anyo: 1952, tema: "Singin' in the Rain", autor: 'Gene Kelly' },
  { peli: 'Sonrisas y lágrimas', alias: ['The Sound of Music'], anyo: 1965, tema: 'Do-Re-Mi', autor: 'Julie Andrews' },
  { peli: 'Mary Poppins', alias: [], anyo: 1964, tema: 'Supercalifragilisticexpialidocious', autor: 'Julie Andrews' },
  { peli: 'El mago de Oz', alias: [], anyo: 1939, tema: 'Over the Rainbow', autor: 'Judy Garland' },
  { peli: 'Casablanca', alias: [], anyo: 1942, tema: 'As Time Goes By', autor: 'Dooley Wilson' },
  { peli: 'El bueno, el feo y el malo', alias: [], anyo: 1966, tema: 'The Good, the Bad and the Ugly', autor: 'Ennio Morricone' },
  { peli: 'Hasta que llegó su hora', alias: ['Érase una vez en el Oeste'], anyo: 1968, tema: "Once Upon a Time in the West", autor: 'Ennio Morricone' },
  { peli: 'Cinema Paradiso', alias: [], anyo: 1988, tema: 'Cinema Paradiso', autor: 'Ennio Morricone' },
  { peli: 'La misión', alias: ['The Mission'], anyo: 1986, tema: "Gabriel's Oboe", autor: 'Ennio Morricone' },
  { peli: 'La vida es bella', alias: [], anyo: 1997, tema: 'La vita è bella', autor: 'Nicola Piovani' },
  { peli: 'Amélie', alias: ['Amelie'], anyo: 2001, tema: "Comptine d'un autre été", autor: 'Yann Tiersen' },
  { peli: 'La La Land', alias: [], anyo: 2016, tema: 'Another Day of Sun', autor: 'La La Land Cast' },
  { peli: 'Moulin Rouge', alias: [], anyo: 2001, tema: 'Lady Marmalade', autor: 'Christina Aguilera' },
  { peli: 'Mamma Mia', alias: [], anyo: 2008, tema: 'Mamma Mia', autor: 'Meryl Streep' },
  { peli: 'Bohemian Rhapsody', alias: [], anyo: 2018, tema: 'Bohemian Rhapsody', autor: 'Queen' },
  { peli: 'Frozen', alias: ['El reino del hielo'], anyo: 2013, tema: 'Suéltalo', autor: 'Gisela' },
  { peli: 'Toy Story', alias: [], anyo: 1995, tema: 'Hay un amigo en mí', autor: 'Gipsy Kings' },
  { peli: 'Up', alias: ['Una aventura de altura'], anyo: 2009, tema: 'Married Life', autor: 'Michael Giacchino' },
  { peli: 'Los Increíbles', alias: [], anyo: 2004, tema: 'The Incredits', autor: 'Michael Giacchino' },
  { peli: 'Buscando a Nemo', alias: ['Nemo'], anyo: 2003, tema: 'Nemo Egg', autor: 'Thomas Newman' },
  { peli: 'Shrek', alias: [], anyo: 2001, tema: 'All Star', autor: 'Smash Mouth' },
  { peli: 'Vaiana', alias: ['Moana'], anyo: 2016, tema: 'Qué hay más allá', autor: "Auli'i Cravalho" },
  { peli: 'Coco', alias: [], anyo: 2017, tema: 'Recuérdame', autor: 'Carlos Rivera' },
  { peli: 'Encanto', alias: [], anyo: 2021, tema: 'No se habla de Bruno', autor: 'Encanto Cast' },
  { peli: 'La sirenita', alias: [], anyo: 1989, tema: 'Bajo el mar', autor: 'Samuel E. Wright' },
  { peli: 'La bella y la bestia', alias: [], anyo: 1991, tema: 'Bella y Bestia son', autor: 'Angela Lansbury' },
  { peli: 'Aladdín', alias: ['Aladin'], anyo: 1992, tema: 'Un mundo ideal', autor: 'Michelle Kuo' },
  // Los clásicos de Disney están en la tienda en inglés: pedirlos por el
  // título del doblaje no devuelve nada.
  { peli: 'El libro de la selva', alias: ['The Jungle Book'], anyo: 1967, tema: 'The Bare Necessities', autor: 'Phil Harris' },
  { peli: 'Mulán', alias: ['Mulan'], anyo: 1998, tema: "I'll Make a Man Out of You", autor: 'Donny Osmond' },
  { peli: 'Pocahontas', alias: [], anyo: 1995, tema: 'Colors of the Wind', autor: 'Judy Kuhn' },
  { peli: 'Tarzán', alias: [], anyo: 1999, tema: 'Two Worlds', autor: 'Phil Collins' },
  { peli: 'Ratatouille', alias: [], anyo: 2007, tema: 'Le Festin', autor: 'Camille' },
  { peli: 'Wall-E', alias: ['Wall E'], anyo: 2008, tema: 'Define Dancing', autor: 'Thomas Newman' },
  { peli: 'Monstruos S.A.', alias: ['Monstruos SA'], anyo: 2001, tema: 'If I Didn’t Have You', autor: 'Billy Crystal' },
  { peli: 'Cars', alias: [], anyo: 2006, tema: 'Life Is a Highway', autor: 'Rascal Flatts' },
  { peli: 'Kung Fu Panda', alias: [], anyo: 2008, tema: 'Kung Fu Fighting', autor: 'Cee-Lo Green' },
  { peli: 'Madagascar', alias: [], anyo: 2005, tema: 'I Like to Move It', autor: 'Sacha Baron Cohen' },
  { peli: 'Gru, mi villano favorito', alias: ['Gru', 'Los minions'], anyo: 2013, tema: 'Happy', autor: 'Pharrell Williams' },
  { peli: 'Spider-Man', alias: ['Spiderman'], anyo: 2002, tema: 'Main Title', autor: 'Danny Elfman' },
  // Del Batman del 89 la tienda solo tiene versiones de orquesta, así que
  // se queda fuera: el juego promete el tema, no un tributo.
  { peli: 'Eduardo Manostijeras', alias: [], anyo: 1990, tema: 'Ice Dance', autor: 'Danny Elfman' },
  { peli: 'Pesadilla antes de Navidad', alias: [], anyo: 1993, tema: "This Is Halloween", autor: 'Danny Elfman' },
  { peli: 'El caballero oscuro', alias: ['The Dark Knight'], anyo: 2008, tema: "Why So Serious?", autor: 'Hans Zimmer' },
  { peli: 'Origen', alias: ['Inception'], anyo: 2010, tema: 'Time', autor: 'Hans Zimmer' },
  { peli: 'Dune', alias: [], anyo: 2021, tema: 'Paul’s Dream', autor: 'Hans Zimmer' },
  { peli: 'Piratas del Caribe 2', alias: ['El cofre del hombre muerto'], anyo: 2006, tema: 'Jack Sparrow', autor: 'Hans Zimmer' },
  { peli: 'El gran showman', alias: ['The Greatest Showman'], anyo: 2017, tema: 'This Is Me', autor: 'Keala Settle' },
  { peli: 'Barbie', alias: [], anyo: 2023, tema: 'Dance the Night', autor: 'Dua Lipa' },
  { peli: 'Oppenheimer', alias: [], anyo: 2023, tema: 'Can You Hear the Music', autor: 'Ludwig Göransson' },
  { peli: 'Avatar', alias: [], anyo: 2009, tema: 'I See You', autor: 'Leona Lewis' },
  { peli: 'Los juegos del hambre', alias: ['Hunger Games'], anyo: 2012, tema: 'Safe & Sound', autor: 'Taylor Swift' },
  { peli: 'Guardianes de la galaxia', alias: [], anyo: 2014, tema: 'Hooked on a Feeling', autor: 'Blue Swede' },
  { peli: 'El silencio de los corderos', alias: [], anyo: 1991, tema: 'Main Title', autor: 'Howard Shore' },
  { peli: 'Sexto sentido', alias: ['El sexto sentido'], anyo: 1999, tema: 'Malcolm Is Dead', autor: 'James Newton Howard' },
  { peli: 'Náufrago', alias: ['Cast Away'], anyo: 2000, tema: 'End Credits', autor: 'Alan Silvestri' },
  { peli: 'Braveheart', alias: [], anyo: 1995, tema: 'For the Love of a Princess', autor: 'James Horner' },
  { peli: 'Memorias de África', alias: ['Out of Africa'], anyo: 1985, tema: 'Main Title', autor: 'John Barry' },
  { peli: 'Bailando con lobos', alias: [], anyo: 1990, tema: 'The John Dunbar Theme', autor: 'John Barry' },
  { peli: 'Ghost', alias: ['Más allá del amor'], anyo: 1990, tema: 'Unchained Melody', autor: 'The Righteous Brothers' },
  { peli: 'Reservoir Dogs', alias: [], anyo: 1992, tema: 'Stuck in the Middle With You', autor: 'Stealers Wheel' },
  { peli: 'Trainspotting', alias: [], anyo: 1996, tema: 'Lust for Life', autor: 'Iggy Pop' },
  { peli: 'Rocky III', alias: ['Rocky 3'], anyo: 1982, tema: 'Eye of the Tiger', autor: 'Survivor' },
  { peli: 'Los Goonies', alias: [], anyo: 1985, tema: 'The Goonies R Good Enough', autor: 'Cyndi Lauper' },
  { peli: 'Dumb y Dumber', alias: ['Dos tontos muy tontos'], anyo: 1994, tema: 'Mmm Mmm Mmm Mmm', autor: 'Crash Test Dummies' },
  { peli: 'El guateque', alias: ['The Party'], anyo: 1968, tema: 'Nothing to Lose', autor: 'Henry Mancini' },
  { peli: 'El exorcista', alias: [], anyo: 1973, tema: 'Tubular Bells', autor: 'Mike Oldfield' },
  { peli: 'Rocky IV', alias: ['Rocky 4'], anyo: 1985, tema: "Burning Heart", autor: 'Survivor' },
  { peli: 'Space Jam', alias: [], anyo: 1996, tema: 'I Believe I Can Fly', autor: 'R. Kelly' },
  { peli: 'Lo imposible', alias: [], anyo: 2012, tema: 'Lo imposible', autor: 'Fernando Velázquez' },
  // «El laberinto del fauno» y «Los otros» se quedan fuera: de la primera la
  // tienda solo tiene versiones a piano y flauta, y de la segunda nada.
  { peli: 'Mar adentro', alias: [], anyo: 2004, tema: 'Mar adentro', autor: 'Alejandro Amenábar' },
  { peli: 'Volver', alias: [], anyo: 2006, tema: 'Volver', autor: 'Estrella Morente' },
  { peli: 'Jurassic World', alias: [], anyo: 2015, tema: 'Welcome to Jurassic World', autor: 'Michael Giacchino' },
  { peli: 'Rey Arturo', alias: ['El rey Arturo'], anyo: 2004, tema: 'Woad to Ruin', autor: 'Hans Zimmer' },
  { peli: 'Múnich 72', alias: ['Munich'], anyo: 2005, tema: 'A Prayer for Peace', autor: 'John Williams' },
  { peli: 'La máscara', alias: ['The Mask'], anyo: 1994, tema: 'Cuban Pete', autor: 'Jim Carrey' },
  { peli: 'Grease 2', alias: [], anyo: 1982, tema: 'Cool Rider', autor: 'Michelle Pfeiffer' },
  // «Sister Act» tampoco: de «I Will Follow Him» hay el original de los 60 y
  // la grabación del musical, pero no lo que se canta en la película.
  { peli: 'Cadena perpetua', alias: ['The Shawshank Redemption'], anyo: 1994, tema: 'Shawshank Redemption', autor: 'Thomas Newman' },
  { peli: 'American Beauty', alias: [], anyo: 1999, tema: 'Any Other Name', autor: 'Thomas Newman' },
]

const limpia = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const VERSIONES = /symphony orchestra|tribute|cover|karaoke|various artists|orquesta|hit crew|studio band|ringtone|8-bit|lullaby|piano tribute|the london|academy of/i
const BANDAS = /soundtrack|motion picture|banda sonora|original score|b\.s\.o|ost|cast recording|original television/i

function puntua(ficha, r) {
  const autor = limpia(ficha.busca ?? ficha.autor)
  const artista = limpia(r.artistName ?? '')
  const album = r.collectionName ?? ''
  const tema = limpia(ficha.tema)
  const pista = limpia(r.trackName ?? '')
  let p = 0
  if (artista.includes(autor) || autor.includes(artista)) p += 4
  if (BANDAS.test(album)) p += 2
  if (pista === tema) p += 3
  else if (pista.includes(tema) || tema.includes(pista)) p += 1
  if (VERSIONES.test(r.artistName ?? '') && !(artista.includes(autor) || autor.includes(artista))) p -= 5
  if (!r.previewUrl) p -= 99
  return p
}

// La tienda corta a las cincuenta y pico peticiones y a partir de ahí
// contesta 403 o 429 durante un buen rato. Esperar dentro del script no
// sirve de nada: lo que funciona es ir por OLEADAS. Por eso aquí no se
// reintenta —se da por fallada y a la siguiente— y lo resuelto se
// guarda sobre la marcha: al volver a pasarlo, sigue donde lo dejó.
//
//   while ! node scripts/bandas-sonoras.mjs --escribe; do sleep 900; done
async function pide(url) {
  const r = await fetch(url)
  if (r.ok) return JSON.parse((await r.text()) || '{}')
  throw new Error(r.status === 403 || r.status === 429 ? `la tienda corta (${r.status})` : `HTTP ${r.status}`)
}

async function resuelve(ficha) {
  const term = encodeURIComponent(`${ficha.tema} ${ficha.busca ?? ficha.autor}`)
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=12&country=ES`
  let datos
  try {
    datos = await pide(url)
  } catch (e) {
    return { ficha, fallo: e.message }
  }
  const candidatos = (datos.results ?? [])
    .map((c) => ({ c, p: puntua(ficha, c) }))
    .sort((a, b) => b.p - a.p)
  const mejor = candidatos[0]
  if (!mejor || mejor.p < 3) return { ficha, fallo: 'sin candidato bueno', candidatos: candidatos.slice(0, 3) }
  return { ficha, elegido: mejor.c, puntos: mejor.p }
}

// Lo que ya estaba resuelto de una vuelta anterior.
let yaHechas = []
try {
  yaHechas = JSON.parse(readFileSync(DESTINO, 'utf8'))
} catch {
  // Primera vez.
}
const rehacerTodo = process.argv.includes('--todo')

const escribiendo = process.argv.includes('--escribe')
const guarda = (lista) => {
  const limpio = lista.map(({ puntos: _p, album: _a, ...resto }) => resto)
  writeFileSync(DESTINO, JSON.stringify(limpio, null, 1) + '\n')
}

const salida = []
const fallos = []
for (const ficha of PELICULAS) {
  const hecha = rehacerTodo ? null : yaHechas.find((x) => x.peli === ficha.peli)
  if (hecha) {
    salida.push({ ...hecha, puntos: '··', album: '(ya estaba)' })
    continue
  }
  const r = await resuelve(ficha)
  if (r.fallo) {
    fallos.push(`${ficha.peli} · ${r.fallo}${r.candidatos?.length ? ` (mejor: ${r.candidatos[0].c.trackName} — ${r.candidatos[0].c.artistName})` : ''}`)
    continue
  }
  salida.push({
    id: r.elegido.trackId,
    peli: ficha.peli,
    alias: ficha.alias,
    anyo: ficha.anyo,
    tema: r.elegido.trackName,
    autor: r.elegido.artistName,
    album: r.elegido.collectionName,
    preview: r.elegido.previewUrl,
    puntos: r.puntos,
  })
  console.log(`${salida.length}/${PELICULAS.length} · ${ficha.peli} → ${r.elegido.trackName} — ${r.elegido.artistName}`)
  if (escribiendo) guarda(salida)
  await new Promise((s) => setTimeout(s, 4000))
}

for (const s of salida) {
  console.log(`${String(s.puntos).padStart(2)} · ${s.peli.padEnd(32)} → ${s.tema} — ${s.autor} [${s.album}]`)
}
console.log(`\nResueltas ${salida.length} de ${PELICULAS.length}`)
if (fallos.length) console.log('SIN RESOLVER:\n · ' + fallos.join('\n · '))

if (escribiendo) {
  guarda(salida)
  console.log(`\nEscrito ${DESTINO} con ${salida.length} películas`)
}

// Código de salida 1 mientras queden por resolver: el bucle de fuera lo
// usa para saber si tiene que volver a intentarlo después del descanso.
if (fallos.length) process.exit(1)
