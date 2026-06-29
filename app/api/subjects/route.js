export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { basePrisma } from '@/lib/prisma/client'
import { getCachedSubjects } from '@/lib/cache/subjects'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateSubjectSchema } from '@/lib/schemas'
import { resolveSubjectCatalog } from '@/lib/subjects/resolveSubjectCatalog'
import { seedSubjectsForSchool, filterDbSubjectsByLevel } from '@/lib/subjects/seedSubjects'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

async function loadSchool(schoolId) {
  return basePrisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, level: true, enabledLocalLanguages: true },
  })
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const gradeLevel =
    safeQueryString(searchParams.get('gradeLevel')) ||
    safeQueryString(searchParams.get('grade')) ||
    null

  const school = await loadSchool(schoolId)
  const { educationLevel } = resolveSubjectCatalog({
    schoolLevel: school?.level,
    gradeLevel,
    enabledLocalLanguages: school?.enabledLocalLanguages,
  })

  const db = getTenantClient(schoolId)
  await seedSubjectsForSchool(db, school || { id: schoolId, level: 'combined' })
  revalidateTag(`subjects-${schoolId}`)
  revalidateTag('subjects')

  const subjects = await getCachedSubjects(schoolId)
  const filtered = filterDbSubjectsByLevel(subjects, educationLevel)

  return NextResponse.json({
    success: true,
    data: filtered,
    meta: { educationLevel, schoolLevel: school?.level || 'combined' },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
  const db = getTenantClient(schoolId)

  const school = await loadSchool(schoolId)
  const { educationLevel } = resolveSubjectCatalog({ schoolLevel: school?.level })

  const { data: body, error: validationError } = await validateBody(request, CreateSubjectSchema)
  if (validationError) return validationError

  const name = body.name
  const code = body.code ? String(body.code).trim() : null
  const description = body.description ? String(body.description).trim() : null

  const subject = await db.subject.upsert({
    where: { schoolId_name: { schoolId, name } },
    create: {
      schoolId,
      name,
      code: code || null,
      description: description || null,
      topics: [],
      educationLevel: body.educationLevel || educationLevel,
    },
    update: {
      code: code || undefined,
      description: description || undefined,
      educationLevel: body.educationLevel || undefined,
    },
    select: { id: true, name: true, code: true, description: true, educationLevel: true },
  })
  revalidateTag(`subjects-${schoolId}`)
  revalidateTag('subjects')
  return NextResponse.json({ success: true, data: subject }, { status: 201 })
})
