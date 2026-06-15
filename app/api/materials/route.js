export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTeacherAssignableSubjects } from '@/lib/materials/teacherMaterialSubject'

/**
 * GET /api/materials — list RAG school materials for the tenant (with chunk counts).
 * Query: ?subject=Biology — filter by subject; teachers only see assigned subjects.
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const subjectFilter = String(searchParams.get('subject') || '').trim()

  const assignable = await getTeacherAssignableSubjects({
    schoolId,
    userId: auth.user?.id,
    userRole: auth.user?.role,
  })
  const assignableNorm = new Set(assignable.map((s) => s.toLowerCase()))

  const where = { schoolId }
  if (subjectFilter) {
    where.subject = { equals: subjectFilter, mode: 'insensitive' }
  }

  const materials = await prisma.schoolMaterial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { chunks: true } } },
  })

  const data = materials
    .filter((m) => {
      if (!assignable.length) return false
      const sub = String(m.subject || '')
        .trim()
        .toLowerCase()
      return !sub || assignableNorm.has(sub)
    })
    .map((m) => ({
      id: m.id,
      title: m.title,
      subject: m.subject,
      gradeLevel: m.gradeLevel,
      fileUrl: m.fileUrl,
      fileType: m.fileType,
      uploadedBy: m.uploadedBy,
      createdAt: m.createdAt,
      chunksIndexed: m._count.chunks,
    }))

  return NextResponse.json({ success: true, data, assignableSubjects: assignable })
})
