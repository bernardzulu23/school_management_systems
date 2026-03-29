'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Menu, Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'

export default function ResponsiveDashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const { school } = useSchool()

  return (
    <div className="flex h-screen bg-[#F4F3F1] dark:bg-g-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white dark:bg-g-900 border-b border-black/[0.09] dark:border-white/[0.09] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-[10px] text-g-700 dark:text-g-200 hover:bg-g-100 dark:hover:bg-g-800 focus:outline-none"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            {school ? (
              <span className="ml-4 font-bold text-lg text-g-900 dark:text-g-50 truncate max-w-[200px]">
                {school.name}
              </span>
            ) : (
              <span className="ml-4 font-bold text-lg text-g-900 dark:text-g-50">EduZambia</span>
            )}
          </div>

          <div className="hidden lg:flex flex-1 max-w-md">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-g-200 rounded-[10px] leading-5 bg-g-50 dark:bg-g-800 placeholder:text-g-400 focus:outline-none focus:ring-1 focus:ring-g-600 focus:border-g-600 sm:text-sm transition-all text-g-900 dark:text-g-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="p-2 rounded-full text-g-700 dark:text-g-200 hover:bg-g-100 dark:hover:bg-g-800 relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="h-8 w-px bg-black/[0.09] dark:bg-white/[0.09] mx-2 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-g-900 dark:text-g-50">{user?.name}</p>
                <p className="text-xs text-g-600 dark:text-g-300 capitalize">{user?.role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-g-100 dark:bg-g-800 flex items-center justify-center text-g-800 dark:text-g-50 font-bold border border-black/[0.09] dark:border-white/[0.09]">
                {user?.name?.charAt(0) || <User className="h-5 w-5" />}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#F4F3F1] dark:bg-g-900 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
