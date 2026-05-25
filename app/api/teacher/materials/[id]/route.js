import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean)
  if (typeof tags === 'string')
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  return []
}

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const materialId = String(routeParams?.id || '').trim()
  if (!materialId) throw new ApiError('Material id is required', 400)

  const existing = await prisma.studyMaterial.findFirst({
    where: { id: materialId, schoolId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Not found', 404)

  const body = await request.json().catch(() => ({}))
  const title = body?.title !== undefined ? String(body.title).trim() : undefined
  const subject = body?.subject !== undefined ? String(body.subject).trim() : undefined
  const type = body?.type !== undefined ? String(body.type).trim().toLowerCase() : undefined
  const fileUrl = body?.fileUrl !== undefined ? String(body.fileUrl).trim() : undefined
  const description = body?.description !== undefined ? String(body.description).trim() : undefined
  const size = body?.size !== undefined ? String(body.size).trim() : undefined
  const tags = body?.tags !== undefined ? normalizeTags(body.tags) : undefined

  if (title !== undefined && !title) throw new ApiError('title cannot be empty', 400)
  if (subject !== undefined && !subject) throw new ApiError('subject cannot be empty', 400)
  if (type !== undefined && !type) throw new ApiError('type cannot be empty', 400)
  if (fileUrl !== undefined && !fileUrl) throw new ApiError('fileUrl cannot be empty', 400)

  const updated = await prisma.studyMaterial.update({
    where: { id: materialId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(fileUrl !== undefined ? { fileUrl } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(size !== undefined ? { size } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      type: updated.type,
      subject: updated.subject,
      fileUrl: updated.fileUrl,
      uploadDate: updated.uploadDate,
      size: updated.size,
      tags: updated.tags,
    },
  })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const materialId = String(routeParams?.id || '').trim()
  if (!materialId) throw new ApiError('Material id is required', 400)

  const existing = await prisma.studyMaterial.findFirst({
    where: { id: materialId, schoolId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Not found', 404)

  await prisma.$transaction(async (tx) => {
    await tx.studentMaterial.deleteMany({
      where: { schoolId, studyMaterialId: materialId },
    })
    await tx.studyMaterial.delete({
      where: { id: materialId },
    })
  })

  return NextResponse.json({ success: true })
})
