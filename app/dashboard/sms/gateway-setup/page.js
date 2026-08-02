'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import SMSGatewaySetup from '@/components/sms/SMSGatewaySetup'

export default function SmsGatewaySetupPage() {
  return (
    <DashboardLayout title="SMS Gateway setup">
      <div className="bg-royalPurple-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-royalPurple-text1">SMS Gateway setup</h1>
          <p className="text-royalPurple-text2">
            Pair the ZSMS Gateway Android app with your school (platform-issued token).
          </p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SMSGatewaySetup />
      </div>
    </DashboardLayout>
  )
}
