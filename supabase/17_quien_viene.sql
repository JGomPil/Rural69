-- =====================================================================
-- Rural69 · 17 · Que cada uno diga si viene
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Hasta ahora «quién viene» lo ponía un administrador editando la
-- escapada, o sea, una persona persiguiendo por WhatsApp a las otras
-- diez. Y de ese número salen las cantidades de la compra y el precio
-- por adulto, así que mientras nadie lo actualiza, la compra miente.
--
-- Hacía falta distinguir tres cosas donde antes había dos:
--
--   · viene          → fila con `attending = true`
--   · no puede       → fila con `attending = false`
--   · no ha dicho    → sin fila
--
-- El tercer estado es el que importa: es lo que permite decir «faltan
-- cuatro por contestar» en lugar de contar como «no vienen» a quienes
-- simplemente no han abierto la aplicación.
--
-- Los permisos no cambian: la política de `trip_participants` ya dejaba
-- a cualquier integrante del grupo tocar la lista. Es un grupo de
-- amigos, no una empresa; quien marca por su pareja y sus niños no está
-- haciendo nada raro.
-- =====================================================================

alter table public.trip_participants
  add column if not exists attending boolean not null default true;

comment on column public.trip_participants.attending is
  'true = viene, false = no puede. Sin fila = todavía no ha contestado.';

-- Lo que se consulta siempre: quién viene a esta escapada.
create index if not exists trip_participants_vienen_idx
  on public.trip_participants (trip_id) where attending;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
