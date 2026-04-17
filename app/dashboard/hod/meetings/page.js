'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
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

export default function MeetingFilesPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  // Sample meeting data
  const meetingsData = {
    upcoming: [
      {
        id: 1,
        title: 'Department Planning Meeting',
        type: 'Department',
        date: '2024-01-25',
        time: '10:00 AM',
        duration: '2 hours',
        attendees: ['All Department Staff'],
        agenda: ['Curriculum Review', 'Resource Planning', 'Performance Analysis'],
        location: 'Conference Room A',
        status: 'scheduled',
      },
      {
        id: 2,
        title: 'Staff Development Workshop',
        type: 'Professional Development',
        date: '2024-01-28',
        time: '2:00 PM',
        duration: '3 hours',
        attendees: ['Mathematics Teachers', 'Science Teachers'],
        agenda: ['Teaching Methodologies', 'Assessment Strategies'],
        location: 'Training Hall',
        status: 'scheduled',
      },
    ],
    completed: [
      {
        id: 3,
        title: 'Monthly Department Review',
        type: 'Department',
        date: '2024-01-15',
        time: '9:00 AM',
        duration: '1.5 hours',
        attendees: ['All Department Staff'],
        agenda: ['Performance Review', 'Student Progress', 'Resource Updates'],
        location: 'Conference Room B',
        status: 'completed',
        minutes: 'Available',
        actionItems: 3,
      },
      {
        id: 4,
        title: 'Subject Coordination Meeting',
        type: 'Academic',
        date: '2024-01-10',
        time: '11:00 AM',
        duration: '1 hour',
        attendees: ['Subject Heads', 'Senior Teachers'],
        agenda: ['Syllabus Updates', 'Assessment Calendar'],
        location: 'Department Office',
        status: 'completed',
        minutes: 'Available',
        actionItems: 5,
      },
    ],
  }

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
        return 'bg-orange-100 text-orange-800'
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

  return (
    <DashboardLayout title="Meeting Files">
      <div className="space-y-6">
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
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
                <FileText className="h-8 w-8 text-orange-600" />
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
                    className="pl-10 pr-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-royalPurple-successTx">
                            Minutes: {meeting.minutes}
                          </span>
                          <span className="text-sm text-royalPurple-accentTx">
                            Action Items: {meeting.actionItems}
                          </span>
                        </div>
                        <Button size="sm">View Minutes</Button>
                      </div>
                    )}
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
              <div className="space-y-3">
                <div className="p-3 bg-royalPurple-success border border-royalPurple-border rounded-lg">
                  <h4 className="font-medium text-royalPurple-successTx mb-1">Meeting Completed</h4>
                  <p className="text-sm text-royalPurple-successTx">
                    Monthly Department Review - Minutes uploaded
                  </p>
                  <p className="text-xs text-royalPurple-successTx mt-1">2 hours ago</p>
                </div>
                <div className="p-3 bg-royalPurple-accent border border-royalPurple-border2 rounded-lg">
                  <h4 className="font-medium text-royalPurple-accentTx mb-1">Meeting Scheduled</h4>
                  <p className="text-sm text-royalPurple-accentTx">
                    Department Planning Meeting - Jan 25, 10:00 AM
                  </p>
                  <p className="text-xs text-royalPurple-accentTx mt-1">1 day ago</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-1">Action Items Due</h4>
                  <p className="text-sm text-yellow-700">
                    3 action items from last meeting need attention
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">Due in 2 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
