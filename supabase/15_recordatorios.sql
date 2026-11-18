-- =====================================================================
-- Rural69 · 15 · Recordatorios automáticos antes de la escapada
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Hasta ahora todos los avisos los provocaba alguien: alguien propone una
-- casa, alguien abre una votación. Pero el aviso que más falta hace no lo
-- provoca nadie —«esto es este finde, repasa tu equipaje»—, porque lo que
-- pasa es justamente que nadie se acuerda.
--
-- Esto lo arregla con tres piezas:
--
--   1. `trip_reminders`, que recuerda qué recordatorio se mandó ya. Sin
--      ella, la tarea de cada mañana avisaría otra vez de lo mismo.
--   2. `manda_recordatorios()`, que mira las escapadas que vienen y crea
--      los avisos. Como los crea con `notificar()`, viajan por el mismo
--      camino que los demás: una fila por persona, el webhook de la base
--      de datos y el empujón al móvil. No hace falta tocar nada más.
--   3. Una tarea de `pg_cron` que la llama una vez al día.
--
-- Se manda dos veces, a propósito:
--   · A tres días: todavía hay tiempo de comprar y de repartir el equipaje.
--   · La víspera: el último aviso útil.
--
-- Si `pg_cron` no está disponible, el archivo se ejecuta igual y lo dice al
-- final: las dos primeras piezas quedan puestas y solo falta activar la
-- extensión en el panel (Database → Extensions → pg_cron) y volver a pasar
-- este archivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Un tipo de aviso más
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
  alter table public.notifications add constraint notifications_kind_check check (kind in (
    'casa_propuesta', 'votacion_abierta', 'votacion_cerrada', 'casa_elegida',
    'fechas_propuestas', 'votacion_fechas_abierta', 'fechas_elegidas',
    'recordatorio'
  ));
end $$;

-- ---------------------------------------------------------------------
-- Qué recordatorio se mandó ya
-- ---------------------------------------------------------------------
create table if not exists public.trip_reminders (
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- `tres_dias` y `vispera`. La clave primaria es la que impide repetir.
  kind    text not null check (kind in ('tres_dias', 'vispera')),
  sent_at timestamptz not null default now(),
  primary key (trip_id, kind)
);

alter table public.trip_reminders enable row level security;

-- Se puede mirar (sirve para saber si ya se avisó), pero escribir solo la
-- función de abajo, que va como `security definer`.
grant select on public.trip_reminders to authenticated;

drop policy if exists trip_reminders_select on public.trip_reminders;
create policy trip_reminders_select on public.trip_reminders
  for select to authenticated using (public.is_member());

-- ---------------------------------------------------------------------
-- La tarea: avisar de lo que viene
-- ---------------------------------------------------------------------
-- Devuelve cuántos recordatorios ha mandado, que es lo que se ve en el
-- historial de la tarea programada y evita tener que adivinar.
create or replace function public.manda_recordatorios()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viaje        record;
  v_kind         text;
  v_dias         integer;
  v_sin_duenyo   integer := 0;
  v_por_comprar  integer := 0;
  v_titulo       text;
  v_cuerpo       text;
  v_mandados     integer := 0;
begin
  for v_viaje in
    select id, title, start_date
    from public.trips
    where status in ('planificacion', 'confirmada')
      and start_date is not null
      and start_date >= current_date
      and start_date <= current_date + 3
  loop
    v_dias := v_viaje.start_date - current_date;
    -- A tres y a dos días cae en el mismo recordatorio: el de «tres días» ya
    -- se mandó, así que el segundo día no se repite. La víspera y el propio
    -- día comparten el otro.
    v_kind := case when v_dias <= 1 then 'vispera' else 'tres_dias' end;

    -- Aquí está el seguro contra repetirse: si la fila ya existe, no se
    -- inserta nada y nos vamos a la siguiente escapada.
    insert into public.trip_reminders (trip_id, kind) values (v_viaje.id, v_kind)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    -- Lo que falta, para que el aviso diga algo en vez de solo recordar la
    -- fecha. El equipaje puede no existir todavía si falta pasar el 13.
    begin
      select count(*) into v_sin_duenyo
      from public.trip_packing
      where trip_id = v_viaje.id and member_id is null;
    exception when undefined_table then
      v_sin_duenyo := 0;
    end;

    select count(*) into v_por_comprar
    from public.shopping_items
    where trip_id = v_viaje.id and not purchased;

    v_titulo := case
      when v_dias = 0 then '¡Hoy es el día! ' || v_viaje.title
      when v_dias = 1 then '¡Mañana es la escapada! ' || v_viaje.title
      else 'En ' || v_dias || ' días: ' || v_viaje.title
    end;

    v_cuerpo := 'Repasa tu equipaje'
      || case when v_sin_duenyo > 0
              then ': hay ' || v_sin_duenyo || case when v_sin_duenyo = 1 then ' cosa' else ' cosas' end
                   || ' que no lleva nadie'
              else '' end
      || case when v_por_comprar > 0
              then case when v_sin_duenyo > 0 then ', y ' else ', y hay ' end
                   || v_por_comprar || case when v_por_comprar = 1 then ' producto' else ' productos' end
                   || ' sin comprar'
              else '' end
      || '.';

    -- Sin actor: este aviso no lo provoca nadie, así que lo recibe todo el
    -- grupo. Los demás excluyen a quien los provoca.
    perform public.notificar(
      'recordatorio',
      v_viaje.id,
      v_titulo,
      v_cuerpo,
      '/escapadas/' || v_viaje.id || '/equipaje',
      null
    );

    v_mandados := v_mandados + 1;
  end loop;

  return v_mandados;
end;
$$;

-- Que nadie la llame desde el navegador: haría sonar once móviles.
revoke all on function public.manda_recordatorios() from public, authenticated;

-- ---------------------------------------------------------------------
-- Una vez al día
-- ---------------------------------------------------------------------
-- `pg_cron` va en hora UTC, así que las 8:00 son las 9 de la mañana en
-- España en invierno y las 10 en verano. Buena hora para un recordatorio:
-- ni de noche ni cuando ya es tarde para comprar.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    null; -- Puede hacer falta activarla desde el panel; se avisa abajo.
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'rural69-recordatorios') then
      perform cron.unschedule('rural69-recordatorios');
    end if;
    perform cron.schedule(
      'rural69-recordatorios',
      '0 8 * * *',
      $tarea$select public.manda_recordatorios()$tarea$
    );
    raise notice 'Rural69: recordatorios programados todos los días a las 8:00 UTC.';
  else
    raise notice 'Rural69: falta la extensión pg_cron. Actívala en Database → Extensions y vuelve a pasar este archivo; mientras, los recordatorios no se mandarán solos.';
  end if;
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
