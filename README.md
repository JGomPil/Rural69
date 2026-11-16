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
  04_fotos.sql                 Fotos de perfil y de integrante
  05_chat.sql                  Chat de la escapada y marcas de lectura
  06_tiempos.sql               Comidas y cenas de la escapada
  07_notificaciones.sql        Avisos del grupo (disparadores que los crean)
src/
  lib/            supabase.ts, tipos, formato, cálculo de cantidades, export, subidas
  hooks/          useAuth, useGrupo, useConsulta (datos + tiempo real), useAvisos,
                  useTema (claro / oscuro), useNotificaciones (avisos del grupo)
  components/ui/  Boton, Campos, Modal, Varios (tarjetas, etiquetas, progreso…)
  components/layout/  AppShell (barra lateral + navegación inferior), Logo, Avisos
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
notifications     Avisos: una fila por persona y aviso, con su marca de leído
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
   4. `supabase/04_fotos.sql`
   5. `supabase/05_chat.sql`
   6. `supabase/06_tiempos.sql`
   7. `supabase/07_notificaciones.sql`

   Los siete se pueden volver a ejecutar sin miedo: no borran ni duplican nada.
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

---

## 8. Aspecto y avisos

### Claro y oscuro

En *Mi perfil → Aspecto*: **claro**, **oscuro** o **automático** (lo que diga el móvil o el
ordenador). Se guarda en el navegador, no en Supabase: es una preferencia de cada aparato, y
así se aplica también en la pantalla de acceso y sin esperar a la red.

No hay un segundo juego de estilos. Los componentes usan siempre los mismos nombres de color
y lo que cambia son los valores: `src/index.css` vuelve a declarar los tokens dentro de
`:root[data-tema='oscuro']`. Las escalas de verde, oliva y tierra se dan la vuelta por los
extremos (lo que era fondo claro pasa a ser fondo oscuro, y lo que era texto oscuro pasa a ser
texto claro), el centro se queda siendo el color de los botones y lo que se lee encima de un
relleno fuerte pasa de blanco a `--color-tinta-fuerte`, que en oscuro es casi negro.

Tres detalles que conviene no romper al tocar estilos:

* `--color-velo` **no** cambia con el tema: es el que oscurece fotos y diálogos, y debajo hay
  una imagen, no el fondo de la página. Lo mismo vale para el degradado de la cabecera del
  panel, con verdes fijos: encima va el título en blanco de verdad.
* Al imprimir se vuelve a papel blanco y tinta oscura aunque la aplicación esté en oscuro,
  para que el súper no se lleve una hoja negra.
* El tema se escribe en `<html data-tema>` desde un script de `index.html`, antes del primer
  pintado. Si eso se quitara, al abrir la app en oscuro se vería un fogonazo blanco.

### Avisos

Hay dos cosas distintas, y conviene no confundirlas:

1. **El buzón de la campana** (arriba a la derecha). Funciona siempre y en cualquier
   navegador. Los avisos están en Supabase y llegan en tiempo real: alguien propone una casa,
   se abre o se cierra una votación, ya hay casa elegida.
2. **El aviso del sistema**, el que suena. Se autoriza aparato por aparato desde
   *Mi perfil → Avisos*, y solo puede sonar **mientras Rural69 está abierta**, aunque sea de
   fondo o con la pantalla apagada.

Los avisos los crean **disparadores de la base de datos**
(`supabase/07_notificaciones.sql`), no el navegador. Es a propósito: si los creara el móvil de
quien propone la casa, bastaría con cerrar la pestaña a medias para que la mitad del grupo no
se enterase. Así, o se guarda la casa y se avisa, o no pasa ninguna de las dos cosas. En la
tabla `notifications` hay una fila por persona, de modo que cada cual marca como leído lo suyo
sin tocar lo de los demás; nadie puede insertar avisos desde el navegador (no hay política de
`insert`) y los de más de 90 días se borran solos.

**Con la aplicación cerrada del todo no puede sonar**: para eso hace falta un servidor que
empuje los mensajes (Web Push con claves VAPID), y Rural69 no tiene servidor propio a
propósito, que es lo que la hace gratis de mantener. Si algún día se quiere, el camino es una
*Edge Function* de Supabase y una tabla de suscripciones; en iPhone, además, solo funciona con
la aplicación instalada en la pantalla de inicio.
