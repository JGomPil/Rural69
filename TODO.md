# Seguimiento del desarrollo · Rural69

Estado: **todas las fases implementadas y funcionando contra Supabase.**
Lo que queda son mejoras opcionales, no funcionalidades pendientes.

## Fase 19 · Que se note que hay once personas ✅

- [x] **Qué falta por hacer** en el panel: la tarea con su enlace, en vez de cuentas
      (`src/lib/pendientes.ts` + `QueFalta.tsx`). Lo tuyo primero y marcado
- [x] No se avisa de lo que todavía no toca: nada de «nadie ha propuesto casa»
      sin fechas decididas
- [x] **Recordatorio automático** a tres días y la víspera (`15_recordatorios.sql`):
      tarea diaria de `pg_cron` que avisa de lo que queda por hacer. Viaja por el
      mismo camino que los demás avisos, así que llega al móvil sin montar nada más
- [x] `trip_reminders` impide que se repita cada mañana
- [x] **Votar donde se mira**: «Me vale» en cada tarjeta de casa. El aviso te deja
      en Casas y antes había que cambiar de pestaña y buscarla otra vez
- [x] **Modo «estoy comprando»**: la lista a pantalla completa, por categorías, toda
      la fila es el botón, lo marcado se va a «ya en el carro» y se puede devolver.
      La pantalla no se apaga mientras dure
- [x] **Buscar en el chat**, con salto al mensaje y un resaltado para saber cuál era
- [x] **Buscar en el recetario**, también por ingrediente, y diciendo por qué sale
      cada plato
- [x] El README decía que con la aplicación cerrada no podía sonar, que dejó de ser
      verdad en la fase 18

## Fase 18 · Que suene el móvil con la aplicación cerrada ✅

- [x] `14_avisos_push.sql`: dónde se guarda a qué aparatos empujar
- [x] El service worker escucha el empujón y muestra el aviso (misma etiqueta que
      los de la app abierta, así que no suenan dos veces)
- [x] La aplicación apunta el aparato al conceder el permiso, y también al entrar
      si ya lo tenía concedido de antes
- [x] Función `avisar` para el servidor: firma con VAPID, envía y limpia las
      suscripciones muertas
- [x] Solo la clave de servicio puede mandar avisos (si no, cualquiera del grupo
      podría hacer sonar el móvil de los demás)
- [x] Pasado el SQL, desplegada la función, puestos los secretos y creado el
      webhook. Probado de punta a punta: con la aplicación cerrada, la
      notificación llega al móvil
- [x] Una suscripción a la vez: al activar se llamaba por dos caminos y se
      creaban dos apuntes del mismo aparato
- [x] El recibo (`last_ok_at`) se escribe solo en los aparatos a los que el
      envío salió bien
- [x] Redesplegada la función con el recibo por aparato, y comprobada después:
      las dos suscripciones del móvil se marcaron cada una por su cuenta

## Fase 17 · Al grupo de WhatsApp, y qué lleva cada uno ✅

- [x] Botón de compartir el resumen: en el móvil abre el menú del sistema, en el
      ordenador copia al portapapeles
- [x] El texto se lee solo —fechas, casa, quién viene, qué falta por votar— y acaba
      con el enlace para quien quiera el detalle
- [x] Pestaña Equipaje: lo que va de casa y no se compra allí, con quién lo lleva
- [x] Lo que no lleva nadie sale primero y se avisa: es lo que hay que resolver
- [x] Sugerencias de un toque para lo de siempre (sacos, toallas, altavoz…)
- [x] `13_equipaje.sql`, y un mensaje claro si falta por pasar

## Fase 16 · Que un invitado pueda entrar ✅

- [x] Supabase devuelve la sesión de invitaciones y recuperaciones en el `#`, y ese `#`
      es el del router: lo pisaba y la sesión se perdía en silencio
