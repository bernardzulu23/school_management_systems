'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import AIStoryWeaver from '@/components/creative-teaching/AIStoryWeaver'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TeacherStoryWeaverPage() {
  return (
    <DashboardLayout title="AI Story Weaver">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/teacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <AIStoryWeaver />
      </div>
    </DashboardLayout>
  )
}
