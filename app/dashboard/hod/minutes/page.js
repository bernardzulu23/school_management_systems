'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useHodApi } from '@/lib/hod/useHodApi'
import { EmptyModuleState } from '@/components/dashboard/EmptyModuleState'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

export default function DepartmentMinutesPage() {
  const { data, loading, error } = useHodApi('/api/hod/meetings?scope=department&minutes=1')
  const meetings = data?.meetings ?? []

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

        {loading && <p className="text-sm text-royalPurple-text3">Loading minutes…</p>}
        {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}

        {!loading && meetings.length === 0 && (
          <EmptyModuleState
            title="No meeting minutes yet"
            description="Minutes appear here after they are recorded on department meetings."
          />
        )}

        {meetings.map((meeting) => (
          <Card key={meeting.id} variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
                <FileText className="h-5 w-5" />
                {meeting.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-royalPurple-text2">
                {new Date(meeting.date).toLocaleDateString()}
                {meeting.time ? ` at ${meeting.time}` : ''} · {meeting.type}
              </p>
              <p className="text-sm text-royalPurple-text1 whitespace-pre-wrap">
                {meeting.minutesText || 'No minutes body recorded.'}
              </p>
              <p className="text-xs text-royalPurple-text3">
                Status: {meeting.minutes} · Action items: {meeting.actionItems}
              </p>
              <HodFileUpload entityType="meeting" entityId={meeting.id} defaultLabel="minutes" />
            </CardContent>
          </Card>
        ))}

        <Card variant="glass">
          <CardContent className="pt-6">
            <Link href="/dashboard/hod/meetings">
              <Button className="bg-royalPurple-pill text-royalPurple-text1">
                <CalendarDays className="h-4 w-4 mr-2" />
                View all meetings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