- [x] `index.html` rescata el `#` antes de que exista React, y limpia la URL
- [x] Pantalla de bienvenida: el invitado pone su contraseña y entra
- [x] Vale igual para «he olvidado la contraseña», que estaba roto por lo mismo
- [x] Sobrevive a una recarga a medio camino (`sessionStorage`)
- [x] Si el enlace venía caducado o usado, la pantalla de acceso lo dice

## Fase 15 · La lista maestra crece con el recetario ✅

- [x] El camino iba en un solo sentido: el recetario leía la maestra, pero lo escrito
      a mano se quedaba suelto dentro del plato, con el enlace a nulo
- [x] Al guardar un plato, lo que no venga de la maestra se apunta en ella y queda
      enlazado; así la despensa lo empareja con los sobrantes y se ofrece la próxima vez
- [x] Busca antes de crear, y sin tildes ni mayúsculas: «platano» enlaza con el
      «Plátano» que ya estaba en vez de crear un segundo
- [x] Los dados de baja también cuentan: mejor resucitar un enlace viejo que duplicar
- [x] Índice único por nombre, que dos personas guardando a la vez pueden colarse
- [x] Añadir a la maestra pasa a ser del grupo; cambiar y borrar siguen siendo del
      administrador (`12_maestra_crece.sql`)
- [x] Si el alta falla, el plato se guarda igual y se dice

## Fase 14 · El aviso de instalar, solo cuando toca ✅

- [x] En Chrome y Edge, si ya está instalada el evento de instalación no se dispara, y
      el aviso lo tomaba por «explícaselo a mano»: de ahí que saliera siempre
- [x] Ahora, en los navegadores que avisan solos, no avisar significa que no hay nada
      que ofrecer, y el aviso no sale
- [x] Al abrir la app instalada queda anotado en el aparato, así que la siguiente vez
      que se abra en una pestaña normal tampoco sale
- [x] El evento se atrapa en `index.html`, antes de que React exista, que si no se
      pierde y la aplicación cree que no se puede instalar
- [x] En iPhone, donde no hay forma de saberlo, un «Ya la tengo instalada» para decirlo

## Fase 13 · Menús por días ✅

- [x] Recetario del grupo en `/recetario`: platos con ingredientes y para cuánta gente
- [x] Lo escribe cualquiera; lo borra quien lo apuntó o un administrador
- [x] Los ingredientes se pueden enlazar a la lista maestra, y así la despensa sabe
      emparejarlos sin adivinar por el nombre
- [x] Pestaña «Menú» en la escapada, antes de «Compra»: los días con sus comidas, y en
      cada una los platos que se cocinan
- [x] Las comidas se pueden crear desde el propio Menú, sin ir a otra pestaña
- [x] Botón para pasar los ingredientes a la compra, escalados al grupo, apuntados a su
      comida y con el nombre del plato en las notas
- [x] Volver a generar no pisa lo retocado a mano: solo añade lo que falte
- [x] Cuatro platos de ejemplo si el recetario está vacío

## Fase 12 · Votar varias, no solo una ✅

- [x] Las votaciones pasan a ser por aprobación: cada cual vota todas las casas o
      todos los findes que le valgan, incluso todos
- [x] La restricción de la base de datos pasa de `(trip_id, voter_id)` a incluir la
      candidata, así que una persona puede votar varias pero no la misma dos veces
- [x] Los porcentajes se miden sobre la gente que ha votado, no sobre el número de
      votos, que con voto múltiple no significa nada
- [x] Los votos que ya hubiera siguen valiendo: cada persona tenía como mucho uno

## Fase 11 · Revisión en un navegador de verdad ✅

Hasta aquí todo se había comprobado con el compilador, el linter y las cuentas de
contraste, pero nadie había mirado una pantalla. Repasado con Chrome conducido por el
protocolo de DevTools, con emulación de móvil (390 × 844) en los dos temas.

