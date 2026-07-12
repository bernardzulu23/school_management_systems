'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export default function NotificationsPage() {
  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-3xl">
        <NotificationCenter />
      </div>
    </DashboardLayout>
  )
}
