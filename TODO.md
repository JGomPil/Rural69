# Seguimiento del desarrollo · Rural69

Estado: **todas las fases implementadas y funcionando contra Supabase.**
Lo que queda son mejoras opcionales, no funcionalidades pendientes.

## Fase 18 · Que suene el móvil con la aplicación cerrada 🚧

- [x] `14_avisos_push.sql`: dónde se guarda a qué aparatos empujar
- [x] El service worker escucha el empujón y muestra el aviso (misma etiqueta que
      los de la app abierta, así que no suenan dos veces)
- [x] La aplicación apunta el aparato al conceder el permiso, y también al entrar
      si ya lo tenía concedido de antes
- [x] Función `avisar` para el servidor: firma con VAPID, envía y limpia las
      suscripciones muertas
- [x] Solo la clave de servicio puede mandar avisos (si no, cualquiera del grupo
      podría hacer sonar el móvil de los demás)
- [ ] **Falta que Javi**: pase el SQL, despliegue la función, ponga los secretos
      y cree el webhook sobre `notifications`

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
- [ ] Que los avisos suenen con la aplicación **cerrada del todo**. Hoy suenan mientras está
      abierta, aunque sea de fondo. Para lo otro hace falta Web Push: una *Edge Function* de
      Supabase, claves VAPID y una tabla de suscripciones. Deja de ser «sin servidor propio»,
      que es lo que hace la aplicación gratis de mantener; de ahí que se haya quedado fuera.

## Tareas manuales (solo tú puedes hacerlas)

- [ ] Pasar `supabase/11_menus.sql`, que es lo que crea el recetario
- [x] Crear el proyecto en Supabase y ejecutar los scripts SQL por orden
      (comprobado el 16/11/2026: existen las tablas, columnas y funciones de los ocho)
- [x] Crear el repositorio en GitHub, añadir los dos secretos y activar Pages
      (cada push despliega y termina en verde)
- [x] Crear tu cuenta de administrador
- [ ] Invitar al resto del grupo y darles de alta en *Ajustes*: las 5 parejas, la persona
      sin pareja y los 4 niños
- [ ] Comprobar *Site URL* y *Redirect URLs* en Supabase (no se puede ver desde fuera)
- [ ] **Probar los avisos con dos cuentas**: que otra persona proponga unas fechas y que
      te suene la campana. Es lo único que no se puede verificar en solitario, porque tus
      propias acciones nunca te avisan a ti. Ejercita de golpe el disparador, la
      restricción de tipos del 08 y el tiempo real.
