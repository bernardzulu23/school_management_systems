'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Calendar, Clock, Users, MapPin, Phone, Mail,
  Plus, Save, User, AlertTriangle, CheckCircle, FileText
} from 'lucide-react'

export default function ScheduleMeetingsModal({ students, onClose }) {
  const [meetings, setMeetings] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [meetingType, setMeetingType] = useState('individual')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [duration, setDuration] = useState('30')
  const [location, setLocation] = useState('headteacher-office')
  const [agenda, setAgenda] = useState('')

  const meetingTypes = [
    { id: 'individual', name: 'Individual Parent Meeting', description: 'One-on-one meeting with parent/guardian' },
    { id: 'group', name: 'Group Parent Meeting', description: 'Meeting with multiple parents' },
    { id: 'emergency', name: 'Emergency Meeting', description: 'Urgent intervention meeting' },
    { id: 'follow-up', name: 'Follow-up Meeting', description: 'Progress review meeting' }
  ]

  const locations = [
    { id: 'headteacher-office', name: 'Headteacher Office' },
    { id: 'conference-room', name: 'Conference Room' },
    { id: 'classroom', name: 'Classroom' },
    { id: 'virtual', name: 'Virtual Meeting (Zoom/Teams)' }
  ]

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ]

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const getParentContact = (student) => {
    return {
      name: `Parent of ${student.name.split(' ')[0]}`,
      phone: `+1 (555) 0${student.id}23-456${student.id}`,
      email: `parent${student.id}@email.com`
    }
  }

  const generateAgenda = () => {
    const selectedStudentData = students.filter(s => selectedStudents.includes(s.id))
    
    if (selectedStudentData.length === 1) {
      const student = selectedStudentData[0]
      const failingSubjects = student.subjects.filter(s => s.score < 40).map(s => s.name).join(', ')
      
      setAgenda(`Meeting Agenda - ${student.name}

1. Current Academic Performance Review
   - Overall Average: ${student.overall_average}%
   - Failing Subjects: ${failingSubjects}
   - Attendance Rate: ${student.attendance_rate}%

2. Areas of Concern
   - Performance below 40% minimum standard
   - Risk Level: ${student.risk_level.toUpperCase()}

3. Proposed Intervention Strategies
   - Individual tutoring sessions
   - Modified assignments and assessments
   - Regular progress monitoring

4. Parent/Guardian Support Required
   - Home study environment
   - Homework supervision
   - Regular communication with teachers

5. Timeline and Next Steps
   - Immediate actions (1-2 weeks)
   - Short-term goals (1 month)
   - Progress review meeting

6. Questions and Discussion`)
    } else {
      setAgenda(`Group Meeting Agenda - Multiple Students

1. Overview of Academic Concerns
   - ${selectedStudentData.length} students requiring immediate attention
   - Common challenges and patterns

2. Individual Student Reviews
${selectedStudentData.map(s => `   - ${s.name}: ${s.overall_average}% average`).join('\n')}

3. Collective Intervention Strategies
   - Group tutoring sessions
   - Peer support programs
   - Parent collaboration initiatives

4. Support Resources Available
   - School counseling services
   - Academic support programs
   - Community resources

5. Action Plan and Timeline
   - Immediate interventions
   - Progress monitoring schedule
   - Follow-up meetings

6. Questions and Discussion`)
    }
  }

  const addMeeting = () => {
    if (!meetingDate || !meetingTime || selectedStudents.length === 0) {
      alert('Please fill in all required fields and select at least one student.')
      return
    }

    const selectedStudentData = students.filter(s => selectedStudents.includes(s.id))
    
    const newMeeting = {
      id: Date.now(),
      type: meetingType,
      date: meetingDate,
      time: meetingTime,
      duration: parseInt(duration),
      location,
      students: selectedStudentData,
      agenda,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }

    setMeetings([...meetings, newMeeting])
    
    // Reset form
    setSelectedStudents([])
    setMeetingDate('')
    setMeetingTime('')
    setAgenda('')
  }

  const removeMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id))
  }

  const handleSaveMeetings = () => {
    if (meetings.length === 0) {
      alert('Please schedule at least one meeting.')
      return
    }

    console.log('Saving meetings:', meetings)
    alert(`${meetings.length} meeting(s) scheduled successfully!`)
    onClose()
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 mr-3" />
              <div>
                <h2 className="text-xl font-bold">Schedule Parent/Guardian Meetings</h2>
                <p className="text-purple-100">Arrange urgent academic intervention meetings</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="text-white border-white hover:bg-white hover:text-purple-600">
              Close
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meeting Scheduler */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule New Meeting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Meeting Type */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <label className="block text-sm font-bold text-purple-900 mb-3">Meeting Type</label>
                    <select
                      value={meetingType}
                      onChange={(e) => setMeetingType(e.target.value)}
                      className="w-full p-3 border-2 border-purple-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white font-medium text-gray-900"
                    >
                      {meetingTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-purple-700 mt-2">
                      {meetingTypes.find(t => t.id === meetingType)?.description}
                    </p>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <label className="block text-sm font-bold text-blue-900 mb-3">Meeting Date</label>
                      <input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        min={getMinDate()}
                        className="w-full p-3 border-2 border-blue-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-gray-900"
                      />
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <label className="block text-sm font-bold text-green-900 mb-3">Meeting Time</label>
                      <select
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="w-full p-3 border-2 border-green-300 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white font-medium text-gray-900"
                      >
                        <option value="">Select time</option>
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duration and Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <label className="block text-sm font-bold text-orange-900 mb-3">Duration</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full p-3 border-2 border-orange-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white font-medium text-gray-900"
                      >
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                      </select>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <label className="block text-sm font-bold text-indigo-900 mb-3">Meeting Location</label>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-900"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Students for Meeting</label>
                    <div className="space-y-3 max-h-64 overflow-y-auto border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                      {students.map((student) => {
                        const contact = getParentContact(student)
                        const isSelected = selectedStudents.includes(student.id)
                        return (
                          <div
                            key={student.id}
                            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-25'
                            }`}
                            onClick={() => toggleStudent(student.id)}
                          >
                            <div className="flex items-start space-x-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(student.id)}
                                className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-900">{student.name}</h4>
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    student.risk_level === 'critical'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-orange-100 text-orange-800 border border-orange-200'
                                  }`}>
                                    {student.risk_level.toUpperCase()} RISK
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-600">Class:</span>
                                    <span className="ml-2 font-medium text-gray-900">{student.class}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Student ID:</span>
                                    <span className="ml-2 font-medium text-gray-900">{student.student_id}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Overall Average:</span>
                                    <span className="ml-2 font-bold text-red-600">{student.overall_average}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Attendance:</span>
                                    <span className="ml-2 font-medium text-gray-900">{student.attendance_rate}%</span>
                                  </div>
                                </div>

                                {/* Parent Contact Info */}
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center mb-2">
                                    <User className="h-4 w-4 text-blue-600 mr-2" />
                                    <span className="font-semibold text-blue-900">{contact.name}</span>
                                    <span className="text-xs text-blue-600 ml-2">(Parent/Guardian)</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center">
                                      <Phone className="h-3 w-3 text-blue-500 mr-2" />
                                      <span className="font-medium text-blue-800">{contact.phone}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Mail className="h-3 w-3 text-blue-500 mr-2" />
                                      <span className="text-blue-700">{contact.email}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Failing Subjects */}
                                <div className="mt-2">
                                  <span className="text-xs font-medium text-gray-700">Failing Subjects: </span>
                                  <span className="text-xs font-semibold text-red-600">
                                    {student.subjects.filter(s => s.score < 40).map(s => s.name).join(', ') || 'None'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Selection Summary */}
                    {selectedStudents.length > 0 && (
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                          <span className="font-semibold text-purple-800">
                            {selectedStudents.length} student(s) selected for meeting
                          </span>
                        </div>
                        <div className="text-sm text-purple-700 mt-1">
                          {students.filter(s => selectedStudents.includes(s.id)).map(s => s.name).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generate Agenda Button */}
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <Button
                      onClick={generateAgenda}
                      disabled={selectedStudents.length === 0}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Generate Professional Meeting Agenda
                    </Button>
                    <p className="text-xs text-yellow-700 mt-2 text-center">
                      Auto-generates agenda based on selected students' performance data
                    </p>
                  </div>

                  {/* Agenda */}
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
                    <label className="block text-sm font-bold text-gray-900 mb-3">Meeting Agenda</label>
                    <textarea
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                      rows={10}
                      className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm bg-white font-mono leading-relaxed"
                      placeholder="Click 'Generate Professional Meeting Agenda' above to auto-create agenda, or enter your custom agenda here..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-600">
                        {agenda.length} characters • Professional agenda template
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(agenda)}
                        disabled={!agenda}
                      >
                        Copy Agenda
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-300">
                    <Button
                      onClick={addMeeting}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 text-lg shadow-lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Meeting to Schedule
                    </Button>
                    <p className="text-xs text-purple-700 mt-2 text-center">
                      Meeting will be added to the schedule and parent contacts will be notified
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scheduled Meetings */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Meetings ({meetings.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {meetings.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Meetings Scheduled</h3>
                      <p className="text-gray-500">Schedule your first parent meeting using the form on the left.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {meetings.map((meeting) => (
                        <div key={meeting.id} className="border-2 border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                          {/* Meeting Header */}
                          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Calendar className="h-5 w-5 text-purple-600" />
                                  <span className="font-bold text-lg text-gray-900">{meeting.date}</span>
                                  <Clock className="h-5 w-5 text-blue-600" />
                                  <span className="font-semibold text-blue-800">{meeting.time}</span>
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {meeting.duration} minutes
                                  </span>
                                </div>

                                <div className="flex items-center space-x-3 mb-2">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-green-800">
                                    {locations.find(l => l.id === meeting.location)?.name}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    meeting.type === 'emergency'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : meeting.type === 'individual'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                                  }`}>
                                    {meetingTypes.find(t => t.id === meeting.type)?.name}
                                  </span>
                                </div>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeMeeting(meeting.id)}
                                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-500"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          {/* Meeting Content */}
                          <div className="p-4">
                            {/* Students */}
                            <div className="mb-4">
                              <div className="flex items-center mb-2">
                                <Users className="h-4 w-4 text-gray-600 mr-2" />
                                <span className="font-semibold text-gray-900">Students ({meeting.students.length}):</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {meeting.students.map((student) => (
                                  <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                    <div>
                                      <span className="font-medium text-gray-900">{student.name}</span>
                                      <span className="text-sm text-gray-600 ml-2">({student.class})</span>
                                    </div>
                                    <span className="text-sm font-semibold text-red-600">{student.overall_average}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Parent Contacts */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center mb-2">
                                <Phone className="h-4 w-4 text-blue-600 mr-2" />
                                <span className="font-semibold text-blue-900">Parent Contacts:</span>
                              </div>
                              <div className="space-y-2">
                                {meeting.students.map((student) => {
                                  const contact = getParentContact(student)
                                  return (
                                    <div key={student.id} className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded">
                                      <div>
                                        <div className="font-medium text-blue-900">{contact.name}</div>
                                        <div className="text-sm text-blue-700">Parent of {student.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-blue-800">{contact.phone}</div>
                                        <div className="text-sm text-blue-600">{contact.email}</div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meeting Summary */}
              {meetings.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Meeting Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Total Meetings:</div>
                        <div className="text-purple-600">{meetings.length}</div>
                      </div>
                      <div>
                        <div className="font-medium">Students Involved:</div>
                        <div className="text-purple-600">
                          {new Set(meetings.flatMap(m => m.students.map(s => s.id))).size}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Emergency Meetings:</div>
                        <div className="text-red-600">
                          {meetings.filter(m => m.type === 'emergency').length}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Next Meeting:</div>
                        <div className="text-blue-600">
                          {meetings.length > 0 ? meetings[0].date : 'None'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-gray-50 to-purple-50 p-6 border-t-2 border-purple-200">
            <div className="flex space-x-4">
              <Button
                onClick={handleSaveMeetings}
                disabled={meetings.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 text-lg shadow-lg"
              >
                <Save className="h-5 w-5 mr-2" />
                Save All Meetings ({meetings.length})
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="px-8 py-4 border-2 border-gray-400 hover:border-gray-600 font-semibold"
              >
                Cancel
              </Button>
            </div>
            {meetings.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-800">
                    Ready to save {meetings.length} meeting(s) with automatic parent notifications
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
