-- =====================================================================
-- Rural69 · 26 · El segundo enlace y a quién se llama
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- De una casa candidata se guardaba un solo enlace, y casi ninguna tiene
-- uno: está la ficha del portal donde se encontró y la web del dueño, y
-- los precios y las fotos no son los mismos en las dos. Faltaba también
-- lo más tonto de todo, que es a quién se llama para preguntar si está
-- libre ese finde: ese teléfono acababa en el WhatsApp del grupo y se
-- perdía entre doscientos mensajes.
--
-- Ojo, no confundir con `owner_name` y `owner_phone` de
-- `19_datos_llegada.sql`: aquellos son los de quien abre la puerta el día
-- que ya se va, y solo se rellenan cuando la casa está reservada. Estos
-- son los de antes, los de preguntar.
-- =====================================================================

alter table public.houses
  add column if not exists url2          text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

comment on column public.houses.url2 is 'Segundo enlace: la ficha del portal y la web del dueño no suelen decir lo mismo.';
comment on column public.houses.contact_phone is 'Teléfono para preguntar por la casa, antes de reservarla.';
comment on column public.houses.contact_email is 'Correo para preguntar por la casa, antes de reservarla.';

-- Los permisos no cambian: estas columnas viven en `houses`, y sus
-- políticas ya dicen quién puede verlas y quién puede escribirlas.

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
