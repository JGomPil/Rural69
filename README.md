# 🏡 Rural69

La central de mando de nuestras escapadas a casas rurales: propuestas de casas, votaciones,
lista de la compra compartida y la despensa con lo que sobró de la última vez.

Aplicación web privada, **mobile-first**, en español y **100 % gratuita de mantener**.

---

## 1. Arquitectura

| Capa | Tecnología | Por qué |
|---|---|---|
| Interfaz | React 19 + TypeScript + Vite | Rápido, tipado, sin servidor propio |
| Estilos | Tailwind CSS 4 (plugin de Vite) | Un solo archivo de tema, sin configuración extra |
| Iconos | Lucide React | Ligero y coherente |
| Navegación | React Router (`HashRouter`) | Funciona en GitHub Pages sin reescrituras de URL |
| Datos y autenticación | Supabase (PostgreSQL + Auth + Realtime + Storage) | Plan gratuito, datos compartidos y en tiempo real |
| Alojamiento | GitHub Pages + GitHub Actions | Gratis y despliegue automático |

**No hay backend propio.** El navegador habla directamente con Supabase usando la clave
pública (`anon`), y toda la seguridad vive en las políticas **RLS** de PostgreSQL.

> Se usan componentes propios en lugar de shadcn/ui: son unos pocos archivos en
> `src/components/ui`, sin dependencias añadidas y con la estética del proyecto.

### Estructura de carpetas

```
.github/workflows/deploy.yml   Despliegue automático a GitHub Pages
supabase/
  01_schema.sql                Tablas, índices y triggers
  02_rls.sql                   Seguridad (RLS), tiempo real y Storage
  03_seed.sql                  Lista maestra de la compra inicial (opcional)
src/
  lib/            supabase.ts, tipos, formato, cálculo de cantidades, export, subidas
  hooks/          useAuth, useGrupo, useConsulta (datos + tiempo real), useAvisos
  components/ui/  Boton, Campos, Modal, Varios (tarjetas, etiquetas, progreso…)
  components/layout/  AppShell (barra lateral + navegación inferior), Logo
  components/trip/    Pestañas de la escapada: resumen, casas, votación, compra, sobrantes
  pages/          Acceso, Panel, Escapadas, Escapada, ListaMaestra, Despensa, Historial, Ajustes
```

### Modelo de datos

```
profiles          Cuentas autorizadas (rol admin | user, vinculadas a un integrante)
households        Parejas / unidades familiares
members           Integrantes del grupo (adulto o niño, con factor de consumo)
trips             Escapadas (fechas, destino, estado, votación abierta, casa elegida)
trip_participants Quién viene a cada escapada
houses            Casas rurales candidatas de una escapada
house_photos      Fotos adicionales de cada casa
votes             Un voto por persona y escapada (restricción única)
master_items      Lista maestra reutilizable (cantidad + grupo de referencia)
shopping_items    Lista de cada escapada: necesaria / disponible / a comprar, comprado, encargado
pantry_items      Despensa compartida: sobrantes que pasan de una escapada a la siguiente
app_settings      Ajustes (factor de los niños, grupo de referencia)
```

Las tres cantidades de la compra se guardan por separado a propósito:

* `needed_qty` — **cantidad necesaria** para el grupo.
* `available_qty` — **cantidad disponible** en la despensa.
* `buy_qty` — **cantidad pendiente de comprar**, siempre editable a mano.

Nada se descuenta automáticamente: el botón **Despensa** de la lista propone los ajustes y
tú confirmas uno a uno.

---

## 2. Instalación en local

```bash
npm install
cp .env.example .env.local   # y rellena las dos variables
npm run dev
```

Scripts disponibles:

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos + construcción en `dist/` |
| `npm run preview` | Sirve `dist/` para probarlo |
| `npm run lint` | Linter (oxlint) |

---

## 3. Configuración de Supabase (una sola vez)

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto gratuito
   (región *West EU (Ireland)* o *Frankfurt* para ir fino desde España).
2. Ve a **SQL Editor → New query** y ejecuta, **en este orden**:
   1. `supabase/01_schema.sql`
   2. `supabase/02_rls.sql`
   3. `supabase/03_seed.sql` *(opcional: carga una lista maestra de ~75 productos)*
3. **Authentication → Providers → Email**: deja activado *Email*. Si quieres entrar con
   enlace mágico, activa también *Magic Link*. Para que nadie se registre por su cuenta,
   desactiva **Allow new users to sign up** *después* de crear las cuentas del grupo.
4. **Authentication → URL Configuration**:
   * *Site URL*: `https://<tu-usuario>.github.io/Rural69/`
   * *Redirect URLs*: añade `https://<tu-usuario>.github.io/Rural69/` y `http://localhost:5173/`
