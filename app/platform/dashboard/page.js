'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, LogOut, RefreshCw, Shield, User } from 'lucide-react'

function statusBadge(status) {
  const map = {
    active: 'bg-emerald-100 text-emerald-800 border border-emerald-800/20',
    trial: 'bg-amber-100 text-amber-900 border border-amber-800/20',
    expired: 'bg-red-100 text-red-800 border border-red-800/20',
    not_affiliated: 'bg-paper text-muted border border-ink/20',
  }
  return map[status] || map.not_affiliated
}

export default function PlatformDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await fetch('/api/platform/auth/me', { cache: 'no-store' })
      if (!meRes.ok) {
        router.replace('/platform/login')
        return
      }
      const me = await meRes.json()
      setUser(me.user)

      const schoolsRes = await fetch('/api/platform/schools', { cache: 'no-store' })
      const schoolsData = await schoolsRes.json()
      if (!schoolsRes.ok) {
        toast.error(schoolsData.error || 'Failed to load schools')
        return
      }
      setSchools(schoolsData.schools || [])
    } catch {
      toast.error('Failed to load platform data')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/platform/login')
  }

  async function toggleActive(school) {
    try {
      const res = await fetch(`/api/platform/schools/${school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !school.active }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }
      toast.success(`${school.name} ${data.school.active ? 'activated' : 'suspended'}`)
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-accent" size={22} />
            <div>
              <h1 className="font-semibold">Platform schools</h1>
              <p className="text-xs text-paper/70">
                Affiliated & paid tenants only — no student or academic data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-paper/70 hidden sm:inline">{user.email}</span>}
            <Link
              href="/platform/profile"
              className="flex items-center gap-2 px-3 py-2 border-2 border-paper/30 text-paper hover:bg-paper/10 text-sm"
              title="Profile settings"
            >
              <User size={16} /> Profile
            </Link>
            <button
              type="button"
              onClick={load}
              className="p-2 border-2 border-paper/30 text-paper hover:bg-paper/10"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 border-2 border-paper/30 text-paper hover:bg-paper/10 text-sm"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-muted">Loading schools…</p>
        ) : schools.length === 0 ? (
          <div className="border-2 border-ink bg-white p-10 text-center shadow-[4px_4px_0_#111111]">
            <Building2 className="mx-auto text-muted mb-3" size={40} />
            <p className="text-ink">No affiliated paid schools yet.</p>
            <p className="text-sm text-muted mt-2">
              Schools appear here when they are active, email-verified, and have a valid plan or
              trial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink bg-white shadow-[4px_4px_0_#111111]">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Subdomain</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Counts</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} className="border-t border-ink/10 hover:bg-paper">
                    <td className="px-4 py-3 text-ink font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.subdomain}</td>
                    <td className="px-4 py-3 text-muted capitalize">{s.plan}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(s.subscriptionStatus)}`}
                      >
                        {s.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {s.counts.users} users · {s.counts.teachers} staff · {s.counts.students}{' '}
                      pupils
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        className="text-xs text-accent hover:underline font-medium"
                      >
                        {s.active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          <Link href="/" className="hover:text-accent">
            Back to marketing site
          </Link>
        </p>
      </div>
    </main>
  )
}
