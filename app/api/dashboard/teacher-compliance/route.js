export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { evaluateTeacherCompliance } from '@/lib/compliance/teacherCompliance'

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const data = await evaluateTeacherCompliance(schoolId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('teacher-compliance GET error:', error)
    return NextResponse.json({ error: 'Failed to load teacher compliance' }, { status: 500 })
  }
}
