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
  08_fechas.sql                Votación de fechas (va antes que la de casas)
  09_cosas_a_recordar.sql      Suelto y opcional: mete en la compra lo que siempre
                               se olvida (albal, vasos, sal, aceite…)
  10_voto_multiple.sql         Votar varias casas o varios findes, no solo uno
  11_menus.sql                 Recetario del grupo y menús por días
  12_maestra_crece.sql         La lista maestra crece con el recetario
  13_equipaje.sql              Lo que lleva cada uno de su casa
  14_avisos_push.sql           A qué aparatos empujar los avisos
  15_recordatorios.sql         Recordatorio automático antes de la escapada (pg_cron)
  functions/avisar/            Edge Function que firma y manda el empujón (Web Push)
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
trip_participants Quién viene a cada escapada (sin fila = no ha contestado)
houses            Casas rurales candidatas de una escapada
house_photos      Fotos adicionales de cada casa
votes             Qué casas le valen a cada cual (voto por aprobación)
dishes            Recetario del grupo: un plato y para cuánta gente
dish_items        Los ingredientes de cada plato
trip_meal_dishes  Qué se cocina en cada comida de una escapada
trip_date_options Fines de semana candidatos de una escapada
date_votes        Qué findes le valen a cada cual
trip_meals        Comidas y cenas de una escapada
trip_packing      Lo que lleva cada uno de su casa (sacos, toallas, altavoz…)
master_items      Lista maestra reutilizable (cantidad + grupo de referencia)
shopping_items    Lista de cada escapada: necesaria / disponible / a comprar, comprado, encargado
pantry_items      Despensa compartida: sobrantes que pasan de una escapada a la siguiente
app_settings      Ajustes (factor de los niños, grupo de referencia)
notifications     Avisos: una fila por persona y aviso, con su marca de leído
push_subscriptions A qué aparatos empujar los avisos (endpoint + claves del navegador)
trip_reminders    Qué recordatorio automático se mandó ya, para no repetirlo
trip_photos       Las fotos del fin de semana (las de después, no las de la casa)
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
| `npm test` | Pruebas de la lógica (vitest, una tanda y fuera) |
| `npm run test:mirando` | Las mismas, repitiéndose al guardar |
| `npm run contraste` | Repasa el contraste de los dos temas (falla si alguno baja del mínimo) |

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
   8. `supabase/08_fechas.sql`

   9. `supabase/10_voto_multiple.sql`
   10. `supabase/11_menus.sql`
   11. `supabase/12_maestra_crece.sql`
   12. `supabase/13_equipaje.sql`
   13. `supabase/14_avisos_push.sql`
   14. `supabase/15_recordatorios.sql`
   15. `supabase/16_avisos_chat.sql`
   16. `supabase/17_quien_viene.sql`
   17. `supabase/18_fotos_escapada.sql`
   18. `supabase/19_datos_llegada.sql`
   19. `supabase/20_reacciones.sql`
   20. `supabase/21_no_molestar.sql`

   Todos se pueden volver a ejecutar sin miedo, y en cualquier orden: no borran ni
   duplican nada. Los que amplían la lista de tipos de aviso (el 15 y el 16) la leen
   antes y le suman el suyo, en vez de escribirla entera: si la escribieran entera,
   volver a pasar un archivo viejo borraría de la lista los tipos que añadió uno nuevo.

   El 15 programa el recordatorio de antes de la escapada con `pg_cron`. Si la extensión
   no está activada, el archivo se ejecuta igual y avisa al final: actívala en
   **Database → Extensions → pg_cron** y vuelve a pasarlo. La tarea se mira cada hora y
   solo manda cuando en España son las ocho de la mañana: `pg_cron` solo entiende UTC y
   aquí la hora cambia dos veces al año, así que la condición va en la tarea y el horario
   de verano se arregla solo. Y para que ese aviso llegue
   al móvil con la aplicación cerrada hace falta además la *Edge Function* `avisar` y su
   webhook, que están explicados en `supabase/functions/avisar/README.md`.

   El 21 añade las horas de silencio, y quien las mira es la *Edge Function* `avisar`:
   **después de pasarlo hay que volver a desplegar la función**, o seguirá avisando de
   madrugada.

   `09_cosas_a_recordar.sql` no es parte de la instalación: es un apaño suelto que mete en
   la compra de la escapada en marcha lo que siempre se olvida. Pásalo cuando te haga
   falta, las veces que quieras.
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

