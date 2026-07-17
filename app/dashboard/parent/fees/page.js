'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParentChildSwitcher, useParentChild } from '@/components/parent/ParentChildContext'
import { useParentPortalData } from '@/components/parent/useParentPortalData'
import LoadingSpinner from '@/components/LoadingSpinner'
import { FeatureGate } from '@/components/FeatureGate'

export default function ParentFeesPage() {
  const { studentId } = useParentChild()
  const { data, loading, error } = useParentPortalData(studentId)

  return (
    <DashboardLayout title="Fees">
      <FeatureGate
        featureId="parent-portal"
        fallback={
          <p className="text-sm text-ink/70 p-4">
            Fee statements are available for private schools with fee management enabled.
          </p>
        }
      >
        <div className="space-y-4">
          <ParentChildSwitcher />
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Balance</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    Total due: <strong>{Number(data?.fees?.totalDue || 0).toLocaleString()}</strong>
                  </p>
                  <p>
                    Total paid:{' '}
                    <strong>{Number(data?.fees?.totalPaid || 0).toLocaleString()}</strong>
                  </p>
                  <p>
                    Balance: <strong>{Number(data?.fees?.balance || 0).toLocaleString()}</strong>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {!data?.fees?.invoices?.length ? (
                    <p className="text-sm text-ink/60">No invoices yet.</p>
                  ) : (
                    <ul className="divide-y divide-ink/10 text-sm">
                      {data.fees.invoices.map((inv) => (
                        <li key={inv.id} className="py-2 flex justify-between gap-2">
                          <span>
                            {inv.schedule?.name || 'Invoice'}{' '}
                            <span className="text-ink/50">
                              {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ''}
                            </span>
                          </span>
                          <span className="font-medium">
                            {Number(inv.netAmount || 0).toLocaleString()} / paid{' '}
                            {Number(inv.amountPaid || 0).toLocaleString()}
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
      </FeatureGate>
    </DashboardLayout>
  )
}
