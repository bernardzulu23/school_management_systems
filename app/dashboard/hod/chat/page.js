'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import ChatPanel from '@/components/chat/ChatPanel'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function HodChatPage() {
  return (
    <DashboardLayout title="AI Assistant">
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/hod">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <ChatPanel mode="generative" />
      </div>
    </DashboardLayout>
  )
}
