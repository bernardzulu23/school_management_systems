'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParentChildSwitcher, useParentChild } from '@/components/parent/ParentChildContext'
import { useParentPortalData } from '@/components/parent/useParentPortalData'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'
import { BarChart3, CreditCard, FileText, UserCheck } from 'lucide-react'

export default function ParentOverviewPage() {
  const { studentId, loading: kidsLoading, error: kidsError } = useParentChild()
  const { data, loading, error } = useParentPortalData(studentId)

  return (
    <DashboardLayout title="Parent portal">
      <div className="space-y-4">
        <ParentChildSwitcher />
        {kidsLoading || loading ? (
          <LoadingSpinner />
        ) : kidsError || error ? (
          <p className="text-sm text-red-700">{kidsError || error}</p>
        ) : !studentId ? (
          <Card>
            <CardContent className="pt-6 text-sm text-ink/70">
              When the school invites you and you accept, your children will appear here.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{data?.student?.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  Class: <strong>{data?.student?.class || '—'}</strong>
                </p>
                {data?.student?.examNumber ? (
                  <p>
                    Exam number: <strong>{data.student.examNumber}</strong>
                  </p>
                ) : null}
                <p>
                  Attendance rate:{' '}
                  <strong>
                    {data?.attendance?.rate != null ? `${data.attendance.rate}%` : '—'}
                  </strong>
                </p>
                <p>
                  Fee balance:{' '}
                  <strong>
                    {data?.fees?.balance != null ? Number(data.fees.balance).toLocaleString() : '—'}
                  </strong>
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  href: '/dashboard/parent/attendance',
                  label: 'Attendance',
                  icon: UserCheck,
                },
                { href: '/dashboard/parent/results', label: 'Results', icon: BarChart3 },
                {
                  href: '/dashboard/parent/reports',
                  label: 'Progress reports',
                  icon: FileText,
                },
                { href: '/dashboard/parent/fees', label: 'Fees', icon: CreditCard },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded border border-ink/15 bg-paper p-4 hover:border-accent"
                >
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent results</CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.results?.length ? (
                  <p className="text-sm text-ink/60">No results yet.</p>
                ) : (
                  <ul className="divide-y divide-ink/10 text-sm">
                    {data.results.slice(0, 8).map((r, i) => (
                      <li key={`${r.subject}-${i}`} className="py-2 flex justify-between gap-2">
                        <span>
                          {r.subject}{' '}
                          <span className="text-ink/50">
                            T{r.term} {r.year}
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
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