- [x] En el móvil no se veía en qué pestaña estabas: con siete pestañas entran cuatro,
      y si estabas en Compra, Sobrantes o Chat la activa quedaba fuera de la pantalla.
      Ahora se arrastra al centro y el borde con recorrido se desvanece
- [x] El rótulo de «Fechas» decía «todavía sin fechas» con findes ya propuestos
- [x] La campana vacía y el perfil hablaban solo de casas; faltaban las fechas y lo de
      que tus propias acciones no te avisan a ti
- [x] Comprobado que no hay desbordamiento horizontal a 390 px en ninguna pantalla
- [x] Comprobado que la barra inferior flotante no tapa ningún control al final de
      ninguna página (96 px de holgura en la más larga, que es el perfil)

## Fase 10 · Votación de fechas, y la compra por comidas ✅

- [x] Los tiempos que se generan desde las fechas son **comida y cena**, sin desayuno:
      en este grupo cada uno se lleva el suyo. A mano se puede añadir igual.
- [x] El último día no lleva cena, que se vuelve después de comer
- [x] `09_cosas_a_recordar.sql`: mete en la compra el albal, los vasos, el papel de
      cocina, los pinchos de barbacoa, el vinagre, la sal y el aceite, como compra común

### Votación de fechas

- [x] Pestaña «Fechas» en la escapada, **antes** que «Casas»: es el orden real del grupo
- [x] Cualquiera propone fines de semana candidatos, con nombre y observaciones
- [x] Un voto por persona, cambiable mientras la votación esté abierta
- [x] Resultados con barras, quién ha votado qué y quién falta
- [x] Un administrador abre y cierra la votación de fechas, aparte de la de casas
- [x] Al fijar las ganadoras se copian en la escapada: de ahí salen la cuenta atrás,
      los tiempos de la compra y el historial
- [x] La pestaña «Casas» recuerda votar las fechas primero si aún no hay
- [x] Avisos nuevos: fechas propuestas, votación de fechas abierta y fechas elegidas
- [x] El formulario de la escapada dice que solo el nombre es obligatorio

## Fase 9 · Modo oscuro y avisos ✅

- [x] Claro, oscuro o automático, desde «Mi perfil → Aspecto»
- [x] Se guarda por aparato y se aplica antes del primer pintado (sin fogonazo blanco)
- [x] Sin un segundo juego de estilos: se vuelven a declarar los tokens de color
- [x] Los velos de las fotos y los diálogos siguen siendo oscuros en los dos modos
- [x] Al imprimir, papel blanco aunque la aplicación esté en oscuro
- [x] La barra del navegador y la del móvil cambian de color con el tema
- [x] Buzón de avisos con campana y contador, en tiempo real
- [x] Avisa cuando alguien propone casa, se abre o se cierra una votación y hay casa elegida
- [x] Los avisos los crean disparadores de la base de datos, no el navegador
- [x] Una fila por persona: cada cual marca como leído lo suyo
- [x] Los avisos de más de 90 días se borran solos
- [x] Aviso del sistema operativo, autorizado aparato por aparato
- [x] Al pulsar el aviso, lleva a la pantalla que toca y reutiliza la pestaña abierta

## Fase 7 · Perfiles, chat e instalación ✅

- [x] Página de perfil: foto, nombre, cambio de correo y de contraseña
- [x] La contraseña nueva exige la actual (Supabase no la pide por su cuenta)
- [x] Foto de integrante, también para los niños, que no tienen cuenta
- [x] El administrador puede editar el nombre y la foto de cualquiera
- [x] Avatares en la barra lateral, la cabecera del móvil y la lista de usuarios
- [x] Las cuentas las crea el administrador: sin registro abierto ni enlace mágico
- [x] Chat por escapada, en tiempo real, con fotos, edición y borrado
- [x] Contador de mensajes sin leer en la pestaña del chat
- [x] Logo nuevo: casa rural cuyas ventanas son un 6 y un 9
- [x] Instalable en el móvil: manifest, iconos y service worker con modo sin conexión
- [x] Aviso de instalación (botón en Android, instrucciones en iPhone)

