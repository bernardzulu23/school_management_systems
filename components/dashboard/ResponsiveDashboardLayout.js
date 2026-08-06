'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Menu, Bell, Search, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { TimetableNotificationBell } from '@/components/timetable/TimetableNotificationBell'
import SubscriptionBanner from '@/components/billing/SubscriptionBanner'
import ServerSessionGuard from '@/components/auth/ServerSessionGuard'
import { SchoolLevelPathGate } from '@/components/auth/SchoolLevelPathGate'
import { getSubscriptionState } from '@/lib/billing/subscription'

export default function ResponsiveDashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const { school } = useSchool()
  const pathname = usePathname()

  const sub = useMemo(() => getSubscriptionState(school), [school])
  const isExpired = Boolean(school) && sub.expired
  const allowExpiredRoute =
    typeof pathname === 'string' &&
    (pathname.startsWith('/dashboard/billing') || pathname.startsWith('/dashboard/solo'))
  const showChildren = !isExpired || allowExpiredRoute

  return (
    <div className="flex h-screen bg-paper text-ink overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b-2 border-ink/10 flex-shrink-0 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-h-10 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg text-muted hover:bg-paper hover:text-ink focus:outline-none lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="min-w-0 lg:hidden">
                {school ? (
                  <span className="block truncate font-bold text-base text-ink sm:text-lg">
                    {school.name}
                  </span>
                ) : (
                  <span className="font-bold text-base text-ink sm:text-lg">ZSMS</span>
                )}
              </div>

              <div className="hidden lg:flex flex-1 max-w-md">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="block w-full pl-10 pr-3 py-2 bg-white border-2 border-ink/10 text-ink placeholder:text-muted rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 sm:text-sm transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
              {['headteacher', 'admin', 'administrator', 'superadmin'].includes(
                String(user?.role || '')
                  .trim()
                  .toLowerCase()
              ) && <TimetableNotificationBell />}

              <a
                href="/dashboard/profile"
                className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 hover:bg-paper"
                aria-label="Open profile"
              >
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-medium text-ink max-w-[11rem] sm:max-w-[16rem]">
                    {user?.name || 'Profile'}
                  </p>
                  <p className="truncate text-xs text-muted capitalize">
                    {user?.role || 'teacher'}
                  </p>
                </div>
                <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-white flex items-center justify-center font-semibold border-2 border-ink">
                  {user?.name?.charAt(0) || <User className="h-5 w-5" />}
                </div>
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-paper p-4 sm:p-6 lg:p-8">
          <ServerSessionGuard>
            <div className="max-w-7xl mx-auto space-y-4">
              <SubscriptionBanner />
              <SchoolLevelPathGate>{showChildren ? children : null}</SchoolLevelPathGate>
            </div>
          </ServerSessionGuard>
        </main>
      </div>
    </div>
  )
}
