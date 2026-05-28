'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StudyAssistant } from '@/components/student/StudyAssistant'

export default function StudyAssistantPage() {
  return (
    <DashboardLayout title="Study assistant">
      <StudyAssistant />
    </DashboardLayout>
  )
}