## Fase 8 · Tiempos de la compra ✅

- [x] Comidas y cenas de la escapada, creadas a mano o desde las fechas
- [x] Cada producto puede pertenecer a un tiempo; sin tiempo = compra común
- [x] La lista se agrupa por categorías o por tiempos, a elegir
- [x] Filtro por tiempo: ver solo la cena del viernes, por ejemplo
- [x] Apuntarse a hacer la compra de un tiempo entero
- [x] Descargar en PDF lo que se esté viendo, con casillas para el súper
- [x] El tiempo sale también en el CSV

---

## Fase 1 · Infraestructura ✅

- [x] Proyecto React + TypeScript + Vite
- [x] Tailwind CSS 4 con el tema de Rural69 (bosque, oliva, crema, tierra)
- [x] Cliente de Supabase con comprobación de variables de entorno
- [x] Modelo de datos completo (`supabase/01_schema.sql`)
- [x] Row Level Security en todas las tablas (`supabase/02_rls.sql`)
- [x] Realtime activado en las tablas colaborativas
- [x] Bucket `fotos` con lectura pública y subida solo para integrantes
- [x] Autenticación: contraseña, enlace mágico, recuperar contraseña
- [x] Roles `admin` / `user`; el primer usuario se convierte en administrador
- [x] Pantalla para cuentas sin autorizar y para variables sin configurar
- [x] Despliegue automático con GitHub Actions a GitHub Pages
- [x] README con arquitectura, instalación, Supabase, variables y mantenimiento

## Fase 2 · Núcleo ✅

- [x] Panel principal: próxima escapada, estado de la organización, atajos
- [x] Cuenta atrás, estado y resumen de participantes
- [x] Resumen de la despensa y acceso a escapadas anteriores
- [x] Lista de escapadas con filtros (en marcha / anteriores / todas)
- [x] Crear, editar y eliminar escapadas sin perder las anteriores
- [x] Selector para saltar de una escapada a otra
- [x] Gestión de integrantes y unidades familiares
- [x] Adultos y niños con factor de consumo configurable
- [x] Participantes por escapada y cálculo de personas equivalentes
- [x] Gestión de usuarios: rol, vínculo con integrante, retirar acceso

## Fase 3 · Casas rurales ✅

- [x] Añadir, editar y eliminar casas (borra quien la propuso o un administrador)
- [x] Todos los campos del enunciado, ninguno obligatorio salvo el nombre
- [x] Precio por persona calculado automáticamente
- [x] Varias fotografías: por URL o subidas a Supabase Storage
- [x] Visor de fotos a pantalla completa
- [x] Vista de tarjetas y vista comparativa en tabla
- [x] Enlace directo a la web de la casa
- [x] Votaciones: un voto por persona, cambiable, con resultados y gráfico
- [x] Casa ganadora destacada, empates, quién falta por votar
- [x] Abrir y cerrar la votación (administrador)
- [x] Marcar la casa elegida y marcarla como reservada

## Fase 4 · Compras ✅

- [x] Lista maestra independiente, por categorías, con cantidad y unidad
- [x] Generar la lista de la escapada desde la maestra, eligiendo productos
- [x] Ajuste proporcional al número de asistentes (activable, siempre editable)
- [x] Añadir, duplicar, editar, eliminar y vaciar productos
- [x] Marcar y desmarcar comprados con casillas grandes
- [x] Asignar productos a la persona encargada
- [x] Agrupación por categorías plegables y ocultar categorías completadas
- [x] Buscador, filtros (pendientes / comprados / todos) e indicador de progreso
- [x] Sincronización en tiempo real entre todos los móviles
- [x] Recalcular cantidades para el número real de asistentes (con revisión previa)
- [x] Exportar a CSV e imprimir

## Fase 5 · Sobrantes y despensa ✅

