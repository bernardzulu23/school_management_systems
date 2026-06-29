import prisma from '@/lib/prisma'
import { computeInvoiceStatus, computeSiblingDiscount } from '@/lib/fees/helpers'

export async function listInvoices(schoolId, filters = {}) {
  const where = { schoolId }
  if (filters.studentId) where.studentId = String(filters.studentId)
  if (filters.status) where.status = String(filters.status)
  if (filters.scheduleId) where.scheduleId = String(filters.scheduleId)
  if (filters.classId) {
    where.student = { classId: String(filters.classId) }
  }
  if (filters.term || filters.academicYear) {
    where.schedule = {}
    if (filters.term) where.schedule.term = Number(filters.term)
    if (filters.academicYear) where.schedule.academicYear = Number(filters.academicYear)
  }

  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50))
  const skip = (page - 1) * limit

  const [invoices, total] = await prisma.$transaction([
    prisma.studentInvoice.findMany({
      where,
      include: {
        schedule: true,
        payments: { orderBy: { paymentDate: 'desc' } },
        student: { select: { id: true, name: true, class: true, exam_number: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.studentInvoice.count({ where }),
  ])

  return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function generateInvoicesForSchedule(schoolId, scheduleId) {
  const schedule = await prisma.feeSchedule.findFirst({
    where: { id: scheduleId, schoolId },
  })
  if (!schedule) return null

  const studentWhere = { schoolId }
  if (schedule.yearGroup) {
    studentWhere.classRef = { year_group: schedule.yearGroup }
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      siblingMemberships: { include: { siblingGroup: true }, take: 1 },
    },
  })

  const existing = await prisma.studentInvoice.findMany({
    where: { schoolId, scheduleId },
    select: { studentId: true },
  })
  const existingIds = new Set(existing.map((e) => e.studentId))

  const toCreate = students
    .filter((s) => !existingIds.has(s.id))
    .map((s) => {
      const sibling = s.siblingMemberships[0]?.siblingGroup
      const { discount, discountType } = computeSiblingDiscount(schedule.amount, sibling)
      const netAmount = Math.round((Number(schedule.amount) - discount) * 100) / 100
      return {
        schoolId,
        studentId: s.id,
        scheduleId,
        amountDue: Number(schedule.amount),
        discount,
        discountType,
        netAmount,
        amountPaid: 0,
        balance: netAmount,
        status: computeInvoiceStatus(netAmount, 0, schedule.dueDate),
        dueDate: schedule.dueDate,
      }
    })

  if (toCreate.length) {
    await prisma.studentInvoice.createMany({ data: toCreate })
  }

  return { created: toCreate.length, skipped: existingIds.size }
}

export async function getTopOutstanding(schoolId, limit = 10) {
  return prisma.studentInvoice.findMany({
    where: { schoolId, balance: { gt: 0 } },
    include: {
      student: { select: { name: true, class: true } },
      schedule: { select: { name: true } },
    },
    orderBy: { balance: 'desc' },
    take: limit,
  })
}

export async function getMonthlyCollections(schoolId, months = 6) {
  const since = new Date()
  since.setMonth(since.getMonth() - months)

  const payments = await prisma.feePayment.findMany({
    where: { schoolId, paymentDate: { gte: since } },
    select: { amount: true, paymentDate: true },
  })

  const buckets = new Map()
  for (const p of payments) {
    const d = new Date(p.paymentDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, (buckets.get(key) || 0) + Number(p.amount || 0))
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }))
}
