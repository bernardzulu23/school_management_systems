'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { PrimaryOnlyRouteGuard } from '@/components/auth/PrimaryOnlyRouteGuard'
import { listPrimaryResultTypes } from '@/lib/results/resultTypes'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import toast from 'react-hot-toast'

export default function TeacherPrimaryResultsAnalysisPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [term, setTerm] = useState('Term 1')
  const [resultType, setResultType] = useState('ALL')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const types = listPrimaryResultTypes()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year), term })
      if (resultType !== 'ALL') params.set('resultType', resultType)
      const res = await sessionFetch(
        `/api/dashboard/teacher/primary-results-analysis?${params.toString()}`
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load')
      setData(json.data || null)
    } catch (e) {
      toast.error(e?.message || 'Failed to load analysis')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [resultType, term, year])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardLayout title="Primary results analysis">
      <PrimaryOnlyRouteGuard>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <h1 className="text-2xl font-bold text-royalPurple-text1">My primary results analysis</h1>
          <p className="text-sm text-royalPurple-text3">
            Termly analysis for subjects and classes you teach (week 2, week 7, end of term).
          </p>

          <div className="flex flex-wrap gap-3 items-end">
            <select className="zsms-select" value={term} onChange={(e) => setTerm(e.target.value)}>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
            <input
              className="zsms-input w-28"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
            />
            <select
              className="zsms-select"
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
            >
              <option value="ALL">All types</option>
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Button onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>

          {data ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Entries</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold">
                    {data.summary?.totalEntries ?? 0}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pupils</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold">
                    {data.summary?.uniqueStudents ?? 0}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Average</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold">
                    {data.summary?.averageScore ?? 0}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {(data.subjectBreakdown || []).map((row) => (
                      <li key={row.subjectId} className="flex justify-between gap-4">
                        <span>{row.subjectName}</span>
                        <span>
                          n={row.count} · avg {row.average}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </PrimaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