- [x] Apartado «¿Qué ha sobrado?» en cada escapada
- [x] Producto, cantidad, unidad, estado, observaciones y si se conserva
- [x] Atajo para apuntar sobrantes desde los productos comprados
- [x] Despensa compartida del grupo, con origen de cada sobrante
- [x] Revisión de la despensa al preparar la compra, con confirmación manual
- [x] Distinción entre cantidad necesaria, disponible y pendiente de comprar
- [x] Marcar productos como consumidos conservando el histórico
- [x] Exportar la despensa a CSV

## Fase 6 · Historial y estadísticas ✅

- [x] Escapadas realizadas y casas rurales elegidas
- [x] Precio medio de la casa por persona
- [x] Productos que suelen sobrar y productos que nunca sobran
- [x] Tabla completa de escapadas y exportación a CSV
- [x] Copia de seguridad completa en JSON

## Fase 7 · Pulido ✅

- [x] Diseño mobile-first: navegación inferior en móvil, barra lateral en escritorio
- [x] Microanimaciones, esquinas redondeadas, tipografía Outfit + Inter
- [x] Estados de carga, vacíos y de error en todas las pantallas
- [x] Avisos de confirmación y diálogos de confirmación para lo irreversible
- [x] Validación de formularios y mensajes de error de Supabase en español
- [x] Estilos de impresión para la lista de la compra
- [x] `tsc` y `oxlint` sin errores

---

## Mejoras opcionales para el futuro

- [ ] Gastos: total por escapada, evolución y reparto. **Descartado a propósito**:
      el grupo lleva las cuentas en Settle Up. Se quitó de la interfaz el 15/11/2026,
      pero las columnas `shopping_items.price` y `trips.shopping_cost` siguen en la
      base de datos, así que recuperarlo es solo volver a pintar la interfaz.
- [ ] Importar la despensa desde un CSV

## Tareas manuales (solo tú puedes hacerlas)

- [x] Pasar `supabase/11_menus.sql`, que es lo que crea el recetario
- [x] Crear el proyecto en Supabase y ejecutar los scripts SQL por orden
      (comprobado el 16/11/2026: existen las tablas, columnas y funciones de los ocho)
- [x] Crear el repositorio en GitHub, añadir los dos secretos y activar Pages
      (cada push despliega y termina en verde)
- [x] Crear tu cuenta de administrador
- [ ] Invitar al resto del grupo y darles de alta en *Ajustes*: las 5 parejas, la persona
      sin pareja y los 4 niños
- [x] Comprobar *Site URL* y *Redirect URLs* en Supabase. El 17/11/2026 estaba en
      `http://localhost:3000`: toda invitación habría apuntado a una página inexistente
      en el ordenador del invitado. Corregido y probado de punta a punta
- [x] **Probar los avisos con dos cuentas** (17/11/2026). Una cuenta de prueba propuso una
      casa y el aviso llegó al móvil con Rural69 cerrada del todo. Ejercitó de una vez el
      disparador, el tiempo real, el webhook, la firma VAPID y el service worker.
- [ ] Borrar la cuenta de prueba `jgompil+prueba@gmail.com` en *Authentication → Users*.
      Mientras exista cuenta como una persona más del grupo y recibe todos los avisos.
- [x] Volver a pasar `supabase/15_recordatorios.sql` (18/11/2026) para que el
      recordatorio suene a las 8:00 **de España** y no a las 8:00 UTC.
- [x] Pasar los archivos 15, 16, 17 y 18 en el SQL Editor (18/11/2026). Comprobado uno
      por uno: la columna `attending`, las tablas `trip_photos` y `trip_reminders`, el
      disparador `messages_avisa`, el tipo de aviso `mensaje_chat` y la extensión
      `pg_cron`. La tarea `rural69-recordatorios` está programada y activa.
      Probado además en la aplicación desplegada: contestar «Sí» en *¿Quién viene?* pasa
      sin queja, la pestaña *Fotos* deja subir, y un mensaje de prueba en el chat entró y
      se borró sin romper nada.

