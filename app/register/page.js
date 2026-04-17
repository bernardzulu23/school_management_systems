'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page - registration is not publicly available
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <Lock className="w-12 h-12 text-royalPurple-text1" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-royalPurple-text1 mb-2">Access Restricted</h2>
          <p className="text-royalPurple-text2">
            User registration is only available to authorized school administrators.
          </p>
        </div>

        <div className="bg-royalPurple-accent rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-royalPurple-accentTx mb-2">For New Users:</h3>
          <p className="text-sm text-royalPurple-accentTx">
            Please contact your school administrator to create your account. Once registered, you
            can login with your provided credentials.
          </p>
        </div>

        <div className="space-y-2 text-sm text-royalPurple-text2">
          <p>
            <strong>Students:</strong> Contact the school office
          </p>
          <p>
            <strong>Staff:</strong> Contact the headteacher
          </p>
          <p>
            <strong>Parents:</strong> Contact admissions
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-royalPurple-accent text-royalPurple-accentTx py-2 px-4 rounded-md hover:opacity-90 transition-all"
          >
            Go to Login
          </button>
        </div>
      </Card>
    </div>
  )
}
