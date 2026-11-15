# Seguimiento del desarrollo · Rural69

Estado: **todas las fases implementadas y funcionando contra Supabase.**
Lo que queda son mejoras opcionales, no funcionalidades pendientes.

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
- [x] «Mejorar la lista maestra» a partir de lo que se cambió en una escapada
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

- [ ] PWA instalable con caché offline (útil en supermercados con mala cobertura)
- [ ] Gastos: total por escapada, evolución y reparto. **Descartado a propósito**:
      el grupo lleva las cuentas en Settle Up. Se quitó de la interfaz el 15/11/2026,
      pero las columnas `shopping_items.price` y `trips.shopping_cost` siguen en la
      base de datos, así que recuperarlo es solo volver a pintar la interfaz.
- [ ] Menús por días y generación de la compra a partir de recetas
- [ ] Notificaciones cuando alguien propone casa o abre una votación
- [ ] Importar la despensa desde un CSV
- [ ] Modo oscuro

## Tareas manuales (solo tú puedes hacerlas)

- [ ] Crear el proyecto en Supabase y ejecutar los tres scripts SQL
- [ ] Configurar *Site URL* y *Redirect URLs* en Supabase
- [ ] Crear tu cuenta (serás administrador) e invitar al resto del grupo
- [ ] Crear el repositorio en GitHub, añadir los dos secretos y activar Pages
- [ ] Dar de alta en *Ajustes* las 5 parejas, la persona sin pareja y los 4 niños
