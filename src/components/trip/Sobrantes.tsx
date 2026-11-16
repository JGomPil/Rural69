import { useMemo, useState } from 'react'
import { Archive, CheckCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useConsulta } from '../../hooks/useConsulta'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useGrupo } from '../../hooks/useGrupo'
import { mensajeError, supabase } from '../../lib/supabase'
import { cantidad } from '../../lib/formato'
import { estiloCategoria } from '../../lib/constantes'
import { Boton, BotonIcono } from '../ui/Boton'
import { Confirmar } from '../ui/Modal'
import { AvisoError, Cargando, Etiqueta, Seccion, Tarjeta, Vacio } from '../ui/Varios'
import { FormularioSobrante } from './FormularioSobrante'
import type { PantryItem, ShoppingItem } from '../../lib/types'

export function Sobrantes() {
  const { escapada, recargar } = useEscapada()
  const { esAdmin } = useAuth()
  const { escapadas } = useGrupo()
  const avisos = useAvisos()
  const [form, setForm] = useState<{ item?: PantryItem | null; inicial?: Partial<PantryItem> | null } | null>(null)
  const [borrando, setBorrando] = useState<PantryItem | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const [despensa, compra] = await Promise.all([
        supabase.from('pantry_items').select('*').order('category').order('name'),
        supabase.from('shopping_items').select('*').eq('trip_id', escapada.id).order('category').order('name'),
      ])
      if (despensa.error) throw despensa.error
      if (compra.error) throw compra.error
      return {
        despensa: (despensa.data ?? []) as PantryItem[],
        compra: (compra.data ?? []) as ShoppingItem[],
      }
    },
    [escapada.id],
    { realtime: ['pantry_items', 'shopping_items'] },
  )

  const deEstaEscapada = useMemo(
    () => (datos?.despensa ?? []).filter((p) => p.source_trip_id === escapada.id && p.qty > 0),
    [datos?.despensa, escapada.id],
  )
  const deOtras = useMemo(
    () => (datos?.despensa ?? []).filter((p) => p.source_trip_id !== escapada.id && p.qty > 0),
    [datos?.despensa, escapada.id],
  )

  /** Productos comprados en esta escapada que todavía no se han registrado como sobrante. */
  const candidatos = useMemo(() => {
    const yaRegistrados = new Set(deEstaEscapada.map((p) => p.name.toLowerCase()))
    return (datos?.compra ?? []).filter((i) => i.purchased && !yaRegistrados.has(i.name.toLowerCase()))
  }, [datos?.compra, deEstaEscapada])

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

  const marcarConsumido = async (item: PantryItem) => {
    try {
      // Se conserva la fila con cantidad 0: así el historial sigue sabiendo
      // qué productos sobran y qué productos siempre se acaban.
      const { error: err } = await supabase.from('pantry_items').update({ qty: 0 }).eq('id', item.id)
      if (err) throw err
      await refrescar(true)
      avisos.ok(`${item.name}: marcado como consumido.`)
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  const marcarRealizada = async () => {
    try {
      const { error: err } = await supabase.from('trips').update({ status: 'realizada' }).eq('id', escapada.id)
      if (err) throw err
      await recargar()
      avisos.ok('Escapada marcada como realizada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    }
  }

  if (cargando) return <Cargando texto="Cargando sobrantes…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  return (
    <div className="space-y-6">
      <Tarjeta className="flex flex-wrap items-center justify-between gap-3 bg-oliva-100/60 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg text-bosque-800">
            <Archive size={19} /> ¿Qué ha sobrado?
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-tenue">
            Apuntad lo que vuelve a casa: la próxima vez el sistema lo tendrá en cuenta para no comprar de más.
          </p>
        </div>
        <Boton onClick={() => setForm({ inicial: null })}>
          <Plus size={18} /> Apuntar sobrante
        </Boton>
      </Tarjeta>

      {/* -------- Sobrantes de esta escapada -------- */}
      <Seccion titulo="Sobrantes de esta escapada" icono={<span aria-hidden>🧺</span>}>
        {deEstaEscapada.length === 0 ? (
          <Vacio
            emoji="🫙"
            titulo="Todavía no habéis apuntado nada"
            texto="Al volver, repasad la cocina y apuntad lo que queda: aceite, arroz, vino, latas…"
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {deEstaEscapada.map((p) => (
              <TarjetaSobrante
                key={p.id}
                item={p}
                onEditar={() => setForm({ item: p })}
                onBorrar={() => setBorrando(p)}
              />
            ))}
          </div>
        )}
      </Seccion>

      {/* -------- Atajo desde la lista de la compra -------- */}
      {candidatos.length > 0 && (
        <Seccion
          titulo="Apuntar rápido desde la compra"
          icono={<span aria-hidden>⚡</span>}
          className="rounded-card bg-superficie/60 p-4"
        >
          <p className="mb-3 text-sm text-suave">
            Pulsa un producto que hayáis comprado para apuntar cuánto ha sobrado.
          </p>
          <div className="flex flex-wrap gap-2">
            {candidatos.slice(0, 40).map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() =>
                  setForm({
                    inicial: {
                      name: i.name,
                      category: i.category,
                      unit: i.unit,
                      qty: 0,
                      master_item_id: i.master_item_id,
                    },
                  })
                }
                className="rounded-full border border-arena bg-superficie px-3 py-1.5 text-sm font-medium transition hover:border-bosque-400 hover:bg-bosque-50 active:scale-95"
              >
                {i.name}
              </button>
            ))}
          </div>
        </Seccion>
      )}

      {/* -------- Despensa de escapadas anteriores -------- */}
      {deOtras.length > 0 && (
        <Seccion titulo="Lo que ya había en la despensa" icono={<span aria-hidden>📦</span>}>
          <p className="mb-3 text-sm text-suave">
            Si algo se ha consumido en esta escapada, quítalo aquí para que la despensa quede al día.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {deOtras.map((p) => {
              const origen = escapadas.find((t) => t.id === p.source_trip_id)
              return (
                <TarjetaSobrante
                  key={p.id}
                  item={p}
                  origen={origen?.title}
                  onEditar={() => setForm({ item: p })}
                  onBorrar={() => setBorrando(p)}
                  onConsumido={() => void marcarConsumido(p)}
                />
              )
            })}
          </div>
        </Seccion>
      )}

      {esAdmin && escapada.status !== 'realizada' && escapada.status !== 'archivada' && (
        <div className="flex justify-center">
          <Boton variante="suave" onClick={() => void marcarRealizada()}>
            <CheckCheck size={17} /> Marcar la escapada como realizada
          </Boton>
        </div>
      )}

      <FormularioSobrante
        abierto={Boolean(form)}
        onCerrar={() => setForm(null)}
        tripId={escapada.id}
        item={form?.item ?? null}
        inicial={form?.inicial ?? null}
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

export function TarjetaSobrante({
  item,
  origen,
  onEditar,
  onBorrar,
  onConsumido,
}: {
  item: PantryItem
  origen?: string
  onEditar: () => void
  onBorrar: () => void
  onConsumido?: () => void
}) {
  const estilo = estiloCategoria(item.category)
  return (
    <Tarjeta className="flex items-start gap-3 p-3.5">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-base ${estilo.clase}`} aria-hidden>
        {estilo.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="font-semibold text-bosque-800">{item.name}</h3>
          <span className="font-display font-bold text-tierra-600">{cantidad(item.qty, item.unit)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.condition && <Etiqueta>{item.condition}</Etiqueta>}
          {!item.keepable && <Etiqueta tono="tierra">no se guarda</Etiqueta>}
          {origen && <span className="text-xs text-suave">de {origen}</span>}
        </div>
        {item.notes && <p className="mt-1 text-sm text-suave">{item.notes}</p>}
        {onConsumido && (
          <button
            type="button"
            onClick={onConsumido}
            className="mt-1.5 text-xs font-semibold text-oliva-700 hover:underline"
          >
            Se ha consumido
          </button>
        )}
      </div>
      <div className="-mt-1 -mr-1 flex shrink-0">
        <BotonIcono etiqueta="Editar" onClick={onEditar}>
          <Pencil size={15} />
        </BotonIcono>
        <BotonIcono etiqueta="Quitar" tono="peligro" onClick={onBorrar}>
          <Trash2 size={15} />
        </BotonIcono>
      </div>
    </Tarjeta>
  )
}
