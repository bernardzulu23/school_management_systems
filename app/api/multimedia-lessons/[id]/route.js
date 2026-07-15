export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

function normalize(v) {
  return String(v || '').trim()
}

function sanitizeSlides(slides) {
  if (!Array.isArray(slides)) return []
  return slides.slice(0, 80).map((slide, index) => {
    const row = slide && typeof slide === 'object' ? slide : {}
    const media = Array.isArray(row.media)
      ? row.media.slice(0, 20).map((m) => {
          const item = m && typeof m === 'object' ? m : {}
          const url = String(item.url || '')
          const persistedUrl = url.startsWith('blob:') ? '' : url.slice(0, 2000)
          return {
            id: item.id ?? `${Date.now()}-${index}`,
            type: normalize(item.type).slice(0, 40) || 'file',
            name: normalize(item.name).slice(0, 200),
            url: persistedUrl,
            size: Number.isFinite(Number(item.size)) ? Number(item.size) : null,
          }
        })
      : []
    return {
      id: row.id ?? Date.now() + index,
      type: normalize(row.type).slice(0, 40) || 'content',
      title: normalize(row.title).slice(0, 200) || `Slide ${index + 1}`,
      content: String(row.content || '').slice(0, 20000),
      media,
      duration: Math.min(120, Math.max(1, Number(row.duration) || 5)),
      notes: String(row.notes || '').slice(0, 5000),
      interactions: Array.isArray(row.interactions) ? row.interactions.slice(0, 20) : [],
    }
  })
}

function sanitizeObjectives(objectives) {
  if (!Array.isArray(objectives)) return []
  return objectives
    .map((o) => normalize(o).slice(0, 500))
    .filter(Boolean)
    .slice(0, 30)
}

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const existing = await prisma.multimediaLesson.findFirst({
    where: { id, schoolId, createdByUserId: userId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Lesson not found', 404)

  const body = await request.json().catch(() => null)
  const title = normalize(body?.title)
  const subject = normalize(body?.subject)
  const grade = normalize(body?.grade)
  if (!title) throw new ApiError('title is required', 400)
  if (!subject) throw new ApiError('subject is required', 400)
  if (!grade) throw new ApiError('grade is required', 400)

  const updateResult = await prisma.multimediaLesson.updateMany({
    where: { id: existing.id, schoolId },
    data: {
      title,
      subject,
      grade,
      duration: Math.min(300, Math.max(5, Number(body?.duration) || 45)),
      objectives: sanitizeObjectives(body?.objectives),
      slides: sanitizeSlides(body?.slides),
      status: normalize(body?.status).toUpperCase() === 'SAVED' ? 'SAVED' : 'DRAFT',
    },
  })
  if (updateResult.count === 0) throw new ApiError('Lesson not found', 404)

  const updated = await prisma.multimediaLesson.findFirst({
    where: { id: existing.id, schoolId },
    select: {
      id: true,
      title: true,
      subject: true,
      grade: true,
      duration: true,
      objectives: true,
      slides: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
