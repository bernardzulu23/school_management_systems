import prisma from '@/lib/prisma'
import { normalizeStudentGender } from '@/lib/government/genderReport'

function genderStatsFromMembers(members) {
  const stats = { male: 0, female: 0, unknown: 0, total: 0 }
  for (const m of members) {
    const g = normalizeStudentGender(m.student?.user?.gender)
    stats.total += 1
    if (g === 'Male') stats.male += 1
    else if (g === 'Female') stats.female += 1
    else stats.unknown += 1
  }
  return stats
}

export async function listHousesWithStats(schoolId, year = new Date().getFullYear()) {
  const houses = await prisma.schoolHouse.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    include: {
      members: {
        where: { year },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              class: true,
              exam_number: true,
              user: { select: { gender: true } },
            },
          },
        },
      },
    },
  })

  return houses.map((house) => {
    const genderStats = genderStatsFromMembers(house.members)
    return {
      id: house.id,
      name: house.name,
      color: house.color,
      memberCount: house.members.length,
      genderStats,
      members: house.members.map((m) => ({
        membershipId: m.id,
        studentId: m.studentId,
        name: m.student?.name,
        class: m.student?.class,
        examNumber: m.student?.exam_number,
        gender: m.student?.user?.gender ?? null,
        year: m.year,
      })),
    }
  })
}

export async function createHouse(schoolId, data) {
  const name = String(data?.name || '').trim()
  if (!name) throw new Error('House name is required')
  return prisma.schoolHouse.create({
    data: {
      schoolId,
      name,
      color: data?.color ? String(data.color).trim() : null,
    },
  })
}

export async function assignStudentToHouse(schoolId, { studentId, houseId, year }) {
  const y = Number(year) || new Date().getFullYear()
  const [student, house] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    }),
    prisma.schoolHouse.findFirst({
      where: { id: houseId, schoolId },
      select: { id: true },
    }),
  ])
  if (!student) return null
  if (!house) return null

  return prisma.studentHouseMembership.upsert({
    where: { studentId_year: { studentId, year: y } },
    create: { studentId, houseId, schoolId, year: y },
    update: { houseId },
    include: {
      student: { select: { id: true, name: true, class: true } },
      house: { select: { id: true, name: true } },
    },
  })
}

export async function removeMembership(schoolId, studentId, year) {
  const y = Number(year) || new Date().getFullYear()
  await prisma.studentHouseMembership.deleteMany({
    where: { schoolId, studentId, year: y },
  })
}
