-- =====================================================================
-- Rural69 · 23 · Juegos en los que juegan todos
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada. Necesita `22_juegos.sql` pasado.
--
-- El Furor tiene un moderador y los demás miran: ahí, que solo él pueda
-- tocar la partida es la regla del juego. Pero en el «¿Quién soy?» cada
-- uno juega desde su propio móvil —ve las cartas de los demás y la suya
-- tapada—, así que cada cual tiene que poder mover su turno. Si mandara
-- uno solo, habría que ir pidiéndole por favor que pulse.
--
-- En vez de abrir la mano para todas las partidas, cada partida dice de
-- qué tipo es: `anyone_plays`. El Furor la deja en falso y sigue igual
-- de cerrado que antes.
-- =====================================================================

alter table public.game_sessions
  add column if not exists anyone_plays boolean not null default false;

comment on column public.game_sessions.anyone_plays is
  'Partida en la que cada jugador mueve lo suyo desde su móvil (el «¿Quién soy?»). '
  'En falso, solo manda el moderador (el Furor).';

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
-- Cambia solo el de escritura: quien manda sigue siendo el moderador,
-- salvo que la partida sea de las de todos.
drop policy if exists game_sessions_update on public.game_sessions;
create policy game_sessions_update on public.game_sessions
  for update to authenticated
  using (
    public.is_member()
    and (moderator_id = auth.uid() or public.is_admin() or anyone_plays)
  )
  with check (public.is_member());

notify pgrst, 'reload schema';
