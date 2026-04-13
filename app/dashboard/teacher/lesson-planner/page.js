'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function TeacherLessonPlannerPage() {
  return (
    <DashboardLayout title="AI Lesson Planner">
      <div className="space-y-4">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-royalPurple-accentTx" />
              Feature Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-royalPurple-text1 font-semibold">AI Lesson Planner</div>
            <div className="text-royalPurple-text2 text-sm">
              Generate lesson plans aligned to the Zambian curriculum, including objectives,
              activities, and assessment.
            </div>
            <Button
              onClick={() => toast.success('You will be notified when this feature is ready')}
            >
              Notify me when ready
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
