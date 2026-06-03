'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { useHodApi } from '@/lib/hod/useHodApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Group,
  Plus,
  Calendar,
  Clock,
  Users,
  FileText,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { EmptyModuleState } from '@/components/dashboard/EmptyModuleState'
import { HodScheduleMeetingDialog } from '@/components/hod/HodScheduleMeetingDialog'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

export default function MeetingFilesPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const { data, loading, error, reload } = useHodApi('/api/hod/meetings?scope=department')
  const meetingsData = data ?? { upcoming: [], completed: [] }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-royalPurple-accentTx" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'cancelled':
        return <Clock className="h-4 w-4 text-royalPurple-dangerTx" />
      default:
        return <Calendar className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'completed':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'cancelled':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Department':
        return 'bg-royalPurple-pill text-royalPurple-pillTx'
      case 'Academic':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'Professional Development':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'Administrative':
        return 'bg-accent/20 text-g-800'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const meetingStats = {
    totalMeetings: meetingsData.upcoming.length + meetingsData.completed.length,
    upcomingMeetings: meetingsData.upcoming.length,
    completedMeetings: meetingsData.completed.length,
    pendingActionItems: meetingsData.completed.reduce(
      (sum, meeting) => sum + (meeting.actionItems || 0),
      0
    ),
  }

  const hasMeetings = meetingsData.upcoming.length > 0 || meetingsData.completed.length > 0

  return (
    <DashboardLayout title="Meeting Files">
      <div className="space-y-6">
        {loading && <p className="text-sm text-royalPurple-text3">Loading meetings…</p>}
        {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}
        {!loading && !hasMeetings && (
          <EmptyModuleState
            title="No meetings recorded"
            description="Schedule and document department meetings here once your school starts adding records."
          />
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/hod">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <Group className="h-6 w-6 mr-2" />
                Meeting Files
              </h1>
              <p className="text-royalPurple-text2">
                Department and staff meeting organization and documentation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Schedule
            </Button>
            <HodScheduleMeetingDialog meetingScope="department" onCreated={reload} />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Group className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Meetings</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {meetingStats.totalMeetings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Upcoming</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {meetingStats.upcomingMeetings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completed</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {meetingStats.completedMeetings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Action Items</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {meetingStats.pendingActionItems}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('upcoming')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Upcoming ({meetingsData.upcoming.length})
                </Button>
                <Button
                  variant={activeTab === 'completed' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('completed')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed ({meetingsData.completed.length})
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3" />
                  <input
                    type="text"
                    placeholder="Search meetings..."
                    className="pl-10 pr-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="Department">Department</option>
                  <option value="Academic">Academic</option>
                  <option value="Professional Development">Professional Development</option>
                  <option value="Administrative">Administrative</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meetingsData[activeTab].map((meeting) => (
                <div
                  key={meeting.id}
                  className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-royalPurple-text1 mr-3">
                          {meeting.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getTypeColor(meeting.type)}`}
                        >
                          {meeting.type}
                        </span>
                        <div className="flex items-center ml-3">
                          {getStatusIcon(meeting.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(meeting.status)}`}
                          >
                            {meeting.status}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-royalPurple-text2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Duration: {meeting.duration}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {meeting.attendees.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {meeting.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="font-medium text-royalPurple-text1 mb-2">Agenda:</h4>
                    <div className="flex flex-wrap gap-2">
                      {meeting.agenda.map((item, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-royalPurple-card2 text-royalPurple-text2 rounded"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    {meeting.status === 'completed' && (
                      <div className="mt-3 flex items-center space-x-4">
                        <span className="text-sm text-royalPurple-successTx">
                          Minutes: {meeting.minutes}
                        </span>
                        <span className="text-sm text-royalPurple-accentTx">
                          Action Items: {meeting.actionItems}
                        </span>
                      </div>
                    )}
                    <HodFileUpload
                      entityType="meeting"
                      entityId={meeting.id}
                      defaultLabel={meeting.status === 'completed' ? 'minutes' : 'schedule'}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meeting Management Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Management Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule New Meeting
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Meeting Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Meeting Templates
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Attendees
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Meeting Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-royalPurple-text3 text-center py-6">
                Recent activity will show here when meetings are logged.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
