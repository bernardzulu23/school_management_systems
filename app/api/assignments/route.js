import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const className = searchParams.get('class')
  const subject = searchParams.get('subject')

  if (roleCheck(auth.user, ['STUDENT', 'student'])) {
    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { class: true, selected_subjects: true },
    })
    if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })

    const where = {
      schoolId,
      class: student.class,
      ...(subject ? { subject } : { subject: { in: student.selected_subjects || [] } }),
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ success: true, data: assignments })
  }

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where = {
    schoolId,
    ...(className ? { class: className } : {}),
    ...(subject ? { subject } : {}),
  }

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { dueDate: 'desc' },
  })

  return NextResponse.json({ success: true, data: assignments })
}

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()
  const title = String(body.title || '').trim()
  const subject = String(body.subject || '').trim()
  const className = String(body.class || '').trim()
  const dueDate = body.dueDate ? new Date(body.dueDate) : null

  if (!title || !subject || !className || !dueDate || Number.isNaN(dueDate.getTime())) {
    return NextResponse.json(
      { error: 'title, subject, class, dueDate are required' },
      { status: 400 }
    )
  }

  const teacher = roleCheck(auth.user, ['TEACHER', 'teacher'])
    ? await prisma.teacher.findUnique({ where: { userId: auth.user.id }, select: { id: true } })
    : null

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description: body.description ? String(body.description) : null,
      subject,
      class: className,
      dueDate,
      schoolId,
      teacherId: teacher?.id || null,
    },
  })

  return NextResponse.json({ success: true, data: assignment }, { status: 201 })
}
