-- =====================================================================
-- Rural69 · 18 · Las fotos de la escapada
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Ojo, no confundir con `house_photos`: aquellas son las de la casa
-- CANDIDATA, las que se miran para decidir. Estas son las de después,
-- las que alguien hizo allí. Es lo que hace que uno vuelva a abrir la
-- aplicación cuando la escapada ya pasó.
--
-- Van al mismo bucket `fotos` que todo lo demás, que ya es público de
-- lectura y solo deja subir a integrantes del grupo (ver `02_rls.sql`).
-- =====================================================================

create table if not exists public.trip_photos (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  url         text not null,
  -- Un pie opcional: «la paella del sábado», «el perro del vecino».
  caption     text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Lo que se consulta siempre: las fotos de esta escapada, las últimas primero.
create index if not exists trip_photos_trip_idx
  on public.trip_photos (trip_id, created_at desc);

alter table public.trip_photos enable row level security;

grant select, insert, update, delete on public.trip_photos to authenticated;

drop policy if exists trip_photos_select on public.trip_photos;
create policy trip_photos_select on public.trip_photos
  for select to authenticated using (public.is_member());

drop policy if exists trip_photos_insert on public.trip_photos;
create policy trip_photos_insert on public.trip_photos
  for insert to authenticated
  with check (public.is_member() and (uploaded_by is null or uploaded_by = auth.uid()));

-- El pie lo puede arreglar cualquiera: si pone «la paela del sábado», que
-- lo corrija quien pase por ahí.
drop policy if exists trip_photos_update on public.trip_photos;
create policy trip_photos_update on public.trip_photos
  for update to authenticated using (public.is_member()) with check (public.is_member());

-- Borrar, solo quien la subió o un administrador.
drop policy if exists trip_photos_delete on public.trip_photos;
create policy trip_photos_delete on public.trip_photos
  for delete to authenticated using (public.is_admin() or uploaded_by = auth.uid());

-- Tiempo real: si alguien sube las suyas desde el sofá, aparecen solas.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.trip_photos';
  exception when duplicate_object then null;
  end;
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
