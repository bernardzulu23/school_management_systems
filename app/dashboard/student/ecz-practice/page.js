'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function StudentECZPracticePage() {
  return (
    <DashboardLayout title="ECZ Practice">
      <div className="space-y-4">
        <Link href="/dashboard/student">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-royalPurple-accentTx" />
              Feature Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-royalPurple-text1 font-semibold">ECZ Exam Practice</div>
            <div className="text-royalPurple-text2 text-sm">
              Practice Grade 9 and Grade 12 ECZ-style questions with instant feedback and progress
              tracking.
            </div>
            <Button
              onClick={() => toast.success('You will be notified when this feature is ready')}
            >
              Notify me when ready
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
