-- =====================================================================
-- Rural69 · 19 · Lo que hace falta al llegar
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Hasta ahora, de una casa se guardaba lo que sirve para DECIDIRLA:
-- nombre, enlace, pueblo, precio, camas, si tiene piscina. Nada de lo
-- que sirve para IR: la dirección exacta, a qué hora se puede entrar,
-- el teléfono del dueño, la clave del portón, el wifi.
--
-- Eso vive hoy en el correo de quien reservó, y el correo en el monte no
-- se abre. Ahora que la aplicación funciona sin cobertura y se guarda
-- una copia de lo último que leyó, puede ser el único sitio donde esos
-- datos están siempre, en el bolsillo de los once.
--
-- Van en `houses` y no en `trips` a propósito: son datos de la casa, y
-- si el año que viene se repite casa, se repiten con ella.
-- =====================================================================

alter table public.houses
  add column if not exists address       text,
  add column if not exists map_url       text,
  add column if not exists check_in      text,
  add column if not exists check_out     text,
  add column if not exists owner_name    text,
  add column if not exists owner_phone   text,
  add column if not exists gate_code     text,
  add column if not exists wifi_name     text,
  add column if not exists wifi_password text,
  add column if not exists arrival_notes text;

comment on column public.houses.address is 'Dirección exacta, la de meter en el navegador.';
comment on column public.houses.map_url is 'Enlace a un punto concreto del mapa. Si está vacío se construye uno con la dirección.';
comment on column public.houses.check_in is 'Hora de entrada, tal cual la diga el dueño: «a partir de las 17:00».';
comment on column public.houses.check_out is 'Hora de salida.';
comment on column public.houses.owner_name is 'Cómo se llama quien abre la puerta.';
comment on column public.houses.owner_phone is 'Su teléfono, para poder llamar desde la ficha.';
comment on column public.houses.gate_code is 'Clave del portón, de la caja de llaves o de la alarma.';
comment on column public.houses.wifi_name is 'Nombre de la red.';
comment on column public.houses.wifi_password is 'Contraseña de la red.';
comment on column public.houses.arrival_notes is 'Cómo llegar de verdad: el desvío sin señalizar, los dos kilómetros de pista…';

-- Los permisos no cambian: estas columnas viven en `houses`, y sus
-- políticas ya dicen quién puede verlas (cualquier integrante del grupo)
-- y quién puede escribirlas (quien propuso la casa, o un administrador).

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
