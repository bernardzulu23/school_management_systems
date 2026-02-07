'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SDG_GOALS, calculateSDGProgress } from '@/lib/sdg-framework'
import { 
  BookOpen, Users, Target, TrendingUp, 
  CheckCircle, Clock, Award, Globe 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function TeacherSDGView({ teacherId, classData = [], studentData = [] }) {
  const [classroomSDGProgress, setClassroomSDGProgress] = useState({})
  const [curriculumAlignment, setCurriculumAlignment] = useState([])
  const [studentSDGActivities, setStudentSDGActivities] = useState([])

  useEffect(() => {
    // Calculate classroom-level SDG progress
    const progress = {}
    Object.keys(SDG_GOALS).forEach(key => {
      const sdgId = SDG_GOALS[key].id
      progress[sdgId] = calculateClassroomSDGProgress(sdgId, classData, studentData)
    })
    setClassroomSDGProgress(progress)

    loadCurriculumAlignment()
    loadStudentActivities()
  }, [classData, studentData])

  const calculateClassroomSDGProgress = (sdgId, classes, students) => {
    // Teacher-specific SDG progress calculation
    switch (sdgId) {
      case 1: // No Poverty
        const studentsWithSupport = students.filter(s => s.hasScholarship || s.receivesSupport).length
        return students.length > 0 ? Math.round((studentsWithSupport / students.length) * 100) : 0
      
      case 2: // Zero Hunger
        const studentsReceivingMeals = students.filter(s => s.receivesSchoolMeals).length
        return students.length > 0 ? Math.round((studentsReceivingMeals / students.length) * 100) : 0
      
      case 4: // Quality Education
        const studentsPassingGrade = students.filter(s => s.averageGrade >= 60).length
        return students.length > 0 ? Math.round((studentsPassingGrade / students.length) * 100) : 0
      
      case 5: // Gender Equality
        const femaleStudents = students.filter(s => s.gender === 'female').length
        const maleStudents = students.length - femaleStudents
        return maleStudents > 0 ? Math.round((femaleStudents / maleStudents) * 100) : 100
      
      default:
        return Math.round(Math.random() * 40 + 40) // 40-80% for other SDGs
    }
  }

  const loadCurriculumAlignment = () => {
    // Mock curriculum alignment data
    setCurriculumAlignment([
      {
        subject: "Mathematics",
        sdgAlignment: [4, 8, 9],
        activities: ["Problem-solving for economic growth", "Technology integration", "Equal access to education"],
        completion: 85
      },
      {
        subject: "Science",
        sdgAlignment: [3, 6, 13, 15],
        activities: ["Health education", "Water conservation", "Climate studies", "Biodiversity projects"],
        completion: 78
      },
      {
        subject: "Social Studies",
        sdgAlignment: [1, 5, 10, 16],
        activities: ["Poverty awareness", "Gender equality discussions", "Social justice", "Peace education"],
        completion: 92
      },
      {
        subject: "English",
        sdgAlignment: [4, 5, 10],
        activities: ["Inclusive literature", "Communication skills", "Cultural diversity"],
        completion: 88
      }
    ])
  }

  const loadStudentActivities = () => {
    // Mock student SDG activities
    setStudentSDGActivities([
      {
        id: 1,
        title: "School Garden Project",
        sdg: 2,
        participants: 25,
        status: "active",
        impact: "Improved nutrition awareness"
      },
      {
        id: 2,
        title: "Gender Equality Debate",
        sdg: 5,
        participants: 30,
        status: "completed",
        impact: "Enhanced understanding of gender issues"
      },
      {
        id: 3,
        title: "Clean Water Campaign",
        sdg: 6,
        participants: 28,
        status: "active",
        impact: "Water conservation practices adopted"
      },
      {
        id: 4,
        title: "Peace Club Activities",
        sdg: 16,
        participants: 20,
        status: "active",
        impact: "Improved conflict resolution skills"
      }
    ])
  }

  const getTopPerformingSDGs = () => {
    return Object.entries(classroomSDGProgress)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([sdgId, progress]) => ({
        sdg: `SDG ${sdgId}`,
        title: SDG_GOALS[`SDG${sdgId}`]?.title || '',
        progress,
        color: SDG_GOALS[`SDG${sdgId}`]?.color || '#666666'
      }))
  }

  const getClassroomOverallProgress = () => {
    const totalProgress = Object.values(classroomSDGProgress).reduce((sum, progress) => sum + progress, 0)
    return Math.round(totalProgress / Object.keys(classroomSDGProgress).length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-blue-600 flex items-center justify-center space-x-2">
          <Globe className="h-8 w-8" />
          <span>Classroom SDG Impact</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Track how your teaching contributes to the UN Sustainable Development Goals
        </p>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl font-bold text-blue-600">{getClassroomOverallProgress()}%</span>
          <span className="text-gray-600">Classroom SDG Progress</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Students Impacted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {studentData.length}
            </div>
            <p className="text-xs text-gray-500">
              In your classes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              SDG Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {studentSDGActivities.length}
            </div>
            <p className="text-xs text-gray-500">
              Active projects
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Curriculum Aligned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {curriculumAlignment.length}
            </div>
            <p className="text-xs text-gray-500">
              Subjects integrated
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {getClassroomOverallProgress()}%
            </div>
            <p className="text-xs text-gray-500">
              Overall contribution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing SDGs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Your Classroom's Top SDG Contributions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTopPerformingSDGs()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sdg" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value}%`, 
                  props.payload.title
                ]}
              />
              <Bar 
                dataKey="progress" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Curriculum Alignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>SDG-Curriculum Alignment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {curriculumAlignment.map((subject, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{subject.subject}</h3>
                  <span className="text-lg font-bold text-green-600">{subject.completion}%</span>
                </div>
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {subject.sdgAlignment.map(sdgId => (
                      <span 
                        key={sdgId} 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${SDG_GOALS[`SDG${sdgId}`]?.color}20`,
                          color: SDG_GOALS[`SDG${sdgId}`]?.color
                        }}
                      >
                        SDG {sdgId}: {SDG_GOALS[`SDG${sdgId}`]?.title}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Activities:</strong> {subject.activities.join(', ')}
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${subject.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student SDG Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Student SDG Activities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentSDGActivities.map(activity => (
              <div key={activity.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    activity.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
                <div className="mb-2">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${SDG_GOALS[`SDG${activity.sdg}`]?.color}20`,
                      color: SDG_GOALS[`SDG${activity.sdg}`]?.color
                    }}
                  >
                    SDG {activity.sdg}: {SDG_GOALS[`SDG${activity.sdg}`]?.title}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Participants:</strong> {activity.participants} students
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Impact:</strong> {activity.impact}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher SDG Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <BookOpen className="h-6 w-6" />
              <span>Plan SDG Lesson</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Track Student Progress</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Target className="h-6 w-6" />
              <span>Create SDG Activity</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Award className="h-6 w-6" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
