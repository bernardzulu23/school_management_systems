'use client'

import React from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { LogOut, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import ProfilePictureDisplay from '@/components/ui/ProfilePictureDisplay'

export function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth()
  const roleLabel = user?.role
    ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()} Dashboard`
    : 'Dashboard'

  return (
    <div className="min-h-screen bg-royalPurple-page transition-colors duration-200">
      <header className="bg-royalPurple-deep border-b border-royalPurple-border transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-royalPurple-text1">
                🇿🇲 Zambian School Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-royalPurple-text2 font-medium">{roleLabel}</span>
              {title && String(title).trim() !== String(roleLabel).trim() && (
                <span className="text-sm text-royalPurple-text3">| {title}</span>
              )}
              {(user?.teacherProfile || String(user?.role || '').toLowerCase() === 'teacher') && (
                <Link
                  href="/dashboard/teacher"
                  className="inline-flex items-center h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-medium"
                >
                  Teacher Dashboard
                </Link>
              )}
              {(user?.hodProfile || String(user?.role || '').toLowerCase() === 'hod') && (
                <Link
                  href="/dashboard/hod"
                  className="inline-flex items-center h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-medium"
                >
                  HOD Dashboard
                </Link>
              )}
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-2 h-10 px-3 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors"
                aria-label="Open profile"
              >
                {user?.profile_picture_url || user?.name ? (
                  <ProfilePictureDisplay
                    src={user?.profile_picture_url}
                    alt={user?.name || 'Profile picture'}
                    name={user?.name || ''}
                    role={String(user?.role || 'student').toLowerCase()}
                    size="sm"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
                <span className="hidden sm:inline font-medium">Profile</span>
              </Link>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-royalPurple-dangerTx hover:bg-royalPurple-card2"
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
      <footer className="bg-royalPurple-deep border-t border-royalPurple-border mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-center text-sm text-royalPurple-text2">
            © 2025 Zambian School Management System - Empowering Rural Education
          </div>
        </div>
      </footer>
    </div>
  )
}
