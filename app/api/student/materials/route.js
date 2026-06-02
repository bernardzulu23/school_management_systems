export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const student = await db.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const materials = await db.studyMaterial.findMany({
    where: { schoolId },
    orderBy: { uploadDate: 'desc' },
  })

  const ids = materials.map((m) => m.id)

  const interactions = ids.length
    ? await db.studentMaterial.findMany({
        where: { schoolId, studentId: student.id, studyMaterialId: { in: ids } },
        select: {
          studyMaterialId: true,
          isBookmarked: true,
          isDownloaded: true,
          downloads: true,
        },
      })
    : []

  const interactionByMaterialId = new Map(interactions.map((i) => [String(i.studyMaterialId), i]))

  const grouped = ids.length
    ? await db.studentMaterial.groupBy({
        by: ['studyMaterialId'],
        where: { schoolId, studyMaterialId: { in: ids } },
        _sum: { downloads: true },
      })
    : []

  const downloadsByMaterialId = new Map()
  grouped.forEach((g) => {
    downloadsByMaterialId.set(String(g.studyMaterialId), Number(g._sum?.downloads || 0))
  })

  const formatted = materials.map((m) => {
    const interaction = interactionByMaterialId.get(String(m.id))
    return {
      id: m.id,
      title: m.title,
      subject: m.subject,
      teacher: 'School Library',
      type: m.type,
      size: m.size || 'Unknown',
      uploadDate: m.uploadDate.toISOString().split('T')[0],
      downloads: downloadsByMaterialId.get(String(m.id)) || 0,
      views: 0,
      rating: 0,
      description: m.description,
      tags: m.tags,
      fileUrl: m.fileUrl,
      isBookmarked: interaction?.isBookmarked || false,
      isDownloaded: interaction?.isDownloaded || false,
    }
  })

  return NextResponse.json({ success: true, data: formatted })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const student = await db.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const { materialId, action } = await request.json().catch(() => ({}))
  const studyMaterialId = String(materialId || '').trim()
  const act = String(action || '').trim()

  if (!studyMaterialId || !['bookmark', 'download'].includes(act)) {
    throw new ApiError('Invalid request', 400)
  }

  const existing = await db.studentMaterial.findUnique({
    where: {
      studentId_studyMaterialId: {
        studentId: student.id,
        studyMaterialId,
      },
    },
  })

  if (act === 'bookmark') {
    if (existing) {
      await db.studentMaterial.update({
        where: { id: existing.id },
        data: { isBookmarked: !existing.isBookmarked, lastAccessed: new Date() },
      })
    } else {
      await db.studentMaterial.create({
        data: {
          schoolId,
          studentId: student.id,
          studyMaterialId,
          isBookmarked: true,
          lastAccessed: new Date(),
        },
      })
    }
  }

  if (act === 'download') {
    if (existing) {
      await db.studentMaterial.update({
        where: { id: existing.id },
        data: {
          isDownloaded: true,
          downloads: { increment: 1 },
          lastAccessed: new Date(),
        },
      })
    } else {
      await db.studentMaterial.create({
        data: {
          schoolId,
          studentId: student.id,
          studyMaterialId,
          isDownloaded: true,
          downloads: 1,
          lastAccessed: new Date(),
        },
      })
    }
  }

  return NextResponse.json({ success: true })
})
