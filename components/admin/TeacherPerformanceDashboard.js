'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Star, 
  Users, 
  BookOpen, 
  Calendar,
  FileText,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Eye,
  Plus
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

export default function TeacherPerformanceDashboard({ 
  teacherId, 
  teacherData, 
  performanceData, 
  onNewObservation,
  onViewDetails 
}) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedTerm, setSelectedTerm] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  const { summaries = [], observations = [], student_performance = [], overall_metrics = {} } = performanceData || {}

  // Calculate performance trends
  const performanceTrend = summaries.map(summary => ({
    term: summary.term.replace('term', 'Term '),
    observation_score: summary.average_observation_score || 0,
    student_performance: summary.average_student_performance || 0,
    overall_rating: summary.overall_rating
  }))

  // Grade distribution data
  const gradeDistribution = observations.reduce((acc, obs) => {
    acc[obs.grade] = (acc[obs.grade] || 0) + 1
    return acc
  }, {})

  const gradeData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
    percentage: ((count / observations.length) * 100).toFixed(1)
  }))

  // Subject performance data
  const subjectPerformance = student_performance.reduce((acc, perf) => {
    if (!acc[perf.subject_name]) {
      acc[perf.subject_name] = {
        subject: perf.subject_name,
        term1: 0,
        term2: 0,
        term3: 0,
        count1: 0,
        count2: 0,
        count3: 0
      }
    }
    
    const termKey = `term${perf.term.replace('term', '')}`
    const countKey = `count${perf.term.replace('term', '')}`
    
    acc[perf.subject_name][termKey] += perf.overall_score || 0
    acc[perf.subject_name][countKey] += 1
    
    return acc
  }, {})

  const subjectData = Object.values(subjectPerformance).map(subject => ({
    ...subject,
    term1: subject.count1 > 0 ? (subject.term1 / subject.count1).toFixed(1) : 0,
    term2: subject.count2 > 0 ? (subject.term2 / subject.count2).toFixed(1) : 0,
    term3: subject.count3 > 0 ? (subject.term3 / subject.count3).toFixed(1) : 0
  }))

  // Observation criteria radar data
  const latestObservation = observations[0]
  const radarData = latestObservation?.scores ? Object.entries(latestObservation.scores).map(([criterion, score]) => ({
    criterion: criterion.replace(/([A-Z])/g, ' $1').trim(),
    score: score || 0,
    fullMark: 100
  })) : []

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'Outstanding': return 'text-green-600 bg-green-100'
      case 'Good': return 'text-blue-600 bg-blue-100'
      case 'Satisfactory': return 'text-yellow-600 bg-yellow-100'
      case 'Needs Improvement': return 'text-orange-600 bg-orange-100'
      case 'Unsatisfactory': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-6 h-6" />
            {teacherData?.name} - Performance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            {teacherData?.department} • Employee ID: {teacherData?.employee_id}
          </p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
          
          <Button onClick={onNewObservation} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Observation
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Observations</p>
              <p className="text-2xl font-bold text-gray-900">{overall_metrics.total_observations || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">This academic year</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {overall_metrics.average_observation_score?.toFixed(1) || '0.0'}%
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Star className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {getTrendIcon(overall_metrics.performance_trend)}
            <span className="text-sm text-gray-600 capitalize">
              {overall_metrics.performance_trend || 'stable'} trend
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students Taught</p>
              <p className="text-2xl font-bold text-gray-900">{overall_metrics.total_students_taught || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Across all subjects</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Student Performance</p>
              <p className="text-2xl font-bold text-gray-900">
                {overall_metrics.average_student_performance?.toFixed(1) || '0.0'}%
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Average class performance</span>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: TrendingUp },
            { id: 'observations', name: 'Observations', icon: Eye },
            { id: 'student-performance', name: 'Student Performance', icon: Users },
            { id: 'development', name: 'Development', icon: Target }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Trend Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="observation_score" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Observation Score"
                />
                <Line 
                  type="monotone" 
                  dataKey="student_performance" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Student Performance"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Grade Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Subject Performance */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance by Term</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="term1" fill="#3B82F6" name="Term 1" />
                <Bar dataKey="term2" fill="#10B981" name="Term 2" />
                <Bar dataKey="term3" fill="#F59E0B" name="Term 3" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {activeTab === 'observations' && (
        <div className="space-y-6">
          {/* Latest Observation Radar */}
          {radarData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Latest Observation Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Observations List */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Observations</h3>
            <div className="space-y-4">
              {observations.map((observation) => (
                <div key={observation.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {observation.lesson_subject} - {observation.lesson_topic}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {observation.class_observed} • {new Date(observation.observation_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {observation.overall_score}%
                      </div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(observation.grade)}`}>
                        {observation.grade}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Observer:</p>
                      <p className="text-gray-600">{observation.observer_name} ({observation.observer_role})</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Tool:</p>
                      <p className="text-gray-600">{observation.tool_name}</p>
                    </div>
                  </div>

                  {observation.strengths && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 text-sm">Strengths:</p>
                      <p className="text-gray-600 text-sm">{observation.strengths}</p>
                    </div>
                  )}

                  {observation.areas_for_improvement && (
                    <div className="mt-2">
                      <p className="font-medium text-gray-700 text-sm">Areas for Improvement:</p>
                      <p className="text-gray-600 text-sm">{observation.areas_for_improvement}</p>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(observation)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'student-performance' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance Analysis</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Term
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Midterm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Term
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Improvement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {student_performance.map((perf, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {perf.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {perf.subject_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {perf.term.replace('term', 'Term ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {perf.midterm_score || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {perf.endterm_score || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {perf.overall_score}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(perf.grade)}`}>
                          {perf.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {perf.improvement_from_previous_term ? (
                          <span className={`flex items-center gap-1 ${
                            perf.improvement_from_previous_term > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {perf.improvement_from_previous_term > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {Math.abs(perf.improvement_from_previous_term)}%
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'development' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Development</h3>
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Development plans and goals will be displayed here</p>
              <Button className="mt-4">Create Development Plan</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
