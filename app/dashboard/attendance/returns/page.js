'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Download, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'

function currentMonthKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatCell(value) {
  return typeof value === 'number' ? value : 0
}

export default function AttendanceReturnsPage() {
  const [month, setMonth] = useState(currentMonthKey())
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance-returns', month],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('month', month)
      const res = await fetch(`/api/attendance/stats?${params.toString()}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load attendance returns')
      return json?.data || null
    },
  })

  const rows = useMemo(() => (Array.isArray(data?.classes) ? data.classes : []), [data])

  const exportCsv = () => {
    const params = new URLSearchParams()
    params.set('month', month)
    params.set('format', 'csv')
    window.open(`/api/attendance/stats?${params.toString()}`, '_blank')
  }

  const submitMonthlyReturn = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendance/returns/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ month }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to submit return')
      toast.success(`Monthly return submitted for ${month}`)
      window.location.reload()
    } catch (e) {
      toast.error(e?.message || 'Failed to submit return')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout title="Attendance Returns">
      <div className="space-y-6">
        <TeacherCompliancePanel domain="attendance" />
        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Monthly Returns</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <label className="block text-sm text-royalPurple-text2 mb-2">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card text-royalPurple-text1"
              />
            </div>
            <div className="flex-1" />
            <Button
              onClick={exportCsv}
              className="bg-royalPurple-accent hover:bg-royalPurple-accent/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={submitMonthlyReturn}
              disabled={submitting}
              variant="outline"
              className="border-royalPurple-accent text-royalPurple-accent"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting…' : 'Mark Submitted to Higher Office'}
            </Button>
          </CardContent>
        </Card>

        {data?.submission ? (
          <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Submission Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-royalPurple-text2">
              Submitted on {new Date(data.submission.submittedAt).toLocaleString()} by{' '}
              <span className="font-semibold text-royalPurple-text1">
                {data.submission.submittedBy?.name ||
                  data.submission.submittedBy?.email ||
                  'Unknown'}
              </span>
              .
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900">Submission Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-800">
              This month has not yet been marked as submitted to the higher office.
            </CardContent>
          </Card>
        )}

        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Summary by Class & Gender</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-royalPurple-text2">Loading...</div>
            ) : isError ? (
              <div className="text-royalPurple-text2">Failed to load attendance returns.</div>
            ) : rows.length === 0 ? (
              <div className="text-royalPurple-text2">No data for this month.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-royalPurple-text2">
                      <th className="p-2">Class</th>
                      <th className="p-2">Gender</th>
                      <th className="p-2">Enrolled</th>
                      <th className="p-2">Present</th>
                      <th className="p-2">Absent</th>
                      <th className="p-2">Late</th>
                      <th className="p-2">Excused</th>
                      <th className="p-2">Total Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.flatMap((c) =>
                      ['male', 'female', 'unknown'].map((g) => (
                        <tr
                          key={`${c.classId}:${g}`}
                          className="border-t border-royalPurple-border/40 text-royalPurple-text1"
                        >
                          <td className="p-2">{c.className}</td>
                          <td className="p-2 capitalize">{g}</td>
                          <td className="p-2">{formatCell(c.enrolled?.[g])}</td>
                          <td className="p-2">{formatCell(c.present?.[g])}</td>
                          <td className="p-2">{formatCell(c.absent?.[g])}</td>
                          <td className="p-2">{formatCell(c.late?.[g])}</td>
                          <td className="p-2">{formatCell(c.excused?.[g])}</td>
                          <td className="p-2">{formatCell(c.totalRecords?.[g])}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
