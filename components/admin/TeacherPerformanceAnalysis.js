'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Star,
  Eye,
  BookOpen,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  AlertTriangle
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
  ScatterChart,
  Scatter
} from 'recharts'

export default function TeacherPerformanceAnalysis({ 
  teacherId, 
  teacherData, 
  performanceData 
}) {
  const [selectedTerm, setSelectedTerm] = useState('all')
  const [analysisView, setAnalysisView] = useState('correlation')

  const { summaries = [], observations = [], student_performance = [] } = performanceData || {}

  // Create correlation data between observations and student performance
  const correlationData = observations.map(obs => {
    // Find corresponding student performance for the same term
    const termStudentPerf = student_performance.filter(perf => 
      perf.term === obs.observation_period && 
      perf.academic_year === obs.academic_year
    )
    
    const avgStudentScore = termStudentPerf.length > 0 
      ? termStudentPerf.reduce((sum, perf) => sum + (perf.overall_score || 0), 0) / termStudentPerf.length
      : 0

    return {
      observation_id: obs.id,
      observation_date: obs.observation_date,
      observation_score: obs.overall_score,
      student_avg_score: avgStudentScore,
      term: obs.observation_period,
      observer_name: obs.observer_name,
      observer_role: obs.observer_role,
      lesson_subject: obs.lesson_subject,
      lesson_topic: obs.lesson_topic,
      strengths: obs.strengths,
      areas_for_improvement: obs.areas_for_improvement,
      recommendations: obs.recommendations,
      action_plan: obs.action_plan,
      grade: obs.grade
    }
  })

  // Term-by-term analysis
  const termAnalysis = ['term1', 'term2', 'term3'].map(term => {
    const termObservations = observations.filter(obs => obs.observation_period === term)
    const termStudentPerf = student_performance.filter(perf => perf.term === term)
    
    const avgObservationScore = termObservations.length > 0
      ? termObservations.reduce((sum, obs) => sum + obs.overall_score, 0) / termObservations.length
      : 0

    const avgStudentScore = termStudentPerf.length > 0
      ? termStudentPerf.reduce((sum, perf) => sum + (perf.overall_score || 0), 0) / termStudentPerf.length
      : 0

    const midtermAvg = termStudentPerf.length > 0
      ? termStudentPerf.reduce((sum, perf) => sum + (perf.midterm_score || 0), 0) / termStudentPerf.length
      : 0

    const endtermAvg = termStudentPerf.length > 0
      ? termStudentPerf.reduce((sum, perf) => sum + (perf.endterm_score || 0), 0) / termStudentPerf.length
      : 0

    return {
      term: term.replace('term', 'Term '),
      observation_score: avgObservationScore,
      student_overall: avgStudentScore,
      midterm_avg: midtermAvg,
      endterm_avg: endtermAvg,
      observations_count: termObservations.length,
      students_count: termStudentPerf.length,
      written_notes: termObservations.map(obs => ({
        observer: obs.observer_name,
        role: obs.observer_role,
        strengths: obs.strengths,
        improvements: obs.areas_for_improvement,
        recommendations: obs.recommendations
      }))
    }
  })

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

  const getTrendIcon = (current, previous) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <div className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Teacher Performance Analysis
          </h1>
          <p className="text-gray-600 mt-1">
            Linking Observation Notes with Student Performance Across Terms 1, 2, and 3
          </p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={analysisView}
            onChange={(e) => setAnalysisView(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="correlation">Observation-Performance Correlation</option>
            <option value="term-analysis">Term-by-Term Analysis</option>
            <option value="written-notes">Written Notes Analysis</option>
          </select>
        </div>
      </div>

      {/* Correlation Analysis View */}
      {analysisView === 'correlation' && (
        <div className="space-y-6">
          {/* Correlation Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Observation Scores vs Student Performance Correlation
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="observation_score" 
                  name="Observation Score"
                  domain={[0, 100]}
                  label={{ value: 'Observation Score (%)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  dataKey="student_avg_score" 
                  name="Student Average Score"
                  domain={[0, 100]}
                  label={{ value: 'Student Average Score (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.lesson_subject} - {data.lesson_topic}</p>
                          <p className="text-sm text-gray-600">{data.term.replace('term', 'Term ')} - {data.observer_name} ({data.observer_role})</p>
                          <p className="text-sm">Observation Score: {data.observation_score}%</p>
                          <p className="text-sm">Student Average: {data.student_avg_score.toFixed(1)}%</p>
                          <p className="text-sm">Grade: {data.grade}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter dataKey="student_avg_score" fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>

          {/* Detailed Correlation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {correlationData.map((data, index) => (
              <Card key={index} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{data.lesson_subject} - {data.lesson_topic}</h4>
                    <p className="text-sm text-gray-600">
                      {data.term.replace('term', 'Term ')} • {new Date(data.observation_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Observer: {data.observer_name} ({data.observer_role})
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(data.grade)}`}>
                    {data.grade}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{data.observation_score}%</div>
                    <div className="text-sm text-blue-600">Observation Score</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{data.student_avg_score.toFixed(1)}%</div>
                    <div className="text-sm text-green-600">Student Average</div>
                  </div>
                </div>

                {/* Written Notes Summary */}
                <div className="space-y-3">
                  {data.strengths && (
                    <div>
                      <p className="text-sm font-medium text-green-700">Strengths:</p>
                      <p className="text-sm text-gray-600">{data.strengths.substring(0, 100)}...</p>
                    </div>
                  )}
                  {data.areas_for_improvement && (
                    <div>
                      <p className="text-sm font-medium text-orange-700">Areas for Improvement:</p>
                      <p className="text-sm text-gray-600">{data.areas_for_improvement.substring(0, 100)}...</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Term-by-Term Analysis View */}
      {analysisView === 'term-analysis' && (
        <div className="space-y-6">
          {/* Term Comparison Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Performance Trends Across Terms 1, 2, and 3
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={termAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="observation_score" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Observation Score"
                />
                <Line 
                  type="monotone" 
                  dataKey="student_overall" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Student Overall Performance"
                />
                <Line 
                  type="monotone" 
                  dataKey="midterm_avg" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Midterm Average"
                />
                <Line 
                  type="monotone" 
                  dataKey="endterm_avg" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="End-term Average"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Term Analysis Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {termAnalysis.map((term, index) => (
              <Card key={index} className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{term.term}</h4>
                  {index > 0 && getTrendIcon(term.observation_score, termAnalysis[index - 1].observation_score)}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">{term.observation_score.toFixed(1)}%</div>
                      <div className="text-xs text-blue-600">Observation</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">{term.student_overall.toFixed(1)}%</div>
                      <div className="text-xs text-green-600">Student Overall</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="text-lg font-bold text-yellow-600">{term.midterm_avg.toFixed(1)}%</div>
                      <div className="text-xs text-yellow-600">Midterm Avg</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-600">{term.endterm_avg.toFixed(1)}%</div>
                      <div className="text-xs text-red-600">End-term Avg</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>{term.observations_count} observations • {term.students_count} students</p>
                  </div>

                  {/* Written Notes Preview */}
                  {term.written_notes.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Observer Notes:</p>
                      {term.written_notes.map((note, noteIndex) => (
                        <div key={noteIndex} className="text-xs text-gray-600 mb-2">
                          <p className="font-medium">{note.observer} ({note.role}):</p>
                          {note.strengths && (
                            <p className="text-green-600">✓ {note.strengths.substring(0, 80)}...</p>
                          )}
                          {note.improvements && (
                            <p className="text-orange-600">⚠ {note.improvements.substring(0, 80)}...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Written Notes Analysis View */}
      {analysisView === 'written-notes' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detailed Written Observations and Student Performance Link
            </h3>
            
            <div className="space-y-6">
              {observations.map((obs, index) => {
                // Find corresponding student performance
                const relatedStudentPerf = student_performance.filter(perf => 
                  perf.term === obs.observation_period && 
                  perf.academic_year === obs.academic_year
                )

                const avgMidterm = relatedStudentPerf.length > 0
                  ? relatedStudentPerf.reduce((sum, perf) => sum + (perf.midterm_score || 0), 0) / relatedStudentPerf.length
                  : 0

                const avgEndterm = relatedStudentPerf.length > 0
                  ? relatedStudentPerf.reduce((sum, perf) => sum + (perf.endterm_score || 0), 0) / relatedStudentPerf.length
                  : 0

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {obs.lesson_subject} - {obs.lesson_topic}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {obs.observation_period.replace('term', 'Term ')} • {new Date(obs.observation_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Observer: {obs.observer_name} ({obs.observer_role})
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{obs.overall_score}%</div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(obs.grade)}`}>
                          {obs.grade}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Written Observations */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-gray-900">Written Observation Notes</h5>
                        
                        {obs.strengths && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="font-medium text-green-800 mb-1">Strengths:</p>
                            <p className="text-sm text-green-700">{obs.strengths}</p>
                          </div>
                        )}

                        {obs.areas_for_improvement && (
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <p className="font-medium text-orange-800 mb-1">Areas for Improvement:</p>
                            <p className="text-sm text-orange-700">{obs.areas_for_improvement}</p>
                          </div>
                        )}

                        {obs.recommendations && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-800 mb-1">Recommendations:</p>
                            <p className="text-sm text-blue-700">{obs.recommendations}</p>
                          </div>
                        )}

                        {obs.action_plan && (
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="font-medium text-purple-800 mb-1">Action Plan:</p>
                            <p className="text-sm text-purple-700">{obs.action_plan}</p>
                          </div>
                        )}
                      </div>

                      {/* Corresponding Student Performance */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-gray-900">
                          Corresponding Student Performance ({obs.observation_period.replace('term', 'Term ')})
                        </h5>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-xl font-bold text-yellow-600">{avgMidterm.toFixed(1)}%</div>
                            <div className="text-sm text-yellow-600">Midterm Average</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-xl font-bold text-red-600">{avgEndterm.toFixed(1)}%</div>
                            <div className="text-sm text-red-600">End-term Average</div>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Students in this period:</strong> {relatedStudentPerf.length}
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>Performance correlation:</strong> {
                              obs.overall_score > 80 && avgEndterm > 75 ? 'Strong positive correlation' :
                              obs.overall_score > 70 && avgEndterm > 65 ? 'Moderate positive correlation' :
                              'Needs improvement correlation'
                            }
                          </p>
                        </div>

                        {/* Individual Student Performance */}
                        {relatedStudentPerf.length > 0 && (
                          <div className="max-h-40 overflow-y-auto">
                            <p className="text-sm font-medium text-gray-700 mb-2">Individual Student Results:</p>
                            {relatedStudentPerf.slice(0, 5).map((perf, perfIndex) => (
                              <div key={perfIndex} className="text-xs text-gray-600 mb-1 flex justify-between">
                                <span>{perf.student_name}</span>
                                <span>Mid: {perf.midterm_score}% | End: {perf.endterm_score}% | Overall: {perf.overall_score}%</span>
                              </div>
                            ))}
                            {relatedStudentPerf.length > 5 && (
                              <p className="text-xs text-gray-500">...and {relatedStudentPerf.length - 5} more students</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
