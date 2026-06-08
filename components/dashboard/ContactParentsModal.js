'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Phone, Mail, MessageSquare, User, AlertTriangle, Send, Copy } from 'lucide-react'
import { useSchool } from '@/lib/context/SchoolContext'

function buildDefaultMessage(school) {
  const schoolName = school?.name || 'School Administration'
  const schoolPhone = school?.phone || '—'
  const schoolEmail = school?.email || '—'

  return `Dear Parent/Guardian,

We need to discuss your child's academic performance urgently. Your child is currently scoring below the minimum 40% standard and requires immediate intervention.

Current Performance Summary:
- Overall Average: [STUDENT_AVERAGE]%
- Failing Subjects: [FAILING_SUBJECTS]
- Attendance Rate: [ATTENDANCE_RATE]%

This situation requires immediate attention and we need to work together to support your child's academic success.

Please contact the school at your earliest convenience to schedule a meeting.

Best regards,
${schoolName}
Phone: ${schoolPhone}
Email: ${schoolEmail}`
}

export default function ContactParentsModal({ students, onClose }) {
  const { school } = useSchool()
  const [selectedStudents, setSelectedStudents] = useState([])
  const [message, setMessage] = useState(() => buildDefaultMessage(null))

  const [contactMethod, setContactMethod] = useState('sms')

  useEffect(() => {
    setMessage(buildDefaultMessage(school))
  }, [school])

  const getParentContact = (student) => {
    const fatherPhone = String(student.parent_father_contact || '').trim()
    const motherPhone = String(student.parent_mother_contact || '').trim()
    const guardianPhone = String(student.guardian_contact || student.parent_contact || '').trim()
    const primaryPhone = fatherPhone || motherPhone || guardianPhone || 'Not on file'
    const secondaryPhone = [motherPhone, guardianPhone].find((p) => p && p !== primaryPhone) || ''

    return {
      primary_contact: {
        name:
          student.parent_father_name ||
          student.guardian_name ||
          `Parent/Guardian of ${student.name?.split(' ')[0] || 'learner'}`,
        relationship: student.guardian_relationship || 'Parent/Guardian',
        phone: primaryPhone,
        email: student.parent_father_email || student.guardian_email || '',
        is_primary: true,
      },
      emergency_contact: secondaryPhone
        ? {
            name: student.parent_mother_name || student.guardian_name || 'Alternate contact',
            relationship: student.parent_mother_name ? 'Mother' : 'Guardian',
            phone: secondaryPhone,
            email: student.parent_mother_email || '',
            is_primary: false,
          }
        : null,
    }
  }

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const selectAllStudents = () => {
    setSelectedStudents(students.map((s) => s.id))
  }

  const clearSelection = () => {
    setSelectedStudents([])
  }

  const personalizeMessage = (baseMessage, student) => {
    const subjects = Array.isArray(student.subjects) ? student.subjects : []
    const failingSubjects = subjects
      .filter((s) => Number(s.score) < 40)
      .map((s) => s.name)
      .join(', ')

    return baseMessage
      .replace('[STUDENT_AVERAGE]', String(student.overall_average ?? '—'))
      .replace('[FAILING_SUBJECTS]', failingSubjects || 'None')
      .replace('[ATTENDANCE_RATE]', String(student.attendance_rate ?? '—'))
  }

  const handleSendMessages = () => {
    const selectedStudentData = students.filter((s) => selectedStudents.includes(s.id))

    // Here you would implement the actual messaging functionality
    console.log('Sending messages via:', contactMethod)
    console.log(
      'To students:',
      selectedStudentData.map((s) => s.name)
    )

    selectedStudentData.forEach((student) => {
      const personalizedMessage = personalizeMessage(message, student)
      const contact = getParentContact(student)
      console.log(`Message to ${contact.primary_contact.name}:`, personalizedMessage)
    })

    toast.success(
      `${contactMethod.toUpperCase()} messages sent to ${selectedStudents.length} parent(s)!`
    )
    onClose()
  }

  const copyMessage = () => {
    navigator.clipboard.writeText(message)
    toast.success('Message copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 bg-royalPurple-deep bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-royalPurple-card2 border-b border-royalPurple-border px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone className="h-6 w-6 mr-3 text-royalPurple-text2" />
              <div>
                <h2 className="text-xl font-bold">Contact Parents/Guardians</h2>
                <p className="text-royalPurple-text2">Urgent Academic Intervention Required</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-royalPurple-text2 hover:text-royalPurple-text1"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="bg-royalPurple-card px-6 py-4 space-y-6">
          {/* Alert Banner */}
          <div className="bg-royalPurple-danger border border-royalPurple-border rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-royalPurple-dangerTx mr-3" />
              <div>
                <h3 className="font-semibold text-royalPurple-dangerTx">
                  Critical Academic Performance Alert
                </h3>
                <p className="text-sm text-royalPurple-dangerTx">
                  {students.length} students are performing below the 40% minimum standard and
                  require immediate parent/guardian contact.
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
                    <div
                      key={student.id}
                      className={`p-4 border rounded-lg ${
                        selectedStudents.includes(student.id)
                          ? 'border-royalPurple-border bg-royalPurple-danger'
                          : 'border-royalPurple-border'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="h-4 w-4 text-royalPurple-dangerTx focus:ring-royalPurple-border2 border-royalPurple-border rounded mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{student.name}</h4>
                              <p className="text-sm text-royalPurple-text2">
                                {student.student_id} • {student.class}
                              </p>
                              <p className="text-sm text-royalPurple-dangerTx font-medium">
                                Overall: {student.overall_average}% ({student.overall_status})
                              </p>
                            </div>
                            <div
                              className={`px-2 py-1 text-xs rounded-full ${
                                student.risk_level === 'critical'
                                  ? 'bg-royalPurple-danger text-royalPurple-dangerTx'
                                  : 'bg-royalPurple-card2 text-royalPurple-text2 border border-royalPurple-border'
                              }`}
                            >
                              {student.risk_level.toUpperCase()} RISK
                            </div>
                          </div>

                          {/* Parent Contact Info */}
                          <div className="mt-3 p-3 bg-royalPurple-page rounded border">
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 text-royalPurple-text2 mr-2" />
                              <span className="font-medium text-sm">
                                {contact.primary_contact.name}
                              </span>
                              <span className="text-xs text-royalPurple-text3 ml-2">
                                ({contact.primary_contact.relationship})
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-sm">
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 text-royalPurple-text3 mr-2" />
                                <span className="font-medium text-royalPurple-accentTx">
                                  {contact.primary_contact.phone}
                                </span>
                              </div>
                              {contact.emergency_contact?.phone ? (
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 text-royalPurple-text3 mr-2" />
                                  <span className="text-royalPurple-text2">
                                    {contact.emergency_contact.phone} (alt)
                                  </span>
                                </div>
                              ) : null}
                              {contact.primary_contact.email ? (
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 text-royalPurple-text3 mr-2" />
                                  <span className="text-royalPurple-text2">
                                    {contact.primary_contact.email}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Failing Subjects */}
                          <div className="mt-2">
                            <span className="text-xs text-royalPurple-text2">
                              Failing Subjects:{' '}
                            </span>
                            <span className="text-xs text-royalPurple-dangerTx font-medium">
                              {student.subjects
                                .filter((s) => s.score < 40)
                                .map((s) => s.name)
                                .join(', ') || 'None'}
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
                    className="w-full p-3 border border-royalPurple-border rounded-md focus:ring-royalPurple-border2 focus:border-royalPurple-border text-sm"
                    placeholder="Enter your message template..."
                  />
                  <p className="text-xs text-royalPurple-text3 mt-2">
                    Variables: [STUDENT_AVERAGE], [FAILING_SUBJECTS], [ATTENDANCE_RATE] will be
                    automatically replaced for each student.
                  </p>
                </div>

                {/* Selected Students Summary */}
                {selectedStudents.length > 0 && (
                  <div className="p-3 bg-royalPurple-accentBg border border-royalPurple-border2 rounded-lg">
                    <h4 className="font-medium text-royalPurple-accentTx mb-2">
                      Ready to Contact ({selectedStudents.length} students):
                    </h4>
                    <div className="text-sm text-royalPurple-accentTx">
                      {students
                        .filter((s) => selectedStudents.includes(s.id))
                        .map((s) => s.name)
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
              className="flex-1 bg-royalPurple-danger hover:opacity-90 transition-opacity"
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
