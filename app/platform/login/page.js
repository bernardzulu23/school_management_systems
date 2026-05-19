'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Shield } from 'lucide-react'

export default function PlatformLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.hint || data.error || 'Login failed')
        return
      }
      toast.success('Signed in as platform admin')
      router.push('/platform/dashboard')
    } catch {
      toast.error('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <div className="w-full max-w-md border-2 border-ink bg-white p-8 shadow-[4px_4px_0_#111111]">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-accent" size={28} />
          <div>
            <h1 className="text-xl font-semibold text-ink">Developer console</h1>
            <p className="text-sm text-muted">Platform super admin — schools metadata only</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-ink mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline font-medium">
            School staff login
          </Link>
        </p>
      </div>
    </main>
  )
}
