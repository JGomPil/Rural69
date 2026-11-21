-- =====================================================================
-- Rural69 · 20 · Reacciones en el chat
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- Once personas en un chat y alguien propone algo: once «vale» seguidos
-- que no dicen nada y que entierran la conversación. Un toque en el
-- mensaje dice lo mismo sin ocupar sitio.
--
-- Tres decisiones:
--
--   · La clave primaria es (mensaje, persona, emoji): cada cual puede
--     poner varias distintas, pero la misma una sola vez. Quitar es
--     borrar la fila, así que no hace falta `update`.
--   · No avisan. Un aviso por cada pulgar arriba sería exactamente el
--     ruido del que huíamos al poner el freno a los avisos del chat.
--   · El emoji se guarda como texto corto. Nada de una tabla de emojis
--     permitidos: el día que el grupo quiera otro, se cambia la lista
--     de la aplicación y ya está.
-- =====================================================================

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id)  on delete cascade,
  profile_id uuid not null references public.profiles (id)   on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id, emoji),
  constraint message_reactions_emoji_corto check (length(emoji) between 1 and 16)
);

comment on table public.message_reactions is
  'Un toque en un mensaje del chat. Quitar la reacción es borrar la fila.';

-- Lo que se consulta siempre: las reacciones de un mensaje.
create index if not exists message_reactions_mensaje_idx
  on public.message_reactions (message_id);

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.message_reactions enable row level security;

grant select, insert, delete on public.message_reactions to authenticated;

-- Las ve todo el grupo; cada cual pone y quita solo las suyas.
drop policy if exists message_reactions_select on public.message_reactions;
create policy message_reactions_select on public.message_reactions
  for select to authenticated using (public.is_member());

drop policy if exists message_reactions_insert on public.message_reactions;
create policy message_reactions_insert on public.message_reactions
  for insert to authenticated
  with check (public.is_member() and profile_id = auth.uid());

drop policy if exists message_reactions_delete on public.message_reactions;
create policy message_reactions_delete on public.message_reactions
  for delete to authenticated using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
-- Para que la reacción aparezca en el móvil del otro sin recargar. Si ya
-- estaba en la publicación, Postgres se queja y no pasa nada.
do $$
begin
  begin
    alter publication supabase_realtime add table public.message_reactions;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
