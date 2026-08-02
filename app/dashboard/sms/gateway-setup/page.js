'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

/** Per-school pairing wizard removed — shared gateway is platform-managed. */
export default function SmsGatewaySetupRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/sms')
  }, [router])

  return (
    <DashboardLayout title="SMS Gateway setup">
      <div className="max-w-3xl mx-auto px-4 py-12 text-sm text-royalPurple-text2">
        Gateway pairing is managed by platform admins. Redirecting to SMS status…
      </div>
    </DashboardLayout>
  )
}
