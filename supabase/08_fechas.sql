-- =====================================================================
-- Rural69 · 08 · Votación de fechas
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- El grupo vota primero LAS FECHAS y después la casa; de hecho las casas
-- se buscan cuando ya se sabe el fin de semana. Hasta ahora la escapada
-- solo tenía una fecha de ida y otra de vuelta, puestas a mano por un
-- administrador, así que la primera votación se hacía fuera de la
-- aplicación.
--
--   · trip_date_options → los fines de semana candidatos.
--   · date_votes        → un voto por persona y escapada, cambiable.
--
-- Es a propósito un calco de `houses` + `votes`: mismas políticas, mismo
-- «abrir y cerrar», mismo «marcar la elegida». Lo único distinto es que
-- al marcar las fechas elegidas se copian en la escapada, que es donde
-- las lee el resto de la aplicación (cuenta atrás, tiempos de la compra,
-- historial…).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas nuevas en la escapada
-- ---------------------------------------------------------------------
alter table public.trips
  add column if not exists dates_voting_open boolean not null default true;

alter table public.trips
  add column if not exists chosen_date_option_id uuid;

-- ---------------------------------------------------------------------
-- Fechas candidatas
-- ---------------------------------------------------------------------
create table if not exists public.trip_date_options (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  start_date  date not null,
  -- Siempre tiene las dos: lo que se vota es un fin de semana concreto, no
  -- una fecha suelta. Para una escapada de un día, ida y vuelta coinciden.
  end_date    date not null,
  /** Nombre opcional: «puente de mayo», «finde de la feria»… */
  label       text,
  notes       text,
  proposed_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint trip_date_options_orden check (end_date >= start_date),
  -- Que no se propongan dos veces las mismas fechas en la misma escapada.
  constraint trip_date_options_sin_repetir unique (trip_id, start_date, end_date)
);

create index if not exists trip_date_options_trip_idx
  on public.trip_date_options (trip_id, start_date);

do $$ begin
  alter table public.trips
    add constraint trips_chosen_date_option_id_fkey
    foreign key (chosen_date_option_id) references public.trip_date_options (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Votos de fechas (uno por persona y escapada)
-- ---------------------------------------------------------------------
create table if not exists public.date_votes (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id)              on delete cascade,
  option_id  uuid not null references public.trip_date_options (id)   on delete cascade,
  voter_id   uuid not null references public.profiles (id)            on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, voter_id)
);

create index if not exists date_votes_trip_idx on public.date_votes (trip_id);

-- ---------------------------------------------------------------------
-- ¿Está abierta la votación de fechas?
-- ---------------------------------------------------------------------
create or replace function public.dates_voting_is_open(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select dates_voting_open from public.trips where id = p_trip), false);
$$;

