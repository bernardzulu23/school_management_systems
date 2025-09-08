'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  DollarSign, Users, TrendingUp, Heart, 
  PiggyBank, GraduationCap, Home, Utensils 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function SDG1PovertyModule({ schoolId, studentData = [] }) {
  const [povertyData, setPovertyData] = useState({
    totalStudents: 0,
    studentsInPoverty: 0,
    scholarshipRecipients: 0,
    feeAssistanceProvided: 0,
    averageHouseholdIncome: 0,
    povertyReductionRate: 0
  })

  const [scholarships, setScholarships] = useState([])
  const [assistancePrograms, setAssistancePrograms] = useState([])

  useEffect(() => {
    // Calculate poverty metrics from student data
    const totalStudents = studentData.length
    const studentsInPoverty = studentData.filter(student => 
      student.householdIncome < 2000 || student.povertyStatus === 'below_poverty_line'
    ).length
    
    const scholarshipRecipients = studentData.filter(student => 
      student.hasScholarship
    ).length

    setPovertyData({
      totalStudents,
      studentsInPoverty,
      scholarshipRecipients,
      feeAssistanceProvided: scholarshipRecipients * 0.8, // Estimate
      averageHouseholdIncome: calculateAverageIncome(studentData),
      povertyReductionRate: calculatePovertyReduction(studentData)
    })

    // Load scholarship and assistance programs
    loadScholarshipPrograms()
    loadAssistancePrograms()
  }, [studentData])

  const calculateAverageIncome = (students) => {
    const incomes = students.map(s => s.householdIncome || 0).filter(income => income > 0)
    return incomes.length > 0 ? Math.round(incomes.reduce((sum, income) => sum + income, 0) / incomes.length) : 0
  }

  const calculatePovertyReduction = (students) => {
    // Mock calculation - in real implementation, compare with historical data
    return Math.round(Math.random() * 15 + 5) // 5-20% improvement
  }

  const loadScholarshipPrograms = () => {
    // Mock data - replace with actual API call
    setScholarships([
      {
        id: 1,
        name: "Rural Education Scholarship",
        amount: 5000,
        recipients: 45,
        criteria: "Household income < ZMW 2,000",
        status: "active"
      },
      {
        id: 2,
        name: "Girls Education Support",
        amount: 3000,
        recipients: 32,
        criteria: "Female students from low-income families",
        status: "active"
      },
      {
        id: 3,
        name: "Orphan Support Fund",
        amount: 4000,
        recipients: 18,
        criteria: "Students who have lost one or both parents",
        status: "active"
      }
    ])
  }

  const loadAssistancePrograms = () => {
    // Mock data - replace with actual API call
    setAssistancePrograms([
      {
        id: 1,
        name: "School Feeding Program",
        type: "nutrition",
        beneficiaries: 234,
        monthlyBudget: 15000,
        description: "Daily nutritious meals for students from low-income families"
      },
      {
        id: 2,
        name: "Uniform Assistance",
        type: "clothing",
        beneficiaries: 89,
        monthlyBudget: 8000,
        description: "Free school uniforms for students in need"
      },
      {
        id: 3,
        name: "Transport Vouchers",
        type: "transport",
        beneficiaries: 67,
        monthlyBudget: 5000,
        description: "Transportation support for students from distant villages"
      }
    ])
  }

  const getPovertyTrendData = () => {
    // Mock trend data - replace with actual historical data
    return [
      { month: 'Jan', poverty: 45, assistance: 30 },
      { month: 'Feb', poverty: 43, assistance: 35 },
      { month: 'Mar', poverty: 41, assistance: 40 },
      { month: 'Apr', poverty: 39, assistance: 45 },
      { month: 'May', poverty: 37, assistance: 50 },
      { month: 'Jun', poverty: 35, assistance: 55 }
    ]
  }

  const povertyRate = povertyData.totalStudents > 0 
    ? Math.round((povertyData.studentsInPoverty / povertyData.totalStudents) * 100)
    : 0

  const assistanceRate = povertyData.totalStudents > 0
    ? Math.round((povertyData.scholarshipRecipients / povertyData.totalStudents) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-red-600 flex items-center justify-center space-x-2">
          <span className="text-4xl">🏚️</span>
          <span>SDG 1: No Poverty</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          End poverty in all its forms everywhere - Supporting our students and families
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Students in Poverty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {povertyData.studentsInPoverty}
            </div>
            <p className="text-xs text-gray-500">
              {povertyRate}% of total students
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <GraduationCap className="h-4 w-4 mr-2" />
              Scholarship Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {povertyData.scholarshipRecipients}
            </div>
            <p className="text-xs text-gray-500">
              {assistanceRate}% receiving support
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Average Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ZMW {povertyData.averageHouseholdIncome.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              Monthly household income
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Poverty Reduction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {povertyData.povertyReductionRate}%
            </div>
            <p className="text-xs text-gray-500">
              Improvement this year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Poverty Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Poverty Reduction Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getPovertyTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="poverty" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Students in Poverty (%)"
              />
              <Line 
                type="monotone" 
                dataKey="assistance" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Receiving Assistance (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scholarship Programs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PiggyBank className="h-5 w-5" />
              <span>Active Scholarship Programs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scholarships.map(scholarship => (
              <div key={scholarship.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{scholarship.name}</h3>
                  <span className="text-lg font-bold text-green-600">
                    ZMW {scholarship.amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{scholarship.criteria}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">{scholarship.recipients} recipients</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    scholarship.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {scholarship.status}
                  </span>
                </div>
              </div>
            ))}
            <Button className="w-full mt-4">
              <PiggyBank className="h-4 w-4 mr-2" />
              Add New Scholarship Program
            </Button>
          </CardContent>
        </Card>

        {/* Assistance Programs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Support Programs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assistancePrograms.map(program => (
              <div key={program.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600">
                      {program.beneficiaries} students
                    </div>
                    <div className="text-xs text-gray-500">
                      ZMW {program.monthlyBudget.toLocaleString()}/month
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{program.description}</p>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    program.type === 'nutrition' ? 'bg-orange-100 text-orange-800' :
                    program.type === 'clothing' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {program.type}
                  </span>
                </div>
              </div>
            ))}
            <Button className="w-full mt-4">
              <Heart className="h-4 w-4 mr-2" />
              Create Support Program
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Assess Student Needs</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <DollarSign className="h-6 w-6" />
              <span>Process Payments</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Home className="h-6 w-6" />
              <span>Family Visits</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Utensils className="h-6 w-6" />
              <span>Feeding Program</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
