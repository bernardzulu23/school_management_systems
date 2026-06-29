export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { findStudentWorks } from '@/lib/db/queries'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/utils/apiResponse'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const filters = {
    category: safeQueryString(searchParams.get('category')),
    grade: safeQueryString(searchParams.get('grade')),
    search: safeQueryString(searchParams.get('search')),
    featured: safeQueryString(searchParams.get('featured')),
    page: Math.max(1, parseInt(searchParams.get('page'), 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit'), 10) || 20)),
  }

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (
    !roleCheck(auth.user, [
      'STUDENT',
      'student',
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { works, total } = await findStudentWorks(schoolId, filters)

  // Transform data to match frontend expectations
  const formattedWorks = works.map((work) => ({
    id: work.id,
    title: work.title,
    student: work.student?.name || '',
    grade: work.student?.class || '',
    subject: '',
    category: work.type,
    type: work.type,
    thumbnail: work.thumbnailUrl || '/api/placeholder/300/200',
    description: work.description || '',
    uploadDate: work.createdAt.toISOString().split('T')[0],
    likes: work.likes || 0,
    comments: 0,
    views: work.views || 0,
    featured: false,
    tags: [],
    teacher: 'Unknown',
    awards: [],
  }))

  return ApiResponse.success(formattedWorks, {
    cache: 60, // Cache for 1 minute
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()

  // Validate required fields
  if (!body.title || !body.studentId || !body.type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const title = String(body.title).trim()
  const description = String(body.description || '').trim()
  const type = String(body.type || '').trim()
  const studentId = safeStringId(body.studentId)

  if (!title || !type || !studentId)
    return NextResponse.json({ error: 'Invalid required fields' }, { status: 400 })

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const newWork = await prisma.studentWork.create({
    data: {
      schoolId,
      studentId: student.id,
      title,
      description,
      type,
      fileUrl: body.url ? String(body.url) : null,
      thumbnailUrl: body.thumbnail ? String(body.thumbnail) : null,
      isPublic: true,
    },
  })

  return NextResponse.json({ success: true, data: newWork })
})
