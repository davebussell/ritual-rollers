'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, UserPlus } from 'lucide-react'

export interface Collaborator {
  id: string
  username: string
}

interface Props {
  value: Collaborator[]
  onChange: (collabs: Collaborator[]) => void
  excludeUserId?: string
}

export default function CollaboratorSearch({ value, onChange, excludeUserId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${q.trim()}%`)
      .limit(8)
    const filtered = (data ?? []).filter(
      u => u.id !== excludeUserId && !value.some(v => v.id === u.id)
    )
    setResults(filtered)
    setLoading(false)
  }, [excludeUserId, value, supabase])

  useEffect(() => {
    const t = setTimeout(() => search(query), 280)
    return () => clearTimeout(t)
  }, [query, search])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function add(user: Collaborator) {
    onChange([...value, user])
    setQuery('')
    setResults([])
  }

  function remove(id: string) {
    onChange(value.filter(v => v.id !== id))
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm text-zinc-400">
        <UserPlus className="h-3.5 w-3.5" />
        Tag collaborators
      </label>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(c => (
            <div key={c.id}
              className="flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 text-xs font-medium text-orange-300">
              @{c.username}
              <button onClick={() => remove(c.id)}
                className="ml-0.5 rounded-full text-orange-400/60 hover:text-orange-300 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by username…"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/60 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-600 border-t-orange-400" />
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {results.map(user => (
            <button key={user.id}
              onClick={() => add(user)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                {user.username[0].toUpperCase()}
              </div>
              @{user.username}
            </button>
          ))}
        </div>
      )}
      {open && query && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-500 shadow-xl">
          No users found for "{query}"
        </div>
      )}
    </div>
  )
}
