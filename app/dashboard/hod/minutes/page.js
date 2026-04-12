'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default function DepartmentMinutesPage() {
  return (
    <DashboardLayout title="Department Minutes">
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
              <FileText className="h-5 w-5" />
              Minutes & Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-royalPurple-text2 text-sm">
                Store department meeting minutes, action points, and follow-ups for Term 1–3.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/hod/meetings">
                  <Button className="bg-royalPurple-pill text-royalPurple-text1">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    View Meetings
                  </Button>
                </Link>
                <Button variant="outline">Create Minutes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
