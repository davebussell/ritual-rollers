'use client'

// "Where do you ride?" — suggests city hubs as you type; anything else goes to /near/<place>,
// which finds the nearest hub or shows what's around that town.

import { useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { toSlug } from '@/lib/geo'

export interface CityOption { slug: string; name: string; region: string }

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function CitySearch({ cities, big = false, target = 'city' }: { cities: CityOption[]; big?: boolean; target?: 'city' | 'tag' }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const id = useId()

  const matches = useMemo(() => {
    const f = fold(q.trim())
    if (f.length < 2) return []
    const starts = cities.filter(c => fold(c.name).startsWith(f))
    const inside = cities.filter(c => !fold(c.name).startsWith(f) && fold(`${c.name} ${c.region}`).includes(f))
    return [...starts, ...inside].slice(0, 6)
  }, [q, cities])

  const go = (c?: CityOption) => {
    if (c) { router.push(target === 'tag' ? `/tag?city=${c.slug}` : `/cities/${c.slug}`); return }
    const slug = toSlug(q)
    if (slug) router.push(target === 'tag' ? `/tag?near=${slug}` : `/near/${slug}`)
  }

  return (
    <form role="search" className="relative" onSubmit={e => { e.preventDefault(); go(open ? matches[active] : undefined) }}>
      <label htmlFor={id} className="sr-only">City or town</label>
      <div className={`flex items-center gap-2 rounded-full border-2 border-asphalt bg-flyer ${big ? 'p-1.5 pl-5' : 'p-1 pl-4'}`}>
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-muted" />
        <input
          id={id}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); setActive(0) }}
          onKeyDown={e => {
            if (!matches.length) return
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, matches.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
            if (e.key === 'Escape') setOpen(false)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="City or town"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && matches[active] ? `${id}-${matches[active].slug}` : undefined}
          className={`min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-[#8A8B84] ${big ? 'py-2.5 text-lg' : 'py-1.5 text-base'}`}
        />
        <button type="submit" className={`btn btn-dark shrink-0 ${big ? '' : '!px-4 !py-2'}`}>Find</button>
      </div>
      {open && matches.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border-2 border-asphalt bg-flyer py-1 shadow-lg">
          {matches.map((c, i) => (
            <li key={c.slug} id={`${id}-${c.slug}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => go(c)} onMouseEnter={() => setActive(i)}
                className={`block w-full px-5 py-2.5 text-left ${i === active ? 'bg-concrete' : ''}`}>
                <span className="font-bold">{c.name}</span> <span className="text-muted">{c.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
