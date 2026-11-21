import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { Campo, Entrada, Lista } from '../ui/Campos'
import { Tarjeta } from '../ui/Varios'
import { faltaPasarSql, mensajeError, supabase } from '../../lib/supabase'
import { useAvisos } from '../../hooks/useAvisos'
import { CATEGORIAS, type CategoriaId } from '../../lib/juegos/trivial'
import type { PreguntaNuestra } from '../../lib/juegos/baraja'

/**
 * Las preguntas que escribimos nosotros.
 *
 * Las de serie son 1.523 y no se tocan; estas nacen en mitad del finde
 * —«¿cuántos años tenía Leo cuando…?»— y son las que de verdad hacen
 * gracia. Por eso el formulario está aquí, en la pantalla del juego, y
 * no escondido en los ajustes: la pregunta buena se escribe en el
 * momento en que a alguien se le ocurre, no al día siguiente.
 */
export function PreguntasNuestras({
  nuestras,
  miPerfil,
  onCambio,
}: {
  nuestras: PreguntaNuestra[]
  miPerfil: string | null
  onCambio: () => void
}) {
  const avisos = useAvisos()
  const [abierto, setAbierto] = useState(false)
  const [categoria, setCategoria] = useState<CategoriaId>('nosotros')
  const [pregunta, setPregunta] = useState('')
  const [buena, setBuena] = useState('')
  const [malas, setMalas] = useState(['', '', ''])
  const [guardando, setGuardando] = useState(false)

  const limpias = malas.map((m) => m.trim()).filter(Boolean)
  const puede = pregunta.trim().length >= 5 && buena.trim().length > 0 && limpias.length >= 1

  const guarda = async () => {
    if (!puede || !miPerfil) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('trivia_questions').insert({
        category: categoria,
        question: pregunta.trim(),
        correct: buena.trim(),
        wrong: limpias,
        author_id: miPerfil,
      })
      if (error) throw error
      setPregunta('')
      setBuena('')
      setMalas(['', '', ''])
      avisos.ok('Pregunta añadida. Entra en la baraja en la siguiente partida.')
      onCambio()
    } catch (e) {
      avisos.error(faltaPasarSql(e) ?? mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const borra = async (id: string) => {
    try {
      const { error } = await supabase.from('trivia_questions').delete().eq('id', id)
      if (error) throw error
      onCambio()
    } catch (e) {
      avisos.error(faltaPasarSql(e) ?? mensajeError(e))
    }
  }

  return (
    <Tarjeta className="overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-base font-semibold text-bosque-800">
          Nuestras preguntas{' '}
          <span className="text-sm font-normal text-suave">
            ({nuestras.length} {nuestras.length === 1 ? 'añadida' : 'añadidas'})
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-tenue transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div className="space-y-4 border-t border-arena p-4">
          <Campo etiqueta="De qué va">
            <Lista value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaId)}>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nombre}
                </option>
              ))}
            </Lista>
          </Campo>

          <Campo etiqueta="La pregunta">
            <Entrada
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="¿En qué año...?"
              maxLength={300}
            />
          </Campo>

          <Campo etiqueta="La respuesta buena">
            <Entrada
              value={buena}
              onChange={(e) => setBuena(e.target.value)}
              placeholder="La que vale"
              maxLength={120}
            />
          </Campo>

          <Campo etiqueta="Las que no" ayuda="De una a tres. Cuanto más creíbles, mejor.">
            <div className="space-y-2">
              {malas.map((m, i) => (
                <Entrada
                  key={i}
                  value={m}
                  onChange={(e) => setMalas((l) => l.map((x, k) => (k === i ? e.target.value : x)))}
                  placeholder={`Respuesta falsa ${i + 1}`}
                  maxLength={120}
                />
              ))}
            </div>
          </Campo>

          <Boton ancho disabled={!puede} cargando={guardando} onClick={() => void guarda()}>
            <Plus size={16} /> Añadir a la baraja
          </Boton>

          {nuestras.length > 0 && (
            <ul className="divide-y divide-arena/70 border-t border-arena pt-2">
              {nuestras.map((n) => (
                <li key={n.id} className="flex items-start gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-carbon">{n.question}</span>
                    <span className="block text-xs text-suave">
                      {CATEGORIAS.find((c) => c.id === n.category)?.nombre} · {n.correct}
                      {n.autor && ` · de ${n.autor}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="Borrar la pregunta"
                    onClick={() => void borra(n.id)}
                    className="mt-0.5 shrink-0 rounded-lg p-1.5 text-carbon/35 transition hover:bg-tierra-50 hover:text-tierra-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Tarjeta>
  )
}
