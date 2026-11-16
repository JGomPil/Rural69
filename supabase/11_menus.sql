-- =====================================================================
-- Rural69 · 11 · Menús por días
-- ---------------------------------------------------------------------
-- Ejecútalo en Supabase (SQL Editor). Se puede repetir sin miedo: no
-- borra ni duplica nada.
--
-- Falta la pieza que va entre «cena del sábado» y «comprar dos kilos de
-- arroz». Hoy los tiempos de la escapada dicen CUÁNDO se come y la lista
-- de la compra dice QUÉ se compra, pero en medio no hay nada: el salto de
-- uno a otro lo hace alguien de cabeza, cada vez.
--
--   · dishes            → el recetario del grupo, que se reutiliza entre
--                         escapadas igual que la lista maestra.
--   · dish_items        → los ingredientes de cada plato, para un número
--                         de personas de referencia.
--   · trip_meal_dishes  → qué se cocina en cada tiempo de una escapada.
--
-- Con eso, generar la compra es recorrer los tiempos, juntar los
-- ingredientes de sus platos y escalarlos al grupo real. Las cantidades
-- siguen siendo una propuesta que se puede retocar a mano, como todas las
-- de esta aplicación.
--
-- El recetario lo escribe cualquiera del grupo, no solo un administrador:
-- es un cuaderno de cocina compartido, y obligar a pedir permiso para
-- apuntar una receta no tiene sentido. Borrar, en cambio, solo quien la
-- apuntó o un administrador, como con las casas y las fechas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- El recetario
-- ---------------------------------------------------------------------
create table if not exists public.dishes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  /** Para qué tiempo suele ser: ayuda a ofrecer lo que encaja. */
  kind        text not null default 'comida'
              check (kind in ('desayuno', 'comida', 'merienda', 'cena', 'picoteo', 'bebida', 'otro')),
  /** Las cantidades de sus ingredientes son para esta gente. */
  base_people numeric(5,2) not null default 15,
  notes       text,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  constraint dishes_name_no_vacio check (length(btrim(name)) > 0)
);

create index if not exists dishes_kind_idx on public.dishes (kind, name);

-- ---------------------------------------------------------------------
-- Los ingredientes de cada plato
-- ---------------------------------------------------------------------
create table if not exists public.dish_items (
  id             uuid primary key default gen_random_uuid(),
  dish_id        uuid not null references public.dishes (id) on delete cascade,
  -- Si sale de la lista maestra se enlaza, y así la despensa puede
  -- emparejarlo luego sin adivinar por el nombre.
  master_item_id uuid references public.master_items (id) on delete set null,
  name           text not null,
  category       text not null default 'Otros',
  qty            numeric(10,2),
  unit           text not null default 'ud',
  notes          text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  constraint dish_items_name_no_vacio check (length(btrim(name)) > 0)
);

create index if not exists dish_items_dish_idx on public.dish_items (dish_id, sort_order);

-- ---------------------------------------------------------------------
-- Qué se cocina en cada tiempo
-- ---------------------------------------------------------------------
create table if not exists public.trip_meal_dishes (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.trip_meals (id) on delete cascade,
  dish_id    uuid not null references public.dishes (id)     on delete cascade,
  created_at timestamptz not null default now(),
  -- El mismo plato dos veces en la misma cena no significa nada.
  unique (meal_id, dish_id)
);

create index if not exists trip_meal_dishes_meal_idx on public.trip_meal_dishes (meal_id);

-- ---------------------------------------------------------------------
-- De qué plato salió cada cosa de la compra
-- ---------------------------------------------------------------------
-- Sirve para no duplicar al volver a generar, y para poder decir «esto es
-- de la paella del sábado» cuando alguien se pregunte por qué está en la
-- lista.
alter table public.shopping_items
  add column if not exists dish_id uuid references public.dishes (id) on delete set null;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.dishes           enable row level security;
alter table public.dish_items       enable row level security;
alter table public.trip_meal_dishes enable row level security;

grant select, insert, update, delete on public.dishes           to authenticated;
grant select, insert, update, delete on public.dish_items       to authenticated;
grant select, insert, update, delete on public.trip_meal_dishes to authenticated;

-- El recetario: lo lee y lo escribe el grupo; lo borra quien lo apuntó o un
-- administrador.
drop policy if exists dishes_select on public.dishes;
create policy dishes_select on public.dishes
  for select to authenticated using (public.is_member());

