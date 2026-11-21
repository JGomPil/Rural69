import { JuegoDeMusica } from '../components/juegos/JuegoDeMusica'
import { cargaLasCanciones } from '../lib/juegos/canciones'

export function QueCancionSuena() {
  return (
    <JuegoDeMusica
      juego="quecancion"
      llave="rural69-quecancion"
      titulo="¿Qué canción suena?"
      lema="Pop y rock del 60 al 2010, treinta segundos cada una."
      cosa="canción"
      cosas="canciones"
      // Media canción se saca en cuatro segundos: con sesenta sobraba medio
      // minuto de relleno, así que aquí el reloj entra más corto y las
      // partidas son más largas.
      segundosPorDefecto={30}
      rondasPorDefecto={15}
      carga={cargaLasCanciones}
      comoVa={
        <>
          Suenan treinta segundos de una canción y se grita cuál es. La música sale por{' '}
          <strong>un solo móvil</strong> —el que esté al lado del altavoz—, y ese mismo apunta quién
          la ha sacado. Nadie escribe nada.
        </>
      }
      comoSeJuega={
        <>
          <p>
            Suenan treinta segundos de una canción de pop o rock de 1960 a 2010 y{' '}
            <strong>se grita</strong>. Nadie escribe nada: el que pone la música hace de moderador,
            toca el nombre del que la ha sacado y a la siguiente.
          </p>
          <p>
            <strong>Vale el título y vale el grupo</strong>, que en el salón se grita lo que salga
            antes. Como lo que vale lo decide la mesa, también valen los acuerdos de la casa: que
            haya que decir las dos cosas, o que el que la cante entera se lleve dos puntos.
          </p>
          <p>
            <strong>Suena en un solo móvil</strong>, el que esté más cerca del altavoz. Diez
            teléfonos medio segundo desincronizados no es música, es ruido. Y si el que la lleva se
            va con el móvil en el bolsillo, cualquiera recoge el mando con «que suene aquí».
          </p>
          <p>
            El trozo lo elige la tienda, no nosotros: en una canción casi siempre cae el estribillo,
            que es justo lo que delata. Un tercio del repertorio es en español.
          </p>
          <p className="text-suave">
            La música son las previsualizaciones de la tienda de Apple, las mismas que suenan al
            mirar una canción antes de comprarla. No se guarda nada: el móvil que hace de altavoz va
            a buscarlas en el momento, así que hace falta internet.
          </p>
        </>
      }
    />
  )
}
