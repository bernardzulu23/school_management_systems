'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
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
} from 'lucide-react'

export function Sidebar({ className }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, logout } = useAuth()
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

    return [
      ...baseItems,
      ...(roleSpecificItems[user?.role] || []),
    ]
  }

  const navigationItems = getNavigationItems()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className={cn('sidebar-modern flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-xl shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-xl font-bold text-gray-900">SchoolMS</span>
              <div className="text-xs text-gray-500 font-medium">Management System</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all duration-300"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      {/* User Info */}
      {/* <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
          )}
        </div>
      </div> */}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'sidebar-nav-item group',
                isActive ? 'active' : ''
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50 space-y-1">
        <Link
          href="/dashboard/settings"
          className="sidebar-nav-item group"
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item group w-full text-left hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}
