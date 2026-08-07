'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { PrimaryOnlyRouteGuard } from '@/components/auth/PrimaryOnlyRouteGuard'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { listPrimaryResultTypes } from '@/lib/results/resultTypes'
import toast from 'react-hot-toast'

function AnalysisPanel({ apiPath, title }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [term, setTerm] = useState('Term 1')
  const [resultType, setResultType] = useState('ALL')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year: String(year),
        term,
      })
      if (resultType && resultType !== 'ALL') params.set('resultType', resultType)
      const res = await sessionFetch(`${apiPath}?${params.toString()}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load analysis')
      setData(json.data || null)
    } catch (e) {
      toast.error(e?.message || 'Failed to load analysis')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [apiPath, resultType, term, year])

  useEffect(() => {
    load()
  }, [load])

  const types = listPrimaryResultTypes()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-royalPurple-text3 mb-1">Term</label>
          <select className="zsms-select" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-royalPurple-text3 mb-1">Year</label>
          <input
            className="zsms-input w-28"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
          />
        </div>
        <div>
          <label className="block text-xs text-royalPurple-text3 mb-1">Assessment</label>
          <select
            className="zsms-select"
            value={resultType}
            onChange={(e) => setResultType(e.target.value)}
          >
            <option value="ALL">All primary types</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      <h2 className="text-lg font-semibold text-royalPurple-text1">{title}</h2>

      {data ? (
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
      ) : null}

      {data?.typeBreakdown?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By assessment type</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.typeBreakdown.map((row) => (
                <li key={row.resultType} className="flex justify-between gap-4">
                  <span>{row.label}</span>
                  <span>
                    n={row.count} · avg {row.average}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {data?.subjectBreakdown?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By subject</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.subjectBreakdown.map((row) => (
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
      ) : null}
    </div>
  )
}

export default function HeadteacherPrimaryResultsAnalysisPage() {
  return (
    <DashboardLayout title="Primary results analysis">
      <PrimaryOnlyRouteGuard redirectTo="/dashboard/headteacher">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-royalPurple-text1 mb-2">
            Termly primary results analysis
          </h1>
          <p className="text-sm text-royalPurple-text3 mb-6">
            School-wide analysis for week 2, week 7, and end-of-term assessments.
          </p>
          <AnalysisPanel
            apiPath="/api/dashboard/primary-results/analysis"
            title="School-wide summary"
          />
        </div>
      </PrimaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
