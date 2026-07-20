'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { useAuth } from '@/lib/auth'
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPin,
  Shield,
  User,
  Activity,
  Users,
  Headset,
  Smartphone,
} from 'lucide-react'

const NAV = [
  { href: '/platform/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/platform/usage', label: 'School usage', icon: Users },
  { href: '/platform/dashboard', label: 'Schools', icon: Building2 },
  { href: '/platform/sms-gateway', label: 'SMS Gateway', icon: Smartphone },
  { href: '/platform/support', label: 'Chat support', icon: Headset, badgeKey: 'pendingHandoffs' },
  { href: '/platform/provinces', label: 'Provinces', icon: MapPin },
  { href: '/platform/streams', label: 'Reporting streams', icon: MapPin },
  { href: '/platform/billing', label: 'Billing', icon: CreditCard },
  { href: '/platform/health', label: 'Health', icon: Activity },
  { href: '/platform/profile', label: 'Profile', icon: User },
]

export function PlatformShell({ title, children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pendingHandoffs, setPendingHandoffs] = useState(0)

  const loadMe = useCallback(async () => {
    const res = await sessionFetch('/api/platform/auth/me', { cache: 'no-store' })
    if (!res.ok) {
      router.replace('/login')
      return
    }
    const data = await res.json()
    setUser(data.user)
    // Keep Zustand session in sync so IdleSessionGuard enforces 10-minute idle logout.
    useAuth.getState().setUser?.({
      ...(data.user || {}),
      role: data.user?.role || 'superadmin',
      isPlatform: true,
    })
  }, [router])

  const loadPendingHandoffs = useCallback(async () => {
    try {
      const res = await sessionFetch('/api/platform/support/queue', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      const n = Array.isArray(data.sessions) ? data.sessions.length : 0
      setPendingHandoffs(n)
    } catch {
      // non-blocking — badge is best-effort
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    loadPendingHandoffs()
    const id = setInterval(loadPendingHandoffs, 30_000)
    return () => clearInterval(id)
  }, [loadPendingHandoffs, pathname])

  async function logout() {
    await useAuth.getState().logout?.()
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      <aside className="w-56 shrink-0 border-r-2 border-ink bg-ink text-paper flex flex-col">
        <div className="p-4 border-b border-paper/20">
          <div className="flex items-center gap-2">
            <Shield className="text-accent shrink-0" size={20} />
            <span className="font-semibold text-sm">Platform Admin</span>
          </div>
          {user?.email ? (
            <p className="text-xs text-paper/60 mt-2 truncate" title={user.email}>
              {user.email}
            </p>
          ) : null}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ href, label, icon: Icon, badgeKey }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            const badge = badgeKey === 'pendingHandoffs' ? pendingHandoffs : 0
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  active ? 'bg-accent text-paper' : 'text-paper/80 hover:bg-paper/10'
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {badge > 0 ? (
                  <span
                    className={`min-w-[1.25rem] h-5 px-1.5 rounded text-[10px] font-bold flex items-center justify-center ${
                      active ? 'bg-paper text-accent' : 'bg-amber-400 text-ink'
                    }`}
                    title={`${badge} pending handoff${badge === 1 ? '' : 's'}`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="m-2 flex items-center gap-2 px-3 py-2 text-sm text-paper/70 hover:bg-paper/10 rounded"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b-2 border-ink bg-white px-6 py-4">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          <p className="text-xs text-muted mt-0.5">
            Metadata only — no student records or enrollment data
          </p>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
