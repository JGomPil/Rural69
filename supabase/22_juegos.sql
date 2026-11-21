-- =====================================================================
-- Rural69 · 22 · La partida compartida
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Hasta ahora el Furor se jugaba en un solo móvil. Con esto, la partida
-- está en la mesa: el moderador lleva el mando y los demás ven en su
-- pantalla la palabra, el turno, la cuenta atrás y el marcador.
--
-- Decisiones:
--
--   · Una fila por juego, no una por partida. Lo que importa es «la
--     partida que se está jugando ahora en esta casa»; el que la
--     empieza pisa la anterior, que es justo lo que pasa alrededor de
--     una mesa. Si algún día se quiere historial, se añade otra tabla,
--     no se ensucia esta.
--   · El estado entero va en un `jsonb`. Las reglas viven en la
--     aplicación (`src/lib/juegos/furor.ts`), y no quiero que cada
--     cambio de un juego de mesa pida una migración de base de datos.
--   · Quién manda se decide con los permisos, no con la buena fe: solo
--     el moderador —o un administrador, por si se queda sin batería—
--     puede tocar la fila. Los demás solo miran.
-- =====================================================================

create table if not exists public.game_sessions (
  game         text primary key,
  state        jsonb not null,
  moderator_id uuid not null references public.profiles (id) on delete cascade,
  updated_at   timestamptz not null default now()
);

comment on table public.game_sessions is
  'La partida que se está jugando ahora mismo, una por juego. El estado es cosa de la aplicación.';
comment on column public.game_sessions.moderator_id is
  'Quien lleva el mando: el único que puede cambiar la fila, además de un administrador.';

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.game_sessions enable row level security;

grant select, insert, update, delete on public.game_sessions to authenticated;

-- La partida la ve todo el grupo.
drop policy if exists game_sessions_select on public.game_sessions;
create policy game_sessions_select on public.game_sessions
  for select to authenticated using (public.is_member());

-- Empezar una partida es ponerse al mando de ella.
drop policy if exists game_sessions_insert on public.game_sessions;
create policy game_sessions_insert on public.game_sessions
  for insert to authenticated
  with check (public.is_member() and moderator_id = auth.uid());

-- Mandar es poder cambiarla. Un administrador puede recoger el mando si
-- el moderador desaparece, y el moderador puede pasárselo a otro.
drop policy if exists game_sessions_update on public.game_sessions;
create policy game_sessions_update on public.game_sessions
  for update to authenticated
  using (moderator_id = auth.uid() or public.is_admin())
  with check (public.is_member());

drop policy if exists game_sessions_delete on public.game_sessions;
create policy game_sessions_delete on public.game_sessions
  for delete to authenticated
  using (moderator_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
-- Sin esto no hay juego: los demás móviles no se enterarían de nada.
do $$
begin
  begin
    alter publication supabase_realtime add table public.game_sessions;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;

notify pgrst, 'reload schema';
