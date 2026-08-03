'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { AppVersionLabel } from '@/components/dashboard/AppVersionLabel'
import { useSchool } from '@/lib/context/SchoolContext'
import { canAccessHodFeatures } from '@/lib/subjects/resolveSubjectCatalog'
import { getSchoolFeatures } from '@/lib/school/schoolTypeHelpers'
import { isNavItemApplicable } from '@/lib/school/navApplicability'
import { hasGuidanceAssignment } from '@/lib/guidance/guidanceAccess'
import { hasSicAssignment } from '@/lib/sic/sicAccess'
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
  Download,
  Shield,
  MessageSquare,
  User as UserIcon,
  CreditCard,
  Sparkles,
  Code,
  MessageCircle,
  Compass,
  Layers,
  Briefcase,
  Trophy,
  Bus,
  Heart,
  Megaphone,
  Home as HomeIcon,
  AlertTriangle,
  FileCheck,
  Zap,
  Bell,
  Eye,
  DollarSign,
  Package,
  Clock,
} from 'lucide-react'
import {
  TIMETABLE_CONFLICTS_UPDATED,
  readTimetableConflictCountsSnapshot,
  writeTimetableConflictCountsSnapshot,
} from '@/hooks/useTimetableDraftMeta'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function TimetableConflictNavBadge() {
  const [badge, setBadge] = useState(null)

  useEffect(() => {
    let cancelled = false

    function applyFromCounts(errors, warnings) {
      if (cancelled) return
      if (errors > 0) setBadge({ count: errors, tone: 'error' })
      else if (warnings > 0) setBadge({ count: warnings, tone: 'warn' })
      else setBadge(null)
    }

    async function load(preferred) {
      try {
        const snap = preferred || readTimetableConflictCountsSnapshot()
        const term = String(snap?.term || 'Term 1')
        const academicYear = String(snap?.academicYear || new Date().getFullYear())
        // Prefer in-memory/event snapshot when present (same query result as timetable page).
        if (snap && !preferred) {
          applyFromCounts(Number(snap.conflictErrors ?? 0), Number(snap.conflictWarnings ?? 0))
        }
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
        writeTimetableConflictCountsSnapshot({
          term: data.term || term,
          academicYear: data.academicYear || academicYear,
          conflictErrors: errors,
          conflictWarnings: warnings,
          conflictCount: Number(data.conflictCount ?? errors + warnings),
          lastScannedAt: data.lastScannedAt ?? null,
        })
        applyFromCounts(errors, warnings)
      } catch {
        if (!cancelled) setBadge(null)
      }
    }

    const onUpdate = (ev) => {
      const detail = ev?.detail
      if (detail && typeof detail === 'object') {
        applyFromCounts(Number(detail.conflictErrors ?? 0), Number(detail.conflictWarnings ?? 0))
        return
      }
      load()
    }

    load()
    window.addEventListener(TIMETABLE_CONFLICTS_UPDATED, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(TIMETABLE_CONFLICTS_UPDATED, onUpdate)
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
  const { school, isLoading: schoolLoading } = useSchool()
  const pathname = usePathname()
  const rawRoleKey = String(user?.role || '').toLowerCase()
  const roleKey =
    rawRoleKey === 'admin' || rawRoleKey === 'administrator' ? 'headteacher' : rawRoleKey

  const getNavigationItems = () => {
    const hasSeniorTeacherRole = Boolean(user?.isSeniorTeacher || user?.seniorTeacherAssignment?.id)
    const schoolReady = Boolean(school?.level) && !schoolLoading
    const teacherPortal = pathname?.startsWith('/dashboard/teacher')
    const isHodUser = Boolean(user?.isHod || user?.hodProfile || roleKey === 'hod')
    // When an HOD is viewing the teacher portal, home should stay on teacher.
    const baseDashboardHref = hasSeniorTeacherRole
      ? '/dashboard/senior-teacher'
      : teacherPortal && isHodUser
        ? '/dashboard/teacher'
        : `/dashboard/${roleKey || 'student'}`
    const baseItems = [
      {
        name: 'Dashboard',
        href: baseDashboardHref,
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
      {
        name: 'Offline & sync',
        href: '/dashboard/offline',
        icon: Download,
      },
      {
        name: 'Notifications',
        href: '/dashboard/notifications',
        icon: Bell,
      },
    ]

    const roleSpecificItems = {
      headteacher: [
        { name: 'User Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'User Management', href: '/dashboard/users', icon: Users },
        { name: 'Activity log', href: '/dashboard/headteacher/activity', icon: ClipboardList },
        { name: 'Bulk student upload', href: '/dashboard/students/bulk-upload', icon: Upload },
        { name: 'Bulk teacher upload', href: '/dashboard/teachers/bulk-upload', icon: Upload },
        { name: 'Registration', href: '/admin/registration', icon: UserPlus },
        { name: 'Scheduling Recipes', href: '/dashboard/admin/recipes', icon: ClipboardList },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        {
          name: 'Guidance teachers',
          href: '/dashboard/headteacher/guidance-teachers',
          icon: Briefcase,
        },
        {
          name: 'Guidance reports',
          href: '/dashboard/headteacher/guidance-reports',
          icon: FileText,
        },
        {
          name: 'SIC (In-service)',
          href: '/dashboard/headteacher/sic',
          icon: GraduationCap,
        },
        {
          name: 'Senior Teachers',
          href: '/dashboard/headteacher/senior-teachers',
          icon: UserCheck,
        },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: Target },
        {
          name: 'Teaching Coverage',
          href: '/dashboard/admin/teacher-performance',
          icon: BarChart3,
        },
        { name: 'Classes', href: '/dashboard/classes', icon: GraduationCap },
        {
          name: 'ECZ Exam Tracking',
          href: '/dashboard/headteacher/exam-tracking',
          icon: BarChart3,
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'STEM Monitoring',
          href: '/dashboard/headteacher/stem-monitoring',
          icon: Target,
          requiresPlanFeature: 'stem-monitoring',
        },
        {
          name: 'MOE Reports',
          href: '/dashboard/headteacher/moe-reports',
          icon: FileText,
          requiresPlanFeature: 'moe-reports',
        },
        {
          name: 'Analytics Assistant',
          href: '/dashboard/headteacher/chat',
          icon: Sparkles,
          requiresPlanFeature: 'ai-tools',
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          icon: Sparkles,
          requiresPlanFeature: 'ai-report-comments',
        },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: UserCheck },
        { name: 'Timetable', href: '/dashboard/headteacher/timetable', icon: Calendar },
        {
          name: 'Notice drafts',
          href: '/dashboard/headteacher/notices',
          icon: Megaphone,
        },
        {
          name: 'Timetable Conflicts',
          href: '/dashboard/headteacher/timetable/conflicts',
          icon: AlertTriangle,
          badge: 'timetable-conflicts',
        },
        { name: 'Transport', href: '/dashboard/headteacher/transport', icon: Bus },
        { name: 'Inter-house', href: '/dashboard/headteacher/houses', icon: Trophy },
        {
          name: 'Hostel',
          href: '/dashboard/headteacher/hostel',
          icon: HomeIcon,
          requiresFeature: 'hostel',
        },
        { name: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        {
          name: 'Results',
          href: '/dashboard/results',
          icon: BarChart3,
          requiresFeature: 'secondaryGrading',
        },
        {
          name: 'SMS',
          href: '/dashboard/sms',
          icon: MessageCircle,
          requiresPlanFeature: 'sms-alerts',
        },
        {
          name: 'Payments',
          href: '/dashboard/payments',
          icon: CreditCard,
          requiresFeature: 'feeManagement',
        },
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
        {
          name: 'Parent links',
          href: '/dashboard/headteacher/parent-links',
          icon: Users,
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        {
          name: 'Facial consent',
          href: '/dashboard/headteacher/privacy/facial-consent',
          icon: Shield,
        },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
      ],
      hod: [
        { name: 'Class Allocation', href: '/dashboard/hod/allocation', icon: BookOpen },
        { name: 'Department Timetable', href: '/dashboard/hod/timetable', icon: Calendar },
        { name: 'Activity log', href: '/dashboard/headteacher/activity', icon: ClipboardList },
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
        { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
        { name: 'Games', href: '/dashboard/hod/games', icon: GamepadIcon },
        {
          name: 'Teaching Studio',
          href: '/dashboard/teacher/teaching-studio',
          icon: Zap,
        },
        {
          name: 'Old Syllabus',
          href: '/dashboard/teacher/old-syllabus',
          icon: BookOpen,
          secondaryOnly: true,
        },
        {
          name: 'AI Assistant',
          href: '/dashboard/hod/chat',
          icon: Sparkles,
          requiresPlanFeature: 'ai-tools',
        },
        {
          name: 'AI Quiz Maker',
          href: '/dashboard/teacher/quiz-maker',
          icon: Sparkles,
          requiresPlanFeature: 'ai-quiz-maker',
        },
        { name: 'Topic Test (RAG)', href: '/dashboard/teacher/topic-test', icon: ClipboardList },
        {
          name: 'Upload for AI (RAG)',
          href: '/dashboard/teacher/ai-materials',
          icon: Sparkles,
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          icon: Sparkles,
          requiresPlanFeature: 'ai-report-comments',
        },
        {
          name: 'AI Story Weaver',
          href: '/dashboard/teacher/story-weaver',
          icon: Sparkles,
          requiresPlanFeature: 'ai-story-weaver',
        },
        { name: 'Teacher Performance', href: '/dashboard/hod/teacher-performance', icon: Target },
        {
          name: 'Teaching Coverage',
          href: '/dashboard/hod/teacher-performance',
          icon: BarChart3,
        },
        { name: 'Exam Analysis', href: '/dashboard/hod/exam-analysis', icon: BarChart3 },
        { name: 'Monitoring', href: '/dashboard/hod/monitoring', icon: Eye },
        { name: 'CPD File', href: '/dashboard/hod/cpd', icon: ClipboardList },
        { name: 'Lesson Plans', href: '/dashboard/hod/lesson-plans', icon: FileText },
        { name: 'Chat Lesson Plans', href: '/dashboard/hod/chat-lesson-plans', icon: FileText },
        { name: 'Quizzes', href: '/dashboard/hod/quizzes', icon: ClipboardList },
        { name: 'Budget', href: '/dashboard/hod/budget', icon: DollarSign },
        { name: 'Stock Book', href: '/dashboard/hod/stock-book', icon: Package },
        { name: 'Meetings', href: '/dashboard/hod/meetings', icon: Calendar },
        { name: 'Correspondence', href: '/dashboard/hod/correspondence', icon: FileText },
        { name: 'Daily Routine', href: '/dashboard/hod/daily-routine', icon: Clock },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: ClipboardList },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: ClipboardList,
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'Exam scenarios',
          href: '/dashboard/teacher/assessments/ecz?tab=exam',
          icon: Target,
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'CBC Assessment',
          href: '/dashboard/teacher/assessments/cbc',
          icon: ClipboardList,
          primaryOnly: true,
          requiresFeature: 'cbc',
        },
        {
          name: 'Results',
          href: '/dashboard/results',
          icon: BarChart3,
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Extracurricular', href: '/dashboard/teacher/extracurricular', icon: Trophy },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        { name: 'Lesson sessions', href: '/dashboard/attendance/sessions', icon: Clock },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: UserCheck },
        { name: 'Term reports', href: '/dashboard/hod/term-reports', icon: FileText },
        { name: 'SIC CPD plans', href: '/dashboard/hod/sic-cpd', icon: ClipboardList },
      ],
      guidance: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'Pupil register', href: '/dashboard/guidance/pupils', icon: Users },
        { name: 'Case log', href: '/dashboard/guidance/cases', icon: ClipboardList },
        { name: 'Documents', href: '/dashboard/guidance/documents', icon: FileText },
        { name: 'Career board', href: '/dashboard/guidance/resources', icon: Megaphone },
        { name: 'Career clusters', href: '/dashboard/guidance/career-clusters', icon: Layers },
        { name: 'Careers', href: '/dashboard/guidance/careers', icon: Briefcase },
        { name: 'Girls re-entry', href: '/dashboard/guidance/reentry', icon: Heart },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
      sic: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'Department CPD plans', href: '/dashboard/sic/cpd-plans', icon: ClipboardList },
        { name: 'HIM meetings', href: '/dashboard/sic/him', icon: Calendar },
        { name: 'Activity plans', href: '/dashboard/sic/activity-plans', icon: FileText },
        { name: 'Analytics', href: '/dashboard/sic/analytics', icon: BarChart3 },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
      'senior-teacher': [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        { name: 'Primary Classes', href: '/dashboard/classes', icon: GraduationCap },
        {
          name: 'Primary Allocation',
          href: '/dashboard/senior-teacher/allocation',
          icon: BookOpen,
        },
        { name: 'Primary Timetable', href: '/dashboard/senior-teacher/timetable', icon: Calendar },
        { name: 'Lesson Plans', href: '/dashboard/senior-teacher/lesson-plans', icon: FileText },
        { name: 'Quizzes', href: '/dashboard/senior-teacher/quizzes', icon: ClipboardList },
        { name: 'Teacher Monitoring', href: '/dashboard/senior-teacher/monitoring', icon: Eye },
        { name: 'Teaching Studio', href: '/dashboard/teacher/teaching-studio', icon: Zap },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: ClipboardList },
        {
          name: 'Results',
          href: '/dashboard/results',
          icon: BarChart3,
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
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
        {
          name: 'Teaching Studio',
          href: '/dashboard/teacher/teaching-studio',
          icon: Zap,
        },
        {
          name: 'Old Syllabus',
          href: '/dashboard/teacher/old-syllabus',
          icon: BookOpen,
          secondaryOnly: true,
        },
        {
          name: 'AI Assistant',
          href: '/dashboard/teacher/chat',
          icon: Sparkles,
          requiresPlanFeature: 'ai-tools',
        },
        {
          name: 'AI Quiz Maker',
          href: '/dashboard/teacher/quiz-maker',
          icon: Sparkles,
          requiresPlanFeature: 'ai-quiz-maker',
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          icon: Sparkles,
          requiresPlanFeature: 'ai-report-comments',
        },
        {
          name: 'AI Story Weaver',
          href: '/dashboard/teacher/story-weaver',
          icon: Sparkles,
          requiresPlanFeature: 'ai-story-weaver',
        },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: ClipboardList },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: ClipboardList,
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'Exam scenarios',
          href: '/dashboard/teacher/assessments/ecz?tab=exam',
          icon: Target,
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'CBC Assessment',
          href: '/dashboard/teacher/assessments/cbc',
          icon: ClipboardList,
          primaryOnly: true,
          requiresFeature: 'cbc',
        },
        {
          name: 'Results',
          href: '/dashboard/teacher/results',
          icon: BarChart3,
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'Extracurricular', href: '/dashboard/teacher/extracurricular', icon: Trophy },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        { name: 'Lesson sessions', href: '/dashboard/attendance/sessions', icon: Clock },
        {
          name: 'Payments',
          href: '/dashboard/payments',
          icon: CreditCard,
          requiresFeature: 'feeManagement',
        },
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
        {
          name: 'ECZ Practice',
          href: '/dashboard/student/ecz-practice',
          icon: Target,
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'Mock Examination',
          href: '/dashboard/student/mock-exam',
          icon: FileCheck,
          secondaryOnly: true,
          requiresFeature: 'mockExams',
        },
        {
          name: 'Career guidance',
          href: '/dashboard/student/learning-path',
          icon: Briefcase,
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        {
          name: 'Study assistant',
          href: '/dashboard/student/study-assistant',
          icon: MessageCircle,
        },
        {
          name: 'ZSMS Help',
          href: '/dashboard/student/help',
          icon: Compass,
        },
        {
          name: 'Code Playground',
          href: '/dashboard/student/code-playground',
          icon: Code,
          secondaryOnly: true,
          requiresFeature: 'codePlayground',
        },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: Rocket },
        { name: 'My Activities', href: '/dashboard/student/extracurricular', icon: Trophy },
        {
          name: 'Fee statement',
          href: '/dashboard/student/parent-view',
          icon: Users,
          requiresFeature: 'feeManagement',
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
      parent: [
        { name: 'My children', href: '/dashboard/parent', icon: Users },
        { name: 'Attendance', href: '/dashboard/parent/attendance', icon: UserCheck },
        { name: 'Results', href: '/dashboard/parent/results', icon: BarChart3 },
        { name: 'Progress reports', href: '/dashboard/parent/reports', icon: FileText },
        { name: 'Fees', href: '/dashboard/parent/fees', icon: CreditCard },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
      guardian: [
        { name: 'My children', href: '/dashboard/parent', icon: Users },
        { name: 'Attendance', href: '/dashboard/parent/attendance', icon: UserCheck },
        { name: 'Results', href: '/dashboard/parent/results', icon: BarChart3 },
        { name: 'Progress reports', href: '/dashboard/parent/reports', icon: FileText },
        { name: 'Fees', href: '/dashboard/parent/fees', icon: CreditCard },
        { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
      ],
    }

    const featuresForRole = getSchoolFeatures(
      schoolReady
        ? school
        : { level: 'combined', ownershipType: school?.ownershipType || 'PRIVATE' }
    )
    const showHod =
      featuresForRole.hod && canAccessHodFeatures({ schoolLevel: school?.level || 'combined' })
    const showCareer = featuresForRole.careerGuidance
    const guidancePortal = pathname?.startsWith('/dashboard/guidance')
    const sicPortal = pathname?.startsWith('/dashboard/sic')
    const hodPortal = pathname?.startsWith('/dashboard/hod')
    const seniorTeacherPortal = pathname?.startsWith('/dashboard/senior-teacher')
    const hasGuidanceRole = hasGuidanceAssignment(user)
    const hasSicRole = hasSicAssignment(user)
    let navRoleKey = hasSeniorTeacherRole
      ? 'senior-teacher'
      : roleKey === 'hod' && !showHod
        ? 'teacher'
        : roleKey
    // Portal path drives nav so dual-role staff can switch without the sidebar
    // bouncing them back to their primary role home.
    if (teacherPortal && isHodUser) {
      navRoleKey = 'teacher'
    }
    if (hodPortal && isHodUser && showHod) {
      navRoleKey = 'hod'
    }
    if (guidancePortal && hasGuidanceRole && showCareer) {
      navRoleKey = 'guidance'
    }
    if (sicPortal && hasSicRole) {
      navRoleKey = 'sic'
    }
    if (seniorTeacherPortal && hasSeniorTeacherRole) {
      navRoleKey = 'senior-teacher'
    }

    let roleItems = roleSpecificItems[navRoleKey] || []
    if (navRoleKey === 'headteacher' && featuresForRole.proprietorDashboard) {
      roleItems = [...roleItems]
      const billingIndex = roleItems.findIndex((item) => item.name === 'Billing')
      const proprietorItem = {
        name: 'Owner Dashboard',
        href: '/dashboard/proprietor',
        icon: BarChart3,
        requiresFeature: 'proprietorDashboard',
      }
      if (billingIndex >= 0) {
        roleItems.splice(billingIndex + 1, 0, proprietorItem)
      } else {
        roleItems.push(proprietorItem)
      }
    }

    if (navRoleKey === 'headteacher' && featuresForRole.feeManagement) {
      roleItems = [...roleItems]
      const billingIndex = roleItems.findIndex((item) => item.name === 'Billing')
      const feeItems = [
        {
          name: 'Fee Schedules',
          href: '/dashboard/headteacher/fees/schedules',
          icon: FileText,
          requiresFeature: 'feeManagement',
        },
        {
          name: 'Invoices',
          href: '/dashboard/headteacher/fees/invoices',
          icon: ClipboardList,
          requiresFeature: 'feeManagement',
        },
        {
          name: 'Sibling Groups',
          href: '/dashboard/headteacher/fees/siblings',
          icon: Users,
          requiresFeature: 'feeManagement',
        },
      ]
      if (billingIndex >= 0) {
        roleItems.splice(billingIndex + 1, 0, ...feeItems)
      } else {
        roleItems.push(...feeItems)
      }
    }

    if (navRoleKey === 'headteacher' && featuresForRole.isGovernment) {
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

    const filterSchoolLevelItems = (items) =>
      items.filter((item) => {
        if (
          !isNavItemApplicable(item, schoolReady ? school : null, {
            schoolReady,
          })
        ) {
          return false
        }
        // Keep Guidance teachers / reports visible for headteachers so assignments stay reachable
        // even when career feature flags are off for the school level.
        if (
          !showCareer &&
          guidancePortal === false &&
          (item.name === 'Career clusters' || item.name === 'Careers')
        ) {
          return false
        }
        if (!showHod && navRoleKey === 'teacher') {
          if (item.href?.startsWith('/dashboard/hod')) return false
        }
        return true
      })

    let items = filterSchoolLevelItems([...baseItems, ...roleItems])
    if (navRoleKey === 'guidance') {
      items = items.map((item) =>
        item.name === 'Dashboard' ? { ...item, href: '/dashboard/guidance' } : item
      )
    }
    if (navRoleKey === 'sic') {
      items = items.map((item) =>
        item.name === 'Dashboard' ? { ...item, href: '/dashboard/sic' } : item
      )
    }
    if (navRoleKey === 'hod') {
      items = items.map((item) =>
        item.name === 'Dashboard' ? { ...item, href: '/dashboard/hod' } : item
      )
    }
    if (navRoleKey === 'teacher') {
      items = items.map((item) =>
        item.name === 'Dashboard' ? { ...item, href: '/dashboard/teacher' } : item
      )
    }
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
                  <Image
                    src={school.logo_url}
                    alt={school.name}
                    width={32}
                    height={32}
                    unoptimized
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
            <a
              key={`${item.href}:${item.name}`}
              href={item.href}
              onClick={(event) => {
                event.preventDefault()
                window.location.assign(item.href)
              }}
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
            </a>
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
          'fixed lg:static inset-y-0 left-0 bg-royalPurple-deep text-royalPurple-text1 transition-all duration-300 border-r border-royalPurple-border z-[60] isolate',
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
