'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import InteractiveWhiteboard from '@/components/creative-teaching/InteractiveWhiteboard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TeacherWhiteboardPage() {
  return (
    <DashboardLayout title="Interactive Whiteboard">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/teacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div style={{ height: 'calc(100vh - 220px)' }}>
          <InteractiveWhiteboard height="100%" />
        </div>
      </div>
    </DashboardLayout>
  )
}
