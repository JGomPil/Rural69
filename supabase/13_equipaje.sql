-- =====================================================================
-- Rural69 · 13 · Qué lleva cada uno
-- ---------------------------------------------------------------------
-- Ejecútalo en Supabase (SQL Editor). Se puede repetir sin miedo: no
-- borra ni duplica nada.
--
-- La lista de la compra cubre lo que se compra allí. Pero a una casa
-- rural se llevan cosas de casa que no se compran y que no están en
-- ninguna parte: los sacos, las toallas, el altavoz, la paellera, los
-- desayunos que lleva cada uno. Eso se acuerda por WhatsApp y se olvida.
--
-- Una lista por escapada, con quién lleva cada cosa. Sin dueño significa
-- que todavía nadie se ha ofrecido, que es la mitad de la gracia: se ve
-- de un vistazo lo que no lleva nadie.
--
-- La escribe cualquiera del grupo, como la compra: organizar la escapada
-- no es cosa de un administrador.
-- =====================================================================

create table if not exists public.trip_packing (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  name       text not null,
  notes      text,
  -- Quién lo lleva. Vacío = nadie se ha ofrecido todavía.
  member_id  uuid references public.members (id) on delete set null,
  -- Ya está en la mochila, para poder ir tachando la víspera.
  done       boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint trip_packing_name_no_vacio check (length(btrim(name)) > 0)
);

create index if not exists trip_packing_trip_idx on public.trip_packing (trip_id, sort_order);

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.trip_packing enable row level security;

grant select, insert, update, delete on public.trip_packing to authenticated;

drop policy if exists trip_packing_all on public.trip_packing;
create policy trip_packing_all on public.trip_packing
  for all to authenticated
  using (public.is_member()) with check (public.is_member());

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.trip_packing;
  exception when duplicate_object then null;
  end;
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos: hay que avisarle.
notify pgrst, 'reload schema';
