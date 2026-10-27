import type { Metadata } from 'next'
import CrewForm from '@/components/CrewForm'
import { crewBySlug } from '@/lib/crews'
import { cityBySlug } from '@/lib/cities'

export const metadata: Metadata = { title: 'Add your crew', description: 'Run a crew, a skate night or a club? Add it so riders near you can find it.', alternates: { canonical: '/crews/add' } }

export default async function AddCrewPage({ searchParams }: { searchParams: Promise<{ update?: string; city?: string }> }) {
  const sp = await searchParams
  const crew = sp.update ? crewBySlug(sp.update) : undefined
  const city = sp.city ? cityBySlug(sp.city) : undefined
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[44px]">{crew ? `Update ${crew.name}` : 'Add your crew'}</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">
        {crew
          ? 'Tell us what has changed: when you meet, where, who it’s for, or a new link.'
          : 'Run a crew, a regular skate night or a club that welcomes new riders? Add it, with a link to your own page, and riders near you can find you.'}
      </p>
      <div className="mt-8"><CrewForm update={crew ? { slug: crew.slug, name: crew.name } : null} cityName={crew?.city ?? city?.name} /></div>
    </div>
  )
}
