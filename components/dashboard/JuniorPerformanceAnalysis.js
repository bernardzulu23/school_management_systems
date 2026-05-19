'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
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
} from 'recharts'
import { TrendingUp, Users, BookOpen, Award, AlertCircle, CheckCircle } from 'lucide-react'
import { JUNIOR_GRADING_SYSTEM, calculateGrade } from '@/lib/gradingSystem'

export default function JuniorPerformanceAnalysis({ results = [] }) {
  // Process data for analysis
  const analysis = useMemo(() => {
    if (!results || results.length === 0) return null

    const stats = {
      totalStudents: 0,
      gradeDistribution: {},
      subjectPerformance: {},
      teacherPerformance: {},
      overallPassRate: 0,
      totalGrades: 0,
      passingGrades: 0,
    }

    // Initialize grade distribution
    JUNIOR_GRADING_SYSTEM.grades.forEach((g) => {
      stats.gradeDistribution[g.grade] = 0
    })
    stats.gradeDistribution[JUNIOR_GRADING_SYSTEM.absent.grade] = 0

    results.forEach((student) => {
      if (!student.subjects) return
      stats.totalStudents++

      student.subjects.forEach((subject) => {
        const score = subject.score
        const gradeInfo = calculateGrade(score, 'form1') // Default to form1 logic as per requirement

        // Update grade distribution
        if (stats.gradeDistribution[gradeInfo.grade] !== undefined) {
          stats.gradeDistribution[gradeInfo.grade]++
        }

        stats.totalGrades++
        // Check if passing (Grade 1-4)
        const isPassing = ['1', '2', '3', '4'].includes(gradeInfo.grade)
        if (isPassing) {
          stats.passingGrades++
        }

        // Subject Performance
        if (!stats.subjectPerformance[subject.name]) {
          stats.subjectPerformance[subject.name] = {
            name: subject.name,
            total: 0,
            passed: 0,
            grades: { 1: 0, 2: 0, 3: 0, 4: 0, F: 0, X: 0 },
            totalScore: 0,
          }
        }
        stats.subjectPerformance[subject.name].total++
        stats.subjectPerformance[subject.name].totalScore += Number(score) || 0
        if (stats.subjectPerformance[subject.name].grades[gradeInfo.grade] !== undefined) {
          stats.subjectPerformance[subject.name].grades[gradeInfo.grade]++
        }
        if (isPassing) {
          stats.subjectPerformance[subject.name].passed++
        }

        // Teacher Performance (teacher+subject granularity)
        if (subject.teacher) {
          const teacherKey = `${subject.teacher}||${subject.name}`
          if (!stats.teacherPerformance[teacherKey]) {
            stats.teacherPerformance[teacherKey] = {
              name: subject.teacher,
              subject: subject.name,
              total: 0,
              passed: 0,
              totalScore: 0,
            }
          }
          stats.teacherPerformance[teacherKey].total++
          stats.teacherPerformance[teacherKey].totalScore += Number(score) || 0
          if (isPassing) {
            stats.teacherPerformance[teacherKey].passed++
          }
        }
      })
    })

    stats.overallPassRate =
      stats.totalGrades > 0 ? Math.round((stats.passingGrades / stats.totalGrades) * 100) : 0

    return stats
  }, [results])

  if (!analysis) {
    return (
      <Card variant="glass" className="w-full">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <BookOpen className="h-12 w-12 text-royalPurple-text3 mb-4" />
            <h3 className="text-xl font-bold text-royalPurple-text1 mb-2">
              No Junior Results Data Available
            </h3>
            <p className="text-royalPurple-text2">
              Analysis for Form 1 and Form 2 results will appear here once data is available.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const gradeDistributionData = Object.entries(analysis.gradeDistribution).map(([name, value]) => ({
    name,
    value,
    color:
      JUNIOR_GRADING_SYSTEM.grades.find((g) => g.grade === name)?.color === 'green'
        ? '#10b981'
        : JUNIOR_GRADING_SYSTEM.grades.find((g) => g.grade === name)?.color === 'blue'
          ? '#3b82f6'
          : JUNIOR_GRADING_SYSTEM.grades.find((g) => g.grade === name)?.color === 'purple'
            ? '#8b5cf6'
            : JUNIOR_GRADING_SYSTEM.grades.find((g) => g.grade === name)?.color === 'yellow'
              ? '#f59e0b'
              : JUNIOR_GRADING_SYSTEM.grades.find((g) => g.grade === name)?.color === 'red'
                ? '#ef4444'
                : '#9ca3af',
  }))

  const subjectPerformanceData = Object.values(analysis.subjectPerformance)
    .map((subject) => ({
      name: subject.name,
      passRate: Math.round((subject.passed / subject.total) * 100),
      averageScore: Math.round(subject.totalScore / subject.total),
    }))
    .sort((a, b) => b.passRate - a.passRate)

  const teacherPerformanceData = Object.values(analysis.teacherPerformance)
    .map((teacher) => ({
      name: teacher.name,
      subject: teacher.subject,
      passRate: Math.round((teacher.passed / teacher.total) * 100),
      averageScore: Math.round(teacher.totalScore / teacher.total),
    }))
    .sort((a, b) => b.passRate - a.passRate)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
            <Award className="h-6 w-6 mr-2 text-yellow-400" />
            Junior Academic Performance (Forms 1-2)
          </h2>
          <p className="text-royalPurple-text2 mt-1">
            Analysis based on grading system: 1 (Distinction), 2 (Merit), 3 (Credit), 4 (Pass), F
            (Fail)
          </p>
        </div>
        <div className="bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-xl px-6 py-3">
          <p className="text-royalPurple-text3 text-sm">Overall Pass Rate</p>
          <p
            className={`text-2xl font-bold ${
              analysis.overallPassRate >= 75
                ? 'text-royalPurple-successTx'
                : analysis.overallPassRate >= 50
                  ? 'text-royalPurple-accentTx'
                  : 'text-orange-400'
            }`}
          >
            {analysis.overallPassRate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grade Distribution */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
              Overall Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#666666',
                      color: '#fff',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {gradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {subjectPerformanceData.map((subject, index) => (
                <div
                  key={index}
                  className="p-3 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-royalPurple-text1">{subject.name}</h4>
                    <p className="text-xs text-royalPurple-text2">
                      Avg. Score: {subject.averageScore}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-bold ${
                        subject.passRate >= 75
                          ? 'text-royalPurple-successTx'
                          : subject.passRate >= 50
                            ? 'text-royalPurple-accentTx'
                            : 'text-royalPurple-dangerTx'
                      }`}
                    >
                      {subject.passRate}%
                    </span>
                    <p className="text-xs text-royalPurple-text3">Pass Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Performance */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <Users className="h-5 w-5 mr-2 text-royalPurple-successTx" />
            Teacher Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-royalPurple-border/50">
                  <th className="text-left py-3 text-royalPurple-text2 font-semibold">Teacher</th>
                  <th className="text-left py-3 text-royalPurple-text2 font-semibold">Subject</th>
                  <th className="text-center py-3 text-royalPurple-text2 font-semibold">
                    Avg. Score
                  </th>
                  <th className="text-center py-3 text-royalPurple-text2 font-semibold">
                    Pass Rate
                  </th>
                  <th className="text-right py-3 text-royalPurple-text2 font-semibold">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody>
                {teacherPerformanceData.map((teacher, index) => (
                  <tr
                    key={index}
                    className="border-b border-royalPurple-border/50 hover:bg-royalPurple-muted/40"
                  >
                    <td className="py-3 text-royalPurple-text1 font-medium">{teacher.name}</td>
                    <td className="py-3 text-royalPurple-text2">{teacher.subject}</td>
                    <td className="py-3 text-center text-royalPurple-text1">
                      {teacher.averageScore}%
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          teacher.passRate >= 75
                            ? 'bg-royalPurple-success/20 text-royalPurple-successTx'
                            : teacher.passRate >= 50
                              ? 'bg-royalPurple-accent/20 text-royalPurple-accentTx'
                              : 'bg-royalPurple-danger/20 text-royalPurple-dangerTx'
                        }`}
                      >
                        {teacher.passRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-24 bg-royalPurple-muted h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              teacher.passRate >= 75
                                ? 'bg-royalPurple-success'
                                : teacher.passRate >= 50
                                  ? 'bg-royalPurple-accent'
                                  : 'bg-royalPurple-danger'
                            }`}
                            style={{ width: `${teacher.passRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
