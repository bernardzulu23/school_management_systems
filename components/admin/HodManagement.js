'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { HodRegistrationForm } from '@/components/forms/HodRegistrationForm'
import { supabase, db } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'
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
  TrendingUp
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
    totalExperience: 0
  })

  useEffect(() => {
    fetchHods()
  }, [])

  const fetchHods = async () => {
    try {
      setLoading(true)
      const hodsData = await db.getHods()
      setHods(hodsData)
      
      // Calculate stats
      const totalHods = hodsData.length
      const departments = new Set(hodsData.map(hod => hod.department_name)).size
      const averageRating = hodsData.reduce((sum, hod) => sum + (hod.performance_rating || 0), 0) / totalHods || 0
      const totalExperience = hodsData.reduce((sum, hod) => sum + (hod.years_experience || 0), 0)
      
      setStats({
        totalHods,
        departments,
        averageRating: averageRating.toFixed(1),
        totalExperience
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
      
      // Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      })
      
      if (authError) throw authError
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: formData.name,
          role: 'hod',
          contact_number: formData.contact_number,
          address: formData.address,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          status: 'active'
        })
      
      if (profileError) throw profileError
      
      // Create HOD record
      const hodData = {
        user_id: authData.user.id,
        employee_id: formData.employee_id,
        department_name: formData.department_name,
        qualification: formData.qualification,
        specialization: formData.specialization,
        hire_date: formData.hire_date,
        appointment_date: formData.appointment_date,
        salary: formData.salary,
        bio: formData.bio,
        years_experience: formData.years_experience,
        years_as_hod: formData.years_as_hod,
        subjects_managed: formData.subjects_managed,
        teachers_supervised: formData.teachers_supervised,
        management_areas: formData.management_areas,
        performance_rating: formData.performance_rating,
        created_by: user.id
      }
      
      await db.createHod(hodData)
      
      toast.success('HOD registered successfully!')
      setShowRegistrationForm(false)
      fetchHods()
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed')
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
      await db.deleteHod(hodId)
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
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 3.5) return 'text-yellow-600'
    return 'text-red-600'
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
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }
    
    return stars
  }

  if (showRegistrationForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingHod ? 'Edit HOD' : 'Register New Head of Department'}
            </h2>
            <p className="text-gray-600">
              {editingHod ? 'Update HOD information' : 'Create a new HOD account with administrative privileges'}
            </p>
          </div>
          <Button variant="outline" onClick={handleCancel}>
            Back to HOD Management
          </Button>
        </div>
        
        <HodRegistrationForm
          onSubmit={handleRegistration}
          onCancel={handleCancel}
          isLoading={loading}
          initialData={editingHod}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <UserCheck className="h-6 w-6 mr-2" />
            Head of Department Management
          </h2>
          <p className="text-gray-600">
            Manage department heads and their administrative responsibilities
          </p>
        </div>
        <Button onClick={() => setShowRegistrationForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Register New HOD
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total HODs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalHods}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Experience</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExperience} years</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HODs List */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Heads of Department</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading HODs...</p>
            </div>
          ) : hods.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No HODs registered yet</p>
              <Button className="mt-2" onClick={() => setShowRegistrationForm(true)}>
                Register First HOD
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hods.map((hod) => (
                <Card key={hod.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {hod.profiles?.name}
                        </h3>
                        <p className="text-sm text-gray-600">{hod.department_name}</p>
                        <p className="text-xs text-gray-500">ID: {hod.employee_id}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(hod)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(hod.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {hod.profiles?.email}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {hod.profiles?.contact_number}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {hod.years_experience} years experience
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Award className="h-4 w-4 mr-2" />
                        {hod.years_as_hod} years as HOD
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Performance</span>
                        <div className="flex items-center space-x-1">
                          {getRatingStars(hod.performance_rating || 0)}
                          <span className={`text-sm font-medium ml-1 ${getRatingColor(hod.performance_rating || 0)}`}>
                            {hod.performance_rating || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {hod.specialization && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
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
    </div>
  )
}
