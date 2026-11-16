import { useEffect, useState } from 'react'
import { ImagePlus, Link2, Loader2, Trash2 } from 'lucide-react'
import { Boton } from '../ui/Boton'
import { AreaTexto, Campo, Entrada, Interruptor } from '../ui/Campos'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { mensajeError, supabase } from '../../lib/supabase'
import { subeFoto } from '../../lib/subidas'
import type { House, HousePhoto } from '../../lib/types'

interface Props {
  abierto: boolean
  onCerrar: () => void
  tripId: string
  casa?: House | null
  onGuardada: () => void
}

const VACIA = {
  name: '',
  url: '',
  town: '',
  province: '',
  total_price: '',
  max_guests: '',
  bedrooms: '',
  bathrooms: '',
  common_spaces: '',
  features: '',
  notes: '',
  cover_image_url: '',
}

export function FormularioCasa({ abierto, onCerrar, tripId, casa, onGuardada }: Props) {
  const { perfil } = useAuth()
  const avisos = useAvisos()
  const [campos, setCampos] = useState(VACIA)
  const [extras, setExtras] = useState({ has_pool: false, has_bbq: false, has_garden: false, pets_allowed: false })
  const [fotos, setFotos] = useState<string[]>([])
  const [urlFoto, setUrlFoto] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setUrlFoto('')
    if (casa) {
      setCampos({
        name: casa.name,
        url: casa.url ?? '',
        town: casa.town ?? '',
        province: casa.province ?? '',
        total_price: casa.total_price != null ? String(casa.total_price) : '',
        max_guests: casa.max_guests != null ? String(casa.max_guests) : '',
        bedrooms: casa.bedrooms != null ? String(casa.bedrooms) : '',
        bathrooms: casa.bathrooms != null ? String(casa.bathrooms) : '',
        common_spaces: casa.common_spaces ?? '',
        features: casa.features ?? '',
        notes: casa.notes ?? '',
        cover_image_url: casa.cover_image_url ?? '',
      })
      setExtras({
        has_pool: casa.has_pool,
        has_bbq: casa.has_bbq,
        has_garden: casa.has_garden,
        pets_allowed: casa.pets_allowed,
      })
      void supabase
        .from('house_photos')
        .select('*')
        .eq('house_id', casa.id)
        .order('sort_order')
        .then(({ data }) => setFotos(((data ?? []) as HousePhoto[]).map((f) => f.url)))
    } else {
      setCampos(VACIA)
      setExtras({ has_pool: false, has_bbq: false, has_garden: false, pets_allowed: false })
      setFotos([])
    }
  }, [abierto, casa])

  const cambia = (clave: keyof typeof VACIA) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCampos((prev) => ({ ...prev, [clave]: e.target.value }))

  const anyadeUrl = () => {
    const limpia = urlFoto.trim()
    if (!limpia) return
    setFotos((prev) => [...prev, limpia])
    setUrlFoto('')
  }

  const sube = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? [])
    if (!archivos.length) return
    setSubiendo(true)
    try {
      const urls: string[] = []
      for (const archivo of archivos) urls.push(await subeFoto(archivo))
      setFotos((prev) => [...prev, ...urls])
      avisos.ok(archivos.length === 1 ? 'Foto subida.' : `${archivos.length} fotos subidas.`)
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  const numeroODato = (v: string) => (v.trim() === '' ? null : Number(v))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!campos.name.trim()) {
      setError('La casa necesita un nombre.')
      return
    }
    if (campos.url && !/^https?:\/\//i.test(campos.url.trim())) {
      setError('La URL debe empezar por http:// o https://')
      return
    }
    setGuardando(true)
    try {
      const datos = {
        trip_id: tripId,
        name: campos.name.trim(),
        url: campos.url.trim() || null,
        town: campos.town.trim() || null,
        province: campos.province.trim() || null,
        total_price: numeroODato(campos.total_price),
        max_guests: numeroODato(campos.max_guests),
        bedrooms: numeroODato(campos.bedrooms),
        bathrooms: numeroODato(campos.bathrooms),
        common_spaces: campos.common_spaces.trim() || null,
        features: campos.features.trim() || null,
        notes: campos.notes.trim() || null,
        cover_image_url: campos.cover_image_url.trim() || fotos[0] || null,
        ...extras,
      }

      let houseId = casa?.id
      if (casa) {
        const { error: err } = await supabase.from('houses').update(datos).eq('id', casa.id)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase
          .from('houses')
          .insert({ ...datos, proposed_by: perfil?.id ?? null })
          .select('id')
          .single()
        if (err) throw err
        houseId = data.id as string
      }

      if (houseId) {
        const { error: errBorrado } = await supabase.from('house_photos').delete().eq('house_id', houseId)
        if (errBorrado) throw errBorrado
        if (fotos.length) {
          const filas = fotos.map((url, i) => ({ house_id: houseId, url, sort_order: i }))
          const { error: errIns } = await supabase.from('house_photos').insert(filas)
          if (errIns) throw errIns
        }
      }

      avisos.ok(casa ? 'Casa actualizada.' : '¡Casa añadida a las candidatas!')
      onGuardada()
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={casa ? 'Editar casa rural' : 'Añadir casa rural'}
      descripcion="Rellena solo lo que sepas: el resto se puede completar después."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-casa" cargando={guardando}>
            {casa ? 'Guardar cambios' : 'Añadir casa'}
          </Boton>
        </>
      }
    >
      <form id="form-casa" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Nombre de la casa" requerido>
          <Entrada value={campos.name} onChange={cambia('name')} placeholder="Casa Rural El Robledal" required />
        </Campo>

        <Campo etiqueta="Web de la casa" ayuda="Se mostrará como enlace para abrirla rápido.">
          <Entrada
            type="url"
            value={campos.url}
            onChange={cambia('url')}
            placeholder="https://…"
            inputMode="url"
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Localidad">
            <Entrada value={campos.town} onChange={cambia('town')} />
          </Campo>
          <Campo etiqueta="Provincia">
            <Entrada value={campos.province} onChange={cambia('province')} />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Campo etiqueta="Precio total (€)">
            <Entrada
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={campos.total_price}
              onChange={cambia('total_price')}
            />
          </Campo>
          <Campo etiqueta="Plazas">
            <Entrada type="number" min="0" inputMode="numeric" value={campos.max_guests} onChange={cambia('max_guests')} />
          </Campo>
          <Campo etiqueta="Habitaciones">
            <Entrada type="number" min="0" inputMode="numeric" value={campos.bedrooms} onChange={cambia('bedrooms')} />
          </Campo>
          <Campo etiqueta="Baños">
            <Entrada type="number" min="0" inputMode="numeric" value={campos.bathrooms} onChange={cambia('bathrooms')} />
          </Campo>
        </div>

        <div className="rounded-2xl border border-arena bg-superficie p-4">
          <p className="mb-3 text-sm font-semibold text-tenue">¿Qué tiene?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Interruptor
              checked={extras.has_pool}
              onChange={(v) => setExtras((p) => ({ ...p, has_pool: v }))}
              etiqueta="🏊 Piscina"
            />
            <Interruptor
              checked={extras.has_bbq}
              onChange={(v) => setExtras((p) => ({ ...p, has_bbq: v }))}
              etiqueta="🔥 Barbacoa"
            />
            <Interruptor
              checked={extras.has_garden}
              onChange={(v) => setExtras((p) => ({ ...p, has_garden: v }))}
              etiqueta="🌳 Jardín o terreno"
            />
            <Interruptor
              checked={extras.pets_allowed}
              onChange={(v) => setExtras((p) => ({ ...p, pets_allowed: v }))}
              etiqueta="🐕 Admite mascotas"
            />
          </div>
        </div>

        <Campo etiqueta="Espacios comunes" ayuda="Salón con chimenea, porche, comedor grande…">
          <Entrada value={campos.common_spaces} onChange={cambia('common_spaces')} />
        </Campo>

        <Campo etiqueta="Características principales">
          <AreaTexto value={campos.features} onChange={cambia('features')} placeholder="Calefacción, wifi, dos plantas…" />
        </Campo>

        {/* -------- Fotografías -------- */}
        <div className="rounded-2xl border border-arena bg-superficie p-4">
          <p className="mb-1 text-sm font-semibold text-tenue">Fotografías</p>
          <p className="mb-3 text-xs text-suave">
            Pega la URL de una foto de la web de la casa o sube imágenes desde el móvil. La primera se usa como portada.
          </p>

          {fotos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((url, i) => (
                <div key={`${url}-${i}`} className="group relative aspect-4/3 overflow-hidden rounded-xl bg-beige">
                  <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded-full bg-bosque-600 px-1.5 py-0.5 text-[10px] font-bold text-tinta-fuerte">
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Quitar foto"
                    className="absolute top-1 right-1 rounded-full bg-velo/70 p-1 text-white opacity-90"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 gap-2">
              <Entrada
                value={urlFoto}
                onChange={(e) => setUrlFoto(e.target.value)}
                placeholder="https://…/foto.jpg"
                inputMode="url"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    anyadeUrl()
                  }
                }}
              />
              <Boton type="button" variante="suave" onClick={anyadeUrl}>
                <Link2 size={16} /> Añadir
              </Boton>
            </div>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-arena bg-superficie px-4 text-sm font-semibold text-bosque-700 transition hover:bg-beige">
              {subiendo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              Subir fotos
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void sube(e)} />
            </label>
          </div>
        </div>

        <Campo etiqueta="Comentarios y observaciones">
          <AreaTexto
            value={campos.notes}
            onChange={cambia('notes')}
            placeholder="Está a 10 minutos del pueblo, la cocina es pequeña…"
          />
        </Campo>

        {error && (
          <p className="rounded-2xl border border-tierra-200 bg-tierra-100 px-3.5 py-2.5 text-sm font-medium text-tierra-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
