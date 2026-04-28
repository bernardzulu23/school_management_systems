export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
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

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const materials = await prisma.studyMaterial.findMany({
    where: { schoolId },
    orderBy: { uploadDate: 'desc' },
  })

  const ids = materials.map((m) => m.id)
  const downloadsByMaterialId = new Map()

  if (ids.length > 0) {
    const grouped = await prisma.studentMaterial.groupBy({
      by: ['studyMaterialId'],
      where: { schoolId, studyMaterialId: { in: ids } },
      _sum: { downloads: true },
    })

    grouped.forEach((g) => {
      downloadsByMaterialId.set(String(g.studyMaterialId), Number(g._sum?.downloads || 0))
    })
  }

  const shaped = materials.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    subject: m.subject,
    fileUrl: m.fileUrl,
    uploadDate: m.uploadDate,
    size: m.size,
    tags: m.tags,
    downloads: downloadsByMaterialId.get(m.id) || 0,
  }))

  return NextResponse.json({ success: true, data: shaped })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))

  const title = String(body?.title || '').trim()
  const subject = String(body?.subject || '').trim()
  const type = String(body?.type || '').trim()
  const fileUrl = String(body?.fileUrl || '').trim()
  const description = body?.description !== undefined ? String(body.description).trim() : null
  const size = body?.size !== undefined ? String(body.size).trim() : null
  const tags = normalizeTags(body?.tags)

  if (!title) throw new ApiError('title is required', 400)
  if (!subject) throw new ApiError('subject is required', 400)
  if (!type) throw new ApiError('type is required', 400)
  if (!fileUrl) throw new ApiError('fileUrl is required', 400)

  const created = await prisma.studyMaterial.create({
    data: {
      schoolId,
      title,
      subject,
      type: type.toLowerCase(),
      fileUrl,
      description,
      size,
      tags,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: created.id,
        title: created.title,
        description: created.description,
        type: created.type,
        subject: created.subject,
        fileUrl: created.fileUrl,
        uploadDate: created.uploadDate,
        size: created.size,
        tags: created.tags,
        downloads: 0,
      },
    },
    { status: 201 }
  )
})
