'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StudentNavBot } from '@/components/student/StudentNavBot'

export default function StudentHelpPage() {
  return (
    <DashboardLayout title="ZSMS Help">
      <div className="max-w-3xl space-y-4">
        <StudentNavBot />
      </div>
    </DashboardLayout>
  )
}
