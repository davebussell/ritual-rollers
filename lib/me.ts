// Who's looking: the signed-in rider (server side), and whether they can post and join.

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export interface Me {
  id: string
  email: string | null
  profile: Partial<Profile> | null
  isRider: boolean          // confirmed 16+ (profiles.age_confirmed_at)
}

export async function getMe(): Promise<Me | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || (user as { is_anonymous?: boolean }).is_anonymous) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    const profile = (data as Partial<Profile> | null) ?? null
    return { id: user.id, email: user.email ?? null, profile, isRider: !!profile?.age_confirmed_at }
  } catch {
    return null
  }
}
