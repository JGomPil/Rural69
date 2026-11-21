import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CloudOff, Dices, Info } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGrupo } from '../hooks/useGrupo'
import { useConsulta } from '../hooks/useConsulta'
import { supabase } from '../lib/supabase'
import { Cargando } from '../components/ui/Varios'
import { TrivialJugadores } from '../components/juegos/TrivialJugadores'
import { TrivialPartida } from '../components/juegos/TrivialPartida'
import { PreguntasNuestras } from '../components/juegos/PreguntasNuestras'
import { useMesa } from '../lib/juegos/sincronia'
import {
  cargaLaBaraja,
  cuentaLaBaraja,
  hazSacador,
  type BarajaBase,
  type PreguntaNuestra,
} from '../lib/juegos/baraja'
import { guardaPartidaT, leePartidaT, nuevaPartidaT, type PartidaT } from '../lib/juegos/trivial'

interface FilaPregunta {
  id: string
  category: PreguntaNuestra['category']
  question: string
  correct: string
  wrong: string[]
  profiles: { name: string } | null
}

export function Trivial() {
  const { perfil } = useAuth()
  const { miembros } = useGrupo()
  // De los abiertos: cada uno tira y contesta desde su móvil.
  const mesa = useMesa<PartidaT>('trivial', perfil?.id ?? null, {
    guarda: guardaPartidaT,
    lee: leePartidaT,
    todosJuegan: true,
  })

  // Las 1.523 de serie viven en un .json aparte que se trae solo al
  // entrar aquí: quien no juega al Trivial no las descarga nunca.
  const [base, setBase] = useState<BarajaBase | null>(null)
  useEffect(() => {
    void cargaLaBaraja().then(setBase)
  }, [])

  const { datos, refrescar } = useConsulta(
    async () => {
      const { data, error } = await supabase
        .from('trivia_questions')
        .select('id, category, question, correct, wrong, profiles:author_id (name)')
        .order('created_at', { ascending: false })
      // Si falta la tabla, se juega con las de serie y ya está.
      if (error) return [] as FilaPregunta[]
      return (data ?? []) as unknown as FilaPregunta[]
    },
    [],
    { realtime: ['trivia_questions'], copia: 'rural69-preguntas-nuestras' },
  )

  const nuestras: PreguntaNuestra[] = useMemo(
    () =>
      (datos ?? []).map((f) => ({
        id: f.id,
        category: f.category,
        question: f.question,
        correct: f.correct,
        wrong: f.wrong ?? [],
        autor: f.profiles?.name ?? null,
      })),
    [datos],
  )

  const saca = useMemo(() => (base ? hazSacador(base, nuestras) : null), [base, nuestras])
  const cuenta = cuentaLaBaraja(base, nuestras)
  const empieza = useCallback(
    (o: Parameters<typeof nuevaPartidaT>[0]) => void mesa.empieza(nuevaPartidaT(o)),
    [mesa],
  )

  return (
    <div className="space-y-5">
      <header className="animate-sube flex items-start gap-3">
        <Link
          to="/juegos"
          aria-label="Volver a los juegos"
          className="mt-1 text-carbon/40 transition hover:text-bosque-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800">
            <Dices size={22} className="text-tierra-600" /> Trivial de la casa
          </h1>
          <p className="text-sm text-tenue">
            {mesa.partida ? 'Partida en marcha.' : 'Cinco quesitos y una pregunta de «Nosotros».'}
          </p>
        </div>
      </header>

      {mesa.cargando || !saca ? (
        <Cargando texto={saca ? 'Mirando si hay partida…' : 'Barajando las preguntas…'} />
      ) : mesa.partida ? (
        <>
          <TrivialPartida
            partida={mesa.partida}
            miPerfil={perfil?.id ?? null}
            aSolas={mesa.aSolas}
            desfase={mesa.desfase}
            saca={saca}
            onCambia={mesa.publica}
            onSalir={() => void mesa.termina()}
          />
          {mesa.aSolas && (
            <p className="flex items-center justify-center gap-2 text-center text-xs text-suave">
              <CloudOff size={14} /> Sin línea con el servidor: se juega con este móvil, pasándolo de
              mano en mano.
            </p>
          )}
        </>
      ) : (
        <>
          <TrivialJugadores
            gente={miembros.filter((m) => m.active)}
            preguntas={cuenta.total}
            onEmpezar={empieza}
          />
          <PreguntasNuestras
            nuestras={nuestras}
            miPerfil={perfil?.id ?? null}
            onCambio={refrescar}
          />
          <ComoSeJuega />
        </>
      )}
    </div>
  )
}

function ComoSeJuega() {
  return (
    <details className="group rounded-2xl border border-arena bg-superficie">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-bosque-700">
        <Info size={16} /> Cómo se juega
      </summary>
      <div className="space-y-2 border-t border-arena px-4 py-3 text-sm text-tenue">
        <p>
          El de toda la vida, con el tablero del <em>trivialrural</em>: anillo de treinta casillas,
          cinco corredores y el centro. En su turno, cada uno tira y <strong>toca en el tablero</strong>{' '}
          la casilla a la que quiere ir —casi siempre hay varias—, y contesta la pregunta del color
          donde cae.
        </p>
        <p>
          En las cinco casillas de quesito se gana el quesito de ese color. Con los cinco, hay que
          volver al centro: allí esperan <strong>cinco preguntas seguidas</strong>, una de cada
          categoría. Fallar una cuesta un quesito, así que no se entra por si acaso.
        </p>
        <p>
          Acertar no da otro turno —con diez personas eso es una mesa esperando—, salvo en las
          casillas de dado, que vuelven a tirar.
        </p>
        <p>
          Cada uno juega desde su móvil: se abre el Trivial, se dice quién eres y ya. El tablero va a
          la vez en todas las pantallas.
        </p>
        <p className="text-suave">
          Las preguntas son 1.523, y las de «Nosotros» hablan de nosotros. Se pueden añadir más desde
          aquí mismo, y entran en la baraja en la siguiente partida.
        </p>
      </div>
    </details>
  )
}
