-- =====================================================================
-- Rural69 · 25 · Las preguntas del Trivial que añadimos nosotros
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor). Se puede repetir sin
-- miedo: no borra ni duplica nada.
--
-- El Trivial viene con 1.523 preguntas dentro de la propia aplicación
-- —las de `trivialrural`, incluidas las 199 de «Nosotros»— y esas no
-- hacen falta en la base de datos: no cambian nunca, pesan 184 KB y
-- metidas aquí solo darían viajes de red para leer siempre lo mismo.
--
-- Esta tabla es para las que se añaden desde el móvil, que es otra
-- cosa: nacen en mitad del finde, las escribe alguien concreto y hay
-- que poder borrarlas si salen mal. Al jugar, la baraja son las dos
-- juntas.
--
-- Sin esta tabla el juego funciona igual, solo que no se pueden añadir
-- preguntas nuevas.
-- =====================================================================

create table if not exists public.trivia_questions (
  id         uuid primary key default gen_random_uuid(),
  category   text not null check (category in
               ('cultura', 'nosotros', 'animacion', 'entretenimiento', 'gastronomia')),
  question   text not null check (length(btrim(question)) between 5 and 300),
  correct    text not null check (length(btrim(correct)) between 1 and 120),
  wrong      text[] not null check (array_length(wrong, 1) between 1 and 3),
  author_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.trivia_questions is
  'Preguntas del Trivial escritas desde la aplicación. Las 1.523 de serie van en el código.';
comment on column public.trivia_questions.wrong is
  'Las respuestas falsas, de una a tres. La buena va aparte para no confiar en el orden.';

create index if not exists trivia_questions_category_idx
  on public.trivia_questions (category);

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.trivia_questions enable row level security;

grant select, insert, update, delete on public.trivia_questions to authenticated;

-- Las preguntas son de la casa: las lee todo el grupo.
drop policy if exists trivia_questions_select on public.trivia_questions;
create policy trivia_questions_select on public.trivia_questions
  for select to authenticated
  using (public.is_member());

-- Escribe cualquiera del grupo, firmando con su nombre.
drop policy if exists trivia_questions_insert on public.trivia_questions;
create policy trivia_questions_insert on public.trivia_questions
  for insert to authenticated
  with check (public.is_member() and author_id = auth.uid());

-- Arreglarla o borrarla, el que la escribió. Y un administrador, para
-- la que se cuele con la respuesta cambiada y nadie se atreva a tocar.
drop policy if exists trivia_questions_update on public.trivia_questions;
create policy trivia_questions_update on public.trivia_questions
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (public.is_member());

drop policy if exists trivia_questions_delete on public.trivia_questions;
create policy trivia_questions_delete on public.trivia_questions
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

notify pgrst, 'reload schema';
