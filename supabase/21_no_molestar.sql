-- =====================================================================
-- Rural69 · 21 · No molestar de noche
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Los avisos del grupo nacen cuando alguien hace algo, y alguien hace
-- cosas a las dos de la mañana. Un móvil en la mesilla vibrando porque
-- un amigo ha propuesto una casa es la forma más rápida de que medio
-- grupo apague los avisos para siempre, y entonces los recordatorios
-- —que sí importan— tampoco llegan.
--
-- Tres decisiones:
--
--   · Va encendido de serie, de 23:00 a 8:00, hora de España. Lo que
--     hay que decidir es si quieres que te despierten, no si quieres
--     que no te despierten.
--   · Se silencia el empujón al móvil, no el aviso. La fila de
--     `notifications` se crea igual, así que por la mañana está en la
--     campana con todo lo que pasó de noche. No se pierde nada: solo
--     no suena.
--   · Es de cada persona, no del grupo. Quien trabaje de noche se lo
--     apaga y ya está.
--
-- Quien lo mira es la función «avisar» (supabase/functions/avisar), que
-- es la que firma los envíos. OJO: después de pasar este archivo hay que
-- volver a desplegar la función, o seguirá avisando de madrugada.
-- =====================================================================

alter table public.profiles
  add column if not exists quiet_hours boolean  not null default true,
  add column if not exists quiet_from  smallint not null default 23,
  add column if not exists quiet_to    smallint not null default 8;

-- Horas de reloj, no horarios raros.
alter table public.profiles drop constraint if exists profiles_quiet_from_hora;
alter table public.profiles
  add constraint profiles_quiet_from_hora check (quiet_from between 0 and 23);

alter table public.profiles drop constraint if exists profiles_quiet_to_hora;
alter table public.profiles
  add constraint profiles_quiet_to_hora check (quiet_to between 0 and 23);

comment on column public.profiles.quiet_hours is
  'true = de noche no suena el móvil. El aviso se crea igual y espera en la campana.';
comment on column public.profiles.quiet_from is 'Hora de España a la que empieza el silencio.';
comment on column public.profiles.quiet_to is 'Hora de España a la que se acaba.';

-- Los permisos no cambian: `profiles_update_self` ya deja a cada cual
-- tocar su propia fila sin poder cambiarse el papel.

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