Lo que se sube se encoge antes de salir del teléfono (`src/lib/subidas.ts`): lado largo a
2000 px —512 para los avatares— y JPEG, respetando la orientación del EXIF. Una foto de
4 MB se queda en 400 KB, así que ese giro da para muchas escapadas, y subir diez fotos por
el 4G de un pueblo deja de ser una tarde. Si el navegador no sabe abrir el formato, se sube
la original tal cual.

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

* **Copias de seguridad**: *Ajustes → Copia de seguridad* descarga un JSON con las 23 tablas
  de contenido (la lista está en `src/lib/copia.ts`; **si añades una tabla al esquema,
  añádela ahí**). Quedan fuera a propósito las claves de los navegadores
  (`push_subscriptions`) y los avisos ya leídos. Las fotos no van dentro: van sus
  direcciones, los archivos están en Storage. Se baja lo que tus permisos te dejan leer, así
  que la copia completa la hace quien administra. La fecha de la última se guarda en el
  propio navegador, y a los 120 días el panel lo recuerda. También puedes exportar a CSV la
  lista de la compra, la lista maestra, la despensa y el historial.
* **Imprimir la compra**: botón *Imprimir* en la lista (hay estilos de impresión propios).
* **Cambios en la base de datos**: añade un archivo nuevo `supabase/04_*.sql` en lugar de
  editar los anteriores, y ejecútalo en el SQL Editor. Los scripts son idempotentes
  (`create table if not exists`, `drop policy if exists`), así que se pueden volver a pasar.
* **Proyecto Supabase pausado**: el plan gratuito pausa los proyectos que pasan una semana
  sin **actividad de base de datos**, y reactivarlo solo lo puede hacer quien administra el
  proyecto. Dos cosas lo evitan solas: el trabajo horario de `pg_cron` (el de los
  recordatorios), que ejecuta una consulta cada hora, y el latido semanal de
  `.github/workflows/despierta.yml`, que hace una consulta de verdad por PostgREST los lunes
  —un «ping» a un endpoint de salud no llega a Postgres y puede no contar—. Ojo con una
  trampa de GitHub: en un repositorio público, las tareas programadas se desactivan tras 60
  días sin actividad en el repositorio (avisa por correo), y se reactivan desde la pestaña
  *Actions* o con `gh workflow enable despierta.yml`.
* **Dependencias**: `npm outdated` y `npm update`. El proyecto usa pocas a propósito.


## 7. Permisos

| Acción | Administrador | Integrante |
|---|---|---|
| Crear / editar / borrar escapadas | ✅ | — |
| Gestionar integrantes y unidades familiares | ✅ | ver |
| Gestionar usuarios y roles | ✅ | — |
| Editar la lista maestra | ✅ | ver |
| Abrir y cerrar votaciones (fechas y casas) | ✅ | — |
| Proponer fechas candidatas y votarlas | ✅ | ✅ |
| Apuntar platos en el recetario y poner menús | ✅ | ✅ |
| Fijar las fechas elegidas | ✅ | — |
| Marcar la casa elegida / reservada | ✅ | — |
| Apuntar quién viene a una escapada | ✅ | ✅ |
| Añadir y editar casas rurales | ✅ | ✅ |
| Votar todas las que le valgan, y quitarlas | ✅ | ✅ |
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

### Reglas de presentación

El color y la tipografía siguen reglas comprobables, no gusto. Si tocas estilos, respétalas:

