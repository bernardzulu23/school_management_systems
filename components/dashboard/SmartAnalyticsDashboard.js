'use client'

import { useState, useEffect, useMemo } from 'react'
import { subDays, subMonths, subYears, isAfter, parseISO, isValid } from 'date-fns'
import { Card } from '@/components/ui/card'
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
  EyeOff,
} from 'lucide-react'
import {
  AttendanceAnalyzer,
  GradeTrendAnalyzer,
  AssignmentTracker,
  AlertSystem,
} from '@/lib/analytics'
import {
  ClassStatistics,
  TrendAnalysis,
  ComparativeAnalysis,
  CorrelationAnalysis,
} from '@/lib/statisticalAnalysis'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts'

export default function SmartAnalyticsDashboard({
  studentData = [],
  classData = {},
  userRole = 'teacher',
}) {
  const [activeWidgets, setActiveWidgets] = useState([
    'alerts',
    'performance-overview',
    'attendance-analysis',
    'grade-trends',
    'class-comparison',
  ])
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('term') // week, month, term, year
  const [selectedMetric, setSelectedMetric] = useState('average')

  // Smart Analytics Processing
  const analyticsData = useMemo(() => {
    if (!studentData.length) return null

    // Helper to filter by date
    const filterByDate = (dateString) => {
      if (!dateString) return true // Keep if no date (fallback)
      const date = new Date(dateString)
      if (!isValid(date)) return true

      const now = new Date()
      let cutoffDate

      switch (timeRange) {
        case 'week':
          cutoffDate = subDays(now, 7)
          break
        case 'month':
          cutoffDate = subMonths(now, 1)
          break
        case 'term':
          cutoffDate = subMonths(now, 4) // Approximate term as 4 months
          break
        case 'year':
          cutoffDate = subYears(now, 1)
          break
        default:
          return true
      }
      return isAfter(date, cutoffDate)
    }

    // Clone and filter student data based on time range
    const filteredStudentData = studentData.map((student) => ({
      ...student,
      grades: (student.grades || []).filter((g) => filterByDate(g.date || g.createdAt)),
      attendance: (student.attendance || []).filter((a) =>
        filterByDate(a.date || a.createdAt || a.timestamp)
      ),
      // Also filter assignments if they have completion dates or due dates relevant to the period
      assignments: (student.assignments || []).filter((a) =>
        filterByDate(a.dueDate || a.createdAt)
      ),
    }))

    // Use filtered data for analytics
    // Generate alerts for all students
    const allAlerts = []
    filteredStudentData.forEach((student) => {
      const alerts = AlertSystem.generateAlerts(student)
      allAlerts.push(...alerts)
    })

    // Calculate class statistics
    const classStats = ClassStatistics.calculateClassMetrics(
      filteredStudentData.flatMap((s) => s.grades || [])
    )

    // Analyze attendance patterns
    const attendanceData = filteredStudentData.map((student) => ({
      id: student.id,
      name: student.name,
      analysis: AttendanceAnalyzer.analyzeAttendance(student.attendance || []),
    }))

    // Grade trend analysis
    const gradeTrends = filteredStudentData.map((student) => ({
      id: student.id,
      name: student.name,
      analysis: GradeTrendAnalyzer.analyzeGradeTrends(student.grades || []),
    }))

    // Correlation analysis
    const correlationData =
      CorrelationAnalysis.analyzeAttendancePerformanceCorrelation(filteredStudentData)

    return {
      alerts: allAlerts,
      classStats,
      attendanceData,
      gradeTrends,
      correlationData,
      riskStudents: filteredStudentData.filter((s) => {
        const attendanceAnalysis = AttendanceAnalyzer.analyzeAttendance(s.attendance || [])
        const gradeAnalysis = GradeTrendAnalyzer.analyzeGradeTrends(s.grades || [])
        return (
          attendanceAnalysis.riskLevel === 'high' ||
          attendanceAnalysis.riskLevel === 'critical' ||
          gradeAnalysis.riskLevel === 'high' ||
          gradeAnalysis.riskLevel === 'critical'
        )
      }),
    }
  }, [studentData, timeRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate data refresh
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const toggleWidget = (widgetId) => {
    setActiveWidgets((prev) =>
      prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
    )
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return 'text-royalPurple-dangerTx bg-royalPurple-danger border-royalPurple-border'
      case 'high':
        return 'text-royalPurple-dangerTx bg-royalPurple-danger border-royalPurple-border'
      case 'medium':
        return 'text-royalPurple-accentTx bg-royalPurple-accentBg border-royalPurple-border2'
      case 'low':
        return 'text-royalPurple-successTx bg-royalPurple-success border-royalPurple-border'
      default:
        return 'text-royalPurple-text2 bg-royalPurple-page border-royalPurple-border'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-royalPurple-successTx" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-royalPurple-dangerTx" />
      default:
        return <div className="w-4 h-4 bg-royalPurple-card2 rounded-full" />
    }
  }

  if (!analyticsData) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-royalPurple-card2 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-royalPurple-card2 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-royalPurple-text1">Smart Analytics Dashboard</h2>
          <p className="text-royalPurple-text2">AI-powered insights and early warning systems</p>
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

          <Button onClick={handleRefresh} disabled={refreshing} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Widget Controls */}
      <div className="flex flex-wrap gap-2 p-4 bg-royalPurple-page rounded-lg">
        {[
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'performance-overview', label: 'Performance', icon: Target },
          { id: 'attendance-analysis', label: 'Attendance', icon: Calendar },
          { id: 'grade-trends', label: 'Grade Trends', icon: TrendingUp },
          { id: 'class-comparison', label: 'Comparisons', icon: Users },
          { id: 'correlation-analysis', label: 'Correlations', icon: BookOpen },
        ].map((widget) => (
          <Button
            key={widget.id}
            onClick={() => toggleWidget(widget.id)}
            className={`btn-sm ${activeWidgets.includes(widget.id) ? 'btn-primary' : 'btn-ghost'}`}
          >
            <widget.icon className="w-4 h-4" />
            {widget.label}
            {activeWidgets.includes(widget.id) ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </Button>
        ))}
      </div>

      {/* Alerts Widget */}
      {activeWidgets.includes('alerts') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="w-5 h-5 text-royalPurple-dangerTx mr-2" />
              Early Warning Alerts ({analyticsData.alerts.length})
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-royalPurple-text3">Priority:</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-royalPurple-danger rounded-full" title="Critical"></div>
                <div className="w-3 h-3 bg-royalPurple-danger rounded-full" title="High"></div>
                <div className="w-3 h-3 bg-royalPurple-accent rounded-full" title="Medium"></div>
                <div className="w-3 h-3 bg-royalPurple-success rounded-full" title="Low"></div>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analyticsData.alerts.length === 0 ? (
              <div className="text-center py-8 text-royalPurple-text3">
                <Award className="w-12 h-12 mx-auto mb-2 text-royalPurple-successTx" />
                <p>No alerts - All students performing well!</p>
              </div>
            ) : (
              analyticsData.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.priority === 4
                      ? 'border-royalPurple-border bg-royalPurple-danger'
                      : alert.priority === 3
                        ? 'border-royalPurple-danger bg-royalPurple-danger'
                        : alert.priority === 2
                          ? 'border-royalPurple-accent bg-royalPurple-accentBg'
                          : 'border-royalPurple-border bg-royalPurple-success'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-royalPurple-text1">{alert.title}</h4>
                      <p className="text-sm text-royalPurple-text2 mt-1">{alert.message}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {alert.actions.map((action, actionIndex) => (
                          <span
                            key={actionIndex}
                            className="px-2 py-1 text-xs bg-royalPurple-card rounded border text-royalPurple-text2"
                          >
                            {action.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-royalPurple-text3">
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
                <p className="text-sm text-royalPurple-text2">Class Average</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {analyticsData.classStats.average.toFixed(1)}%
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${getRiskColor(
                  analyticsData.classStats.average >= 70
                    ? 'low'
                    : analyticsData.classStats.average >= 60
                      ? 'medium'
                      : 'high'
                )}`}
              >
                <Target className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-royalPurple-text2">Pass Rate</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {analyticsData.classStats.passRate.toFixed(1)}%
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${getRiskColor(
                  analyticsData.classStats.passRate >= 80
                    ? 'low'
                    : analyticsData.classStats.passRate >= 60
                      ? 'medium'
                      : 'high'
                )}`}
              >
                <Award className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-royalPurple-text2">At-Risk Students</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {analyticsData.riskStudents.length}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${getRiskColor(
                  analyticsData.riskStudents.length === 0
                    ? 'low'
                    : analyticsData.riskStudents.length <= 2
                      ? 'medium'
                      : 'high'
                )}`}
              >
                <Users className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-royalPurple-text2">Active Alerts</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {analyticsData.alerts.length}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${getRiskColor(
                  analyticsData.alerts.length === 0
                    ? 'low'
                    : analyticsData.alerts.length <= 3
                      ? 'medium'
                      : 'high'
                )}`}
              >
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
            <Calendar className="w-5 h-5 text-royalPurple-accentTx mr-2" />
            Attendance Risk Analysis
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Risk Distribution</h4>
              <div className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map((risk) => {
                  const count = analyticsData.attendanceData.filter(
                    (s) => s.analysis.riskLevel === risk
                  ).length
                  const percentage = (count / analyticsData.attendanceData.length) * 100

                  return (
                    <div key={risk} className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-sm ${getRiskColor(risk)}`}>
                        {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-royalPurple-card2 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              risk === 'critical'
                                ? 'bg-royalPurple-danger'
                                : risk === 'high'
                                  ? 'bg-orange-500'
                                  : risk === 'medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-royalPurple-success'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-royalPurple-text2 w-12">{count}</span>
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
                  .filter((s) => ['critical', 'high'].includes(s.analysis.riskLevel))
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 bg-royalPurple-page rounded"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-royalPurple-text2">
                          {student.analysis.overall}% attendance
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getRiskColor(student.analysis.riskLevel)}`}
                      >
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
            <TrendingUp className="w-5 h-5 text-royalPurple-successTx mr-2" />
            Grade Trend Analysis
          </h3>

          <div className="space-y-4">
            {analyticsData.gradeTrends
              .filter((s) => s.analysis.trend !== 'stable')
              .slice(0, 10)
              .map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-royalPurple-page rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getTrendIcon(student.analysis.trend)}
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-royalPurple-text2">
                        Current Average: {student.analysis.currentAverage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-sm ${getRiskColor(student.analysis.riskLevel)}`}
                    >
                      {student.analysis.riskLevel}
                    </span>
                    <p className="text-xs text-royalPurple-text3 mt-1">
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
