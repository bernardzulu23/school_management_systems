'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { calculateGrade, JUNIOR_GRADING_SYSTEM } from '@/lib/gradingSystem'
import { toast } from 'react-hot-toast'
import { Save, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResultEntryPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Selection state
  const [selectedTerm, setSelectedTerm] = useState('Term 1 2025')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  
  // Data state
  const [students, setStudents] = useState([])
  const [scores, setScores] = useState({}) // Map of studentId -> score

  // Mock data for dropdowns (replace with API calls later)
  const terms = ['Term 1 2025', 'Term 2 2025', 'Term 3 2025']
  const classes = ['Form 1A', 'Form 1B', 'Form 2A', 'Form 2B']
  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'ICT']

  // Mock fetch students when class is selected
  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudents(selectedClass)
    }
  }, [selectedClass, selectedSubject])

  const fetchStudents = async (className) => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (selectedSubject) queryParams.append('subject', selectedSubject)
      if (selectedTerm) queryParams.append('term', selectedTerm)
        
      const response = await fetch(`/api/classes/${encodeURIComponent(className)}/students?${queryParams}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      
      setStudents(data)
      
      // Initialize scores
      const initialScores = {}
      data.forEach(s => {
        if (s.currentScore !== null && s.currentScore !== undefined) {
          initialScores[s.id] = s.currentScore
        }
      })
      setScores(initialScores)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
      setLoading(false)
    }
  }

  const handleScoreChange = (studentId, value) => {
    // Allow empty string for clearing
    if (value === '') {
      setScores(prev => ({ ...prev, [studentId]: '' }))
      return
    }

    const numValue = Number(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setScores(prev => ({ ...prev, [studentId]: numValue }))
    }
  }

  const handleSave = async () => {
    if (!selectedClass || !selectedSubject) {
      toast.error('Please select class and subject')
      return
    }

    setSaving(true)
    try {
      const resultsToSave = students.map(student => ({
        studentId: student.id,
        score: scores[student.id] === '' ? null : scores[student.id],
        class: selectedClass,
        subject: selectedSubject,
        term: selectedTerm
      })).filter(r => r.score !== undefined && r.score !== null)

      const response = await fetch('/api/teacher/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsToSave })
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Results saved successfully')
    } catch (error) {
      console.error('Error saving results:', error)
      toast.error('Failed to save results')
    } finally {
      setSaving(false)
    }
  }

  const getGradeInfo = (score) => {
    if (score === '' || score === undefined || score === null) return null
    return calculateGrade(score, 'form1') // Using Form 1/2 grading system as requested
  }

  return (
    <DashboardLayout title="Enter Results">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Result Entry</h1>
              <p className="text-gray-600">Enter subject results for your classes</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || students.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Results
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map(term => (
                      <SelectItem key={term} value={term}>{term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        {selectedClass && selectedSubject ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{selectedClass} - {selectedSubject}</span>
                <span className="text-sm font-normal text-gray-500">{students.length} Students</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 w-32">Score (0-100)</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const score = scores[student.id]
                        const gradeInfo = getGradeInfo(score)
                        
                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{student.id}</td>
                            <td className="px-4 py-3">{student.name}</td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={score === undefined ? '' : score}
                                onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                className="w-24"
                              />
                            </td>
                            <td className="px-4 py-3">
                              {gradeInfo ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${gradeInfo.color === 'green' ? 'bg-green-100 text-green-800' : 
                                    gradeInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                    gradeInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                    gradeInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'}`}>
                                  {gradeInfo.grade} - {gradeInfo.status}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 italic">
                              {gradeInfo?.description || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 mb-4 text-gray-400" />
            <p className="text-lg font-medium">Please select a Class and Subject to enter results</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
