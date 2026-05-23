'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Bell } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export function HeadteacherChronicAbsentees() {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['headteacher-attendance-chronic', term],
    queryFn: async () => {
      const res = await api.get('/dashboard/headteacher/attendance/chronic', term ? { term } : {})
      return res?.data
    },
  })

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/dashboard/headteacher/attendance/chronic', {
        term: term || undefined,
        notifyParents: true,
        notifyTeachers: true,
      })
      return res?.data
    },
    onSuccess: (res) => {
      const d = res?.data || res
      toast.success(
        `Alerts sent: ${d.parentsNotified || 0} parent SMS, ${d.teachersNotified || 0} teacher SMS`
      )
      queryClient.invalidateQueries({ queryKey: ['headteacher-attendance-chronic'] })
    },
    onError: (e) => {
      toast.error(e?.message || 'Failed to send chronic alerts')
    },
  })

  const payload = data?.data || data
  const students = Array.isArray(payload?.students) ? payload.students : []
  const threshold = payload?.threshold ?? 5

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-royalPurple-warn" aria-hidden="true" />
          Chronic absence ({threshold}+ per subject)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm text-royalPurple-text1"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Filter by term"
          >
            <option value="">All terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => notifyMutation.mutate()}
            disabled={notifyMutation.isPending || students.length === 0}
          >
            <Bell className="h-4 w-4 mr-1" aria-hidden="true" />
            {notifyMutation.isPending ? 'Sending…' : 'Notify parents & teachers'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-royalPurple-text2 text-sm">Loading chronic absentees…</p>
        ) : students.length === 0 ? (
          <p className="text-royalPurple-text2 text-sm">
            No pupils at {threshold}+ lesson absences for the selected period.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {students.map((s) => (
              <li
                key={`${s.studentId}-${s.subjectId || 'x'}`}
                className="flex justify-between gap-3 rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/60 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-royalPurple-text1">{s.name}</p>
                  <p className="text-royalPurple-text2">
                    {s.class || '—'} · {s.subjectName || 'Subject'}
                  </p>
                </div>
                <span className="font-bold text-royalPurple-dangerTx shrink-0">
                  {s.absenceCount} absences
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
