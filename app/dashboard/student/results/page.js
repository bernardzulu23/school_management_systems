'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudentResultsPage() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('All')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/student/results')
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
  const filteredResults = results.filter(result => {
    const matchesSearch = result.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTerm = selectedTerm === 'All' || result.term === selectedTerm
    return matchesSearch && matchesTerm
  })

  // Get unique terms for filter
  const terms = ['All', ...new Set(results.map(r => r.term))]

  // Calculate stats
  const averageScore = results.length > 0
    ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(1)
    : 0

  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.score))
    : 0

  return (
    <DashboardLayout title="My Results">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Assessments</p>
                <h3 className="text-2xl font-bold text-gray-900">{results.length}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Average Score</p>
                <h3 className="text-2xl font-bold text-gray-900">{averageScore}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Highest Score</p>
                <h3 className="text-2xl font-bold text-gray-900">{highestScore}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              {terms.map(term => (
                <option key={term} value={term}>{term === 'All' ? 'All Terms' : term}</option>
              ))}
            </select>
            
            <Button variant="outline" className="flex items-center gap-2">
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
              <div className="text-center py-8 text-red-500 flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-2" />
                {error}
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No results found matching your criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Subject</th>
                      <th className="px-6 py-3">Term</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result) => (
                      <tr key={result.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {result.subject}
                          <span className="block text-xs text-gray-500">{result.subjectCode}</span>
                        </td>
                        <td className="px-6 py-4">{result.term} {result.year}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            result.score >= 70 ? 'bg-green-100 text-green-800' :
                            result.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {result.score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold">{result.grade}</td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(result.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
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
