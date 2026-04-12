'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, BarChart3, UserCheck } from 'lucide-react'
import Link from 'next/link'

export default function MonitoringPage() {
  return (
    <DashboardLayout title="Monitoring File">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/hod"
            className="inline-flex items-center gap-2 text-royalPurple-text2 hover:text-royalPurple-text1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to HOD Dashboard
          </Link>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
              <UserCheck className="h-5 w-5" />
              Teacher Monitoring Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-royalPurple-text2 text-sm">
                Track Schemes of Work, Records of Work, and CPD progress for teachers in your
                department.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/hod/teacher-performance">
                  <Button className="bg-royalPurple-pill text-royalPurple-text1">
                    Teacher Performance
                  </Button>
                </Link>
                <Link href="/dashboard/hod/cpd">
                  <Button variant="outline">CPD File</Button>
                </Link>
                <Link href="/dashboard/hod/exam-analysis">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Exam Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
