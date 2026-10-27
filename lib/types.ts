import type { Level } from '@/lib/sports'

// A row of public.profiles (columns from supabase/schema.sql and migration 004)
export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  disciplines: string[] | null
  level: Level | null
  home_city: string | null
  home_spots: string[] | null
  open_to_ride: boolean | null
  age_confirmed_at: string | null
  created_at: string
}

// What lists and cards need to show a rider
export interface RiderCard {
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  disciplines: string[]
  level: Level | null
  home_city: string | null
  home_spots: string[]
  sample?: boolean
}

export interface RiderLite {
  username: string
  display_name: string | null
  avatar_url: string | null
  sample?: boolean
}

export interface RideSession {
  id: string
  sample?: boolean
  title: string
  notes: string | null
  spot_slug: string | null
  park_id: string | null
  place_name: string
  city: string | null
  lat: number
  lng: number
  starts_at: string
  starts_local: string
  disciplines: string[]
  level: Level | 'all'
  beginners_welcome: boolean
  cancelled: boolean
  host: RiderLite
  riders: RiderLite[]       // who's in (may be a sample of them)
  riders_count: number
}

export interface SessionComment {
  id: string
  body: string
  created_at: string
  rider: RiderLite
}
