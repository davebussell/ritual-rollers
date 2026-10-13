// Iconic North American spots that anchor the home strip and the scout landing.
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
  { slug: 'hood-river-oregon', name: 'Hood River', region: 'Oregon, USA', countryCode: 'US', lat: 45.7054, lng: -121.5215, tagline: 'the Gorge' },
  { slug: 'squamish-bc', name: 'Squamish', region: 'British Columbia, Canada', countryCode: 'CA', lat: 49.7016, lng: -123.1558, tagline: 'granite, wind and dirt' },
  { slug: 'tofino-bc', name: 'Tofino', region: 'British Columbia, Canada', countryCode: 'CA', lat: 49.1530, lng: -125.9066, tagline: 'cold-water surf' },
  { slug: 'la-ventana-baja', name: 'La Ventana', region: 'Baja California Sur, Mexico', countryCode: 'MX', lat: 24.0471, lng: -109.9898, tagline: 'El Norte season' },
  { slug: 'cape-hatteras-nc', name: 'Cape Hatteras', region: 'North Carolina, USA', countryCode: 'US', lat: 35.2500, lng: -75.5280, tagline: 'Outer Banks wind and swell' },
  { slug: 'jackson-hole-wyoming', name: 'Jackson Hole', region: 'Wyoming, USA', countryCode: 'US', lat: 43.5875, lng: -110.8279, tagline: 'steep and deep' },
  { slug: 'moab-utah', name: 'Moab', region: 'Utah, USA', countryCode: 'US', lat: 38.5733, lng: -109.5498, tagline: 'slickrock' },
  { slug: 'kihei-maui', name: 'Kihei', region: 'Maui, Hawaii', countryCode: 'US', lat: 20.7644, lng: -156.4450, tagline: 'trade-wind afternoons' },
]

export function featuredBySlug(slug: string): FeaturedSpot | undefined {
  return FEATURED_SPOTS.find(s => s.slug === slug)
}
