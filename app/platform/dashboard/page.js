'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, LogOut, RefreshCw, Shield, User } from 'lucide-react'

function statusBadge(status) {
  const map = {
    active: 'bg-emerald-500/20 text-emerald-300',
    trial: 'bg-amber-500/20 text-amber-300',
    expired: 'bg-red-500/20 text-red-300',
    not_affiliated: 'bg-slate-500/20 text-slate-400',
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
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-violet-400" size={22} />
            <div>
              <h1 className="font-semibold text-white">Platform schools</h1>
              <p className="text-xs text-slate-400">
                Affiliated & paid tenants only — no student or academic data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-slate-400 hidden sm:inline">{user.email}</span>}
            <Link
              href="/platform/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
              title="Profile settings"
            >
              <User size={16} /> Profile
            </Link>
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-slate-400">Loading schools…</p>
        ) : schools.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center">
            <Building2 className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-300">No affiliated paid schools yet.</p>
            <p className="text-sm text-slate-500 mt-2">
              Schools appear here when they are active, email-verified, and have a valid plan or
              trial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-left">
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
                  <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-slate-300">{s.subdomain}</td>
                    <td className="px-4 py-3 text-slate-300 capitalize">{s.plan}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(s.subscriptionStatus)}`}
                      >
                        {s.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {s.counts.users} users · {s.counts.teachers} staff · {s.counts.students}{' '}
                      pupils
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        className="text-xs text-violet-400 hover:underline"
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

        <p className="mt-8 text-center text-xs text-slate-600">
          <Link href="/" className="hover:text-slate-400">
            Back to marketing site
          </Link>
        </p>
      </div>
    </main>
  )
}
