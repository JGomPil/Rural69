-- =====================================================================
-- Rural69 · 04 · Fotos de perfil y de integrante
-- ---------------------------------------------------------------------
-- Ejecútalo una sola vez en Supabase (SQL Editor) si ya tenías la base
-- de datos creada con 01_schema.sql. En instalaciones nuevas no hace
-- falta: las columnas ya vienen en 01_schema.sql.
--
-- Se puede volver a ejecutar sin miedo: no borra ni cambia nada.
--
--   · profiles.avatar_url → la foto que cada cual se pone en su perfil.
--   · members.avatar_url  → la foto de cada integrante del grupo,
--                           incluidos los niños, que no tienen cuenta
--                           y a quienes gestiona un administrador.
--
-- Las imágenes van al bucket público `fotos` que ya crea 02_rls.sql,
-- en la carpeta `avatares/`, así que no hacen falta permisos nuevos.
-- =====================================================================

alter table public.profiles add column if not exists avatar_url text;
alter table public.members  add column if not exists avatar_url text;

-- PostgREST se guarda en memoria cómo es la base de datos. Al añadir tablas o
-- columnas hay que avisarle, o seguirá diciendo que no existen.
notify pgrst, 'reload schema';
