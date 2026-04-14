'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import AILessonPlanner from '@/components/creative/AILessonPlanner'

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
        <FeatureGate featureId="ai-lesson-planner">
          <AILessonPlanner />
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
