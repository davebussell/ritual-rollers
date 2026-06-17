import type { Region } from './regions'

// ISO numeric country codes → continent
// Source: UN M49 standard
const COUNTRY_CONTINENT: Record<number, Region> = {
  // North America
  124: 'North America', 840: 'North America', 484: 'North America',
  304: 'North America', 630: 'North America', 192: 'North America',
  214: 'North America', 332: 'North America', 388: 'North America',
  320: 'North America', 222: 'North America', 340: 'North America',
  558: 'North America', 188: 'North America', 591: 'North America',
  780: 'North America', 84: 'North America', 44: 'North America',
  28: 'North America', 659: 'North America', 662: 'North America',
  670: 'North America', 308: 'North America', 52: 'North America',
  60: 'North America', 796: 'North America', 850: 'North America',
  // South America
  32: 'South America', 68: 'South America', 76: 'South America',
  152: 'South America', 170: 'South America', 218: 'South America',
  328: 'South America', 604: 'South America', 600: 'South America',
  858: 'South America', 862: 'South America', 740: 'South America',
  // Europe
  8: 'Europe', 40: 'Europe', 56: 'Europe', 70: 'Europe',
  100: 'Europe', 191: 'Europe', 196: 'Europe', 203: 'Europe',
  208: 'Europe', 233: 'Europe', 246: 'Europe', 250: 'Europe',
  276: 'Europe', 300: 'Europe', 348: 'Europe', 352: 'Europe',
  372: 'Europe', 380: 'Europe', 428: 'Europe', 438: 'Europe',
  440: 'Europe', 442: 'Europe', 470: 'Europe', 498: 'Europe',
  492: 'Europe', 499: 'Europe', 528: 'Europe', 578: 'Europe',
  616: 'Europe', 620: 'Europe', 642: 'Europe', 703: 'Europe',
  705: 'Europe', 724: 'Europe', 752: 'Europe', 756: 'Europe',
  804: 'Europe', 826: 'Europe', 807: 'Europe', 688: 'Europe',
  // Africa
  12: 'Africa', 24: 'Africa', 204: 'Africa', 72: 'Africa',
  854: 'Africa', 108: 'Africa', 120: 'Africa', 132: 'Africa',
  140: 'Africa', 148: 'Africa', 174: 'Africa', 178: 'Africa',
  180: 'Africa', 262: 'Africa', 818: 'Africa', 232: 'Africa',
  231: 'Africa', 266: 'Africa', 288: 'Africa', 324: 'Africa',
  624: 'Africa', 384: 'Africa', 404: 'Africa', 426: 'Africa',
  430: 'Africa', 434: 'Africa', 450: 'Africa', 454: 'Africa',
  466: 'Africa', 478: 'Africa', 504: 'Africa', 508: 'Africa',
  516: 'Africa', 562: 'Africa', 566: 'Africa', 646: 'Africa',
  678: 'Africa', 686: 'Africa', 694: 'Africa', 706: 'Africa',
  710: 'Africa', 729: 'Africa', 834: 'Africa', 768: 'Africa',
  788: 'Africa', 800: 'Africa', 894: 'Africa', 716: 'Africa',
  // Asia
  4: 'Asia', 50: 'Asia', 64: 'Asia', 96: 'Asia',
  104: 'Asia', 116: 'Asia', 156: 'Asia', 626: 'Asia',
  356: 'Asia', 360: 'Asia', 364: 'Asia', 368: 'Asia',
  376: 'Asia', 392: 'Asia', 400: 'Asia', 398: 'Asia',
  408: 'Asia', 410: 'Asia', 414: 'Asia', 417: 'Asia',
  418: 'Asia', 422: 'Asia', 458: 'Asia', 462: 'Asia',
  496: 'Asia', 524: 'Asia', 512: 'Asia', 586: 'Asia',
  608: 'Asia', 634: 'Asia', 682: 'Asia', 702: 'Asia',
  144: 'Asia', 760: 'Asia', 762: 'Asia', 764: 'Asia',
  792: 'Asia', 795: 'Asia', 784: 'Asia', 860: 'Asia',
  704: 'Asia', 887: 'Asia',
  // Oceania
  36: 'Oceania', 242: 'Oceania', 296: 'Oceania', 584: 'Oceania',
  583: 'Oceania', 520: 'Oceania', 554: 'Oceania', 585: 'Oceania',
  598: 'Oceania', 882: 'Oceania', 90: 'Oceania', 776: 'Oceania',
  548: 'Oceania', 798: 'Oceania',
}

export function getCountryContinent(numericId: number): Region | null {
  return COUNTRY_CONTINENT[numericId] ?? null
}
