'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Menu, Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { TimetableNotificationBell } from '@/components/timetable/MasterTimetableGenerator'

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
  const daysLeft = typeof msLeft === 'number' ? Math.ceil(msLeft / (24 * 60 * 60 * 1000)) : null
  const isExpired = typeof msLeft === 'number' ? msLeft < 0 : false
  const shouldWarn =
    plan === 'trial' && typeof daysLeft === 'number' && daysLeft >= 0 && daysLeft <= 7

  return (
    <div className="flex h-screen bg-royalPurple-page overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-royalPurple-deep border-b border-royalPurple-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 focus:outline-none"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            {school ? (
              <span className="ml-4 font-bold text-lg text-royalPurple-text1 truncate max-w-[200px]">
                {school.name}
              </span>
            ) : (
              <span className="ml-4 font-bold text-lg text-royalPurple-text1">EduZambia</span>
            )}
          </div>

          <div className="hidden lg:flex flex-1 max-w-md">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-royalPurple-text3" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted rounded-lg focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2 sm:text-sm transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {['headteacher', 'admin', 'administrator', 'superadmin'].includes(
              String(user?.role || '')
                .trim()
                .toLowerCase()
            ) && <TimetableNotificationBell />}
            <button
              className="p-2 rounded-full text-royalPurple-text2 hover:bg-royalPurple-card2 relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-royalPurple-accent ring-2 ring-royalPurple-deep" />
            </button>

            <div className="h-8 w-px bg-royalPurple-border mx-2 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-royalPurple-text1">{user?.name}</p>
                <p className="text-xs text-royalPurple-text2 capitalize">{user?.role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-royalPurple-accentBg text-royalPurple-accentTx flex items-center justify-center font-semibold border border-royalPurple-border">
                {user?.name?.charAt(0) || <User className="h-5 w-5" />}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-royalPurple-page p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {shouldWarn && expiresAt ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-amber-500 font-semibold">
                    Free trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'} (
                    {expiresAt.toLocaleDateString()})
                  </div>
                  <a
                    href="/dashboard/billing"
                    className="text-sm font-bold text-amber-500 underline"
                  >
                    Upgrade now
                  </a>
                </div>
              </div>
            ) : null}

            {isExpired && expiresAt ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6">
                <div className="text-red-400 font-bold">Your access has expired</div>
                <div className="text-sm text-royalPurple-text2 mt-1">
                  Your {plan === 'trial' ? 'free trial' : 'subscription'} expired on{' '}
                  {expiresAt.toLocaleDateString()}. Upgrade to restore access.
                </div>
                <div className="mt-4">
                  <a href="/dashboard/billing" className="text-sm font-bold text-red-300 underline">
                    Go to Billing
                  </a>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
