-- =====================================================================
-- Rural69 · 24 · Terminar la partida entre todos
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo. Necesita `23_juegos_de_todos.sql` pasado.
--
-- Se me pasó al escribir el 23: abrí la mano para que cada jugador
-- moviera su turno, pero borrar la partida seguía siendo cosa del que
-- la empezó. O sea que el botón de «terminar la partida» funcionaba en
-- la pantalla de uno y no hacía nada en la de los demás —lo peor que
-- puede hacer un botón—, y al recargar reaparecía la partida.
--
-- En una partida en la que juegan todos, también la termina cualquiera.
-- =====================================================================

drop policy if exists game_sessions_delete on public.game_sessions;
create policy game_sessions_delete on public.game_sessions
  for delete to authenticated
  using (
    public.is_member()
    and (moderator_id = auth.uid() or public.is_admin() or anyone_plays)
  );

notify pgrst, 'reload schema';
