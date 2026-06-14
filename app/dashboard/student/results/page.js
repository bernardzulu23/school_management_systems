'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { BarChart3, Search, Filter, Download, TrendingUp, Award, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useSchoolCapabilities } from '@/lib/school/useSchoolCapabilities'
import { PrimarySchoolFeatureUnavailable } from '@/components/school/PrimarySchoolFeatureUnavailable'

export default function StudentResultsPage() {
  const router = useRouter()
  const currentUser = useAuth((state) => state.user)
  const { canAccessSecondaryGrading, isLoading: schoolLoading } = useSchoolCapabilities()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('All')
  const [selectedResultType, setSelectedResultType] = useState('All')
  const [error, setError] = useState(null)

  useEffect(() => {
    const role = String(currentUser?.role || '').toLowerCase()
    if (role && role !== 'student') {
      const path =
        role === 'admin'
          ? '/dashboard/admin'
          : role === 'headteacher'
            ? '/dashboard/headteacher'
            : role === 'teacher'
              ? '/dashboard/teacher'
              : role === 'hod'
                ? '/dashboard/hod'
                : '/dashboard'
      router.replace(path)
      return
    }
    fetchResults()
  }, [currentUser, router])

  const fetchResults = async () => {
    try {
      const fetchResultsRequest = async () =>
        fetch('/api/student/results', { credentials: 'include', cache: 'no-store' })

      let response = await fetchResultsRequest()
      if (response.status === 401) {
        const refresh = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        })
        if (refresh.ok) {
          response = await fetchResultsRequest()
        }
      }
      if (!response.ok) throw new Error('Failed to fetch results')
      const data = await response.json()
      setResults(data.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load results. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Filter results
  const filteredResults = results.filter((result) => {
    const matchesSearch = result.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTerm = selectedTerm === 'All' || result.term === selectedTerm
    const matchesType =
      selectedResultType === 'All' ||
      String(result.resultType || '') === selectedResultType ||
      String(result.result_type_label || '') === selectedResultType
    return matchesSearch && matchesTerm && matchesType
  })

  const resultTypes = [
    'All',
    ...new Set(results.map((r) => r.result_type_label || r.resultType).filter(Boolean)),
  ]

  // Get unique terms for filter
  const terms = ['All', ...new Set(results.map((r) => r.term))]

  // Calculate stats
  const averageScore =
    results.length > 0
      ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(1)
      : 0

  const highestScore = results.length > 0 ? Math.max(...results.map((r) => r.score)) : 0

  const handleExport = () => {
    const rows = filteredResults.map((r) => ({
      Subject: r.subject,
      Code: r.subjectCode || '',
      Term: r.term,
      Year: r.year,
      Type: r.result_type_label || r.resultType || '',
      Score: r.score,
      Grade: r.grade,
      Date: r.date,
      Comments: r.comments || '',
    }))

    const headers = Object.keys(rows[0] || {})
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my_results_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!schoolLoading && !canAccessSecondaryGrading) {
    return (
      <DashboardLayout title="My Results">
        <PrimarySchoolFeatureUnavailable title="Secondary grading unavailable">
          <p>
            Term grades and secondary result types are not shown for primary learners (ECE–Grade 7).
            Your school uses CBC continuous assessment instead.
          </p>
        </PrimarySchoolFeatureUnavailable>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Results">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-royalPurple-accent text-royalPurple-accentTx rounded-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-royalPurple-text3">Total Assessments</p>
                <h3 className="text-2xl font-bold text-royalPurple-text1">{results.length}</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-royalPurple-success text-royalPurple-successTx rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-royalPurple-text3">Average Score</p>
                <h3 className="text-2xl font-bold text-royalPurple-text1">{averageScore}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-royalPurple-pill text-royalPurple-pillTx rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-royalPurple-text3">Highest Score</p>
                <h3 className="text-2xl font-bold text-royalPurple-text1">{highestScore}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-royalPurple-card p-4 rounded-lg shadow-sm">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-g-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-g-500 bg-royalPurple-card"
              value={selectedResultType}
              onChange={(e) => setSelectedResultType(e.target.value)}
            >
              {resultTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All types' : type}
                </option>
              ))}
            </select>

            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-g-500 bg-royalPurple-card"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              {terms.map((term) => (
                <option key={term} value={term}>
                  {term === 'All' ? 'All Terms' : term}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExport}
              disabled={filteredResults.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Results List */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading results...</div>
            ) : error ? (
              <div className="text-center py-8 text-royalPurple-dangerTx flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-2" />
                {error}
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-royalPurple-text3">
                No results found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-royalPurple-text2 uppercase bg-royalPurple-page">
                    <tr>
                      <th className="px-6 py-3">Subject</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Term</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result) => (
                      <tr
                        key={result.id}
                        className="bg-royalPurple-card border-b hover:bg-royalPurple-page"
                      >
                        <td className="px-6 py-4 font-medium text-royalPurple-text1">
                          {result.subject}
                          <span className="block text-xs text-royalPurple-text3">
                            {result.subjectCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">{result.result_type_label || 'End of term'}</td>
                        <td className="px-6 py-4">
                          {result.term} {result.year}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              result.score >= 70
                                ? 'bg-royalPurple-success text-royalPurple-successTx'
                                : result.score >= 50
                                  ? 'bg-warn/20 text-g-800'
                                  : 'bg-royalPurple-danger text-royalPurple-dangerTx'
                            }`}
                          >
                            {result.score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold">{result.grade}</td>
                        <td className="px-6 py-4 text-royalPurple-text3">
                          {new Date(result.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-royalPurple-text3 max-w-xs truncate">
                          {result.comments || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
