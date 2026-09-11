import RideFinder from '@/components/RideFinder'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Find your ride — Ritual Rollers',
  description: 'Enter your zip or postal code to see the local wind, water, mountain and river sports scene — live conditions, real spots, and the crews who ride them.',
}

export default async function RidePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return <RideFinder initialQuery={q ?? ''} />
}
