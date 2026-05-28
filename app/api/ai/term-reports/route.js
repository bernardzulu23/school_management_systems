export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { generateTermReportForStudent } from '@/lib/ai/term-report-service'

/**
 * GET — list term reports. POST — generate for a student.
 */
export async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const term = searchParams.get('term') ? Number(searchParams.get('term')) : undefined

  const where = {
    schoolId,
    ...(status ? { status } : {}),
    ...(term != null ? { term } : {}),
  }

  if (roleCheck(user, ['student'])) {
    const student = await prisma.student.findFirst({
      where: { userId: user.id, schoolId },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ data: [] })
    where.studentId = student.id
    where.status = 'PUBLISHED'
  }

  const rows = await prisma.termReport.findMany({
    where,
    include: { student: { select: { name: true, class: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ success: true, data: rows })
}

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!roleCheck(user, ['teacher', 'TEACHER', 'hod', 'HOD', 'headteacher', 'ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const studentId = String(body.studentId || '').trim()
  const term = Number(body.term) || 1
  const academicYear = Number(body.academicYear) || new Date().getFullYear()

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 })
  }

  try {
    const report = await generateTermReportForStudent({
      schoolId,
      studentId,
      term,
      academicYear,
      generatedById: user.id,
    })
    return NextResponse.json({ success: true, data: report })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 })
  }
}
