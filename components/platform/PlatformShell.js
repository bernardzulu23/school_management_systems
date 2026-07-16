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
} from 'lucide-react'

const NAV = [
  { href: '/platform/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/platform/usage', label: 'School usage', icon: Users },
  { href: '/platform/dashboard', label: 'Schools', icon: Building2 },
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

  useEffect(() => {
    loadMe()
  }, [loadMe])

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
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  active ? 'bg-accent text-paper' : 'text-paper/80 hover:bg-paper/10'
                }`}
              >
                <Icon size={16} />
                {label}
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
