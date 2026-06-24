import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AuthResult =
  | { user: User; isAnonymous: false }
  | { user: User; isAnonymous: true }
  | { user: null }

export async function getOrCreateUser(supabase: SupabaseClient): Promise<AuthResult> {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const isAnon = !!(user as User & { is_anonymous?: boolean }).is_anonymous
    return { user, isAnonymous: isAnon }
  }

  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    console.log('[auth-or-anon] signInAnonymously result:', { error: error?.message, user: data?.user?.id })
    if (error || !data.user) return { user: null }

    const anonUser = data.user
    const username = `explorer_${anonUser.id.slice(0, 8)}`
    await supabase.from('profiles').upsert(
      { id: anonUser.id, username, bio: null, avatar_url: null },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    return { user: anonUser, isAnonymous: true }
  } catch {
    return { user: null }
  }
}
