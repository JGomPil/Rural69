import { useMemo, useState } from 'react'
import { Archive, Download, Plus, Search } from 'lucide-react'
import { useConsulta } from '../hooks/useConsulta'
import { useAvisos } from '../hooks/useAvisos'
import { useGrupo } from '../hooks/useGrupo'
import { mensajeError, supabase } from '../lib/supabase'
import { estiloCategoria } from '../lib/constantes'
import { clave } from '../lib/cantidades'
import { numero } from '../lib/formato'
import { descarga, generaCSV, nombreArchivo } from '../lib/exportar'
import { Boton } from '../components/ui/Boton'
import { Entrada, Interruptor } from '../components/ui/Campos'
import { Confirmar } from '../components/ui/Modal'
import { AvisoError, Cargando, Tarjeta, Vacio } from '../components/ui/Varios'
import { FormularioSobrante } from '../components/trip/FormularioSobrante'
import { TarjetaSobrante } from '../components/trip/Sobrantes'
import type { PantryItem } from '../lib/types'

export function Despensa() {
  const { escapadas } = useGrupo()
  const avisos = useAvisos()
  const [busqueda, setBusqueda] = useState('')
  const [soloConservables, setSoloConservables] = useState(false)
  const [verAgotados, setVerAgotados] = useState(false)
  const [form, setForm] = useState<{ item?: PantryItem | null } | null>(null)
  const [borrando, setBorrando] = useState<PantryItem | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  const { datos, cargando, error, refrescar } = useConsulta<PantryItem[]>(
    async () => {
      const { data, error: err } = await supabase
        .from('pantry_items')
        .select('*')
        .order('category')
        .order('name')
      if (err) throw err
      return (data ?? []) as PantryItem[]
    },
    [],
    { realtime: ['pantry_items'] },
  )

  const lista = useMemo(() => datos ?? [], [datos])

  const grupos = useMemo(() => {
    const texto = clave(busqueda)
    const filtrados = lista.filter((p) => {
      if (!verAgotados && p.qty <= 0) return false
      if (soloConservables && !p.keepable) return false
      if (texto && !clave(p.name).includes(texto) && !clave(p.category).includes(texto)) return false
      return true
    })
    const mapa = new Map<string, PantryItem[]>()
    for (const p of filtrados) {
      if (!mapa.has(p.category)) mapa.set(p.category, [])
      mapa.get(p.category)!.push(p)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [lista, busqueda, soloConservables, verAgotados])

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('pantry_items').delete().eq('id', borrando.id)
      if (err) throw err
      await refrescar(true)
      avisos.ok('Quitado de la despensa.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
      setBorrando(null)
    }
  }

  const exportar = () => {
    const filas = lista.map((p) => [
      p.category,
      p.name,
      numero(p.qty),
      p.unit,
      p.condition ?? '',
      p.keepable ? 'Sí' : 'No',
      escapadas.find((t) => t.id === p.source_trip_id)?.title ?? '',
      p.notes ?? '',
    ])
    descarga(
      nombreArchivo('despensa-rural69', 'csv'),
      generaCSV(['Categoría', 'Producto', 'Cantidad', 'Unidad', 'Estado', 'Se conserva', 'De la escapada', 'Observaciones'], filas),
    )
    avisos.ok('CSV descargado.')
  }

  if (cargando) return <Cargando texto="Abriendo la despensa…" />

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl text-bosque-800 sm:text-3xl">
            <Archive size={26} /> Despensa
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-suave">
            Todo lo que sobró de escapadas anteriores y se conserva para la siguiente.
          </p>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={exportar} disabled={lista.length === 0}>
            <Download size={17} /> CSV
          </Boton>
          <Boton onClick={() => setForm({ item: null })}>
            <Plus size={18} /> Añadir
          </Boton>
        </div>
      </header>

      {error && <AvisoError texto={error} onReintentar={() => void refrescar()} />}

      {lista.length === 0 ? (
        <Vacio
          emoji="🫙"
          titulo="La despensa está vacía"
          texto="Al terminar una escapada, apuntad lo que haya sobrado desde la pestaña «Sobrantes». Aparecerá aquí y se tendrá en cuenta en la próxima compra."
          accion={
            <Boton onClick={() => setForm({ item: null })}>
              <Plus size={18} /> Apuntar algo
            </Boton>
          }
        />
      ) : (
        <>
          <div className="space-y-2.5">
            <div className="relative">
              <Search size={17} className="absolute top-3.5 left-3.5 text-carbon/35" />
              <Entrada
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en la despensa…"
                aria-label="Buscar en la despensa"
                className="pl-10"
              />
            </div>
            <Tarjeta className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Interruptor
                checked={soloConservables}
                onChange={setSoloConservables}
                etiqueta="Solo lo que se conserva"
              />
              <Interruptor checked={verAgotados} onChange={setVerAgotados} etiqueta="Ver agotados" />
              <span className="text-sm text-suave">
                {lista.filter((p) => p.qty > 0).length} disponibles · {lista.length} registrados
              </span>
            </Tarjeta>
          </div>

          {grupos.length === 0 ? (
            <Vacio emoji="🔍" titulo="Nada coincide con la búsqueda" />
          ) : (
            <div className="space-y-5">
              {grupos.map(([categoria, items]) => {
                const estilo = estiloCategoria(categoria)
                return (
                  <section key={categoria}>
                    <h2
                      className={`mb-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${estilo.clase}`}
                    >
                      <span aria-hidden>{estilo.emoji}</span> {categoria}
                      <span className="opacity-60">({items.length})</span>
                    </h2>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {items.map((p) => (
                        <TarjetaSobrante
                          key={p.id}
                          item={p}
                          origen={escapadas.find((t) => t.id === p.source_trip_id)?.title}
                          onEditar={() => setForm({ item: p })}
                          onBorrar={() => setBorrando(p)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      <FormularioSobrante
        abierto={Boolean(form)}
        onCerrar={() => setForm(null)}
        item={form?.item ?? null}
        onHecho={() => void refrescar(true)}
      />
      <Confirmar
        abierto={Boolean(borrando)}
        titulo={`¿Quitar «${borrando?.name}» de la despensa?`}
        textoAceptar="Sí, quitar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  )
}
