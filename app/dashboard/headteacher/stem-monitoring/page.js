'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsFeaturePage } from '@/components/dashboard/AnalyticsFeaturePage'

export default function StemMonitoringPage() {
  return (
    <AnalyticsFeaturePage
      title="STEM Performance"
      featureId="stem-monitoring"
      apiPath="/api/dashboard/stem-performance"
      backHref="/dashboard/headteacher"
      renderContent={(data) => (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-royalPurple-text2">
                {data?.totalStemRecords ?? 0} STEM result records ·{' '}
                <span className="font-semibold text-amber-600">
                  {data?.flaggedCount ?? 0} subjects need intervention
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mathematics, Science & ICT</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Subject</th>
                    <th className="py-2">Avg %</th>
                    <th className="py-2">Records</th>
                    <th className="py-2">Classes</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.subjects || []).map((row) => (
                    <tr key={row.subject} className="border-b border-royalPurple-border/30">
                      <td className="py-2 font-medium">{row.subject}</td>
                      <td className="py-2">{row.averageScore}%</td>
                      <td className="py-2">{row.records}</td>
                      <td className="py-2">{row.classes}</td>
                      <td className="py-2">
                        {row.needsIntervention ? (
                          <span className="text-amber-600 font-medium">Intervention</span>
                        ) : (
                          <span className="text-green-600">On track</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.subjects?.length && (
                <p className="text-royalPurple-text2 text-sm">
                  Add Mathematics, Science, or ICT results to see STEM analytics.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    />
  )
}