* **Texto apagado con colores, no con opacidad.** Había doce niveles de `text-carbon/NN`
  y con opacidad era imposible llegar al 4,5:1 que pide [WCAG 1.4.3][wcag143]: para que el
  55 % cumpliera, `carbon` tendría que ser casi negro. Ahora hay dos tokens, `--color-tenue`
  (secundario) y `--color-suave` (rótulos y metadatos), calculados contra el más desfavorable
  de los fondos de cada tema, así que cumplen sobre los tres. La jerarquía se hace con tamaño
  y grosor, no bajando el contraste.
* **El borde de los campos no es adorno.** En una tarjeta blanca es lo único que dice dónde
  empieza el campo, y [WCAG 1.4.11][wcag1411] le pide 3:1: de ahí `--color-borde-campo`, que
  usan los campos, las casillas y el carril del interruptor. `arena` se queda para separadores
  y bordes de tarjeta, que sí son decorativos.
* **Lo que lleva texto encima tiene que poder leerse.** El acento pasó de `tierra-500` a
  `tierra-600` porque el blanco sobre el 500 se quedaba en 3,35:1.
* **Interlineado al revés que el interletrado:** cuanto más grande el texto, más junto
  (1,15 en `h1`, 1,5 en el cuerpo), para que un titular de dos líneas se lea como un bloque.
* **Medida de lectura:** la utilidad `.medida` (65ch) en los textos corridos. Pasados unos
  75 caracteres por línea, el ojo pierde el renglón al volver.
* **Cifras de ancho fijo** (`.cifras`, y por defecto en las tablas): en una columna de
  cantidades las cifras proporcionales bailan de una fila a otra.
* **Los objetivos táctiles** están en 36 px, por encima de los 24 px de
  [WCAG 2.5.8][wcag258].

Hay un medidor de contraste en `scripts/contraste.mjs`: `node scripts/contraste.mjs` repasa
los 26 pares de color de los dos temas y falla si alguno baja del mínimo.

[wcag143]: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
[wcag1411]: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast
[wcag258]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

### Avisos

Hay dos cosas distintas, y conviene no confundirlas:

1. **El buzón de la campana** (arriba a la derecha). Funciona siempre y en cualquier
   navegador. Los avisos están en Supabase y llegan en tiempo real: alguien propone una casa,
   se abre o se cierra una votación, ya hay casa elegida.
2. **El aviso del sistema**, el que suena. Se autoriza aparato por aparato desde
   *Mi perfil → Avisos*, y suena **también con Rural69 cerrada del todo**: el aparato queda
   apuntado en `push_subscriptions` y el servidor le empuja el aviso (Web Push con claves
   VAPID). En iPhone, para eso hay que tener la aplicación instalada en la pantalla de inicio.

Los avisos los crean **disparadores de la base de datos**
(`supabase/07_notificaciones.sql`), no el navegador. Es a propósito: si los creara el móvil de
quien propone la casa, bastaría con cerrar la pestaña a medias para que la mitad del grupo no
se enterase. Así, o se guarda la casa y se avisa, o no pasa ninguna de las dos cosas. En la
tabla `notifications` hay una fila por persona, de modo que cada cual marca como leído lo suyo
sin tocar lo de los demás; nadie puede insertar avisos desde el navegador (no hay política de
`insert`) y los de más de 90 días se borran solos.

**Con la aplicación cerrada** el camino es más largo, y sigue sin haber servidor propio:
al insertarse el aviso, un *Database Webhook* llama a la *Edge Function* `avisar`, que firma
el mensaje con las claves VAPID y lo entrega al servicio de empuje del navegador; el service
worker lo recibe y lo muestra. La clave privada vive **solo** en los secretos de la función
—este repositorio es público—, y las suscripciones que el servicio de empuje da por muertas
(404 o 410) se borran solas. El paso a paso está en `supabase/functions/avisar/README.md`.

Y hay un aviso que **no lo provoca nadie**: el recordatorio de los días antes de la escapada.
Lo manda una tarea diaria de `pg_cron` (`supabase/15_recordatorios.sql`) a tres días y otra
vez la víspera, y dice lo que queda por hacer —cuántas cosas del equipaje no lleva nadie,
cuántos productos faltan por comprar—. Como lo crea con la misma función `notificar()`, viaja
por el mismo camino que los demás y acaba en el móvil sin nada más que montar. La tabla
`trip_reminders` es la que impide que se repita cada mañana.

