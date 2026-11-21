#!/usr/bin/env node
// =====================================================================
// Rural69 · El repertorio de «¿Qué canción suena?»
// ---------------------------------------------------------------------
// Lo mismo que `bandas-sonoras.mjs` pero con canciones de pop y rock de
// 1960 a 2010: la lista se escribe aquí a mano y el script la resuelve
// contra la tienda de Apple para quedarse con el identificador y la
// previsualización de 30 segundos, que es lo que suena en la partida.
//
// Las trampas de las canciones no son las de las bandas sonoras. Aquí lo
// que sale primero no es una orquesta de tributo: es la misma canción
// pero en directo, remezclada, en acústico, en maqueta o regrabada
// treinta años después por el único miembro que queda del grupo. Todas
// suenan parecidas en la ficha y ninguna es la que la gente conoce. Por
// eso el puntuador resta por «live», «remix», «demo», «acoustic» y
// compañía, y suma si el año de la grabación cuadra con el de la ficha:
// un remaster conserva el año original en los metadatos, una regrabación
// no. Lo que diga «Remastered» pasa, que es la misma cinta.
//
//   node scripts/canciones.mjs            (revisar en pantalla)
//   node scripts/canciones.mjs --escribe  (guardar el JSON)
//   node scripts/canciones.mjs --todo     (rehacerlo desde cero)
//
// La tienda corta a las cincuenta y pico peticiones por IP, así que esto
// va por oleadas: no reintenta, guarda lo resuelto sobre la marcha y
// sale con error mientras queden canciones, para que el bucle de fuera
// lo vuelva a llamar después de un descanso.
// =====================================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DESTINO = join(AQUI, '..', 'src', 'lib', 'juegos', 'canciones.json')

