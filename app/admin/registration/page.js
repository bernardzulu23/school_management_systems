'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import EnhancedUserRegistrationForm from '@/components/forms/EnhancedUserRegistrationForm'
import {
  Users,
  GraduationCap,
  User,
  Crown,
  BookOpen,
  UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

export default function RegistrationPage() {
  const [activeForm, setActiveForm] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData, userType) => {
    setLoading(true)
    try {
      console.log(`Registering ${userType}:`, formData)

      // Send registration data to API
      const response = await api.post('/auth/register', {
        ...formData,
        role: userType
      })

      if (response.data.success) {
        toast.success(`${userType} registered successfully! They can now login with their credentials.`)
        setActiveForm(null)
      } else {
        toast.error(response.data.message || 'Registration failed')
      }
    } catch (error) {
      console.error(`Error registering ${userType}:`, error)
      toast.error(error.response?.data?.message || `Error registering ${userType}`)
    } finally {
      setLoading(false)
    }
  }

  const registrationTypes = [
    {
      id: 'teacher',
      title: 'Teacher Registration',
      description: 'Register new teaching staff with subject assignments from our comprehensive catalog of 29 subjects including local languages',
      icon: GraduationCap,
      color: 'bg-blue-100 text-blue-600 border-blue-200',
      features: [
        'Subject assignment from 29 available subjects',
        'Local language specializations (Chichewa, Chitonga, Bemba, etc.)',
        'Department allocation',
        'Professional qualifications tracking',
        'Emergency contact information'
      ]
    },
    {
      id: 'student',
      title: 'Student Registration',
      description: 'Register new students with subject selections based on grade level and career interests',
      icon: User,
      color: 'bg-green-100 text-green-600 border-green-200',
      features: [
        'Grade-appropriate subject selection',
        'Core subjects (Mathematics & English) mandatory',
        'Elective subject choices',
        'Parent/Guardian information',
        'Academic history tracking'
      ]
    },
    {
      id: 'hod',
      title: 'Head of Department Registration',
      description: 'Register department heads with management responsibilities and subject oversight',
      icon: Crown,
      color: 'bg-purple-100 text-purple-600 border-purple-200',
      features: [
        'Department leadership assignment',
        'Subject oversight responsibilities',
        'Management experience tracking',
        'Teacher supervision capabilities',
        'Administrative qualifications'
      ]
    }
  ]

  if (activeForm) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6">
          <EnhancedUserRegistrationForm
            role={activeForm}
            onSubmit={(data) => handleSubmit(data, activeForm)}
            onCancel={() => setActiveForm(null)}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-8 h-8" />
          User Registration System
        </h1>
        <p className="text-gray-600 mt-2">
          Register new users with comprehensive subject integration and role-specific features
        </p>
      </div>

      {/* System Information */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-4">
          <BookOpen className="w-8 h-8 text-blue-600 mt-1" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Comprehensive Subject Integration
            </h2>
            <p className="text-gray-700 mb-4">
              Our registration system includes all 29 subjects for Zambian secondary education, 
              ensuring proper academic planning and resource allocation.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-semibold text-blue-600">Core Subjects</div>
                <div className="text-gray-600">Mathematics, English, Additional Math</div>
              </div>
              <div>
                <div className="font-semibold text-green-600">Sciences</div>
                <div className="text-gray-600">Physics, Chemistry, Biology, Agriculture</div>
              </div>
              <div>
                <div className="font-semibold text-purple-600">Local Languages</div>
                <div className="text-gray-600">8 indigenous languages supported</div>
              </div>
              <div>
                <div className="font-semibold text-orange-600">Practical Subjects</div>
                <div className="text-gray-600">Technical, Home Economics, Arts</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Registration Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {registrationTypes.map((type) => (
          <Card key={type.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full ${type.color} flex items-center justify-center mx-auto mb-4`}>
                <type.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {type.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {type.description}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-900 text-sm">Key Features:</h4>
              <ul className="space-y-2">
                {type.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={() => setActiveForm(type.id)}
              className="w-full"
              disabled={loading}
            >
              Register {type.title.split(' ')[0]}
            </Button>
          </Card>
        ))}
      </div>

      {/* Additional Information */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current System Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Subjects Available:</span>
              <span className="font-semibold">29</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Local Languages Supported:</span>
              <span className="font-semibold">8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subject Categories:</span>
              <span className="font-semibold">7</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Headteacher:</span>
              <span className="font-semibold">Brian B. Zulu</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Subject Categories Available
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-blue-50 rounded text-blue-700">Core Subjects</div>
            <div className="p-2 bg-green-50 rounded text-green-700">Sciences</div>
            <div className="p-2 bg-purple-50 rounded text-purple-700">Languages</div>
            <div className="p-2 bg-orange-50 rounded text-orange-700">Practical</div>
            <div className="p-2 bg-yellow-50 rounded text-yellow-700">Commercial</div>
            <div className="p-2 bg-pink-50 rounded text-pink-700">Arts & Humanities</div>
            <div className="p-2 bg-gray-50 rounded text-gray-700">Technology</div>
          </div>
        </Card>
      </div>

      {/* Local Languages Showcase */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Supported Local Languages
        </h3>
        <p className="text-gray-600 mb-4">
          Our system supports all major Zambian languages, ensuring cultural preservation and linguistic diversity in education.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Chichewa', 'Chitonga', 'Luvale', 'Lunda', 
            'Kikaonde', 'Bemba', 'Silozi', 'French'
          ].map((language) => (
            <div key={language} className="p-3 bg-purple-50 rounded-lg text-center">
              <span className="text-purple-700 font-medium">{language}</span>
            </div>
          ))}
        </div>
      </Card>
      </div>
    </DashboardLayout>
  )
}
