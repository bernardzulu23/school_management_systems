'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  ChevronRight,
  Star,
  Award,
  CheckCircle,
  AlertCircle,
  BarChart3,
  User,
  FileText,
  Trophy
} from 'lucide-react'

export default function StudentSubjects({ studentData }) {
  const [selectedSubject, setSelectedSubject] = useState(null)

  // Mock data - replace with actual API calls
  const studentInfo = {
    name: 'John Smith',
    studentId: 'STU2024001',
    yearGroup: 'Form 3',
    class: 'Form 3A',
    overallGrade: 82,
    ranking: 5,
    totalSubjects: 8
  }

  const enrolledSubjects = [
    {
      id: 1,
      name: 'Mathematics',
      code: 'MATH101',
      teacher: 'Ms. Sarah Johnson',
      currentGrade: 88,
      percentage: 88,
      trend: 'improving',
      assignments: 12,
      completedAssignments: 11,
      nextAssessment: '2024-02-15',
      recentGrades: [85, 87, 90, 88, 92],
      topics: ['Algebra', 'Geometry', 'Statistics', 'Trigonometry'],
      attendance: 96,
      status: 'excellent'
    },
    {
      id: 2,
      name: 'Physics',
      code: 'PHYS201',
      teacher: 'Dr. Michael Brown',
      currentGrade: 82,
      percentage: 82,
      trend: 'stable',
      assignments: 10,
      completedAssignments: 9,
      nextAssessment: '2024-02-20',
      recentGrades: [80, 82, 85, 81, 84],
      topics: ['Mechanics', 'Electricity', 'Waves', 'Thermodynamics'],
      attendance: 94,
      status: 'good'
    },
    {
      id: 3,
      name: 'Chemistry',
      code: 'CHEM201',
      teacher: 'Ms. Emily Davis',
      currentGrade: 85,
      percentage: 85,
      trend: 'improving',
      assignments: 8,
      completedAssignments: 8,
      nextAssessment: '2024-02-18',
      recentGrades: [78, 80, 83, 85, 87],
      topics: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'],
      attendance: 98,
      status: 'excellent'
    },
    {
      id: 4,
      name: 'English Language',
      code: 'ENG101',
      teacher: 'Mr. David Wilson',
      currentGrade: 78,
      percentage: 78,
      trend: 'declining',
      assignments: 9,
      completedAssignments: 8,
      nextAssessment: '2024-02-22',
      recentGrades: [82, 80, 78, 76, 75],
      topics: ['Grammar', 'Composition', 'Literature', 'Comprehension'],
      attendance: 91,
      status: 'needs-improvement'
    },
    {
      id: 5,
      name: 'History',
      code: 'HIST101',
      teacher: 'Prof. James Wilson',
      currentGrade: 80,
      percentage: 80,
      trend: 'stable',
      assignments: 7,
      completedAssignments: 7,
      nextAssessment: '2024-02-25',
      recentGrades: [78, 79, 81, 80, 82],
      topics: ['World History', 'African History', 'Modern History'],
      attendance: 93,
      status: 'good'
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'needs-improvement': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGradeColor = (grade) => {
    if (grade >= 85) return 'text-green-600'
    if (grade >= 75) return 'text-blue-600'
    if (grade >= 65) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
      default: return <Target className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Student Overview */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <User className="h-6 w-6 mr-2" />
            Academic Overview - {studentInfo.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">{studentInfo.yearGroup}</div>
              <div className="text-sm text-blue-600">Year Group</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">{studentInfo.class}</div>
              <div className="text-sm text-blue-600">Class</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">{studentInfo.totalSubjects}</div>
              <div className="text-sm text-blue-600">Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">#{studentInfo.ranking}</div>
              <div className="text-sm text-blue-600">Class Rank</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Overall Performance</span>
              <span className="text-lg font-bold text-blue-800">{studentInfo.overallGrade}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${studentInfo.overallGrade}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Excellent</p>
                <p className="text-2xl font-bold text-green-800">
                  {enrolledSubjects.filter(s => s.status === 'excellent').length}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Good</p>
                <p className="text-2xl font-bold text-blue-800">
                  {enrolledSubjects.filter(s => s.status === 'good').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Needs Work</p>
                <p className="text-2xl font-bold text-red-800">
                  {enrolledSubjects.filter(s => s.status === 'needs-improvement').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Avg. Grade</p>
                <p className="text-2xl font-bold text-purple-800">
                  {Math.round(enrolledSubjects.reduce((sum, subject) => sum + subject.currentGrade, 0) / enrolledSubjects.length)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            My Enrolled Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {enrolledSubjects.map((subject) => (
              <div 
                key={subject.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                onClick={() => setSelectedSubject(subject)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                    <p className="text-sm text-gray-600">Teacher: {subject.teacher}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(subject.trend)}
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(subject.status)}`}>
                      {subject.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Grade:</span>
                    <span className={`font-bold text-lg ${getGradeColor(subject.currentGrade)}`}>
                      {subject.currentGrade}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Assignments:</span>
                    <span className="font-medium">{subject.completedAssignments}/{subject.assignments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Attendance:</span>
                    <span className={`font-medium ${getGradeColor(subject.attendance)}`}>
                      {subject.attendance}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium">{subject.completedAssignments}/{subject.assignments} completed</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(subject.completedAssignments / subject.assignments) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Next Assessment: {new Date(subject.nextAssessment).toLocaleDateString()}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Upcoming Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrolledSubjects
              .sort((a, b) => new Date(a.nextAssessment) - new Date(b.nextAssessment))
              .slice(0, 3)
              .map((subject) => (
                <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{subject.name}</h4>
                      <p className="text-sm text-gray-600">Teacher: {subject.teacher}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(subject.nextAssessment).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.ceil((new Date(subject.nextAssessment) - new Date()) / (1000 * 60 * 60 * 24))} days left
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
