-- =====================================================================
-- Rural69 · 07 · Avisos (alguien propone casa, se abre una votación…)
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Una fila por persona y por aviso. Podría guardarse un solo aviso para
-- todo el grupo, pero entonces «leído» tendría que ser una tabla aparte;
-- así cada cual tiene los suyos y los marca como leídos sin tocar los de
-- los demás, y las políticas RLS quedan en una línea.
--
-- Los avisos los crean disparadores de la propia base de datos, no la
-- aplicación. Es a propósito: si los creara el navegador de quien propone
-- la casa, bastaría con cerrar la pestaña a medias para que la mitad del
-- grupo no se enterase. Aquí, o se guarda la casa y se avisa, o no pasa
-- ninguna de las dos cosas.
-- =====================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  -- Destinatario. Cada aviso tiene el suyo.
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in (
               'casa_propuesta', 'votacion_abierta', 'votacion_cerrada', 'casa_elegida'
             )),
  trip_id    uuid references public.trips (id) on delete cascade,
  title      text not null,
  body       text,
  -- Ruta de la aplicación a la que lleva el aviso al pulsarlo.
  url        text,
  -- Quién lo provocó, para poner su cara al lado.
  actor_id   uuid references public.profiles (id) on delete set null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Lo que se consulta siempre: mis avisos, los últimos primero.
create index if not exists notifications_buzon_idx
  on public.notifications (profile_id, created_at desc);

-- Y el contador de los sin leer.
create index if not exists notifications_sin_leer_idx
  on public.notifications (profile_id) where read_at is null;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

-- Sin `insert`: los avisos solo los escriben los disparadores de abajo,
-- que van como `security definer` y se saltan RLS. Así nadie puede
-- inventarse un aviso para otra persona desde el navegador.
grant select, update, delete on public.notifications to authenticated;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (profile_id = auth.uid());

-- Marcar como leído. El `with check` impide cambiar el aviso de dueño.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- Reparto: un aviso para todo el grupo menos para quien lo provoca
-- ---------------------------------------------------------------------
create or replace function public.notificar(
  p_kind    text,
  p_trip    uuid,
  p_title   text,
  p_body    text,
  p_url     text,
  p_actor   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, kind, trip_id, title, body, url, actor_id)
  select p.id, p_kind, p_trip, p_title, p_body, p_url, p_actor
  from public.profiles p
  where p_actor is null or p.id <> p_actor;

  -- Un aviso de hace tres meses no le interesa a nadie, y el plan gratuito
  -- de Supabase tiene 500 MB. Se limpia aquí, que es por donde se pasa
  -- pocas veces al día, en lugar de montar una tarea programada.
  delete from public.notifications where created_at < now() - interval '90 days';
end;
$$;

revoke all on function public.notificar(text, uuid, text, text, text, uuid) from public, authenticated;

-- ---------------------------------------------------------------------
-- Alguien propone una casa
-- ---------------------------------------------------------------------
create or replace function public.avisa_casa_propuesta()
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
    'casa_propuesta',
    new.trip_id,
    coalesce(v_quien, 'Alguien') || ' ha propuesto una casa',
    new.name || coalesce(' · ' || nullif(new.town, ''), '') || coalesce(' — ' || v_viaje, ''),
    '/escapadas/' || new.trip_id || '/casas',
    new.proposed_by
  );
  return new;
end;
$$;

drop trigger if exists houses_avisa on public.houses;
create trigger houses_avisa
  after insert on public.houses
  for each row execute function public.avisa_casa_propuesta();

-- ---------------------------------------------------------------------
-- Se abre o se cierra la votación, o se marca la casa elegida
-- ---------------------------------------------------------------------
create or replace function public.avisa_cambios_escapada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_casa text;
begin
  -- La votación se abre.
  if new.voting_open and not old.voting_open then
    perform public.notificar(
      'votacion_abierta',
      new.id,
      'Votación abierta: ' || new.title,
      'Ya puedes votar la casa que más te guste.',
      '/escapadas/' || new.id || '/votacion',
      auth.uid()
    );
  end if;

  -- O se cierra.
  if old.voting_open and not new.voting_open then
    perform public.notificar(
      'votacion_cerrada',
      new.id,
      'Votación cerrada: ' || new.title,
      'Mira cómo ha quedado.',
      '/escapadas/' || new.id || '/votacion',
      auth.uid()
    );
  end if;

  -- Y la casa elegida, que es la noticia que de verdad espera el grupo.
  if new.chosen_house_id is not null and new.chosen_house_id is distinct from old.chosen_house_id then
    select name into v_casa from public.houses where id = new.chosen_house_id;
    perform public.notificar(
      'casa_elegida',
      new.id,
      'Ya hay casa para ' || new.title,
      coalesce(v_casa, 'La casa elegida') || ' es la elegida.',
      '/escapadas/' || new.id,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trips_avisa on public.trips;
create trigger trips_avisa
  after update on public.trips
  for each row execute function public.avisa_cambios_escapada();

-- ---------------------------------------------------------------------
-- Tiempo real: que el aviso llegue sin recargar
-- ---------------------------------------------------------------------
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.notifications';
  exception when duplicate_object then null;
  end;
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
