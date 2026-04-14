'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

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

  return (
    <DashboardLayout title="Attendance Returns">
      <div className="space-y-6">
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
          </CardContent>
        </Card>

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