5. **Project Settings → API**: copia `Project URL` y la clave pública `anon`.

### Primer usuario = administrador

El primer perfil que se crea recibe automáticamente el rol `admin`. Así que **crea tu cuenta
primero** (desde la pestaña *Crear cuenta* de la app, o invitándote desde Supabase) y luego
invita al resto.

### Invitar al resto del grupo

**Authentication → Users → Add user → Send invitation** con su email. Cuando entren
aparecerán en *Ajustes → Usuarios con cuenta*, donde puedes vincularlos con su integrante
y darles rol de administrador si hace falta.

Para retirar el acceso a alguien, usa *Ajustes → Usuarios → Quitar acceso*: su perfil
desaparece y las políticas RLS dejan de devolverle datos.

### Fotos de las casas

Las fotos se pueden añadir de dos formas: pegando la URL de una imagen de la web de la casa
(no ocupa nada) o subiéndolas al bucket `fotos`, que `02_rls.sql` crea con lectura pública
y subida solo para integrantes. El plan gratuito de Supabase incluye 1 GB.

---

## 4. Variables de entorno

| Variable | Dónde se usa | Valor |
|---|---|---|
| `VITE_SUPABASE_URL` | local (`.env.local`) y GitHub Actions | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | local (`.env.local`) y GitHub Actions | Clave pública `anon` |
| `BASE_PATH` | solo en GitHub Actions (automático) | `/<nombre-del-repositorio>/` |

⚠️ **Nunca** pongas la clave `service_role` en el frontend ni en el repositorio. La clave
`anon` está pensada para ser pública: lo que protege los datos es RLS.

---

## 5. Despliegue en GitHub Pages

1. Crea el repositorio y sube el código:

   ```bash
   git remote add origin https://github.com/<tu-usuario>/Rural69.git
   git push -u origin main
   ```

2. **Settings → Secrets and variables → Actions → New repository secret**, dos secretos:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`

3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.

4. Cada `push` a `main` lanza `.github/workflows/deploy.yml`, que comprueba tipos, construye
   y publica. La app queda en `https://<tu-usuario>.github.io/Rural69/`.

Si cambias el nombre del repositorio no hay que tocar nada: el workflow calcula `BASE_PATH`
solo. En local el valor por defecto es `/Rural69/`, definido en `vite.config.ts`.

---

## 6. Mantenimiento

* **Copias de seguridad**: *Ajustes → Copia de seguridad* descarga un JSON con todo.
  Conviene hacerlo después de cada escapada. También puedes exportar a CSV la lista de la
  compra, la lista maestra, la despensa y el historial.
* **Imprimir la compra**: botón *Imprimir* en la lista (hay estilos de impresión propios).
* **Cambios en la base de datos**: añade un archivo nuevo `supabase/04_*.sql` en lugar de
  editar los anteriores, y ejecútalo en el SQL Editor. Los scripts son idempotentes
  (`create table if not exists`, `drop policy if exists`), así que se pueden volver a pasar.
* **Proyecto Supabase pausado**: el plan gratuito pausa proyectos sin actividad durante una
  semana. Se reactiva desde el panel en un clic; para evitarlo, entrad en la app de vez en
  cuando (o justo antes de empezar a organizar la escapada).
* **Dependencias**: `npm outdated` y `npm update`. El proyecto usa pocas a propósito.

### Mejorar la lista maestra con el tiempo

En *Lista maestra → Mejorar* se compara la lista real de una escapada con la maestra, se
normalizan las cantidades al grupo de referencia y se proponen cambios (ajustar cantidades,
añadir productos nuevos). Tú eliges qué se aplica. Así la lista va aprendiendo de cada viaje.

---

## 7. Permisos

| Acción | Administrador | Integrante |
|---|---|---|
| Crear / editar / borrar escapadas | ✅ | — |
| Gestionar integrantes y unidades familiares | ✅ | ver |
| Gestionar usuarios y roles | ✅ | — |
| Editar la lista maestra | ✅ | ver |
| Abrir y cerrar votaciones | ✅ | — |
| Marcar la casa elegida / reservada | ✅ | — |
| Apuntar quién viene a una escapada | ✅ | ✅ |
| Añadir y editar casas rurales | ✅ | ✅ |
| Votar (un voto, cambiable mientras esté abierta) | ✅ | ✅ |
| Modificar la lista de la compra y marcar comprados | ✅ | ✅ |
| Registrar sobrantes y gestionar la despensa | ✅ | ✅ |
| Consultar el historial y exportar datos | ✅ | ✅ |

Todo esto está aplicado en PostgreSQL con RLS (`supabase/02_rls.sql`), no solo escondido en
la interfaz.
