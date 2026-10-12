// Iconic spots that anchor the home strip and the scout landing.
// Fixed coordinates so their pages never depend on a geocoder.

export interface FeaturedSpot {
  slug: string
  name: string
  region: string
  countryCode: string
  lat: number
  lng: number
  tagline: string
}

export const FEATURED_SPOTS: FeaturedSpot[] = [
  { slug: 'tarifa-spain', name: 'Tarifa', region: 'Spain', countryCode: 'ES', lat: 36.0143, lng: -5.6044, tagline: 'kite capital of Europe' },
  { slug: 'hood-river-oregon', name: 'Hood River', region: 'Oregon, USA', countryCode: 'US', lat: 45.7054, lng: -121.5215, tagline: 'the Gorge' },
  { slug: 'uluwatu-bali', name: 'Uluwatu', region: 'Bali, Indonesia', countryCode: 'ID', lat: -8.8291, lng: 115.0849, tagline: 'reef barrels' },
  { slug: 'chamonix-france', name: 'Chamonix', region: 'France', countryCode: 'FR', lat: 45.9237, lng: 6.8694, tagline: 'under Mont Blanc' },
  { slug: 'tofino-bc', name: 'Tofino', region: 'British Columbia, Canada', countryCode: 'CA', lat: 49.1530, lng: -125.9066, tagline: 'cold-water surf' },
  { slug: 'cape-town-south-africa', name: 'Cape Town', region: 'South Africa', countryCode: 'ZA', lat: -33.9249, lng: 18.4241, tagline: 'Cape Doctor season' },
  { slug: 'hossegor-france', name: 'Hossegor', region: 'France', countryCode: 'FR', lat: 43.6650, lng: -1.4430, tagline: 'Atlantic beach breaks' },
  { slug: 'kihei-maui', name: 'Kihei', region: 'Maui, Hawaii', countryCode: 'US', lat: 20.7644, lng: -156.4450, tagline: 'trade-wind afternoons' },
]

export function featuredBySlug(slug: string): FeaturedSpot | undefined {
  return FEATURED_SPOTS.find(s => s.slug === slug)
}
