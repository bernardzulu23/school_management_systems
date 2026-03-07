'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/context/SchoolContext'
import {
  Home,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  Calendar,
  FileText,
  UserPlus,
  Target,
  GamepadIcon,
  Rocket,
  Upload,
  Shield,
  MessageSquare,
} from 'lucide-react'

export function Sidebar({ className, mobileOpen, setMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { school } = useSchool()
  const pathname = usePathname()

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: `/dashboard/${user?.role}`,
        icon: Home,
      },
    ]

    const roleSpecificItems = {
      headteacher: [
        { name: 'User Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'User Management', href: '/dashboard/users', icon: Users },
        { name: 'Registration', href: '/admin/registration', icon: UserPlus },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        { name: 'Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'Master Timetable', href: '/dashboard/timetable/master', icon: Calendar },
        { name: 'Department Timetable', href: '/dashboard/timetable/hod', icon: Calendar },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
      ],
      hod: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        { name: 'Department Timetable', href: '/dashboard/timetable/hod', icon: Calendar },
        { name: 'Games', href: '/dashboard/hod/games', icon: GamepadIcon },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
      ],
      teacher: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'My Subjects', href: '/dashboard/subjects', icon: BookOpen },
        { name: 'Materials', href: '/dashboard/materials', icon: Upload },
        { name: 'My Timetable', href: '/dashboard/timetable/teacher', icon: Calendar },
        { name: 'Games', href: '/dashboard/teacher/games', icon: GamepadIcon },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
      ],
      student: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Class', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'Subjects', href: '/dashboard/subjects', icon: BookOpen },
        { name: 'Materials', href: '/dashboard/materials', icon: Upload },
        { name: 'My Timetable', href: '/dashboard/timetable/student', icon: Calendar },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
    }

    return [...baseItems, ...(roleSpecificItems[user?.role] || [])]
  }

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        {(!isCollapsed || mobileOpen) && (
          <div className="flex items-center gap-3 w-full overflow-hidden">
            {school ? (
              <>
                {school.logo_url ? (
                  <img
                    src={school.logo_url}
                    alt={school.name}
                    className="h-8 w-8 rounded-lg object-contain bg-white/10 shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                )}
                <span className="font-bold text-lg tracking-tight truncate" title={school.name}>
                  {school.name}
                </span>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">EduZambia</span>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => (mobileOpen ? setMobileOpen(false) : setIsCollapsed(!isCollapsed))}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-2"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : isCollapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {getNavigationItems().map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobileOpen && setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {(!isCollapsed || mobileOpen) && <span className="font-medium">{item.name}</span>}
              {isCollapsed && !mobileOpen && (
                <div className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="p-4 mt-auto border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!isCollapsed || mobileOpen) && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar for Desktop & Mobile */}
      <nav
        className={cn(
          'fixed lg:static inset-y-0 left-0 bg-gray-900 text-white transition-all duration-300 border-r border-white/10 z-50',
          isCollapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
        aria-label="Main Navigation"
      >
        {navContent}
      </nav>
    </>
  )
}
