export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

/**
 * DELETE /api/materials/[id] — remove RAG material and all chunks (tenant-scoped).
 */
export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const id = String((await params)?.id || '').trim()
  if (!id) throw new ApiError('Material id required', 400)

  const existing = await prisma.schoolMaterial.findFirst({
    where: { id, schoolId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Material not found', 404)

  await prisma.schoolMaterial.delete({ where: { id } })

  return NextResponse.json({ success: true })
})
