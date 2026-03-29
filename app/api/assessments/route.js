import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit
    const schoolId =
      auth.user?.schoolId || (await getSchoolIdFromRequest(request)) || searchParams.get('schoolId')
    const className = searchParams.get('class')
    const subject = searchParams.get('subject')

    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const where = {
      schoolId,
      ...(className ? { class: className } : {}),
      ...(subject ? { subject } : {}),
    }

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assessment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: assessments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const data = await request.json()

    if (!data.title || !data.date || !data.subject || !data.class) {
      return NextResponse.json(
        { error: 'Title, subject, class and date are required' },
        { status: 400 }
      )
    }

    const newAssessment = await prisma.assessment.create({
      data: {
        title: data.title,
        type: data.type || 'quiz',
        subject: String(data.subject),
        class: String(data.class),
        date: new Date(data.date),
        duration_minutes: parseInt(data.duration_minutes) || 60,
        description: data.description ? String(data.description) : null,
        schoolId,
      },
    })

    return NextResponse.json({ success: true, data: newAssessment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