---

## Fase 20 · Que la aplicación se use en el monte, no solo antes de ir

Cinco cosas de las que salieron al revisar la fase 19. La sexta —organizar los
coches— se dejó fuera a propósito.

- [x] **El chat avisa.** Hasta ahora escribir en el chat no le llegaba a nadie: la
      insignia solo se veía si ya estabas dentro. Ahora avisa como lo demás, pero
      con freno: los mensajes seguidos de una misma conversación actualizan el
      aviso en vez de crear otro, así que una charla de veinte mensajes vibra una
      vez y luego dice «8 mensajes sin leer». La cuenta es la misma que la de la
      pestaña, para que no digan cosas distintas. (`supabase/16_avisos_chat.sql`)
- [x] **Los findes que vienen, de un toque.** Proponer un fin de semana eran dos
      fechas escritas a mano en el móvil. Los diez siguientes salen ya hechos, y
      el que ya está propuesto sale marcado en vez de dejar proponerlo dos veces.
      Para un puente o unas fechas sueltas sigue estando «Proponer fechas».
- [x] **Que cada uno diga si viene.** La lista de quién va la llevaba el
      administrador a mano en el formulario de la escapada, y lo que acababa
      pasando es que las cantidades de la compra salían de una lista que no se
      correspondía con quién iba de verdad. Ahora cada uno contesta por sí y por
      los suyos, y hay tres estados de verdad —viene, no puede, no ha
      contestado—, que es lo que permite al panel decir a quién falta por
      preguntar. (`supabase/17_quien_viene.sql`)
- [x] **Las fotos de después.** Las que había eran las de la casa candidata, para
      decidir; faltaban las del fin de semana. Pestaña propia, varias de golpe,
      pie de foto y un visor a pantalla completa con flechas. Si una foto falla,
      las demás siguen subiendo. (`supabase/18_fotos_escapada.sql`)
- [x] **Que funcione sin cobertura.** Era lo que más se notaba: en una casa rural
      no hay línea y la compra, el menú, el equipaje y las recetas son justo lo
      que se mira allí. Ahora la aplicación guarda en el móvil lo último que leyó
      y lo enseña cuando no hay red, y los retoques que se hacen allí —marcar
      comprado, quién lleva qué— se apuntan y se mandan solos al volver la señal.
      Probado de punta a punta: sin red, marcado, y al volver la línea estaba en
      el servidor.
- [ ] **Organizar los coches.** Queda fuera por ahora.


---

## Fase 21 · Que aguante el fin de semana de verdad

Las seis que salieron al preguntar «¿algo más?», y además las tres que yo mismo
había descartado por capricho y que también entraron.

- [x] **Encoger las fotos antes de subirlas.** Era un fallo, no una mejora: el tope
      estaba en 5 MB, una foto de móvil pesa entre 3 y 6, y no se comprimía nada. El
      primero que subiera las del finde se comía un «prueba con una más ligera»
      imposible de cumplir. Ahora 2000 px y JPEG, con el EXIF puesto. (`src/lib/subidas.ts`)
- [x] **Los datos de llegada de la casa.** Dirección, hora de entrada y salida,
      teléfono del dueño, clave del portón, wifi y cómo llegar. Se rellenan en una
      sección plegada de la ficha y salen en el Resumen, que guarda copia local.
      (`supabase/19_datos_llegada.sql`)
- [x] **El panel, durante la escapada.** Los tres días que importan ya no pide votar
      fechas: dice qué se come hoy, qué hay mañana, qué falta por comprar, y lleva
      las claves de la casa debajo. (`src/lib/estancia.ts`)
- [x] **Que la siguiente parta de la anterior.** El menú y el equipaje se traen con
      los días desplazados, así que la cena del viernes cae en el viernes nuevo.
      (`src/lib/heredar.ts`)
