import exifr from 'exifr'

export interface PhotoMeta {
  lat: number | null
  lng: number | null
  takenAt: Date | null
}

export async function extractPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const data = await exifr.parse(file, { gps: true, tiff: true })
    return {
      lat: data?.latitude ?? null,
      lng: data?.longitude ?? null,
      takenAt: data?.DateTimeOriginal ?? null,
    }
  } catch {
    return { lat: null, lng: null, takenAt: null }
  }
}
