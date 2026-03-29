'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HodRegistrationForm } from '@/components/forms/HodRegistrationForm'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import SkeletonLoader from '@/components/SkeletonLoader'
import {
  Plus,
  Users,
  UserCheck,
  Edit,
  Trash2,
  Building,
  Star,
  Calendar,
  Phone,
  Mail,
  Award,
  TrendingUp,
} from 'lucide-react'

export default function HodManagement() {
  const { user } = useAuth()
  const [hods, setHods] = useState([])
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [editingHod, setEditingHod] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalHods: 0,
    departments: 0,
    averageRating: 0,
    totalExperience: 0,
  })

  useEffect(() => {
    fetchHods()
  }, [])

  const fetchHods = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hods')
      if (!response.ok) throw new Error('Failed to fetch')
      const hodsData = await response.json()
      setHods(hodsData)

      // Calculate stats
      const totalHods = hodsData.length
      const departments = new Set(hodsData.map((hod) => hod.department_name)).size
      const averageRating =
        hodsData.reduce((sum, hod) => sum + (hod.performance_rating || 0), 0) / totalHods || 0
      const totalExperience = hodsData.reduce((sum, hod) => sum + (hod.years_experience || 0), 0)

      setStats({
        totalHods,
        departments,
        averageRating: averageRating.toFixed(1),
        totalExperience,
      })
    } catch (error) {
      console.error('Error fetching HODs:', error)
      toast.error('Failed to fetch HODs')
    } finally {
      setLoading(false)
    }
  }

  const handleRegistration = async (formData) => {
    try {
      setLoading(true)

      const method = editingHod ? 'PUT' : 'POST'
      const body = editingHod ? { ...formData, id: editingHod.id } : formData

      const response = await fetch('/api/hods', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Operation failed')

      toast.success(editingHod ? 'HOD updated successfully' : 'HOD registered successfully')
      setShowRegistrationForm(false)
      setEditingHod(null)
      fetchHods()
    } catch (error) {
      console.error('Error saving HOD:', error)
      toast.error(error.message || 'Failed to save HOD')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (hod) => {
    setEditingHod(hod)
    setShowRegistrationForm(true)
  }

  const handleDelete = async (hodId) => {
    if (!confirm('Are you sure you want to delete this HOD? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/hods?id=${hodId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')

      toast.success('HOD deleted successfully')
      fetchHods()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete HOD')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowRegistrationForm(false)
    setEditingHod(null)
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-royalPurple-successTx'
    if (rating >= 3.5) return 'text-yellow-600'
    return 'text-royalPurple-dangerTx'
  }

  const getRatingStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-current text-yellow-500" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-current text-yellow-300" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-royalPurple-text3" />)
    }

    return stars
  }

  if (showRegistrationForm) {
    return (
      <main className="space-y-6" aria-labelledby="form-title">
        <header className="flex items-center justify-between">
          <div>
            <h2 id="form-title" className="text-2xl font-bold text-royalPurple-text1">
              {editingHod ? 'Edit HOD' : 'Register New Head of Department'}
            </h2>
            <p className="text-royalPurple-text2">
              {editingHod
                ? 'Update HOD information'
                : 'Create a new HOD account with administrative privileges'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
            aria-label="Cancel and return to management"
            className="focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Back to HOD Management
          </Button>
        </header>

        <HodRegistrationForm
          onSubmit={handleRegistration}
          onCancel={handleCancel}
          isLoading={loading}
          initialData={editingHod}
        />
      </main>
    )
  }

  return (
    <main className="space-y-6" aria-labelledby="management-title">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2
            id="management-title"
            className="text-2xl font-bold text-royalPurple-text1 flex items-center"
          >
            <UserCheck className="h-6 w-6 mr-2" aria-hidden="true" />
            Head of Department Management
          </h2>
          <p className="text-royalPurple-text2">
            Manage department heads and their administrative responsibilities
          </p>
        </div>
        <Button
          onClick={() => setShowRegistrationForm(true)}
          aria-label="Register a new HOD"
          className="focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Register New HOD
        </Button>
      </header>

      {/* Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6" aria-label="HOD Statistics">
        <Card role="region" aria-labelledby="stat-total-hods">
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-royalPurple-accentTx" aria-hidden="true" />
              <div className="ml-4">
                <p id="stat-total-hods" className="text-sm font-medium text-royalPurple-text2">
                  Total HODs
                </p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {loading ? <SkeletonLoader className="h-8 w-10" /> : stats.totalHods}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card role="region" aria-labelledby="stat-departments">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-royalPurple-successTx" aria-hidden="true" />
              <div className="ml-4">
                <p id="stat-departments" className="text-sm font-medium text-royalPurple-text2">
                  Departments
                </p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {loading ? <SkeletonLoader className="h-8 w-10" /> : stats.departments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card role="region" aria-labelledby="stat-avg-rating">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" aria-hidden="true" />
              <div className="ml-4">
                <p id="stat-avg-rating" className="text-sm font-medium text-royalPurple-text2">
                  Avg Rating
                </p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {loading ? <SkeletonLoader className="h-8 w-10" /> : stats.averageRating}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card role="region" aria-labelledby="stat-experience">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-royalPurple-pillTx" aria-hidden="true" />
              <div className="ml-4">
                <p id="stat-experience" className="text-sm font-medium text-royalPurple-text2">
                  Total Experience
                </p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {loading ? (
                    <SkeletonLoader className="h-8 w-16" />
                  ) : (
                    `${stats.totalExperience} years`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* HODs List */}
      <section aria-labelledby="list-title">
        <Card>
          <CardHeader>
            <CardTitle id="list-title">Registered Heads of Department</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                role="status"
                aria-label="Loading HODs"
                aria-busy="true"
              >
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="p-6">
                    <SkeletonLoader className="h-6 w-3/4 mb-4 rounded" />
                    <SkeletonLoader className="h-4 w-1/2 mb-2 rounded" />
                    <SkeletonLoader className="h-4 w-1/4 mb-6 rounded" />
                    <div className="space-y-3">
                      <SkeletonLoader className="h-4 w-full rounded" />
                      <SkeletonLoader className="h-4 w-full rounded" />
                      <SkeletonLoader className="h-4 w-3/4 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : hods.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck
                  className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4"
                  aria-hidden="true"
                />
                <p className="text-royalPurple-text3">No HODs registered yet</p>
                <Button
                  className="mt-2 focus-visible:ring-2 focus-visible:ring-blue-500"
                  onClick={() => setShowRegistrationForm(true)}
                  aria-label="Register the first HOD"
                >
                  Register First HOD
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                {hods.map((hod) => (
                  <Card
                    key={hod.id}
                    className="hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-blue-500"
                    role="listitem"
                  >
                    <CardContent className="p-6">
                      <article className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-royalPurple-text1">
                            {hod.profiles?.name}
                          </h3>
                          <p className="text-sm text-royalPurple-text2">{hod.department_name}</p>
                          <p className="text-xs text-royalPurple-text3">ID: {hod.employee_id}</p>
                        </div>
                        <nav
                          className="flex space-x-1"
                          aria-label={`Actions for ${hod.profiles?.name}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(hod)}
                            aria-label={`Edit ${hod.profiles?.name}`}
                            className="focus-visible:ring-2 focus-visible:ring-gray-500"
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(hod.id)}
                            aria-label={`Delete ${hod.profiles?.name}`}
                            className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </nav>
                      </article>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-royalPurple-text2">
                          <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                          <span className="sr-only">Email:</span> {hod.profiles?.email}
                        </div>
                        <div className="flex items-center text-royalPurple-text2">
                          <Phone className="h-4 w-4 mr-2" aria-hidden="true" />
                          <span className="sr-only">Phone:</span> {hod.profiles?.contact_number}
                        </div>
                        <div className="flex items-center text-royalPurple-text2">
                          <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                          {hod.years_experience} years experience
                        </div>
                        <div className="flex items-center text-royalPurple-text2">
                          <Award className="h-4 w-4 mr-2" aria-hidden="true" />
                          {hod.years_as_hod} years as HOD
                        </div>
                      </div>

                      <footer className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-royalPurple-text2">Performance</span>
                          <div
                            className="flex items-center space-x-1"
                            aria-label={`Performance rating: ${hod.performance_rating || 0} out of 5 stars`}
                          >
                            {getRatingStars(hod.performance_rating || 0)}
                            <span
                              className={`text-sm font-medium ml-1 ${getRatingColor(hod.performance_rating || 0)}`}
                              aria-hidden="true"
                            >
                              {hod.performance_rating || 0}
                            </span>
                          </div>
                        </div>
                      </footer>

                      {hod.specialization && (
                        <div className="mt-2">
                          <p className="text-xs text-royalPurple-text3">
                            <strong>Specialization:</strong> {hod.specialization}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
