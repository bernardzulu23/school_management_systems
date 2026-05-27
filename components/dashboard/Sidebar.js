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
  User as UserIcon,
  CreditCard,
  Sparkles,
} from 'lucide-react'

export function Sidebar({ className, mobileOpen, setMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { school } = useSchool()
  const pathname = usePathname()
  const rawRoleKey = String(user?.role || '').toLowerCase()
  const roleKey =
    rawRoleKey === 'admin' || rawRoleKey === 'administrator' ? 'headteacher' : rawRoleKey

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: `/dashboard/${roleKey || 'student'}`,
        icon: Home,
      },
      {
        name: 'Profile',
        href: '/dashboard/profile',
        icon: UserIcon,
      },
    ]

    const roleSpecificItems = {
      headteacher: [
        { name: 'User Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'User Management', href: '/dashboard/users', icon: Users },
        { name: 'Registration', href: '/admin/registration', icon: UserPlus },
        { name: 'Scheduling Recipes', href: '/dashboard/admin/recipes', icon: ClipboardList },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        { name: 'Classes', href: '/dashboard/classes', icon: GraduationCap },
        {
          name: 'ECZ Exam Tracking',
          href: '/dashboard/headteacher/exam-tracking',
          icon: BarChart3,
        },
        { name: 'STEM Monitoring', href: '/dashboard/headteacher/stem-monitoring', icon: Target },
        { name: 'MOE Reports', href: '/dashboard/headteacher/moe-reports', icon: FileText },
        { name: 'AI Lesson Planner', href: '/dashboard/teacher/lesson-planner', icon: Sparkles },
        { name: 'AI Quiz Maker', href: '/dashboard/teacher/quiz-maker', icon: Sparkles },
        { name: 'AI Report Comments', href: '/dashboard/teacher/report-comments', icon: Sparkles },
        { name: 'AI Story Weaver', href: '/dashboard/teacher/story-weaver', icon: Sparkles },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: UserCheck },
        { name: 'Timetable', href: '/dashboard/headteacher/timetable', icon: Calendar },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: ClipboardList,
        },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
      ],
      hod: [
        { name: 'Class Allocation', href: '/dashboard/hod/allocation', icon: BookOpen },
        { name: 'Department Timetable', href: '/dashboard/hod/timetable', icon: Calendar },
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        { name: 'Games', href: '/dashboard/hod/games', icon: GamepadIcon },
        { name: 'AI Lesson Planner', href: '/dashboard/teacher/lesson-planner', icon: Sparkles },
        { name: 'AI Quiz Maker', href: '/dashboard/teacher/quiz-maker', icon: Sparkles },
        { name: 'AI Report Comments', href: '/dashboard/teacher/report-comments', icon: Sparkles },
        { name: 'AI Story Weaver', href: '/dashboard/teacher/story-weaver', icon: Sparkles },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: ClipboardList,
        },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: UserCheck },
      ],
      teacher: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'My Subjects', href: '/dashboard/subjects', icon: BookOpen },
        { name: 'Materials', href: '/dashboard/teacher/materials', icon: Upload },
        {
          name: 'AI Reference Materials',
          href: '/dashboard/teacher/ai-materials',
          icon: Upload,
        },
        { name: 'My Timetable', href: '/dashboard/timetable/teacher', icon: Calendar },
        { name: 'Games', href: '/dashboard/teacher/games', icon: GamepadIcon },
        { name: 'AI Lesson Planner', href: '/dashboard/teacher/lesson-planner', icon: Sparkles },
        { name: 'AI Quiz Maker', href: '/dashboard/teacher/quiz-maker', icon: Sparkles },
        { name: 'AI Report Comments', href: '/dashboard/teacher/report-comments', icon: Sparkles },
        { name: 'AI Story Weaver', href: '/dashboard/teacher/story-weaver', icon: Sparkles },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: ClipboardList },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: ClipboardList,
        },
        { name: 'Results', href: '/dashboard/teacher/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/teacher/attendance', icon: UserCheck },
        { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      ],
      student: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Class', href: '/dashboard/student/class', icon: GraduationCap },
        { name: 'Subjects', href: '/dashboard/student/subjects', icon: BookOpen },
        { name: 'Materials', href: '/dashboard/student/materials', icon: Upload },
        { name: 'My Timetable', href: '/dashboard/timetable/student', icon: Calendar },
        { name: 'Assessments', href: '/dashboard/student/assessments', icon: ClipboardList },
        { name: 'Results', href: '/dashboard/student/results', icon: BarChart3 },
        { name: 'ECZ Practice', href: '/dashboard/student/ecz-practice', icon: Target },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
    }

    return [...baseItems, ...(roleSpecificItems[roleKey] || [])]
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
                    className="h-8 w-8 rounded-lg object-contain bg-royalPurple-card2 border border-royalPurple-border shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-royalPurple-card2 border border-royalPurple-border flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-royalPurple-text2" />
                  </div>
                )}
                <span
                  className="font-bold text-lg tracking-tight truncate text-royalPurple-text1"
                  title={school.name}
                >
                  {school.name}
                </span>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-royalPurple-card2 border border-royalPurple-border flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-royalPurple-text2" />
                </div>
                <span className="font-bold text-lg tracking-tight text-royalPurple-text1">
                  EduZambia
                </span>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => (mobileOpen ? setMobileOpen(false) : setIsCollapsed(!isCollapsed))}
          className="p-2 rounded-lg hover:bg-royalPurple-card2 transition-colors shrink-0 ml-2 text-royalPurple-text2"
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

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {getNavigationItems().map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobileOpen && setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group relative',
                isActive
                  ? 'bg-royalPurple-accentBg text-royalPurple-accentTx border-l-2 border-royalPurple-accent'
                  : 'text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive ? 'text-royalPurple-accentTx' : 'text-royalPurple-text2'
                )}
              />
              {(!isCollapsed || mobileOpen) && <span className="font-medium">{item.name}</span>}
              {isCollapsed && !mobileOpen && (
                <div className="absolute left-14 px-2 py-1 bg-royalPurple-deep text-royalPurple-text1 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-royalPurple-border">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="p-4 mt-auto border-t border-royalPurple-border">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-royalPurple-border2 text-royalPurple-text2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx transition-colors"
          aria-label="Logout"
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
          className="fixed inset-0 bg-royalPurple-deep/80 z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar for Desktop & Mobile */}
      <nav
        className={cn(
          'fixed lg:static inset-y-0 left-0 bg-royalPurple-deep text-royalPurple-text1 transition-all duration-300 border-r border-royalPurple-border z-50',
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
