export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

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
          // Drop ephemeral blob: URLs — they are browser-local and useless after reload
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

function parseLessonBody(body) {
  const title = normalize(body?.title)
  const subject = normalize(body?.subject)
  const grade = normalize(body?.grade)
  if (!title) throw new ApiError('title is required', 400)
  if (!subject) throw new ApiError('subject is required', 400)
  if (!grade) throw new ApiError('grade is required', 400)

  const duration = Math.min(300, Math.max(5, Number(body?.duration) || 45))
  const objectives = sanitizeObjectives(body?.objectives)
  const slides = sanitizeSlides(body?.slides)
  const status = normalize(body?.status).toUpperCase() === 'SAVED' ? 'SAVED' : 'DRAFT'

  return { title, subject, grade, duration, objectives, slides, status }
}

export const GET = withErrorHandler(async function GET(request) {
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

  const lessons = await prisma.multimediaLesson.findMany({
    where: { schoolId, createdByUserId: userId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
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

  return NextResponse.json({ success: true, data: { lessons } })
})

export const POST = withErrorHandler(async function POST(request) {
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

  const body = await request.json().catch(() => null)
  const data = parseLessonBody(body)

  const created = await prisma.multimediaLesson.create({
    data: {
      schoolId,
      createdByUserId: userId,
      ...data,
    },
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

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
