'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import TeacherBulkUpload from '@/components/admin/TeacherBulkUpload'

export default function TeacherBulkUploadPage() {
  return (
    <DashboardLayout title="Bulk Teacher Upload">
      <TeacherBulkUpload />
    </DashboardLayout>
  )
}