---

## 9. Primero las fechas, después la casa

El orden no es un detalle: el grupo **vota primero el fin de semana** y solo entonces busca
casas, porque la disponibilidad de una casa rural depende de la fecha. La aplicación sigue ese
orden, y de ahí que la pestaña **Fechas** vaya antes que **Casas**.

Es a propósito un calco de la votación de casas: cualquiera propone fines de semana, cada
persona vota todos los que le valgan, un administrador abre y cierra la votación y marca
las ganadoras. Lo único distinto es el final: **al fijar unas fechas se copian en la escapada**
(`trips.start_date` y `trips.end_date`), que es de donde las lee todo lo demás —la cuenta
atrás, los tiempos de la compra, el historial—, así que no hay dos verdades sobre cuándo es la
escapada. En `trips.chosen_date_option_id` queda cuál de las candidatas ganó.

Mientras no haya fechas, la pestaña *Casas* lo recuerda con un enlace para ir a votarlas:
buscar casa sin saber el finde suele ser trabajo doble.

Crear la escapada no obliga a nada de esto: **solo el nombre es obligatorio**. Sin fechas, la
aplicación muestra «Fechas por decidir» y los tiempos de la compra avisan de que todavía no se
pueden generar a partir de los días.

---

## 10. Votar varias, no solo una

Las votaciones son **por aprobación**: cada cual marca *todas* las casas o todos los
findes que le valen, incluso todos, y gana lo que le vale a más gente. No se elige una y
ya está.

Es a propósito. Con un solo voto por persona, once personas repartidas entre cuatro
findes dan un ganador con tres votos que a ocho no les viene bien. Marcando todo lo que
cuadra sale el que menos gente deja fuera, que es la decisión que de verdad buscáis
—sobre todo en las fechas, donde lo que importa no es cuál prefieres sino cuáles puedes.

Por eso los porcentajes se miden sobre **la gente que ha votado**, no sobre el número de
votos: «a 8 de 11 les vale esta» dice algo, «esta se lleva el 22 % de los votos» no dice
nada cuando cada cual emite los que quiere.

Lo impone la base de datos: `unique (trip_id, voter_id, house_id)` y
`unique (trip_id, voter_id, option_id)`. Puedes votar cuantas quieras, pero no la misma
dos veces.

---

## 11. Menús por días

Entre «cena del sábado» y «comprar dos kilos de arroz» faltaba una pieza. Los tiempos de
la escapada dicen **cuándo** se come y la lista de la compra dice **qué** se compra, pero
el salto de uno a otro lo hacía alguien de cabeza, cada vez.

El **recetario** (`/recetario`) es un cuaderno de cocina del grupo, aparte de las
escapadas igual que la lista maestra, porque la paella es la misma todos los años. Cada
plato lleva sus ingredientes y para cuánta gente son esas cantidades. Lo escribe
cualquiera del grupo, no solo un administrador: pedir permiso para apuntar una receta no
tiene sentido. Borrar, en cambio, solo quien la apuntó o un administrador.

La pestaña **Menú** de la escapada muestra los días con sus comidas y cenas, y en cada
una se eligen platos del recetario —más de uno si hace falta—. Desde ahí, un botón pasa
los ingredientes a la compra: se escalan al grupo que va con `escalaCantidad`, quedan
apuntados a su comida y llevan el nombre del plato en las notas, para que se sepa de
dónde salió cada cosa.

Volver a pasarlo **no pisa lo que ya hayas retocado a mano**: compara por comida y
nombre, y solo añade lo que falte. Como todo en esta aplicación, las cantidades son una
propuesta, no una orden.

Si el recetario está vacío, `11_menus.sql` deja cuatro platos para empezar —paella,
lentejas, barbacoa y tortilla—, y no hace nada si ya has apuntado los tuyos.

