export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { findStudentWorks } from '@/lib/db/queries'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/utils/apiResponse'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const filters = {
    category: searchParams.get('category'),
    grade: searchParams.get('grade'),
    search: searchParams.get('search'),
    featured: searchParams.get('featured'),
    page: parseInt(searchParams.get('page')) || 1,
    limit: parseInt(searchParams.get('limit')) || 20,
  }

  try {
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

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
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
  } catch (error) {
    console.error('Error fetching student works:', error)
    return ApiResponse.error(error.message, 500)
  }
}

export async function POST(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['STUDENT', 'student', 'TEACHER', 'teacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.studentId || !body.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const title = String(body.title).trim()
    const description = String(body.description || '').trim()
    const type = String(body.type || '').trim()
    const studentId = String(body.studentId || '').trim()

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
  } catch (error) {
    console.error('Error creating student work:', error)
    return NextResponse.json({ error: 'Failed to create student work' }, { status: 500 })
  }
}