drop policy if exists dishes_insert on public.dishes;
create policy dishes_insert on public.dishes
  for insert to authenticated
  with check (public.is_member() and (created_by is null or created_by = auth.uid()));

drop policy if exists dishes_update on public.dishes;
create policy dishes_update on public.dishes
  for update to authenticated using (public.is_member()) with check (public.is_member());

drop policy if exists dishes_delete on public.dishes;
create policy dishes_delete on public.dishes
  for delete to authenticated using (public.is_admin() or created_by = auth.uid());

-- Los ingredientes van con su plato: si puedes tocar el recetario, puedes
-- tocarlos.
drop policy if exists dish_items_all on public.dish_items;
create policy dish_items_all on public.dish_items
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- Poner un plato en una cena es organizar la escapada: cualquiera del grupo.
drop policy if exists trip_meal_dishes_all on public.trip_meal_dishes;
create policy trip_meal_dishes_all on public.trip_meal_dishes
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['dishes', 'dish_items', 'trip_meal_dishes']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Unos platos para empezar
-- ---------------------------------------------------------------------
-- Solo si el recetario está vacío: si ya has apuntado los tuyos, esto no
-- hace nada. Las cantidades son para 15 y se escalan solas al grupo.
do $$
declare
  v_plato uuid;
begin
  if exists (select 1 from public.dishes) then
    return;
  end if;

  -- Paella
  insert into public.dishes (name, kind, base_people, notes, sort_order)
  values ('Paella', 'comida', 15, 'La del sábado de siempre', 10)
  returning id into v_plato;
  insert into public.dish_items (dish_id, name, category, qty, unit, sort_order) values
    (v_plato, 'Arroz bomba',        'Comidas',  2,   'kg',   10),
    (v_plato, 'Pollo troceado',     'Comidas',  2,   'kg',   20),
    (v_plato, 'Conejo troceado',    'Comidas',  1.5, 'kg',   30),
    (v_plato, 'Judía verde plana',  'Verduras', 1,   'kg',   40),
    (v_plato, 'Garrofón',           'Verduras', 0.5, 'kg',   50),
    (v_plato, 'Tomate triturado',   'Comidas',  1,   'bote', 60),
    (v_plato, 'Pimentón dulce',     'Otros',    1,   'ud',   70),
    (v_plato, 'Azafrán',            'Otros',    1,   'ud',   80);

  -- Lentejas
  insert into public.dishes (name, kind, base_people, notes, sort_order)
  values ('Lentejas con chorizo', 'comida', 15, null, 20)
  returning id into v_plato;
  insert into public.dish_items (dish_id, name, category, qty, unit, sort_order) values
    (v_plato, 'Lentejas',          'Comidas',  2,  'kg', 10),
    (v_plato, 'Chorizo',           'Comidas',  1,  'kg', 20),
    (v_plato, 'Zanahoria',         'Verduras', 1,  'kg', 30),
    (v_plato, 'Patata',            'Verduras', 2,  'kg', 40),
    (v_plato, 'Cebolla',           'Verduras', 1,  'kg', 50);

  -- Barbacoa
  insert into public.dishes (name, kind, base_people, notes, sort_order)
  values ('Barbacoa', 'cena', 15, 'Con los pinchos de madera, que siempre se olvidan', 30)
  returning id into v_plato;
  insert into public.dish_items (dish_id, name, category, qty, unit, sort_order) values
    (v_plato, 'Chuletas de cordero', 'Cenas', 3,  'kg',      10),
    (v_plato, 'Panceta',             'Cenas', 1.5, 'kg',     20),
    (v_plato, 'Chorizo para asar',   'Cenas', 1.5, 'kg',     30),
    (v_plato, 'Pan',                 'Otros', 3,  'barra',   40),
    (v_plato, 'Carbón / leña',       'Otros', 2,  'bolsa',   50);

  -- Tortilla de patatas
  insert into public.dishes (name, kind, base_people, notes, sort_order)
  values ('Tortilla de patatas', 'picoteo', 15, null, 40)
  returning id into v_plato;
  insert into public.dish_items (dish_id, name, category, qty, unit, sort_order) values
    (v_plato, 'Patata',          'Verduras', 3,  'kg', 10),
    (v_plato, 'Huevos',          'Comidas',  24, 'ud', 20),
    (v_plato, 'Cebolla',         'Verduras', 1,  'kg', 30),
    (v_plato, 'Aceite de oliva', 'Otros',    1,  'l',  40);
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos: hay que avisarle.
notify pgrst, 'reload schema';
