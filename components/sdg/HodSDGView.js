'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SDG_GOALS, calculateSDGProgress } from '@/lib/sdg-framework'
import { 
  Building, Users, DollarSign, TrendingUp, 
  Target, Award, BarChart3, Globe, Briefcase 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function HodSDGView({ hodId, departmentData = {} }) {
  const [departmentSDGProgress, setDepartmentSDGProgress] = useState({})
  const [budgetAllocation, setBudgetAllocation] = useState([])
  const [staffSDGTraining, setStaffSDGTraining] = useState([])
  const [departmentProjects, setDepartmentProjects] = useState([])

  useEffect(() => {
    // Calculate department-level SDG progress
    const progress = {}
    Object.keys(SDG_GOALS).forEach(key => {
      const sdgId = SDG_GOALS[key].id
      progress[sdgId] = calculateDepartmentSDGProgress(sdgId, departmentData)
    })
    setDepartmentSDGProgress(progress)

    loadBudgetAllocation()
    loadStaffTraining()
    loadDepartmentProjects()
  }, [departmentData])

  const calculateDepartmentSDGProgress = (sdgId, data) => {
    // HOD-specific SDG progress calculation
    const baseProgress = Math.round(Math.random() * 30 + 50) // 50-80% base
    
    // Adjust based on department-specific factors
    switch (sdgId) {
      case 1: // No Poverty
        return Math.min(100, baseProgress + (data.scholarshipPrograms || 0) * 5)
      case 4: // Quality Education
        return Math.min(100, baseProgress + (data.teacherQuality || 0) * 3)
      case 5: // Gender Equality
        return Math.min(100, baseProgress + (data.genderBalance || 0) * 4)
      case 8: // Decent Work
        return Math.min(100, baseProgress + (data.vocationalPrograms || 0) * 6)
      default:
        return baseProgress
    }
  }

  const loadBudgetAllocation = () => {
    setBudgetAllocation([
      {
        sdg: 1,
        title: "No Poverty",
        allocation: 45000,
        spent: 32000,
        programs: ["Scholarship Fund", "Student Support"]
      },
      {
        sdg: 2,
        title: "Zero Hunger",
        allocation: 38000,
        spent: 35000,
        programs: ["School Feeding", "Nutrition Education"]
      },
      {
        sdg: 4,
        title: "Quality Education",
        allocation: 120000,
        spent: 98000,
        programs: ["Teacher Training", "Learning Materials", "Technology"]
      },
      {
        sdg: 5,
        title: "Gender Equality",
        allocation: 25000,
        spent: 18000,
        programs: ["Girls' Education", "Female Teacher Support"]
      },
      {
        sdg: 6,
        title: "Clean Water",
        allocation: 30000,
        spent: 28000,
        programs: ["Water Infrastructure", "Hygiene Education"]
      }
    ])
  }

  const loadStaffTraining = () => {
    setStaffSDGTraining([
      {
        teacher: "Mrs. Mwanza",
        subject: "Mathematics",
        sdgTraining: [4, 8, 9],
        completionRate: 95,
        lastUpdated: "2024-01-15"
      },
      {
        teacher: "Mr. Banda",
        subject: "Science",
        sdgTraining: [3, 6, 13, 15],
        completionRate: 88,
        lastUpdated: "2024-01-10"
      },
      {
        teacher: "Ms. Phiri",
        subject: "Social Studies",
        sdgTraining: [1, 5, 10, 16],
        completionRate: 92,
        lastUpdated: "2024-01-12"
      },
      {
        teacher: "Mr. Tembo",
        subject: "English",
        sdgTraining: [4, 5, 10],
        completionRate: 85,
        lastUpdated: "2024-01-08"
      }
    ])
  }

  const loadDepartmentProjects = () => {
    setDepartmentProjects([
      {
        id: 1,
        name: "Department Scholarship Program",
        sdg: 1,
        budget: 45000,
        beneficiaries: 78,
        status: "active",
        impact: "Reduced dropout rate by 15%"
      },
      {
        id: 2,
        name: "STEM Girls Initiative",
        sdg: 5,
        budget: 25000,
        beneficiaries: 45,
        status: "active",
        impact: "40% increase in girls pursuing STEM"
      },
      {
        id: 3,
        name: "Teacher Professional Development",
        sdg: 4,
        budget: 60000,
        beneficiaries: 12,
        status: "ongoing",
        impact: "Improved teaching quality scores"
      },
      {
        id: 4,
        name: "Environmental Club",
        sdg: 13,
        budget: 15000,
        beneficiaries: 120,
        status: "active",
        impact: "School carbon footprint reduced by 20%"
      }
    ])
  }

  const getDepartmentOverallProgress = () => {
    const totalProgress = Object.values(departmentSDGProgress).reduce((sum, progress) => sum + progress, 0)
    return Math.round(totalProgress / Object.keys(departmentSDGProgress).length)
  }

  const getBudgetUtilization = () => {
    const totalAllocated = budgetAllocation.reduce((sum, item) => sum + item.allocation, 0)
    const totalSpent = budgetAllocation.reduce((sum, item) => sum + item.spent, 0)
    return Math.round((totalSpent / totalAllocated) * 100)
  }

  const getTopSDGsByBudget = () => {
    return budgetAllocation
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 5)
      .map(item => ({
        name: `SDG ${item.sdg}`,
        value: item.allocation,
        color: SDG_GOALS[`SDG${item.sdg}`]?.color || '#666666'
      }))
  }

  const getStaffTrainingData = () => {
    return staffSDGTraining.map(staff => ({
      name: staff.teacher.split(' ')[1], // Last name only
      completion: staff.completionRate,
      sdgCount: staff.sdgTraining.length
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-purple-600 flex items-center justify-center space-x-2">
          <Briefcase className="h-8 w-8" />
          <span>Department SDG Management</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Oversee SDG implementation across your department with budget tracking and staff coordination
        </p>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl font-bold text-purple-600">{getDepartmentOverallProgress()}%</span>
          <span className="text-gray-600">Department SDG Progress</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              SDG Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ZMW {budgetAllocation.reduce((sum, item) => sum + item.allocation, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {getBudgetUtilization()}% utilized
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Staff Trained
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {staffSDGTraining.length}
            </div>
            <p className="text-xs text-gray-500">
              Teachers with SDG training
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {departmentProjects.filter(p => p.status === 'active').length}
            </div>
            <p className="text-xs text-gray-500">
              SDG initiatives running
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
              {getDepartmentOverallProgress()}%
            </div>
            <p className="text-xs text-gray-500">
              Department contribution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation & Staff Training */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>SDG Budget Allocation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getTopSDGsByBudget()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {getTopSDGsByBudget().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `ZMW ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Staff SDG Training Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getStaffTrainingData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="completion" fill="#8b5cf6" name="Training Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budget Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Detailed Budget Allocation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetAllocation.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">SDG {item.sdg}: {item.title}</h3>
                    <p className="text-sm text-gray-600">{item.programs.join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      ZMW {item.spent.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      of ZMW {item.allocation.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.spent / item.allocation) * 100}%`,
                      backgroundColor: SDG_GOALS[`SDG${item.sdg}`]?.color || '#666666'
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {Math.round((item.spent / item.allocation) * 100)}% utilized
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Department SDG Projects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentProjects.map(project => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    project.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : project.status === 'ongoing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="mb-2">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${SDG_GOALS[`SDG${project.sdg}`]?.color}20`,
                      color: SDG_GOALS[`SDG${project.sdg}`]?.color
                    }}
                  >
                    SDG {project.sdg}: {SDG_GOALS[`SDG${project.sdg}`]?.title}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Budget:</strong> ZMW {project.budget.toLocaleString()}</div>
                  <div><strong>Beneficiaries:</strong> {project.beneficiaries}</div>
                  <div><strong>Impact:</strong> {project.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>HOD SDG Management Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <DollarSign className="h-6 w-6" />
              <span>Manage Budget</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Staff Training</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Target className="h-6 w-6" />
              <span>Create Project</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