// titulo/artista: qué buscar y qué se destapa · anyo: el del disco
// extra: lo que se añade a la búsqueda —el disco, normalmente— cuando con el
// título y el grupo la tienda devuelve antes quince versiones de otros
// alias: cómo la llama la gente, cuando no es el título de la ficha
const CANCIONES = [
  // --- Los sesenta ---------------------------------------------------
  { titulo: 'Stand by Me', artista: 'Ben E. King', anyo: 1961 },
  { titulo: "Can't Help Falling in Love", artista: 'Elvis Presley', anyo: 1961 },
  { titulo: 'Twist and Shout', artista: 'The Beatles', anyo: 1963 },
  { titulo: 'I Want to Hold Your Hand', artista: 'The Beatles', anyo: 1963 },
  { titulo: "Blowin' in the Wind", artista: 'Bob Dylan', anyo: 1963 },
  { titulo: "Surfin' U.S.A.", artista: 'The Beach Boys', anyo: 1963 },
  { titulo: 'The House of the Rising Sun', artista: 'The Animals', anyo: 1964 },
  { titulo: 'My Girl', artista: 'The Temptations', anyo: 1964 },
  { titulo: 'The Sound of Silence', artista: 'Simon & Garfunkel', anyo: 1964 },
  { titulo: 'Yesterday', artista: 'The Beatles', anyo: 1965 },
  { titulo: 'Like a Rolling Stone', artista: 'Bob Dylan', anyo: 1965 },
  { titulo: "(I Can't Get No) Satisfaction", artista: 'The Rolling Stones', anyo: 1965, alias: ['Satisfaction'] },
  { titulo: "California Dreamin'", artista: 'The Mamas & The Papas', anyo: 1965 },
  { titulo: 'Paint It Black', artista: 'The Rolling Stones', anyo: 1966 },
  { titulo: 'Good Vibrations', artista: 'The Beach Boys', anyo: 1966 },
  { titulo: 'Wouldn’t It Be Nice', artista: 'The Beach Boys', anyo: 1966 },
  { titulo: 'Light My Fire', artista: 'The Doors', anyo: 1967 },
  { titulo: 'Purple Haze', artista: 'Jimi Hendrix', anyo: 1967 },
  { titulo: 'A Whiter Shade of Pale', artista: 'Procol Harum', anyo: 1967 },
  { titulo: 'Respect', artista: 'Aretha Franklin', anyo: 1967 },
  { titulo: 'White Rabbit', artista: 'Jefferson Airplane', anyo: 1967 },
  { titulo: 'Brown Eyed Girl', artista: 'Van Morrison', anyo: 1967 },
  { titulo: 'Nights in White Satin', artista: 'The Moody Blues', anyo: 1967 },
  { titulo: 'Hey Jude', artista: 'The Beatles', anyo: 1968 },
  { titulo: 'Sympathy for the Devil', artista: 'The Rolling Stones', anyo: 1968 },
  { titulo: 'All Along the Watchtower', artista: 'Jimi Hendrix', anyo: 1968 },
  { titulo: 'Mrs. Robinson', artista: 'Simon & Garfunkel', anyo: 1968 },
  { titulo: 'Born to Be Wild', artista: 'Steppenwolf', anyo: 1968 },
  { titulo: 'I Heard It Through the Grapevine', artista: 'Marvin Gaye', anyo: 1968 },
  { titulo: 'Here Comes the Sun', artista: 'The Beatles', anyo: 1969 },
  { titulo: 'Come Together', artista: 'The Beatles', anyo: 1969 },
  { titulo: 'Whole Lotta Love', artista: 'Led Zeppelin', anyo: 1969 },
  { titulo: 'Space Oddity', artista: 'David Bowie', anyo: 1969 },
  { titulo: 'Suspicious Minds', artista: 'Elvis Presley', anyo: 1969 },
  { titulo: 'Proud Mary', artista: 'Creedence Clearwater Revival', anyo: 1969 },
  { titulo: 'Fortunate Son', artista: 'Creedence Clearwater Revival', anyo: 1969 },
  { titulo: 'Black Is Black', artista: 'Los Bravos', anyo: 1966 },
  { titulo: 'Yo soy aquel', artista: 'Raphael', anyo: 1966 },
  { titulo: 'Mi gran noche', artista: 'Raphael', anyo: 1967 },
  { titulo: 'La, la, la', artista: 'Massiel', anyo: 1968 },
  { titulo: 'Flamenco', artista: 'Los Brincos', anyo: 1964 },
  { titulo: 'El baúl de los recuerdos', artista: 'Karina', anyo: 1969 },
  { titulo: 'Soy rebelde', artista: 'Jeanette', anyo: 1971 },
  { titulo: 'Un rayo de sol', artista: 'Los Diablos', anyo: 1970 },
  { titulo: 'Eres tú', artista: 'Mocedades', anyo: 1973, extra: 'Mocedades 1973' },
  { titulo: 'Un beso y una flor', artista: 'Nino Bravo', anyo: 1972 },
  { titulo: 'Libre', artista: 'Nino Bravo', anyo: 1972 },
  { titulo: 'Mediterráneo', artista: 'Joan Manuel Serrat', anyo: 1971 },
  // --- Los setenta ---------------------------------------------------
  { titulo: 'Let It Be', artista: 'The Beatles', anyo: 1970 },
  { titulo: 'Bridge Over Troubled Water', artista: 'Simon & Garfunkel', anyo: 1970 },
  { titulo: 'Layla', artista: 'Derek & The Dominos', anyo: 1970 },
  { titulo: 'Paranoid', artista: 'Black Sabbath', anyo: 1970 },
  { titulo: 'Your Song', artista: 'Elton John', anyo: 1970 },
  { titulo: 'Imagine', artista: 'John Lennon', anyo: 1971 },
  { titulo: 'Stairway to Heaven', artista: 'Led Zeppelin', anyo: 1971 },
  { titulo: 'American Pie', artista: 'Don McLean', anyo: 1971 },
  { titulo: 'Life on Mars?', artista: 'David Bowie', anyo: 1971 },
  { titulo: "What's Going On", artista: 'Marvin Gaye', anyo: 1971 },
  { titulo: 'Smoke On the Water', artista: 'Deep Purple', anyo: 1972 },
  { titulo: "Rocket Man (I Think It's Going to Be a Long, Long Time)", artista: 'Elton John', anyo: 1972, alias: ['Rocket Man'] },
  { titulo: 'Starman', artista: 'David Bowie', anyo: 1972 },
  { titulo: 'Superstition', artista: 'Stevie Wonder', anyo: 1972 },
  { titulo: 'School’s Out', artista: 'Alice Cooper', anyo: 1972 },
  { titulo: 'Piano Man', artista: 'Billy Joel', anyo: 1973 },
  { titulo: 'Dream On', artista: 'Aerosmith', anyo: 1973 },
  { titulo: 'Free Bird', artista: 'Lynyrd Skynyrd', anyo: 1973 },
  { titulo: 'Money', artista: 'Pink Floyd', anyo: 1973 },
  { titulo: 'Sweet Home Alabama', artista: 'Lynyrd Skynyrd', anyo: 1974 },
  { titulo: 'No Woman No Cry', artista: 'Bob Marley & The Wailers', anyo: 1974 },
  { titulo: 'Waterloo', artista: 'ABBA', anyo: 1974 },
  { titulo: 'Walk This Way', artista: 'Aerosmith', anyo: 1975 },
  { titulo: 'Born to Run', artista: 'Bruce Springsteen', anyo: 1975 },
  { titulo: 'Wish You Were Here', artista: 'Pink Floyd', anyo: 1975 },
  { titulo: 'Hotel California', artista: 'Eagles', anyo: 1976 },
  { titulo: 'Dancing Queen', artista: 'ABBA', anyo: 1976 },
  { titulo: 'More Than a Feeling', artista: 'Boston', anyo: 1976 },
  { titulo: 'Carry On Wayward Son', artista: 'Kansas', anyo: 1976 },
  { titulo: 'Anarchy In the U.K.', artista: 'Sex Pistols', anyo: 1976 },
  { titulo: 'We Will Rock You', artista: 'Queen', anyo: 1977 },
  { titulo: 'We Are the Champions', artista: 'Queen', anyo: 1977 },
  { titulo: '"Heroes"', artista: 'David Bowie', anyo: 1977, alias: ['Heroes'] },
  { titulo: 'I Will Survive', artista: 'Gloria Gaynor', anyo: 1978 },
  { titulo: 'Y.M.C.A.', artista: 'Village People', anyo: 1978 },
  { titulo: 'September', artista: 'Earth, Wind & Fire', anyo: 1978 },
  { titulo: 'Le Freak', artista: 'Chic', anyo: 1978 },
  { titulo: 'Rasputin', artista: 'Boney M.', anyo: 1978 },
  { titulo: 'London Calling', artista: 'The Clash', anyo: 1979 },
  { titulo: 'Highway to Hell', artista: 'AC/DC', anyo: 1979 },
  { titulo: 'Comfortably Numb', artista: 'Pink Floyd', anyo: 1979 },
  { titulo: 'Another Brick In the Wall', artista: 'Pink Floyd', anyo: 1979 },
  { titulo: 'Heart of Glass', artista: 'Blondie', anyo: 1979 },
  { titulo: "Don't Stop Me Now", artista: 'Queen', anyo: 1979 },
  { titulo: "Rapper's Delight", artista: 'The Sugarhill Gang', anyo: 1979 },
  { titulo: 'Vivir así es morir de amor', artista: 'Camilo Sesto', anyo: 1978 },
  { titulo: 'Te estoy amando locamente', artista: 'Las Grecas', anyo: 1974 },
  { titulo: 'Libertad sin ira', artista: 'Jarcha', anyo: 1976 },
  { titulo: 'Mi querida España', artista: 'Cecilia', anyo: 1975, extra: 'Un Ramito de Violetas' },
  { titulo: 'Abre la puerta', artista: 'Triana', anyo: 1975 },
  { titulo: 'Quiero ser libre', artista: 'Los Chichos', anyo: 1974 },
  { titulo: '¿Qué hace una chica como tú en un sitio como este?', artista: 'Burning', anyo: 1978 },
  { titulo: 'Salta!', artista: 'Tequila', anyo: 1979 },
  { titulo: 'Al alba', artista: 'Luis Eduardo Aute', anyo: 1978 },
  { titulo: 'Para la libertad', artista: 'Joan Manuel Serrat', anyo: 1972 },
  { titulo: 'La puerta de Alcalá', artista: 'Víctor Manuel', anyo: 1986 },
  { titulo: 'Entre dos aguas', artista: 'Paco de Lucía', anyo: 1973 },
  { titulo: 'Soy un truhán, soy un señor', artista: 'Julio Iglesias', anyo: 1976 },
  { titulo: 'Como una ola', artista: 'Rocío Jurado', anyo: 1981 },
  { titulo: 'Bienvenidos', artista: 'Miguel Ríos', anyo: 1982 },
  { titulo: 'Mi carro', artista: 'Manolo Escobar', anyo: 1969 },
  // --- Los ochenta ---------------------------------------------------
  { titulo: 'Another One Bites the Dust', artista: 'Queen', anyo: 1980 },
  { titulo: 'Back In Black', artista: 'AC/DC', anyo: 1980 },
  { titulo: 'Love Will Tear Us Apart', artista: 'Joy Division', anyo: 1980 },
  { titulo: 'Call Me', artista: 'Blondie', anyo: 1980 },
  { titulo: 'In the Air Tonight', artista: 'Phil Collins', anyo: 1981 },
  { titulo: 'Under Pressure', artista: 'Queen & David Bowie', anyo: 1981 },
  { titulo: "Don't Stop Believin'", artista: 'Journey', anyo: 1981 },
  { titulo: 'Tainted Love', artista: 'Soft Cell', anyo: 1981 },
  { titulo: "Just Can't Get Enough", artista: 'Depeche Mode', anyo: 1981 },
  { titulo: 'Africa', artista: 'TOTO', anyo: 1982 },
  { titulo: 'Should I Stay or Should I Go', artista: 'The Clash', anyo: 1982 },
  { titulo: 'Billie Jean', artista: 'Michael Jackson', anyo: 1982 },
  { titulo: 'Beat It', artista: 'Michael Jackson', anyo: 1982 },
  { titulo: 'Thriller', artista: 'Michael Jackson', anyo: 1982 },
  { titulo: 'Every Breath You Take', artista: 'The Police', anyo: 1983 },
  { titulo: 'Sweet Dreams (Are Made of This)', artista: 'Eurythmics', anyo: 1983 },
  { titulo: 'Blue Monday', artista: 'New Order', anyo: 1983 },
  { titulo: 'Girls Just Want to Have Fun', artista: 'Cyndi Lauper', anyo: 1983 },
  { titulo: 'Time After Time', artista: 'Cyndi Lauper', anyo: 1983 },
  { titulo: 'Total Eclipse of the Heart', artista: 'Bonnie Tyler', anyo: 1983 },
  { titulo: 'Relax', artista: 'Frankie Goes to Hollywood', anyo: 1983 },
  { titulo: 'Holiday', artista: 'Madonna', anyo: 1983 },
  { titulo: 'Like a Virgin', artista: 'Madonna', anyo: 1984 },
  { titulo: 'Careless Whisper', artista: 'George Michael', anyo: 1984 },
  { titulo: 'Wake Me Up Before You Go-Go', artista: 'Wham!', anyo: 1984 },
  { titulo: 'Last Christmas', artista: 'Wham!', anyo: 1984 },
  { titulo: 'Jump', artista: 'Van Halen', anyo: 1984 },
  { titulo: 'When Doves Cry', artista: 'Prince', anyo: 1984 },
  { titulo: 'Purple Rain', artista: 'Prince', anyo: 1984 },
  { titulo: 'Take On Me', artista: 'a-ha', anyo: 1985 },
  { titulo: 'West End Girls', artista: 'Pet Shop Boys', anyo: 1985 },
  { titulo: 'Material Girl', artista: 'Madonna', anyo: 1985 },
  { titulo: 'Livin’ On a Prayer', artista: 'Bon Jovi', anyo: 1986 },
  { titulo: 'You Give Love a Bad Name', artista: 'Bon Jovi', anyo: 1986 },
  { titulo: 'The Final Countdown', artista: 'Europe', anyo: 1986 },
  { titulo: 'Walk Like an Egyptian', artista: 'The Bangles', anyo: 1986 },
  { titulo: 'Sledgehammer', artista: 'Peter Gabriel', anyo: 1986 },
  { titulo: 'Sweet Child O’ Mine', artista: "Guns N' Roses", anyo: 1987 },
  { titulo: 'Welcome to the Jungle', artista: "Guns N' Roses", anyo: 1987 },
  { titulo: 'With or Without You', artista: 'U2', anyo: 1987 },
  { titulo: 'Where the Streets Have No Name', artista: 'U2', anyo: 1987 },
  { titulo: 'Faith', artista: 'George Michael', anyo: 1987 },
  { titulo: 'La Bamba', artista: 'Los Lobos', anyo: 1987 },
  { titulo: 'I Wanna Dance With Somebody (Who Loves Me)', artista: 'Whitney Houston', anyo: 1987 },
  { titulo: 'Sign o’ the Times', artista: 'Prince', anyo: 1987 },
  { titulo: 'Personal Jesus', artista: 'Depeche Mode', anyo: 1989 },
  { titulo: 'Like a Prayer', artista: 'Madonna', anyo: 1989 },
  { titulo: 'Another Day In Paradise', artista: 'Phil Collins', anyo: 1989 },
  // --- Los ochenta, en español --------------------------------------
  { titulo: 'La chica de ayer', artista: 'Nacha Pop', anyo: 1980 },
  { titulo: 'Enamorado de la moda juvenil', artista: 'Radio Futura', anyo: 1980 },
  { titulo: 'Déjame', artista: 'Los Secretos', anyo: 1981 },
  { titulo: 'Los rockeros van al infierno', artista: 'Barón Rojo', anyo: 1981 },
  { titulo: 'Cadillac solitario', artista: 'Loquillo y Trogloditas', anyo: 1983 },
  { titulo: 'No controles', artista: 'Olé Olé', anyo: 1983 },
  { titulo: 'Escuela de calor', artista: 'Radio Futura', anyo: 1984 },
  { titulo: 'Lobo hombre en París', artista: 'La Unión', anyo: 1984 },
  { titulo: 'No mires a los ojos de la gente', artista: 'Golpes Bajos', anyo: 1983 },
  { titulo: 'Devuélveme a mi chica', artista: 'Hombres G', anyo: 1985 },
  { titulo: 'Venezia', artista: 'Hombres G', anyo: 1986 },
  { titulo: 'Agradecido', artista: 'Rosendo', anyo: 1985 },
  { titulo: 'Cien gaviotas', artista: 'Duncan Dhu', anyo: 1986 },
  { titulo: 'En algún lugar', artista: 'Duncan Dhu', anyo: 1987 },
  { titulo: 'A quién le importa', artista: 'Alaska y Dinarama', anyo: 1986 },
  { titulo: 'Ni tú ni nadie', artista: 'Alaska y Dinarama', anyo: 1984 },
  { titulo: 'Hijo de la luna', artista: 'Mecano', anyo: 1986 },
  { titulo: 'Me colé en una fiesta', artista: 'Mecano', anyo: 1982 },
  { titulo: 'Mujer contra mujer', artista: 'Mecano', anyo: 1988 },
  { titulo: 'Maquillaje', artista: 'Mecano', anyo: 1982 },
  { titulo: 'Camino Soria', artista: 'Gabinete Caligari', anyo: 1987 },
  { titulo: 'Insurrección', artista: 'El Último de la Fila', anyo: 1986 },
  { titulo: 'Resistiré', artista: 'Dúo Dinámico', anyo: 1988 },
  { titulo: 'Sin aliento', artista: 'Danza Invisible', anyo: 1988 },
  { titulo: 'Mi agüita amarilla', artista: 'Los Toreros Muertos', anyo: 1986 },
  // --- Los noventa ---------------------------------------------------
  { titulo: 'Smells Like Teen Spirit', artista: 'Nirvana', anyo: 1991 },
  { titulo: 'Come As You Are', artista: 'Nirvana', anyo: 1991 },
  { titulo: 'Enter Sandman', artista: 'Metallica', anyo: 1991 },
  { titulo: 'Nothing Else Matters', artista: 'Metallica', anyo: 1991 },
  { titulo: 'Losing My Religion', artista: 'R.E.M.', anyo: 1991 },
  { titulo: 'Under the Bridge', artista: 'Red Hot Chili Peppers', anyo: 1991 },
  { titulo: 'Give It Away', artista: 'Red Hot Chili Peppers', anyo: 1991 },
  { titulo: 'Alive', artista: 'Pearl Jam', anyo: 1991 },
  { titulo: 'Even Flow', artista: 'Pearl Jam', anyo: 1991 },
  { titulo: 'Thunderstruck', artista: 'AC/DC', anyo: 1990 },
  { titulo: 'Enjoy the Silence', artista: 'Depeche Mode', anyo: 1990 },
  { titulo: 'Nothing Compares 2 U', artista: "Sinéad O'Connor", anyo: 1990 },
  // De Radiohead la tienda española no vende el «Creep» del disco, solo el
  // acústico del EP y una pila de versiones. Esta sí está.
  { titulo: 'Karma Police', artista: 'Radiohead', anyo: 1997 },
  { titulo: 'Everybody Hurts', artista: 'R.E.M.', anyo: 1992 },
  // De Rage Against the Machine la tienda española solo tiene los directos
  // de México del 99, así que se quedan fuera: lo que suena tiene que ser la
  // grabación que conoce la gente, no un bootleg con el público encima.
  { titulo: "Cryin'", artista: 'Aerosmith', anyo: 1993 },
  { titulo: 'Tears In Heaven', artista: 'Eric Clapton', anyo: 1992 },
  { titulo: "What's Up?", artista: '4 Non Blondes', anyo: 1992 },
  { titulo: 'Jump Around', artista: 'House of Pain', anyo: 1992 },
  { titulo: 'Linger', artista: 'The Cranberries', anyo: 1993 },
  { titulo: 'Mr. Jones', artista: 'Counting Crows', anyo: 1993 },
  { titulo: 'Are You Gonna Go My Way', artista: 'Lenny Kravitz', anyo: 1993 },
  { titulo: 'Zombie', artista: 'The Cranberries', anyo: 1994 },
  { titulo: 'Black Hole Sun', artista: 'Soundgarden', anyo: 1994 },
  { titulo: 'Basket Case', artista: 'Green Day', anyo: 1994 },
  { titulo: 'When I Come Around', artista: 'Green Day', anyo: 1994 },
  { titulo: 'Self Esteem', artista: 'The Offspring', anyo: 1994 },
  { titulo: 'Hallelujah', artista: 'Jeff Buckley', anyo: 1994 },
  { titulo: 'Sabotage', artista: 'Beastie Boys', anyo: 1994 },
  { titulo: 'Waterfalls', artista: 'TLC', anyo: 1994 },
  { titulo: 'Wonderwall', artista: 'Oasis', anyo: 1995 },
  { titulo: 'Common People', artista: 'Pulp', anyo: 1995 },
  { titulo: "Gangsta's Paradise", artista: 'Coolio', anyo: 1995 },
  { titulo: 'California Love', artista: '2Pac', anyo: 1995 },
  { titulo: 'Insomnia', artista: 'Faithless', anyo: 1995 },
  { titulo: "Don't Look Back In Anger", artista: 'Oasis', anyo: 1996 },
  { titulo: 'Wannabe', artista: 'Spice Girls', anyo: 1996 },
  { titulo: 'Firestarter', artista: 'The Prodigy', anyo: 1996 },
  { titulo: 'Loser', artista: 'Beck', anyo: 1994 },
  { titulo: 'Bitter Sweet Symphony', artista: 'The Verve', anyo: 1997 },
  { titulo: 'Song 2', artista: 'Blur', anyo: 1997 },
  { titulo: 'Everlong', artista: 'Foo Fighters', anyo: 1997 },
  { titulo: 'Around the World', artista: 'Daft Punk', anyo: 1997 },
  { titulo: 'Torn', artista: 'Natalie Imbruglia', anyo: 1997 },
  { titulo: 'No Surprises', artista: 'Radiohead', anyo: 1997 },
  { titulo: 'Barbie Girl', artista: 'Aqua', anyo: 1997 },
  { titulo: '...Baby One More Time', artista: 'Britney Spears', anyo: 1998 },
  { titulo: 'Believe', artista: 'Cher', anyo: 1998 },
  { titulo: 'Iris', artista: 'The Goo Goo Dolls', anyo: 1998 },
  { titulo: 'I Want It That Way', artista: 'Backstreet Boys', anyo: 1999 },
  { titulo: 'Smooth', artista: 'Santana', anyo: 1999 },
  { titulo: 'Californication', artista: 'Red Hot Chili Peppers', anyo: 1999 },
  { titulo: 'Learn to Fly', artista: 'Foo Fighters', anyo: 1999 },
  // --- Los noventa, en español --------------------------------------
  { titulo: 'Entre dos tierras', artista: 'Héroes del Silencio', anyo: 1990 },
  { titulo: 'Maldito duende', artista: 'Héroes del Silencio', anyo: 1990 },
  { titulo: 'Un año de amor', artista: 'Luz Casal', anyo: 1991 },
  { titulo: '20 de abril', artista: 'Celtas Cortos', anyo: 1991 },
  { titulo: 'Chiquilla', artista: 'Seguridad Social', anyo: 1991 },
  { titulo: 'Macarena', artista: 'Los del Río', anyo: 1993 },
  { titulo: 'Sin documentos', artista: 'Los Rodríguez', anyo: 1993 },
  { titulo: 'No dudaría', artista: 'Antonio Flores', anyo: 1995 },
  { titulo: 'La flaca', artista: 'Jarabe de Palo', anyo: 1996 },
  { titulo: 'A fuego lento', artista: 'Rosana', anyo: 1996 },
  { titulo: 'Lo echamos a suertes', artista: 'Ella Baila Sola', anyo: 1996 },
  { titulo: 'Qué puedo hacer', artista: 'Los Planetas', anyo: 1996 },
  { titulo: 'So payaso', artista: 'Extremoduro', anyo: 1996 },
  { titulo: 'Corazón partío', artista: 'Alejandro Sanz', anyo: 1997 },
  { titulo: 'Flaca', artista: 'Andrés Calamaro', anyo: 1997 },
  { titulo: 'Devil Came to Me', artista: 'Dover', anyo: 1997 },
  { titulo: 'Molinos de viento', artista: 'Mägo de Oz', anyo: 1998, extra: 'La leyenda de la Mancha' },
  { titulo: 'Cuéntame al oído', artista: 'La Oreja de Van Gogh', anyo: 1998 },
  { titulo: 'Clavado en un bar', artista: 'Maná', anyo: 1997 },
  { titulo: 'La raja de tu falda', artista: 'Estopa', anyo: 1999 },
  { titulo: 'El sitio de mi recreo', artista: 'Antonio Vega', anyo: 1992 },
  { titulo: 'Y sin embargo', artista: 'Joaquín Sabina', anyo: 1996 },
  { titulo: 'Y nos dieron las diez', artista: 'Joaquín Sabina', anyo: 1992 },
  { titulo: '19 días y 500 noches', artista: 'Joaquín Sabina', anyo: 1999 },
  { titulo: 'La del pirata cojo', artista: 'Joaquín Sabina', anyo: 1990 },
  // --- Los dos mil ---------------------------------------------------
  { titulo: 'Yellow', artista: 'Coldplay', anyo: 2000 },
  { titulo: 'Beautiful Day', artista: 'U2', anyo: 2000 },
  { titulo: 'In the End', artista: 'Linkin Park', anyo: 2000 },
  { titulo: 'The Real Slim Shady', artista: 'Eminem', anyo: 2000 },
  { titulo: 'Rock DJ', artista: 'Robbie Williams', anyo: 2000 },
  { titulo: 'Last Nite', artista: 'The Strokes', anyo: 2001 },
  { titulo: 'Clint Eastwood', artista: 'Gorillaz', anyo: 2001, extra: 'Gorillaz' },
  { titulo: 'Chop Suey!', artista: 'System of a Down', anyo: 2001 },
  { titulo: 'Whenever, Wherever', artista: 'Shakira', anyo: 2001 },
  { titulo: 'Clocks', artista: 'Coldplay', anyo: 2002 },
  { titulo: 'Lose Yourself', artista: 'Eminem', anyo: 2002 },
  { titulo: 'By the Way', artista: 'Red Hot Chili Peppers', anyo: 2002 },
  { titulo: 'A Dios le pido', artista: 'Juanes', anyo: 2002 },
  { titulo: 'Seven Nation Army', artista: 'The White Stripes', anyo: 2003 },
  { titulo: 'Hey Ya!', artista: 'OutKast', anyo: 2003 },
  { titulo: 'In da Club', artista: '50 Cent', anyo: 2003 },
  { titulo: 'Crazy In Love', artista: 'Beyoncé', anyo: 2003, extra: 'Dangerously in Love' },
  { titulo: 'Toxic', artista: 'Britney Spears', anyo: 2003 },
  { titulo: 'Numb', artista: 'Linkin Park', anyo: 2003 },
  { titulo: 'Bring Me to Life', artista: 'Evanescence', anyo: 2003 },
  { titulo: 'Maps', artista: 'Yeah Yeah Yeahs', anyo: 2003 },
  { titulo: 'Where Is the Love?', artista: 'The Black Eyed Peas', anyo: 2003 },
  { titulo: 'Are You Gonna Be My Girl', artista: 'Jet', anyo: 2003 },
  { titulo: 'Mad World', artista: 'Michael Andrews & Gary Jules', anyo: 2003 },
  { titulo: 'Mr. Brightside', artista: 'The Killers', anyo: 2004 },
  { titulo: 'Somebody Told Me', artista: 'The Killers', anyo: 2004 },
  { titulo: 'Take Me Out', artista: 'Franz Ferdinand', anyo: 2004 },
  // Del «American Idiot» la tienda vende estas dos y no las otras.
  { titulo: 'Holiday', artista: 'Green Day', anyo: 2004 },
  { titulo: 'Wake Me Up When September Ends', artista: 'Green Day', anyo: 2004 },
  { titulo: 'Vertigo', artista: 'U2', anyo: 2004 },
  { titulo: 'Feel Good Inc.', artista: 'Gorillaz', anyo: 2005 },
  { titulo: 'Fix You', artista: 'Coldplay', anyo: 2005, extra: 'X&Y' },
  { titulo: 'I Bet You Look Good On the Dancefloor', artista: 'Arctic Monkeys', anyo: 2005 },
  { titulo: 'Dakota', artista: 'Stereophonics', anyo: 2005 },
  { titulo: 'Rehab', artista: 'Amy Winehouse', anyo: 2006 },
  { titulo: 'Back to Black', artista: 'Amy Winehouse', anyo: 2006 },
  { titulo: 'Chasing Cars', artista: 'Snow Patrol', anyo: 2006 },
  { titulo: "Hips Don't Lie", artista: 'Shakira', anyo: 2006 },
  { titulo: 'Dani California', artista: 'Red Hot Chili Peppers', anyo: 2006 },
  { titulo: 'Umbrella', artista: 'Rihanna', anyo: 2007 },
  { titulo: 'Apologize', artista: 'Timbaland', anyo: 2007 },
  { titulo: 'Fluorescent Adolescent', artista: 'Arctic Monkeys', anyo: 2007 },
  { titulo: 'Valerie', artista: 'Mark Ronson', anyo: 2007, extra: 'Amy Winehouse' },
  { titulo: 'Low', artista: 'Flo Rida', anyo: 2007 },
  { titulo: 'Viva La Vida', artista: 'Coldplay', anyo: 2008, alias: ['Viva la vida'] },
  { titulo: 'Sex On Fire', artista: 'Kings of Leon', anyo: 2008 },
  { titulo: 'Use Somebody', artista: 'Kings of Leon', anyo: 2008 },
  { titulo: 'Poker Face', artista: 'Lady Gaga', anyo: 2008 },
  { titulo: 'Just Dance', artista: 'Lady Gaga', anyo: 2008 },
  { titulo: 'I Kissed a Girl', artista: 'Katy Perry', anyo: 2008 },
  { titulo: 'Single Ladies (Put a Ring On It)', artista: 'Beyoncé', anyo: 2008 },
  { titulo: 'Paper Planes', artista: 'M.I.A.', anyo: 2008 },
  { titulo: 'Love Story', artista: 'Taylor Swift', anyo: 2008 },
  { titulo: 'Chasing Pavements', artista: 'Adele', anyo: 2008 },
  { titulo: 'I Gotta Feeling', artista: 'The Black Eyed Peas', anyo: 2009 },
  { titulo: 'Bad Romance', artista: 'Lady Gaga', anyo: 2009 },
  { titulo: 'Empire State of Mind', artista: 'JAY-Z', anyo: 2009 },
  // --- Los dos mil, en español --------------------------------------
  { titulo: 'La playa', artista: 'La Oreja de Van Gogh', anyo: 2000 },
  { titulo: 'Rosas', artista: 'La Oreja de Van Gogh', anyo: 2003 },
  { titulo: 'Tu calorro', artista: 'Estopa', anyo: 2000 },
  { titulo: 'Soldadito marinero', artista: 'Fito y Fitipaldis', anyo: 2001, extra: 'Los sueños locos' },
  { titulo: 'Aserejé', artista: 'Las Ketchup', anyo: 2002, extra: 'Hijas del Tomate' },
  { titulo: 'Por la boca vive el pez', artista: 'Fito y Fitipaldis', anyo: 2006, extra: 'Por la boca vive el pez' },
  { titulo: 'Sin ti no soy nada', artista: 'Amaral', anyo: 2002 },
  { titulo: 'Te necesito', artista: 'Amaral', anyo: 2002 },
  { titulo: 'Zapatillas', artista: 'El Canto del Loco', anyo: 2003 },
  { titulo: 'Puede ser', artista: 'El Canto del Loco', anyo: 2002, extra: 'A Contracorriente' },
  { titulo: 'Ella', artista: 'Bebe', anyo: 2003, extra: 'Pafuera Telarañas' },
  { titulo: 'Pokito a poko', artista: 'Chambao', anyo: 2005 },
  { titulo: 'Estrella polar', artista: 'Pereza', anyo: 2005 },
  { titulo: 'Princesas', artista: 'Pereza', anyo: 2005 },
  { titulo: 'Caminando por la vida', artista: 'Melendi', anyo: 2005 },
  { titulo: 'Bonito', artista: 'Jarabe de Palo', anyo: 2003 },
  { titulo: 'Ciudad de los gitanos', artista: 'Marea', anyo: 2004 },
  { titulo: 'Copenhague', artista: 'Vetusta Morla', anyo: 2008 },
  { titulo: 'Tenía tanto que darte', artista: 'Nena Daconte', anyo: 2008 },
  { titulo: 'Club de fans de John Boy', artista: 'Love of Lesbian', anyo: 2009 },
  { titulo: 'Moving', artista: 'Macaco', anyo: 2009 },
  { titulo: 'La tortura', artista: 'Shakira', anyo: 2005 },
  { titulo: 'Labios compartidos', artista: 'Maná', anyo: 2006 },
  { titulo: 'Me enamora', artista: 'Juanes', anyo: 2007 },
]

