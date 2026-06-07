'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthHasHydrated } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'
import { TIMETABLE_CANONICAL } from '@/lib/timetable/pipeline'

export default function TimetablePage() {
  const router = useRouter()
  const hydrated = useAuthHasHydrated()
  const user = useAuth((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ assignments: 0, timeSlots: 0 })
  const term = getDefaultTerm()
  const academicYear = getDefaultAcademicYear()

  const role = useMemo(() => String(user?.role || '').toLowerCase(), [user?.role])
  const roleRoute = useMemo(() => {
    if (role === 'student') return '/dashboard/timetable/student'
    if (role === 'teacher') return '/dashboard/timetable/teacher'
    if (role === 'hod' || role === 'head of department') return '/dashboard/hod/timetable'
    if (['headteacher', 'admin', 'administrator', 'superadmin'].includes(role))
      return TIMETABLE_CANONICAL.headteacherUi
    return '/dashboard'
  }, [role])
  const canManage = useMemo(
    () => ['headteacher', 'admin', 'administrator', 'superadmin'].includes(role),
    [role]
  )

  useEffect(() => {
    if (!hydrated) return
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ term, academicYear, status: 'published' })
        const res = await fetch(`/api/timetable/view?${qs}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to load timetable status')
        setStatus({
          assignments: Array.isArray(json?.assignments) ? json.assignments.length : 0,
          timeSlots: Array.isArray(json?.timeSlots) ? json.timeSlots.length : 0,
        })
      } catch (e) {
        toast.error(e?.message || 'Failed to load timetable status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [hydrated, term, academicYear])

  return (
    <DashboardLayout title="Timetable">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timetable Hub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-royalPurple-text2">
              Active term: <span className="font-semibold">{term}</span> · {academicYear}
            </p>
            <p className="text-sm text-royalPurple-text2">
              Published lessons: {loading ? '…' : status.assignments} · Time slots:{' '}
              {loading ? '…' : status.timeSlots}
            </p>
            {canManage ? (
              <p className="text-sm text-royalPurple-text3">
                Generate and publish timetables from the Master Timetable studio (HOD allocations →
                generate → publish).
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push(roleRoute)}>Open My Timetable</Button>
              {canManage ? (
                <Button
                  variant="outline"
                  onClick={() => router.push(TIMETABLE_CANONICAL.headteacherUi)}
                >
                  Open Master Timetable
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => router.refresh()}
                className="inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
