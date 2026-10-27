// Friends: a request one rider sends and the other accepts (public.friendships, migration 005). Friends see each
// other's "I'll be here" plans by name. Still no private messages. Every read tolerates the table not existing yet.

import { createClient } from '@/lib/supabase/server'
import type { RiderLite } from '@/lib/types'

export type FriendState = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self' | 'closed'

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export async function friendsReady(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('friendships').select('status').limit(1)
    return !error
  } catch {
    return false
  }
}

// Where the viewer stands with the rider who has this username, and that rider's id
export async function friendStateWith(meId: string | null, username: string): Promise<{ state: FriendState; otherId: string | null }> {
  try {
    const supabase = await createClient()
    const { data: other } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
    const otherId = (other as { id: string } | null)?.id ?? null
    if (!otherId) return { state: 'none', otherId: null }
    if (!meId) return { state: 'none', otherId }
    if (otherId === meId) return { state: 'self', otherId }
    const { data, error } = await supabase.from('friendships').select('requester_id, addressee_id, status')
      .or(`and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`)
      .maybeSingle()
    if (error) return { state: 'closed', otherId }
    const f = data as { requester_id: string; addressee_id: string; status: string } | null
    if (!f) return { state: 'none', otherId }
    if (f.status === 'accepted') return { state: 'friends', otherId }
    return { state: f.requester_id === meId ? 'outgoing' : 'incoming', otherId }
  } catch {
    return { state: 'closed', otherId: null }
  }
}

export interface Friendships { friends: (RiderLite & { id: string })[]; incoming: (RiderLite & { id: string })[]; outgoing: (RiderLite & { id: string })[] }

export async function myFriendships(meId: string): Promise<Friendships | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('friendships')
      .select('requester_id, addressee_id, status, requester:profiles!friendships_requester_id_fkey(username, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(username, display_name, avatar_url)')
      .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
      .limit(500)
    if (error) return null
    const out: Friendships = { friends: [], incoming: [], outgoing: [] }
    for (const f of (data ?? []) as unknown as { requester_id: string; addressee_id: string; status: string; requester: RiderLite | RiderLite[] | null; addressee: RiderLite | RiderLite[] | null }[]) {
      const outgoing = f.requester_id === meId
      const other = one(outgoing ? f.addressee : f.requester)
      if (!other) continue
      const r = { ...other, id: outgoing ? f.addressee_id : f.requester_id }
      if (f.status === 'accepted') out.friends.push(r)
      else (outgoing ? out.outgoing : out.incoming).push(r)
    }
    const byName = (a: RiderLite, b: RiderLite) => (a.display_name ?? a.username).localeCompare(b.display_name ?? b.username)
    out.friends.sort(byName); out.incoming.sort(byName); out.outgoing.sort(byName)
    return out
  } catch {
    return null
  }
}