grant execute on function public.dates_voting_is_open(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.trip_date_options enable row level security;
alter table public.date_votes        enable row level security;

grant select, insert, update, delete on public.trip_date_options to authenticated;
grant select, insert, update, delete on public.date_votes        to authenticated;

-- Las fechas candidatas las propone cualquiera del grupo, como las casas.
drop policy if exists trip_date_options_select on public.trip_date_options;
create policy trip_date_options_select on public.trip_date_options
  for select to authenticated using (public.is_member());

drop policy if exists trip_date_options_insert on public.trip_date_options;
create policy trip_date_options_insert on public.trip_date_options
  for insert to authenticated
  with check (public.is_member() and (proposed_by is null or proposed_by = auth.uid()));

drop policy if exists trip_date_options_update on public.trip_date_options;
create policy trip_date_options_update on public.trip_date_options
  for update to authenticated using (public.is_member()) with check (public.is_member());

-- Borra quien la propuso, o un administrador.
drop policy if exists trip_date_options_delete on public.trip_date_options;
create policy trip_date_options_delete on public.trip_date_options
  for delete to authenticated using (public.is_admin() or proposed_by = auth.uid());

-- Cada cual gestiona su voto, y solo con la votación abierta.
drop policy if exists date_votes_select on public.date_votes;
create policy date_votes_select on public.date_votes
  for select to authenticated using (public.is_member());

drop policy if exists date_votes_insert_own on public.date_votes;
create policy date_votes_insert_own on public.date_votes
  for insert to authenticated
  with check (public.is_member() and voter_id = auth.uid() and public.dates_voting_is_open(trip_id));

drop policy if exists date_votes_update_own on public.date_votes;
create policy date_votes_update_own on public.date_votes
  for update to authenticated
  using (voter_id = auth.uid() and public.dates_voting_is_open(trip_id))
  with check (voter_id = auth.uid() and public.dates_voting_is_open(trip_id));

drop policy if exists date_votes_delete_own on public.date_votes;
create policy date_votes_delete_own on public.date_votes
  for delete to authenticated
  using (public.is_admin() or (voter_id = auth.uid() and public.dates_voting_is_open(trip_id)));

-- ---------------------------------------------------------------------
-- Avisos: tres tipos nuevos
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
  alter table public.notifications add constraint notifications_kind_check check (kind in (
    'casa_propuesta', 'votacion_abierta', 'votacion_cerrada', 'casa_elegida',
    'fechas_propuestas', 'votacion_fechas_abierta', 'fechas_elegidas'
  ));
end $$;

-- Alguien propone unas fechas.
create or replace function public.avisa_fechas_propuestas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quien text;
  v_viaje text;
begin
  select coalesce(nullif(btrim(display_name), ''), split_part(email, '@', 1))
    into v_quien
  from public.profiles where id = new.proposed_by;

  select title into v_viaje from public.trips where id = new.trip_id;

  perform public.notificar(
    'fechas_propuestas',
    new.trip_id,
    coalesce(v_quien, 'Alguien') || ' ha propuesto unas fechas',
    to_char(new.start_date, 'DD/MM') || ' – ' || to_char(new.end_date, 'DD/MM')
      || coalesce(' · ' || nullif(btrim(new.label), ''), '')
      || coalesce(' — ' || v_viaje, ''),
    '/escapadas/' || new.trip_id || '/fechas',
    new.proposed_by
  );
  return new;
end;
$$;

drop trigger if exists trip_date_options_avisa on public.trip_date_options;
create trigger trip_date_options_avisa
  after insert on public.trip_date_options
  for each row execute function public.avisa_fechas_propuestas();

-- Y se añade al disparador de la escapada lo de las fechas: cuando se abre
-- su votación y cuando ya hay fechas elegidas.
create or replace function public.avisa_cambios_escapada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_casa text;
begin
  -- ---- Casas ----
  if new.voting_open and not old.voting_open then
    perform public.notificar(
      'votacion_abierta', new.id,
      'Votación de casa abierta: ' || new.title,
      'Ya puedes votar la casa que más te guste.',
      '/escapadas/' || new.id || '/votacion', auth.uid()
    );
  end if;

  if old.voting_open and not new.voting_open then
    perform public.notificar(
      'votacion_cerrada', new.id,
      'Votación de casa cerrada: ' || new.title,
      'Mira cómo ha quedado.',
      '/escapadas/' || new.id || '/votacion', auth.uid()
    );
  end if;

  if new.chosen_house_id is not null and new.chosen_house_id is distinct from old.chosen_house_id then
    select name into v_casa from public.houses where id = new.chosen_house_id;
    perform public.notificar(
      'casa_elegida', new.id,
      'Ya hay casa para ' || new.title,
      coalesce(v_casa, 'La casa elegida') || ' es la elegida.',
      '/escapadas/' || new.id, auth.uid()
    );
  end if;

  -- ---- Fechas ----
  if new.dates_voting_open and not old.dates_voting_open then
    perform public.notificar(
      'votacion_fechas_abierta', new.id,
      'Votación de fechas abierta: ' || new.title,
      'Propón un fin de semana o vota el que te venga bien.',
      '/escapadas/' || new.id || '/fechas', auth.uid()
    );
  end if;

  -- Las fechas elegidas se copian en la escapada, así que basta con mirar si
  -- han cambiado ahí: cubre tanto el «marcar las elegidas» como el cambio a
  -- mano desde «Editar escapada».
  if new.start_date is not null
     and (new.start_date, new.end_date) is distinct from (old.start_date, old.end_date) then
    perform public.notificar(
      'fechas_elegidas', new.id,
      'Ya hay fechas para ' || new.title,
      to_char(new.start_date, 'DD/MM')
        || coalesce(' – ' || to_char(new.end_date, 'DD/MM'), '')
        || '. Toca buscar casa.',
      '/escapadas/' || new.id || '/casas', auth.uid()
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['trip_date_options', 'date_votes']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
