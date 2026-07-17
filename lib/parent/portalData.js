import prisma from '@/lib/prisma'
import { pickParentPhone } from '@/lib/fees/helpers'

/**
 * Read-only parent portal payload for a linked student.
 * Caller must have already verified ParentStudentLink access.
 */
export async function getParentPortalDataForStudent(schoolId, studentId) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      class: true,
      exam_number: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
      classRef: { select: { year_group: true, section: true } },
      invoices: {
        include: { schedule: true, payments: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!student) return null

  const [marks, recentMarks, results, termReports] = await Promise.all([
    prisma.attendanceMark.groupBy({
      by: ['status'],
      where: { studentId: student.id, schoolId },
      _count: { status: true },
    }),
    prisma.attendanceMark.findMany({
      where: { studentId: student.id, schoolId },
      orderBy: { markedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        status: true,
        markedAt: true,
        session: { select: { startedAt: true, subject: { select: { name: true } } } },
      },
    }),
    prisma.result.findMany({
      where: { studentId: student.id, schoolId },
      include: { subject: { select: { name: true } } },
      orderBy: [{ year: 'desc' }, { term: 'desc' }],
      take: 40,
    }),
    prisma.termReport.findMany({
      where: { studentId: student.id, schoolId, status: 'PUBLISHED' },
      orderBy: [{ academicYear: 'desc' }, { term: 'desc' }],
      take: 10,
      select: {
        id: true,
        term: true,
        academicYear: true,
        status: true,
        narrative: true,
        attendancePct: true,
        publishedAt: true,
      },
    }),
  ])

  const attendanceCounts = marks.map((m) => ({
    status: m.status,
    count: m._count.status,
  }))
  const totalMarks = attendanceCounts.reduce((s, m) => s + m.count, 0)
  const presentish = attendanceCounts
    .filter((m) => ['PRESENT', 'LATE'].includes(String(m.status)))
    .reduce((s, m) => s + m.count, 0)
  const attendanceRate = totalMarks > 0 ? Math.round((presentish / totalMarks) * 100) : null

  const totalDue = student.invoices.reduce((s, i) => s + Number(i.netAmount || 0), 0)
  const totalPaid = student.invoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0)

  return {
    student: {
      id: student.id,
      name: student.name,
      class: student.class,
      examNumber: student.exam_number,
      yearGroup: student.classRef?.year_group,
      section: student.classRef?.section,
      parentPhone: pickParentPhone(student),
    },
    fees: {
      totalDue,
      totalPaid,
      balance: Math.max(0, totalDue - totalPaid),
      invoices: student.invoices,
    },
    attendance: {
      counts: attendanceCounts,
      rate: attendanceRate,
      recent: recentMarks.map((m) => ({
        id: m.id,
        status: m.status,
        markedAt: m.markedAt,
        subject: m.session?.subject?.name || null,
        sessionStartedAt: m.session?.startedAt || null,
      })),
    },
    results: results.map((r) => ({
      subject: r.subject?.name,
      score: r.score,
      grade: r.grade,
      term: r.term,
      year: r.year,
      resultType: r.resultType,
    })),
    reports: termReports.map((r) => ({
      id: r.id,
      term: r.term,
      year: r.academicYear,
      status: r.status,
      summary: r.narrative,
      attendancePct: r.attendancePct,
      publishedAt: r.publishedAt,
    })),
  }
}

/**
 * @deprecated Prefer getParentPortalDataForStudent after ParentStudentLink check.
 * Kept for student-facing fee statement page (student userId → own profile).
 */
export async function getParentPortalData(schoolId, userId) {
  const student = await prisma.student.findFirst({
    where: { userId, schoolId },
    select: { id: true },
  })
  if (!student) return null
  return getParentPortalDataForStudent(schoolId, student.id)
}
