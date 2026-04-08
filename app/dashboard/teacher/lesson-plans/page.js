'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, PenTool } from 'lucide-react'

export default function TeacherLessonPlansPage() {
  return (
    <DashboardLayout userRole="teacher" title="Lesson Plans">
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
              <PenTool className="h-5 w-5" />
              Lesson Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="text-royalPurple-text2">
            Lesson planning is being enabled for your school. This page no longer 404s and will be
            wired to the lesson plan module next.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
