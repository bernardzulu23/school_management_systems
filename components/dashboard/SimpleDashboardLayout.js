import React, { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { LogOut, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import ProfilePictureDisplay from '@/components/ui/ProfilePictureDisplay'
import TopLoadingBar from '@/components/ui/TopLoadingBar'

export function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth()
  const [topLoadingActive, setTopLoadingActive] = useState(false)
  const [topLoadingPercent, setTopLoadingPercent] = useState(0)
  const [topLoadingLabel, setTopLoadingLabel] = useState('Refreshing')
  const countRef = useRef(0)
  const simRef = useRef(null)

  useEffect(() => {
    const clearSim = () => {
      if (simRef.current) clearInterval(simRef.current)
      simRef.current = null
    }

    const startSim = () => {
      if (simRef.current) return
      simRef.current = setInterval(() => {
        setTopLoadingPercent((p) => {
          if (p >= 95) return p
          const step = Math.floor(Math.random() * 7) + 1
          return Math.min(95, p + step)
        })
      }, 220)
    }

    const onStart = (e) => {
      countRef.current += 1
      const label = e?.detail?.label
      if (label) setTopLoadingLabel(String(label))
      if (countRef.current === 1) {
        setTopLoadingPercent(0)
        setTopLoadingActive(true)
        startSim()
      }
    }

    const onUpdate = (e) => {
      const percent = e?.detail?.percent
      if (percent === undefined) return
      setTopLoadingPercent(Math.max(0, Math.min(100, Math.round(Number(percent) || 0))))
    }

    const onStop = () => {
      countRef.current = Math.max(0, countRef.current - 1)
      if (countRef.current !== 0) return
      clearSim()
      setTopLoadingPercent(100)
      setTimeout(() => {
        if (countRef.current === 0) setTopLoadingActive(false)
        setTopLoadingPercent(0)
      }, 300)
    }

    window.addEventListener('top-loading:start', onStart)
    window.addEventListener('top-loading:update', onUpdate)
    window.addEventListener('top-loading:stop', onStop)

    return () => {
      clearSim()
      window.removeEventListener('top-loading:start', onStart)
      window.removeEventListener('top-loading:update', onUpdate)
      window.removeEventListener('top-loading:stop', onStop)
    }
  }, [])
  const roleLabel = user?.role
    ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()} Dashboard`
    : 'Dashboard'

  return (
    <div className="min-h-screen bg-royalPurple-page transition-colors duration-200">
      <TopLoadingBar
        active={topLoadingActive}
        percent={topLoadingPercent}
        label={topLoadingLabel}
      />
      {/* Simple header */}
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