---

## 12. Que se note que hay once personas

Las cinco cosas de esta tanda son todas la misma idea: la aplicación ya guardaba bien los
datos, pero callaba lo único que de verdad importa al abrirla —**qué toca hacer ahora**— y
estorbaba justo donde más prisa hay.

**Qué falta por hacer, en el panel.** Antes el panel saludaba y enseñaba cuentas: tres casas
propuestas, dos personas han votado. Con eso no sabes si te toca algo. Ahora lo primero que se
lee es la tarea, con su enlace: «te falta votar las fechas», «nadie ha propuesto casa
todavía», «faltáis 6 por votar». Las reglas están en `src/lib/pendientes.ts`, aparte de la
pantalla porque son muchos casos. Dos decisiones dentro: **lo tuyo va primero y marcado**,
que es lo único que puedes resolver sin esperar a nadie, y **no se avisa de lo que todavía no
toca** —nada de «nadie ha propuesto casa» antes de tener fechas, que buscar casa sin finde es
trabajo doble—.

**El recordatorio de antes de la escapada** (sección 8). El aviso que más falta hace es
justamente el que nadie provoca.

**Votar donde se mira.** El aviso de «alguien ha propuesto una casa» te dejaba en la pestaña
*Casas*, con las fotos y el precio; para decir que te valía había que cambiar a *Votación* y
buscar la misma casa en otra lista. Ahora cada tarjeta lleva su **«Me vale»**, y *Votación*
se queda para lo que sirve: ver cómo va la cosa.

**Modo «estoy comprando».** La lista normal está pensada para el sofá —cantidades, tiempos,
quién se encarga, editar, duplicar— y en el pasillo del súper todo eso estorba. El botón
*Estoy comprando* abre la misma lista a pantalla completa: por categorías (que es como se
recorre un supermercado, no por comidas), **toda la fila es el botón** y mide lo que mide un
dedo, lo marcado desaparece y se va a «ya en el carro», donde se puede devolver —equivocarse
de toque pasa, y pasa con la mano llena—, y la pantalla no se apaga mientras dure, si el
navegador deja.

**Buscar en el chat y en el recetario.** Hoy son cuatro mensajes y ocho platos; a la tercera
escapada, «lo que dijo alguien de la hora de llegada» está enterrado. El chat busca y lleva al
mensaje, que se queda un momento resaltado para que se sepa cuál era. El recetario busca
también **por ingrediente** —«¿en qué platos entra el pimentón?» es justo lo que se le
pregunta a un recetario— y dice por qué sale cada plato, que si no parecería un error.

---

## 13. Que la aplicación sirva también estando allí

La tanda anterior arregló lo de antes de ir. Esta va de lo otro: que el fin de semana se
pueda usar, y que no haga falta que nadie vaya detrás de nadie.

**El chat avisa, pero no machaca.** Escribir en el chat no le llegaba a nadie; la insignia
solo se veía si ya estabas dentro, que es justo cuando no hace falta. Ahora avisa como lo
demás, con un freno pensado para una conversación: si ya hay un aviso de chat de esa
escapada sin leer y es de hace menos de diez minutos, se **actualiza** en vez de crear otro.
Actualizar no dispara el webhook, así que no vibra: una charla de veinte mensajes vibra una
vez y el aviso va diciendo «8 mensajes sin leer». La cuenta sale de `message_reads`, la misma
que la insignia de la pestaña, para que no digan cosas distintas.

**Los findes que vienen.** Proponer un fin de semana eran dos fechas escritas a mano en un
móvil. Los diez viernes siguientes salen ya calculados: un toque y queda propuesto, y el que
ya está sale marcado en vez de dejar proponerlo otra vez. Un puente o unas fechas sueltas
siguen teniendo «Proponer fechas», que para eso está.

