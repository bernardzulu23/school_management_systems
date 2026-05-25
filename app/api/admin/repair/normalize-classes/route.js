export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function normalizeWhitespace(v) {
  return String(v || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function parseClass(value) {
  const raw = normalizeWhitespace(value)
  if (!raw) return null

  const upper = raw.toUpperCase()
  const noSpaces = upper.replace(/\s+/g, '')

  const numeric = noSpaces.match(/^(\d{1,2})([A-Z])$/)
  if (numeric) {
    const gradeNum = Number(numeric[1])
    const section = numeric[2]
    return { year_group: `Grade ${gradeNum}`, section, name: `Grade ${gradeNum}${section}` }
  }

  const grade = noSpaces.match(/^GRADE(\d{1,2})([A-Z])$/)
  if (grade) {
    const gradeNum = Number(grade[1])
    const section = grade[2]
    return { year_group: `Grade ${gradeNum}`, section, name: `Grade ${gradeNum}${section}` }
  }

  const gradeSpaced = upper.match(/^GRADE\s+(\d{1,2})\s*([A-Z])$/)
  if (gradeSpaced) {
    const gradeNum = Number(gradeSpaced[1])
    const section = gradeSpaced[2]
    return { year_group: `Grade ${gradeNum}`, section, name: `Grade ${gradeNum}${section}` }
  }

  const form = noSpaces.match(/^FORM(\d{1,2})([A-Z])$/)
  if (form) {
    const formNum = Number(form[1])
    const section = form[2]
    return { year_group: `Form ${formNum}`, section, name: `Form ${formNum}${section}` }
  }

  return null
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const dryRun = Boolean(body?.dryRun)

  const distinct = await prisma.student.findMany({
    where: { schoolId },
    select: { class: true },
    distinct: ['class'],
    take: 5000,
  })

  const classValues = distinct.map((r) => normalizeWhitespace(r.class)).filter(Boolean)

  let parsed = 0
  let skipped = 0
  let createdClasses = 0
  let studentUpdates = 0
  let assignmentUpdates = 0
  let assessmentUpdates = 0

  for (const oldValue of classValues) {
    const parsedClass = parseClass(oldValue)
    if (!parsedClass) {
      skipped += 1
      continue
    }
    parsed += 1

    const existing = await prisma.class.findFirst({
      where: { schoolId, name: parsedClass.name },
      select: { id: true, name: true },
    })

    const classRecord = existing
      ? existing
      : dryRun
        ? { id: null, name: parsedClass.name }
        : await prisma.class.create({
            data: {
              schoolId,
              name: parsedClass.name,
              year_group: parsedClass.year_group,
              section: parsedClass.section,
            },
            select: { id: true, name: true },
          })

    if (!existing && !dryRun) createdClasses += 1

    const nextName = classRecord.name
    if (nextName === oldValue) continue

    const [sCount, aCount, asCount] = dryRun
      ? [0, 0, 0]
      : await prisma.$transaction([
          prisma.student.updateMany({
            where: { schoolId, class: oldValue },
            data: { class: nextName },
          }),
          prisma.assignment.updateMany({
            where: { schoolId, class: oldValue },
            data: { class: nextName },
          }),
          prisma.assessment.updateMany({
            where: { schoolId, class: oldValue },
            data: { class: nextName },
          }),
        ])

    studentUpdates += dryRun ? 0 : sCount.count
    assignmentUpdates += dryRun ? 0 : aCount.count
    assessmentUpdates += dryRun ? 0 : asCount.count
  }

  return NextResponse.json({
    success: true,
    dryRun,
    scannedDistinctStudentClassValues: classValues.length,
    parsed,
    skipped,
    createdClasses,
    updated: {
      students: studentUpdates,
      assignments: assignmentUpdates,
      assessments: assessmentUpdates,
    },
  })
})
