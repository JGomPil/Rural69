-- =====================================================================
-- Rural69 · 12 · La lista maestra crece con el recetario
-- ---------------------------------------------------------------------
-- Ejecútalo en Supabase (SQL Editor). Se puede repetir sin miedo: no
-- borra ni duplica nada.
--
-- Hasta ahora el camino iba en un solo sentido. El recetario LEÍA la
-- lista maestra —cada ingrediente tiene su desplegable para elegirlo de
-- ahí—, pero lo que se escribía a mano se quedaba suelto dentro del
-- plato, con el enlace a nulo. Y un ingrediente suelto llega bien a la
-- compra pero la despensa no lo sabe emparejar con los sobrantes, ni se
-- ofrece la próxima vez que alguien apunte una receta.
--
-- Ahora, al guardar un plato, lo que no venga de la maestra se apunta en
-- ella y queda enlazado. Para eso hace falta que cualquier integrante
-- pueda AÑADIR a la lista maestra, porque el recetario lo escribe todo el
-- grupo, no solo un administrador.
--
-- Añadir, nada más. Cambiar y borrar siguen siendo del administrador: la
-- lista crece sola con lo que se cocina, y podarla es cosa de uno. Esa
-- asimetría es a propósito, igual que en las casas y las fechas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permisos: añadir el grupo, cambiar y borrar el administrador
-- ---------------------------------------------------------------------
-- La política vieja era una sola para todo (`for all`), de administrador.
drop policy if exists master_items_write on public.master_items;

drop policy if exists master_items_insert on public.master_items;
create policy master_items_insert on public.master_items
  for insert to authenticated
  with check (public.is_member());

drop policy if exists master_items_update on public.master_items;
create policy master_items_update on public.master_items
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists master_items_delete on public.master_items;
create policy master_items_delete on public.master_items
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Que no entren dos veces lo mismo
-- ---------------------------------------------------------------------
-- La aplicación ya busca antes de dar de alta, pero dos personas
-- guardando recetas a la vez pueden colarse, y entonces la lista maestra
-- se llena de «Cebolla» y «cebolla ». Esto lo impide de raíz.
--
-- Solo se pone si no hay ya nombres repetidos: si los hay, el índice
-- fallaría y se llevaría por delante el resto del archivo. En ese caso
-- avisa, los deja a la vista al final, y basta con arreglarlos y volver a
-- pasar esto.
do $$
declare
  v_repes int;
begin
  select count(*) into v_repes
  from (
    select lower(btrim(name))
    from public.master_items
    group by 1
    having count(*) > 1
  ) t;

  if v_repes > 0 then
    raise notice 'NO pongo el índice único: hay %  nombre(s) repetido(s) en la lista maestra. Los tienes listados abajo: únelos o borra el que sobre y vuelve a pasar este archivo.', v_repes;
  else
    create unique index if not exists master_items_nombre_unico
      on public.master_items (lower(btrim(name)));
    raise notice 'Índice único puesto: la lista maestra ya no admite dos productos con el mismo nombre.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Los repetidos, si hay
-- ---------------------------------------------------------------------
-- Si la consulta sale vacía, todo en orden y el índice ya está puesto.
select lower(btrim(name)) as nombre,
       count(*)           as cuantos,
       string_agg(id::text, ', ') as ids
from public.master_items
group by 1
having count(*) > 1
order by 2 desc;

-- PostgREST se guarda en memoria cómo es la base de datos: hay que avisarle.
notify pgrst, 'reload schema';
