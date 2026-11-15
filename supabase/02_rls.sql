-- =====================================================================
-- Rural69 · Seguridad a nivel de fila (Row Level Security)
-- Ejecutar DESPUÉS de 01_schema.sql
--
-- Regla general:
--   · Solo las cuentas con perfil en public.profiles (= integrantes
--     autorizados del grupo) pueden leer y escribir.
--   · Las operaciones de gestión (escapadas, integrantes, lista maestra,
--     votaciones) quedan reservadas al rol 'admin'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones auxiliares (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.voting_is_open(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select voting_open from public.trips where id = p_trip), false);
$$;

grant execute on function public.is_member()      to authenticated;
grant execute on function public.is_admin()       to authenticated;
grant execute on function public.voting_is_open(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Permisos de tabla. Supabase ya los concede por defecto, pero se
-- dejan explícitos para que el script funcione en cualquier proyecto.
-- Quien decide de verdad quién ve qué son las políticas de más abajo.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.households        enable row level security;
alter table public.members           enable row level security;
alter table public.trips             enable row level security;
alter table public.trip_participants enable row level security;
alter table public.houses            enable row level security;
alter table public.house_photos      enable row level security;
alter table public.votes             enable row level security;
alter table public.master_items      enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.pantry_items      enable row level security;
alter table public.app_settings      enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (is_member());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated using (is_admin() and id <> auth.uid());

-- ---------------------------------------------------------------------
-- households / members  → lectura: todos · escritura: admin
-- ---------------------------------------------------------------------
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated using (is_member());
drop policy if exists households_write on public.households;
create policy households_write on public.households
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated using (is_member());
drop policy if exists members_write on public.members;
create policy members_write on public.members
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- trips → lectura: todos · crear/editar/borrar: admin
-- ---------------------------------------------------------------------
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select to authenticated using (is_member());
drop policy if exists trips_write on public.trips;
create policy trips_write on public.trips
  for all to authenticated using (is_admin()) with check (is_admin());

-- Participantes: cualquier integrante puede apuntar o quitar gente
drop policy if exists trip_participants_all on public.trip_participants;
create policy trip_participants_all on public.trip_participants
  for all to authenticated using (is_member()) with check (is_member());

-- ---------------------------------------------------------------------
-- houses → cualquier integrante propone y edita; borra quien la propuso o un admin
-- ---------------------------------------------------------------------
drop policy if exists houses_select on public.houses;
create policy houses_select on public.houses
  for select to authenticated using (is_member());

drop policy if exists houses_insert on public.houses;
create policy houses_insert on public.houses
  for insert to authenticated with check (is_member() and (proposed_by is null or proposed_by = auth.uid()));

drop policy if exists houses_update on public.houses;
create policy houses_update on public.houses
  for update to authenticated using (is_member()) with check (is_member());

drop policy if exists houses_delete on public.houses;
create policy houses_delete on public.houses
  for delete to authenticated using (is_admin() or proposed_by = auth.uid());

drop policy if exists house_photos_select on public.house_photos;
create policy house_photos_select on public.house_photos
  for select to authenticated using (is_member());
drop policy if exists house_photos_write on public.house_photos;
create policy house_photos_write on public.house_photos
  for all to authenticated using (is_member()) with check (is_member());

-- ---------------------------------------------------------------------
-- votes → cada persona gestiona únicamente su voto y solo con la votación abierta
-- ---------------------------------------------------------------------
drop policy if exists votes_select on public.votes;
create policy votes_select on public.votes
  for select to authenticated using (is_member());

drop policy if exists votes_insert_own on public.votes;
create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (is_member() and voter_id = auth.uid() and voting_is_open(trip_id));

drop policy if exists votes_update_own on public.votes;
create policy votes_update_own on public.votes
  for update to authenticated
  using (voter_id = auth.uid() and voting_is_open(trip_id))
  with check (voter_id = auth.uid() and voting_is_open(trip_id));

drop policy if exists votes_delete_own on public.votes;
create policy votes_delete_own on public.votes
  for delete to authenticated
  using (is_admin() or (voter_id = auth.uid() and voting_is_open(trip_id)));

-- ---------------------------------------------------------------------
-- master_items → lectura: todos · escritura: admin
-- ---------------------------------------------------------------------
drop policy if exists master_items_select on public.master_items;
create policy master_items_select on public.master_items
  for select to authenticated using (is_member());
drop policy if exists master_items_write on public.master_items;
create policy master_items_write on public.master_items
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- shopping_items / pantry_items → colaborativo: cualquier integrante
-- ---------------------------------------------------------------------
drop policy if exists shopping_items_all on public.shopping_items;
create policy shopping_items_all on public.shopping_items
  for all to authenticated using (is_member()) with check (is_member());

drop policy if exists pantry_items_all on public.pantry_items;
create policy pantry_items_all on public.pantry_items
  for all to authenticated using (is_member()) with check (is_member());

-- ---------------------------------------------------------------------
-- app_settings → lectura: todos · escritura: admin
-- ---------------------------------------------------------------------
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated using (is_member());
drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Tiempo real (Realtime) para las tablas colaborativas
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['shopping_items','votes','houses','trips','pantry_items','trip_participants','members','master_items']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Almacenamiento de fotos (bucket público de lectura, subida autenticada)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists fotos_read on storage.objects;
create policy fotos_read on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos' and public.is_member());

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects
  for delete to authenticated using (bucket_id = 'fotos' and public.is_member());
