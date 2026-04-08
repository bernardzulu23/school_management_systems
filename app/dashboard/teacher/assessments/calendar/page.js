'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Calendar } from 'lucide-react'

export default function TeacherAssessmentCalendarPage() {
  return (
    <DashboardLayout userRole="teacher" title="Assessment Calendar">
      <div className="space-y-6">
        <Button asChild variant="outline">
          <Link href="/dashboard/teacher/assessments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Link>
        </Button>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assessment Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="text-royalPurple-text2">
            Calendar view is being enabled. Use the Assessment Management page to view upcoming and
            completed assessments.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
