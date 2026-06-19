import prisma from '@/lib/prisma'
import {
  buildEnrolmentByYearGroup,
  buildAttendanceComparison,
  calculateGpi,
  gpiStatus,
} from '@/lib/government/genderReport'

export async function getGenderReportData(schoolId, year = new Date().getFullYear()) {
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`)
  const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`)

  const students = await prisma.student.findMany({
    where: { schoolId },
    select: {
      class: true,
      classRef: { select: { year_group: true } },
      user: { select: { gender: true } },
    },
  })

  const enrolment = buildEnrolmentByYearGroup(students)
  const totalMale = enrolment.reduce((s, r) => s + r.male, 0)
  const totalFemale = enrolment.reduce((s, r) => s + r.female, 0)
  const gpi = calculateGpi(totalMale, totalFemale)

  const marks = await prisma.attendanceMark.findMany({
    where: {
      schoolId,
      markedAt: { gte: yearStart, lte: yearEnd },
    },
    select: {
      status: true,
      student: {
        select: {
          user: { select: { gender: true } },
        },
      },
    },
  })

  const attendance = buildAttendanceComparison(marks)

  return {
    year,
    gpi,
    gpiStatus: gpiStatus(gpi),
    totals: { male: totalMale, female: totalFemale, pupils: totalMale + totalFemale },
    enrolment,
    attendance,
  }
}
