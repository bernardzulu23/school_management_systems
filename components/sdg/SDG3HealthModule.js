'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  Heart, Shield, Brain, Activity, 
  Stethoscope, Pill, Users, Calendar 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function SDG3HealthModule({ schoolId, studentData = [] }) {
  const [healthData, setHealthData] = useState({
    totalStudents: 0,
    vaccinationCoverage: 0,
    healthCheckupCompletion: 0,
    mentalHealthSupport: 0,
    healthEducationParticipation: 0,
    chronicConditions: 0,
    emergencyResponseTime: 0
  })

  const [healthPrograms, setHealthPrograms] = useState([])
  const [vaccinationSchedule, setVaccinationSchedule] = useState([])
  const [mentalHealthSupport, setMentalHealthSupport] = useState([])

  useEffect(() => {
    const totalStudents = studentData.length
    
    // Calculate health metrics
    setHealthData({
      totalStudents,
      vaccinationCoverage: Math.round(Math.random() * 20 + 80), // 80-100%
      healthCheckupCompletion: Math.round(Math.random() * 25 + 70), // 70-95%
      mentalHealthSupport: Math.round(Math.random() * 30 + 40), // 40-70%
      healthEducationParticipation: Math.round(Math.random() * 20 + 75), // 75-95%
      chronicConditions: Math.round(totalStudents * 0.08), // ~8% of students
      emergencyResponseTime: Math.round(Math.random() * 10 + 5) // 5-15 minutes
    })

    loadHealthPrograms()
    loadVaccinationSchedule()
    loadMentalHealthSupport()
  }, [studentData])

  const loadHealthPrograms = () => {
    setHealthPrograms([
      {
        id: 1,
        name: "Annual Health Screening",
        type: "preventive",
        participants: 245,
        frequency: "yearly",
        completion: 88,
        nextScheduled: "2024-03-15"
      },
      {
        id: 2,
        name: "Dental Health Program",
        type: "dental",
        participants: 189,
        frequency: "bi-annual",
        completion: 76,
        nextScheduled: "2024-02-20"
      },
      {
        id: 3,
        name: "Vision Screening",
        type: "vision",
        participants: 234,
        frequency: "yearly",
        completion: 92,
        nextScheduled: "2024-04-10"
      },
      {
        id: 4,
        name: "Mental Health Awareness",
        type: "mental",
        participants: 156,
        frequency: "monthly",
        completion: 65,
        nextScheduled: "2024-01-25"
      }
    ])
  }

  const loadVaccinationSchedule = () => {
    setVaccinationSchedule([
      {
        vaccine: "COVID-19 Booster",
        dueDate: "2024-02-15",
        eligible: 280,
        completed: 245,
        percentage: 87
      },
      {
        vaccine: "Hepatitis B",
        dueDate: "2024-03-01",
        eligible: 45,
        completed: 42,
        percentage: 93
      },
      {
        vaccine: "Tetanus",
        dueDate: "2024-03-20",
        eligible: 67,
        completed: 58,
        percentage: 87
      }
    ])
  }

  const loadMentalHealthSupport = () => {
    setMentalHealthSupport([
      {
        id: 1,
        program: "Peer Counseling",
        participants: 89,
        sessions: 24,
        effectiveness: 78
      },
      {
        id: 2,
        program: "Stress Management",
        participants: 67,
        sessions: 12,
        effectiveness: 85
      },
      {
        id: 3,
        program: "Grief Support",
        participants: 23,
        sessions: 8,
        effectiveness: 92
      }
    ])
  }

  const getHealthTrendsData = () => {
    return [
      { month: 'Jan', checkups: 45, vaccinations: 67, mental: 23 },
      { month: 'Feb', checkups: 52, vaccinations: 78, mental: 28 },
      { month: 'Mar', checkups: 48, vaccinations: 85, mental: 31 },
      { month: 'Apr', checkups: 61, vaccinations: 92, mental: 35 },
      { month: 'May', checkups: 58, vaccinations: 88, mental: 38 },
      { month: 'Jun', checkups: 65, vaccinations: 95, mental: 42 }
    ]
  }

  const getHealthStatusData = () => {
    return [
      { category: 'Excellent', count: Math.round(healthData.totalStudents * 0.4), color: '#22c55e' },
      { category: 'Good', count: Math.round(healthData.totalStudents * 0.35), color: '#84cc16' },
      { category: 'Fair', count: Math.round(healthData.totalStudents * 0.2), color: '#f59e0b' },
      { category: 'Poor', count: Math.round(healthData.totalStudents * 0.05), color: '#ef4444' }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-600 flex items-center justify-center space-x-2">
          <span className="text-4xl">🏥</span>
          <span>SDG 3: Good Health and Well-being</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Ensure healthy lives and promote well-being for all at all ages
        </p>
      </div>

      {/* Key Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Vaccination Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {healthData.vaccinationCoverage}%
            </div>
            <p className="text-xs text-gray-500">
              Up-to-date immunizations
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Stethoscope className="h-4 w-4 mr-2" />
              Health Checkups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {healthData.healthCheckupCompletion}%
            </div>
            <p className="text-xs text-gray-500">
              Annual screening completion
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Mental Health Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {healthData.mentalHealthSupport}%
            </div>
            <p className="text-xs text-gray-500">
              Students receiving support
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Health Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {healthData.healthEducationParticipation}%
            </div>
            <p className="text-xs text-gray-500">
              Program participation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Monthly Health Service Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getHealthTrendsData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="checkups" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Health Checkups"
              />
              <Line 
                type="monotone" 
                dataKey="vaccinations" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Vaccinations"
              />
              <Line 
                type="monotone" 
                dataKey="mental" 
                stroke="#a855f7" 
                strokeWidth={2}
                name="Mental Health Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Health Programs & Vaccination Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Active Health Programs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthPrograms.map(program => (
              <div key={program.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    program.type === 'preventive' ? 'bg-green-100 text-green-800' :
                    program.type === 'dental' ? 'bg-blue-100 text-blue-800' :
                    program.type === 'vision' ? 'bg-purple-100 text-purple-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {program.type}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-medium">{program.participants} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion:</span>
                    <span className="font-medium text-green-600">{program.completion}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Scheduled:</span>
                    <span className="font-medium">{program.nextScheduled}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Vaccination Schedule</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vaccinationSchedule.map((vaccine, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{vaccine.vaccine}</h3>
                  <span className="text-sm font-medium text-blue-600">
                    {vaccine.percentage}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">{vaccine.dueDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium">{vaccine.completed}/{vaccine.eligible}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${vaccine.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Mental Health Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Mental Health & Well-being Programs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mentalHealthSupport.map(support => (
              <div key={support.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{support.program}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-medium">{support.participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sessions:</span>
                    <span className="font-medium">{support.sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Effectiveness:</span>
                    <span className="font-medium text-green-600">{support.effectiveness}%</span>
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
          <CardTitle>Quick Health Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Stethoscope className="h-6 w-6" />
              <span>Schedule Checkup</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Shield className="h-6 w-6" />
              <span>Vaccination Records</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Brain className="h-6 w-6" />
              <span>Mental Health Support</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Pill className="h-6 w-6" />
              <span>Health Education</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
