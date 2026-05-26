export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { syncEczSubjects, fetchEczSubjects } from '@/lib/ecz/sync-ecz-subjects'
import { ECZ_GUIDELINES_SUBJECT_COUNT } from '@/lib/ecz/ecz-subjects-data'

const STAFF_ROLES = ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher']

/** Seed ECZ subjects and construct elements for the current school. */
export async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, STAFF_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const result = await syncEczSubjects(prisma, schoolId)

  return NextResponse.json({
    success: true,
    message: 'ECZ subjects and construct elements synced',
    ...result,
    guidelinesCount: ECZ_GUIDELINES_SUBJECT_COUNT,
  })
}

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const shouldSync = searchParams.get('sync') === 'true'

  if (shouldSync && roleCheck(auth.user, STAFF_ROLES)) {
    await syncEczSubjects(prisma, schoolId)
  }

  try {
    const subjects = await fetchEczSubjects(prisma, schoolId)

    return NextResponse.json({
      success: true,
      data: subjects,
      synced: subjects.length,
      guidelinesCount: ECZ_GUIDELINES_SUBJECT_COUNT,
      needsSync: subjects.length < ECZ_GUIDELINES_SUBJECT_COUNT,
    })
  } catch (error) {
    console.error('ECZ subjects fetch failed:', error)
    const code = String(error?.code || '')
    const hint =
      code === 'P2021' || /does not exist/i.test(String(error?.message))
        ? 'Database schema is out of date. Run: npx prisma db push'
        : 'Failed to load ECZ subjects'
    return NextResponse.json({ error: hint, code: code || undefined }, { status: 500 })
  }
}
