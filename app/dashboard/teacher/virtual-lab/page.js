'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import VirtualScienceLab from '@/components/creative-teaching/VirtualScienceLab'
import { ArrowLeft } from 'lucide-react'

export default function TeacherVirtualLabPage() {
  return (
    <DashboardLayout title="Virtual Science Lab">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/teacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <VirtualScienceLab />
      </div>
    </DashboardLayout>
  )
}
