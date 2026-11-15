-- =====================================================================
-- Rural69 · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Perfiles de usuario (1 fila por cuenta de Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  role         text not null default 'user' check (role in ('admin', 'user')),
  member_id    uuid,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Unidades familiares / parejas
-- ---------------------------------------------------------------------
create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Integrantes del grupo (adultos y niños)
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  household_id       uuid references public.households (id) on delete set null,
  is_child           boolean not null default false,
  consumption_factor numeric(4,2) not null default 1 check (consumption_factor >= 0 and consumption_factor <= 3),
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

do $$ begin
  alter table public.profiles
    add constraint profiles_member_id_fkey
    foreign key (member_id) references public.members (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Escapadas
-- ---------------------------------------------------------------------
create table if not exists public.trips (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  start_date      date,
  end_date        date,
  town            text,
  province        text,
  notes           text,
  status          text not null default 'planificacion'
                  check (status in ('planificacion', 'confirmada', 'realizada', 'archivada')),
  voting_open     boolean not null default true,
  chosen_house_id uuid,
  shopping_cost   numeric(10,2),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Participantes confirmados de cada escapada
create table if not exists public.trip_participants (
  trip_id   uuid not null references public.trips (id)   on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (trip_id, member_id)
);

-- ---------------------------------------------------------------------
-- Casas rurales candidatas
-- ---------------------------------------------------------------------
create table if not exists public.houses (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  name            text not null,
  url             text,
  town            text,
  province        text,
  total_price     numeric(10,2),
  max_guests      int,
  bedrooms        int,
  bathrooms       int,
  has_pool        boolean not null default false,
  has_bbq         boolean not null default false,
  has_garden      boolean not null default false,
  pets_allowed    boolean not null default false,
  common_spaces   text,
  features        text,
  notes           text,
  cover_image_url text,
  reserved        boolean not null default false,
  proposed_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

do $$ begin
  alter table public.trips
    add constraint trips_chosen_house_id_fkey
    foreign key (chosen_house_id) references public.houses (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.house_photos (
  id         uuid primary key default gen_random_uuid(),
  house_id   uuid not null references public.houses (id) on delete cascade,
  url        text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Votaciones (un voto por persona y escapada)
-- ---------------------------------------------------------------------
create table if not exists public.votes (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id)    on delete cascade,
  house_id   uuid not null references public.houses (id)   on delete cascade,
  voter_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, voter_id)
);

-- ---------------------------------------------------------------------
-- Lista maestra de la compra (reutilizable entre escapadas)
-- ---------------------------------------------------------------------
create table if not exists public.master_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'Otros',
  qty         numeric(10,2),
  unit        text not null default 'ud',
  base_people numeric(5,2) not null default 15,
  notes       text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Lista de la compra de cada escapada
--   needed_qty    = cantidad necesaria
--   available_qty = cantidad disponible en la despensa (sobrantes)
--   buy_qty       = cantidad pendiente de comprar (editable a mano)
-- ---------------------------------------------------------------------
create table if not exists public.shopping_items (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  master_item_id uuid references public.master_items (id) on delete set null,
  name           text not null,
  category       text not null default 'Otros',
  unit           text not null default 'ud',
  needed_qty     numeric(10,2) not null default 0,
  available_qty  numeric(10,2) not null default 0,
  buy_qty        numeric(10,2) not null default 0,
  purchased      boolean not null default false,
  assigned_to    uuid references public.members (id) on delete set null,
  price          numeric(10,2),
  notes          text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Despensa compartida (sobrantes que se conservan de una escapada a otra)
-- ---------------------------------------------------------------------
create table if not exists public.pantry_items (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null default 'Otros',
  qty            numeric(10,2) not null default 0,
  unit           text not null default 'ud',
  condition      text,
  notes          text,
  keepable       boolean not null default true,
  source_trip_id uuid references public.trips (id) on delete set null,
  master_item_id uuid references public.master_items (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ajustes de la aplicación (clave/valor)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null
);

insert into public.app_settings (key, value) values
  ('child_factor',       '0.5'::jsonb),
  ('default_group_size', '15'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index if not exists houses_trip_idx          on public.houses (trip_id);
create index if not exists house_photos_house_idx   on public.house_photos (house_id);
create index if not exists votes_trip_idx           on public.votes (trip_id);
create index if not exists shopping_items_trip_idx  on public.shopping_items (trip_id);
create index if not exists trip_participants_trip_idx on public.trip_participants (trip_id);
create index if not exists trips_start_date_idx     on public.trips (start_date desc);

-- ---------------------------------------------------------------------
-- Alta automática de perfil al crear la cuenta.
-- El primer usuario que entra se convierte en administrador.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'amig@'), '@', 1)),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at en despensa
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pantry_items_touch on public.pantry_items;
create trigger pantry_items_touch
  before update on public.pantry_items
  for each row execute function public.touch_updated_at();
