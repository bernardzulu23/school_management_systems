'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  Utensils, Apple, Wheat, TrendingUp, 
  Calendar, Users, Scale, Droplets 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function SDG2HungerModule({ schoolId, studentData = [] }) {
  const [nutritionData, setNutritionData] = useState({
    totalStudents: 0,
    studentsReceivingMeals: 0,
    nutritionStatus: {
      wellNourished: 0,
      mildlyMalnourished: 0,
      severelyMalnourished: 0
    },
    foodSecurityIndex: 0,
    agriculturalParticipation: 0
  })

  const [feedingPrograms, setFeedingPrograms] = useState([])
  const [agriculturalProjects, setAgriculturalProjects] = useState([])
  const [nutritionEducation, setNutritionEducation] = useState([])

  useEffect(() => {
    // Calculate nutrition metrics
    const totalStudents = studentData.length
    const studentsReceivingMeals = studentData.filter(student => 
      student.receivesSchoolMeals
    ).length

    // Mock nutrition status calculation
    const wellNourished = Math.floor(totalStudents * 0.7)
    const mildlyMalnourished = Math.floor(totalStudents * 0.25)
    const severelyMalnourished = totalStudents - wellNourished - mildlyMalnourished

    setNutritionData({
      totalStudents,
      studentsReceivingMeals,
      nutritionStatus: {
        wellNourished,
        mildlyMalnourished,
        severelyMalnourished
      },
      foodSecurityIndex: calculateFoodSecurityIndex(studentData),
      agriculturalParticipation: calculateAgriculturalParticipation(studentData)
    })

    loadFeedingPrograms()
    loadAgriculturalProjects()
    loadNutritionEducation()
  }, [studentData])

  const calculateFoodSecurityIndex = (students) => {
    // Mock calculation based on various factors
    const mealsProvided = students.filter(s => s.receivesSchoolMeals).length
    const totalStudents = students.length
    return totalStudents > 0 ? Math.round((mealsProvided / totalStudents) * 100) : 0
  }

  const calculateAgriculturalParticipation = (students) => {
    // Mock calculation for agricultural education participation
    return Math.round(Math.random() * 40 + 30) // 30-70%
  }

  const loadFeedingPrograms = () => {
    setFeedingPrograms([
      {
        id: 1,
        name: "Daily School Meals",
        type: "breakfast_lunch",
        beneficiaries: 234,
        dailyCost: 15,
        nutritionScore: 85,
        status: "active"
      },
      {
        id: 2,
        name: "Weekend Food Packs",
        type: "take_home",
        beneficiaries: 89,
        dailyCost: 8,
        nutritionScore: 78,
        status: "active"
      },
      {
        id: 3,
        name: "Emergency Food Relief",
        type: "emergency",
        beneficiaries: 45,
        dailyCost: 12,
        nutritionScore: 70,
        status: "seasonal"
      }
    ])
  }

  const loadAgriculturalProjects = () => {
    setAgriculturalProjects([
      {
        id: 1,
        name: "School Vegetable Garden",
        type: "vegetables",
        area: "2 hectares",
        participants: 120,
        yield: "500kg/month",
        crops: ["Tomatoes", "Cabbage", "Onions", "Carrots"]
      },
      {
        id: 2,
        name: "Maize Cultivation Project",
        type: "grains",
        area: "5 hectares",
        participants: 80,
        yield: "2 tons/season",
        crops: ["Maize", "Beans", "Groundnuts"]
      },
      {
        id: 3,
        name: "Fruit Tree Orchard",
        type: "fruits",
        area: "1.5 hectares",
        participants: 60,
        yield: "300kg/season",
        crops: ["Mangoes", "Oranges", "Avocados", "Bananas"]
      }
    ])
  }

  const loadNutritionEducation = () => {
    setNutritionEducation([
      {
        id: 1,
        topic: "Balanced Diet Basics",
        participants: 180,
        sessions: 12,
        completion: 85
      },
      {
        id: 2,
        topic: "Food Safety & Hygiene",
        participants: 165,
        sessions: 8,
        completion: 92
      },
      {
        id: 3,
        topic: "Local Nutrition Sources",
        participants: 145,
        sessions: 10,
        completion: 78
      }
    ])
  }

  const getNutritionStatusData = () => {
    return [
      { name: 'Well Nourished', value: nutritionData.nutritionStatus.wellNourished, color: '#22c55e' },
      { name: 'Mildly Malnourished', value: nutritionData.nutritionStatus.mildlyMalnourished, color: '#f59e0b' },
      { name: 'Severely Malnourished', value: nutritionData.nutritionStatus.severelyMalnourished, color: '#ef4444' }
    ]
  }

  const getMonthlyNutritionTrends = () => {
    return [
      { month: 'Jan', meals: 220, nutrition: 75 },
      { month: 'Feb', meals: 235, nutrition: 78 },
      { month: 'Mar', meals: 245, nutrition: 82 },
      { month: 'Apr', meals: 250, nutrition: 85 },
      { month: 'May', meals: 260, nutrition: 87 },
      { month: 'Jun', meals: 270, nutrition: 90 }
    ]
  }

  const mealCoverageRate = nutritionData.totalStudents > 0 
    ? Math.round((nutritionData.studentsReceivingMeals / nutritionData.totalStudents) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-yellow-600 flex items-center justify-center space-x-2">
          <span className="text-4xl">🍽️</span>
          <span>SDG 2: Zero Hunger</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          End hunger, achieve food security and improved nutrition, promote sustainable agriculture
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Utensils className="h-4 w-4 mr-2" />
              Students Fed Daily
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {nutritionData.studentsReceivingMeals}
            </div>
            <p className="text-xs text-gray-500">
              {mealCoverageRate}% meal coverage
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Apple className="h-4 w-4 mr-2" />
              Well Nourished
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {nutritionData.nutritionStatus.wellNourished}
            </div>
            <p className="text-xs text-gray-500">
              {Math.round((nutritionData.nutritionStatus.wellNourished / nutritionData.totalStudents) * 100)}% of students
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Scale className="h-4 w-4 mr-2" />
              Food Security Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {nutritionData.foodSecurityIndex}%
            </div>
            <p className="text-xs text-gray-500">
              School food security level
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Wheat className="h-4 w-4 mr-2" />
              Agricultural Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {nutritionData.agriculturalParticipation}%
            </div>
            <p className="text-xs text-gray-500">
              Student participation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Status & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Apple className="h-5 w-5" />
              <span>Nutrition Status Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getNutritionStatusData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {getNutritionStatusData().map((entry, index) => (
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
              <span>Monthly Nutrition Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getMonthlyNutritionTrends()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="meals" fill="#f59e0b" name="Meals Served" />
                <Bar dataKey="nutrition" fill="#22c55e" name="Nutrition Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feeding Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5" />
            <span>School Feeding Programs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedingPrograms.map(program => (
              <div key={program.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    program.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {program.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Beneficiaries:</span>
                    <span className="font-medium">{program.beneficiaries} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Cost:</span>
                    <span className="font-medium">ZMW {program.dailyCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nutrition Score:</span>
                    <span className="font-medium text-green-600">{program.nutritionScore}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agricultural Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wheat className="h-5 w-5" />
            <span>Agricultural Education Projects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agriculturalProjects.map(project => (
              <div key={project.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{project.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Area:</span>
                    <span className="font-medium">{project.area}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-medium">{project.participants} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yield:</span>
                    <span className="font-medium text-green-600">{project.yield}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600 text-xs">Crops:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.crops.map(crop => (
                        <span key={crop} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {crop}
                        </span>
                      ))}
                    </div>
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
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Utensils className="h-6 w-6" />
              <span>Meal Planning</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Apple className="h-6 w-6" />
              <span>Nutrition Assessment</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Wheat className="h-6 w-6" />
              <span>Garden Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Calendar className="h-6 w-6" />
              <span>Agricultural Calendar</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
