import { useAuth } from './useAuth'
import { useConsulta } from './useConsulta'
import { supabase } from '../lib/supabase'

/**
 * Cuántos mensajes del chat de una escapada no ha leído quien está dentro.
 * No cuenta los suyos propios.
 */
export function useSinLeer(tripId: string | undefined): number {
  const { perfil } = useAuth()

  const { datos } = useConsulta(
    async () => {
      if (!tripId || !perfil) return 0

      const { data: marca } = await supabase
        .from('message_reads')
        .select('last_read_at')
        .eq('trip_id', tripId)
        .eq('profile_id', perfil.id)
        .maybeSingle()

      let consulta = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', tripId)
        .neq('author_id', perfil.id)

      const desde = (marca as { last_read_at: string } | null)?.last_read_at
      if (desde) consulta = consulta.gt('created_at', desde)

      const { count, error } = await consulta
      if (error) throw error
      return count ?? 0
    },
    [tripId, perfil?.id],
    { realtime: ['messages'], activo: Boolean(tripId && perfil) },
  )

  return datos ?? 0
}
