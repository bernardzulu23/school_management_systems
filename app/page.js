'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { BookOpen, Users, GraduationCap, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      // Redirect to appropriate dashboard based on role
      switch (user.role) {
        case 'headteacher':
          router.push('/dashboard/headteacher')
          break
        case 'hod':
          router.push('/dashboard/hod')
          break
        case 'teacher':
          router.push('/dashboard/teacher')
          break
        case 'student':
          router.push('/dashboard/student')
          break
        default:
          router.push('/login')
      }
    }
  }, [isHydrated, isAuthenticated, user, router])

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                School Management System
              </h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Modern School
            <span className="text-blue-600"> Management</span>
          </h2>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Streamline your educational institution with our comprehensive management system.
            Built for headteachers, teachers, and students.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <button
                onClick={() => router.push('/register')}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors"
              >
                Get Started
              </button>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">User Management</h3>
              <p className="mt-2 text-base text-gray-500">
                Manage students, teachers, and staff with role-based access control.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Academic Management</h3>
              <p className="mt-2 text-base text-gray-500">
                Handle classes, subjects, assessments, and academic records efficiently.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Analytics & Reports</h3>
              <p className="mt-2 text-base text-gray-500">
                Generate comprehensive reports and track performance metrics.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Student Portal</h3>
              <p className="mt-2 text-base text-gray-500">
                Students can access their results, assignments, and class information.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
