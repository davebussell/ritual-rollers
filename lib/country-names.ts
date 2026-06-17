export interface CountryInfo {
  name: string
  flag: string
  alpha2: string
  proj: { center: [number, number]; scale: number }
}

export const NA_COUNTRIES: Record<number, CountryInfo> = {
  840: { name: 'United States',              flag: '🇺🇸', alpha2: 'US', proj: { center: [-98, 39],    scale: 850  } },
  124: { name: 'Canada',                     flag: '🇨🇦', alpha2: 'CA', proj: { center: [-95, 60],    scale: 550  } },
  484: { name: 'Mexico',                     flag: '🇲🇽', alpha2: 'MX', proj: { center: [-102, 24],   scale: 1100 } },
  320: { name: 'Guatemala',                  flag: '🇬🇹', alpha2: 'GT', proj: { center: [-90.4, 15.5], scale: 4000 } },
  188: { name: 'Costa Rica',                 flag: '🇨🇷', alpha2: 'CR', proj: { center: [-84, 9.7],   scale: 5000 } },
  340: { name: 'Honduras',                   flag: '🇭🇳', alpha2: 'HN', proj: { center: [-86.6, 15],  scale: 4200 } },
  222: { name: 'El Salvador',               flag: '🇸🇻', alpha2: 'SV', proj: { center: [-88.9, 13.7], scale: 7000 } },
  558: { name: 'Nicaragua',                  flag: '🇳🇮', alpha2: 'NI', proj: { center: [-85, 13],    scale: 4200 } },
  591: { name: 'Panama',                     flag: '🇵🇦', alpha2: 'PA', proj: { center: [-80.2, 8.5], scale: 5000 } },
  84:  { name: 'Belize',                     flag: '🇧🇿', alpha2: 'BZ', proj: { center: [-88.6, 17],  scale: 6000 } },
  192: { name: 'Cuba',                       flag: '🇨🇺', alpha2: 'CU', proj: { center: [-79.5, 22],  scale: 2500 } },
  214: { name: 'Dominican Republic',         flag: '🇩🇴', alpha2: 'DO', proj: { center: [-70.2, 19],  scale: 4500 } },
  332: { name: 'Haiti',                      flag: '🇭🇹', alpha2: 'HT', proj: { center: [-72.3, 19],  scale: 5500 } },
  388: { name: 'Jamaica',                    flag: '🇯🇲', alpha2: 'JM', proj: { center: [-77.3, 18.1], scale: 8000 } },
  780: { name: 'Trinidad and Tobago',        flag: '🇹🇹', alpha2: 'TT', proj: { center: [-61.2, 10.5], scale: 10000 } },
  44:  { name: 'Bahamas',                    flag: '🇧🇸', alpha2: 'BS', proj: { center: [-77, 24.5],  scale: 3000 } },
  28:  { name: 'Antigua and Barbuda',        flag: '🇦🇬', alpha2: 'AG', proj: { center: [-61.8, 17.1], scale: 20000 } },
  52:  { name: 'Barbados',                   flag: '🇧🇧', alpha2: 'BB', proj: { center: [-59.6, 13.2], scale: 30000 } },
  308: { name: 'Grenada',                    flag: '🇬🇩', alpha2: 'GD', proj: { center: [-61.7, 12.1], scale: 25000 } },
  659: { name: 'Saint Kitts and Nevis',      flag: '🇰🇳', alpha2: 'KN', proj: { center: [-62.7, 17.3], scale: 30000 } },
  662: { name: 'Saint Lucia',               flag: '🇱🇨', alpha2: 'LC', proj: { center: [-60.9, 13.9], scale: 25000 } },
  670: { name: 'Saint Vincent',             flag: '🇻🇨', alpha2: 'VC', proj: { center: [-61.2, 13.3], scale: 28000 } },
  304: { name: 'Greenland',                  flag: '🇬🇱', alpha2: 'GL', proj: { center: [-42, 72],    scale: 380  } },
  630: { name: 'Puerto Rico',               flag: '🇵🇷', alpha2: 'PR', proj: { center: [-66.5, 18.2], scale: 9000 } },
}

export function getCountryInfo(numericId: number): CountryInfo | null {
  return NA_COUNTRIES[numericId] ?? null
}
