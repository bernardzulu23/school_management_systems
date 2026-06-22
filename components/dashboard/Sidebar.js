'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { AppVersionLabel } from '@/components/dashboard/AppVersionLabel'
import { useSchool } from '@/lib/context/SchoolContext'
import {
  canAccessEczFeatures,
  canAccessHodFeatures,
  canAccessSecondaryGrading,
} from '@/lib/subjects/resolveSubjectCatalog'
import { getSchoolFeatures } from '@/lib/school/schoolTypeHelpers'
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
  Code,
  MessageCircle,
  Layers,
  Briefcase,
  Trophy,
  Bus,
  Home as HomeIcon,
  AlertTriangle,
  FileCheck,
} from 'lucide-react'
import { TIMETABLE_CONFLICTS_UPDATED } from '@/hooks/useTimetableDraftMeta'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function TimetableConflictNavBadge() {
  const [badge, setBadge] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const term = 'Term 1'
        const academicYear = String(new Date().getFullYear())
        const qs = new URLSearchParams({ term, academicYear })
        const res = await sessionFetch(`/api/timetable/draft-meta?${qs}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const errors = Number(data.conflictErrors ?? 0)
        const warnings = Number(data.conflictWarnings ?? 0)
        if (errors > 0) setBadge({ count: errors, tone: 'error' })
        else if (warnings > 0) setBadge({ count: warnings, tone: 'warn' })
        else setBadge(null)
      } catch {
        if (!cancelled) setBadge(null)
      }
    }
    load()
    window.addEventListener(TIMETABLE_CONFLICTS_UPDATED, load)
    return () => {
      cancelled = true
      window.removeEventListener(TIMETABLE_CONFLICTS_UPDATED, load)
    }
  }, [])

  if (!badge) return null
  return (
    <span
      className={cn(
        'ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
        badge.tone === 'error'
          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
      )}
    >
      {badge.count}
    </span>
  )
}

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
      {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ]

    const roleSpecificItems = {
      headteacher: [
        { name: 'User Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'User Management', href: '/dashboard/users', icon: Users },
        { name: 'Registration', href: '/admin/registration', icon: UserPlus },
        { name: 'Scheduling Recipes', href: '/dashboard/admin/recipes', icon: ClipboardList },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        { name: 'Career clusters', href: '/admin/career-clusters', icon: Layers },
        { name: 'Careers', href: '/admin/careers', icon: Briefcase },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        { name: 'Classes', href: '/dashboard/classes', icon: GraduationCap },
        {
          name: 'ECZ Exam Tracking',
          href: '/dashboard/headteacher/exam-tracking',
          icon: BarChart3,
        },
        { name: 'STEM Monitoring', href: '/dashboard/headteacher/stem-monitoring', icon: Target },
        { name: 'MOE Reports', href: '/dashboard/headteacher/moe-reports', icon: FileText },
        { name: 'AI Report Comments', href: '/dashboard/teacher/report-comments', icon: Sparkles },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: UserCheck },
        { name: 'Timetable', href: '/dashboard/headteacher/timetable', icon: Calendar },
        {
          name: 'Timetable Conflicts',
          href: '/dashboard/headteacher/timetable/conflicts',
          icon: AlertTriangle,
          badge: 'timetable-conflicts',
        },
        { name: 'Transport', href: '/dashboard/headteacher/transport', icon: Bus },
        { name: 'Inter-house', href: '/dashboard/headteacher/houses', icon: Trophy },
        { name: 'Hostel', href: '/dashboard/headteacher/hostel', icon: HomeIcon },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
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
        { name: 'Topic Test (RAG)', href: '/dashboard/teacher/topic-test', icon: ClipboardList },
        {
          name: 'Upload for AI (RAG)',
          href: '/dashboard/teacher/ai-materials',
          icon: Sparkles,
        },
        { name: 'AI Report Comments', href: '/dashboard/teacher/report-comments', icon: Sparkles },
        { name: 'AI Story Weaver', href: '/dashboard/teacher/story-weaver', icon: Sparkles },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: ClipboardList,
        },
        {
          name: 'Exam scenarios',
          href: '/dashboard/teacher/assessments/ecz?tab=exam',
          icon: Target,
        },
        {
          name: 'CBC Assessment',
          href: '/dashboard/teacher/assessments/cbc',
          icon: ClipboardList,
        },
        { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Extracurricular', href: '/dashboard/teacher/extracurricular', icon: Trophy },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: UserCheck },
        { name: 'Term reports', href: '/dashboard/hod/term-reports', icon: FileText },
      ],
      teacher: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'My Subjects', href: '/dashboard/subjects', icon: BookOpen },
        {
          name: 'Upload for AI (RAG)',
          href: '/dashboard/teacher/ai-materials',
          icon: Sparkles,
        },
        { name: 'Study Materials', href: '/dashboard/teacher/materials', icon: Upload },
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
        {
          name: 'Exam scenarios',
          href: '/dashboard/teacher/assessments/ecz?tab=exam',
          icon: Target,
        },
        {
          name: 'CBC Assessment',
          href: '/dashboard/teacher/assessments/cbc',
          icon: ClipboardList,
        },
        { name: 'Results', href: '/dashboard/teacher/results', icon: BarChart3 },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Extracurricular', href: '/dashboard/teacher/extracurricular', icon: Trophy },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
        { name: 'Term reports', href: '/dashboard/teacher/term-reports', icon: FileText },
      ],
      student: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Class', href: '/dashboard/student/class', icon: GraduationCap },
        { name: 'Subjects', href: '/dashboard/student/subjects', icon: BookOpen },
        { name: 'Materials', href: '/dashboard/student/materials', icon: Upload },
        { name: 'My Timetable', href: '/dashboard/timetable/student', icon: Calendar },
        { name: 'Assessments', href: '/dashboard/student/assessments', icon: ClipboardList },
        { name: 'Flashcards', href: '/dashboard/student/flashcards', icon: BookOpen },
        { name: 'Results', href: '/dashboard/student/results', icon: BarChart3 },
        { name: 'ECZ Practice', href: '/dashboard/student/ecz-practice', icon: Target },
        { name: 'Mock Examination', href: '/dashboard/student/mock-exam', icon: FileCheck },
        { name: 'Career guidance', href: '/dashboard/student/learning-path', icon: Briefcase },
        {
          name: 'Study assistant',
          href: '/dashboard/student/study-assistant',
          icon: MessageCircle,
        },
        { name: 'Code Playground', href: '/dashboard/student/code-playground', icon: Code },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'My Activities', href: '/dashboard/student/extracurricular', icon: Trophy },
        { name: 'Parent view', href: '/dashboard/student/parent-view', icon: Users },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
    }

    const features = getSchoolFeatures(school || { level: 'combined', ownershipType: 'PRIVATE' })
    const showHod = features.hod && canAccessHodFeatures({ schoolLevel: school?.level })
    const showGrading =
      features.secondaryGrading && canAccessSecondaryGrading({ schoolLevel: school?.level })
    const showEcz =
      features.eczSBA &&
      (String(school?.level || '').toLowerCase() === 'secondary' ||
        String(school?.level || '').toLowerCase() === 'combined' ||
        canAccessEczFeatures({ schoolLevel: school?.level }))
    const showCbc = features.cbc
    const showFees = features.feeManagement
    const showHostel = features.hostel
    const showCareer = features.careerGuidance
    const showCodePlayground = features.codePlayground
    const showMockExams = features.mockExams
    const navRoleKey = roleKey === 'hod' && !showHod ? 'teacher' : roleKey

    let roleItems = roleSpecificItems[navRoleKey] || []
    if (navRoleKey === 'headteacher' && features.proprietorDashboard) {
      roleItems = [...roleItems]
      const billingIndex = roleItems.findIndex((item) => item.name === 'Billing')
      const proprietorItem = {
        name: 'Owner Dashboard',
        href: '/dashboard/proprietor',
        icon: BarChart3,
      }
      if (billingIndex >= 0) {
        roleItems.splice(billingIndex + 1, 0, proprietorItem)
      } else {
        roleItems.push(proprietorItem)
      }
    }

    if (navRoleKey === 'headteacher' && features.feeManagement) {
      roleItems = [...roleItems]
      const billingIndex = roleItems.findIndex((item) => item.name === 'Billing')
      const feeItems = [
        {
          name: 'Fee Schedules',
          href: '/dashboard/headteacher/fees/schedules',
          icon: FileText,
        },
        {
          name: 'Invoices',
          href: '/dashboard/headteacher/fees/invoices',
          icon: ClipboardList,
        },
        {
          name: 'Sibling Groups',
          href: '/dashboard/headteacher/fees/siblings',
          icon: Users,
        },
      ]
      if (billingIndex >= 0) {
        roleItems.splice(billingIndex + 1, 0, ...feeItems)
      } else {
        roleItems.push(...feeItems)
      }
    }

    if (navRoleKey === 'headteacher' && features.isGovernment) {
      roleItems = [...roleItems]
      const moeIndex = roleItems.findIndex((item) => item.name === 'MOE Reports')
      const govItems = [
        {
          name: 'EMIS Export',
          href: '/dashboard/headteacher/government/emis-export',
          icon: FileText,
        },
        {
          name: 'Grants Tracking',
          href: '/dashboard/headteacher/government/grants',
          icon: CreditCard,
        },
        {
          name: 'Gender & Dropout',
          href: '/dashboard/headteacher/government/gender-report',
          icon: BarChart3,
        },
        {
          name: 'Staff Leave',
          href: '/dashboard/headteacher/government/leave',
          icon: UserCheck,
        },
        {
          name: 'Deployments',
          href: '/dashboard/headteacher/government/deployment',
          icon: Users,
        },
      ]
      if (moeIndex >= 0) {
        roleItems.splice(moeIndex + 1, 0, ...govItems)
      } else {
        roleItems.push(...govItems)
      }
    }

    const filterPrimaryItems = (items) =>
      items.filter((item) => {
        if (!showGrading && item.name === 'Results') return false
        if (
          !showEcz &&
          (item.name === 'ECZ SBA Hub' ||
            item.name === 'ECZ Exam Tracking' ||
            item.name === 'Exam scenarios')
        )
          return false
        if (!showCbc && item.name === 'CBC Assessment') return false
        if (!showFees && item.name === 'Payments') return false
        if (
          !showFees &&
          (item.name === 'Fee Schedules' ||
            item.name === 'Invoices' ||
            item.name === 'Sibling Groups' ||
            item.name === 'Owner Dashboard' ||
            item.name === 'Parent view')
        ) {
          return false
        }
        if (!showHostel && item.name === 'Hostel') return false
        if (!showCareer && (item.name === 'Career clusters' || item.name === 'Careers')) {
          return false
        }
        if (!showCodePlayground && item.name === 'Code Playground') return false
        if (!showEcz && item.name === 'ECZ Practice') return false
        if (!showMockExams && item.name === 'Mock Examination') return false
        if (!showCareer && item.name === 'Career guidance') return false
        if (!showHod && navRoleKey === 'teacher') {
          if (item.href?.startsWith('/dashboard/hod')) return false
        }
        return true
      })

    const items = filterPrimaryItems([...baseItems, ...roleItems])
    const isIndividual = String(school?.schoolType || '').toUpperCase() === 'INDIVIDUAL'

    if (isIndividual && roleKey === 'teacher') {
      const hidden = new Set(['My Timetable', 'Payments', 'Extracurricular'])
      const soloItems = [
        ...items
          .map((item) =>
            item.name === 'Dashboard'
              ? { ...item, href: '/dashboard/solo', name: 'Solo workspace' }
              : item
          )
          .filter((item) => !hidden.has(item.name)),
        { name: 'Register student', href: '/admin/registration?role=student', icon: UserPlus },
      ]
      return soloItems
    }

    return items
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
                  ZSMS
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
              {item.badge === 'timetable-conflicts' && (!isCollapsed || mobileOpen) ? (
                <TimetableConflictNavBadge />
              ) : null}
              {isCollapsed && !mobileOpen && (
                <div className="absolute left-14 px-2 py-1 bg-royalPurple-deep text-royalPurple-text1 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-royalPurple-border">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="p-4 mt-auto border-t border-royalPurple-border space-y-3">
        {!isCollapsed || mobileOpen ? (
          <AppVersionLabel />
        ) : (
          <div className="flex justify-center">
            <AppVersionLabel compact />
          </div>
        )}
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
