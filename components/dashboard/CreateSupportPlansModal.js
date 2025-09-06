'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Target, BookOpen, Users, Calendar, Clock, CheckCircle, 
  AlertTriangle, Plus, Minus, Save, User, GraduationCap
} from 'lucide-react'

export default function CreateSupportPlansModal({ students, onClose }) {
  const [selectedStudent, setSelectedStudent] = useState(students[0]?.id || '')
  const [planType, setPlanType] = useState('academic')
  const [interventions, setInterventions] = useState([])
  const [goals, setGoals] = useState([])
  const [timeline, setTimeline] = useState('4-weeks')

  const planTypes = [
    { id: 'academic', name: 'Academic Support Plan', description: 'Focus on improving academic performance' },
    { id: 'behavioral', name: 'Behavioral Support Plan', description: 'Address attendance and behavioral issues' },
    { id: 'comprehensive', name: 'Comprehensive Plan', description: 'Combined academic and behavioral support' }
  ]

  const interventionTemplates = [
    { id: 'tutoring', name: 'One-on-One Tutoring', description: 'Individual tutoring sessions', frequency: '3x per week' },
    { id: 'group-study', name: 'Small Group Study', description: 'Peer-assisted learning groups', frequency: '2x per week' },
    { id: 'homework-club', name: 'Homework Club', description: 'Supervised homework completion', frequency: 'Daily' },
    { id: 'parent-meetings', name: 'Regular Parent Meetings', description: 'Weekly progress updates', frequency: 'Weekly' },
    { id: 'counseling', name: 'Academic Counseling', description: 'Study skills and motivation', frequency: '1x per week' },
    { id: 'modified-assignments', name: 'Modified Assignments', description: 'Adjusted difficulty and format', frequency: 'Ongoing' }
  ]

  const goalTemplates = [
    'Achieve minimum 40% in all subjects',
    'Improve attendance to 85% or higher',
    'Complete all homework assignments',
    'Participate actively in class discussions',
    'Demonstrate understanding of key concepts',
    'Show consistent improvement over 4 weeks'
  ]

  const selectedStudentData = students.find(s => s.id === selectedStudent)

  const addIntervention = (template) => {
    const newIntervention = {
      id: Date.now(),
      ...template,
      startDate: new Date().toISOString().split('T')[0],
      responsible: 'Teacher',
      status: 'planned'
    }
    setInterventions([...interventions, newIntervention])
  }

  const removeIntervention = (id) => {
    setInterventions(interventions.filter(i => i.id !== id))
  }

  const addGoal = (goalText) => {
    const newGoal = {
      id: Date.now(),
      text: goalText,
      targetDate: getTargetDate(),
      status: 'active',
      measurable: true
    }
    setGoals([...goals, newGoal])
  }

  const removeGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id))
  }

  const getTargetDate = () => {
    const date = new Date()
    const weeks = parseInt(timeline.split('-')[0])
    date.setDate(date.getDate() + (weeks * 7))
    return date.toISOString().split('T')[0]
  }

  const handleSavePlan = () => {
    const plan = {
      studentId: selectedStudent,
      studentName: selectedStudentData?.name,
      planType,
      interventions,
      goals,
      timeline,
      createdDate: new Date().toISOString().split('T')[0],
      status: 'active'
    }
    
    console.log('Saving support plan:', plan)
    alert(`Support plan created for ${selectedStudentData?.name}!`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-6 w-6 mr-3" />
              <div>
                <h2 className="text-xl font-bold">Create Academic Support Plan</h2>
                <p className="text-blue-100">Develop individualized intervention strategies</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="text-white border-white hover:bg-white hover:text-blue-600">
              Close
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Student Selection */}
          <div>
            <h3 className="font-semibold mb-3">Select Student:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student.id)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedStudent === student.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{student.name}</h4>
                      <p className="text-sm text-gray-600">{student.class}</p>
                      <p className="text-sm text-red-600">{student.overall_average}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedStudentData && (
            <>
              {/* Student Overview */}
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-medium">{selectedStudentData.name}</h4>
                      <p className="text-sm text-gray-600">{selectedStudentData.student_id} • {selectedStudentData.class}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{selectedStudentData.overall_average}%</div>
                      <div className="text-sm text-gray-600">Overall Average</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {selectedStudentData.subjects.filter(s => s.score < 40).length}
                      </div>
                      <div className="text-sm text-gray-600">Failing Subjects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{selectedStudentData.attendance_rate}%</div>
                      <div className="text-sm text-gray-600">Attendance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Configuration */}
                <div className="space-y-6">
                  {/* Plan Type */}
                  <div>
                    <h3 className="font-semibold mb-3">Plan Type:</h3>
                    <div className="space-y-2">
                      {planTypes.map((type) => (
                        <div
                          key={type.id}
                          onClick={() => setPlanType(type.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            planType === type.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <h4 className="font-medium">{type.name}</h4>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="font-semibold mb-3">Timeline:</h3>
                    <select
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="2-weeks">2 Weeks (Intensive)</option>
                      <option value="4-weeks">4 Weeks (Standard)</option>
                      <option value="8-weeks">8 Weeks (Extended)</option>
                      <option value="12-weeks">12 Weeks (Long-term)</option>
                    </select>
                  </div>

                  {/* Intervention Templates */}
                  <div>
                    <h3 className="font-semibold mb-3">Available Interventions:</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {interventionTemplates.map((template) => (
                        <div key={template.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-gray-600">{template.description}</p>
                              <p className="text-xs text-blue-600">{template.frequency}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addIntervention(template)}
                              disabled={interventions.some(i => i.id === template.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Plan Details */}
                <div className="space-y-6">
                  {/* Selected Interventions */}
                  <div>
                    <h3 className="font-semibold mb-3">Selected Interventions:</h3>
                    {interventions.length === 0 ? (
                      <p className="text-gray-500 text-sm">No interventions selected yet</p>
                    ) : (
                      <div className="space-y-2">
                        {interventions.map((intervention) => (
                          <div key={intervention.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{intervention.name}</h4>
                                <p className="text-sm text-gray-600">{intervention.frequency}</p>
                                <p className="text-xs text-blue-600">Start: {intervention.startDate}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeIntervention(intervention.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Goals */}
                  <div>
                    <h3 className="font-semibold mb-3">Academic Goals:</h3>
                    <div className="space-y-2 mb-3">
                      {goalTemplates.map((goalText, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <span className="text-sm">{goalText}</span>
                          <Button
                            size="sm"
                            onClick={() => addGoal(goalText)}
                            disabled={goals.some(g => g.text === goalText)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {goals.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Selected Goals:</h4>
                        {goals.map((goal) => (
                          <div key={goal.id} className="p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{goal.text}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Target: {goal.targetDate}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeGoal(goal.id)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Plan Summary */}
                  <div className="p-4 bg-gray-50 border rounded-lg">
                    <h4 className="font-medium mb-2">Plan Summary:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Student: {selectedStudentData.name}</div>
                      <div>• Plan Type: {planTypes.find(p => p.id === planType)?.name}</div>
                      <div>• Timeline: {timeline}</div>
                      <div>• Interventions: {interventions.length} selected</div>
                      <div>• Goals: {goals.length} set</div>
                      <div>• Target Date: {getTargetDate()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4 border-t">
                <Button 
                  onClick={handleSavePlan}
                  disabled={interventions.length === 0 || goals.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Support Plan
                </Button>
                <Button variant="outline" onClick={onClose} className="px-8">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
