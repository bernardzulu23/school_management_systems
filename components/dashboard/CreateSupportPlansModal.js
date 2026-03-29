'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Target,
  BookOpen,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
  Save,
  User,
  GraduationCap,
} from 'lucide-react'

export default function CreateSupportPlansModal({ students, onClose }) {
  const [selectedStudent, setSelectedStudent] = useState(students[0]?.id || '')
  const [planType, setPlanType] = useState('academic')
  const [interventions, setInterventions] = useState([])
  const [goals, setGoals] = useState([])
  const [timeline, setTimeline] = useState('4-weeks')

  const planTypes = [
    {
      id: 'academic',
      name: 'Academic Support Plan',
      description: 'Focus on improving academic performance',
    },
    {
      id: 'behavioral',
      name: 'Behavioral Support Plan',
      description: 'Address attendance and behavioral issues',
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Plan',
      description: 'Combined academic and behavioral support',
    },
  ]

  const interventionTemplates = [
    {
      id: 'tutoring',
      name: 'One-on-One Tutoring',
      description: 'Individual tutoring sessions',
      frequency: '3x per week',
    },
    {
      id: 'group-study',
      name: 'Small Group Study',
      description: 'Peer-assisted learning groups',
      frequency: '2x per week',
    },
    {
      id: 'homework-club',
      name: 'Homework Club',
      description: 'Supervised homework completion',
      frequency: 'Daily',
    },
    {
      id: 'parent-meetings',
      name: 'Regular Parent Meetings',
      description: 'Weekly progress updates',
      frequency: 'Weekly',
    },
    {
      id: 'counseling',
      name: 'Academic Counseling',
      description: 'Study skills and motivation',
      frequency: '1x per week',
    },
    {
      id: 'modified-assignments',
      name: 'Modified Assignments',
      description: 'Adjusted difficulty and format',
      frequency: 'Ongoing',
    },
  ]

  const goalTemplates = [
    'Achieve minimum 40% in all subjects',
    'Improve attendance to 85% or higher',
    'Complete all homework assignments',
    'Participate actively in class discussions',
    'Demonstrate understanding of key concepts',
    'Show consistent improvement over 4 weeks',
  ]

  const selectedStudentData = students.find((s) => s.id === selectedStudent)

  const addIntervention = (template) => {
    const newIntervention = {
      id: Date.now(),
      ...template,
      startDate: new Date().toISOString().split('T')[0],
      responsible: 'Teacher',
      status: 'planned',
    }
    setInterventions([...interventions, newIntervention])
  }

  const removeIntervention = (id) => {
    setInterventions(interventions.filter((i) => i.id !== id))
  }

  const addGoal = (goalText) => {
    const newGoal = {
      id: Date.now(),
      text: goalText,
      targetDate: getTargetDate(),
      status: 'active',
      measurable: true,
    }
    setGoals([...goals, newGoal])
  }

  const removeGoal = (id) => {
    setGoals(goals.filter((g) => g.id !== id))
  }

  const getTargetDate = () => {
    const date = new Date()
    const weeks = parseInt(timeline.split('-')[0])
    date.setDate(date.getDate() + weeks * 7)
    return date.toISOString().split('T')[0]
  }

  const [isSaving, setIsSaving] = useState(false)

  const handleSavePlan = async () => {
    setIsSaving(true)
    try {
      const plan = {
        studentId: selectedStudent,
        studentName: selectedStudentData?.name,
        planType,
        interventions,
        goals,
        timeline,
        createdDate: new Date().toISOString().split('T')[0],
        status: 'active',
      }

      console.log('Saving support plan:', plan)
      // Mock API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success(`Support plan created for ${selectedStudentData?.name}!`)
      onClose()
    } catch (error) {
      toast.error('Failed to save support plan. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-royalPurple-deep bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="bg-royalPurple-card2 border-b border-royalPurple-border px-6 py-4 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-6 w-6 mr-3 text-royalPurple-text2" aria-hidden="true" />
              <div>
                <h2 id="modal-title" className="text-xl font-bold">
                  Create Academic Support Plan
                </h2>
                <p className="text-royalPurple-text2">
                  Develop individualized intervention strategies
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-royalPurple-text2 hover:text-royalPurple-text1"
              aria-label="Close modal"
            >
              Close
            </Button>
          </div>
        </header>

        <main className="bg-royalPurple-card px-6 py-4 space-y-6">
          {/* Student Selection */}
          <section aria-labelledby="student-selection-title">
            <h3 id="student-selection-title" className="font-semibold mb-3">
              Select Student:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student.id)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedStudent === student.id
                      ? 'border-royalPurple-border2 bg-royalPurple-accent'
                      : 'border-royalPurple-border hover:border-royalPurple-border'
                  }`}
                  role="button"
                  aria-pressed={selectedStudent === student.id}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedStudent(student.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-royalPurple-card2 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-royalPurple-text2" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-medium">{student.name}</h4>
                      <p className="text-sm text-royalPurple-text2">{student.class}</p>
                      <p className="text-sm text-royalPurple-dangerTx">
                        {student.overall_average}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {selectedStudentData && (
            <>
              {/* Student Overview */}
              <section aria-label="Selected student overview">
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <h4 className="font-medium">{selectedStudentData.name}</h4>
                        <p className="text-sm text-royalPurple-text2">
                          {selectedStudentData.student_id} • {selectedStudentData.class}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-royalPurple-dangerTx">
                          {selectedStudentData.overall_average}%
                        </div>
                        <div className="text-sm text-royalPurple-text2">Overall Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {selectedStudentData.subjects.filter((s) => s.score < 40).length}
                        </div>
                        <div className="text-sm text-royalPurple-text2">Failing Subjects</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-royalPurple-accentTx">
                          {selectedStudentData.attendance_rate}%
                        </div>
                        <div className="text-sm text-royalPurple-text2">Attendance</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Configuration */}
                <div className="space-y-6">
                  {/* Plan Type */}
                  <section aria-labelledby="plan-type-title">
                    <h3 id="plan-type-title" className="font-semibold mb-3">
                      Plan Type:
                    </h3>
                    <div className="space-y-2">
                      {planTypes.map((type) => (
                        <div
                          key={type.id}
                          onClick={() => setPlanType(type.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            planType === type.id
                              ? 'border-royalPurple-border2 bg-royalPurple-accent'
                              : 'border-royalPurple-border hover:border-royalPurple-border'
                          }`}
                          role="button"
                          aria-pressed={planType === type.id}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setPlanType(type.id)}
                        >
                          <h4 className="font-medium">{type.name}</h4>
                          <p className="text-sm text-royalPurple-text2">{type.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Timeline */}
                  <section aria-labelledby="timeline-title">
                    <h3 id="timeline-title" className="font-semibold mb-3">
                      Timeline:
                    </h3>
                    <select
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-blue-500 focus:border-royalPurple-border2"
                      aria-label="Select plan timeline duration"
                    >
                      <option value="2-weeks">2 Weeks (Intensive)</option>
                      <option value="4-weeks">4 Weeks (Standard)</option>
                      <option value="8-weeks">8 Weeks (Extended)</option>
                      <option value="12-weeks">12 Weeks (Long-term)</option>
                    </select>
                  </section>

                  {/* Intervention Templates */}
                  <section aria-labelledby="interventions-title">
                    <h3 id="interventions-title" className="font-semibold mb-3">
                      Available Interventions:
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {interventionTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-3 border border-royalPurple-border rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-royalPurple-text2">
                                {template.description}
                              </p>
                              <p className="text-xs text-royalPurple-accentTx">
                                {template.frequency}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addIntervention(template)}
                              disabled={interventions.some((i) => i.id === template.id)}
                              aria-label={`Add ${template.name} intervention`}
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Plan Details */}
                <div className="space-y-6">
                  {/* Selected Interventions */}
                  <section aria-labelledby="selected-interventions-title">
                    <h3 id="selected-interventions-title" className="font-semibold mb-3">
                      Selected Interventions:
                    </h3>
                    {interventions.length === 0 ? (
                      <p className="text-royalPurple-text3 text-sm italic">
                        No interventions selected yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {interventions.map((intervention) => (
                          <div
                            key={intervention.id}
                            className="p-3 bg-royalPurple-accent border border-royalPurple-border2 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{intervention.name}</h4>
                                <p className="text-sm text-royalPurple-text2">
                                  {intervention.frequency}
                                </p>
                                <p className="text-xs text-royalPurple-accentTx">
                                  Start: {intervention.startDate}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeIntervention(intervention.id)}
                                aria-label={`Remove ${intervention.name} intervention`}
                              >
                                <Minus className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Goals */}
                  <section aria-labelledby="goals-title">
                    <h3 id="goals-title" className="font-semibold mb-3">
                      Academic Goals:
                    </h3>
                    <div className="space-y-2 mb-3">
                      {goalTemplates.map((goalText, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border border-royalPurple-border rounded"
                        >
                          <span className="text-sm">{goalText}</span>
                          <Button
                            size="sm"
                            onClick={() => addGoal(goalText)}
                            disabled={goals.some((g) => g.text === goalText)}
                            aria-label={`Add goal: ${goalText}`}
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {goals.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Selected Goals:</h4>
                        {goals.map((goal) => (
                          <div
                            key={goal.id}
                            className="p-2 bg-royalPurple-success border border-royalPurple-border rounded"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{goal.text}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-royalPurple-text3">
                                  Target: {goal.targetDate}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeGoal(goal.id)}
                                  aria-label={`Remove goal: ${goal.text}`}
                                >
                                  <Minus className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Plan Summary */}
                  <Card className="bg-royalPurple-page border">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Plan Summary:</h4>
                      <div className="text-sm text-royalPurple-text2 space-y-1">
                        <div>• Student: {selectedStudentData.name}</div>
                        <div>• Plan Type: {planTypes.find((p) => p.id === planType)?.name}</div>
                        <div>• Timeline: {timeline}</div>
                        <div>• Interventions: {interventions.length} selected</div>
                        <div>• Goals: {goals.length} set</div>
                        <div>• Target Date: {getTargetDate()}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <footer className="flex space-x-4 pt-4 border-t sticky bottom-0 bg-royalPurple-card">
                <Button
                  onClick={handleSavePlan}
                  disabled={interventions.length === 0 || goals.length === 0 || isSaving}
                  className="flex-1 bg-royalPurple-accent hover:bg-royalPurple-accent transition-all duration-200"
                  aria-busy={isSaving}
                  aria-label={isSaving ? 'Creating support plan...' : 'Create support plan'}
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" color="white" className="mr-2" />
                      <span>Creating Plan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                      <span>Create Support Plan</span>
                    </div>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="px-8 border-royalPurple-border hover:bg-royalPurple-card2"
                  disabled={isSaving}
                  aria-label="Cancel and close"
                >
                  Cancel
                </Button>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
