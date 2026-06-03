'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Users, Calendar, Clock, CheckCircle, FileText, Eye } from 'lucide-react'
import Link from 'next/link'
import { useHodApi } from '@/lib/hod/useHodApi'
import { EmptyModuleState } from '@/components/dashboard/EmptyModuleState'
import { HodScheduleMeetingDialog } from '@/components/hod/HodScheduleMeetingDialog'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

export default function StaffMeetingsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const { data, loading, error, reload } = useHodApi('/api/hod/meetings?scope=staff')
  const meetingsData = data ?? { upcoming: [], completed: [] }

  const list = meetingsData[activeTab] ?? []
  const hasMeetings = meetingsData.upcoming.length > 0 || meetingsData.completed.length > 0

  return (
    <DashboardLayout title="Staff Meeting File">
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

        {loading && <p className="text-sm text-royalPurple-text3">Loading staff meetings…</p>}
        {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}

        {!loading && !hasMeetings && (
          <EmptyModuleState
            title="No staff meetings recorded"
            description="Staff-wide meetings and briefings will appear here once scheduled in the system."
          />
        )}

        <div className="flex justify-end">
          <HodScheduleMeetingDialog meetingScope="staff" onCreated={reload} />
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
              <Users className="h-5 w-5" />
              Staff Meetings
            </CardTitle>
            <div className="flex space-x-2 mt-4">
              <Button
                variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming ({meetingsData.upcoming.length})
              </Button>
              <Button
                variant={activeTab === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('completed')}
              >
                Completed ({meetingsData.completed.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {list.map((meeting) => (
              <div key={meeting.id} className="border border-royalPurple-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-royalPurple-text1">{meeting.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-royalPurple-text2 mt-2">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {meeting.duration}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {meeting.status}
                      </span>
                    </div>
                    {meeting.agenda?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {meeting.agenda.map((item, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-royalPurple-card2 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                {meeting.status === 'completed' && (
                  <p className="text-sm text-royalPurple-text3 mt-2 flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Minutes: {meeting.minutes}
                  </p>
                )}
                <HodFileUpload
                  entityType="meeting"
                  entityId={meeting.id}
                  defaultLabel="schedule"
                  compact
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
