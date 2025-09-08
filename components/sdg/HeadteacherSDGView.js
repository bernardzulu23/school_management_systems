'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SDG_GOALS, calculateSDGProgress } from '@/lib/sdg-framework'
import { 
  School, Globe, TrendingUp, Users, 
  DollarSign, Target, Award, BarChart3, 
  Building, Handshake, FileText, Settings 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

export default function HeadteacherSDGView({ schoolId, schoolData = {} }) {
  const [schoolSDGProgress, setSchoolSDGProgress] = useState({})
  const [partnerships, setPartnerships] = useState([])
  const [strategicPlan, setStrategicPlan] = useState([])
  const [schoolImpactMetrics, setSchoolImpactMetrics] = useState({})

  useEffect(() => {
    // Calculate school-wide SDG progress
    const progress = {}
    Object.keys(SDG_GOALS).forEach(key => {
      const sdgId = SDG_GOALS[key].id
      progress[sdgId] = calculateSchoolSDGProgress(sdgId, schoolData)
    })
    setSchoolSDGProgress(progress)

    loadPartnerships()
    loadStrategicPlan()
    loadImpactMetrics()
  }, [schoolData])

  const calculateSchoolSDGProgress = (sdgId, data) => {
    // Headteacher-level comprehensive SDG calculation
    const baseProgress = Math.round(Math.random() * 25 + 60) // 60-85% base
    
    // Adjust based on school-wide factors
    switch (sdgId) {
      case 1: // No Poverty
        return Math.min(100, baseProgress + (data.povertyPrograms || 0) * 2)
      case 4: // Quality Education
        return Math.min(100, baseProgress + (data.educationQuality || 0) * 1.5)
      case 5: // Gender Equality
        return Math.min(100, baseProgress + (data.genderInitiatives || 0) * 3)
      case 17: // Partnerships
        return Math.min(100, baseProgress + (data.partnerships || 0) * 4)
      default:
        return baseProgress
    }
  }

  const loadPartnerships = () => {
    setPartnerships([
      {
        id: 1,
        name: "UNICEF Zambia",
        type: "International NGO",
        sdgFocus: [1, 2, 3, 4, 5],
        contribution: "ZMW 150,000",
        status: "active",
        impact: "Improved access to education for 200+ students"
      },
      {
        id: 2,
        name: "World Vision",
        type: "International NGO",
        sdgFocus: [1, 2, 6],
        contribution: "ZMW 80,000",
        status: "active",
        impact: "Clean water access and nutrition programs"
      },
      {
        id: 3,
        name: "Ministry of Education",
        type: "Government",
        sdgFocus: [4, 5, 10],
        contribution: "ZMW 300,000",
        status: "active",
        impact: "Teacher training and curriculum development"
      },
      {
        id: 4,
        name: "Local Community Council",
        type: "Community",
        sdgFocus: [11, 16, 17],
        contribution: "ZMW 25,000",
        status: "active",
        impact: "Community engagement and governance"
      }
    ])
  }

  const loadStrategicPlan = () => {
    setStrategicPlan([
      {
        sdg: 1,
        target: "Reduce student poverty by 30%",
        timeline: "2024-2026",
        budget: 200000,
        progress: 45,
        keyActions: ["Expand scholarship program", "Partner with local businesses", "Implement feeding program"]
      },
      {
        sdg: 4,
        target: "Achieve 95% completion rate",
        timeline: "2024-2025",
        budget: 500000,
        progress: 78,
        keyActions: ["Teacher professional development", "Learning resource enhancement", "Technology integration"]
      },
      {
        sdg: 5,
        target: "Achieve gender parity in all subjects",
        timeline: "2024-2027",
        budget: 100000,
        progress: 62,
        keyActions: ["Girls' STEM program", "Female teacher recruitment", "Gender-sensitive curriculum"]
      },
      {
        sdg: 6,
        target: "Ensure clean water access for all",
        timeline: "2024",
        budget: 150000,
        progress: 85,
        keyActions: ["Water infrastructure upgrade", "Hygiene education", "Maintenance program"]
      }
    ])
  }

  const loadImpactMetrics = () => {
    setSchoolImpactMetrics({
      totalStudentsImpacted: 450,
      teachersEngaged: 25,
      communityMembersReached: 1200,
      partnershipsActive: 4,
      totalBudget: 950000,
      budgetUtilized: 720000,
      sdgTargetsAchieved: 12,
      internationalRecognition: 2
    })
  }

  const getSchoolOverallProgress = () => {
    const totalProgress = Object.values(schoolSDGProgress).reduce((sum, progress) => sum + progress, 0)
    return Math.round(totalProgress / Object.keys(schoolSDGProgress).length)
  }

  const getSDGTrendData = () => {
    return [
      { year: '2020', progress: 45 },
      { year: '2021', progress: 52 },
      { year: '2022', progress: 61 },
      { year: '2023', progress: 68 },
      { year: '2024', progress: getSchoolOverallProgress() }
    ]
  }

  const getPartnershipByType = () => {
    const types = partnerships.reduce((acc, partner) => {
      acc[partner.type] = (acc[partner.type] || 0) + 1
      return acc
    }, {})
    
    return Object.entries(types).map(([type, count]) => ({
      name: type,
      value: count,
      color: type === 'International NGO' ? '#3b82f6' : 
             type === 'Government' ? '#10b981' : 
             type === 'Community' ? '#f59e0b' : '#8b5cf6'
    }))
  }

  const getTopPerformingSDGs = () => {
    return Object.entries(schoolSDGProgress)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([sdgId, progress]) => ({
        sdg: `SDG ${sdgId}`,
        progress,
        color: SDG_GOALS[`SDG${sdgId}`]?.color || '#666666'
      }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-blue-600 flex items-center justify-center space-x-2">
          <School className="h-8 w-8" />
          <span>School SDG Leadership Dashboard</span>
        </h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Strategic oversight of UN Sustainable Development Goals implementation across the entire school
        </p>
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-6 w-6 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{getSchoolOverallProgress()}%</span>
            <span className="text-gray-600">Overall SDG Progress</span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Students Impacted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {schoolImpactMetrics.totalStudentsImpacted}
            </div>
            <p className="text-xs text-gray-500">
              Across all SDG programs
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Handshake className="h-4 w-4 mr-2" />
              Active Partnerships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {schoolImpactMetrics.partnershipsActive}
            </div>
            <p className="text-xs text-gray-500">
              Supporting SDG initiatives
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              SDG Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ZMW {(schoolImpactMetrics.budgetUtilized / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-gray-500">
              {Math.round((schoolImpactMetrics.budgetUtilized / schoolImpactMetrics.totalBudget) * 100)}% of budget utilized
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Targets Achieved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {schoolImpactMetrics.sdgTargetsAchieved}
            </div>
            <p className="text-xs text-gray-500">
              Out of 17 SDG targets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Trends & Partnership Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>School SDG Progress Over Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getSDGTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'SDG Progress']} />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Handshake className="h-5 w-5" />
              <span>Partnership Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getPartnershipByType()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {getPartnershipByType().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing SDGs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>School's Top SDG Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTopPerformingSDGs()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sdg" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
              <Bar 
                dataKey="progress" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Strategic Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Strategic SDG Implementation Plan</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strategicPlan.map((plan, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      SDG {plan.sdg}: {plan.target}
                    </h3>
                    <p className="text-sm text-gray-600">{plan.timeline}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{plan.progress}%</div>
                    <div className="text-sm text-gray-500">ZMW {plan.budget.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${plan.progress}%`,
                        backgroundColor: SDG_GOALS[`SDG${plan.sdg}`]?.color || '#666666'
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Key Actions:</strong> {plan.keyActions.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Partnerships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Handshake className="h-5 w-5" />
            <span>Strategic Partnerships</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerships.map(partner => (
              <div key={partner.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    partner.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {partner.status}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {partner.type}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex flex-wrap gap-1">
                    {partner.sdgFocus.map(sdgId => (
                      <span 
                        key={sdgId} 
                        className="px-2 py-1 rounded text-xs"
                        style={{ 
                          backgroundColor: `${SDG_GOALS[`SDG${sdgId}`]?.color}20`,
                          color: SDG_GOALS[`SDG${sdgId}`]?.color
                        }}
                      >
                        SDG {sdgId}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Contribution:</strong> {partner.contribution}</div>
                  <div><strong>Impact:</strong> {partner.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Executive Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Executive SDG Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <FileText className="h-6 w-6" />
              <span>Generate Report</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Handshake className="h-6 w-6" />
              <span>Manage Partnerships</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Target className="h-6 w-6" />
              <span>Strategic Planning</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Settings className="h-6 w-6" />
              <span>System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
