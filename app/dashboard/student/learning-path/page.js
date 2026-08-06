'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { CareerExplorer } from '@/components/careers/CareerExplorer'
import { SecondaryOnlyRouteGuard } from '@/components/auth/SecondaryOnlyRouteGuard'

export default function LearningPathPage() {
  return (
    <SecondaryOnlyRouteGuard redirectTo="/dashboard/student">
      <DashboardLayout title="Career guidance">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-royalPurple-text1">
              Career guidance
            </h1>
            <p className="text-royalPurple-text2 mt-1">
              Explore career clusters and pathways published by your school — subjects to study,
              courses, colleges, and salary expectations.
            </p>
          </div>
          <CareerExplorer embedded />
        </div>
      </DashboardLayout>
    </SecondaryOnlyRouteGuard>
  )
}
