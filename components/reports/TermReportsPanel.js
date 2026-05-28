'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FileText, CheckCircle, Send } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * HOD / headteacher term report review (Phase 3 P3.4).
 */
export function TermReportsPanel({ canGenerate = false }) {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [studentId, setStudentId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['term-reports', term, year],
    queryFn: async () => {
      const qs = new URLSearchParams({ term: String(term), academicYear: String(year) })
      const res = await fetch(`/api/ai/term-reports?${qs}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      return json.data || []
    },
  })

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/term-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, term, academicYear: year }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      return json.data
    },
    onSuccess: () => {
      toast.success('Term report generated')
      queryClient.invalidateQueries({ queryKey: ['term-reports'] })
      setStudentId('')
    },
    onError: (e) => toast.error(e.message),
  })

  const patchReport = async (id, action) => {
    const res = await fetch(`/api/ai/term-reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
    queryClient.invalidateQueries({ queryKey: ['term-reports'] })
    toast.success(action === 'publish' ? 'Published to parent/student' : 'Updated')
  }

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
            <FileText className="h-5 w-5" />
            AI term reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
            >
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
            <input
              type="number"
              className="w-28 rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>

          {canGenerate ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
                placeholder="Student ID (from roster)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <Button
                onClick={() => generate.mutate()}
                disabled={!studentId.trim() || generate.isPending}
              >
                Generate report
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-royalPurple-text2">Loading reports…</p>
          ) : !data?.length ? (
            <p className="text-sm text-royalPurple-text2">No term reports for this period.</p>
          ) : (
            <ul className="space-y-4">
              {data.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-royalPurple-border/40 p-4 bg-royalPurple-card/40"
                >
                  <div className="flex flex-wrap justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-royalPurple-text1">
                        {r.student?.name || 'Student'} — {r.student?.class || 'Class'}
                      </p>
                      <p className="text-xs text-royalPurple-text3">
                        Term {r.term} · {r.academicYear} · {r.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'DRAFT' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patchReport(r.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      ) : null}
                      {r.status === 'APPROVED' || r.status === 'DRAFT' ? (
                        <Button size="sm" onClick={() => patchReport(r.id, 'publish')}>
                          <Send className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {r.narrative ? (
                    <p className="text-sm text-royalPurple-text2 whitespace-pre-wrap line-clamp-6">
                      {r.narrative}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
