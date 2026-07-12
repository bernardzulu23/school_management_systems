'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { GuidanceDocumentsPanel } from '@/components/guidance/GuidanceDocumentsPanel'

export default function GuidanceDocumentsPage() {
  return (
    <DashboardLayout title="Guidance documents">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Softcopy document vault</h1>
          <p className="text-royalPurple-text2 mt-1 max-w-2xl">
            Keep confidential counselling records, referral letters, consent forms, and programme
            materials as softcopies. Categories follow guidance teacher duties. Sensitive files are
            limited to you; link documents to a pupil or counselling case when needed.
          </p>
        </div>
        <GuidanceDocumentsPanel />
      </div>
    </DashboardLayout>
  )
}
