/** Rough bounding-box country detection from GPS coordinates */
export function getCountryCode(lat: number, lng: number): string | null {
  // Alaska (must check before lower-48 Canada test)
  if (lat >= 54 && lat <= 71 && lng >= -168 && lng <= -141) return 'US'
  // Lower 48 + continental US
  if (lat >= 24 && lat <= 49.5 && lng >= -125 && lng <= -66) return 'US'
  // Canada
  if (lat > 49.5 && lat <= 83 && lng >= -141 && lng <= -52) return 'CA'
  // Mexico
  if (lat >= 14 && lat <= 32.7 && lng >= -118 && lng <= -86.5) return 'MX'
  // Guatemala
  if (lat >= 13.7 && lat <= 17.8 && lng >= -92.2 && lng <= -88.2) return 'GT'
  // Belize
  if (lat >= 15.9 && lat <= 18.5 && lng >= -89.2 && lng <= -87.8) return 'BZ'
  // Honduras
  if (lat >= 13 && lat <= 16.5 && lng >= -89.4 && lng <= -83.2) return 'HN'
  // El Salvador
  if (lat >= 13.1 && lat <= 14.4 && lng >= -90.1 && lng <= -87.7) return 'SV'
  // Nicaragua
  if (lat >= 10.7 && lat <= 15 && lng >= -87.7 && lng <= -83.2) return 'NI'
  // Costa Rica
  if (lat >= 8 && lat <= 11.2 && lng >= -85.9 && lng <= -82.6) return 'CR'
  // Panama
  if (lat >= 7.2 && lat <= 9.6 && lng >= -83.1 && lng <= -77.2) return 'PA'
  // Cuba
  if (lat >= 19.8 && lat <= 23.3 && lng >= -84.9 && lng <= -74.1) return 'CU'
  // Jamaica
  if (lat >= 17.7 && lat <= 18.5 && lng >= -78.4 && lng <= -76.2) return 'JM'
  // Haiti
  if (lat >= 18.0 && lat <= 20.1 && lng >= -74.5 && lng <= -71.6) return 'HT'
  // Dominican Republic
  if (lat >= 17.5 && lat <= 20.0 && lng >= -72.0 && lng <= -68.3) return 'DO'
  // Puerto Rico
  if (lat >= 17.9 && lat <= 18.6 && lng >= -67.3 && lng <= -65.2) return 'PR'
  return null
}
