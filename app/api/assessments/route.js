export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { buildAssessmentInteractiveDescription } from '@/lib/assessments/assessmentInteractive'
import { clampListLimit } from '@/lib/security/antiScraping'

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
    const db = getTenantClient(schoolId)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = clampListLimit(searchParams, { defaultLimit: 20, maxLimit: 100 })
    const skip = (page - 1) * limit
    const className = searchParams.get('class')
    const classId = searchParams.get('classId')
    const subject = searchParams.get('subject')

    const where = {
      schoolId,
      ...(classId ? { classId: String(classId) } : className ? { class: className } : {}),
      ...(subject ? { subject } : {}),
    }

    const [assessments, total] = await Promise.all([
      db.assessment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      db.assessment.count({ where }),
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
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
    const db = getTenantClient(schoolId)

    const data = await request.json()

    const classId = data.classId ? String(data.classId).trim() : ''
    const className = data.class ? String(data.class).trim() : ''

    if (!data.title || !data.date || !data.subject || (!classId && !className)) {
      return NextResponse.json(
        { error: 'Title, subject, class and date are required' },
        { status: 400 }
      )
    }

    const classRecord = classId
      ? await db.class.findFirst({
          where: { schoolId, id: classId },
          select: { id: true, name: true },
        })
      : className
        ? await db.class.findFirst({
            where: { schoolId, name: { equals: className, mode: 'insensitive' } },
            select: { id: true, name: true },
          })
        : null

    const questions = Array.isArray(data.questions) ? data.questions : []
    const description =
      questions.length > 0
        ? buildAssessmentInteractiveDescription({ questions, publishedAssignmentId: null })
        : data.description
          ? String(data.description)
          : null

    const userId = String(auth.user?.id || '').trim()
    const newAssessment = await db.assessment.create({
      data: {
        title: data.title,
        type: data.type || 'quiz',
        subject: String(data.subject),
        classId: classRecord?.id || null,
        class: classRecord?.name || className,
        date: new Date(data.date),
        duration_minutes: parseInt(data.duration_minutes) || 60,
        description,
        schoolId,
        status: 'DRAFT',
        topic: data.topic ? String(data.topic).trim() : null,
        createdByUserId: userId || null,
        aiAnalysis:
          data.aiAnalysis && typeof data.aiAnalysis === 'object' ? data.aiAnalysis : undefined,
      },
    })

    return NextResponse.json({ success: true, data: newAssessment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
