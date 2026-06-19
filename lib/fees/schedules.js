import prisma from '@/lib/prisma'

export async function listSchedules(schoolId, { year, activeOnly = true } = {}) {
  const where = { schoolId }
  if (year) where.academicYear = Number(year)
  if (activeOnly) where.isActive = true

  return prisma.feeSchedule.findMany({
    where,
    orderBy: [{ academicYear: 'desc' }, { term: 'asc' }],
    include: { _count: { select: { invoices: true } } },
  })
}

export async function createSchedule(schoolId, data) {
  return prisma.feeSchedule.create({
    data: {
      schoolId,
      name: String(data.name).trim(),
      amount: Number(data.amount),
      dueDate: new Date(data.dueDate),
      term: Number(data.term || 1),
      academicYear: Number(data.academicYear || new Date().getFullYear()),
      yearGroup: data.yearGroup ? String(data.yearGroup).trim() : null,
      feeType: data.feeType || 'tuition',
    },
  })
}
