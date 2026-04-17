'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
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
  Monitor,
  RefreshCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SkeletonLoader from '@/components/SkeletonLoader'

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
      case 'core':
        return <Calculator className="w-5 h-5" />
      case 'science':
        return <GraduationCap className="w-5 h-5" />
      case 'language':
        return <Globe className="w-5 h-5" />
      case 'practical':
        return <Wrench className="w-5 h-5" />
      case 'commercial':
        return <Building className="w-5 h-5" />
      case 'arts':
        return <Palette className="w-5 h-5" />
      case 'elective':
        return <Monitor className="w-5 h-5" />
      default:
        return <BookOpen className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category) => {
    return 'badge-brand'
  }

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || subject.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Object.keys(subjectsByCategory)

  if (loading) {
    return (
      <main
        className="container mx-auto px-4 py-6"
        role="main"
        aria-busy="true"
        aria-label="Loading subjects"
      >
        <div className="mb-6">
          <SkeletonLoader className="h-10 w-1/3 mb-2" />
          <SkeletonLoader className="h-5 w-1/2" />
        </div>

        <Card className="p-6 mb-6">
          <div className="flex gap-4">
            <SkeletonLoader className="h-10 flex-1 rounded-lg" />
            <SkeletonLoader className="h-10 w-32 rounded-lg" />
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <SkeletonLoader className="h-8 w-1/2 mx-auto mb-2" />
              <SkeletonLoader className="h-4 w-3/4 mx-auto" />
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <SkeletonLoader className="h-7 w-1/4 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <SkeletonLoader key={j} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6" role="main">
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-royalPurple-accentTx" aria-hidden="true" />
              School Subjects Management
            </h1>
            <p className="text-royalPurple-text2 mt-2">
              Comprehensive subject catalog for Zambian secondary education
            </p>
          </div>

          <nav className="flex gap-3" aria-label="View options">
            <Button
              variant={viewMode === 'category' ? 'default' : 'outline'}
              onClick={() => setViewMode('category')}
              aria-pressed={viewMode === 'category'}
              aria-label="Switch to category view"
            >
              Category View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="Switch to list view"
            >
              List View
            </Button>
            <Button className="flex items-center gap-2" aria-label="Add new subject">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Subject
            </Button>
          </nav>
        </div>
      </header>

      {/* Search and Filter */}
      <section aria-label="Filters">
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 w-4 h-4"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search subjects by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search subjects"
                  className="w-full pl-10 pr-4 py-2 border border-royalPurple-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-royalPurple-border2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by category"
                className="px-3 py-2 border border-royalPurple-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-royalPurple-border2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      </section>

      {/* Statistics */}
      <section
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        aria-label="Subject statistics"
      >
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-royalPurple-accentTx" role="status">
            {subjects.length}
          </div>
          <div className="text-sm text-royalPurple-text2">Total Subjects</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-royalPurple-successTx" role="status">
            {categories.length}
          </div>
          <div className="text-sm text-royalPurple-text2">Categories</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-royalPurple-pillTx" role="status">
            8
          </div>
          <div className="text-sm text-royalPurple-text2">Local Languages</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600" role="status">
            14
          </div>
          <div className="text-sm text-royalPurple-text2">Teachers</div>
        </Card>
      </section>

      {/* Content */}
      <section aria-label="Subject list">
        {viewMode === 'category' ? (
          /* Category View */
          <div className="space-y-6">
            {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
              <Card key={category} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div aria-hidden="true">{getCategoryIcon(category)}</div>
                  <h2 className="text-xl font-semibold text-royalPurple-text1 capitalize">
                    {category === 'arts'
                      ? 'Arts & Humanities'
                      : category === 'elective'
                        ? 'Elective Subjects'
                        : category === 'commercial'
                          ? 'Commercial Studies'
                          : category === 'practical'
                            ? 'Practical Subjects'
                            : category === 'language'
                              ? 'Languages'
                              : category === 'science'
                                ? 'Sciences'
                                : category === 'core'
                                  ? 'Core Subjects'
                                  : category}
                  </h2>
                  <span className="badge-brand" role="status">
                    {categorySubjects.length} subjects
                  </span>
                </div>

                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
                  {categorySubjects.map((subject) => (
                    <li key={subject.id} role="listitem">
                      <article className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-royalPurple-text1">{subject.name}</h3>
                          <span
                            className="text-xs text-royalPurple-text3 bg-royalPurple-card2 px-2 py-1 rounded"
                            aria-label={`Subject code: ${subject.code}`}
                          >
                            {subject.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-royalPurple-text2 mb-3">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          <span>Available for Grades 8-12</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="badge-brand">{category}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`View details for ${subject.name}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-royalPurple-border" role="grid">
                <thead className="bg-royalPurple-page">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Subject
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Code
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-royalPurple-text3 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-royalPurple-card divide-y divide-royalPurple-border">
                  {filteredSubjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="hover:bg-royalPurple-page focus-within:bg-royalPurple-page transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div aria-hidden="true">{getCategoryIcon(subject.category)}</div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-royalPurple-text1">
                              {subject.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-royalPurple-text3">
                        <span
                          className="bg-royalPurple-card2 px-2 py-1 rounded text-xs font-mono"
                          aria-label={`Code: ${subject.code}`}
                        >
                          {subject.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-royalPurple-text3">
                        {subject.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge-brand">{subject.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" aria-label={`Edit ${subject.name}`}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`View teachers for ${subject.name}`}
                          >
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
              <div className="text-center py-8" role="status">
                <BookOpen
                  className="w-12 h-12 text-royalPurple-text3 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">
                  No Subjects Found
                </h3>
                <p className="text-royalPurple-text2">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'No subjects are available in the system.'}
                </p>
                {(searchTerm || selectedCategory !== 'all') && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('all')
                    }}
                    className="mt-2"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}
      </section>
    </main>
  )
}