/** Quita acentos, signos y mayúsculas: se compara lo que suena. */
const limpia = (t) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Lo que no es la canción que la gente conoce, aunque se llame igual.
// «Remastered» no está: un remaster es la misma cinta, y en muchos casos
// es la única que vende la tienda.
const OTRAS = /\blive\b|\ben vivo\b|\ben directo\b|\bdirecto\b|remix|re-?mix|refix|club mix|club edit|video edit|without rap|extended|radio edit|\bdemo\b|rehearsal|outtake|acoustic|ac[uú]stic|unplugged|karaoke|tribute|tributo|\bcover\b|\bversión\b|cover version|made famous|made popular|\bas sung by\b|instrumental|8-?bit|lullaby|ringtone|workout|\bmix\)|re-?recorded|\bnew recording\b|\brevisited\b|\bsped up\b|slowed|parod|\(vivo\)|\bdirecto\)|en concierto|\bel concierto\b/i

// Discos grabados en un concierto, que no siempre se anuncian en el título
// de la canción.
const DIRECTOS = /\bvivo\b|\bdirecto\b|\blive\b|\bconcierto\b|unplugged|\bgira\b|\btour\b/i

// Recopilatorios de gasolinera. No se descartan —de algunas canciones es lo
// único que hay— pero pierden contra el disco de verdad: ahí es donde está la
// grabación que conoce la gente, y no una mezcla rara de la reedición.
const COMPILADOS = /grandes [eé]xitos|lo mejor de|\d+ grandes|\d+ a[nñ]os|esencial|icollection|sabor latino|lentos|new woman|m[aá]gicos|serie platino|colecci[oó]n|[eé]xitos\b|\bhits\b|\bvol\.? ?\d|canciones que|cu[eé]ntame c[oó]mo pasó|las \d+ mejores|poetas de la canci[oó]n/i

