// =====================================================================
// Rural69 · Tipos del modelo de datos (espejo del esquema de Supabase)
// =====================================================================

export type Rol = 'admin' | 'user'
export type EstadoEscapada = 'planificacion' | 'confirmada' | 'realizada' | 'archivada'

export interface Profile {
  id: string
  email: string
  display_name: string
  role: Rol
  member_id: string | null
  /** Foto que cada cual se pone desde su perfil. */
  avatar_url: string | null
  created_at: string
}

export interface Household {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Member {
  id: string
  name: string
  household_id: string | null
  is_child: boolean
  consumption_factor: number
  active: boolean
  /** Foto del integrante. Los niños no tienen cuenta: la pone un administrador. */
  avatar_url: string | null
  created_at: string
}

export interface Trip {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
  town: string | null
  province: string | null
  notes: string | null
  status: EstadoEscapada
  voting_open: boolean
  chosen_house_id: string | null
  /** Votación de fechas. Va antes que la de casas: primero el finde, luego la casa. */
  dates_voting_open: boolean
  chosen_date_option_id: string | null
  /** Sin uso en la interfaz: las cuentas las lleva el grupo en Settle Up. */
  shopping_cost: number | null
  created_by: string | null
  created_at: string
}

export interface TripParticipant {
  trip_id: string
  member_id: string
  /** `true` = viene, `false` = no puede. Sin fila = todavía no ha contestado. */
  attending: boolean
}

export interface House {
  id: string
  trip_id: string
  name: string
  url: string | null
  town: string | null
  province: string | null
  total_price: number | null
  max_guests: number | null
  bedrooms: number | null
  bathrooms: number | null
  has_pool: boolean
  has_bbq: boolean
  has_garden: boolean
  pets_allowed: boolean
  common_spaces: string | null
  features: string | null
  notes: string | null
  cover_image_url: string | null
  reserved: boolean
  proposed_by: string | null
  created_at: string
}

export interface HousePhoto {
  id: string
  house_id: string
  url: string
  sort_order: number
  created_at: string
}

export interface Vote {
  id: string
  trip_id: string
  house_id: string
  voter_id: string
  created_at: string
}

export interface MasterItem {
  id: string
  name: string
  category: string
  qty: number | null
  unit: string
  base_people: number
  notes: string | null
  active: boolean
  sort_order: number
  created_at: string
}

export interface ShoppingItem {
  id: string
  trip_id: string
  master_item_id: string | null
  name: string
  category: string
  unit: string
  needed_qty: number
  available_qty: number
  buy_qty: number
  purchased: boolean
  assigned_to: string | null
  /** Tiempo al que pertenece. Vacío = compra común, de nadie en concreto. */
  meal_id: string | null
  /** Plato del que salió, si vino de un menú. Vacío = apuntado a mano. */
  dish_id: string | null
  /** Sin uso en la interfaz: las cuentas las lleva el grupo en Settle Up. */
  price: number | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface PantryItem {
  id: string
  name: string
  category: string
  qty: number
  unit: string
  condition: string | null
  notes: string | null
  keepable: boolean
  source_trip_id: string | null
  master_item_id: string | null
  created_at: string
  updated_at: string
}

export interface AppSetting {
  key: string
  value: unknown
}

export type TipoTiempo = 'desayuno' | 'comida' | 'merienda' | 'cena' | 'picoteo' | 'bebida' | 'otro'

/** Un momento de comer de la escapada: «Cena del viernes», «Comida del domingo»… */
export interface TripMeal {
  id: string
  trip_id: string
  name: string
  day: string | null
  kind: TipoTiempo
  /** Integrante que se encarga de comprar lo de este tiempo. */
  assigned_to: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

/**
 * El recetario del grupo: se reutiliza entre escapadas, como la lista
 * maestra. Las cantidades de sus ingredientes son para `base_people` y se
 * escalan al grupo real al pasarlas a la compra.
 */
export interface Dish {
  id: string
  name: string
  kind: TipoTiempo
  base_people: number
  notes: string | null
  active: boolean
  created_by: string | null
  sort_order: number
  created_at: string
}

export interface DishItem {
  id: string
  dish_id: string
  master_item_id: string | null
  name: string
  category: string
  qty: number | null
  unit: string
  notes: string | null
  sort_order: number
  created_at: string
}

/** Qué se cocina en cada tiempo de una escapada. */
export interface TripMealDish {
  id: string
  meal_id: string
  dish_id: string
  created_at: string
}

/**
 * Una foto hecha en la escapada. Nada que ver con `HousePhoto`, que son las
 * de la casa candidata: aquellas sirven para decidir, estas para recordar.
 */
export interface TripPhoto {
  id: string
  trip_id: string
  url: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Message {
  id: string
  trip_id: string
  author_id: string
  body: string
  image_url: string | null
  edited_at: string | null
  created_at: string
}

export interface MessageRead {
  trip_id: string
  profile_id: string
  last_read_at: string
}

/** Un fin de semana candidato, a votación. */
/** Algo que alguien lleva de su casa: sacos, toallas, la paellera… */
export interface TripPacking {
  id: string
  trip_id: string
  name: string
  notes: string | null
  /** Integrante que lo lleva. Vacío = nadie se ha ofrecido todavía. */
  member_id: string | null
  done: boolean
  created_by: string | null
  sort_order: number
  created_at: string
}

export interface TripDateOption {
  id: string
  trip_id: string
  start_date: string
  end_date: string
  /** Nombre opcional: «puente de mayo», «finde de la feria»… */
  label: string | null
  notes: string | null
  proposed_by: string | null
  created_at: string
}

export interface DateVote {
  id: string
  trip_id: string
  option_id: string
  voter_id: string
  created_at: string
}

export type TipoAviso =
  | 'casa_propuesta'
  | 'votacion_abierta'
  | 'votacion_cerrada'
  | 'casa_elegida'
  | 'fechas_propuestas'
  | 'votacion_fechas_abierta'
  | 'fechas_elegidas'
  /** El que no provoca nadie: «esto es este finde». Lo manda `manda_recordatorios()`. */
  | 'recordatorio'
  /** Alguien ha escrito en el chat. Una conversación seguida es un solo aviso. */
  | 'mensaje_chat'

/**
 * Un aviso para una persona. Los crean los disparadores de la base de datos
 * (ver `supabase/07_notificaciones.sql`), nunca la aplicación.
 */
export interface Notification {
  id: string
  profile_id: string
  kind: TipoAviso
  trip_id: string | null
  title: string
  body: string | null
  /** Ruta de la aplicación a la que lleva, p. ej. `/escapadas/<id>/casas`. */
  url: string | null
  actor_id: string | null
  read_at: string | null
  created_at: string
}
