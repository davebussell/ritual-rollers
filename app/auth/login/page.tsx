'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'magic' | 'password'

function safeNext(n: string | null): string {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/me'
}

function Login() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      setLoading(false)
      if (error) { setError(error.message); return }
      setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) { setError(error.message); return }
      router.push(next); router.refresh()
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16 sm:px-6">
        <h1 className="h-display text-[32px]">Check your email</h1>
        <p className="mt-4 text-[17px] text-asphalt-2">We sent a sign-in link to <strong className="text-asphalt">{email}</strong>. Open it on this device.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 text-[15px] font-semibold text-pool hover:underline">Use a different email</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-14 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[40px]">Sign in</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">New here? The same link creates your account. Accounts are for riders 16 and over.</p>

      <div className="mt-8 flex gap-1" role="group" aria-label="How to sign in">
        <button type="button" onClick={() => setMode('magic')} aria-pressed={mode === 'magic'} className="chip">Email me a link</button>
        <button type="button" onClick={() => setMode('password')} aria-pressed={mode === 'password'} className="chip">Password</button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field" />
          <p className="hint mt-1">Never shown to anyone.</p>
        </div>
        {mode === 'password' && (
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="field" />
          </div>
        )}
        {error && <p role="alert" className="font-semibold text-fire">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-curb w-full !py-3.5">
          {loading ? 'One moment…' : mode === 'magic' ? 'Email me a sign-in link' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-[14px] text-muted">By signing in you agree to the <Link href="/guidelines" className="prose-link">guidelines</Link>.</p>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={null}><Login /></Suspense>
}
