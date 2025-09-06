'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen,
  Calendar,
  Target,
  Award,
  Bell,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'
import { AttendanceAnalyzer, GradeTrendAnalyzer, AssignmentTracker, AlertSystem } from '@/lib/analytics'
import { ClassStatistics, TrendAnalysis, ComparativeAnalysis, CorrelationAnalysis } from '@/lib/statisticalAnalysis'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'

export default function SmartAnalyticsDashboard({ studentData = [], classData = {}, userRole = 'teacher' }) {
  const [activeWidgets, setActiveWidgets] = useState([
    'alerts', 'performance-overview', 'attendance-analysis', 'grade-trends', 'class-comparison'
  ])
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('term') // week, month, term, year
  const [selectedMetric, setSelectedMetric] = useState('average')

  // Smart Analytics Processing
  const analyticsData = useMemo(() => {
    if (!studentData.length) return null

    // Generate alerts for all students
    const allAlerts = []
    studentData.forEach(student => {
      const alerts = AlertSystem.generateAlerts(student)
      allAlerts.push(...alerts)
    })

    // Calculate class statistics
    const classStats = ClassStatistics.calculateClassMetrics(
      studentData.flatMap(s => s.grades || [])
    )

    // Analyze attendance patterns
    const attendanceData = studentData.map(student => ({
      id: student.id,
      name: student.name,
      analysis: AttendanceAnalyzer.analyzeAttendance(student.attendance || [])
    }))

    // Grade trend analysis
    const gradeTrends = studentData.map(student => ({
      id: student.id,
      name: student.name,
      analysis: GradeTrendAnalyzer.analyzeGradeTrends(student.grades || [])
    }))

    // Correlation analysis
    const correlationData = CorrelationAnalysis.analyzeAttendancePerformanceCorrelation(studentData)

    return {
      alerts: allAlerts,
      classStats,
      attendanceData,
      gradeTrends,
      correlationData,
      riskStudents: studentData.filter(s => {
        const attendanceAnalysis = AttendanceAnalyzer.analyzeAttendance(s.attendance || [])
        const gradeAnalysis = GradeTrendAnalyzer.analyzeGradeTrends(s.grades || [])
        return attendanceAnalysis.riskLevel === 'high' || attendanceAnalysis.riskLevel === 'critical' ||
               gradeAnalysis.riskLevel === 'high' || gradeAnalysis.riskLevel === 'critical'
      })
    }
  }, [studentData, timeRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const toggleWidget = (widgetId) => {
    setActiveWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    )
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <div className="w-4 h-4 bg-gray-300 rounded-full" />
    }
  }

  if (!analyticsData) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Analytics Dashboard</h2>
          <p className="text-gray-600">AI-powered insights and early warning systems</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="input input-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="term">This Term</option>
            <option value="year">This Year</option>
          </select>
          
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="btn-secondary btn-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Widget Controls */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
        {[
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'performance-overview', label: 'Performance', icon: Target },
          { id: 'attendance-analysis', label: 'Attendance', icon: Calendar },
          { id: 'grade-trends', label: 'Grade Trends', icon: TrendingUp },
          { id: 'class-comparison', label: 'Comparisons', icon: Users },
          { id: 'correlation-analysis', label: 'Correlations', icon: BookOpen }
        ].map(widget => (
          <Button
            key={widget.id}
            onClick={() => toggleWidget(widget.id)}
            className={`btn-sm ${activeWidgets.includes(widget.id) ? 'btn-primary' : 'btn-ghost'}`}
          >
            <widget.icon className="w-4 h-4" />
            {widget.label}
            {activeWidgets.includes(widget.id) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
        ))}
      </div>

      {/* Alerts Widget */}
      {activeWidgets.includes('alerts') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
              Early Warning Alerts ({analyticsData.alerts.length})
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Priority:</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full" title="Critical"></div>
                <div className="w-3 h-3 bg-orange-500 rounded-full" title="High"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full" title="Medium"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full" title="Low"></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analyticsData.alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No alerts - All students performing well!</p>
              </div>
            ) : (
              analyticsData.alerts.map((alert, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.priority === 4 ? 'border-red-500 bg-red-50' :
                    alert.priority === 3 ? 'border-orange-500 bg-orange-50' :
                    alert.priority === 2 ? 'border-yellow-500 bg-yellow-50' :
                    'border-green-500 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {alert.actions.map((action, actionIndex) => (
                          <span 
                            key={actionIndex}
                            className="px-2 py-1 text-xs bg-white rounded border text-gray-600"
                          >
                            {action.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Performance Overview Widget */}
      {activeWidgets.includes('performance-overview') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Class Average</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.classStats.average.toFixed(1)}%
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getRiskColor(
                analyticsData.classStats.average >= 70 ? 'low' : 
                analyticsData.classStats.average >= 60 ? 'medium' : 'high'
              )}`}>
                <Target className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.classStats.passRate.toFixed(1)}%
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getRiskColor(
                analyticsData.classStats.passRate >= 80 ? 'low' : 
                analyticsData.classStats.passRate >= 60 ? 'medium' : 'high'
              )}`}>
                <Award className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At-Risk Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.riskStudents.length}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getRiskColor(
                analyticsData.riskStudents.length === 0 ? 'low' : 
                analyticsData.riskStudents.length <= 2 ? 'medium' : 'high'
              )}`}>
                <Users className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.alerts.length}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getRiskColor(
                analyticsData.alerts.length === 0 ? 'low' : 
                analyticsData.alerts.length <= 3 ? 'medium' : 'high'
              )}`}>
                <Bell className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Attendance Analysis Widget */}
      {activeWidgets.includes('attendance-analysis') && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 text-blue-500 mr-2" />
            Attendance Risk Analysis
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Risk Distribution</h4>
              <div className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map(risk => {
                  const count = analyticsData.attendanceData.filter(s => s.analysis.riskLevel === risk).length
                  const percentage = (count / analyticsData.attendanceData.length) * 100
                  
                  return (
                    <div key={risk} className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-sm ${getRiskColor(risk)}`}>
                        {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              risk === 'critical' ? 'bg-red-500' :
                              risk === 'high' ? 'bg-orange-500' :
                              risk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Students Requiring Attention</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {analyticsData.attendanceData
                  .filter(s => ['critical', 'high'].includes(s.analysis.riskLevel))
                  .map(student => (
                    <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-gray-600">{student.analysis.overall}% attendance</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getRiskColor(student.analysis.riskLevel)}`}>
                        {student.analysis.riskLevel}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Grade Trends Widget */}
      {activeWidgets.includes('grade-trends') && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
            Grade Trend Analysis
          </h3>
          
          <div className="space-y-4">
            {analyticsData.gradeTrends
              .filter(s => s.analysis.trend !== 'stable')
              .slice(0, 10)
              .map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getTrendIcon(student.analysis.trend)}
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">
                        Current Average: {student.analysis.currentAverage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-sm ${getRiskColor(student.analysis.riskLevel)}`}>
                      {student.analysis.riskLevel}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Trend: {student.analysis.trend}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}
