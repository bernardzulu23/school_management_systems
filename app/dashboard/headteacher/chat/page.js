'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import ChatPanel from '@/components/chat/ChatPanel'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function HeadteacherChatPage() {
  return (
    <DashboardLayout title="Analytics Assistant">
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/headteacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <ChatPanel mode="headteacher" />
      </div>
    </DashboardLayout>
  )
}
