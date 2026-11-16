-- =====================================================================
-- Rural69 · 09 · «Cosas a recordar» en la lista de la compra
-- ---------------------------------------------------------------------
-- Ejecútalo en Supabase (SQL Editor). Se puede repetir sin miedo: no
-- duplica nada, se salta lo que ya esté.
--
-- Mete en la lista de la compra de la escapada en marcha lo que siempre se
-- olvida: albal, vasos y platos, papel de cocina, pinchos de barbacoa,
-- vinagre, sal y aceite.
--
-- Van como COMPRA COMÚN (sin tiempo asignado), que es lo que les
-- corresponde: la sal no es de la cena del viernes.
--
-- Casi todo estaba ya en la lista maestra, solo con otro nombre —«albal»
-- es «Papel de aluminio», y vasos y platos van en una sola línea—, así que
-- lo único que se da de alta nuevo son los pinchos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Lo que faltaba en la lista maestra
-- ---------------------------------------------------------------------
insert into public.master_items (name, category, qty, unit, base_people, notes, sort_order)
select 'Pinchos de madera (barbacoa)', 'Otros', 2, 'paquete', 15, 'Para las brochetas', 745
where not exists (
  select 1 from public.master_items
  where lower(name) like '%pincho%' or lower(name) like '%brocheta%'
);

-- ---------------------------------------------------------------------
-- 2 · A la lista de la escapada en marcha
-- ---------------------------------------------------------------------
-- Se elige la escapada más reciente que no esté archivada. Si quieres otra,
-- cambia el `where` por su nombre, p. ej.:
--     where title = 'Escapada de otoño'
with viaje as (
  select id
  from public.trips
  where status <> 'archivada'
  order by created_at desc
  limit 1
),
-- Lo que hay que llevar, por su nombre en la lista maestra.
recordatorios as (
  select m.*
  from public.master_items m
  where m.name in (
    'Papel de aluminio',           -- el albal
    'Vasos y platos de usar',      -- vasos y platos, en una línea
    'Papel de cocina',
    'Pinchos de madera (barbacoa)',
    'Vinagre',
    'Sal',
    'Aceite de oliva'
  )
)
insert into public.shopping_items
  (trip_id, master_item_id, name, category, unit, needed_qty, available_qty, buy_qty, notes, sort_order)
select
  v.id,
  r.id,
  r.name,
  r.category,
  r.unit,
  coalesce(r.qty, 1),
  0,
  coalesce(r.qty, 1),
  r.notes,
  -- Al final de la lista, en el orden en que están en la maestra.
  900 + (row_number() over (order by r.sort_order))
from viaje v
cross join recordatorios r
-- Si ya lo habías metido a mano, se respeta lo que hay.
where not exists (
  select 1
  from public.shopping_items s
  where s.trip_id = v.id
    and lower(btrim(s.name)) = lower(btrim(r.name))
);

-- ---------------------------------------------------------------------
-- Qué ha quedado en la compra común de esa escapada
-- ---------------------------------------------------------------------
select t.title as escapada, s.name as producto, s.buy_qty as cantidad, s.unit as unidad, s.category
from public.shopping_items s
join public.trips t on t.id = s.trip_id
where s.meal_id is null
  and s.trip_id = (
    select id from public.trips where status <> 'archivada' order by created_at desc limit 1
  )
order by s.sort_order;
