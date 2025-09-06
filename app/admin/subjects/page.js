'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus,
  Users,
  GraduationCap,
  Globe,
  Wrench,
  Calculator,
  Palette,
  Building,
  Monitor
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [subjectsByCategory, setSubjectsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState('category') // 'category' or 'list'

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      setLoading(true)
      
      // Load all subjects
      const subjectsResponse = await fetch('/api/v1/subjects')
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        setSubjects(subjectsData.data || [])
      }

      // Load subjects by category
      const categoryResponse = await fetch('/api/v1/subjects/by-category')
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json()
        setSubjectsByCategory(categoryData.data || {})
      }

    } catch (error) {
      console.error('Error loading subjects:', error)
      toast.error('Error loading subjects')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'core': return <Calculator className="w-5 h-5" />
      case 'science': return <GraduationCap className="w-5 h-5" />
      case 'language': return <Globe className="w-5 h-5" />
      case 'practical': return <Wrench className="w-5 h-5" />
      case 'commercial': return <Building className="w-5 h-5" />
      case 'arts': return <Palette className="w-5 h-5" />
      case 'elective': return <Monitor className="w-5 h-5" />
      default: return <BookOpen className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'core': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'science': return 'bg-green-100 text-green-800 border-green-200'
      case 'language': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'practical': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'commercial': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'arts': return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'elective': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || subject.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Object.keys(subjectsByCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              School Subjects Management
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive subject catalog for Zambian secondary education
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant={viewMode === 'category' ? 'default' : 'outline'}
              onClick={() => setViewMode('category')}
            >
              Category View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search subjects by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="core">Core Subjects</option>
              <option value="science">Sciences</option>
              <option value="language">Languages</option>
              <option value="practical">Practical Subjects</option>
              <option value="commercial">Commercial Studies</option>
              <option value="arts">Arts & Humanities</option>
              <option value="elective">Elective Subjects</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{subjects.length}</div>
          <div className="text-sm text-gray-600">Total Subjects</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{categories.length}</div>
          <div className="text-sm text-gray-600">Categories</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">8</div>
          <div className="text-sm text-gray-600">Local Languages</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">14</div>
          <div className="text-sm text-gray-600">Teachers</div>
        </Card>
      </div>

      {/* Content */}
      {viewMode === 'category' ? (
        /* Category View */
        <div className="space-y-6">
          {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
            <Card key={category} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {getCategoryIcon(category)}
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {category === 'arts' ? 'Arts & Humanities' : 
                   category === 'elective' ? 'Elective Subjects' :
                   category === 'commercial' ? 'Commercial Studies' :
                   category === 'practical' ? 'Practical Subjects' :
                   category === 'language' ? 'Languages' :
                   category === 'science' ? 'Sciences' :
                   category === 'core' ? 'Core Subjects' : category}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(category)}`}>
                  {categorySubjects.length} subjects
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorySubjects.map((subject) => (
                  <div key={subject.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {subject.code}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Users className="w-4 h-4" />
                      <span>Available for Grades 8-12</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(category)}`}>
                        {category}
                      </span>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getCategoryIcon(subject.category)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {subject.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {subject.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(subject.category)}`}>
                        {subject.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Teachers
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSubjects.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No subjects are available in the system.'}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
