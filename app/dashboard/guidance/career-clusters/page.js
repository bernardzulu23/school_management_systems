'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import CareerClustersAdminPage from '@/app/admin/career-clusters/page'

export default function GuidanceCareerClustersPage() {
  return (
    <DashboardLayout title="Career clusters">
      <CareerClustersAdminPage />
    </DashboardLayout>
  )
}
