-- =====================================================================
-- Rural69 · 16 · Avisos del chat
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- El chat no avisaba de nada: escribías y no se enteraba nadie hasta que
-- abría la aplicación por su cuenta. Con once personas eso decide si el
-- chat se usa o si la conversación se va a WhatsApp, que es justo lo que
-- se quería evitar.
--
-- El problema de avisar de cada mensaje es obvio: veinte mensajes serían
-- veinte vibraciones. Así que una conversación seguida es UN aviso:
--
--   · Si esa persona no tiene ningún aviso de chat sin leer de esta
--     escapada, o el que tiene es de hace más de diez minutos, se crea
--     uno nuevo. Crear es lo que dispara el webhook, o sea, lo que suena.
--   · Si lo tiene y es reciente, se ACTUALIZA el que ya hay. El buzón
--     dice «7 mensajes sin leer» con el último texto debajo, y el móvil
--     no vuelve a sonar hasta pasados esos diez minutos.
--
-- La cuenta no se lleva a mano: es la misma que ya usa el contador de la
-- pestaña Chat —mensajes de otros posteriores a tu marca de lectura—, de
-- modo que no hay dos verdades sobre cuántos te faltan por leer.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Un tipo de aviso más
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
  alter table public.notifications add constraint notifications_kind_check check (kind in (
    'casa_propuesta', 'votacion_abierta', 'votacion_cerrada', 'casa_elegida',
    'fechas_propuestas', 'votacion_fechas_abierta', 'fechas_elegidas',
    'recordatorio', 'mensaje_chat'
  ));
end $$;

-- Buscar «mi aviso de chat sin leer de esta escapada» es lo único que hace
-- esta función por cada persona del grupo y por cada mensaje.
create index if not exists notifications_chat_idx
  on public.notifications (profile_id, trip_id, created_at desc)
  where kind = 'mensaje_chat' and read_at is null;

-- ---------------------------------------------------------------------
-- Alguien escribe en el chat
-- ---------------------------------------------------------------------
create or replace function public.avisa_mensaje_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quien    text;
  v_viaje    text;
  v_resumen  text;
  v_persona  uuid;
  v_aviso    record;
  v_cuantos  integer;
  v_titulo   text;
  v_url      text;
begin
  select coalesce(nullif(btrim(display_name), ''), split_part(email, '@', 1))
    into v_quien
  from public.profiles where id = new.author_id;

  select title into v_viaje from public.trips where id = new.trip_id;

  -- Una foto sin texto también es un mensaje, y el aviso tiene que decir algo.
  v_resumen := coalesce(nullif(btrim(new.body), ''), '📷 Una foto');
  if length(v_resumen) > 140 then
    v_resumen := left(v_resumen, 139) || '…';
  end if;

  v_url := '/escapadas/' || new.trip_id || '/chat';

  for v_persona in
    select id from public.profiles where id <> new.author_id
  loop
    -- Lo que de verdad le falta por leer a esta persona, que es lo mismo
    -- que cuenta la pestaña del chat.
    select count(*) into v_cuantos
    from public.messages m
    left join public.message_reads r
      on r.trip_id = m.trip_id and r.profile_id = v_persona
    where m.trip_id = new.trip_id
      and m.author_id <> v_persona
      and (r.last_read_at is null or m.created_at > r.last_read_at);

    v_titulo := case
      when v_cuantos > 1 then v_cuantos || ' mensajes sin leer' || coalesce(' · ' || v_viaje, '')
      else coalesce(v_quien, 'Alguien') || ' ha escrito' || coalesce(' · ' || v_viaje, '')
    end;

    select id, created_at into v_aviso
    from public.notifications
    where profile_id = v_persona
      and trip_id = new.trip_id
      and kind = 'mensaje_chat'
      and read_at is null
    order by created_at desc
    limit 1;

    if found and v_aviso.created_at > now() - interval '10 minutes' then
      -- Conversación seguida: se actualiza el aviso que ya hay. Sin `insert`
      -- no hay webhook, y por tanto el móvil no vuelve a sonar. La fecha se
      -- deja como estaba a propósito: así la ventana de diez minutos cuenta
      -- desde el primer mensaje y una charla larga vuelve a sonar una vez.
      update public.notifications
         set title = v_titulo,
             body = coalesce(v_quien, 'Alguien') || ': ' || v_resumen,
             actor_id = new.author_id,
             url = v_url
       where id = v_aviso.id;
    else
      insert into public.notifications (profile_id, kind, trip_id, title, body, url, actor_id)
      values (
        v_persona, 'mensaje_chat', new.trip_id,
        v_titulo,
        case when v_cuantos > 1 then coalesce(v_quien, 'Alguien') || ': ' || v_resumen else v_resumen end,
        v_url, new.author_id
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists messages_avisa on public.messages;
create trigger messages_avisa
  after insert on public.messages
  for each row execute function public.avisa_mensaje_chat();

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