**Que cada uno diga si viene.** Esta es de fondo, no de pantalla. La lista de quién va la
llevaba el administrador a mano, así que las cantidades de la compra salían de una lista que
no tenía por qué parecerse a quién iba de verdad. Ahora cada uno contesta por sí y por los
suyos —pareja y niños— desde el resumen, y hay **tres estados**: viene, no puede, y no ha
contestado. El tercero es el que importa: sin él no se puede decir «faltan 3 por contestar»,
que es lo que el panel necesita para no tener que preguntarlo por el chat. El administrador
sigue pudiendo tocar la lista entera en el formulario de la escapada.

**Las fotos del fin de semana.** Las que había eran las de la casa candidata, que sirven para
decidir y se quedan en *Casas*. Estas son las de después: pestaña propia, varias de golpe,
pie de foto y un visor a pantalla completa con flechas. Si una se atraganta, las demás
siguen subiendo y se dice cuál falló.

### Sin cobertura

Lo que más se notaba, y lo más caro de hacer. En una casa rural no hay línea, y la compra, el
menú, el equipaje y las recetas son justo lo que se mira allí. La aplicación abría —el
service worker guarda el armazón desde el principio— pero no traía un solo dato: todas las
pantallas decían «sin conexión con el servidor».

Tres piezas, y la regla que las ordena: **lo guardado es una copia, nunca una verdad**. En
cuanto hay red se pide lo de verdad y la copia se tira. Nada se decide a partir de ella.

* `src/lib/almacen.ts` guarda en el aparato la respuesta de cada consulta marcada con
  `copia` —el grupo, la escapada, la compra, el menú, el equipaje, el chat, el recetario—.
  Se lee antes del primer pintado, así que la pantalla sale llena y sin saltos. Si el
  navegador no deja guardar, todo sigue funcionando: solo que sin copia.
* `src/lib/cola.ts` apunta lo que se hace allí y no se puede perder: marcar comprado,
  cambiar una cantidad, decir quién lleva una cosa. Los encargos se **funden por fila**, así
  que marcar y desmarcar cinco veces manda una sola cosa. Crear y borrar no se encolan a
  propósito: obligarían a inventar identificadores y a fingir filas que no existen. Si el
  servidor rechaza un encargo —una fila que ya no está, un permiso—, se tira: dejarlo
  atascaría a todos los que vengan detrás.
* La tira de arriba distingue las dos cosas que importan: si hay red y si queda algo por
  mandar.

Y dos pantallas absurdas que salían sin cobertura, las dos arregladas con el perfil guardado:
«tu cuenta aún no está autorizada» —fallaba la consulta del perfil y parecía que no había
fila— y la de entrar, cuando además el testigo de sesión había caducado y Supabase no podía
renovarlo. Ninguna de las dos tiene arreglo en mitad del monte, que es justo donde salían.

Probado de punta a punta con el móvil emulado: sin red la aplicación abre entera, se marca un
producto, la tira dice «1 cambio guardado aquí», y al volver la línea se manda solo y queda
en el servidor.


---

## 14. Que aguante el fin de semana de verdad

La tanda anterior consiguió que la aplicación se pudiera abrir allí. Esta va de lo que
pasaba en cuanto se usaba de verdad: nueve cosas, y la primera no era una mejora sino un
fallo que nadie había tocado todavía porque la pestaña de *Fotos* acababa de nacer.

**Las fotos del móvil no caben.** El tope de subida eran 5 MB y no se comprimía nada; una
foto de un móvil de hoy pesa entre 3 y 6. El primero que subiera las del fin de semana se
comía un «prueba con una más ligera» imposible de cumplir desde el carrete, y las que
entraran se llevaban el giga gratis de Storage en dos escapadas. Ahora se encogen en el
teléfono antes de salir: 2000 px de lado largo y JPEG, con la orientación del EXIF puesta
—que si no, las verticales se suben tumbadas—. De 4 MB a 400 KB sin que se note en una
pantalla.

