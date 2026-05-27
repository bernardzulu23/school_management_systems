'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Menu, Bell, Search, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { TimetableNotificationBell } from '@/components/timetable/MasterTimetableGenerator'
import SubscriptionBanner from '@/components/billing/SubscriptionBanner'
import ServerSessionGuard from '@/components/auth/ServerSessionGuard'

export default function ResponsiveDashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const { school } = useSchool()

  const plan = String(school?.plan || '')
    .trim()
    .toLowerCase()
  const trialEndsAt = school?.trialEndsAt ? new Date(school.trialEndsAt) : null
  const planExpiresAt = school?.planExpiresAt ? new Date(school.planExpiresAt) : null
  const now = new Date()
  const expiresAt = plan === 'trial' ? trialEndsAt : planExpiresAt
  const msLeft = expiresAt ? expiresAt.getTime() - now.getTime() : null
  const isExpired = typeof msLeft === 'number' ? msLeft < 0 : false

  return (
    <div className="flex h-screen bg-paper text-ink overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b-2 border-ink/10 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-muted hover:bg-paper hover:text-ink focus:outline-none"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            {school ? (
              <span className="ml-4 font-bold text-lg text-ink truncate max-w-[200px]">
                {school.name}
              </span>
            ) : (
              <span className="ml-4 font-bold text-lg text-ink">EduZambia</span>
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

          <div className="flex items-center gap-2 sm:gap-4">
            {['headteacher', 'admin', 'administrator', 'superadmin'].includes(
              String(user?.role || '')
                .trim()
                .toLowerCase()
            ) && <TimetableNotificationBell />}

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-ink">{user?.name}</p>
                <p className="text-xs text-muted capitalize">{user?.role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-accent text-white flex items-center justify-center font-semibold border-2 border-ink">
                {user?.name?.charAt(0) || <User className="h-5 w-5" />}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-paper p-4 sm:p-6 lg:p-8">
          <ServerSessionGuard>
            <div className="max-w-7xl mx-auto space-y-4">
              <SubscriptionBanner />
              {!isExpired ? children : null}
            </div>
          </ServerSessionGuard>
        </main>
      </div>
    </div>
  )
}
