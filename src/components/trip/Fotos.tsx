import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ChevronLeft, ChevronRight, Download, ImagePlus, Pencil, Trash2, X } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useConsulta } from '../../hooks/useConsulta'
import { faltaPasarSql, mensajeError, supabase } from '../../lib/supabase'
import { subeFoto } from '../../lib/subidas'
import { diaDeChat } from '../../lib/formato'
import { Boton, BotonIcono } from '../ui/Boton'
import { Confirmar, Modal } from '../ui/Modal'
import { Campo, Entrada } from '../ui/Campos'
import { Persona } from '../ui/Persona'
import { AvisoError, Cargando, Tarjeta, Vacio } from '../ui/Varios'
import type { TripPhoto } from '../../lib/types'

/**
 * Las fotos de después.
 *
 * No confundir con las de la casa candidata, que son para decidir. Estas
 * son las que alguien hizo allí, y son lo que hace que el grupo vuelva a
 * abrir la aplicación cuando la escapada ya pasó.
 *
 * Se suben varias de una vez, que es como salen del carrete, y se ve
 * cuántas van: en un móvil con cobertura de pueblo, subir diez fotos
 * tarda, y sin un número uno cree que se ha colgado.
 */
export function Fotos() {
  const { escapada } = useEscapada()
  const { perfil, esAdmin } = useAuth()
  const avisos = useAvisos()
  const archivo = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState<{ va: number; total: number } | null>(null)
  const [mirando, setMirando] = useState<number | null>(null)
  const [borrando, setBorrando] = useState<TripPhoto | null>(null)
  const [poniendoPie, setPoniendoPie] = useState<TripPhoto | null>(null)
  const [textoPie, setTextoPie] = useState('')
  const [enCurso, setEnCurso] = useState(false)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const { data, error: err } = await supabase
        .from('trip_photos')
        .select('*')
        .eq('trip_id', escapada.id)
        .order('created_at', { ascending: false })
      if (err) throw new Error(faltaPasarSql(err) ?? mensajeError(err))
      return (data ?? []) as TripPhoto[]
    },
    [escapada.id],
    { realtime: ['trip_photos'] },
  )

  const fotos = useMemo(() => datos ?? [], [datos])

  const sube = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ficheros = [...(e.target.files ?? [])]
    e.target.value = ''
    if (ficheros.length === 0) return
    setSubiendo({ va: 0, total: ficheros.length })
    let fallos = 0
    try {
      for (let i = 0; i < ficheros.length; i++) {
        setSubiendo({ va: i + 1, total: ficheros.length })
        try {
          const url = await subeFoto(ficheros[i], `escapadas/${escapada.id}`)
          const { error: err } = await supabase
            .from('trip_photos')
            .insert({ trip_id: escapada.id, url, uploaded_by: perfil?.id ?? null })
          if (err) throw err
        } catch (err) {
          fallos++
          console.error('Rural69: una foto no ha subido', err)
          // La última palabra la tiene el mensaje, pero seguimos con el resto:
          // que una foto pesada tire las otras nueve sería absurdo.
          if (fallos === 1) avisos.error(mensajeError(err))
        }
      }
      await refrescar(true)
      const bien = ficheros.length - fallos
      if (bien > 0) avisos.ok(bien === 1 ? 'Foto subida.' : `${bien} fotos subidas.`)
    } finally {
      setSubiendo(null)
    }
  }

  const abrePie = (foto: TripPhoto) => {
    setTextoPie(foto.caption ?? '')
    setPoniendoPie(foto)
  }

  const guardaPie = async () => {
    if (!poniendoPie) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase
        .from('trip_photos')
        .update({ caption: textoPie.trim() || null })
        .eq('id', poniendoPie.id)
      if (err) throw err
      setPoniendoPie(null)
      await refrescar(true)
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
    }
  }

  const borrar = async () => {
    if (!borrando) return
    setEnCurso(true)
    try {
      const { error: err } = await supabase.from('trip_photos').delete().eq('id', borrando.id)
      if (err) throw err
      setBorrando(null)
      await refrescar(true)
      avisos.ok('Foto borrada.')
    } catch (e) {
      avisos.error(mensajeError(e))
    } finally {
      setEnCurso(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando las fotos…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  const selector = (
    <input
      ref={archivo}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => void sube(e)}
    />
  )

  return (
    <div className="space-y-4">
      {selector}

      <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg text-bosque-800">
            <Camera size={19} /> Fotos de la escapada
          </h2>
          <p className="mt-0.5 text-sm text-suave">
            {fotos.length === 0
              ? 'Las de allí, no las de la casa candidata.'
              : `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}. Pulsa una para verla grande.`}
          </p>
        </div>
        <Boton onClick={() => archivo.current?.click()} cargando={Boolean(subiendo)}>
          {subiendo ? (
            `Subiendo ${subiendo.va} de ${subiendo.total}…`
          ) : (
            <>
              <ImagePlus size={17} /> Subir fotos
            </>
          )}
        </Boton>
      </Tarjeta>

      {fotos.length === 0 ? (
        <Vacio
          emoji="📷"
          titulo="Todavía no hay fotos"
          texto="Subid las de la escapada cuando volváis. Se pueden subir varias de una vez."
          accion={
            <Boton tamanyo="lg" onClick={() => archivo.current?.click()}>
              <ImagePlus size={19} /> Subir las primeras
            </Boton>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((f, i) => (
            <figure key={f.id} className="group relative overflow-hidden rounded-2xl bg-beige">
              <button
                type="button"
                onClick={() => setMirando(i)}
                className="block aspect-square w-full"
                aria-label={f.caption || 'Ver la foto'}
              >
                <img src={f.url} alt={f.caption ?? ''} loading="lazy" className="size-full object-cover" />
              </button>
              {f.caption && (
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-velo/85 to-transparent px-2.5 pt-6 pb-2 text-xs font-medium text-white">
                  {f.caption}
                </figcaption>
              )}
              <span className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <BotonIcono
                  etiqueta="Poner un pie"
                  onClick={() => abrePie(f)}
                  className="bg-superficie/85 backdrop-blur"
                >
                  <Pencil size={14} />
                </BotonIcono>
                {(esAdmin || f.uploaded_by === perfil?.id) && (
                  <BotonIcono
                    etiqueta="Borrar la foto"
                    tono="peligro"
                    onClick={() => setBorrando(f)}
                    className="bg-superficie/85 backdrop-blur"
                  >
                    <Trash2 size={14} />
                  </BotonIcono>
                )}
              </span>
            </figure>
          ))}
        </div>
      )}

      {mirando !== null && fotos[mirando] && (
        <Visor
          fotos={fotos}
          indice={mirando}
          onIndice={setMirando}
          onCerrar={() => setMirando(null)}
        />
      )}

      <Modal
        abierto={Boolean(poniendoPie)}
        onCerrar={() => setPoniendoPie(null)}
        titulo="Pie de la foto"
        descripcion="Para que dentro de dos años se sepa qué era eso."
        ancho="sm"
        pie={
          <>
            <Boton variante="secundario" onClick={() => setPoniendoPie(null)}>
              Cancelar
            </Boton>
            <Boton cargando={enCurso} onClick={() => void guardaPie()}>
              Guardar
            </Boton>
          </>
        }
      >
        <Campo etiqueta="Pie" ayuda="Déjalo vacío para quitarlo.">
          <Entrada
            value={textoPie}
            onChange={(e) => setTextoPie(e.target.value)}
            placeholder="La paella del sábado"
            maxLength={120}
          />
        </Campo>
      </Modal>

      <Confirmar
        abierto={Boolean(borrando)}
        titulo="¿Borrar la foto?"
        texto="Desaparece para todo el mundo."
        textoAceptar="Sí, borrar"
        cargando={enCurso}
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  )
}

/** Visor a pantalla completa, con flechas y teclado. */
function Visor({
  fotos,
  indice,
  onIndice,
  onCerrar,
}: {
  fotos: TripPhoto[]
  indice: number
  onIndice: (i: number) => void
  onCerrar: () => void
}) {
  const foto = fotos[indice]

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight') onIndice((indice + 1) % fotos.length)
      if (e.key === 'ArrowLeft') onIndice((indice - 1 + fotos.length) % fotos.length)
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [indice, fotos.length, onIndice, onCerrar])

  if (!foto) return null

  return createPortal(
    <div className="animate-aparece fixed inset-0 z-[60] flex flex-col bg-velo/95" role="dialog" aria-modal="true">
      <header className="flex items-center gap-3 px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{foto.caption || 'Sin pie'}</p>
          <p className="truncate text-xs text-white/60">
            {indice + 1}/{fotos.length} · {diaDeChat(foto.created_at)}
          </p>
        </div>
        <a
          href={foto.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          aria-label="Abrir la foto aparte"
        >
          <Download size={18} />
        </a>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <X size={20} />
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4">
        <img src={foto.url} alt={foto.caption ?? ''} className="max-h-full max-w-full rounded-2xl object-contain" />
        {fotos.length > 1 && (
          <>
            <Flecha lado="izquierda" onClick={() => onIndice((indice - 1 + fotos.length) % fotos.length)}>
              <ChevronLeft size={24} />
            </Flecha>
            <Flecha lado="derecha" onClick={() => onIndice((indice + 1) % fotos.length)}>
              <ChevronRight size={24} />
            </Flecha>
          </>
        )}
      </div>

      {foto.uploaded_by && (
        <p className="flex items-center justify-center gap-1.5 pb-5 text-xs text-white/70">
          La subió <Persona perfilId={foto.uploaded_by} />
        </p>
      )}
    </div>,
    document.body,
  )
}

function Flecha({
  lado,
  onClick,
  children,
}: {
  lado: 'izquierda' | 'derecha'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'izquierda' ? 'Anterior' : 'Siguiente'}
      className={`absolute top-1/2 -translate-y-1/2 inline-flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 ${
        lado === 'izquierda' ? 'left-2' : 'right-2'
      }`}
    >
      {children}
    </button>
  )
}
