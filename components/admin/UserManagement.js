'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import EnhancedUserRegistrationForm from '@/components/forms/EnhancedUserRegistrationForm'
import UserRegistrationForm from '@/components/forms/UserRegistrationForm'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Users, UserCheck, GraduationCap, BookOpen } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function UserManagement() {
  const [selectedRole, setSelectedRole] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [useEnhancedForm, setUseEnhancedForm] = useState(true)
  const queryClient = useQueryClient()

  const roles = [
    {
      id: 'hod',
      title: 'Head of Department',
      description: 'Department leadership and coordination',
      icon: <UserCheck className="h-8 w-8" />,
      color:
        'bg-royalPurple-accent text-royalPurple-accentTx border-royalPurple-border2 hover:bg-royalPurple-accent',
      count: 0, // Will be populated from API
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Teaching and student guidance',
      icon: <Users className="h-8 w-8" />,
      color:
        'bg-royalPurple-success text-royalPurple-successTx border-royalPurple-border hover:bg-royalPurple-success',
      count: 0,
    },
    {
      id: 'student',
      title: 'Student',
      description: 'Learning and academic activities',
      icon: <GraduationCap className="h-8 w-8" />,
      color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      count: 0,
    },
  ]

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setShowForm(true)
  }

  const registrationMutation = useMutation({
    mutationFn: (formData) => api.post('/auth/register', formData),
    onSuccess: (response, formData) => {
      if (response.data.success) {
        toast.success(
          `${formData.role} registered successfully! They can now login with their credentials.`
        )
        setShowForm(false)
        setSelectedRole('')
        // Invalidate relevant queries to refresh dashboard counts
        queryClient.invalidateQueries(['dashboard-stats'])
        queryClient.invalidateQueries(['headteacher-dashboard'])
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['students'])
        queryClient.invalidateQueries(['teachers'])
        queryClient.invalidateQueries(['hods'])
      } else {
        toast.error(response.data.message || 'Registration failed')
      }
    },
    onError: (error) => {
      console.error('Registration error details:', error)
      if (error.response?.status === 403) {
        toast.error('Access denied. Only headteachers can register new users.')
      } else {
        toast.error(error.response?.data?.message || error.message || 'Registration failed')
      }
    },
  })

  const handleRegistration = (formData) => {
    registrationMutation.mutate(formData)
  }

  const loading = registrationMutation.isLoading

  const handleCancel = () => {
    setShowForm(false)
    setSelectedRole('')
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-royalPurple-text1">
              Register New {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </h2>
            <p className="text-royalPurple-text2">
              Fill in the details to create a new user account
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
            aria-label="Back to User Management"
            className="hover:bg-royalPurple-card2 transition-colors"
          >
            Back to User Management
          </Button>
        </header>

        <main>
          {/* Form Toggle */}
          <div className="mb-4 flex items-center justify-end">
            <div className="flex items-center space-x-3">
              <span id="enhanced-form-label" className="text-sm font-medium text-royalPurple-text2">
                Use Enhanced Form:
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={useEnhancedForm}
                aria-labelledby="enhanced-form-label"
                onClick={() => setUseEnhancedForm(!useEnhancedForm)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none ${
                  useEnhancedForm ? 'bg-royalPurple-accent' : 'bg-royalPurple-card2'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-royalPurple-card transition-transform ${
                    useEnhancedForm ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Render appropriate form */}
          <section aria-label={`${selectedRole} registration form`}>
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
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
            <Users className="h-6 w-6 mr-2" aria-hidden="true" />
            User Management
          </h2>
          <p className="text-royalPurple-text2">Register new users and manage school accounts</p>
        </div>
      </header>

      {/* Security Notice */}
      <aside aria-label="Security notice">
        <Card className="bg-royalPurple-accentBg border-royalPurple-accent p-4" role="note">
          <div className="flex items-start">
            <div className="text-royalPurple-accentTx mr-3" aria-hidden="true">
              🔒
            </div>
            <div>
              <h3 className="font-semibold text-royalPurple-accentTx mb-1">
                Administrator Access Only
              </h3>
              <p className="text-sm text-royalPurple-accentTx">
                Only headteachers and deputy headteachers can register new users. All registered
                users will receive login credentials to access their respective dashboards.
              </p>
            </div>
          </div>
        </Card>
      </aside>

      {/* Registration Options */}
      <main>
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          role="list"
          aria-label="User registration options"
        >
          {roles.map((role) => (
            <div key={role.id} role="listitem">
              <Card
                className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${role.color}`}
                onClick={() => handleRoleSelect(role.id)}
                role="button"
                tabIndex={0}
                aria-labelledby={`role-title-${role.id}`}
                onKeyDown={(e) => e.key === 'Enter' && handleRoleSelect(role.id)}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-4" aria-hidden="true">
                    {role.icon}
                  </div>
                  <h3 id={`role-title-${role.id}`} className="text-xl font-semibold mb-2">
                    {role.title}
                  </h3>
                  <p className="text-royalPurple-text2 mb-4 text-sm">{role.description}</p>

                  <div className="flex items-center justify-center text-sm font-medium">
                    <Plus className="h-4 w-4 mr-1" />
                    Register New
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </main>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Registration Guidelines
          </h3>
          <div className="space-y-3 text-sm text-royalPurple-text2">
            <div>
              <h4 className="font-medium text-royalPurple-text1">For Staff Registration:</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ensure all professional qualifications are accurate</li>
                <li>Verify TS (Teaching Service) numbers</li>
                <li>Collect complete contact information</li>
                <li>Assign appropriate departments</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-royalPurple-text1">For Student Registration:</h4>
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
          <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">
            Post-Registration Process
          </h3>
          <div className="space-y-3 text-sm text-royalPurple-text2">
            <div className="flex items-start">
              <div className="bg-royalPurple-success text-royalPurple-successTx rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">1</span>
              </div>
              <p>User account is created with secure credentials</p>
            </div>
            <div className="flex items-start">
              <div className="bg-royalPurple-success text-royalPurple-successTx rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">2</span>
              </div>
              <p>Login credentials are provided to the user</p>
            </div>
            <div className="flex items-start">
              <div className="bg-royalPurple-success text-royalPurple-successTx rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">3</span>
              </div>
              <p>User can access their role-specific dashboard</p>
            </div>
            <div className="flex items-start">
              <div className="bg-royalPurple-success text-royalPurple-successTx rounded-full p-1 mr-3 mt-0.5">
                <span className="text-xs">4</span>
              </div>
              <p>All activities are logged for audit purposes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Registrations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">Recent Registrations</h3>
        <div className="text-sm text-royalPurple-text2">
          <p>Recent user registrations will appear here...</p>
          {/* This would be populated with actual data from the API */}
        </div>
      </Card>
    </div>
  )
}
