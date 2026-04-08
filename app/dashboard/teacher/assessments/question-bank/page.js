'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ClipboardList } from 'lucide-react'

export default function TeacherQuestionBankPage() {
  return (
    <DashboardLayout userRole="teacher" title="Question Bank">
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
              <ClipboardList className="h-5 w-5" />
              Question Bank
            </CardTitle>
          </CardHeader>
          <CardContent className="text-royalPurple-text2">
            Question bank is being enabled. For now, use Assessments to create tests and enter
            results.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
