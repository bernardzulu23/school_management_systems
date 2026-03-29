import React from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

export function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth()
  const roleLabel = user?.role
    ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()} Dashboard`
    : 'Dashboard'

  return (
    <div className="min-h-screen bg-[#F4F3F1] dark:bg-g-900 transition-colors duration-200">
      {/* Simple header */}
      <header className="bg-white dark:bg-g-800 border-b border-black/[0.09] dark:border-white/[0.09] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-g-900 dark:text-g-50">
                🇿🇲 Zambian School Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-g-700 dark:text-g-200 font-medium">{roleLabel}</span>
              {title && <span className="text-sm text-g-600 dark:text-g-300">| {title}</span>}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-[#b91c1c] hover:bg-g-100 dark:hover:bg-g-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>

      {/* Simple footer */}
      <footer className="bg-white dark:bg-g-800 border-t border-black/[0.09] dark:border-white/[0.09] mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-center text-sm text-g-600 dark:text-g-300">
            © 2025 Zambian School Management System - Empowering Rural Education
          </div>
        </div>
      </footer>
    </div>
  )
}
