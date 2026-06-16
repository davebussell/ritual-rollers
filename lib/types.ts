import type { Region } from './regions'

export interface Profile {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Trip {
  id: string
  owner_id: string
  title: string
  description: string | null
  cover_photo_id: string | null
  is_public: boolean
  upvotes_count: number
  created_at: string
  profiles?: Profile
  trip_photos?: TripPhoto[]
}

export interface TripPhoto {
  id: string
  trip_id: string
  uploader_id: string
  storage_path: string
  lat: number | null
  lng: number | null
  taken_at: string | null
  caption: string | null
  sequence_order: number
  created_at: string
  profiles?: Profile
}

export interface TripWithAnchor extends Trip {
  anchorLat: number | null
  anchorLng: number | null
  region: Region | null
  allPhotos: { lat: number; lng: number; storage_path: string }[]
}
