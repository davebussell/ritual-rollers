export interface WikiSummary {
  title: string
  extract: string
  thumbnail: string | null
  pageUrl: string
}

const cache = new Map<string, WikiSummary | null>()

export async function fetchWikiSummary(location: string): Promise<WikiSummary | null> {
  const key = location.toLowerCase()
  if (cache.has(key)) return cache.get(key)!

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(location)}`,
      { headers: { 'Api-User-Agent': 'RitualRollers/1.0 (travel photo app)' } }
    )
    if (!res.ok) { cache.set(key, null); return null }
    const data = await res.json()
    const summary: WikiSummary = {
      title: data.title,
      extract: data.extract ?? '',
      thumbnail: data.thumbnail?.source ?? null,
      pageUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(location)}`,
    }
    cache.set(key, summary)
    return summary
  } catch {
    cache.set(key, null)
    return null
  }
}

/** Best search term for a trip: city from title, or fall back to country name */
export function locationLabel(countryCode: string | null | undefined, tripTitle?: string): string | null {
  if (!countryCode) return null
  try {
    const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode.toUpperCase()) ?? null
    return countryName
  } catch {
    return null
  }
}
