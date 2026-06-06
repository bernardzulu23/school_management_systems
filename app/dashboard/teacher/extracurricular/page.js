'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StaffRouteGuard } from '@/components/auth/StaffRouteGuard'
import { ExtracurricularActivitiesPanel } from '@/components/extracurricular/ExtracurricularActivitiesPanel'
import { Trophy } from 'lucide-react'

export default function TeacherExtracurricularPage() {
  return (
    <StaffRouteGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-royalPurple-text1">
              <Trophy className="size-7" />
              Extracurricular Activities
            </h1>
            <p className="mt-1 text-sm text-royalPurple-text2">
              Create clubs, sports, and events. Register learners from your school database.
            </p>
          </div>
          <ExtracurricularActivitiesPanel />
        </div>
      </DashboardLayout>
    </StaffRouteGuard>
  )
}
