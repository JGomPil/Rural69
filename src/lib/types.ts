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
  /** Sin uso en la interfaz: las cuentas las lleva el grupo en Settle Up. */
  shopping_cost: number | null
  created_by: string | null
  created_at: string
}

export interface TripParticipant {
  trip_id: string
  member_id: string
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
