'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { AppVersionLabel } from '@/components/dashboard/AppVersionLabel'
import { BrandMark } from '@/components/brand/BrandMark'
import { NavIcon } from '@/components/brand/NavIcon'
import { useSchool } from '@/lib/context/SchoolContext'
import { canAccessHodFeatures } from '@/lib/subjects/resolveSubjectCatalog'
import {
  getSchoolFeatures,
  hasPrimaryClasses,
  isSecondaryOnly,
} from '@/lib/school/schoolTypeHelpers'
import { isNavItemApplicable, isPrimaryOnlyPath } from '@/lib/school/navApplicability'
import { hasGuidanceAssignment } from '@/lib/guidance/guidanceAccess'
import { hasSicAssignment } from '@/lib/sic/sicAccess'
import { Menu, X } from 'lucide-react'
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
    const schoolReady = Boolean(school?.level) && !schoolLoading
    // Senior Teacher is a primary (and combined) role — never show on secondary-only schools.
    const seniorTeacherFeaturesAllowed = schoolReady && hasPrimaryClasses(school)
    const hasSeniorTeacherRole =
      seniorTeacherFeaturesAllowed &&
      Boolean(user?.isSeniorTeacher || user?.seniorTeacherAssignment?.id)
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
        icon: 'overview',
      },
      {
        name: 'Profile',
        href: '/dashboard/profile',
        icon: 'profile',
      },
      {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: 'settings',
      },
      {
        name: 'Offline & sync',
        href: '/dashboard/offline',
        icon: 'offline',
      },
      {
        name: 'Notifications',
        href: '/dashboard/notifications',
        icon: 'notifications',
      },
    ]

    const roleSpecificItems = {
      headteacher: [
        { name: 'User Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        { name: 'User Management', href: '/dashboard/users', icon: 'users' },
        { name: 'Activity log', href: '/dashboard/headteacher/activity', icon: 'audit' },
        { name: 'Bulk student upload', href: '/dashboard/students/bulk-upload', icon: 'upload' },
        { name: 'Bulk teacher upload', href: '/dashboard/teachers/bulk-upload', icon: 'upload' },
        { name: 'Registration', href: '/admin/registration', icon: 'register' },
        { name: 'Scheduling Recipes', href: '/dashboard/admin/recipes', icon: 'audit' },
        { name: 'Subjects', href: '/admin/subjects', icon: 'subjects' },
        {
          name: 'Guidance teachers',
          href: '/dashboard/headteacher/guidance-teachers',
          icon: 'briefcase',
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        {
          name: 'Guidance reports',
          href: '/dashboard/headteacher/guidance-reports',
          icon: 'reports',
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        {
          name: 'SIC (In-service)',
          href: '/dashboard/headteacher/sic',
          icon: 'classes',
        },
        {
          name: 'Senior Teachers',
          href: '/dashboard/headteacher/senior-teachers',
          icon: 'attendance',
          primaryOnly: true,
        },
        { name: 'Teacher Performance', href: '/admin/teacher-performance', icon: 'target' },
        {
          name: 'Teaching Coverage',
          href: '/dashboard/admin/teacher-performance',
          icon: 'results',
        },
        { name: 'Classes', href: '/dashboard/classes', icon: 'classes' },
        {
          name: 'ECZ Exam Tracking',
          href: '/dashboard/headteacher/exam-tracking',
          icon: 'results',
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'SBA Policy',
          href: '/dashboard/headteacher/sba-policy',
          icon: 'audit',
          secondaryOnly: true,
        },
        {
          name: 'STEM Monitoring',
          href: '/dashboard/headteacher/stem-monitoring',
          icon: 'target',
          requiresPlanFeature: 'stem-monitoring',
        },
        {
          name: 'MOE Reports',
          href: '/dashboard/headteacher/moe-reports',
          icon: 'reports',
          requiresPlanFeature: 'moe-reports',
        },
        {
          name: 'Analytics Assistant',
          href: '/dashboard/headteacher/chat',
          icon: 'ai',
          requiresPlanFeature: 'ai-tools',
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          icon: 'ai',
          requiresPlanFeature: 'ai-report-comments',
        },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: 'attendance' },
        { name: 'Timetable', href: '/dashboard/headteacher/timetable', icon: 'calendar' },
        {
          name: 'Notice drafts',
          href: '/dashboard/headteacher/notices',
          icon: 'megaphone',
        },
        {
          name: 'Timetable Conflicts',
          href: '/dashboard/headteacher/timetable/conflicts',
          icon: 'alert',
          badge: 'timetable-conflicts',
        },
        { name: 'Transport', href: '/dashboard/headteacher/transport', icon: 'bus' },
        { name: 'Inter-house', href: '/dashboard/headteacher/houses', icon: 'trophy' },
        {
          name: 'House activities',
          href: '/dashboard/headteacher/houses/activities',
          icon: 'trophy',
          primaryOnly: true,
        },
        {
          name: 'Primary results analysis',
          href: '/dashboard/headteacher/primary-results-analysis',
          icon: 'results',
          primaryOnly: true,
        },
        {
          name: 'Hostel',
          href: '/dashboard/headteacher/hostel',
          icon: 'hostel',
          requiresFeature: 'hostel',
        },
        { name: 'Assessments', href: '/dashboard/assessments', icon: 'audit' },
        {
          name: 'Results',
          href: '/dashboard/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        {
          name: 'Exam analysis',
          href: '/dashboard/headteacher/exam-analysis',
          icon: 'results',
          secondaryOnly: true,
          requiresFeature: 'secondaryGrading',
        },
        {
          name: 'SMS',
          href: '/dashboard/sms',
          icon: 'sms',
          requiresPlanFeature: 'sms-alerts',
        },
        {
          name: 'Payments',
          href: '/dashboard/payments',
          icon: 'billing',
          requiresFeature: 'feeManagement',
        },
        { name: 'Billing', href: '/dashboard/billing', icon: 'billing' },
        {
          name: 'Parent links',
          href: '/dashboard/headteacher/parent-links',
          icon: 'users',
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
        {
          name: 'Facial consent',
          href: '/dashboard/headteacher/privacy/facial-consent',
          icon: 'privacy',
        },
        { name: 'Reports', href: '/dashboard/reports', icon: 'reports' },
      ],
      hod: [
        {
          name: 'Class Allocation',
          href: '/dashboard/hod/allocation',
          icon: 'subjects',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Department Timetable',
          href: '/dashboard/hod/timetable',
          icon: 'calendar',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        { name: 'Activity log', href: '/dashboard/headteacher/activity', icon: 'audit' },
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        { name: 'My Classes', href: '/dashboard/classes', icon: 'classes' },
        { name: 'Subjects', href: '/admin/subjects', icon: 'subjects' },
        {
          name: 'Games',
          href: '/dashboard/hod/games',
          icon: 'games',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Teaching Studio',
          href: '/dashboard/teacher/teaching-studio',
          icon: 'studio',
        },
        {
          name: 'Old Syllabus',
          href: '/dashboard/teacher/old-syllabus',
          icon: 'subjects',
          secondaryOnly: true,
        },
        {
          name: 'AI Assistant',
          href: '/dashboard/hod/chat',
          icon: 'ai',
          requiresPlanFeature: 'ai-tools',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'AI Quiz Maker',
          href: '/dashboard/teacher/quiz-maker',
          icon: 'ai',
          requiresPlanFeature: 'ai-quiz-maker',
        },
        { name: 'Topic Test (RAG)', href: '/dashboard/teacher/topic-test', icon: 'audit' },
        {
          name: 'Upload for AI (RAG)',
          href: '/dashboard/teacher/ai-materials',
          icon: 'ai',
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          icon: 'ai',
          requiresPlanFeature: 'ai-report-comments',
        },
        {
          name: 'AI Story Weaver',
          href: '/dashboard/teacher/story-weaver',
          icon: 'ai',
          requiresPlanFeature: 'ai-story-weaver',
        },
        {
          name: 'Teacher Performance',
          href: '/dashboard/hod/teacher-performance',
          icon: 'target',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Teaching Coverage',
          href: '/dashboard/hod/teacher-performance',
          icon: 'results',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Exam Analysis',
          href: '/dashboard/hod/exam-analysis',
          icon: 'results',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Monitoring',
          href: '/dashboard/hod/monitoring',
          icon: 'eye',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'CPD File',
          href: '/dashboard/hod/cpd',
          icon: 'audit',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Lesson Plans',
          href: '/dashboard/hod/lesson-plans',
          icon: 'reports',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Chat Lesson Plans',
          href: '/dashboard/hod/chat-lesson-plans',
          icon: 'reports',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Quizzes',
          href: '/dashboard/hod/quizzes',
          icon: 'audit',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Budget',
          href: '/dashboard/hod/budget',
          icon: 'budget',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Stock Book',
          href: '/dashboard/hod/stock-book',
          icon: 'package',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Meetings',
          href: '/dashboard/hod/meetings',
          icon: 'calendar',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Correspondence',
          href: '/dashboard/hod/correspondence',
          icon: 'reports',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'Daily Routine',
          href: '/dashboard/hod/daily-routine',
          icon: 'clock',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: 'audit' },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: 'audit',
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'School SBA',
          href: '/dashboard/teacher/sba',
          icon: 'audit',
          secondaryOnly: true,
        },
        {
          name: 'Exam scenarios',
          href: '/dashboard/teacher/assessments/ecz?tab=exam',
          icon: 'target',
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'CBC Assessment',
          href: '/dashboard/teacher/assessments/cbc',
          icon: 'audit',
          primaryOnly: true,
          requiresFeature: 'cbc',
        },
        {
          name: 'Results',
          href: '/dashboard/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: 'rocket' },
        {
          name: 'Extracurricular',
          href: '/dashboard/teacher/extracurricular',
          icon: 'trophy',
          primaryOnly: true,
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
        { name: 'Attendance', href: '/dashboard/attendance', icon: 'attendance' },
        { name: 'Lesson sessions', href: '/dashboard/attendance/sessions', icon: 'clock' },
        { name: 'Attendance Returns', href: '/dashboard/attendance/returns', icon: 'attendance' },
        {
          name: 'Term reports',
          href: '/dashboard/hod/term-reports',
          icon: 'reports',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
        {
          name: 'SIC CPD plans',
          href: '/dashboard/hod/sic-cpd',
          icon: 'audit',
          secondaryOnly: true,
          requiresFeature: 'hod',
        },
      ],
      guidance: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        { name: 'Pupil register', href: '/dashboard/guidance/pupils', icon: 'users' },
        { name: 'Case log', href: '/dashboard/guidance/cases', icon: 'audit' },
        { name: 'Documents', href: '/dashboard/guidance/documents', icon: 'reports' },
        {
          name: 'Career board',
          href: '/dashboard/guidance/resources',
          icon: 'megaphone',
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        {
          name: 'Career clusters',
          href: '/dashboard/guidance/career-clusters',
          icon: 'layers',
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        {
          name: 'Careers',
          href: '/dashboard/guidance/careers',
          icon: 'briefcase',
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        { name: 'Girls re-entry', href: '/dashboard/guidance/reentry', icon: 'heart' },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
      ],
      sic: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        { name: 'Department CPD plans', href: '/dashboard/sic/cpd-plans', icon: 'audit' },
        { name: 'HIM meetings', href: '/dashboard/sic/him', icon: 'calendar' },
        { name: 'Activity plans', href: '/dashboard/sic/activity-plans', icon: 'reports' },
        { name: 'Analytics', href: '/dashboard/sic/analytics', icon: 'results' },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
      ],
      'senior-teacher': [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        {
          name: 'Primary Classes',
          href: '/dashboard/classes',
          icon: 'classes',
          primaryOnly: true,
        },
        {
          name: 'Primary Allocation',
          href: '/dashboard/senior-teacher/allocation',
          icon: 'subjects',
          primaryOnly: true,
        },
        {
          name: 'Primary Timetable',
          href: '/dashboard/senior-teacher/timetable',
          icon: 'calendar',
          primaryOnly: true,
        },
        {
          name: 'Lesson Plans',
          href: '/dashboard/senior-teacher/lesson-plans',
          icon: 'reports',
          primaryOnly: true,
        },
        {
          name: 'Quizzes',
          href: '/dashboard/senior-teacher/quizzes',
          icon: 'audit',
          primaryOnly: true,
        },
        {
          name: 'Teacher Monitoring',
          href: '/dashboard/senior-teacher/monitoring',
          icon: 'eye',
          primaryOnly: true,
        },
        { name: 'Teaching Studio', href: '/dashboard/teacher/teaching-studio', icon: 'studio' },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: 'audit' },
        {
          name: 'Results',
          href: '/dashboard/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Attendance', href: '/dashboard/attendance', icon: 'attendance' },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
      ],
      teacher: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        { name: 'My Classes', href: '/dashboard/classes', icon: 'classes' },
        { name: 'My Subjects', href: '/dashboard/subjects', icon: 'subjects' },
        {
          name: 'Upload for AI (RAG)',
          href: '/dashboard/teacher/ai-materials',
          icon: 'ai',
        },
        { name: 'Study Materials', href: '/dashboard/teacher/materials', icon: 'upload' },
        { name: 'My Timetable', href: '/dashboard/timetable/teacher', icon: 'calendar' },
        { name: 'Games', href: '/dashboard/teacher/games', icon: 'games' },
        {
          name: 'Teaching Studio',
          href: '/dashboard/teacher/teaching-studio',
          icon: 'studio',
        },
        {
          name: 'Old Syllabus',
          href: '/dashboard/teacher/old-syllabus',
          icon: 'subjects',
          secondaryOnly: true,
        },
        {
          name: 'AI Assistant',
          href: '/dashboard/teacher/chat',
          icon: 'ai',
          requiresPlanFeature: 'ai-tools',
        },
        {
          name: 'AI Quiz Maker',
          href: '/dashboard/teacher/quiz-maker',
          icon: 'ai',
          requiresPlanFeature: 'ai-quiz-maker',
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          icon: 'ai',
          requiresPlanFeature: 'ai-report-comments',
        },
        {
          name: 'AI Story Weaver',
          href: '/dashboard/teacher/story-weaver',
          icon: 'ai',
          requiresPlanFeature: 'ai-story-weaver',
        },
        { name: 'Assessments', href: '/dashboard/teacher/assessments', icon: 'audit' },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          icon: 'audit',
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'School SBA',
          href: '/dashboard/teacher/sba',
          icon: 'audit',
          secondaryOnly: true,
        },
        {
          name: 'Exam scenarios',
          href: '/dashboard/teacher/assessments/ecz?tab=exam',
          icon: 'target',
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'CBC Assessment',
          href: '/dashboard/teacher/assessments/cbc',
          icon: 'audit',
          primaryOnly: true,
          requiresFeature: 'cbc',
        },
        {
          name: 'Results',
          href: '/dashboard/teacher/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        {
          name: 'Exam Analysis',
          href: '/dashboard/teacher/exam-analysis',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        {
          name: 'Primary results',
          href: '/dashboard/teacher/primary-results',
          icon: 'results',
          primaryOnly: true,
        },
        {
          name: 'Primary results analysis',
          href: '/dashboard/teacher/primary-results-analysis',
          icon: 'results',
          primaryOnly: true,
        },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: 'rocket' },
        {
          name: 'Extracurricular',
          href: '/dashboard/teacher/extracurricular',
          icon: 'trophy',
          primaryOnly: true,
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
        { name: 'Attendance', href: '/dashboard/attendance', icon: 'attendance' },
        { name: 'Lesson sessions', href: '/dashboard/attendance/sessions', icon: 'clock' },
        {
          name: 'Payments',
          href: '/dashboard/payments',
          icon: 'billing',
          requiresFeature: 'feeManagement',
        },
        { name: 'Term reports', href: '/dashboard/teacher/term-reports', icon: 'reports' },
      ],
      student: [
        { name: 'Give Feedback', href: '/dashboard/feedback', icon: 'feedback' },
        { name: 'My Class', href: '/dashboard/student/class', icon: 'classes' },
        { name: 'Subjects', href: '/dashboard/student/subjects', icon: 'subjects' },
        { name: 'Materials', href: '/dashboard/student/materials', icon: 'upload' },
        { name: 'My Timetable', href: '/dashboard/timetable/student', icon: 'calendar' },
        { name: 'Assessments', href: '/dashboard/student/assessments', icon: 'audit' },
        { name: 'Flashcards', href: '/dashboard/student/flashcards', icon: 'subjects' },
        {
          name: 'Results',
          href: '/dashboard/student/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        {
          name: 'ECZ Practice',
          href: '/dashboard/student/ecz-practice',
          icon: 'target',
          secondaryOnly: true,
          requiresFeature: 'eczSBA',
        },
        {
          name: 'Mock Examination',
          href: '/dashboard/student/mock-exam',
          icon: 'filecheck',
          secondaryOnly: true,
          requiresFeature: 'mockExams',
        },
        {
          name: 'Career guidance',
          href: '/dashboard/student/learning-path',
          icon: 'briefcase',
          secondaryOnly: true,
          requiresFeature: 'careerGuidance',
        },
        {
          name: 'Study assistant',
          href: '/dashboard/student/study-assistant',
          icon: 'feedback',
        },
        {
          name: 'ZSMS Help',
          href: '/dashboard/student/help',
          icon: 'compass',
        },
        {
          name: 'Code Playground',
          href: '/dashboard/student/code-playground',
          icon: 'code',
          secondaryOnly: true,
          requiresFeature: 'codePlayground',
        },
        { name: 'Innovation Hub', href: '/dashboard/innovation', icon: 'rocket' },
        { name: 'My Activities', href: '/dashboard/student/extracurricular', icon: 'trophy' },
        {
          name: 'Fee statement',
          href: '/dashboard/student/parent-view',
          icon: 'users',
          requiresFeature: 'feeManagement',
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
      ],
      parent: [
        { name: 'My children', href: '/dashboard/parent', icon: 'users' },
        { name: 'Attendance', href: '/dashboard/parent/attendance', icon: 'attendance' },
        {
          name: 'Results',
          href: '/dashboard/parent/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Progress reports', href: '/dashboard/parent/reports', icon: 'reports' },
        {
          name: 'Fees',
          href: '/dashboard/parent/fees',
          icon: 'billing',
          requiresFeature: 'feeManagement',
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
      ],
      guardian: [
        { name: 'My children', href: '/dashboard/parent', icon: 'users' },
        { name: 'Attendance', href: '/dashboard/parent/attendance', icon: 'attendance' },
        {
          name: 'Results',
          href: '/dashboard/parent/results',
          icon: 'results',
          requiresFeature: 'secondaryGrading',
        },
        { name: 'Progress reports', href: '/dashboard/parent/reports', icon: 'reports' },
        {
          name: 'Fees',
          href: '/dashboard/parent/fees',
          icon: 'billing',
          requiresFeature: 'feeManagement',
        },
        { name: 'Privacy', href: '/dashboard/privacy', icon: 'privacy' },
      ],
    }

    const featuresForRole = getSchoolFeatures(schoolReady ? school : null)
    const showHod = featuresForRole.hod && canAccessHodFeatures({ schoolLevel: school?.level })
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
    if (seniorTeacherPortal && hasSeniorTeacherRole && seniorTeacherFeaturesAllowed) {
      navRoleKey = 'senior-teacher'
    }

    let roleItems = roleSpecificItems[navRoleKey] || []
    if (navRoleKey === 'headteacher' && featuresForRole.proprietorDashboard) {
      roleItems = [...roleItems]
      const billingIndex = roleItems.findIndex((item) => item.name === 'Billing')
      const proprietorItem = {
        name: 'Owner Dashboard',
        href: '/dashboard/proprietor',
        icon: 'results',
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
          icon: 'reports',
          requiresFeature: 'feeManagement',
        },
        {
          name: 'Invoices',
          href: '/dashboard/headteacher/fees/invoices',
          icon: 'audit',
          requiresFeature: 'feeManagement',
        },
        {
          name: 'Sibling Groups',
          href: '/dashboard/headteacher/fees/siblings',
          icon: 'users',
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
          icon: 'reports',
        },
        {
          name: 'Grants Tracking',
          href: '/dashboard/headteacher/government/grants',
          icon: 'billing',
        },
        {
          name: 'Gender & Dropout',
          href: '/dashboard/headteacher/government/gender-report',
          icon: 'results',
        },
        {
          name: 'Staff Leave',
          href: '/dashboard/headteacher/government/leave',
          icon: 'attendance',
        },
        {
          name: 'Deployments',
          href: '/dashboard/headteacher/government/deployment',
          icon: 'users',
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
        const href = String(item.href || '').split('?')[0]
        // Hard rule: secondary-only campuses never see Senior Teachers / primary-only nav.
        if (
          schoolReady &&
          (isSecondaryOnly(school) || !hasPrimaryClasses(school)) &&
          (item.primaryOnly ||
            item.requiresPrimary ||
            item.name === 'Senior Teachers' ||
            isPrimaryOnlyPath(href))
        ) {
          return false
        }
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
        { name: 'Register student', href: '/admin/registration?role=student', icon: 'register' },
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
                  <BrandMark
                    size={32}
                    className="h-8 w-8 rounded-lg bg-royalPurple-card2 border border-royalPurple-border"
                    alt={school.name || 'ZSMS'}
                  />
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
                <BrandMark
                  size={32}
                  className="h-8 w-8 rounded-lg bg-royalPurple-card2 border border-royalPurple-border"
                />
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
              <NavIcon
                icon={item.icon}
                size={20}
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
          <NavIcon name="logout" size={20} className="h-5 w-5 shrink-0" />
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
