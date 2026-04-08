import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  return NextResponse.json({
    success: true,
    data: [
      { id: 'lesson-delivery', name: 'Lesson Delivery' },
      { id: 'classroom-management', name: 'Classroom Management' },
      { id: 'assessment-practices', name: 'Assessment Practices' },
      { id: 'learner-engagement', name: 'Learner Engagement' },
      { id: 'professionalism', name: 'Professionalism' },
    ],
  })
})
