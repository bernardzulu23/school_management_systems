'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Users, Calendar, Clock, CheckCircle, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useHodApi } from '@/lib/hod/useHodApi'
import { EmptyModuleState } from '@/components/dashboard/EmptyModuleState'
import { HodScheduleMeetingDialog } from '@/components/hod/HodScheduleMeetingDialog'
import { HodFileUpload } from '@/components/hod/HodFileUpload'
import toast from 'react-hot-toast'

export default function StaffMeetingsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [updatingId, setUpdatingId] = useState(null)
  const { data, loading, error, reload } = useHodApi('/api/hod/meetings?scope=staff')
  const meetingsData = data ?? { upcoming: [], completed: [] }

  const list = meetingsData[activeTab] ?? []
  const hasMeetings = meetingsData.upcoming.length > 0 || meetingsData.completed.length > 0

  const completeMeeting = async (id) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/hod/meetings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed', minutesStatus: 'draft' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to update meeting')
      toast.success('Meeting marked complete')
      await reload()
    } catch (e) {
      toast.error(e.message || 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteMeeting = async (id) => {
    if (!confirm('Delete this meeting and its attached files?')) return
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/hod/meetings/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to delete meeting')
      toast.success('Meeting deleted')
      await reload()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    } finally {
      setUpdatingId(null)
    }
  }

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
                <div className="flex items-start justify-between gap-3">
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
                  <div className="flex items-center gap-2 shrink-0">
                    {meeting.status === 'scheduled' ? (
                      <Button
                        size="sm"
                        disabled={updatingId === meeting.id}
                        onClick={() => completeMeeting(meeting.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    ) : (
                      <Link href="/dashboard/hod/minutes">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-1" />
                          Minutes
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === meeting.id}
                      onClick={() => deleteMeeting(meeting.id)}
                      title="Delete meeting"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
