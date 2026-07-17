'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParentChildSwitcher, useParentChild } from '@/components/parent/ParentChildContext'
import { useParentPortalData } from '@/components/parent/useParentPortalData'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ParentResultsPage() {
  const { studentId } = useParentChild()
  const { data, loading, error } = useParentPortalData(studentId)

  return (
    <DashboardLayout title="Results">
      <div className="space-y-4">
        <ParentChildSwitcher />
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subject results</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.results?.length ? (
                <p className="text-sm text-ink/60">No results published yet.</p>
              ) : (
                <ul className="divide-y divide-ink/10 text-sm">
                  {data.results.map((r, i) => (
                    <li
                      key={`${r.subject}-${r.term}-${r.year}-${i}`}
                      className="py-2 flex justify-between gap-2"
                    >
                      <span>
                        {r.subject}{' '}
                        <span className="text-ink/50">
                          T{r.term} {r.year}
                          {r.resultType ? ` · ${r.resultType}` : ''}
                        </span>
                      </span>
                      <span className="font-medium">
                        {r.score != null ? r.score : '—'}
                        {r.grade ? ` (${r.grade})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
