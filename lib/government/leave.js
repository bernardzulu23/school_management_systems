import prisma from '@/lib/prisma'

export const ANNUAL_LEAVE_DAYS = 30
export const SICK_LEAVE_DAYS = 90

export function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return 0
  return Math.round(ms / 86400000) + 1
}

export function leaveBalancesForTeacher(leaves, leaveType) {
  const used = leaves
    .filter((l) => l.leaveType === leaveType && (l.status === 'approved' || l.status === 'pending'))
    .reduce((sum, l) => sum + Number(l.daysCount || 0), 0)
  const cap = leaveType === 'sick' ? SICK_LEAVE_DAYS : ANNUAL_LEAVE_DAYS
  return { used, remaining: Math.max(0, cap - used), cap }
}

export async function listLeaveWithBalances(schoolId) {
  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const leaves = await prisma.teacherLeave.findMany({
    where: { schoolId },
    orderBy: { startDate: 'desc' },
  })

  const balances = teachers.map((t) => {
    const teacherLeaves = leaves.filter((l) => l.teacherId === t.id)
    return {
      teacherId: t.id,
      teacherName: t.user?.name || '',
      email: t.user?.email || '',
      annual: leaveBalancesForTeacher(teacherLeaves, 'annual'),
      sick: leaveBalancesForTeacher(teacherLeaves, 'sick'),
    }
  })

  return { leaves, balances }
}

export async function createLeave(schoolId, data) {
  const daysCount = calculateLeaveDays(data.startDate, data.endDate)
  return prisma.teacherLeave.create({
    data: {
      schoolId,
      teacherId: data.teacherId,
      leaveType: data.leaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      daysCount,
      reason: data.reason || null,
      status: 'pending',
    },
  })
}

export async function updateLeaveStatus(schoolId, leaveId, status, approvedBy) {
  const existing = await prisma.teacherLeave.findFirst({
    where: { id: leaveId, schoolId },
  })
  if (!existing) return null
  return prisma.teacherLeave.update({
    where: { id: leaveId },
    data: {
      status,
      approvedBy: approvedBy || null,
    },
  })
}