**Lo que hace falta al llegar.** De una casa se guardaba todo lo que sirve para decidirla
y nada de lo que sirve para ir. La dirección exacta, la hora de entrada, el teléfono del
dueño, la clave del portón, el wifi y el desvío sin señalizar viven en el correo de quien
reservó, y el correo en el monte no se abre. Diez columnas nuevas en `houses`, una sección
plegada en la ficha de la casa —al proponer una candidata todavía no se sabe nada de esto—
y una tarjeta en el *Resumen* con el mapa, el teléfono de un toque y las claves con botón
de copiar. Como el *Resumen* guarda copia local, es lo único que sigue estando ahí sin
cobertura.

**El panel cambia de cara.** Los tres días que importan, la aplicación seguía pidiendo
votar las fechas. Mientras hoy cae dentro del rango, el panel abre con lo del día: qué se
come hoy con sus platos y quién se encarga, qué hay mañana por si toca descongelar algo,
qué falta por comprar, un atajo para subir las fotos y debajo las claves de la casa. El
cálculo de en qué momento estamos vive aparte, en `src/lib/estancia.ts`, porque es
aritmética de fechas y así se puede probar.

**La siguiente parte de la anterior.** La compra ya se reutilizaba sola —para eso está la
maestra—, pero el menú y el equipaje había que montarlos de cero cada vez, y el año que
viene habrá otra vez cena del viernes y el proyector lo llevará el mismo. Al crear una
escapada viene elegida la anterior, con el menú y el equipaje marcados, a la vista antes
de pulsar *Crear*. Los días se **desplazan** en vez de copiarse, así que la cena del
viernes cae en el viernes nuevo; si alguna de las dos no tiene fechas, los tiempos se
quedan sin día. Nada llega tachado ni comprado.

**Que el proyecto no se duerma, y que la copia sirva.** Supabase pausa los proyectos
gratuitos que pasan una semana sin actividad de base de datos, y reactivarlo solo puede
hacerlo quien administra: entre escapadas pasan meses. Un latido semanal en Actions hace
una consulta de verdad —un «ping» a un endpoint de salud no llega a Postgres y puede no
contar— y el `pg_cron` horario de los recordatorios ya cuenta por su cuenta. Y la copia de
seguridad, que existía, se bajaba 12 tablas de 23: faltaban los menús, el recetario, el
equipaje, las fotos y el chat, o sea tres años de recetario en una copia en la que se
confía. Ahora la lista vive en `src/lib/copia.ts` con el aviso de mantenerla al día, dice
cuántas filas se trae, y a los 120 días el panel se lo recuerda a quien administra.

**Pruebas de lo que calcula.** No había ninguna, y lo que se rompe en silencio no son las
pantallas —una pantalla rota se ve— sino la aritmética. 84 pruebas sobre los módulos que
calculan, dos décimas, y van en el despliegue antes de construir. Varias están ahí por
cosas que ya darían guerra: que `hoyISO` dé el día en hora de España y no en UTC, que
desplazar los días de una escapada sobreviva al cambio de hora de marzo, y que `limpia()`
se lleve las copias pero no la cola de cambios sin cobertura. Sin jsdom: 30 líneas de
`src/pruebas/entorno.ts` hacen de navegador.

### Y las tres que había descartado

**Reacciones en el chat.** Once personas y alguien propone algo: once «vale» seguidos que
entierran la conversación. La clave primaria es (mensaje, persona, emoji), quitar es borrar
la fila, y **no avisan** a nadie: un aviso por cada pulgar arriba sería justo el ruido que
se le quitó al chat con el freno de los avisos. Nada depende de pasar el ratón por encima,
que en un móvil no hay ratón.

**No molestar de noche.** Un móvil vibrando en la mesilla porque un amigo ha propuesto una
casa es la forma más rápida de que medio grupo apague los avisos para siempre, y entonces
los recordatorios tampoco llegan. Encendido de serie de 23:00 a 8:00 hora de España, y
cada cual se lo cambia en su perfil. Se silencia el empujón, no el aviso: la fila se crea
igual y por la mañana está en la campana. Decide la función `avisar`, que es la que firma
los envíos, y la regla está escrita dos veces porque Deno no puede importar del navegador
—las dos copias se señalan la una a la otra—.

