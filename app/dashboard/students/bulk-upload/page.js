'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import StudentBulkUpload from '@/components/admin/StudentBulkUpload'

export default function StudentBulkUploadPage() {
  return (
    <DashboardLayout title="Bulk Student Upload">
      <StudentBulkUpload />
    </DashboardLayout>
  )
}
