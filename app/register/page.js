'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page - registration is not publicly available
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            User registration is only available to authorized school administrators.
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            For New Users:
          </h3>
          <p className="text-sm text-blue-700">
            Please contact your school administrator to create your account.
            Once registered, you can login with your provided credentials.
          </p>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Students:</strong> Contact the school office</p>
          <p><strong>Staff:</strong> Contact the headteacher</p>
          <p><strong>Parents:</strong> Contact admissions</p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </Card>
    </div>
  )
}