// Y quien no es el grupo: discos de homenajes, bandas de bodas y recopilatorios.
const IMPOSTORES = /tribute|karaoke|hit crew|studio band|various artists|orquesta|orchestra tribute|the sunshine|cast|party|covers?\b/i

function puntua(ficha, r) {
  const artista = limpia(ficha.artista)
  const suyo = limpia(r.artistName)
  const titulo = limpia(ficha.titulo)
  // «Hey Jude (Remastered 2015)» es Hey Jude: el paréntesis no cuenta.
  const pista = limpia((r.trackName ?? '').replace(/\s*[([][^)\]]*[)\]]\s*$/, ''))
  const mismo = suyo.includes(artista) || artista.includes(suyo)
  // Dos cosas tienen que cuadrar, y ninguna es negociable:
  //
  //  · El título. El grupo y el año los cumplen todas las canciones del
  //    mismo disco, y así se colaba «Holiday» cuando lo que se pedía era
  //    «Boulevard of Broken Dreams».
  //  · El grupo. Lo que se busca es LA grabación, no la canción: sin esto
  //    se colaba un «Empire State of Mind» que era una parodia de un tal
  //    LOL Crew, y los discos de versiones de cuerda están llenos.
  if (pista !== titulo && !pista.includes(titulo) && !titulo.includes(pista)) return -99
  if (!mismo) return -99
  let p = 0
  if (mismo) p += 4
  if (pista === titulo) p += 3
  else p += 1
  // Y entre dos que se llaman igual, la que no lleva nada entre paréntesis:
  // «Clint Eastwood» y «Clint Eastwood (Phi Life Cypher Version)» empataban,
  // y la del disco es la primera.
  if (limpia(r.trackName) === titulo) p += 1
  // El año del disco distingue la grabación de siempre de la que el grupo
  // volvió a grabar en el 2012 con un solo miembro original.
  const anyo = Number((r.releaseDate ?? '').slice(0, 4))
  if (anyo && Math.abs(anyo - ficha.anyo) <= 1) p += 2
  if (OTRAS.test(r.trackName ?? '') || OTRAS.test(r.collectionName ?? '')) p -= 7
  // Y el disco entero puede ser un directo sin que lo diga la canción:
  // «Vivo... Para Contarlo» no lleva paréntesis ninguno y dentro está el
  // «Soldadito marinero» de siete minutos con el público cantando.
  if (DIRECTOS.test(r.collectionName ?? '')) p -= 7
  if (COMPILADOS.test(r.collectionName ?? '')) p -= 2
  if (!mismo && IMPOSTORES.test(r.artistName ?? '')) p -= 7
  // Un trozo de menos de minuto y medio no es la canción, es un interludio.
  if ((r.trackTimeMillis ?? 0) > 0 && r.trackTimeMillis < 90_000) p -= 3
  if (!r.previewUrl) p -= 99
  return p
}

