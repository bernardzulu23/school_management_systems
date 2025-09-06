'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Phone, Mail, MessageSquare, User, AlertTriangle, Send, Copy } from 'lucide-react'

export default function ContactParentsModal({ students, onClose }) {
  const [selectedStudents, setSelectedStudents] = useState([])
  const [message, setMessage] = useState(`Dear Parent/Guardian,

We need to discuss your child's academic performance urgently. Your child is currently scoring below the minimum 40% standard and requires immediate intervention.

Current Performance Summary:
- Overall Average: [STUDENT_AVERAGE]%
- Failing Subjects: [FAILING_SUBJECTS]
- Attendance Rate: [ATTENDANCE_RATE]%

This situation requires immediate attention and we need to work together to support your child's academic success.

Please contact the school at your earliest convenience to schedule a meeting.

Best regards,
School Administration
Springfield High School
Phone: +1-555-0123
Email: admin@springfield.edu`)

  const [contactMethod, setContactMethod] = useState('sms')

  // Mock parent contact data - in real app this would come from student profiles
  const getParentContact = (student) => {
    return {
      primary_contact: {
        name: `Parent of ${student.name.split(' ')[0]}`,
        relationship: 'Parent/Guardian',
        phone: `+1 (555) 0${student.id}23-456${student.id}`,
        email: `parent${student.id}@email.com`,
        is_primary: true
      },
      emergency_contact: {
        name: `Emergency Contact ${student.id}`,
        relationship: 'Emergency Contact',
        phone: `+1 (555) 0${student.id}87-654${student.id}`,
        email: `emergency${student.id}@email.com`,
        is_primary: false
      }
    }
  }

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id))
  }

  const clearSelection = () => {
    setSelectedStudents([])
  }

  const personalizeMessage = (baseMessage, student) => {
    const failingSubjects = student.subjects
      .filter(s => s.score < 40)
      .map(s => s.name)
      .join(', ')
    
    return baseMessage
      .replace('[STUDENT_AVERAGE]', student.overall_average)
      .replace('[FAILING_SUBJECTS]', failingSubjects || 'None')
      .replace('[ATTENDANCE_RATE]', student.attendance_rate)
  }

  const handleSendMessages = () => {
    const selectedStudentData = students.filter(s => selectedStudents.includes(s.id))
    
    // Here you would implement the actual messaging functionality
    console.log('Sending messages via:', contactMethod)
    console.log('To students:', selectedStudentData.map(s => s.name))
    
    selectedStudentData.forEach(student => {
      const personalizedMessage = personalizeMessage(message, student)
      const contact = getParentContact(student)
      console.log(`Message to ${contact.primary_contact.name}:`, personalizedMessage)
    })
    
    alert(`${contactMethod.toUpperCase()} messages sent to ${selectedStudents.length} parent(s)!`)
    onClose()
  }

  const copyMessage = () => {
    navigator.clipboard.writeText(message)
    alert('Message copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone className="h-6 w-6 mr-3" />
              <div>
                <h2 className="text-xl font-bold">Contact Parents/Guardians</h2>
                <p className="text-red-100">Urgent Academic Intervention Required</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="text-white border-white hover:bg-white hover:text-red-600">
              Close
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Alert Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <h3 className="font-semibold text-red-800">Critical Academic Performance Alert</h3>
                <p className="text-sm text-red-600">
                  {students.length} students are performing below the 40% minimum standard and require immediate parent/guardian contact.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Select Students to Contact:</h3>
                <div className="space-x-2">
                  <Button size="sm" variant="outline" onClick={selectAllStudents}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {students.map((student) => {
                  const contact = getParentContact(student)
                  return (
                    <div key={student.id} className={`p-4 border rounded-lg ${
                      selectedStudents.includes(student.id) ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{student.name}</h4>
                              <p className="text-sm text-gray-600">{student.student_id} • {student.class}</p>
                              <p className="text-sm text-red-600 font-medium">
                                Overall: {student.overall_average}% ({student.overall_status})
                              </p>
                            </div>
                            <div className={`px-2 py-1 text-xs rounded-full ${
                              student.risk_level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {student.risk_level.toUpperCase()} RISK
                            </div>
                          </div>
                          
                          {/* Parent Contact Info */}
                          <div className="mt-3 p-3 bg-gray-50 rounded border">
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 text-gray-600 mr-2" />
                              <span className="font-medium text-sm">{contact.primary_contact.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({contact.primary_contact.relationship})</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-sm">
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 text-gray-400 mr-2" />
                                <span className="font-medium text-blue-600">{contact.primary_contact.phone}</span>
                              </div>
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 text-gray-400 mr-2" />
                                <span className="text-gray-600">{contact.primary_contact.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Failing Subjects */}
                          <div className="mt-2">
                            <span className="text-xs text-gray-600">Failing Subjects: </span>
                            <span className="text-xs text-red-600 font-medium">
                              {student.subjects.filter(s => s.score < 40).map(s => s.name).join(', ') || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Message Composition */}
            <div>
              <div className="space-y-4">
                {/* Contact Method Selection */}
                <div>
                  <h3 className="font-semibold mb-2">Contact Method:</h3>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={contactMethod === 'sms' ? 'default' : 'outline'}
                      onClick={() => setContactMethod('sms')}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant={contactMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setContactMethod('email')}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant={contactMethod === 'call' ? 'default' : 'outline'}
                      onClick={() => setContactMethod('call')}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Phone Call
                    </Button>
                  </div>
                </div>

                {/* Message Template */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Message Template:</h3>
                    <Button size="sm" variant="outline" onClick={copyMessage}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={12}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                    placeholder="Enter your message template..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Variables: [STUDENT_AVERAGE], [FAILING_SUBJECTS], [ATTENDANCE_RATE] will be automatically replaced for each student.
                  </p>
                </div>

                {/* Selected Students Summary */}
                {selectedStudents.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Ready to Contact ({selectedStudents.length} students):
                    </h4>
                    <div className="text-sm text-blue-600">
                      {students
                        .filter(s => selectedStudents.includes(s.id))
                        .map(s => s.name)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4 border-t">
            <Button 
              onClick={handleSendMessages}
              disabled={selectedStudents.length === 0}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send {contactMethod.toUpperCase()} to {selectedStudents.length} Parent(s)
            </Button>
            <Button variant="outline" onClick={onClose} className="px-8">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
