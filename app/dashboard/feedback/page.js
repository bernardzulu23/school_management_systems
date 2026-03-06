'use client'

import { useAuth } from '@/lib/auth'
import ResponsiveDashboardLayout from '@/components/dashboard/ResponsiveDashboardLayout'
import FeedbackForm from '@/components/feedback/FeedbackForm'
import { HeadteacherFeedbackView } from '@/components/dashboard/headteacher/HeadteacherFeedbackView'

export default function FeedbackPage() {
  const { user } = useAuth()
  const isHeadteacher = user?.role === 'headteacher'

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to access this page</h2>
          <button
            onClick={() => (window.location.href = '/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isHeadteacher ? 'User Feedback' : 'Share Your Feedback'}
        </h1>

        {isHeadteacher ? <HeadteacherFeedbackView /> : <FeedbackForm />}
      </div>
    </ResponsiveDashboardLayout>
  )
}