- [x] **Que el proyecto no se duerma, y la copia completa.** Latido semanal en
      Actions y la copia de seguridad, que se bajaba 12 tablas de 23, al día y con
      recordatorio a los 120 días. (`.github/workflows/despierta.yml`, `src/lib/copia.ts`)
- [x] **Pruebas de lo que calcula.** 84, dos décimas, y en el despliegue antes de
      construir. Sin jsdom.
- [x] **Reacciones en el chat.** Un toque en el mensaje en lugar de once «vale».
      No avisan a nadie a propósito. (`supabase/20_reacciones.sql`)
- [x] **No molestar de noche.** De 23:00 a 8:00 de España, de serie, y cada cual se
      lo cambia. Se silencia el empujón, no el aviso. (`supabase/21_no_molestar.sql`)
- [x] **El número en el icono.** La cuenta de avisos sin leer sobre el icono
      instalado, puesta desde la aplicación y desde el service worker.
      (`src/lib/insignia.ts`)

## Fase 22 · Los juegos de la casa (en marcha)

La idea es un cajón de juegos para las noches de allí, con varios dentro. De
momento está siempre visible en el menú para poder probarlo; cuando esté
rodado, saldrá solo durante la escapada, igual que el panel.

- [x] **El cajón.** `/juegos` con su entrada en el menú y sitio para los que
      vengan. (`src/pages/Juegos.tsx`)
- [x] **Furor, primera versión jugable.** La prueba «Tienes la palabra» del
      programa: palabra, turnos, cronómetro, minipuntos y puntos. Equipos a mano
      o a suertes, nombres editables, reloj de 15 a 60 segundos, partida a 1-5
      puntos. La partida se guarda en el aparato por si se bloquea el móvil.
      Reglas probadas aparte de la pantalla, 23 pruebas.
      (`src/lib/juegos/furor.ts`, `src/components/juegos/`)
- [x] **Moderador, timbre y partida compartida.** El que empieza lleva el mando: el
      cronómetro y el marcador son suyos y los demás solo miran, impuesto por los permisos
      de `game_sessions`. Fuera la meta de puntos: el marcador se toca a mano. El aviso del
      final ya no es un pitido, son tres repiques que se oyen desde la cocina, y suenan en
      todos los móviles. La cuenta atrás viaja como instante y cada pantalla corrige el
      desfase de su reloj. (`supabase/22_juegos.sql`, `src/lib/juegos/sincronia.ts`)
- [ ] **Que salga solo estando allí.** Enganchar la sección a `momentoDe() ===
      'durante'` y esconder el enlace del menú el resto del año.
- [ ] **El marcador de la casa.** Guardar quién ganó cada partida para picarse
      entre escapadas. Necesita tabla y SQL.
- [x] **¿Quién soy?** Una carta por cabeza, cada uno con su móvil: ves las de los demás y
      la tuya tapada, una pregunta por turno, y para acertar hay que escribir el nombre.
      Acaba cuando alguien acierta, y ahí se pregunta si se sigue hasta que acierten todos.
      Vueltas sin límite, reloj opcional, 585 personajes en cinco categorías, 177 de
      ellos inventados. Sin cobertura, un solo móvil que va
      pasando. 34 pruebas. (`src/lib/juegos/quiensoy.ts`, `supabase/23_juegos_de_todos.sql`)
- [x] **Trivial de la casa.** El tablero del `trivialrural` traído entero: 46 casillas,
      cinco quesitos, desafío del centro y 1.523 preguntas (199 de «Nosotros»). Cada uno
      desde su móvil, las casillas se tocan, y se pueden añadir preguntas desde el
      juego. El movimiento está comprobado contra el `server.py` original en las 276
      combinaciones posibles. 32 pruebas. (`src/lib/juegos/trivial.ts`, `geometria.ts`,
      `baraja.ts`, `supabase/25_preguntas_trivial.sql`)
