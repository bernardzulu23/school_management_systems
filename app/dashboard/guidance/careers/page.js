'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import CareersAdminPage from '@/app/admin/careers/page'

export default function GuidanceCareersPage() {
  return (
    <DashboardLayout title="Careers">
      <CareersAdminPage />
    </DashboardLayout>
  )
}
