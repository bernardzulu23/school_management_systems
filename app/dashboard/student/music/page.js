'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import DigitalMusicComposer from '@/components/creative-teaching/DigitalMusicComposer'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function StudentMusicPage() {
  return (
    <DashboardLayout title="Digital Music Composer">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/student">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <DigitalMusicComposer />
      </div>
    </DashboardLayout>
  )
}
