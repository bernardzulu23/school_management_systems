'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AnalyticsFeaturePage } from '@/components/dashboard/AnalyticsFeaturePage'

export default function MoeReportsPage() {
  return (
    <AnalyticsFeaturePage
      title="MOE Reports"
      featureId="moe-reports"
      apiPath="/api/dashboard/moe-reports"
      backHref="/dashboard/headteacher"
      headerAction={
        <a href="/api/dashboard/moe-reports?format=csv" download>
          <Button size="sm">Download enrollment CSV</Button>
        </a>
      }
      renderContent={(data) => (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{data?.school?.name || 'School'} — MOE snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-royalPurple-text2">Enrollment</p>
                <p className="text-2xl font-bold">{data?.summary?.totalEnrollment ?? 0}</p>
              </div>
              <div>
                <p className="text-royalPurple-text2">Teachers</p>
                <p className="text-2xl font-bold">{data?.summary?.totalTeachers ?? 0}</p>
              </div>
              <div>
                <p className="text-royalPurple-text2">Classes</p>
                <p className="text-2xl font-bold">{data?.summary?.totalClasses ?? 0}</p>
              </div>
              <div>
                <p className="text-royalPurple-text2">HODs</p>
                <p className="text-2xl font-bold">{data?.summary?.totalHods ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment by class</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Class</th>
                    <th className="py-2">Learners</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.enrollmentByClass || []).map((row) => (
                    <tr key={row.className} className="border-b border-royalPurple-border/30">
                      <td className="py-2">{row.className}</td>
                      <td className="py-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-xs text-royalPurple-text2">
            Generated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'} · Use
            CSV export for district EMIS submissions.
          </p>
        </div>
      )}
    />
  )
}
