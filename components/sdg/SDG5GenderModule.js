'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  Users, Crown, TrendingUp, Award, 
  BookOpen, Briefcase, Heart, Shield 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function SDG5GenderModule({ schoolId, studentData = [], teacherData = [] }) {
  const [genderData, setGenderData] = useState({
    totalStudents: 0,
    femaleStudents: 0,
    maleStudents: 0,
    genderParityIndex: 0,
    femaleTeachers: 0,
    totalTeachers: 0,
    femaleLeadership: 0,
    girlsCompletionRate: 0,
    genderBasedViolencePrevention: 0
  })

  const [genderPrograms, setGenderPrograms] = useState([])
  const [leadershipPrograms, setLeadershipPrograms] = useState([])
  const [supportInitiatives, setSupportInitiatives] = useState([])

  useEffect(() => {
    const totalStudents = studentData.length
    const femaleStudents = studentData.filter(student => student.gender === 'female').length
    const maleStudents = totalStudents - femaleStudents
    const genderParityIndex = maleStudents > 0 ? (femaleStudents / maleStudents) : 1

    const totalTeachers = teacherData.length || 25 // Mock data if not provided
    const femaleTeachers = teacherData.filter(teacher => teacher.gender === 'female').length || Math.round(totalTeachers * 0.48)

    setGenderData({
      totalStudents,
      femaleStudents,
      maleStudents,
      genderParityIndex: Math.round(genderParityIndex * 100) / 100,
      femaleTeachers,
      totalTeachers,
      femaleLeadership: Math.round(Math.random() * 20 + 35), // 35-55%
      girlsCompletionRate: Math.round(Math.random() * 15 + 80), // 80-95%
      genderBasedViolencePrevention: Math.round(Math.random() * 25 + 70) // 70-95%
    })

    loadGenderPrograms()
    loadLeadershipPrograms()
    loadSupportInitiatives()
  }, [studentData, teacherData])

  const loadGenderPrograms = () => {
    setGenderPrograms([
      {
        id: 1,
        name: "Girls' Education Empowerment",
        participants: 145,
        type: "education",
        impact: 92,
        description: "Supporting girls to complete their education and pursue higher learning"
      },
      {
        id: 2,
        name: "STEM for Girls Initiative",
        participants: 89,
        type: "stem",
        impact: 87,
        description: "Encouraging girls to pursue science, technology, engineering, and mathematics"
      },
      {
        id: 3,
        name: "Female Teacher Mentorship",
        participants: 12,
        type: "professional",
        impact: 95,
        description: "Supporting female teachers in career advancement and leadership roles"
      },
      {
        id: 4,
        name: "Gender Equality Awareness",
        participants: 234,
        type: "awareness",
        impact: 78,
        description: "Promoting gender equality understanding among all students and staff"
      }
    ])
  }

  const loadLeadershipPrograms = () => {
    setLeadershipPrograms([
      {
        id: 1,
        program: "Student Council Leadership",
        femaleParticipants: 8,
        totalParticipants: 15,
        positions: ["President", "Vice President", "Secretary", "Treasurer"]
      },
      {
        id: 2,
        program: "Peer Mentoring Leaders",
        femaleParticipants: 23,
        totalParticipants: 40,
        positions: ["Senior Mentors", "Subject Leaders", "Activity Coordinators"]
      },
      {
        id: 3,
        program: "Academic Excellence Awards",
        femaleParticipants: 34,
        totalParticipants: 60,
        positions: ["Top Performers", "Subject Champions", "Innovation Leaders"]
      }
    ])
  }

  const loadSupportInitiatives = () => {
    setSupportInitiatives([
      {
        id: 1,
        name: "Menstrual Health Management",
        beneficiaries: 156,
        budget: 8000,
        impact: "Reduced absenteeism by 25%"
      },
      {
        id: 2,
        name: "Safe Transportation Program",
        beneficiaries: 89,
        budget: 12000,
        impact: "100% safe school commute"
      },
      {
        id: 3,
        name: "Anti-Harassment Training",
        beneficiaries: 280,
        budget: 5000,
        impact: "Zero tolerance environment"
      },
      {
        id: 4,
        name: "Career Guidance for Girls",
        beneficiaries: 134,
        budget: 6000,
        impact: "85% pursuing higher education"
      }
    ])
  }

  const getGenderDistributionData = () => {
    return [
      { name: 'Female Students', value: genderData.femaleStudents, color: '#ec4899' },
      { name: 'Male Students', value: genderData.maleStudents, color: '#3b82f6' }
    ]
  }

  const getGenderTrendsData = () => {
    return [
      { year: '2020', femaleEnrollment: 45, femaleCompletion: 78, femaleLeadership: 32 },
      { year: '2021', femaleEnrollment: 47, femaleCompletion: 82, femaleLeadership: 38 },
      { year: '2022', femaleEnrollment: 49, femaleCompletion: 85, femaleLeadership: 42 },
      { year: '2023', femaleEnrollment: 51, femaleCompletion: 87, femaleLeadership: 45 },
      { year: '2024', femaleEnrollment: 52, femaleCompletion: 89, femaleLeadership: 48 }
    ]
  }

  const getLeadershipData = () => {
    return leadershipPrograms.map(program => ({
      name: program.program.split(' ')[0],
      female: program.femaleParticipants,
      male: program.totalParticipants - program.femaleParticipants,
      femalePercentage: Math.round((program.femaleParticipants / program.totalParticipants) * 100)
    }))
  }

  const femaleStudentPercentage = genderData.totalStudents > 0 
    ? Math.round((genderData.femaleStudents / genderData.totalStudents) * 100)
    : 0

  const femaleTeacherPercentage = genderData.totalTeachers > 0
    ? Math.round((genderData.femaleTeachers / genderData.totalTeachers) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-pink-600 flex items-center justify-center space-x-2">
          <span className="text-4xl">👩‍🎓</span>
          <span>SDG 5: Gender Equality</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Achieve gender equality and empower all women and girls
        </p>
      </div>

      {/* Key Gender Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Gender Parity Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {genderData.genderParityIndex}
            </div>
            <p className="text-xs text-gray-500">
              {femaleStudentPercentage}% female students
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Female Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {femaleTeacherPercentage}%
            </div>
            <p className="text-xs text-gray-500">
              {genderData.femaleTeachers} of {genderData.totalTeachers} teachers
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Crown className="h-4 w-4 mr-2" />
              Female Leadership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {genderData.femaleLeadership}%
            </div>
            <p className="text-xs text-gray-500">
              In leadership positions
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Girls' Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {genderData.girlsCompletionRate}%
            </div>
            <p className="text-xs text-gray-500">
              Successfully completing education
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gender Distribution & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Student Gender Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getGenderDistributionData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {getGenderDistributionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Gender Equality Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getGenderTrendsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="femaleEnrollment" fill="#ec4899" name="Female Enrollment %" />
                <Bar dataKey="femaleCompletion" fill="#8b5cf6" name="Female Completion %" />
                <Bar dataKey="femaleLeadership" fill="#3b82f6" name="Female Leadership %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gender Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Gender Equality Programs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {genderPrograms.map(program => (
              <div key={program.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    program.type === 'education' ? 'bg-pink-100 text-pink-800' :
                    program.type === 'stem' ? 'bg-blue-100 text-blue-800' :
                    program.type === 'professional' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {program.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{program.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-medium">{program.participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Impact Score:</span>
                    <span className="font-medium text-green-600">{program.impact}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leadership Participation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5" />
            <span>Female Leadership Participation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leadershipPrograms.map(program => (
              <div key={program.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">{program.program}</h3>
                  <span className="text-lg font-bold text-pink-600">
                    {Math.round((program.femaleParticipants / program.totalParticipants) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Female: {program.femaleParticipants}</span>
                  <span>Total: {program.totalParticipants}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(program.femaleParticipants / program.totalParticipants) * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {program.positions.map(position => (
                    <span key={position} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {position}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Girls' Support Initiatives</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportInitiatives.map(initiative => (
              <div key={initiative.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{initiative.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Beneficiaries:</span>
                    <span className="font-medium">{initiative.beneficiaries} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium">ZMW {initiative.budget.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <span className="text-xs text-green-800 font-medium">Impact: {initiative.impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Gender Equality Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Gender Analytics</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Crown className="h-6 w-6" />
              <span>Leadership Training</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Heart className="h-6 w-6" />
              <span>Support Programs</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Shield className="h-6 w-6" />
              <span>Safety Measures</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
