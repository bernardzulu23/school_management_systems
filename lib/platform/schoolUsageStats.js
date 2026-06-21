/**
 * Per-tenant usage counts for platform super-admin (aggregate only — no PII).
 */
import prisma from '@/lib/prisma'
import { toPlatformSchoolSummary } from '@/lib/platform/schoolEligibility'

/**
 * @param {{ includeInactive?: boolean }} [options]
 */
export async function getPlatformSchoolUsageStats(options = {}) {
  const includeInactive = Boolean(options.includeInactive)

  const schools = await prisma.school.findMany({
    where: includeInactive ? {} : { active: true },
    select: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      level: true,
      active: true,
      emailVerified: true,
      province: true,
      district: true,
      reportingStreamKey: true,
      schoolType: true,
      planExpiresAt: true,
      trialEndsAt: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  })

  const schoolIds = schools.map((s) => s.id)
  if (schoolIds.length === 0) {
    return {
      totals: { schools: 0, students: 0, teachers: 0 },
      schools: [],
    }
  }

  const [studentGroups, teacherGroups] = await Promise.all([
    prisma.student.groupBy({
      by: ['schoolId'],
      where: { schoolId: { in: schoolIds } },
      _count: { _all: true },
    }),
    prisma.teacher.groupBy({
      by: ['schoolId'],
      where: { schoolId: { in: schoolIds } },
      _count: { _all: true },
    }),
  ])

  const studentsBySchool = new Map(studentGroups.map((row) => [row.schoolId, row._count._all]))
  const teachersBySchool = new Map(teacherGroups.map((row) => [row.schoolId, row._count._all]))

  const rows = schools.map((school) => {
    const summary = toPlatformSchoolSummary(school)
    const studentCount = studentsBySchool.get(school.id) || 0
    const teacherCount = teachersBySchool.get(school.id) || 0
    return {
      id: school.id,
      name: summary.name,
      subdomain: summary.subdomain,
      province: summary.province,
      district: summary.district,
      active: summary.active,
      subscriptionStatus: summary.subscriptionStatus,
      schoolType: summary.schoolType,
      createdAt: summary.createdAt,
      studentCount,
      teacherCount,
      totalUsers: studentCount + teacherCount,
    }
  })

  rows.sort((a, b) => b.totalUsers - a.totalUsers || b.studentCount - a.studentCount)

  return {
    totals: {
      schools: rows.length,
      students: rows.reduce((sum, r) => sum + r.studentCount, 0),
      teachers: rows.reduce((sum, r) => sum + r.teacherCount, 0),
    },
    schools: rows,
  }
}

/**
 * Lightweight helper for overview KPI extension.
 */
export async function getPlatformUsageTotals() {
  const [students, teachers, activeSchools] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.school.count({ where: { active: true } }),
  ])
  return { students, teachers, activeSchools }
}
