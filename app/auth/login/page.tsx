'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'magic' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm py-12 text-center">
        <div className="mb-4 text-4xl">✉️</div>
        <h1 className="mb-2 text-xl font-bold">Check your email</h1>
        <p className="text-zinc-400">We sent a sign-in link to <strong className="text-white">{email}</strong>.</p>
        <button onClick={() => setSent(false)} className="mt-6 text-sm text-zinc-500 hover:text-white transition-colors">
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>

      {/* Toggle */}
      <div className="mb-6 flex rounded-lg border border-zinc-800 p-1">
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'magic' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
        >
          Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'password' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
        >
          Password
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-orange-500"
          />
        </div>

        {mode === 'password' && (
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-orange-500"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 py-2 font-medium text-white hover:bg-orange-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'magic' ? 'Send sign-in link' : 'Sign in'}
        </button>
      </form>

      {mode === 'magic' && (
        <p className="mt-4 text-center text-xs text-zinc-600">No password needed — we'll email you a one-click link.</p>
      )}
    </div>
  )
}
