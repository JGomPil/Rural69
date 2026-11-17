-- =====================================================================
-- Rural69 · 14 · Avisos al móvil con la aplicación cerrada
-- ---------------------------------------------------------------------
-- Ejecútalo en Supabase (SQL Editor). Se puede repetir sin miedo: no
-- borra ni duplica nada.
--
-- Hasta ahora los avisos del sistema los lanzaba la propia aplicación, y
-- solo si estaba abierta. Es decir: te enterabas de que había votación si
-- ya estabas mirando. Para que una votación mueva a once personas hace
-- falta que suene el móvil con la aplicación cerrada, y eso solo lo puede
-- hacer un servidor empujando el aviso.
--
-- Aquí se guarda a qué aparatos hay que empujar. Cada navegador de cada
-- persona da una dirección propia (`endpoint`) y dos claves con las que
-- se cifra el mensaje: sin ellas, ni el servicio de push ni nadie puede
-- leer lo que se manda.
--
-- Cada cual ve y borra solo las suyas. Quien manda los avisos es la
-- función del servidor, que usa la clave de servicio y no pasa por aquí.
-- =====================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- La dirección que da el navegador. Única: si el mismo aparato se vuelve
  -- a suscribir, se actualiza en vez de duplicarse.
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  -- Para poder reconocer el aparato en la lista de «dónde recibo avisos».
  user_agent text,
  created_at timestamptz not null default now(),
  -- Último envío que salió bien. Sirve para limpiar los que ya no valen.
  last_ok_at timestamptz
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

-- ---------------------------------------------------------------------
-- Permisos: cada cual, lo suyo
-- ---------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists push_subscriptions_propias on public.push_subscriptions;
create policy push_subscriptions_propias on public.push_subscriptions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- PostgREST se guarda en memoria cómo es la base de datos: hay que avisarle.
notify pgrst, 'reload schema';
