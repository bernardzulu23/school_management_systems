'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import CodePlayground from '@/components/creative-teaching/CodePlayground'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function StudentCodePlaygroundPage() {
  return (
    <DashboardLayout title="Code Playground">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/student">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <CodePlayground embedded />
      </div>
    </DashboardLayout>
  )
}
