-- =====================================================================
-- Rural69 · 06 · Tiempos de la escapada (comidas y cenas)
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Un «tiempo» es cada momento de comer de la escapada: la cena del
-- viernes, la comida del domingo, el picoteo de la tarde… Sirve para dos
-- cosas: separar la lista de la compra por tiempos y que cada cual se
-- encargue de comprar lo de un tiempo entero.
--
-- Cada producto puede quedarse sin tiempo asignado: eso es la compra
-- común (bebida, desayunos, lo que no es de ninguna comida en concreto).
-- =====================================================================

create table if not exists public.trip_meals (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null,
  day         date,
  kind        text not null default 'otro'
              check (kind in ('desayuno', 'comida', 'merienda', 'cena', 'picoteo', 'bebida', 'otro')),
  -- Quién se encarga de comprar lo de este tiempo.
  assigned_to uuid references public.members (id) on delete set null,
  notes       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint trip_meals_name_no_vacio check (length(btrim(name)) > 0)
);

create index if not exists trip_meals_trip_idx on public.trip_meals (trip_id, sort_order, day);

-- Al borrar un tiempo los productos no se van con él: se quedan sin asignar.
alter table public.shopping_items
  add column if not exists meal_id uuid references public.trip_meals (id) on delete set null;

create index if not exists shopping_items_meal_idx on public.shopping_items (meal_id);

-- ---------------------------------------------------------------------
-- Permisos: los tiempos los organiza cualquiera del grupo, como las casas
-- ---------------------------------------------------------------------
alter table public.trip_meals enable row level security;
grant select, insert, update, delete on public.trip_meals to authenticated;

drop policy if exists trip_meals_select on public.trip_meals;
create policy trip_meals_select on public.trip_meals
  for select to authenticated using (public.is_member());

drop policy if exists trip_meals_insert on public.trip_meals;
create policy trip_meals_insert on public.trip_meals
  for insert to authenticated with check (public.is_member());

drop policy if exists trip_meals_update on public.trip_meals;
create policy trip_meals_update on public.trip_meals
  for update to authenticated using (public.is_member()) with check (public.is_member());

drop policy if exists trip_meals_delete on public.trip_meals;
create policy trip_meals_delete on public.trip_meals
  for delete to authenticated using (public.is_member());

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['trip_meals']
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
