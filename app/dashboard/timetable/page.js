'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthHasHydrated } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, RefreshCw, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'

export default function TimetablePage() {
  const router = useRouter()
  const hydrated = useAuthHasHydrated()
  const user = useAuth((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ assignments: 0, timeSlots: 0 })
  const [runningSolver, setRunningSolver] = useState(false)
  const term = getDefaultTerm()
  const academicYear = getDefaultAcademicYear()

  const role = useMemo(() => String(user?.role || '').toLowerCase(), [user?.role])
  const roleRoute = useMemo(() => {
    if (role === 'student') return '/dashboard/timetable/student'
    if (role === 'teacher') return '/dashboard/timetable/teacher'
    if (role === 'hod' || role === 'head of department') return '/dashboard/hod/timetable'
    if (['headteacher', 'admin', 'administrator', 'superadmin'].includes(role))
      return '/dashboard/headteacher/timetable'
    return '/dashboard'
  }, [role])
  const canGenerate = useMemo(
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

  async function runGreedyGenerate() {
    if (!canGenerate || runningSolver) return
    setRunningSolver(true)
    try {
      const genRes = await fetch('/api/timetable/solver/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ term, academicYear, name: `auto-${Date.now()}`, maxSolutions: 1 }),
      })
      const genJson = await genRes.json().catch(() => ({}))
      if (!genRes.ok)
        throw new Error(genJson?.error || genJson?.message || 'Greedy generation failed')

      const pubRes = await fetch('/api/timetable/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ term, academicYear }),
      })
      const pubJson = await pubRes.json().catch(() => ({}))
      if (!pubRes.ok) throw new Error(pubJson?.error || pubJson?.message || 'Publish failed')

      toast.success('Greedy timetable generated and published')
      setStatus((s) => ({ ...s, assignments: Math.max(s.assignments, 1) }))
    } catch (e) {
      toast.error(e?.message || 'Failed to generate timetable')
    } finally {
      setRunningSolver(false)
    }
  }

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
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push(roleRoute)}>Open My Timetable</Button>
              {canGenerate ? (
                <Button
                  variant="outline"
                  onClick={runGreedyGenerate}
                  disabled={runningSolver}
                  className="inline-flex items-center"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {runningSolver ? 'Generating…' : 'Generate with Greedy Solver'}
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
