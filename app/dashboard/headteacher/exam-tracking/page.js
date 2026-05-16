'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsFeaturePage } from '@/components/dashboard/AnalyticsFeaturePage'

export default function ExamTrackingPage() {
  return (
    <AnalyticsFeaturePage
      title="ECZ Exam Tracking"
      featureId="ecz-tracking"
      apiPath="/api/dashboard/exam-tracking"
      backHref="/dashboard/headteacher"
      renderContent={(data) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>School-wide estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-royalPurple-text1">
                {data?.estimatedPassRate ?? 0}%
              </p>
              <p className="text-sm text-royalPurple-text2 mt-2">
                Estimated pass rate (scores ≥ 50%) from {data?.totalRecords ?? 0} result records.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>By term</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Term</th>
                    <th className="py-2">Avg %</th>
                    <th className="py-2">Est. pass</th>
                    <th className="py-2">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.termBreakdown || []).map((row) => (
                    <tr key={row.term} className="border-b border-royalPurple-border/30">
                      <td className="py-2">{row.term}</td>
                      <td className="py-2">{row.averageScore}%</td>
                      <td className="py-2">{row.estimatedPassRate}%</td>
                      <td className="py-2">{row.records}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.termBreakdown?.length && (
                <p className="text-royalPurple-text2 text-sm">No results recorded yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>By class</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Class</th>
                    <th className="py-2">Learners</th>
                    <th className="py-2">Avg %</th>
                    <th className="py-2">Est. pass</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.classBreakdown || []).map((row) => (
                    <tr key={row.className} className="border-b border-royalPurple-border/30">
                      <td className="py-2">{row.className}</td>
                      <td className="py-2">{row.learners}</td>
                      <td className="py-2">{row.averageScore}%</td>
                      <td className="py-2">{row.estimatedPassRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    />
  )
}