**El número en el icono.** La campana de dentro solo se ve si ya has abierto la
aplicación. El icono instalado lleva ahora el circulito con la cuenta de avisos sin leer:
lo pone la aplicación cada vez que esa cuenta cambia, y el service worker al llegar un
empujón con la aplicación cerrada, con el número que le manda la función dentro del aviso
(un service worker no habla con la base de datos). En una pestaña normal no existe, y eso
no es un error: falla en silencio.

---

## 15. Los juegos de la casa

Una sección para las noches de allí, cuando ya se ha cenado. Empieza con uno y está
hecha para que quepan más.

**Furor.** Es la prueba «Tienes la palabra» del concurso de Antena 3: sale una palabra,
los dos equipos cantan por turnos una canción que la diga, y el que se queda en blanco o
repite canción le da un **minipunto** al contrario; a los tres minipuntos, un punto.
Nadie abre dos palabras seguidas —después de cada fallo arranca el otro equipo—, y quién
empieza la primera se echa a suertes, que es lo que marca toda la partida.

**Manda el moderador.** Quien empieza la partida lleva el mando: el cronómetro y el
marcador son suyos, puede subir o bajar puntos cuando le parezca —como hacía Caparrós— y
la partida acaba cuando él dice. No hay meta ni ganador automático. Los demás ven en su
móvil la palabra, el turno, la cuenta atrás y el marcador, y **no tienen botones**. Eso no
es decoración: lo imponen los permisos de `game_sessions`, que rechazan el cambio de
cualquiera que no sea el moderador (o un administrador, por si se queda sin batería). El
mando se puede pasar a otro en marcha.

Decisiones que no se ven:

- **La partida está en la mesa, no en un móvil.** Es una fila en `game_sessions`: el
  moderador la escribe y a los demás les llega por tiempo real. Tres detalles que costaron
  más que el resto:
  - **El eco.** Lo que escribe el moderador le vuelve un instante después; si se lo
    creyera, su pantalla daría un saltito en cada toque. Se ignora lo que viene firmado
    por uno mismo.
  - **El desfase de relojes.** La cuenta atrás viaja como un instante («esto se acaba a
    las 23:04:11»), no como «quedan 30 segundos», porque dos móviles no tienen la misma
    hora. Al recibir la partida se mide la diferencia y cada pantalla corrige la suya.
  - **Sin línea se juega igual.** Si no hay cobertura —o si todavía no se ha pasado el
    SQL— la partida se queda en este aparato y lo dice; nadie se queda a medias.
- **El timbre tiene que oírse desde la cocina.** Al acabarse el tiempo suenan tres
  repiques de dos tonos con onda cuadrada, casi dos segundos, en **todos** los móviles a
  la vez. Hay un botón para probarlo antes de empezar, porque en iPhone el interruptor del
  lateral lo calla y el sonido no arranca hasta que alguien toca la pantalla.
- **Las reglas, aparte de la pantalla.** `src/lib/juegos/furor.ts` son funciones puras
  que reciben una partida y devuelven otra, con el azar inyectado. Por eso se pueden
  probar las 23 pruebas sin cronómetro ni navegador, que es justo lo que no se puede
  comprobar a mano con once personas cantando.
- **El reloj mira la hora, no cuenta vueltas.** Compara con la hora de fin en vez de
  restar en cada `setInterval`, porque el navegador adormece los temporizadores y si no
  el tiempo se estiraría a favor de quien está cantando.
- **La partida sobrevive al bloqueo del móvil.** El moderador la guarda también en su
  aparato. Si se perdiera el marcador al desbloquear, el juego no se usaría una segunda vez.
- **La pantalla no se apaga** mientras corre el reloj, y los últimos tres segundos avisan
  con un tic. Envuelto en `try`: si el navegador no deja, se juega igual.
- **179 palabras** elegidas con un criterio: que a cualquiera se le ocurran tres
  canciones sin pensar. No repiten hasta que se acaban todas.

De momento el enlace está siempre en el menú para poder probarlo. Cuando esté rodado,
saldrá solo durante la escapada, igual que el panel.
