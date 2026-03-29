'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { SDG_GOALS, calculateSDGProgress } from '@/lib/sdg-framework'
import {
  School,
  Globe,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  BarChart3,
  Building,
  HeartHandshake,
  FileText,
  Settings,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function HeadteacherSDGView({ schoolId, schoolData = {} }) {
  const [schoolSDGProgress, setSchoolSDGProgress] = useState({})
  const [partnerships, setPartnerships] = useState([])
  const [strategicPlan, setStrategicPlan] = useState([])
  const [schoolImpactMetrics, setSchoolImpactMetrics] = useState({})

  useEffect(() => {
    // Calculate school-wide SDG progress
    const progress = {}
    Object.keys(SDG_GOALS).forEach((key) => {
      const sdgId = SDG_GOALS[key].id
      progress[sdgId] = calculateSchoolSDGProgress(sdgId, schoolData)
    })
    setSchoolSDGProgress(progress)

    loadPartnerships()
    loadStrategicPlan()
    loadImpactMetrics()
  }, [schoolData])

  const calculateSchoolSDGProgress = (sdgId, data) => {
    // TODO: Implement actual calculation logic based on schoolData
    return 0
  }

  const loadPartnerships = () => {
    // TODO: Fetch partnerships from API
    setPartnerships([])
  }

  const loadStrategicPlan = () => {
    // TODO: Fetch strategic plan from API
    setStrategicPlan([])
  }

  const loadImpactMetrics = () => {
    // TODO: Fetch impact metrics from API
    setSchoolImpactMetrics({
      totalStudentsImpacted: 0,
      teachersEngaged: 0,
      communityMembersReached: 0,
      partnershipsActive: 0,
      totalBudget: 0,
      budgetUtilized: 0,
      sdgTargetsAchieved: 0,
      internationalRecognition: 0,
    })
  }

  const getSchoolOverallProgress = () => {
    if (Object.keys(schoolSDGProgress).length === 0) return 0
    const totalProgress = Object.values(schoolSDGProgress).reduce(
      (sum, progress) => sum + progress,
      0
    )
    return Math.round(totalProgress / Object.keys(schoolSDGProgress).length)
  }

  const getSDGTrendData = () => {
    // TODO: Fetch trend data from API
    return []
  }

  const getPartnershipByType = () => {
    const types = partnerships.reduce((acc, partner) => {
      acc[partner.type] = (acc[partner.type] || 0) + 1
      return acc
    }, {})

    return Object.entries(types).map(([type, count]) => ({
      name: type,
      value: count,
      color:
        type === 'International NGO'
          ? '#3b82f6'
          : type === 'Government'
            ? '#10b981'
            : type === 'Community'
              ? '#f59e0b'
              : '#8b5cf6',
    }))
  }

  const getTopPerformingSDGs = () => {
    return Object.entries(schoolSDGProgress)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([sdgId, progress]) => ({
        sdg: `SDG ${sdgId}`,
        progress,
        color: SDG_GOALS[`SDG${sdgId}`]?.color || '#666666',
      }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-royalPurple-accentTx flex items-center justify-center space-x-2">
          <School className="h-8 w-8" />
          <span>School SDG Leadership Dashboard</span>
        </h1>
        <p className="text-royalPurple-text2 max-w-3xl mx-auto">
          Strategic oversight of UN Sustainable Development Goals implementation across the entire
          school
        </p>
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-6 w-6 text-royalPurple-accentTx" />
            <span className="text-2xl font-bold text-royalPurple-accentTx">
              {getSchoolOverallProgress()}%
            </span>
            <span className="text-royalPurple-text2">Overall SDG Progress</span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-royalPurple-text2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Students Impacted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-royalPurple-accentTx">
              {schoolImpactMetrics.totalStudentsImpacted}
            </div>
            <p className="text-xs text-royalPurple-text3">Across all SDG programs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-royalPurple-text2 flex items-center">
              <HeartHandshake className="h-4 w-4 mr-2" />
              Active Partnerships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-royalPurple-successTx">
              {schoolImpactMetrics.partnershipsActive}
            </div>
            <p className="text-xs text-royalPurple-text3">Supporting SDG initiatives</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-royalPurple-text2 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              SDG Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-royalPurple-pillTx">
              ZMW {(schoolImpactMetrics.budgetUtilized / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-royalPurple-text3">
              {Math.round(
                (schoolImpactMetrics.budgetUtilized / schoolImpactMetrics.totalBudget) * 100
              )}
              % of budget utilized
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-royalPurple-text2 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Targets Achieved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {schoolImpactMetrics.sdgTargetsAchieved}
            </div>
            <p className="text-xs text-royalPurple-text3">Out of 17 SDG targets</p>
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
              <HeartHandshake className="h-5 w-5" />
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
              <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                    <h3 className="font-semibold text-royalPurple-text1">
                      SDG {plan.sdg}: {plan.target}
                    </h3>
                    <p className="text-sm text-royalPurple-text2">{plan.timeline}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-royalPurple-successTx">
                      {plan.progress}%
                    </div>
                    <div className="text-sm text-royalPurple-text3">
                      ZMW {plan.budget.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="w-full bg-royalPurple-card2 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${plan.progress}%`,
                        backgroundColor: SDG_GOALS[`SDG${plan.sdg}`]?.color || '#666666',
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-royalPurple-text2">
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
            <HeartHandshake className="h-5 w-5" />
            <span>Strategic Partnerships</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerships.map((partner) => (
              <div key={partner.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-royalPurple-text1">{partner.name}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      partner.status === 'active'
                        ? 'bg-royalPurple-success text-royalPurple-successTx'
                        : 'bg-royalPurple-card2 text-royalPurple-text1'
                    }`}
                  >
                    {partner.status}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="px-2 py-1 bg-royalPurple-accent text-royalPurple-accentTx text-xs rounded">
                    {partner.type}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex flex-wrap gap-1">
                    {partner.sdgFocus.map((sdgId) => (
                      <span
                        key={sdgId}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: `${SDG_GOALS[`SDG${sdgId}`]?.color}20`,
                          color: SDG_GOALS[`SDG${sdgId}`]?.color,
                        }}
                      >
                        SDG {sdgId}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-royalPurple-text2">
                  <div>
                    <strong>Contribution:</strong> {partner.contribution}
                  </div>
                  <div>
                    <strong>Impact:</strong> {partner.impact}
                  </div>
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
              <HeartHandshake className="h-6 w-6" />
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
