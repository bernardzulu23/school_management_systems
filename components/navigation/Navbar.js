'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, GraduationCap, Home, Users, BookOpen, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Students', href: '/dashboard/students', icon: Users },
    { name: 'Subjects', href: '/dashboard/subjects', icon: BookOpen },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <nav className="bg-royalPurple-card border-b border-royalPurple-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-royalPurple-accent p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6 text-royalPurple-text1" />
              </div>
              <span className="text-xl font-bold text-royalPurple-text1 hidden sm:block">ZSMS</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'text-royalPurple-accentTx bg-royalPurple-accent'
                    : 'text-royalPurple-text2 hover:text-royalPurple-accentTx hover:bg-royalPurple-page'
                )}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <Button variant="ghost" size="sm" onClick={logout} className="text-royalPurple-text2">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-royalPurple-text3 hover:text-royalPurple-text3 hover:bg-royalPurple-card2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn('md:hidden', isOpen ? 'block' : 'hidden')}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-royalPurple-card border-t border-royalPurple-border shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors',
                pathname === item.href
                  ? 'text-royalPurple-accentTx bg-royalPurple-accent'
                  : 'text-royalPurple-text2 hover:text-royalPurple-accentTx hover:bg-royalPurple-page'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
          {user && (
            <button
              onClick={() => {
                setIsOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-royalPurple-dangerTx hover:bg-royalPurple-danger transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
