'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TeacherReportsPage() {
  return (
    <DashboardLayout userRole="teacher" title="Reports">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Teacher Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="text-royalPurple-text2">
            This section is being set up. Use Results and Assessments to enter marks while reports
            are finalized.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
