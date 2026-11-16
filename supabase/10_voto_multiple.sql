-- =====================================================================
-- Rural69 · 10 · Votar varias, no solo una
-- ---------------------------------------------------------------------
-- Ejecútalo en Supabase (SQL Editor). Se puede repetir sin miedo: no borra
-- ni duplica nada, y no toca los votos que ya haya.
--
-- Hasta ahora cada persona tenía UN voto por escapada, y lo imponía la
-- base de datos con `unique (trip_id, voter_id)`. Eso obliga a elegir una
-- sola casa y un solo finde, que no es como decide el grupo: a casi todo
-- el mundo le valen varias fechas, y lo útil es saber cuáles le valen a
-- cuánta gente.
--
-- Así que la restricción pasa a ser por candidata: una persona puede votar
-- cuantas quiera, incluso todas, pero no la misma dos veces. Es lo que se
-- llama voto por aprobación, y tiene una ventaja para esto: la ganadora es
-- la que le vale a más gente, no la que gana por poco con el grupo
-- partido.
--
-- Los votos que ya existan siguen valiendo tal cual: cada persona tenía
-- como mucho uno, así que ninguno choca con la restricción nueva.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Casas y fechas, lo mismo en las dos
-- ---------------------------------------------------------------------
-- Se busca la restricción por sus columnas en vez de por su nombre: lo
-- pusieron `unique (...)` dentro del `create table`, así que el nombre lo
-- eligió Postgres y es mejor no fiarse de cómo lo escribió.
do $$
declare
  v_tabla   text;
  v_columna text;
  v_nombre  text;
begin
  foreach v_tabla in array array['votes', 'date_votes']
  loop
    v_columna := case v_tabla when 'votes' then 'house_id' else 'option_id' end;

    select con.conname into v_nombre
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    where ns.nspname = 'public'
      and cl.relname = v_tabla
      and con.contype = 'u'
      -- Exactamente (trip_id, voter_id): ni más ni menos.
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) as k(num)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.num
      ) = array['trip_id', 'voter_id']
    limit 1;

    if v_nombre is not null then
      execute format('alter table public.%I drop constraint %I', v_tabla, v_nombre);
      raise notice 'Quitada la restricción % de %', v_nombre, v_tabla;
    end if;

    -- La nueva: la misma persona no puede votar dos veces la misma.
    begin
      execute format(
        'alter table public.%I add constraint %I unique (trip_id, voter_id, %I)',
        v_tabla, v_tabla || '_sin_repetir', v_columna
      );
    exception when duplicate_table or duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
-- Con varios votos por persona ya no se cambia un voto: se añade o se
-- quita. Las políticas de insert y delete propias siguen valiendo tal
-- cual, y la de update deja de usarse pero no estorba.
--
-- Lo que sí importa es que nadie pueda colar votos a nombre de otro, y eso
-- lo siguen cerrando `voter_id = auth.uid()` en el insert y la votación
-- abierta. No se toca nada aquí.

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
select
  cl.relname                                              as tabla,
  con.conname                                             as restriccion,
  (select string_agg(att.attname, ', ' order by att.attnum)
   from unnest(con.conkey) as k(num)
   join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.num) as columnas
from pg_constraint con
join pg_class cl on cl.oid = con.conrelid
join pg_namespace ns on ns.oid = cl.relnamespace
where ns.nspname = 'public'
  and cl.relname in ('votes', 'date_votes')
  and con.contype = 'u'
order by cl.relname;

notify pgrst, 'reload schema';
