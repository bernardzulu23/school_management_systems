import prisma from '@/lib/prisma'
import { pickParentPhone } from '@/lib/fees/helpers'

export async function getParentPortalData(schoolId, userId) {
  const student = await prisma.student.findFirst({
    where: { userId, schoolId },
    select: {
      id: true,
      name: true,
      class: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
      classRef: { select: { year_group: true } },
      invoices: {
        include: { schedule: true, payments: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!student) return null

  const marks = await prisma.attendanceMark.groupBy({
    by: ['status'],
    where: { studentId: student.id, schoolId },
    _count: { status: true },
  })

  const results = await prisma.result.findMany({
    where: { studentId: student.id, schoolId },
    include: { subject: { select: { name: true } } },
    orderBy: [{ year: 'desc' }, { term: 'desc' }],
    take: 20,
  })

  const totalDue = student.invoices.reduce((s, i) => s + Number(i.netAmount || 0), 0)
  const totalPaid = student.invoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0)

  return {
    student: {
      name: student.name,
      class: student.class,
      yearGroup: student.classRef?.year_group,
      parentPhone: pickParentPhone(student),
    },
    fees: {
      totalDue,
      totalPaid,
      balance: Math.max(0, totalDue - totalPaid),
      invoices: student.invoices,
    },
    attendance: marks.map((m) => ({ status: m.status, count: m._count.status })),
    results: results.map((r) => ({
      subject: r.subject?.name,
      score: r.score,
      grade: r.grade,
      term: r.term,
      year: r.year,
      resultType: r.resultType,
    })),
  }
}
