import prisma from '@/lib/prisma'
import { getFeeSummary } from '@/lib/fees/summary'
import { getTopOutstanding, getMonthlyCollections } from '@/lib/fees/invoices'

export async function getProprietorOverview(schoolId) {
  const [studentCount, feeSummary, topOutstanding, monthlyCollections] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    getFeeSummary(schoolId),
    getTopOutstanding(schoolId, 10),
    getMonthlyCollections(schoolId, 6),
  ])

  const presentMarks = await prisma.attendanceMark.count({
    where: {
      schoolId,
      status: { in: ['PRESENT', 'LATE'] },
    },
  })
  const totalMarks = await prisma.attendanceMark.count({ where: { schoolId } })
  const attendanceRate = totalMarks > 0 ? Math.round((presentMarks / totalMarks) * 1000) / 10 : null

  return {
    enrolment: { total: studentCount },
    fees: feeSummary,
    attendanceRate,
    topOutstanding: topOutstanding.map((i) => ({
      studentName: i.student?.name,
      class: i.student?.class,
      schedule: i.schedule?.name,
      balance: i.balance,
      status: i.status,
    })),
    monthlyCollections,
  }
}
