import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const subject = url.searchParams.get('subject')
  const grade = url.searchParams.get('grade')

  if (subject) {
    const doc = await prisma.oldSyllabusDocument.findFirst({
      where: { subject, validationStatus: 'VALID' },
      orderBy: { ingestedAt: 'desc' },
    })
    if (!doc) return NextResponse.json({ error: 'Syllabus not found' }, { status: 404 })

    const content = doc.contentJson as any
    const gradeNum = grade ? Number(grade) : null
    const gradeBlock = (content?.gradeContent || []).find(
      (g: any) => !gradeNum || Number(g.grade) === gradeNum
    )

    const papers = await prisma.pastPaper.findMany({
      where: { subject, syllabusVersion: 'OLD_SYLLABUS', validationStatus: 'VALID' },
      orderBy: [{ year: 'desc' }],
      take: 10,
      select: {
        id: true,
        paperCode: true,
        paperNumber: true,
        year: true,
        totalMarks: true,
        durationMinutes: true,
        structureJson: true,
      },
    })

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        subject: doc.subject,
        domains: doc.domains,
        gradeContent: gradeNum ? (gradeBlock ? [gradeBlock] : []) : content?.gradeContent,
      },
      pastPapers: papers,
    })
  }

  const docs = await prisma.oldSyllabusDocument.findMany({
    where: { validationStatus: 'VALID' },
    distinct: ['subject'],
    orderBy: { subject: 'asc' },
    select: { id: true, subject: true, domains: true, ingestedAt: true },
  })

  return NextResponse.json({ success: true, subjects: docs })
})
