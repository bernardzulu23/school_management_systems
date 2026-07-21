export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  storeMaterialFile,
  blobStorageEnabled,
  MAX_BLOB_UPLOAD_BYTES,
  MAX_DIRECT_UPLOAD_BYTES,
} from '@/lib/uploads/materialFile'

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
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
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
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const contentType = request.headers.get('content-type') || ''
  let title = ''
  let subject = ''
  let type = ''
  let fileUrl = ''
  let description = null
  let size = null
  let tags = []

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    title = String(form.get('title') || '').trim()
    subject = String(form.get('subject') || '').trim()
    type = String(form.get('type') || '').trim()
    fileUrl = String(form.get('fileUrl') || '').trim()
    description =
      form.get('description') !== null && form.get('description') !== undefined
        ? String(form.get('description')).trim()
        : null
    size =
      form.get('size') !== null && form.get('size') !== undefined
        ? String(form.get('size')).trim()
        : null
    tags = normalizeTags(form.get('tags'))

    const file = form.get('file')
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      let stored
      try {
        stored = await storeMaterialFile({
          schoolId,
          userId,
          file,
          fileName: file.name,
          purpose: 'study',
          maxBytes: blobStorageEnabled() ? MAX_BLOB_UPLOAD_BYTES : MAX_DIRECT_UPLOAD_BYTES,
        })
      } catch (error) {
        throw new ApiError(error?.message || 'File upload failed', Number(error?.status) || 500)
      }
      fileUrl = stored.fileUrl
      if (!type) type = stored.type || 'file'
      if (!size) size = stored.sizeLabel
      if (!title) title = String(file.name || '').replace(/\.[^.]+$/, '') || 'Uploaded material'
    }
  } else {
    const body = await request.json().catch(() => ({}))
    title = String(body?.title || '').trim()
    subject = String(body?.subject || '').trim()
    type = String(body?.type || '').trim()
    fileUrl = String(body?.fileUrl || '').trim()
    description = body?.description !== undefined ? String(body.description).trim() : null
    size = body?.size !== undefined ? String(body.size).trim() : null
    tags = normalizeTags(body?.tags)
  }

  if (!title) throw new ApiError('title is required', 400)
  if (!subject) throw new ApiError('subject is required', 400)
  if (!type) throw new ApiError('type is required', 400)
  if (!fileUrl) throw new ApiError('fileUrl or file is required', 400)

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