- [x] **¿Qué peli suena?** Treinta segundos de banda sonora, la mesa lo grita y el que
      pone la música apunta quién la ha sacado. 119 películas resueltas contra la tienda
      de Apple por `scripts/bandas-sonoras.mjs`, que guarda el identificador y la URL del
      trozo de 30 segundos: en la partida no se le pide nada a la tienda, que corta a las
      veinte peticiones por minuto por IP. Suena en un solo móvil, y ese mismo lleva el
      mando; si se va, cualquiera lo recoge. El reloj no cierra la ronda: al llegar a
      cero para la música y la ronda sigue abierta, que la gente no deja de decir
      títulos porque pite un teléfono.
      (`src/lib/juegos/musica.ts`, `bandas.ts`, `bandas.json`)
- [x] **¿Qué canción suena?** El mismo juego con otro repertorio: 609 canciones de
      pop y rock, del rock and roll a hoy, un tercio en español y un tercio de rock
      duro, heavy y grunge, por `scripts/canciones.mjs`. Se puede acotar lo que suena,
      en tres grupos: por estilo —rock, heavy, pop, rap y reguetón—, por época —seis
      décadas que cubren todos los años sin huecos, de los 50 a hoy— y por idioma
      —español, o españolas de toda la vida—. El estilo
      lo manda el grupo y las rondas se recortan a lo que tenga el montón. Vale
      el título y vale el grupo. Reloj de 45, 30, 15 o 5 segundos —o sin reloj— y de 5
      a 50 rondas; por defecto 30 segundos y 15 canciones, que una conocida se saca en
      cuatro segundos. Las reglas y las dos pantallas son las mismas para los
      dos juegos, con la palabra y el repertorio por parámetro. 23 pruebas.
      (`src/lib/juegos/musica.ts`, `canciones.ts`, `canciones.json`,
      `components/juegos/JuegoDeMusica.tsx`)
- [ ] **Más juegos.** El cajón está hecho para eso.
- [ ] **Pendiente de probar con gente.** Si 30 segundos se hacen largos, si los
      botones se entienden a voces y si la lista de 179 palabras aguanta una
      noche entera.

### Pendiente a mano (lo que no puedo hacer yo)

- [x] Pasar `supabase/19_datos_llegada.sql`, `supabase/20_reacciones.sql` y
      `supabase/21_no_molestar.sql` en el SQL Editor (21/11/2026). Comprobado uno
      por uno contra la base de datos: las diez columnas de llegada en `houses`,
      la tabla `message_reactions` con sus tres políticas y en la publicación de
      tiempo real, y las tres columnas de silencio en `profiles`, con los perfiles
      del grupo en 23:00 → 8:00. Probada también la escritura: apagar y volver a
      encender el interruptor del perfil, confirmado tras recargar del todo.
- [x] Pasar `supabase/22_juegos.sql` en el SQL Editor (21/11/2026). Comprobado con dos
      pantallas: la segunda ve la palabra, el marcador y la cuenta atrás del moderador.
- [x] Pasar `supabase/23_juegos_de_todos.sql` en el SQL Editor (21/11/2026).
- [ ] Pasar `supabase/24_terminar_entre_todos.sql` en el SQL Editor. Sin él, en el
      «¿Quién soy?» solo el que empezó puede terminar la partida, y a los demás el botón
      les miente: se les vacía la pantalla y la partida sigue viva para el resto.
- [ ] Pasar `supabase/25_preguntas_trivial.sql` en el SQL Editor. Sin él el Trivial se
      juega igual con las 1.523 de serie, pero no se pueden añadir preguntas nuevas.
- [ ] Volver a desplegar la *Edge Function* `avisar` (panel → Edge Functions →
      avisar → Code → pegar `supabase/functions/avisar/index.ts` → Deploy). Sin
      esto, ni el silencio de noche ni el número del icono con la app cerrada.