async function pide(url) {
  const r = await fetch(url)
  if (r.ok) return JSON.parse((await r.text()) || '{}')
  throw new Error(r.status === 403 || r.status === 429 ? `la tienda corta (${r.status})` : `HTTP ${r.status}`)
}

async function resuelve(ficha) {
  const term = encodeURIComponent(`${ficha.titulo} ${ficha.artista}${ficha.extra ? ' ' + ficha.extra : ''}`)
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=15&country=ES`
  let datos
  try {
    datos = await pide(url)
  } catch (e) {
    return { ficha, fallo: e.message }
  }
  const candidatos = (datos.results ?? []).map((c) => ({ c, p: puntua(ficha, c) })).sort((a, b) => b.p - a.p)
  const mejor = candidatos[0]
  if (!mejor || mejor.p < 5) return { ficha, fallo: 'sin candidato bueno', candidatos: candidatos.slice(0, 3) }
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
// `--prueba`: solo las primeras, para ver si el puntuador elige bien sin
// gastarse las peticiones de la tienda en las trescientas.
const prueba = process.argv.includes('--prueba')
const escribiendo = process.argv.includes('--escribe') && !prueba
const guarda = (lista) => {
  const limpio = lista.map(({ puntos: _p, album: _a, ...resto }) => resto)
  writeFileSync(DESTINO, JSON.stringify(limpio, null, 1) + '\n')
}

const salida = []
const fallos = []
for (const ficha of prueba ? CANCIONES.slice(0, 12) : CANCIONES) {
  const hecha = rehacerTodo ? null : yaHechas.find((x) => x.titulo === ficha.titulo && x.artista === ficha.artista)
  if (hecha) {
    salida.push({ ...hecha, puntos: '··', album: '(ya estaba)' })
    continue
  }
  const r = await resuelve(ficha)
  if (r.fallo) {
    fallos.push(
      `${ficha.titulo} · ${ficha.artista} · ${r.fallo}${
        r.candidatos?.length ? ` (mejor: ${r.candidatos[0].c.trackName} — ${r.candidatos[0].c.artistName})` : ''
      }`,
    )
    continue
  }
  salida.push({
    id: r.elegido.trackId,
    titulo: ficha.titulo,
    alias: ficha.alias ?? [],
    artista: ficha.artista,
    anyo: ficha.anyo,
    album: r.elegido.collectionName,
    preview: r.elegido.previewUrl,
    puntos: r.puntos,
  })
  console.log(
    `${salida.length}/${CANCIONES.length} · ${ficha.titulo} → ${r.elegido.trackName} — ${r.elegido.artistName}` +
      (prueba ? ` [${r.elegido.collectionName} · ${(r.elegido.releaseDate ?? '').slice(0, 4)} · ${r.puntos}]` : ''),
  )
  if (escribiendo) guarda(salida)
  await new Promise((s) => setTimeout(s, 4000))
}

console.log(`\nResueltas ${salida.length} de ${CANCIONES.length}`)
if (fallos.length > 0) {
  console.log(`\nSin resolver (${fallos.length}):`)
  for (const f of fallos) console.log(' · ' + f)
}
if (escribiendo) {
  guarda(salida)
  console.log(`\nEscrito ${DESTINO} con ${salida.length} canciones`)
}
// Mientras queden, sale con error: así el bucle de fuera vuelve a llamarlo.
if (fallos.some((f) => f.includes('la tienda corta'))) process.exit(1)
