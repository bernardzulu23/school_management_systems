'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { TermReportsPanel } from '@/components/reports/TermReportsPanel'

export default function HodTermReportsPage() {
  return (
    <DashboardLayout title="Term reports">
      <TermReportsPanel canGenerate />
    </DashboardLayout>
  )
}
