'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import UserManagement from '@/components/dashboard/UserManagement'

export default function UsersPage() {
  return (
    <DashboardLayout title="User Management">
      <UserManagement />
    </DashboardLayout>
  )
}
