import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ImagePlus, Loader2, Pencil, Send, Trash2, X } from 'lucide-react'
import { useEscapada } from '../../pages/Escapada'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useConsulta } from '../../hooks/useConsulta'
import { useGrupo } from '../../hooks/useGrupo'
import { mensajeError, supabase } from '../../lib/supabase'
import { subeFoto } from '../../lib/subidas'
import { diaDeChat, hora } from '../../lib/formato'
import { Avatar } from '../ui/Avatar'
import { BotonIcono } from '../ui/Boton'
import { Confirmar } from '../ui/Modal'
import { AvisoError, Cargando } from '../ui/Varios'
import type { Message, Profile } from '../../lib/types'

/** Dos mensajes seguidos de la misma persona en menos de 5 min van juntos. */
const AGRUPA_MS = 5 * 60 * 1000

export function Chat() {
  const { escapada } = useEscapada()
  const { perfil, esAdmin } = useAuth()
  const { perfiles, miembros } = useGrupo()
  const avisos = useAvisos()

  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [editando, setEditando] = useState<Message | null>(null)
  const [borrando, setBorrando] = useState<Message | null>(null)
  const [ampliada, setAmpliada] = useState<string | null>(null)

  const hilo = useRef<HTMLDivElement>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const caja = useRef<HTMLTextAreaElement>(null)

  const { datos, cargando, error, refrescar } = useConsulta(
    async () => {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('trip_id', escapada.id)
        .order('created_at')
      if (err) throw err
      return (data ?? []) as Message[]
    },
    [escapada.id],
    { realtime: ['messages'] },
  )

  const mensajes = useMemo(() => datos ?? [], [datos])

  // Al entrar y cada vez que llega algo nuevo, bajamos del todo y marcamos leído.
  useLayoutEffect(() => {
    const caja = hilo.current
    if (caja) caja.scrollTop = caja.scrollHeight
  }, [mensajes.length])

  useEffect(() => {
    if (!perfil || mensajes.length === 0) return
    void supabase
      .from('message_reads')
      .upsert(
        { trip_id: escapada.id, profile_id: perfil.id, last_read_at: new Date().toISOString() },
        { onConflict: 'trip_id,profile_id' },
      )
      .then(({ error: err }) => {
        if (err) console.error('Rural69: no se ha podido marcar el chat como leído', err)
      })
  }, [escapada.id, perfil, mensajes.length])

  const autor = (id: string): Profile | undefined => perfiles.find((p) => p.id === id)
  const fotoDe = (id: string) => {
    const p = autor(id)
    return p?.avatar_url ?? miembros.find((m) => m.id === p?.member_id)?.avatar_url ?? null
  }
  const nombreDe = (id: string) => autor(id)?.display_name || autor(id)?.email || 'Alguien'

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const cuerpo = texto.trim()
    if (!cuerpo || !perfil) return
    setEnviando(true)
    try {
      if (editando) {
        const { error: err } = await supabase
          .from('messages')
          .update({ body: cuerpo, edited_at: new Date().toISOString() })
          .eq('id', editando.id)
        if (err) throw err
        setEditando(null)
      } else {
        const { error: err } = await supabase
          .from('messages')
          .insert({ trip_id: escapada.id, author_id: perfil.id, body: cuerpo })
        if (err) throw err
      }
      setTexto('')
      await refrescar(true)
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setEnviando(false)
      caja.current?.focus()
    }
  }

  const enviarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichero = e.target.files?.[0]
    e.target.value = ''
    if (!fichero || !perfil) return
    setSubiendo(true)
    try {
      const url = await subeFoto(fichero, 'chat')
      const { error: err } = await supabase
        .from('messages')
        .insert({ trip_id: escapada.id, author_id: perfil.id, body: texto.trim(), image_url: url })
      if (err) throw err
      setTexto('')
      await refrescar(true)
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setSubiendo(false)
    }
  }

  const borrar = async () => {
    if (!borrando) return
    try {
      const { error: err } = await supabase.from('messages').delete().eq('id', borrando.id)
      if (err) throw err
      await refrescar(true)
    } catch (err) {
      avisos.error(mensajeError(err))
    } finally {
      setBorrando(null)
    }
  }

  const teclado = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía; Mayús+Enter hace salto de línea, como en WhatsApp de escritorio.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void enviar()
    }
    if (e.key === 'Escape' && editando) {
      setEditando(null)
      setTexto('')
    }
  }

  if (cargando) return <Cargando texto="Cargando el chat…" />
  if (error) return <AvisoError texto={error} onReintentar={() => void refrescar()} />

  return (
    <div className="flex h-[calc(100dvh-20rem)] min-h-96 flex-col overflow-hidden rounded-3xl border border-arena bg-beige/50">
      <div ref={hilo} className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {mensajes.length === 0 && (
          <p className="mx-auto mt-10 max-w-xs text-center text-sm text-suave">
            Aquí no hay nada todavía. Escribid lo que haga falta para esta escapada: quién lleva el coche, a
            qué hora quedáis, qué casa os gusta más…
          </p>
        )}

        {mensajes.map((m, i) => {
          const anterior = mensajes[i - 1]
          const nuevoDia = !anterior || diaDeChat(anterior.created_at) !== diaDeChat(m.created_at)
          const mio = m.author_id === perfil?.id
          const seguido =
            !nuevoDia &&
            anterior?.author_id === m.author_id &&
            new Date(m.created_at).getTime() - new Date(anterior.created_at).getTime() < AGRUPA_MS

          return (
            <div key={m.id}>
              {nuevoDia && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-superficie px-3 py-1 text-xs font-semibold text-suave shadow-sm">
                    {diaDeChat(m.created_at)}
                  </span>
                </div>
              )}
              <div className={`group flex items-end gap-2 ${mio ? 'flex-row-reverse' : ''} ${seguido ? 'mt-0.5' : 'mt-2'}`}>
                <span className={seguido ? 'w-9 shrink-0' : ''}>
                  {!seguido && <Avatar src={fotoDe(m.author_id)} nombre={nombreDe(m.author_id)} tamanyo="sm" />}
                </span>

                <div
                  className={`max-w-[min(32rem,78%)] rounded-2xl px-3 py-2 shadow-sm ${
                    mio ? 'bg-bosque-600 text-tinta-fuerte' : 'bg-superficie text-carbon'
                  } ${seguido ? (mio ? 'rounded-tr-md' : 'rounded-tl-md') : ''}`}
                >
                  {!seguido && !mio && (
                    <p className="mb-0.5 text-xs font-bold text-bosque-700">{nombreDe(m.author_id)}</p>
                  )}
                  {m.image_url && (
                    <button
                      type="button"
                      onClick={() => setAmpliada(m.image_url)}
                      className="mb-1 block overflow-hidden rounded-xl"
                    >
                      <img
                        src={m.image_url}
                        alt="Foto enviada al chat"
                        className="max-h-72 w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}
                  {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                  <p className={`mt-0.5 text-right text-[11px] ${mio ? 'text-tinta-fuerte/60' : 'text-suave'}`}>
                    {m.edited_at && 'editado · '}
                    {hora(m.created_at)}
                  </p>
                </div>

                {(mio || esAdmin) && (
                  <span className="flex shrink-0 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    {mio && (
                      <BotonIcono
                        etiqueta="Editar mensaje"
                        onClick={() => {
                          setEditando(m)
                          setTexto(m.body)
                          caja.current?.focus()
                        }}
                      >
                        <Pencil size={14} />
                      </BotonIcono>
                    )}
                    <BotonIcono etiqueta="Borrar mensaje" tono="peligro" onClick={() => setBorrando(m)}>
                      <Trash2 size={14} />
                    </BotonIcono>
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={enviar} className="safe-bottom border-t border-arena bg-superficie/80 p-2.5 [--relleno-inferior:0.625rem]">
        {editando && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-bosque-50 px-3 py-1.5 text-xs text-bosque-700">
            <Pencil size={13} />
            <span className="flex-1 truncate font-semibold">Editando tu mensaje</span>
            <button
              type="button"
              onClick={() => {
                setEditando(null)
                setTexto('')
              }}
              aria-label="Cancelar la edición"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={(e) => void enviarFoto(e)} />
          <button
            type="button"
            onClick={() => archivo.current?.click()}
            disabled={subiendo || Boolean(editando)}
            aria-label="Enviar una foto"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-suave transition hover:bg-black/5 disabled:opacity-40"
          >
            {subiendo ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          </button>
          <textarea
            ref={caja}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={teclado}
            rows={1}
            placeholder="Escribe un mensaje…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-arena bg-superficie px-3.5 py-2.5 text-sm outline-none transition focus:border-bosque-400 focus:ring-2 focus:ring-bosque-200"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            aria-label={editando ? 'Guardar el cambio' : 'Enviar'}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-bosque-600 text-tinta-fuerte shadow-sm transition hover:bg-bosque-700 active:scale-95 disabled:opacity-40"
          >
            {enviando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : editando ? (
              <Check size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>

      <Confirmar
        abierto={Boolean(borrando)}
        titulo="¿Borrar el mensaje?"
        texto="Desaparecerá para todo el mundo."
        textoAceptar="Sí, borrar"
        onAceptar={() => void borrar()}
        onCancelar={() => setBorrando(null)}
      />

      {ampliada && <FotoAmpliada src={ampliada} onCerrar={() => setAmpliada(null)} />}
    </div>
  )
}

/** Visor sencillo para una foto del chat. */
function FotoAmpliada({ src, onCerrar }: { src: string; onCerrar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  return createPortal(
    <div
      className="animate-aparece fixed inset-0 z-50 flex items-center justify-center bg-velo/90 p-4"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Foto del chat"
    >
      <img src={src} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
      >
        <X size={20} />
      </button>
    </div>,
    document.body,
  )
}
