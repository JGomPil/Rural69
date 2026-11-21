import { JuegoDeMusica } from '../components/juegos/JuegoDeMusica'
import { cargaLasBandas } from '../lib/juegos/bandas'

export function QuePeliSuena() {
  return (
    <JuegoDeMusica
      juego="quepeli"
      llave="rural69-quepeli"
      titulo="¿Qué peli suena?"
      lema="Treinta segundos de banda sonora, y a ver quién la saca."
      cosa="película"
      cosas="películas"
      segundosPorDefecto={45}
      rondasPorDefecto={10}
      carga={cargaLasBandas}
      comoVa={
        <>
          Suenan treinta segundos de una banda sonora y se grita de qué película es. La música sale
          por <strong>un solo móvil</strong> —el que esté al lado del altavoz—, y ese mismo apunta
          quién la ha sacado. Nadie escribe nada.
        </>
      }
      comoSeJuega={
        <>
          <p>
            Suenan treinta segundos de una banda sonora —el tema de la película, no una versión— y{' '}
            <strong>se grita</strong>. Nadie escribe nada: el que pone la música hace de moderador,
            toca el nombre del que la ha sacado y a la siguiente. La música da vueltas hasta
            entonces, o hasta que se acabe el tiempo.
          </p>
          <p>
            <strong>Suena en un solo móvil</strong>, el que esté más cerca del altavoz. Diez
            teléfonos medio segundo desincronizados no es música, es ruido. Quien modera juega
            igual: no ve nada que no oigan los demás hasta que se destapa. Y si se va con el móvil
            en el bolsillo, cualquiera recoge el mando con «que suene aquí».
          </p>
          <p>
            Lo que vale y lo que no lo decide la mesa, como en el salón de casa: «la de los piratas»
            cuenta si todo el mundo está de acuerdo.
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
