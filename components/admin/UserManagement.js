'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import EnhancedUserRegistrationForm from '@/components/forms/EnhancedUserRegistrationForm'
import UserRegistrationForm from '@/components/forms/UserRegistrationForm'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Users, UserCheck, GraduationCap, BookOpen } from 'lucide-react'

export default function UserManagement() {
  const [selectedRole, setSelectedRole] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [useEnhancedForm, setUseEnhancedForm] = useState(true)

  const roles = [
    {
      id: 'hod',
      title: 'Head of Department',
      description: 'Department leadership and coordination',
      icon: <UserCheck className="h-8 w-8" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      count: 0 // Will be populated from API
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Teaching and student guidance',
      icon: <Users className="h-8 w-8" />,
      color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      count: 0
    },
    {
      id: 'student',
      title: 'Student',
      description: 'Learning and academic activities',
      icon: <GraduationCap className="h-8 w-8" />,
      color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      count: 0
    }
  ]

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setShowForm(true)
  }

  const handleRegistration = async (formData) => {
    setLoading(true)
    try {
      console.log('Sending registration data:', formData) // Debug log

      const response = await api.post('/auth/register', formData)

      console.log('Registration response:', response.data) // Debug log

      if (response.data.success) {
        toast.success(`${formData.role} registered successfully! They can now login with their credentials.`)
        setShowForm(false)
        setSelectedRole('')
        // Optionally refresh user list here
      } else {
        console.error('Registration failed:', response.data)
        toast.error(response.data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })

      if (error.response?.status === 403) {
        toast.error('Access denied. Only headteachers can register new users.')
      } else if (error.response?.status === 422) {
        toast.error('Validation error: ' + (error.response?.data?.message || 'Please check your input data.'))
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.')
      } else {
        toast.error(error.response?.data?.message || error.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setSelectedRole('')
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Register New {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </h2>
            <p className="text-gray-600">
              Fill in the details to create a new user account
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Back to User Management
          </Button>
        </div>
        
        {/* Form Toggle */}
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Use Enhanced Form:</label>
            <button
              type="button"
              onClick={() => setUseEnhancedForm(!useEnhancedForm)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useEnhancedForm ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useEnhancedForm ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Render appropriate form */}
        {useEnhancedForm ? (
          <EnhancedUserRegistrationForm
            role={selectedRole}
            onSubmit={handleRegistration}
            onCancel={handleCancel}
          />
        ) : (
          <UserRegistrationForm
            role={selectedRole}
            onSubmit={handleRegistration}
            onCancel={handleCancel}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="h-6 w-6 mr-2" />
            User Management
          </h2>
          <p className="text-gray-600">
            Register new users and manage school accounts
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <Card className="bg-amber-50 border-amber-200 p-4">
        <div className="flex items-start">
          <div className="text-amber-600 mr-3">
            🔒
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">
              Administrator Access Only
            </h3>
            <p className="text-sm text-amber-700">
              Only headteachers and deputy headteachers can register new users. 
              All registered users will receive login credentials to access their respective dashboards.
            </p>
          </div>
        </div>
      </Card>

      {/* Registration Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card
            key={role.id}
            className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 ${role.color}`}
            onClick={() => handleRoleSelect(role.id)}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {role.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{role.title}</h3>
              <p className="text-gray-600 mb-4 text-sm">{role.description}</p>
              
              {/* User Count */}
              <div className="bg-white bg-opacity-50 rounded-lg p-2 mb-4">
                <p className="text-sm font-medium">
                  Current: {role.count} registered
                </p>
              </div>
              
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Register {role.title}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Registration Guidelines
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800">For Staff Registration:</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ensure all professional qualifications are accurate</li>
                <li>Verify TS (Teaching Service) numbers</li>
                <li>Collect complete contact information</li>
                <li>Assign appropriate departments</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">For Student Registration:</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Collect complete parent/guardian details</li>
                <li>Record medical information if applicable</li>
                <li>Assign to appropriate year group and class</li>
                <li>Gather previous academic records</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Post-Registration Process
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">1</span>
              </div>
              <p>User account is created with secure credentials</p>
            </div>
            <div className="flex items-start">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">2</span>
              </div>
              <p>Login credentials are provided to the user</p>
            </div>
            <div className="flex items-start">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">3</span>
              </div>
              <p>User can access their role-specific dashboard</p>
            </div>
            <div className="flex items-start">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">4</span>
              </div>
              <p>All activities are logged for audit purposes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Registrations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Registrations
        </h3>
        <div className="text-sm text-gray-600">
          <p>Recent user registrations will appear here...</p>
          {/* This would be populated with actual data from the API */}
        </div>
      </Card>
    </div>
  )
}
