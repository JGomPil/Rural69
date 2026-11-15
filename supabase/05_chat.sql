-- =====================================================================
-- Rural69 · 05 · Chat de la escapada
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
--   · messages       → los mensajes de cada escapada.
--   · message_reads  → hasta dónde ha leído cada cual, para el contador
--                      de mensajes sin leer.
--
-- Las fotos del chat van al bucket público `fotos` que ya crea
-- 02_rls.sql, en la carpeta `chat/`, así que no hacen falta permisos
-- nuevos de almacenamiento.
-- =====================================================================

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null default '',
  image_url  text,
  edited_at  timestamptz,
  created_at timestamptz not null default now(),
  -- Un mensaje vacío del todo no tiene sentido: o texto, o foto.
  constraint messages_con_contenido check (length(btrim(body)) > 0 or image_url is not null),
  constraint messages_body_largo check (length(body) <= 4000)
);

create index if not exists messages_trip_idx on public.messages (trip_id, created_at);

create table if not exists public.message_reads (
  trip_id      uuid not null references public.trips (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (trip_id, profile_id)
);

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.messages      enable row level security;
alter table public.message_reads enable row level security;

grant select, insert, update, delete on public.messages      to authenticated;
grant select, insert, update, delete on public.message_reads to authenticated;

-- Los mensajes los lee todo el grupo; escribe cada cual los suyos.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.is_member());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated with check (public.is_member() and author_id = auth.uid());

-- Editar: solo lo tuyo, y sin poder cambiarlo de autor ni de escapada.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Borrar: lo tuyo siempre; un administrador, lo que haga falta.
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- La marca de lectura es privada de cada cual.
drop policy if exists message_reads_select on public.message_reads;
create policy message_reads_select on public.message_reads
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists message_reads_insert on public.message_reads;
create policy message_reads_insert on public.message_reads
  for insert to authenticated with check (public.is_member() and profile_id = auth.uid());

drop policy if exists message_reads_update on public.message_reads;
create policy message_reads_update on public.message_reads
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['messages']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
